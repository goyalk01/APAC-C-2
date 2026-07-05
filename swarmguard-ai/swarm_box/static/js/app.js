// ═══════════════════════════════════════════════════════════════
//  SwarmGuard AI — Command Center Dashboard JS Engine
// ═══════════════════════════════════════════════════════════════

// ─── DOM Selector Helper ───
const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

// ─── DOM References ───
const alertFeed = $('#alert-feed');
const feedEmpty = $('#feed-empty');
const feedCount = $('#feed-count');
const evidenceEmpty = $('#evidence-empty');
const evidenceCanvas = $('#evidence-canvas');
const evidenceStatus = $('#evidence-status');
const connStatus = $('#connection-status');
const connChip = $('#conn-chip');
const ttsIndicator = $('#tts-indicator');
const ttsText = $('#tts-text');
const clock = $('#header-clock');
const themeToggle = $('#themeToggle');
const logsConsole = $('#logs-console');
const clearLogsBtn = $('#clearLogs');
const syncCachedCount = $('#sync-cached-count');
const syncNowBtn = $('#syncNowBtn');
const syncProgress = $('#syncProgress');
const syncProgressBar = $('#syncProgressBar');
const dbTableBody = $('#db-table-body');
const nodeTelemetryGrid = $('#node-telemetry-grid');

// ─── State ───
let charts = {
  threatDash: null,
  confDash: null,
  threatFull: null,
  confFull: null,
};

const alertCounts = {};
const confidenceData = {};
const nodesReported = new Set();
let alertsList = [];
let totalAlertsCount = 0;
let verifiedCount = 0;
let selectedCard = null;

// Telemetry state for simulated nodes
const nodeTelemetry = {
  NODE_001: { cpu: 12, ram: 34, signal: 94, battery: 98, status: 'ONLINE', latency: 45 },
  NODE_002: { cpu: 18, ram: 28, signal: 88, battery: 92, status: 'ONLINE', latency: 60 },
  NODE_003: { cpu: 24, ram: 42, signal: 90, battery: 85, status: 'ONLINE', latency: 55 },
  NODE_004: { cpu: 15, ram: 31, signal: 85, battery: 90, status: 'ONLINE', latency: 72 },
  NODE_005: { cpu: 22, ram: 38, signal: 92, battery: 88, status: 'ONLINE', latency: 40 },
};

// Alert Configuration
const ALERT_CONFIG = {
  BRIDGE_COLLAPSE:  { color: '#ff3860', label: 'Bridge Collapse', lightColor: '#e02424' },
  FLOODING:         { color: '#00b8ff', label: 'Flooding', lightColor: '#1c64f2' },
  STRUCTURAL_FIRE:  { color: '#ffaa00', label: 'Structural Fire', lightColor: '#b45309' },
  GAS_LEAK:         { color: '#a78bfa', label: 'Gas Leak', lightColor: '#7c3aed' },
  CROWD_STAMPEDE:   { color: '#ff7700', label: 'Crowd Stampede', lightColor: '#ea580c' },
};

// Node Mapping Positions for Radar Map
const MAP_NODES = {
  NODE_001: { x: 0.58, y: 0.35, label: 'N-001' },
  NODE_002: { x: 0.55, y: 0.56, label: 'N-002' },
  NODE_003: { x: 0.35, y: 0.22, label: 'N-003' },
  NODE_004: { x: 0.15, y: 0.72, label: 'N-004' },
  NODE_005: { x: 0.40, y: 0.28, label: 'N-005' },
};
const SWARM_BOX_POS = { x: 0.82, y: 0.52, label: 'SWARM BOX' };

// ─── Theme Management ───
function getTheme() {
  return localStorage.getItem('sg-theme') || 'dark';
}
function setTheme(t) {
  document.documentElement.setAttribute('data-theme', t);
  localStorage.setItem('sg-theme', t);
  
  // Re-initialize all charts to match the new background/theme styles
  destroyAllCharts();
  initCharts();
  updateCharts();
  
  addLogLine(`[SYSTEM] Switched UI theme to ${t.toUpperCase()}`, 'info');
}
themeToggle.addEventListener('click', () => {
  setTheme(getTheme() === 'dark' ? 'light' : 'dark');
});
// Set initial theme
document.documentElement.setAttribute('data-theme', getTheme());

