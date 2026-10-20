/* Queen-bee incubator thermal simulation.
   Ported to JavaScript from incubator-thermal-control-sim (Python): the two thermal plants
   fitted on one real day of telemetry (2026-10-03) and the heater controllers, plus the
   firmware's interlock (door open -> heater off; 40 °C latched cutoff). 1 s time step. */
(function () {
  "use strict";

  // ---------------- fitted parameters (data/model_params.json of the analysis repo) ----------------
  var FIT = {
    firstOrder: { a: 0.5539, b: 0.0101, deadTimeS: 210 },      // RMSE 0.29 °C
    heaterLag: { a: 0.5908, tauH: 4.9175, b: 0.0111 }          // RMSE 0.16 °C, the better model
  };
  var CUTOFF_C = 40.0, CUTOFF_REARM_C = 0.5, SENSOR_STEP = 0.01, DOOR_LOSS_GAIN = 10;
  var SENSOR_STALE_S = 10; // safety task: heater off when no valid reading for this long (simplified)

  // ---------------- plants ----------------
  function HeaterLagPlant(scale) {
    this.a = FIT.heaterLag.a * scale; this.tauH = FIT.heaterLag.tauH; this.b = FIT.heaterLag.b;
    this.dt = 1; this.temp = 27; this.e = 0;
  }
  HeaterLagPlant.prototype.reset = function (t) { this.temp = t; this.e = 0; };
  HeaterLagPlant.prototype.step = function (u, tOut, lossGain) {
    var dtMin = this.dt / 60, k = Math.exp(-dtMin / this.tauH);
    this.e = this.a * u + (this.e - this.a * u) * k;           // exact first-order filter of the element
    this.temp += dtMin * (this.e - this.b * lossGain * (this.temp - tOut));
    return this.temp;
  };
  function FirstOrderPlant(scale) {
    this.a = FIT.firstOrder.a * scale; this.b = FIT.firstOrder.b; this.n = FIT.firstOrder.deadTimeS;
    this.dt = 1; this.temp = 27; this.q = [];
  }
  FirstOrderPlant.prototype.reset = function (t) { this.temp = t; this.q = []; for (var i = 0; i < this.n; i++) this.q.push(0); };
  FirstOrderPlant.prototype.step = function (u, tOut, lossGain) {
    var uEff = this.q.shift(); this.q.push(u);                  // what was commanded deadTime ago
    this.temp += (this.dt / 60) * (this.a * uEff - this.b * lossGain * (this.temp - tOut));
    return this.temp;
  };

  // ---------------- controllers (decide(t, temp, target) -> relay on?) ----------------
  function PlainHysteresis(o) { this.band = o.band; this.name = "On/off, plain thermostat"; this.on = false; }
  PlainHysteresis.prototype.reset = function () { this.on = false; };
  PlainHysteresis.prototype.lockout = function () { this.on = false; };
  PlainHysteresis.prototype.decide = function (t, temp, target) {
    if (temp < target - this.band / 2) this.on = true;
    else if (temp > target + this.band / 2) this.on = false;
    return this.on;
  };

  // Re-implementation of Control.cpp of the queen-bee-incubator firmware (constants from Config.h,
  // FW 1.1.x): band 0.4 °C, OFF-anticipation 0.1 °C, coast lead 200 s, 30 s minimum OFF,
  // 600 s maximum continuous ON followed by a 60 s rest.
  function FirmwareHysteresis(o) {
    this.band = o.band; this.anticipation = o.anticipation; this.coastLead = o.coastLead;
    this.minOff = 30; this.dutyOn = 600; this.dutyRest = 60; this.window = 60; this.minSpan = 20; this.minGap = 0.05;
    this.name = "On/off with OFF-anticipation (firmware)"; this.reset();
  }
  FirmwareHysteresis.prototype.reset = function () {
    this.buf = []; this.logicalOn = false; this.offAt = null; this.onSince = null; this.resting = false; this.restStart = 0;
    this.lastRate = 0; this.lastProjected = 0;
  };
  FirmwareHysteresis.prototype.lockout = function () { this.logicalOn = false; this.resting = false; this.onSince = null; };
  FirmwareHysteresis.prototype.decide = function (t, temp, target) {
    var lo = target - this.band / 2, hi = target + this.band / 2 - this.anticipation;
    if (hi < lo + this.minGap) hi = lo + this.minGap;
    // rate of rise over the window, zero until minSpan samples, never negative
    var span = this.buf.length, oldest = span ? this.buf[0] : temp;
    this.buf.push(temp); if (this.buf.length > this.window) this.buf.shift();
    var rate = span < this.minSpan ? 0 : Math.max(0, (temp - oldest) / span);
    var projected = temp + rate * this.coastLead;
    this.lastRate = rate; this.lastProjected = projected;
    var nxt = this.logicalOn;
    if (projected < lo) nxt = true; else if (projected > hi) nxt = false;
    if (nxt && !this.logicalOn && this.offAt !== null && t - this.offAt < this.minOff) nxt = false; // min OFF time
    if (!nxt && this.logicalOn) this.offAt = t;
    this.logicalOn = nxt;
    var desired = nxt;
    if (desired) {                                             // duty-cycle gate
      if (this.resting) { if (t - this.restStart < this.dutyRest) desired = false; else this.resting = false; }
      else if (this.onSince !== null && t - this.onSince >= this.dutyOn) { this.resting = true; this.restStart = t; desired = false; }
    } else this.resting = false;
    if (desired) { if (this.onSince === null) this.onSince = t; } else this.onSince = null;
    return desired;
  };

  // PI tuned with Skogestad's SIMC rules on the first-order fit (kp 0.258 /°C, Ti 28 min), conditional
  // integration anti-windup, output time-proportioned over a 120 s window with a 10 s minimum pulse.
  function PIDRelay() {
    var k = FIT.firstOrder.a / FIT.firstOrder.b, tau = 1 / FIT.firstOrder.b, theta = FIT.firstOrder.deadTimeS / 60;
    this.kp = tau / (k * (2 * theta)); this.ti = Math.min(tau, 8 * theta);
    this.windowS = 120; this.minPulse = 10; this.name = "PID (PI, SIMC-tuned) on a relay"; this.reset();
  }
  PIDRelay.prototype.reset = function () { this.integral = 0; this.windowStart = 0; this.onUntil = 0; this.init = false; this.lastDuty = 0; };
  PIDRelay.prototype.lockout = function () { this.init = false; this.onUntil = 0; };
  PIDRelay.prototype.decide = function (t, temp, target) {
    if (!this.init || t - this.windowStart >= this.windowS - 1e-9) {
      this.init = true; this.windowStart = t;
      var err = target - temp, dtMin = this.windowS / 60, p = this.kp * err, unsat = p + this.integral;
      var satHi = unsat >= 1 && err > 0, satLo = unsat <= 0 && err < 0;
      if (!(satHi || satLo)) this.integral = Math.min(1, Math.max(0, this.integral + this.kp * err * dtMin / this.ti));
      var duty = Math.min(1, Math.max(0, p + this.integral));
      this.lastDuty = duty;
      var onS = Math.round(duty * this.windowS);
      if (onS < this.minPulse) onS = 0; else if (this.windowS - onS < this.minPulse) onS = this.windowS;
      this.onUntil = t + onS;
    }
    return t < this.onUntil - 1e-9;
  };

  function makeController(kind, o) {
    if (kind === "firmware") return new FirmwareHysteresis(o);
    if (kind === "plain") return new PlainHysteresis(o);
    return new PIDRelay();
  }
  function makePlant(kind, scale) { return kind === "firstOrder" ? new FirstOrderPlant(scale) : new HeaterLagPlant(scale); }

  // ---------------- one simulated unit = plant + controller + interlock ----------------
  function Unit(ctlKind, plantKind, o) {
    this.ctlKind = ctlKind; this.plant = makePlant(plantKind, o.powerScale); this.ctl = makeController(ctlKind, o);
    this.t = 0; this.latched = false; this.ack = true; this.u = false; this.heaterOnS = 0; this.switchOns = 0; this.prevU = false;
    this.maxOver = 0; this.inBandS = 0; this.lastValidT = 0; this.sensorFail = false;
    this.temps = []; this.heat = []; this.plant.reset(o.t0);
  }
  Unit.prototype.step = function (o) {
    var reading = Math.round(this.plant.temp / SENSOR_STEP) * SENSOR_STEP;
    var valid = !o.sensorFault;
    if (valid) this.lastValidT = this.t;
    var stale = this.t - this.lastValidT >= SENSOR_STALE_S;
    this.sensorFail = stale;
    if (valid && reading >= CUTOFF_C) { this.latched = true; this.ack = false; }
    else if (this.latched && this.ack && valid && reading <= CUTOFF_C - CUTOFF_REARM_C) this.latched = false;
    var blocked = o.doorOpen || this.latched || stale;
    if (blocked) { this.ctl.lockout(this.t); this.u = false; }
    else this.u = !!this.ctl.decide(this.t, reading, o.target);
    if (this.u && !this.prevU) this.switchOns++;
    this.prevU = this.u;
    if (this.u) this.heaterOnS++;
    this.temps.push(this.plant.temp); this.heat.push(this.u ? 1 : 0);
    var over = this.plant.temp - o.target; if (over > this.maxOver) this.maxOver = over;
    if (Math.abs(over) <= o.band / 2) this.inBandS++;
    this.plant.step(this.u ? 1 : 0, o.ambient, o.doorOpen ? DOOR_LOSS_GAIN : 1);
    this.t++;
  };
  Unit.prototype.duty = function (lastN) {
    var n = Math.min(lastN, this.heat.length); if (!n) return 0;
    var s = 0; for (var i = this.heat.length - n; i < this.heat.length; i++) s += this.heat[i];
    return s / n;
  };

  // ---------------- UI ----------------
  var $ = function (id) { return document.getElementById(id); };
  var ids = ["target", "ambient", "band", "anticipation", "coastLead", "powerScale", "speed"];
  var o = { doorOpen: false, sensorFault: false, t0: 27.2 };
  var units = [], running = true, lastFrame = null, acc = 0, viewHours = 4;
  var COLORS = ["#1B6CA8", "#E8590C", "#2F9E44"];

  function readControls() {
    ids.forEach(function (id) { o[id] = parseFloat($(id).value); $(id + "-out").textContent = fmt(id, o[id]); });
    o.ctlA = $("ctlA").value; o.ctlB = $("ctlB").value; o.plant = $("plant").value;
  }
  function fmt(id, v) {
    if (id === "speed") return v + "×";
    if (id === "coastLead") return v + " s";
    if (id === "powerScale") return "×" + v.toFixed(2);
    return v.toFixed(id === "ambient" ? 0 : (id === "target" ? 1 : 2)) + " °C";
  }
  function liveParams() { // sliders that may change mid-run without a reset
    units.forEach(function (u) {
      if (u.ctl instanceof FirmwareHysteresis) { u.ctl.band = o.band; u.ctl.anticipation = o.anticipation; u.ctl.coastLead = o.coastLead; }
      if (u.ctl instanceof PlainHysteresis) u.ctl.band = o.band;
      u.plant.a = (o.plant === "firstOrder" ? FIT.firstOrder.a : FIT.heaterLag.a) * o.powerScale;
    });
  }
  function reset(startAtTarget) {
    readControls();
    o.doorOpen = false; o.sensorFault = false;
    o.t0 = startAtTarget ? o.target - 0.1 : o.ambient;
    units = [new Unit(o.ctlA, o.plant, o)];
    if (o.ctlB !== "none" && o.ctlB !== o.ctlA) units.push(new Unit(o.ctlB, o.plant, o));
    $("door").textContent = "Open the door"; $("fault").textContent = "Inject sensor fault";
    acc = 0; draw();
  }
  function stepAll(n) { for (var i = 0; i < n; i++) units.forEach(function (u) { u.step(o); }); }
  function frame(ts) {
    if (lastFrame === null) lastFrame = ts;
    var dtReal = Math.min(0.1, (ts - lastFrame) / 1000); lastFrame = ts;
    if (running) {
      acc += dtReal * o.speed;
      var n = Math.floor(acc); acc -= n;
      if (n > 0) { stepAll(Math.min(n, 2000)); draw(); }
    }
    requestAnimationFrame(frame);
  }

  // ---------------- chart ----------------
  var canvas = $("chart"), ctx = canvas.getContext("2d");
  function draw() {
    var dpr = window.devicePixelRatio || 1, W = canvas.clientWidth, Hh = Math.max(300, Math.round(W * 0.55));
    if (canvas.width !== W * dpr || canvas.height !== Hh * dpr) { canvas.width = W * dpr; canvas.height = Hh * dpr; canvas.style.height = Hh + "px"; }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, Hh);
    var padL = 58, padR = 12, padT = 12, stripH = 14, padB = 28 + stripH * units.length + 6;
    var plotW = W - padL - padR, plotH = Hh - padT - padB;
    var u0 = units[0], n = u0.temps.length, winS = viewHours * 3600, t1 = Math.max(n, winS), t0s = t1 - winS;
    var yMin = Math.min(o.ambient, o.target) - 1.5, yMax = Math.max(o.target + 1.5, CUTOFF_C + 0.5);
    units.forEach(function (u) { for (var i = Math.max(0, t0s); i < n; i += 15) { if (u.temps[i] < yMin) yMin = u.temps[i] - 0.5; if (u.temps[i] > yMax) yMax = u.temps[i] + 0.5; } });
    var x = function (t) { return padL + (t - t0s) / winS * plotW; }, y = function (v) { return padT + (yMax - v) / (yMax - yMin) * plotH; };
    // target band + cutoff
    ctx.fillStyle = "rgba(255,201,60,.28)"; ctx.fillRect(padL, y(o.target + o.band / 2), plotW, y(o.target - o.band / 2) - y(o.target + o.band / 2));
    ctx.strokeStyle = "#F9B233"; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(padL, y(o.target)); ctx.lineTo(padL + plotW, y(o.target)); ctx.stroke();
    ctx.strokeStyle = "#C92A2A"; ctx.beginPath(); ctx.moveTo(padL, y(CUTOFF_C)); ctx.lineTo(padL + plotW, y(CUTOFF_C)); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = "#C92A2A"; ctx.font = "11px sans-serif"; ctx.fillText("40 °C cutoff", padL + 4, y(CUTOFF_C) - 3);
    // grid + axes
    ctx.strokeStyle = "#E6E1D3"; ctx.fillStyle = "#4A617A"; ctx.textAlign = "right";
    var stepY = (yMax - yMin) > 12 ? 2 : 1;
    for (var v = Math.ceil(yMin); v <= yMax; v += stepY) { ctx.beginPath(); ctx.moveTo(padL, y(v)); ctx.lineTo(padL + plotW, y(v)); ctx.stroke(); ctx.fillText(v + "°", padL - 4, y(v) + 4); }
    ctx.textAlign = "center";
    var stepT = viewHours >= 4 ? 1800 : 600;
    for (var tt = Math.ceil(t0s / stepT) * stepT; tt <= t1; tt += stepT) { ctx.beginPath(); ctx.moveTo(x(tt), padT); ctx.lineTo(x(tt), padT + plotH); ctx.stroke(); ctx.fillText(fmtTime(tt), x(tt), padT + plotH + 14); }
    // traces
    var stride = Math.max(1, Math.floor(winS / plotW / 2));
    units.forEach(function (u, k) {
      ctx.strokeStyle = COLORS[k]; ctx.lineWidth = 2; ctx.beginPath();
      var first = true;
      for (var i = Math.max(0, t0s); i < u.temps.length; i += stride) { var px = x(i), py = y(u.temps[i]); if (first) { ctx.moveTo(px, py); first = false; } else ctx.lineTo(px, py); }
      ctx.stroke(); ctx.lineWidth = 1;
      // heater strip
      var sy = padT + plotH + 20 + k * stripH;
      ctx.fillStyle = "#EEE"; ctx.fillRect(padL, sy, plotW, stripH - 3);
      ctx.fillStyle = COLORS[k];
      var runStart = -1;
      for (var j = Math.max(0, t0s); j <= u.heat.length; j++) {
        var on = j < u.heat.length && u.heat[j] === 1;
        if (on && runStart < 0) runStart = j;
        if (!on && runStart >= 0) { ctx.fillRect(x(runStart), sy, Math.max(1, x(j) - x(runStart)), stripH - 3); runStart = -1; }
      }
      ctx.fillStyle = "#4A617A"; ctx.textAlign = "right"; ctx.fillText("heater " + String.fromCharCode(65 + k), padL - 4, sy + 9);
    });
  }
  function fmtTime(s) { var h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60); return h + ":" + (m < 10 ? "0" : "") + m; }

  // ---------------- readouts ----------------
  function readouts() {
    var u = units[0];
    $("r-time").textContent = fmtTime(u.t) + " h";
    $("r-temp").textContent = u.plant.temp.toFixed(2) + " °C";
    var r = $("r-heater"); r.textContent = u.u ? "ON" : "OFF"; r.parentNode.classList.toggle("on", u.u);
    $("r-duty").textContent = (u.duty(1800) * 100).toFixed(0) + " % / " + (u.duty(1e9) * 100).toFixed(0) + " %";
    $("r-switch").textContent = u.switchOns;
    $("r-over").textContent = (u.maxOver > 0 ? "+" : "") + u.maxOver.toFixed(2) + " °C";
    $("r-band").textContent = u.t ? (u.inBandS / u.t * 100).toFixed(0) + " %" : "–";
    var s = $("r-safety"), txt = "normal", cls = "";
    if (u.latched) { txt = u.ack ? "LATCHED, cooling" : "LATCHED 40 °C"; cls = "alarm"; }
    else if (u.sensorFail) { txt = "SENSOR ERROR"; cls = "alarm"; }
    else if (o.doorOpen) { txt = "door open, paused"; cls = "warn"; }
    s.textContent = txt; s.parentNode.className = "readout " + cls;
    $("ack").disabled = !(u.latched && !u.ack);
    if (units[1]) {
      var b = units[1];
      $("cmp").innerHTML = "";
      [u, b].forEach(function (x, k) {
        $("cmp").appendChild(row([String.fromCharCode(65 + k) + ": " + x.ctl.name, (x.maxOver > 0 ? "+" : "") + x.maxOver.toFixed(2) + " °C", x.switchOns, (x.duty(1e9) * 100).toFixed(0) + " %", x.t ? (x.inBandS / x.t * 100).toFixed(0) + " %" : "–"], COLORS[k]));
      });
      $("cmp-wrap").hidden = false;
    } else $("cmp-wrap").hidden = true;
  }
  function row(cells, color) {
    var tr = document.createElement("tr");
    cells.forEach(function (c, i) { var td = document.createElement("td"); td.textContent = c; if (i === 0) { td.style.color = color; td.style.fontWeight = "700"; } tr.appendChild(td); });
    return tr;
  }
  var drawBase = draw; draw = function () { drawBase(); readouts(); };

  // ---------------- wire up ----------------
  ids.forEach(function (id) { $(id).addEventListener("input", function () { readControls(); liveParams(); draw(); }); });
  ["ctlA", "ctlB", "plant"].forEach(function (id) { $(id).addEventListener("change", function () { reset(false); }); });
  $("run").addEventListener("click", function () { running = !running; $("run").textContent = running ? "Pause" : "Run"; });
  $("reset").addEventListener("click", function () { reset(false); });
  $("hot").addEventListener("click", function () { reset(true); });
  $("door").addEventListener("click", function () { o.doorOpen = !o.doorOpen; $("door").textContent = o.doorOpen ? "Close the door" : "Open the door"; draw(); });
  $("fault").addEventListener("click", function () { o.sensorFault = !o.sensorFault; $("fault").textContent = o.sensorFault ? "Clear sensor fault" : "Inject sensor fault"; draw(); });
  $("ack").addEventListener("click", function () { units.forEach(function (u) { u.ack = true; }); draw(); });
  $("view").addEventListener("change", function () { viewHours = parseFloat($("view").value); draw(); });
  window.addEventListener("resize", draw);
  reset(false);
  requestAnimationFrame(frame);
})();
