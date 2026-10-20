/* LoRa link budget and range calculator (log-distance path-loss model). */
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var SNR_REQ = { 7: -7.5, 8: -10, 9: -12.5, 10: -15, 11: -17.5, 12: -20 }; // dB, Semtech SX127x datasheet
  var ids = ["txPower", "txGain", "rxGain", "freq", "sf", "bw", "nf", "n", "d0", "margin", "hTx", "hRx"];
  var o = {};
  function read() { ids.forEach(function (id) { o[id] = parseFloat($(id).value); }); }
  function sensitivity() { return -174 + 10 * Math.log10(o.bw * 1000) + o.nf + SNR_REQ[o.sf]; }
  function pathLoss(dM) { // free space to d0, then log-distance with exponent n
    var fspl0 = 20 * Math.log10(o.d0) + 20 * Math.log10(o.freq * 1e6) - 147.55;
    return fspl0 + 10 * o.n * Math.log10(Math.max(dM, o.d0) / o.d0);
  }
  function rssi(dM) { return o.txPower + o.txGain + o.rxGain - pathLoss(dM); }
  function maxRange(threshold) { // solve rssi(d) = threshold
    var fspl0 = 20 * Math.log10(o.d0) + 20 * Math.log10(o.freq * 1e6) - 147.55;
    var allowed = o.txPower + o.txGain + o.rxGain - threshold - fspl0;
    return allowed < 0 ? 0 : o.d0 * Math.pow(10, allowed / (10 * o.n));
  }
  function symbolTime() { return Math.pow(2, o.sf) / (o.bw * 1000) * 1000; } // ms
  function airtime(payload) { // LoRa airtime, explicit header, CR 4/5, preamble 8, LDRO when symbol > 16 ms
    var ts = Math.pow(2, o.sf) / (o.bw * 1000), de = ts > 0.016 ? 1 : 0;
    var nPay = 8 + Math.max(Math.ceil((8 * payload - 4 * o.sf + 28 + 16) / (4 * (o.sf - 2 * de))) * 5, 0);
    return ((8 + 4.25) + nPay) * ts * 1000;
  }
  function horizon() { return 3570 * (Math.sqrt(o.hTx) + Math.sqrt(o.hRx)); } // radio horizon, m (4/3 earth)
  function fmtD(m) { return m >= 1000 ? (m / 1000).toFixed(2) + " km" : m.toFixed(0) + " m"; }

  var canvas = $("chart"), ctx = canvas.getContext("2d");
  function draw() {
    read();
    var sens = sensitivity(), thr = sens + o.margin, dMax = maxRange(thr), dSens = maxRange(sens);
    $("r-sens").textContent = sens.toFixed(1) + " dBm";
    $("r-budget").textContent = (o.txPower + o.txGain + o.rxGain - sens).toFixed(1) + " dB";
    $("r-range").textContent = fmtD(dMax);
    $("r-range0").textContent = fmtD(dSens);
    $("r-horizon").textContent = fmtD(horizon());
    $("r-ts").textContent = symbolTime().toFixed(2) + " ms";
    $("r-air").textContent = airtime(20).toFixed(0) + " ms";
    $("r-bitrate").textContent = (o.sf * (o.bw * 1000) / Math.pow(2, o.sf) * 4 / 5 / 1000).toFixed(2) + " kbit/s";
    ids.forEach(function (id) { var out = $(id + "-out"); if (out) out.textContent = $(id).value; });
    // chart: RSSI vs distance (log x)
    var dpr = window.devicePixelRatio || 1, W = canvas.clientWidth, H = Math.max(280, Math.round(W * 0.5));
    if (canvas.width !== W * dpr || canvas.height !== H * dpr) { canvas.width = W * dpr; canvas.height = H * dpr; canvas.style.height = H + "px"; }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
    var padL = 50, padR = 12, padT = 12, padB = 30, pw = W - padL - padR, ph = H - padT - padB;
    var xMin = Math.log10(10), xMax = Math.log10(Math.max(2000, dSens * 3, 100)), yMin = -160, yMax = 20;
    var x = function (d) { return padL + (Math.log10(d) - xMin) / (xMax - xMin) * pw; }, y = function (v) { return padT + (yMax - v) / (yMax - yMin) * ph; };
    ctx.strokeStyle = "#E6E1D3"; ctx.fillStyle = "#4A617A"; ctx.font = "11px sans-serif"; ctx.textAlign = "right";
    for (var v = yMin; v <= yMax; v += 20) { ctx.beginPath(); ctx.moveTo(padL, y(v)); ctx.lineTo(padL + pw, y(v)); ctx.stroke(); ctx.fillText(v + " dBm", padL - 4, y(v) + 4); }
    ctx.textAlign = "center";
    for (var e = Math.ceil(xMin); e <= xMax; e++) { var d = Math.pow(10, e); ctx.beginPath(); ctx.moveTo(x(d), padT); ctx.lineTo(x(d), padT + ph); ctx.stroke(); ctx.fillText(fmtD(d), x(d), H - 10); }
    // sensitivity and margin lines
    ctx.setLineDash([4, 4]); ctx.strokeStyle = "#C92A2A"; ctx.beginPath(); ctx.moveTo(padL, y(sens)); ctx.lineTo(padL + pw, y(sens)); ctx.stroke();
    ctx.strokeStyle = "#F9B233"; ctx.beginPath(); ctx.moveTo(padL, y(thr)); ctx.lineTo(padL + pw, y(thr)); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = "#C92A2A"; ctx.textAlign = "left"; ctx.fillText("sensitivity", padL + 4, y(sens) - 3);
    ctx.fillStyle = "#8a5a00"; ctx.fillText("sensitivity + fade margin", padL + 4, y(thr) - 3);
    // curve
    ctx.strokeStyle = "#1B6CA8"; ctx.lineWidth = 2; ctx.beginPath();
    for (var i = 0; i <= 200; i++) { var dd = Math.pow(10, xMin + (xMax - xMin) * i / 200), r = Math.max(yMin, rssi(dd)); if (i === 0) ctx.moveTo(x(dd), y(r)); else ctx.lineTo(x(dd), y(r)); }
    ctx.stroke(); ctx.lineWidth = 1;
    if (dMax > 0) { ctx.fillStyle = "#1B6CA8"; ctx.beginPath(); ctx.arc(x(dMax), y(thr), 5, 0, 7); ctx.fill(); ctx.fillText("range " + fmtD(dMax), x(dMax) + 8, y(thr) + 14); }
  }
  ids.forEach(function (id) { $(id).addEventListener("input", draw); $(id).addEventListener("change", draw); });
  window.addEventListener("resize", draw);
  draw();
})();