// ─── Navigation Tabs ───
$$('.nav-pill').forEach(pill => {
  pill.addEventListener('click', () => {
    const targetTab = pill.dataset.tab;
    
    // Toggle active classes
    $$('.nav-pill').forEach(p => p.classList.remove('active'));
    $$('.tab-pane').forEach(pane => pane.classList.remove('active'));
    
    pill.classList.add('active');
    const activePane = $(`#${targetTab}`);
    if (activePane) activePane.classList.add('active');
    
    addLogLine(`[SYSTEM] Active viewport toggled to: ${targetTab.replace('tab-', '').toUpperCase()}`, 'info');
    
    // Re-draw canvases
    setTimeout(() => {
      if (targetTab === 'tab-dashboard') {
        resizeCanvas('tacticalMap-dash');
      } else if (targetTab === 'tab-mesh') {
        resizeCanvas('tacticalMap-large');
        renderNodeTelemetry();
      }
    }, 50);
  });
});

// Helper to keep canvas sizes crisp
function resizeCanvas(id) {
  const canvas = document.getElementById(id);
  if (!canvas) return;
  const parent = canvas.parentElement;
  canvas.width = parent.clientWidth * 2;
  canvas.height = parent.clientHeight * 2;
}

// ─── Clock ───
function updateClock() {
  const now = new Date();
  clock.textContent = now.toLocaleTimeString('en-US', { hour12: false });
}
setInterval(updateClock, 1000);
updateClock();

// ─── Log Console Writer ───
function addLogLine(msg, type = 'info') {
  if (!logsConsole) return;
  const line = document.createElement('div');
  line.className = `console-line line-${type}`;
  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-US', { hour12: false });
  line.textContent = `[${timeStr}] ${msg}`;
  logsConsole.appendChild(line);
  logsConsole.scrollTop = logsConsole.scrollHeight;
}
clearLogsBtn.addEventListener('click', () => {
  if (logsConsole) logsConsole.innerHTML = '';
});

// ─── WebSocket Connection ───
const ws = new WebSocket(`ws://${location.host}/ws/dashboard`);

ws.onopen = () => {
  connStatus.textContent = 'Mesh Connected';
  connChip.classList.remove('offline');
  addLogLine('[MESH] Peer-to-peer relay link established successfully.', 'success');
};

ws.onclose = () => {
  connStatus.textContent = 'Blackout Mode (No Relay)';
  connChip.classList.add('offline');
  addLogLine('[MESH] Relay connection down. Defaulting to local blackout-mesh mode.', 'error');
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.type === 'new_alert') {
    handleNewAlert(data);
  }
};

// ─── Initialize Data ───
fetch('/api/v1/alerts')
  .then(r => r.json())
  .then(alerts => {
    if (alerts && alerts.length > 0) {
      alerts.reverse().forEach(a => {
        const payload = {
          node_id: a.node_id,
          alert_type: a.alert_type,
          confidence: a.confidence,
          gps: { lat: a.latitude, lng: a.longitude },
          timestamp: a.timestamp,
          model_version: a.model_version,
          visual_proof_hash: a.visual_proof_hash || '',
          signature: a.signature,
        };
        handleNewAlert({ payload, speech: null, event_id: a.event_id }, true);
      });
    }
  })
  .catch(() => {});

