/* ---------------- Data ---------------- */
/* Every player-driven part of the dashboard (stat cards, pie chart,
   comparison bar chart) is calculated FROM this array. Add or remove
   a player and everything below recalculates automatically. */
const players = [
  { name: "Player 1", matches: 12, points: 320, winRate: 83 },
  { name: "Player 2", matches: 13, points: 280, winRate: 69 }
];

/* Match-by-match team score history. This is intentionally independent
   of the player list (it's a per-match timeline, not a per-player stat),
   so adding/removing a player will NOT change this chart. */
const performanceOverTime = {
  labels: ["Match 1","Match 2","Match 3","Match 4","Match 5","Match 6","Match 7","Match 8","Match 9","Match 10"],
  points: [65, 140, 165, 235, 190, 175, 205, 290, 270, 320]
};

/* Colour palette cycled through for per-player bars */
const PLAYER_COLORS = ["#2D6CDF", "#D6473C", "#E8912A", "#1E9E5A", "#7A4FD9", "#0EA5B7"];

/* ---------------- Derived stats ---------------- */
function computeSummary(){
  const totalMatches = players.reduce((sum, p) => sum + p.matches, 0);
  const wins = Math.round(
    players.reduce((sum, p) => sum + (p.matches * p.winRate) / 100, 0)
  );
  const losses = Math.max(totalMatches - wins, 0);
  const rate = totalMatches > 0 ? Math.round((wins / totalMatches) * 100) : 0;
  return { matches: totalMatches, wins, losses, rate };
}

/* ---------------- Tabs (visual only) ---------------- */
document.getElementById("tabs").addEventListener("click", (e) => {
  const btn = e.target.closest("button");
  if(!btn) return;
  document.querySelectorAll("#tabs button").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
});

