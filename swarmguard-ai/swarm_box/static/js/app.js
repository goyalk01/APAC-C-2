// Connect websocket to FastAPI server
const ws = new WebSocket(`ws://${location.host}/ws/dashboard`);
const feed = document.getElementById('alert-feed');
const evidenceViewer = document.getElementById('evidence-viewer');
const evidenceImg = document.getElementById('evidence-image');
const connectionStatus = document.getElementById('connection-status');
const dot = document.getElementById('status-dot');

let chartInstance = null;
const alertCounts = {};

ws.onopen = () => {
    connectionStatus.textContent = 'Connected to Mesh';
    dot.className = 'dot';
};

ws.onclose = () => {
    connectionStatus.textContent = 'Offline';
    dot.className = 'dot offline';
};

ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.type === 'new_alert') {
        // Clear placeholder text on first alert
        if (feed.children.length === 1 && feed.children[0].innerText.includes('Awaiting')) {
            feed.innerHTML = '';
        }
        addAlertToFeed(data.payload);
        playTTS(data.speech);
        updateChart(data.payload.alert_type);
    }
};

function addAlertToFeed(payload) {
    const card = document.createElement('div');
    card.className = 'alert-card';
    
    // Convert 0.98 to 98%
    const conf = Math.round(payload.confidence * 100);
    
    card.innerHTML = `
        <div class="alert-title">
            <span>${payload.alert_type}</span>
            <span>${conf}% CONF</span>
        </div>
        <div class="alert-meta">Node: ${payload.node_id}</div>
        <div class="alert-meta">Location: ${payload.gps.lat.toFixed(4)}, ${payload.gps.lng.toFixed(4)}</div>
        <div class="alert-meta">Time: ${new Date(payload.timestamp).toLocaleTimeString()}</div>
    `;
    
    card.onclick = () => showEvidence(payload.visual_proof_hash);
    
    feed.insertBefore(card, feed.firstChild);
}

function showEvidence(hash) {
    // In a real app we'd fetch the image via Evidence Pull API.
    // Here we simulate it by updating the UI viewer state.
    evidenceImg.style.display = 'block';
    
    // Select placeholder image based on hash suffix randomly
    // But since it's a demo, we just use a generic placehold.co that is dynamic.
    const url = `https://placehold.co/600x400/27272a/ef4444?text=EVIDENCE:\\n${hash.substring(0, 16)}...`;
    evidenceImg.src = url;
    
    const msgDiv = evidenceViewer.querySelector('div');
    if (msgDiv) msgDiv.style.display = 'none';
}

function playTTS(text) {
    if ('speechSynthesis' in window) {
        const msg = new SpeechSynthesisUtterance(text);
        msg.rate = 1.0;
        msg.pitch = 0.9;
        window.speechSynthesis.speak(msg);
    }
}

// Chart.js integration (from /slides skill guidelines)
function initChart() {
    const ctx = document.getElementById('threatChart');
    if (!ctx) return;
    
    // Check if Chart is loaded
    if (typeof Chart === 'undefined') return;
    
    Chart.defaults.color = '#94a3b8';
    Chart.defaults.font.family = 'Inter';
    
    chartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: [],
            datasets: [{
                label: 'Detected Threats',
                data: [],
                backgroundColor: 'rgba(239, 68, 68, 0.2)', // var(--color-primary) transparent
                borderColor: '#ef4444',
                borderWidth: 1,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true, grid: { color: '#27272a' } },
                x: { grid: { display: false } }
            },
            plugins: {
                legend: { display: false }
            }
        }
    });
}

// Ensure initChart is called after script loads
window.addEventListener('load', () => {
    initChart();
});

function updateChart(type) {
    if (!chartInstance) return;
    alertCounts[type] = (alertCounts[type] || 0) + 1;
    
    chartInstance.data.labels = Object.keys(alertCounts);
    chartInstance.data.datasets[0].data = Object.values(alertCounts);
    chartInstance.update();
}