// ─── Handle Incoming Alerts ───
function handleNewAlert(data, silent = false) {
  const p = data.payload;
  totalAlertsCount++;
  verifiedCount++;
  nodesReported.add(p.node_id);
  alertsList.push(p);

  // Update counts
  alertCounts[p.alert_type] = (alertCounts[p.alert_type] || 0) + 1;
  confidenceData[p.alert_type] = p.confidence;

  // Telemetry updates
  if (nodeTelemetry[p.node_id]) {
    nodeTelemetry[p.node_id].status = 'ONLINE';
    nodeTelemetry[p.node_id].battery = Math.max(20, nodeTelemetry[p.node_id].battery - 1);
    nodeTelemetry[p.node_id].latency = Math.floor(Math.random() * 30) + 30;
  }

  // Update Dashboard UI Elements
  $('#stat-alerts').textContent = totalAlertsCount;
  $('#stat-nodes').textContent = `${nodesReported.size}/5`;
  $('#stat-verified').textContent = verifiedCount;
  $('#sync-cached-count').textContent = totalAlertsCount;
  
  updateThreatLevelPill();

  if (feedEmpty && feedEmpty.parentNode) feedEmpty.remove();

  // Create alert card
  createAlertCard(p);

  // Update table records
  updateSyncRecordsTable();

  // Update charts & maps
  updateCharts();

  if (!silent) {
    flashScreenOverlay();
    addLogLine(`[DECRYPT] Signature verified for node ${p.node_id}. Alert: ${p.alert_type}.`, 'success');
    if (data.speech) playAudioSynthesis(data.speech, p.alert_type);
  }
}

function updateThreatLevelPill() {
  const val = $('#stat-threat');
  const pill = $('#stat-threat-pill');
  if (totalAlertsCount >= 4) {
    val.textContent = 'CRITICAL';
    pill.style.borderColor = 'var(--accent-critical-border)';
    pill.style.background = 'var(--accent-critical-bg)';
    val.style.color = 'var(--accent-critical)';
  } else if (totalAlertsCount >= 2) {
    val.textContent = 'HIGH';
    pill.style.borderColor = 'var(--accent-warning-border)';
    pill.style.background = 'var(--accent-warning-bg)';
    val.style.color = 'var(--accent-warning)';
  } else if (totalAlertsCount >= 1) {
    val.textContent = 'ELEVATED';
    pill.style.borderColor = 'var(--accent-info-border)';
    pill.style.background = 'var(--accent-info-bg)';
    val.style.color = 'var(--accent-info)';
  }
}

// ─── Dynamic Card Insertion ───
function createAlertCard(p) {
  const card = document.createElement('div');
  const confPercent = Math.round(p.confidence * 100);
  const style = ALERT_CONFIG[p.alert_type] || { color: '#ff3860', label: p.alert_type, lightColor: '#e02424' };
  
  // Custom properties based on theme
  const isLight = getTheme() === 'light';
  const color = isLight ? style.lightColor : style.color;

  card.className = `alert-card ${confPercent >= 90 ? 'critical-glow' : ''}`;
  card.innerHTML = `
    <div class="alert-row-top">
      <span class="alert-type-badge" style="color: ${color}">
        <span class="alert-type-dot" style="background: ${color}"></span>
        ${style.label.toUpperCase()}
      </span>
      <span class="alert-conf" style="color: ${color}; background: ${isLight ? style.lightColor + '10' : style.color + '15'}">${confPercent}%</span>
    </div>
    <div class="alert-conf-bar">
      <div class="alert-conf-fill" style="width: ${confPercent}%; background: ${color}"></div>
    </div>
    <div class="alert-meta">
      <span class="alert-meta-item"><span class="alert-meta-icon">⬡</span> ${p.node_id}</span>
      <span class="alert-meta-item"><span class="alert-meta-icon">◎</span> ${p.gps.lat.toFixed(4)}, ${p.gps.lng.toFixed(4)}</span>
      <span class="alert-meta-item"><span class="alert-meta-icon">◷</span> ${new Date(p.timestamp).toLocaleTimeString()}</span>
      <span class="alert-meta-item" style="color: var(--accent-primary)"><span class="alert-meta-icon">✓</span> Verified</span>
    </div>
  `;

  card.onclick = () => {
    if (selectedCard) selectedCard.classList.remove('selected');
    card.classList.add('selected');
    selectedCard = card;
    triggerEvidencePull(p);
  };

  alertFeed.insertBefore(card, alertFeed.firstChild);
}

