// app.js - the earthquake dashboard.
// It first looks for the file made by the Python pipeline (data/earthquakes.json).
// If that file isn't there, it asks the USGS API directly, so the site always works.

const LIVE_URL = "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_month.geojson";
const SNAPSHOT_URL = "data/earthquakes.json";

let allQuakes = [];
const charts = {};

const $ = (id) => document.getElementById(id);
const num = new Intl.NumberFormat("en-US");
const dayFmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
const whenFmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "UTC" });

// ---------- small helpers ----------
function magColor(m) {
  if (m < 2) return "#8fb8c9";
  if (m < 4) return "#3f86a8";
  if (m < 5) return "#e3a23b";
  if (m < 6) return "#e0663c";
  return "#c4243b";
}
const regionOf = (place) => place.split(",").pop().trim();
const dayKey = (t) => new Date(t).toISOString().slice(0, 10);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function median(values) {
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}
function correlation(a, b) {
  const n = a.length, ma = a.reduce((x, y) => x + y, 0) / n, mb = b.reduce((x, y) => x + y, 0) / n;
  let sab = 0, saa = 0, sbb = 0;
  for (let i = 0; i < n; i++) { sab += (a[i] - ma) * (b[i] - mb); saa += (a[i] - ma) ** 2; sbb += (b[i] - mb) ** 2; }
  return sab / Math.sqrt(saa * sbb) || 0;
}
function countBy(list, keyFn) {
  const out = {};
  list.forEach((e) => { const k = keyFn(e); out[k] = (out[k] || 0) + 1; });
  return out;
}

// ---------- getting the data ----------
function fromGeoJSON(geo) {
  // Same cleaning idea as the Python pipeline: skip rows with missing values.
  return geo.features
    .filter((f) => f.properties.mag != null && f.properties.place && f.geometry.coordinates[2] != null)
    .map((f) => ({
      id: f.id,
      place: f.properties.place,
      region: regionOf(f.properties.place),
      magnitude: f.properties.mag,
      depth_km: f.geometry.coordinates[2],
      longitude: f.geometry.coordinates[0],
      latitude: f.geometry.coordinates[1],
      time: f.properties.time,
      tsunami: f.properties.tsunami,
    }));
}

async function loadData(forceLive) {
  if (!forceLive) {
    try {
      const res = await fetch(SNAPSHOT_URL);
      if (res.ok) {
        const snap = await res.json();
        if (Array.isArray(snap.earthquakes) && snap.earthquakes.length) {
          return { rows: snap.earthquakes, label: "pipeline file from " + new Date(snap.generated_at).toLocaleString() };
        }
      }
    } catch (err) { /* no snapshot, fall through to the live feed */ }
  }
  const res = await fetch(LIVE_URL);
  if (!res.ok) throw new Error("USGS answered with status " + res.status);
  return { rows: fromGeoJSON(await res.json()), label: "live from USGS, loaded " + new Date().toLocaleTimeString() };
}

// ---------- filters ----------
function currentQuakes() {
  const minMag = Number($("minMag").value);
  const text = $("search").value.trim().toLowerCase();
  return allQuakes.filter((e) => e.magnitude >= minMag && (!text || e.place.toLowerCase().includes(text)));
}

// ---------- drawing ----------
function drawTrace(list) {
  const c = $("trace"), dpr = window.devicePixelRatio || 1;
  const w = c.clientWidth, h = c.clientHeight;
  c.width = w * dpr; c.height = h * dpr;
  const g = c.getContext("2d");
  g.scale(dpr, dpr);
  const t0 = list.reduce((m, e) => Math.min(m, e.time), Infinity);
  const t1 = list.reduce((m, e) => Math.max(m, e.time), -Infinity);
  const mid = (h - 16) / 2;

  g.strokeStyle = "#c3cdd9";
  g.beginPath(); g.moveTo(0, mid); g.lineTo(w, mid); g.stroke();

  // small ones first so the big ones end up on top
  [...list].sort((a, b) => a.magnitude - b.magnitude).forEach((e) => {
    const x = 6 + ((e.time - t0) / (t1 - t0 || 1)) * (w - 12);
    const reach = Math.max(1, ((e.magnitude + 1) / 8) * (mid - 2));
    g.strokeStyle = magColor(e.magnitude);
    g.globalAlpha = e.magnitude >= 4 ? 1 : 0.6;
    g.lineWidth = e.magnitude >= 5 ? 2.5 : 1;
    g.beginPath(); g.moveTo(x, mid - reach); g.lineTo(x, mid + reach); g.stroke();
  });

  g.globalAlpha = 1;
  g.fillStyle = "#5c6b80"; g.font = "12px sans-serif";
  g.textAlign = "left"; g.fillText(dayFmt.format(t0), 6, h - 3);
  g.textAlign = "right"; g.fillText(dayFmt.format(t1), w - 6, h - 3);
}