/* ---------------- Stat card animation ---------------- */
function animateNumber(el, target, suffix = "") {
  const from = parseInt(el.textContent, 10) || 0;
  const duration = 500;
  const start = performance.now();
  function tick(now){
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(from + (target - from) * eased) + suffix;
    if(progress < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

function updateStatCards(summary){
  animateNumber(document.getElementById("statMatches"), summary.matches);
  animateNumber(document.getElementById("statWins"), summary.wins);
  animateNumber(document.getElementById("statLosses"), summary.losses);
  animateNumber(document.getElementById("statRate"), summary.rate, "%");
}

/* ---------------- Player table (add / delete) ---------------- */
const tbody = document.getElementById("playerTableBody");
const addPlayerForm = document.getElementById("addPlayerForm");
const formError = document.getElementById("formError");

function escapeHtml(str){
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function renderPlayerTable(){
  tbody.innerHTML = "";
  players.forEach((p, i) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="name">${escapeHtml(p.name)}</td>
      <td>${p.matches}</td>
      <td>${p.points}</td>
      <td class="rate">${p.winRate}%</td>
      <td class="action">
        <button type="button" class="icon-btn" data-index="${i}" aria-label="Remove ${escapeHtml(p.name)}">✕</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

/* Central place that keeps every visual in sync with the players array */
function refreshDashboard(){
  renderPlayerTable();
  const summary = computeSummary();
  updateStatCards(summary);
  drawPieChart(summary);
  drawComparisonChart();
}

tbody.addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-index]");
  if(!btn) return;
  const idx = Number(btn.dataset.index);
  players.splice(idx, 1);
  refreshDashboard();
});

addPlayerForm.addEventListener("submit", (e) => {
  e.preventDefault();
  formError.textContent = "";

  const name = document.getElementById("pName").value.trim();
  const matches = Number(document.getElementById("pMatches").value);
  const points = Number(document.getElementById("pPoints").value);
  const winRate = Number(document.getElementById("pWinRate").value);

  if(!name){
    formError.textContent = "Enter a player name.";
    return;
  }
  if([matches, points, winRate].some(v => Number.isNaN(v) || v < 0)){
    formError.textContent = "Matches, points and win rate must be zero or greater.";
    return;
  }
  if(winRate > 100){
    formError.textContent = "Win rate can't exceed 100%.";
    return;
  }

  players.push({ name, matches, points, winRate });
  refreshDashboard();
  addPlayerForm.reset();
  document.getElementById("pName").focus();
});

/* ---------------- Canvas helpers ---------------- */
function setupHiDPI(canvas){
  const ratio = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  const cssHeight = canvas.height; // used as intended CSS height when width is fluid
  canvas.width = rect.width * ratio;
  canvas.height = cssHeight * ratio;
  canvas.style.height = cssHeight + "px";
  const ctx = canvas.getContext("2d");
  ctx.scale(ratio, ratio);
  return { ctx, w: rect.width, h: cssHeight };
}

/* ---------------- Line Chart (independent match history) ---------------- */
function drawLineChart(){
  const canvas = document.getElementById("lineChart");
  const { ctx, w, h } = setupHiDPI(canvas);
  ctx.clearRect(0,0,w,h);

  const padL = 46, padR = 16, padT = 16, padB = 34;
  const plotW = w - padL - padR;
  const plotH = h - padT - padB;

  const maxVal = Math.max(...performanceOverTime.points) * 1.1;
  const minVal = 0;

  const ySteps = 5;
  ctx.strokeStyle = "#E4EAF0";
  ctx.fillStyle = "#5B6B7A";
  ctx.font = "11px Inter, sans-serif";
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  for(let i=0;i<=ySteps;i++){
    const val = minVal + ((maxVal-minVal)/ySteps)*i;
    const y = padT + plotH - (val/maxVal)*plotH;
    ctx.beginPath();
    ctx.moveTo(padL, y);
    ctx.lineTo(w-padR, y);
    ctx.stroke();
    ctx.fillText(Math.round(val), padL - 10, y);
  }

  const n = performanceOverTime.labels.length;
  const stepX = plotW / (n-1);
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  performanceOverTime.labels.forEach((lbl, i) => {
    const x = padL + stepX*i;
    ctx.fillText(lbl.replace("Match ","M"), x, h - padB + 10);
  });

  const pts = performanceOverTime.points.map((v,i) => ({
    x: padL + stepX*i,
    y: padT + plotH - (v/maxVal)*plotH
  }));

  const grad = ctx.createLinearGradient(0, padT, 0, padT+plotH);
  grad.addColorStop(0, "rgba(29,109,196,0.28)");
  grad.addColorStop(1, "rgba(29,109,196,0.02)");
  ctx.beginPath();
  ctx.moveTo(pts[0].x, padT+plotH);
  pts.forEach(p => ctx.lineTo(p.x, p.y));
  ctx.lineTo(pts[pts.length-1].x, padT+plotH);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.beginPath();
  pts.forEach((p,i) => i===0 ? ctx.moveTo(p.x,p.y) : ctx.lineTo(p.x,p.y));
  ctx.strokeStyle = "#1D6DC4";
  ctx.lineWidth = 2.5;
  ctx.lineJoin = "round";
  ctx.stroke();

  pts.forEach(p => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 4, 0, Math.PI*2);
    ctx.fillStyle = "#fff";
    ctx.strokeStyle = "#1D6DC4";
    ctx.lineWidth = 2;
    ctx.fill();
    ctx.stroke();
  });
}

/* ---------------- Pie Chart (wins/losses, derived from players) ---------------- */
function drawPieChart(summary){
  summary = summary || computeSummary();
  const canvas = document.getElementById("pieChart");
  const { ctx, w, h } = setupHiDPI(canvas);
  ctx.clearRect(0,0,w,h);

  const cx = w/2, cy = h/2;
  const radius = Math.min(w,h)/2 - 14;

  if(summary.matches === 0){
    ctx.fillStyle = "#5B6B7A";
    ctx.font = "13px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("Add a player to see this chart", cx, cy);
    return;
  }

  const data = [
    { value: summary.wins, color: "#1E9E5A", label: "Wins" },
    { value: summary.losses, color: "#D6473C", label: "Losses" }
  ];
  const total = data.reduce((s,d)=>s+d.value,0) || 1;

  let startAngle = -Math.PI/2;
  data.forEach(d => {
    const sliceAngle = (d.value/total) * Math.PI*2;
    const endAngle = startAngle + sliceAngle;

    ctx.beginPath();
    ctx.moveTo(cx,cy);
    ctx.arc(cx,cy,radius,startAngle,endAngle);
    ctx.closePath();
    ctx.fillStyle = d.color;
    ctx.fill();

    const midAngle = (startAngle+endAngle)/2;
    const lx = cx + Math.cos(midAngle) * radius*0.6;
    const ly = cy + Math.sin(midAngle) * radius*0.6;
    ctx.fillStyle = "#fff";
    ctx.font = "700 13px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(d.label, lx, ly-9);
    ctx.font = "700 18px Inter, sans-serif";
    ctx.fillText(Math.round((d.value/total)*100)+"%", lx, ly+11);

    startAngle = endAngle;
  });
}

/* ---------------- Comparison Bar Chart (one bar per player, live) ---------------- */
function drawComparisonChart(){
  const canvas = document.getElementById("barChart");
  const { ctx, w, h } = setupHiDPI(canvas);
  ctx.clearRect(0,0,w,h);

  const padL = 34, padR = 12, padT = 16, padB = 34;
  const plotW = w - padL - padR;
  const plotH = h - padT - padB;

  if(players.length === 0){
    ctx.fillStyle = "#5B6B7A";
    ctx.font = "13px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("Add a player to see this chart", w/2, h/2);
    return;
  }

  const maxVal = 100;
  const ySteps = 5;
  ctx.strokeStyle = "#E4EAF0";
  ctx.fillStyle = "#5B6B7A";
  ctx.font = "11px Inter, sans-serif";
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  for(let i=0;i<=ySteps;i++){
    const val = (maxVal/ySteps)*i;
    const y = padT + plotH - (val/maxVal)*plotH;
    ctx.beginPath();
    ctx.moveTo(padL, y);
    ctx.lineTo(w-padR, y);
    ctx.stroke();
    ctx.fillText(val, padL-8, y);
  }

  const groupWidth = plotW / players.length;
  const barWidth = Math.min(groupWidth * 0.5, 60);

  ctx.textAlign = "center";
  ctx.textBaseline = "top";

  players.forEach((p, i) => {
    const groupX = padL + groupWidth*i + groupWidth/2;
    const barH = (p.winRate/maxVal)*plotH;
    const barX = groupX - barWidth/2;
    const color = PLAYER_COLORS[i % PLAYER_COLORS.length];

    ctx.fillStyle = color;
    ctx.fillRect(barX, padT+plotH-barH, barWidth, barH);

    ctx.fillStyle = "#10202E";
    ctx.font = "700 11px Inter, sans-serif";
    ctx.fillText(p.winRate + "%", groupX, padT+plotH-barH-16);

    ctx.fillStyle = "#5B6B7A";
    ctx.font = "11px Inter, sans-serif";
    const label = p.name.length > 10 ? p.name.slice(0,9)+"…" : p.name;
    ctx.fillText(label, groupX, h - padB + 10);
  });
}

/* This chart plots each player's Win Rate %. Legend swatches are added
   dynamically in the HTML legend area to match player colors. */
function renderComparisonLegend(){
  const legend = document.getElementById("comparisonLegend");
  if(!legend) return;
  legend.innerHTML = players.map((p, i) => `
    <div class="item">
      <span class="swatch" style="background:${PLAYER_COLORS[i % PLAYER_COLORS.length]}"></span>${escapeHtml(p.name)}
    </div>
  `).join("");
}

const _origRefresh = refreshDashboard;
refreshDashboard = function(){
  _origRefresh();
  renderComparisonLegend();
};

function drawAll(){
  drawLineChart();
  const summary = computeSummary();
  drawPieChart(summary);
  drawComparisonChart();
}

window.addEventListener("load", () => {
  refreshDashboard();
  drawLineChart();
});
window.addEventListener("resize", () => {
  clearTimeout(window._resizeT);
  window._resizeT = setTimeout(drawAll, 120);
});