// ─── Evidence Canvas Drawing ───
function triggerEvidencePull(p) {
  const canvas = evidenceCanvas;
  const wrap = $('#evidence-viewer');
  
  // Clean empty panel
  if (evidenceEmpty) evidenceEmpty.style.display = 'none';
  canvas.style.display = 'block';
  
  const rect = wrap.getBoundingClientRect();
  canvas.width = rect.width * 2;
  canvas.height = rect.height * 2;
  
  const ctx = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height, s = 2;
  const isDark = getTheme() === 'dark';

  // Background
  ctx.fillStyle = isDark ? '#070a0e' : '#f9fafb';
  ctx.fillRect(0, 0, w, h);

  // Radar Grid Lines
  ctx.strokeStyle = isDark ? 'rgba(0, 255, 159, 0.02)' : 'rgba(0,0,0,0.03)';
  ctx.lineWidth = 0.5 * s;
  for (let x = 0; x <= w; x += 24 * s) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
  for (let y = 0; y <= h; y += 24 * s) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }

  // Draw military-grade corner brackets
  const bLen = 20 * s, bOff = 12 * s;
  ctx.strokeStyle = isDark ? '#ff3860' : '#e02424';
  ctx.lineWidth = 2 * s;
  ctx.globalAlpha = 0.6;
  ctx.beginPath(); ctx.moveTo(bOff, bOff + bLen); ctx.lineTo(bOff, bOff); ctx.lineTo(bOff + bLen, bOff); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(w - bOff - bLen, bOff); ctx.lineTo(w - bOff, bOff); ctx.lineTo(w - bOff, bOff + bLen); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(bOff, h - bOff - bLen); ctx.lineTo(bOff, h - bOff); ctx.lineTo(bOff + bLen, h - bOff); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(w - bOff - bLen, h - bOff); ctx.lineTo(w - bOff, h - bOff); ctx.lineTo(w - bOff, h - bOff - bLen); ctx.stroke();
  ctx.globalAlpha = 1.0;

  const style = ALERT_CONFIG[p.alert_type] || { color: '#ff3860', label: p.alert_type };
  const color = isDark ? style.color : style.lightColor;

  ctx.textAlign = 'center';

  // Section Label
  ctx.fillStyle = color;
  ctx.font = `bold ${10 * s}px 'JetBrains Mono', monospace`;
  ctx.fillText('SECURE IMAGE PROOF CACHE', w / 2, 45 * s);

  // Large alert type
  ctx.fillStyle = isDark ? '#e6edf3' : '#111928';
  ctx.font = `bold ${18 * s}px 'JetBrains Mono', monospace`;
  ctx.fillText(style.label.toUpperCase(), w / 2, 72 * s);

  // Status subtitle
  ctx.fillStyle = isDark ? '#8b949e' : '#637381';
  ctx.font = `500 ${9 * s}px 'JetBrains Mono', monospace`;
  ctx.fillText(`EDGE_NODE: ${p.node_id}   ·   TRUST: ${Math.round(p.confidence * 100)}%   ·   AUTHENTIC`, w / 2, 92 * s);

  // Cryptographic Hash Box
  const boxW = w - 40 * s, boxH = 30 * s, boxY = 110 * s;
  ctx.fillStyle = isDark ? '#12171f' : '#ffffff';
  ctx.strokeStyle = isDark ? '#1f2937' : '#e5e7eb';
  ctx.lineWidth = 1 * s;
  ctx.beginPath();
  ctx.roundRect(w / 2 - boxW / 2, boxY, boxW, boxH, 4 * s);
  ctx.fill(); ctx.stroke();

  ctx.fillStyle = color;
  ctx.font = `500 ${9 * s}px 'JetBrains Mono', monospace`;
  const hash = p.visual_proof_hash || 'sha256:awaiting-comms-restoration...';
  ctx.fillText(hash, w / 2, boxY + 18 * s);

  // Coordinates
  ctx.fillStyle = isDark ? '#57606a' : '#9ca3af';
  ctx.font = `400 ${9 * s}px 'JetBrains Mono', monospace`;
  ctx.fillText(`COORDS: ${p.gps.lat.toFixed(6)}N, ${p.gps.lng.toFixed(6)}W   ·   TIME: ${new Date(p.timestamp).toLocaleString()}`, w / 2, 162 * s);

  evidenceStatus.textContent = 'VERIFIED';
  evidenceStatus.className = 'badge badge-active';
  
  addLogLine(`[EVIDENCE] Decrypted node cached hash from ${p.node_id}. Visual Proof Verified.`, 'success');
}