function makeChart(id, config) {
  if (charts[id]) charts[id].destroy();
  charts[id] = new Chart($(id), config);
}
function axes(x, y) {
  return {
    responsive: true, maintainAspectRatio: false, animation: false,
    plugins: { legend: { display: false } },
    scales: { x: { title: { display: true, text: x } }, y: { title: { display: true, text: y } } },
  };
}
function pointTooltip() {
  return { callbacks: { label: (ctx) => `M ${ctx.raw.q.magnitude.toFixed(1)} - ${ctx.raw.q.place}` } };
}

function renderFacts(list) {
  const top = list.reduce((a, b) => (b.magnitude > a.magnitude ? b : a));
  const days = Object.keys(countBy(list, (e) => dayKey(e.time))).length;
  const tsunamis = list.filter((e) => e.tsunami === 1).length;
  const facts = [
    [num.format(list.length), `earthquakes, about ${num.format(Math.round(list.length / days))} a day`],
    ["M " + top.magnitude.toFixed(1), "was the strongest, " + esc(top.place)],
    [Math.round(median(list.map((e) => e.depth_km))) + " km", "typical depth (the median)"],
    [num.format(tsunamis), "had a tsunami warning"],
  ];
  $("facts").innerHTML = facts.map(([n, t]) => `<div><dt>${n}</dt><dd>${t}</dd></div>`).join("");
  $("lede").innerHTML =
    `${num.format(list.length)} earthquakes were recorded worldwide. The strongest, a magnitude ${top.magnitude.toFixed(1)}, ` +
    `struck ${esc(top.place)} on ${dayFmt.format(top.time)}.`;
}

