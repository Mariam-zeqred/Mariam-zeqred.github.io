/* Poultry-house climate controller simulation.
   House model: lumped temperature, relative humidity and ammonia with N birds, outdoor weather and
   ventilation. Controller: the rules of the smart-poultry-farm firmware (config.h defaults, the
   hysteresis of sensors_evaluate, the hard limits of checkSafety, the interlocks of applyStates),
   with a physical Auto/Off/Manual selector per actuator like the real cabinet. 1 s time step. */
(function () {
  "use strict";

  // ---------------- house model (illustrative parameters, rates per minute) ----------------
  var M = {
    leak: 0.02,          // air exchange with no fan, /min
    fan: 0.10,           // extra exchange per running fan, /min
    wall: 0.02,          // conduction through walls, /min
    birdHeat: 0.00008,   // °C/min per bird
    birdMoist: 0.0002,   // % RH/min per bird
    birdGas: 0.001,      // ppm NH3/min per bird
    gasDecay: 0.01,      // NH3 removal with no fan, /min
    gasFan: 0.12,        // extra removal per fan, /min
    heater: 0.50,        // °C/min
    padEff: 0.85,        // evaporative pad: incoming air leaves the pad this far from outdoor towards wet bulb
    padRH: 75,           // % RH of the air leaving the wet pad (at least)
    humidifier: 0.8      // % RH/min
  };
  var SAFE = { tempMin: 10, tempMax: 42, humMin: 30, humMax: 85, gasMax: 450 }; // config.h hard limits
  var ALERT_COOLDOWN = 300, CONTROL_INTERVAL = 3;

  var ACT = ["fan1", "fan2", "heater", "cooler", "humid"];
  var ACT_LABEL = { fan1: "Fan 1", fan2: "Fan 2", heater: "Heater", cooler: "Cooler", humid: "Humidifier" };

  var s = {};                       // simulation state
  function reset() {
    s.t = 0; s.T = o.tOut; s.RH = o.rhOut; s.NH3 = 5;
    s.auto = { fan1: false, fan2: false, heater: false, cooler: false, humid: false }; // controller's desired state (hysteresis memory)
    s.relay = { fan1: false, fan2: false, heater: false, cooler: false, humid: false }; // what the contactors do
    s.sel = s.sel || { fan1: "A", fan2: "A", heater: "A", cooler: "A", humid: "A" };
    s.safety = null; s.lastAlert = {}; s.alerts = []; s.warn = null; s.cycleOn = false;
    s.hist = { T: [], RH: [], NH3: [], act: [] };
    s.lastControl = -CONTROL_INTERVAL;
  }

  // ---------------- controller ----------------
  function safetyCheck() {
    var which = null;                       // same order as checkSafety() in firmware.ino
    if (s.NH3 > SAFE.gasMax) which = "GAS";
    else if (s.T < SAFE.tempMin) which = "COLD";
    else if (s.T > SAFE.tempMax) which = "HEAT";
    else if (s.RH < SAFE.humMin) which = "DRY";
    else if (s.RH > SAFE.humMax) which = "HUMID";
    if (which && s.safety !== which) alert("critical", "Safety: " + which);
    s.safety = which;
    if (!which) return null;
    // each branch sets every relay explicitly
    switch (which) {
      case "GAS": return { fan1: true, fan2: true, heater: false, cooler: false, humid: false };
      case "HEAT": return { fan1: true, fan2: true, heater: false, cooler: true, humid: false };
      case "COLD": return { fan1: false, fan2: false, heater: true, cooler: false, humid: false };
      case "HUMID": return { fan1: true, fan2: true, heater: false, cooler: false, humid: false };
      default: return { fan1: false, fan2: false, heater: false, cooler: false, humid: true };
    }
  }
  function autoEvaluate() { // sensors_evaluate(): turn ON at the threshold, OFF once cleared by the hysteresis
    var a = s.auto, h = o.hyst, T = s.T, RH = s.RH, G = s.NH3;
    if (T < o.tempLow) a.heater = true; else if (T > o.tempLow + h) a.heater = false;
    if (T > o.tempHigh) { a.cooler = true; a.fan1 = true; } else if (T < o.tempHigh - h) { a.cooler = false; a.fan1 = false; }
    if (RH < o.humLow) a.humid = true; else if (RH > o.humLow + h) a.humid = false;
    if (RH > o.humHigh) a.fan1 = true;                       // ventilate moist air (released by the temperature rule)
    if (G > o.gasHigh) { a.fan1 = true; a.heater = false; }  // gas has the highest priority
    // second-stage ventilation: the cabinet has two fan contactors while the firmware drives one fan
    // relay, so fan 2 is modelled here as a second stage (not firmware logic)
    if (T > o.tempHigh + h || G > o.gasHigh) a.fan2 = true; else if (T < o.tempHigh && G < o.gasHigh * 0.9) a.fan2 = false;
  }
  function fanCycle() { // scheduled airing: on for cycleOn hours, off for cycleOff hours
    if (!o.cycle) return null;
    var period = (o.cycleOnH + o.cycleOffH) * 3600, phase = s.t % period;
    return phase < o.cycleOnH * 3600;
  }
  function applyStates() {
    var forced = safetyCheck();
    if (s.t - s.lastControl >= CONTROL_INTERVAL) { autoEvaluate(); s.lastControl = s.t; }
    var cyc = fanCycle();
    var want = {};
    ACT.forEach(function (k) {
      var sel = s.sel[k];
      if (sel === "O") want[k] = false;              // selector OFF: contactor cannot close
      else if (sel === "M") want[k] = true;          // selector MANUAL: contactor forced on
      else {                                         // AUTO: controller decides, safety first
        if (forced) want[k] = forced[k];
        else if (k === "fan1" && cyc !== null) want[k] = cyc;
        else want[k] = s.auto[k];
      }
    });
    // interlocks of applyStates(): heater and cooler never together; cooler forces the fan
    if (want.heater && want.cooler && s.sel.heater === "A") want.heater = false;
    if (want.cooler && s.sel.fan1 === "A") want.fan1 = true;
    s.relay = want;
    s.warn = null;
    if (want.cooler && !want.fan1) s.warn = "Cooler running without airflow (fan 1 selector not in Auto)";
    else if (want.heater && want.cooler) s.warn = "Heater and cooler both forced on by the selectors";
    // comfort warnings (checkComfortAlerts)
    if (!forced) {
      if (s.T > o.tempHigh + 2 || s.T < o.tempLow - 2) alert("warning", "Temperature outside comfort range");
      if (s.RH > o.humHigh + 5 || s.RH < o.humLow - 5) alert("warning", "Humidity outside comfort range");
      if (s.NH3 > o.gasHigh) alert("warning", "Ammonia above threshold");
    }
  }
  function alert(level, text) {
    var key = level + text;
    if (s.lastAlert[key] !== undefined && s.t - s.lastAlert[key] < ALERT_COOLDOWN) return;
    s.lastAlert[key] = s.t;
    s.alerts.unshift({ t: s.t, level: level, text: text });
    if (s.alerts.length > 6) s.alerts.pop();
  }

  // ---------------- physics ----------------
  function stepHouse() {
    var r = s.relay, dt = 1 / 60;
    var fans = (r.fan1 ? 1 : 0) + (r.fan2 ? 1 : 0);
    var kAir = M.leak + M.fan * fans, kT = kAir + M.wall;
    var out = outdoor(), inT = out.T, inRH = out.RH;
    if (r.cooler) { // the pad cools the air the fans draw in; without airflow it only wets the air
      var twb = wetBulb(out.T, out.RH); inT = out.T - M.padEff * (out.T - twb); inRH = Math.max(out.RH, M.padRH);
    }
    var dT = M.birdHeat * o.birds + (r.heater ? M.heater : 0) - kAir * (s.T - inT) - M.wall * (s.T - out.T);
    var dRH = M.birdMoist * o.birds + (r.humid ? M.humidifier : 0) - kAir * (s.RH - inRH);
    var dG = M.birdGas * o.birds - (M.gasDecay + M.gasFan * fans) * s.NH3;
    s.T += dT * dt; s.RH = Math.min(100, Math.max(5, s.RH + dRH * dt)); s.NH3 = Math.max(0, s.NH3 + dG * dt);
    s.t++;
    s.hist.T.push(s.T); s.hist.RH.push(s.RH); s.hist.NH3.push(s.NH3);
    s.hist.act.push(ACT.reduce(function (m, k, i) { return m | (r[k] ? 1 << i : 0); }, 0));
  }
  function wetBulb(T, RH) { // Stull (2011) approximation, °C
    return T * Math.atan(0.151977 * Math.sqrt(RH + 8.313659)) + Math.atan(T + RH) - Math.atan(RH - 1.676331)
      + 0.00391838 * Math.pow(RH, 1.5) * Math.atan(0.023101 * RH) - 4.686035;
  }
  function outdoor() {
    if (!o.dayNight) return { T: o.tOut, RH: o.rhOut };
    var ph = Math.sin((s.t / 86400) * 2 * Math.PI - Math.PI / 2); // coldest at t = 0 (dawn), hottest 12 h later
    return { T: o.tOut + 6 * ph, RH: Math.min(100, Math.max(5, o.rhOut - 15 * ph)) };
  }

  // ---------------- UI ----------------
  var $ = function (id) { return document.getElementById(id); };
  var sliders = ["birds", "tOut", "rhOut", "tempLow", "tempHigh", "humLow", "humHigh", "gasHigh", "hyst", "speed", "cycleOnH", "cycleOffH"];
  var o = {}, running = true, lastFrame = null, acc = 0;
  function readControls() {
    sliders.forEach(function (id) { o[id] = parseFloat($(id).value); $(id + "-out").textContent = fmt(id, o[id]); });
    o.dayNight = $("dayNight").checked; o.cycle = $("cycle").checked;
  }
  function fmt(id, v) {
    if (id === "birds") return v + " birds";
    if (id === "speed") return v + "×";
    if (id === "gasHigh") return v + " ppm";
    if (id === "cycleOnH" || id === "cycleOffH") return v + " h";
    if (id === "hyst") return v.toFixed(1);
    if (/hum|rh/i.test(id)) return v.toFixed(0) + " %";
    return v.toFixed(1) + " °C";
  }
  function frame(ts) {
    if (lastFrame === null) lastFrame = ts;
    var dtReal = Math.min(0.1, (ts - lastFrame) / 1000); lastFrame = ts;
    if (running) {
      acc += dtReal * o.speed; var n = Math.floor(acc); acc -= n;
      if (n > 0) { for (var i = 0; i < Math.min(n, 3000); i++) { applyStates(); stepHouse(); } draw(); }
    }
    requestAnimationFrame(frame);
  }

  // selectors
  var aom = $("aom");
  ACT.forEach(function (k) {
    var row = document.createElement("div"); row.className = "aom-row";
    var name = document.createElement("span"); name.className = "name"; name.textContent = ACT_LABEL[k];
    var pill = document.createElement("span"); pill.className = "pill off"; pill.id = "pill-" + k; pill.textContent = "OFF";
    var seg = document.createElement("div"); seg.className = "seg";
    ["A", "O", "M"].forEach(function (p) {
      var b = document.createElement("button"); b.type = "button"; b.textContent = p; b.title = { A: "Auto", O: "Off", M: "Manual (on)" }[p];
      b.addEventListener("click", function () { s.sel[k] = p; renderSel(); applyStates(); draw(); });
      b.dataset.p = p; seg.appendChild(b);
    });
    row.appendChild(name); row.appendChild(pill); row.appendChild(seg); aom.appendChild(row);
  });
  function renderSel() {
    ACT.forEach(function (k) {
      aom.querySelectorAll(".aom-row").forEach(function (row) {
        if (row.querySelector(".name").textContent !== ACT_LABEL[k]) return;
        row.querySelectorAll("button").forEach(function (b) { b.className = (b.dataset.p === s.sel[k] ? "sel " + b.dataset.p.toLowerCase() : ""); });
      });
    });
  }

  // chart: three stacked strips + actuator rows
  var canvas = $("chart"), ctx = canvas.getContext("2d"), viewS = 2 * 3600;
  function strip(data, yMin, yMax, color, label, unit, top, h, padL, plotW, t0, lines) {
    var n = data.length, x = function (t) { return padL + (t - t0) / viewS * plotW; }, y = function (v) { return top + (yMax - v) / (yMax - yMin) * h; };
    ctx.strokeStyle = "#E6E1D3"; ctx.strokeRect(padL, top, plotW, h);
    ctx.fillStyle = "#4A617A"; ctx.font = "11px sans-serif"; ctx.textAlign = "right";
    ctx.fillText(yMax + unit, padL - 4, top + 10); ctx.fillText(yMin + unit, padL - 4, top + h);
    (lines || []).forEach(function (l) { if (l.v < yMin || l.v > yMax) return; ctx.strokeStyle = l.c; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(padL, y(l.v)); ctx.lineTo(padL + plotW, y(l.v)); ctx.stroke(); ctx.setLineDash([]); });
    ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.beginPath();
    var stride = Math.max(1, Math.floor(viewS / plotW / 2)), first = true;
    for (var i = Math.max(0, t0); i < n; i += stride) { var v = Math.min(yMax, Math.max(yMin, data[i])); if (first) { ctx.moveTo(x(i), y(v)); first = false; } else ctx.lineTo(x(i), y(v)); }
    ctx.stroke(); ctx.lineWidth = 1;
    ctx.fillStyle = color; ctx.textAlign = "left"; ctx.fillText(label, padL + 4, top + 12);
  }
  function draw() {
    var dpr = window.devicePixelRatio || 1, W = canvas.clientWidth, H = Math.max(360, Math.round(W * 0.62));
    if (canvas.width !== W * dpr || canvas.height !== H * dpr) { canvas.width = W * dpr; canvas.height = H * dpr; canvas.style.height = H + "px"; }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
    var padL = 58, padR = 10, plotW = W - padL - padR, rowH = 12, rows = ACT.length;
    var top = 10, gap = 8, stripsH = H - top - 20 - rows * rowH - gap * 3, h = Math.floor(stripsH / 3);
    var n = s.hist.T.length, t1 = Math.max(n, viewS), t0 = t1 - viewS;
    var out = outdoor();
    strip(s.hist.T, 0, 50, "#1B6CA8", "Temperature (°C)   outdoor " + out.T.toFixed(1), "°", top, h, padL, plotW, t0,
      [{ v: o.tempLow, c: "#2E9CCA" }, { v: o.tempHigh, c: "#2E9CCA" }, { v: SAFE.tempMin, c: "#C92A2A" }, { v: SAFE.tempMax, c: "#C92A2A" }]);
    strip(s.hist.RH, 0, 100, "#2E9CCA", "Relative humidity (%)   outdoor " + out.RH.toFixed(0), "%", top + h + gap, h, padL, plotW, t0,
      [{ v: o.humLow, c: "#2E9CCA" }, { v: o.humHigh, c: "#2E9CCA" }, { v: SAFE.humMin, c: "#C92A2A" }, { v: SAFE.humMax, c: "#C92A2A" }]);
    strip(s.hist.NH3, 0, 500, "#E8590C", "Ammonia (ppm)", "", top + 2 * (h + gap), h, padL, plotW, t0,
      [{ v: o.gasHigh, c: "#2E9CCA" }, { v: SAFE.gasMax, c: "#C92A2A" }]);
    // actuator rows
    var ay = top + 3 * (h + gap);
    var x = function (t) { return padL + (t - t0) / viewS * plotW; };
    ACT.forEach(function (k, i) {
      var yy = ay + i * rowH;
      ctx.fillStyle = "#EEE"; ctx.fillRect(padL, yy, plotW, rowH - 3);
      ctx.fillStyle = "#1B6CA8"; var start = -1;
      for (var j = Math.max(0, t0); j <= s.hist.act.length; j++) {
        var on = j < s.hist.act.length && (s.hist.act[j] & (1 << i));
        if (on && start < 0) start = j;
        if (!on && start >= 0) { ctx.fillRect(x(start), yy, Math.max(1, x(j) - x(start)), rowH - 3); start = -1; }
      }
      ctx.fillStyle = "#4A617A"; ctx.textAlign = "right"; ctx.fillText(ACT_LABEL[k], padL - 4, yy + 9);
    });
    // time axis
    ctx.textAlign = "center"; ctx.fillStyle = "#4A617A";
    for (var tt = Math.ceil(t0 / 1800) * 1800; tt <= t1; tt += 1800) ctx.fillText(fmtTime(tt), x(tt), H - 4);
    readouts();
  }
  function fmtTime(sec) { var hh = Math.floor(sec / 3600), mm = Math.floor((sec % 3600) / 60); return hh + ":" + (mm < 10 ? "0" : "") + mm; }
  function pad(str, n) { str = String(str); while (str.length < n) str += " "; return str.slice(0, n); }
  function readouts() {
    var r = s.relay;
    ACT.forEach(function (k) { var p = $("pill-" + k); p.textContent = r[k] ? "ON" : "OFF"; p.className = "pill " + (r[k] ? "on" : "off"); });
    var mode = s.safety ? "SAFE" : (o.cycle ? "CYCL" : "AUTO");
    var l1 = pad("T " + s.T.toFixed(1) + "C", 9) + pad("H " + s.RH.toFixed(0) + "%", 7);
    var l2 = s.safety ? pad("!! " + s.safety + " !!", 16) : pad("Gas " + s.NH3.toFixed(0) + "ppm", 12) + pad(mode, 4);
    $("lcd").textContent = l1 + "\n" + l2;
    var light = $("alarm-light"); light.className = "alarm-light" + (s.safety ? " on" : "");
    $("alarm-text").textContent = s.safety ? "ALARM: " + s.safety + " (siren on)" : "no alarm";
    $("r-time").textContent = fmtTime(s.t) + " h";
    $("r-warn").textContent = s.warn || "–";
    var ul = $("alerts"); ul.innerHTML = "";
    s.alerts.forEach(function (a) { var li = document.createElement("li"); li.textContent = fmtTime(a.t) + "  " + (a.level === "critical" ? "CRITICAL  " : "warning  ") + a.text; li.className = a.level; ul.appendChild(li); });
    if (!s.alerts.length) { var li = document.createElement("li"); li.className = "muted"; li.textContent = "no alerts yet"; ul.appendChild(li); }
  }

  sliders.forEach(function (id) { $(id).addEventListener("input", function () { readControls(); draw(); }); });
  ["dayNight", "cycle"].forEach(function (id) { $(id).addEventListener("change", function () { readControls(); draw(); }); });
  $("run").addEventListener("click", function () { running = !running; $("run").textContent = running ? "Pause" : "Run"; });
  $("reset").addEventListener("click", function () { readControls(); reset(); renderSel(); draw(); });
  $("allAuto").addEventListener("click", function () { ACT.forEach(function (k) { s.sel[k] = "A"; }); renderSel(); applyStates(); draw(); });
  $("view").addEventListener("change", function () { viewS = parseFloat($("view").value) * 3600; draw(); });
  window.addEventListener("resize", draw);
  readControls(); reset(); renderSel(); draw();
  requestAnimationFrame(frame);
})();