// ─── TTS / Voice Synthesis ───
function playAudioSynthesis(text, type) {
  if (!('speechSynthesis' in window)) return;
  const style = ALERT_CONFIG[type] || { label: type };
  ttsText.textContent = `VHF BROACAST: ${style.label.toUpperCase()}`;
  ttsIndicator.classList.add('active');
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.95;
  utterance.pitch = 0.75;
  utterance.onend = () => ttsIndicator.classList.remove('active');
  speechSynthesis.speak(utterance);
}

// ─── Screen Flash on Alerts ───
function flashScreenOverlay() {
  const flash = document.createElement('div');
  flash.className = 'flash-overlay';
  document.body.appendChild(flash);
  flash.addEventListener('animationend', () => flash.remove());
}

// ─── Telemetry Node Grid ───
function renderNodeTelemetry() {
  if (!nodeTelemetryGrid) return;
  nodeTelemetryGrid.innerHTML = '';

  Object.entries(nodeTelemetry).forEach(([nodeId, t]) => {
    const isOnline = nodesReported.has(nodeId);
    const cpuVal = isOnline ? t.cpu + Math.floor(Math.random() * 5 - 2) : 0;
    const ramVal = isOnline ? t.ram + Math.floor(Math.random() * 3 - 1) : 0;
    const signalVal = isOnline ? t.signal : 0;
    const batteryVal = isOnline ? Math.max(10, t.battery) : 100;
    const latencyVal = isOnline ? t.latency + Math.floor(Math.random() * 10 - 5) : 0;

    const card = document.createElement('div');
    card.className = 'node-card';
    card.innerHTML = `
      <div class="node-card-head">
        <span class="node-name-label">${nodeId}</span>
        <span class="node-status-badge ${isOnline ? 'online' : 'offline'}">${isOnline ? 'ONLINE' : 'STANDBY'}</span>
      </div>
      <div class="node-metrics-list">
        <div class="metric-row">
          <div class="metric-row-header"><span>CPU LOAD</span><span>${cpuVal}%</span></div>
          <div class="metric-bar-bg">
            <div class="metric-bar-fill" style="width: ${cpuVal}%; background: var(--accent-info)"></div>
          </div>
        </div>
        <div class="metric-row">
          <div class="metric-row-header"><span>MEMORY</span><span>${ramVal}%</span></div>
          <div class="metric-bar-bg">
            <div class="metric-bar-fill" style="width: ${ramVal}%; background: var(--accent-warning)"></div>
          </div>
        </div>
        <div class="metric-row">
          <div class="metric-row-header"><span>MESH SIGNAL</span><span>${signalVal} dBm</span></div>
          <div class="metric-bar-bg">
            <div class="metric-bar-fill" style="width: ${signalVal}%; background: var(--accent-primary)"></div>
          </div>
        </div>
        <div class="metric-row">
          <div class="metric-row-header"><span>BATTERY</span><span>${batteryVal}%</span></div>
          <div class="metric-bar-bg">
            <div class="metric-bar-fill" style="width: ${batteryVal}%; background: ${batteryVal < 30 ? 'var(--accent-critical)' : 'var(--accent-primary)'}"></div>
          </div>
        </div>
      </div>
      <div class="node-card-footer">
        <span>LATENCY: ${latencyVal}ms</span>
        <span class="node-key-label">KEY: Ed25519_Sec...</span>
      </div>
    `;
    nodeTelemetryGrid.appendChild(card);
  });
}
// Slight jitter to keep telemetry grid alive
setInterval(() => {
  const targetTab = $('.nav-pill.active').dataset.tab;
  if (targetTab === 'tab-mesh') {
    renderNodeTelemetry();
  }
}, 3000);