function renderCharts(list) {
  // 1. magnitude histogram (bins of 0.5)
  const bins = countBy(list, (e) => Math.floor(e.magnitude * 2) / 2);
  const keys = Object.keys(bins).map(Number).sort((a, b) => a - b);
  makeChart("cMag", {
    type: "bar",
    data: { labels: keys.map((k) => k.toFixed(1)), datasets: [{ data: keys.map((k) => bins[k]), backgroundColor: keys.map(magColor) }] },
    options: axes("Magnitude (bins of 0.5)", "Earthquakes"),
  });
  const small = list.filter((e) => e.magnitude < 3).length / list.length;
  $("n1").textContent = `${Math.round(small * 100)}% of them were below magnitude 3, which most people would not feel.`;

  // 2. top regions
  const regions = Object.entries(countBy(list, (e) => e.region)).sort((a, b) => b[1] - a[1]).slice(0, 10);
  makeChart("cReg", {
    type: "bar",
    data: { labels: regions.map((r) => r[0]), datasets: [{ data: regions.map((r) => r[1]), backgroundColor: "#3f86a8" }] },
    options: { ...axes("Earthquakes", ""), indexAxis: "y" },
  });
  $("n2").textContent = regions.length ? `${regions[0][0]} came first with ${num.format(regions[0][1])} earthquakes.` : "";

  // 3. per day
  const perDay = countBy(list, (e) => dayKey(e.time));
  const days = Object.keys(perDay).sort();
  makeChart("cDay", {
    type: "line",
    data: { labels: days.map((d) => dayFmt.format(new Date(d))), datasets: [{ data: days.map((d) => perDay[d]), borderColor: "#2f6f8f", backgroundColor: "rgba(63,134,168,.15)", fill: true, tension: 0.25, pointRadius: 2 }] },
    options: axes("Day (UTC)", "Earthquakes"),
  });
  const busiest = days.reduce((a, b) => (perDay[b] > perDay[a] ? b : a));
  $("n3").textContent = `The busiest day was ${dayFmt.format(new Date(busiest))} with ${num.format(perDay[busiest])}. The first and last days may be partial.`;

  // 4. depth vs magnitude
  makeChart("cDepth", {
    type: "scatter",
    data: { datasets: [{ data: list.map((e) => ({ x: e.depth_km, y: e.magnitude, q: e })), parsing: false, pointRadius: 2, pointBackgroundColor: list.map((e) => magColor(e.magnitude)) }] },
    options: { ...axes("Depth (km)", "Magnitude"), plugins: { legend: { display: false }, tooltip: pointTooltip() } },
  });
  const r = correlation(list.map((e) => e.depth_km), list.map((e) => e.magnitude));
  const shallow = list.filter((e) => e.depth_km < 70).length / list.length;
  $("n4").textContent = `${Math.round(shallow * 100)}% were shallower than 70 km. The depth-magnitude correlation is ${r.toFixed(2)}, so depth alone says little about strength.`;

  // 5. world map as a scatter of longitude / latitude
  makeChart("cMap", {
    type: "scatter",
    data: { datasets: [{
      data: list.map((e) => ({ x: e.longitude, y: e.latitude, q: e })), parsing: false,
      pointRadius: list.map((e) => 1.5 + Math.max(0, e.magnitude - 2) * 1.1),
      pointBackgroundColor: list.map((e) => magColor(e.magnitude)),
      pointBorderColor: list.map((e) => (e.tsunami ? "#16213a" : "transparent")),
      pointBorderWidth: list.map((e) => (e.tsunami ? 2 : 0)),
    }] },
    options: { ...axes("Longitude", "Latitude"), scales: {
      x: { min: -180, max: 180, title: { display: true, text: "Longitude" } },
      y: { min: -90, max: 90, title: { display: true, text: "Latitude" } } },
      plugins: { legend: { display: false }, tooltip: pointTooltip() } },
  });
  $("n5").textContent = "Dots are sized and coloured by magnitude. Dark outlines mark tsunami warnings. Notice how the dots trace the plate boundaries, especially around the Pacific.";
}

function renderTable(list) {
  const rows = list.filter((e) => !$("onlyTsunami").checked || e.tsunami === 1)
    .sort((a, b) => b.magnitude - a.magnitude).slice(0, 15);
  $("rows").innerHTML = rows.length
    ? rows.map((e) => `<tr><td class="mag" style="color:${magColor(e.magnitude)}">${e.magnitude.toFixed(1)}</td><td>${esc(e.place)}</td>` +
        `<td>${whenFmt.format(e.time)}</td><td>${Math.round(e.depth_km)} km</td><td>${e.tsunami ? '<span class="pill">Warning</span>' : "No"}</td></tr>`).join("")
    : `<tr><td colspan="5">No earthquakes with a tsunami warning in this selection.</td></tr>`;
}

function render() {
  $("minMagOut").textContent = Number($("minMag").value).toFixed(1);
  const list = currentQuakes();
  $("dash").hidden = !list.length;
  $("empty").hidden = list.length > 0;
  $("trace").style.visibility = list.length ? "visible" : "hidden";
  if (!list.length) return;
  renderFacts(list);
  drawTrace(list);
  renderCharts(list);
  renderTable(list);
}

// ---------- start up ----------
async function start(forceLive) {
  $("status").textContent = "Loading earthquake data…";
  try {
    const { rows, label } = await loadData(forceLive);
    allQuakes = rows;
    $("status").textContent = "Data source: " + label;
    render();
  } catch (err) {
    $("status").textContent = "Could not load the data (" + err.message + "). Check your connection, then press Reload live data.";
  }
}

let timer;
const later = () => { clearTimeout(timer); timer = setTimeout(render, 150); };
$("minMag").addEventListener("input", later);
$("search").addEventListener("input", later);
$("onlyTsunami").addEventListener("change", () => renderTable(currentQuakes()));
$("reload").addEventListener("click", () => start(true));
window.addEventListener("resize", () => { const list = currentQuakes(); if (list.length) drawTrace(list); });

start(false);