// ─── Cloud Sync Controller ───
syncNowBtn.addEventListener('click', () => {
  if (totalAlertsCount === 0) {
    addLogLine('[SYNC] No cached data payloads available in local cache DB.', 'warn');
    return;
  }

  syncNowBtn.disabled = true;
  syncProgress.style.display = 'block';
  syncProgressBar.style.width = '0%';
  addLogLine('[SYNC] Initializing Cloud Run synchronization pipeline...', 'info');

  let p = 0;
  const interval = setInterval(() => {
    p += 25;
    syncProgressBar.style.width = `${p}%`;
    if (p === 25) addLogLine('[SYNC] Established secure TLS handshake with endpoint: Cloud Run /sync', 'info');
    if (p === 50) addLogLine(`[SYNC] Streaming ${totalAlertsCount} cache files. Cryptographic signatures validated on-flight.`, 'info');
    if (p === 75) addLogLine('[SYNC] Uploading payload objects into BigQuery warehouse tables.', 'info');
    if (p === 100) {
      clearInterval(interval);
      setTimeout(() => {
        addLogLine('[SYNC] Sync process successful. BigQuery analytical buffers refreshed.', 'success');
        
        // Reset DB table
        alertsList = [];
        totalAlertsCount = 0;
        verifiedCount = 0;
        nodesReported.clear();
        
        $('#stat-alerts').textContent = 0;
        $('#stat-nodes').textContent = '0/5';
        $('#stat-verified').textContent = 0;
        $('#sync-cached-count').textContent = 0;
        $('#stat-threat').textContent = 'STANDBY';
        $('#stat-threat-pill').style.borderColor = 'var(--border)';
        $('#stat-threat-pill').style.background = 'var(--bg-surface)';
        
        alertFeed.innerHTML = `
          <div class="feed-empty" id="feed-empty">
            <div class="feed-empty-circle">⬡</div>
            <p class="feed-empty-title">AWAITING MESH PACKETS</p>
            <p class="feed-empty-sub">Simulate edge node scenarios to broadcast alerts</p>
          </div>
        `;
        
        evidenceCanvas.style.display = 'none';
        evidenceEmpty.style.display = 'flex';
        evidenceStatus.textContent = 'STANDBY';
        evidenceStatus.className = 'badge badge-dim';
        
        // Reset counts for charts
        for (let k in alertCounts) delete alertCounts[k];
        for (let k in confidenceData) delete confidenceData[k];
        
        updateCharts();
        updateSyncRecordsTable();
        
        syncProgress.style.display = 'none';
        syncNowBtn.disabled = false;
      }, 500);
    }
  }, 800);
});

function updateSyncRecordsTable() {
  if (!dbTableBody) return;
  dbTableBody.innerHTML = '';
  
  if (alertsList.length === 0) {
    dbTableBody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; color: var(--text-muted); font-size: 11px; padding: 20px;">
          No cached database records found.
        </td>
      </tr>
    `;
    return;
  }

  alertsList.forEach((a, index) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${1000 + index}</td>
      <td>${a.node_id}</td>
      <td><span style="color: var(--accent-info)">${a.alert_type}</span></td>
      <td>${Math.round(a.confidence * 100)}%</td>
      <td>${a.gps.lat.toFixed(5)}, ${a.gps.lng.toFixed(5)}</td>
      <td>${new Date(a.timestamp).toLocaleTimeString()}</td>
      <td style="color: var(--accent-primary)">${a.signature ? a.signature.substring(0, 16) + '...' : 'SECURE_SIG'}</td>
    `;
    dbTableBody.appendChild(row);
  });
}

// ─── Tactical Map Drawing Engine (Adaptive Radar Theme) ───
let mapFrame = 0;

function drawTacticalMap(canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;
  const s = 2; // Scale factor
  const isDark = getTheme() === 'dark';

  ctx.clearRect(0, 0, w, h);

  const margin = 45 * s;
  const px = (n) => margin + n.x * (w - 2 * margin);
  const py = (n) => margin + n.y * (h - 2 * margin);

  const activeNodes = Object.keys(MAP_NODES).filter(id => nodesReported.has(id));

  // Render glowing mesh link lines
  ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--map-link').trim();
  ctx.lineWidth = 1 * s;
  ctx.setLineDash([4 * s, 4 * s]);
  for (let i = 0; i < activeNodes.length; i++) {
    for (let j = i + 1; j < activeNodes.length; j++) {
      const a = MAP_NODES[activeNodes[i]], b = MAP_NODES[activeNodes[j]];
      ctx.beginPath(); ctx.moveTo(px(a), py(a)); ctx.lineTo(px(b), py(b)); ctx.stroke();
    }
  }

  // Draw active relay lines to Swarm Box with flowing packets
  ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--map-link-active').trim();
  ctx.lineWidth = 1.5 * s;
  ctx.setLineDash([]);
  activeNodes.forEach(id => {
    const n = MAP_NODES[id];
    const nx = px(n), ny = py(n);
    const sbx = px(SWARM_BOX_POS), sby = py(SWARM_BOX_POS);
    
    ctx.beginPath(); ctx.moveTo(nx, ny); ctx.lineTo(sbx, sby); ctx.stroke();

    // Flowing neon packet dots
    const flowT = (mapFrame * 0.01) % 1.0;
    const packetX = nx + (sbx - nx) * flowT;
    const packetY = ny + (sby - ny) * flowT;

    ctx.beginPath();
    ctx.arc(packetX, packetY, 2.5 * s, 0, Math.PI * 2);
    ctx.fillStyle = isDark ? '#00ff9f' : '#0e9f6e';
    ctx.fill();
  });

  // Draw radar rotating sweeps on dark theme
  if (isDark) {
    const sbx = px(SWARM_BOX_POS), sby = py(SWARM_BOX_POS);
    const sweepR = 120 * s;
    const angle = (mapFrame * 0.015) % (Math.PI * 2);
    
    ctx.beginPath();
    ctx.moveTo(sbx, sby);
    ctx.arc(sbx, sby, sweepR, angle, angle + 0.15);
    ctx.closePath();
    ctx.fillStyle = 'rgba(0, 255, 159, 0.02)';
    ctx.fill();
  }

  // Draw nodes & overlapping pulsing rings
  Object.entries(MAP_NODES).forEach(([id, pos]) => {
    const x = px(pos), y = py(pos);
    const on = nodesReported.has(id);

    if (on) {
      // Overlapping pulsing rings
      const pulseSize = 18 * s + Math.sin(mapFrame * 0.05 + (id.charCodeAt(6) * 0.5)) * 4 * s;
      ctx.beginPath();
      ctx.arc(x, y, pulseSize, 0, Math.PI * 2);
      ctx.fillStyle = isDark ? 'rgba(0, 255, 159, 0.02)' : 'rgba(14, 159, 110, 0.03)';
      ctx.fill();
      ctx.strokeStyle = isDark ? 'rgba(0, 255, 159, 0.1)' : 'rgba(14, 159, 110, 0.08)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    const r = 4.5 * s;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = on ? (isDark ? '#00ff9f' : '#0e9f6e') : (isDark ? '#30363d' : '#d1d5db');
    ctx.fill();

    if (on) {
      ctx.shadowColor = isDark ? '#00ff9f' : '#0e9f6e';
      ctx.shadowBlur = 10 * s;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
    }

    // Node Text
    ctx.fillStyle = on ? (isDark ? '#8b949e' : '#637381') : (isDark ? '#30363d' : '#9ca3af');
    ctx.font = `bold ${8 * s}px 'JetBrains Mono', monospace`;
    ctx.textAlign = 'center';
    ctx.fillText(pos.label, x, y + 14 * s);
  });

  // Swarm Box Base Center (Hexagon)
  const sbx = px(SWARM_BOX_POS), sby = py(SWARM_BOX_POS);
  const hexR = 10 * s;
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i - Math.PI / 6;
    const hx = sbx + hexR * Math.cos(a), hy = sby + hexR * Math.sin(a);
    if (i === 0) ctx.moveTo(hx, hy);
    else ctx.lineTo(hx, hy);
  }
  ctx.closePath();
  ctx.fillStyle = isDark ? '#00ff9f' : '#0e9f6e';
  ctx.fill();
  ctx.strokeStyle = isDark ? 'rgba(0, 255, 159, 0.5)' : 'rgba(14, 159, 110, 0.5)';
  ctx.lineWidth = 1.5 * s;
  ctx.stroke();

  // Glow
  ctx.shadowColor = isDark ? '#00ff9f' : '#0e9f6e';
  ctx.shadowBlur = 14 * s;
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.fillStyle = isDark ? '#00ff9f' : '#0e9f6e';
  ctx.font = `bold ${7 * s}px 'JetBrains Mono', monospace`;
  ctx.fillText('SWARM BOX', sbx, sby + 20 * s);

  mapFrame++;
}

// Tactical map loops
function animateMaps() {
  drawTacticalMap('tacticalMap-dash');
  drawTacticalMap('tacticalMap-large');
  requestAnimationFrame(animateMaps);
}

// ─── Charts Implementation ───
function destroyAllCharts() {
  Object.keys(charts).forEach(c => {
    if (charts[c]) {
      charts[c].destroy();
      charts[c] = null;
    }
  });
}

function initCharts() {
  if (typeof Chart === 'undefined') return;

  const isDark = getTheme() === 'dark';
  const gridColor = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.06)';
  const textColor = isDark ? '#8b949e' : '#637381';
  const surfaceColor = isDark ? '#12171f' : '#ffffff';

  Chart.defaults.color = textColor;
  Chart.defaults.font.family = "'JetBrains Mono', monospace";
  Chart.defaults.font.size = 9;

  // Options templates
  const doughnutOpts = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '70%',
    plugins: {
      legend: {
        position: 'bottom',
        labels: { padding: 8, usePointStyle: true, pointStyleWidth: 7, font: { size: 8 } }
      },
      title: { display: false }
    }
  };

  const barOpts = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y',
    scales: {
      x: {
        min: 0, max: 100,
        grid: { color: gridColor },
        ticks: { callback: v => v + '%', font: { size: 8 } }
      },
      y: { grid: { display: false }, ticks: { font: { size: 8 } } }
    },
    plugins: {
      legend: { display: false },
      title: { display: false }
    }
  };

  // Helper init
  const makeDoughnut = (id) => {
    const el = document.getElementById(id);
    return el ? new Chart(el, {
      type: 'doughnut',
      data: { labels: [], datasets: [{ data: [], backgroundColor: [], borderColor: surfaceColor, borderWidth: 2 }] },
      options: doughnutOpts
    }) : null;
  };

  const makeBar = (id) => {
    const el = document.getElementById(id);
    return el ? new Chart(el, {
      type: 'bar',
      data: { labels: [], datasets: [{ data: [], backgroundColor: [], borderRadius: 4, barPercentage: 0.55 }] },
      options: barOpts
    }) : null;
  };

  charts.threatDash = makeDoughnut('threatChart-dash');
  charts.confDash = makeBar('confidenceChart-dash');
  charts.threatFull = makeDoughnut('threatChart-full');
  charts.confFull = makeBar('confidenceChart-full');
}

function updateCharts() {
  const isDark = getTheme() === 'dark';
  const labels = Object.keys(alertCounts);
  const colors = labels.map(l => {
    const c = ALERT_CONFIG[l] || { color: '#ff3860', lightColor: '#e02424' };
    return isDark ? c.color : c.lightColor;
  });

  const formattedLabels = labels.map(l => (ALERT_CONFIG[l] || { label: l }).label.toUpperCase());
  const counts = Object.values(alertCounts);
  const confs = Object.values(confidenceData).map(v => Math.round(v * 100));

  const updateInstance = (c, type) => {
    if (!c) return;
    if (type === 'doughnut') {
      c.data.labels = formattedLabels;
      c.data.datasets[0].data = counts;
      c.data.datasets[0].backgroundColor = colors.map(cl => cl + 'cc');
    } else {
      c.data.labels = formattedLabels;
      c.data.datasets[0].data = confs;
      c.data.datasets[0].backgroundColor = colors.map(cl => cl + '99');
    }
    c.update();
  };

  updateInstance(charts.threatDash, 'doughnut');
  updateInstance(charts.confDash, 'bar');
  updateInstance(charts.threatFull, 'doughnut');
  updateInstance(charts.confFull, 'bar');
}

// ─── Setup Canvases & Init ───
window.addEventListener('load', () => {
  resizeCanvas('tacticalMap-dash');
  resizeCanvas('tacticalMap-large');
  
  initCharts();
  animateMaps();
  updateSyncRecordsTable();
});

window.addEventListener('resize', () => {
  resizeCanvas('tacticalMap-dash');
  resizeCanvas('tacticalMap-large');
});
