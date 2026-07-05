'use client';

import React, { useEffect, useRef } from 'react';
import { useAlerts } from '../../context/AlertsContext';
import { getAlertSeverity, SEVERITY_CONFIG, getAlertLabel } from '../../lib/severity';

export const EvidenceViewer: React.FC = () => {
  const { selectedAlert, theme, addLogLine } = useAlerts();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const drawEvidence = () => {
    const canvas = canvasRef.current;
    if (!canvas || !selectedAlert) return;
    const parent = canvas.parentElement;
    if (!parent) return;

    // Set canvas sizes scaled for high pixel ratio
    const scale = 2;
    canvas.width = parent.clientWidth * scale;
    canvas.height = parent.clientHeight * scale;
    canvas.style.width = `${parent.clientWidth}px`;
    canvas.style.height = `${parent.clientHeight}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const isDark = theme === 'dark';
    const p = selectedAlert.payload;

    // Background fill
    ctx.fillStyle = isDark ? '#070a0e' : '#f9fafb';
    ctx.fillRect(0, 0, w, h);

    // Toned down grid lines background
    ctx.strokeStyle = isDark ? 'rgba(0, 255, 159, 0.005)' : 'rgba(0,0,0,0.01)';
    ctx.lineWidth = 0.5 * scale;
    for (let x = 0; x <= w; x += 24 * scale) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y <= h; y += 24 * scale) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    const severity = getAlertSeverity(p.alert_type, p.confidence);
    const themeConfig = SEVERITY_CONFIG[severity];
    const accentColor = isDark ? themeConfig.color : themeConfig.lightColor;

    // Draw thin military corner brackets (toned down)
    const bLen = 20 * scale;
    const bOff = 12 * scale;
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 1 * scale;
    ctx.globalAlpha = 0.35;

    // Top-Left
    ctx.beginPath();
    ctx.moveTo(bOff, bOff + bLen);
    ctx.lineTo(bOff, bOff);
    ctx.lineTo(bOff + bLen, bOff);
    ctx.stroke();

    // Top-Right
    ctx.beginPath();
    ctx.moveTo(w - bOff - bLen, bOff);
    ctx.lineTo(w - bOff, bOff);
    ctx.lineTo(w - bOff, bOff + bLen);
    ctx.stroke();

    // Bottom-Left
    ctx.beginPath();
    ctx.moveTo(bOff, h - bOff - bLen);
    ctx.lineTo(bOff, h - bOff);
    ctx.lineTo(bOff + bLen, h - bOff);
    ctx.stroke();

    // Bottom-Right
    ctx.beginPath();
    ctx.moveTo(w - bOff - bLen, h - bOff);
    ctx.lineTo(w - bOff, h - bOff);
    ctx.lineTo(w - bOff, h - bOff - bLen);
    ctx.stroke();

    ctx.globalAlpha = 1.0;

    ctx.textAlign = 'center';

    // Section header
    ctx.fillStyle = accentColor;
    ctx.font = `bold ${10 * scale}px var(--font-mono)`;
    ctx.fillText('SECURE IMAGE PROOF CACHE', w / 2, 38 * scale);

    // Large alert text label (font-sans style for labels)
    ctx.fillStyle = isDark ? '#e6edf3' : '#111928';
    ctx.font = `bold ${18 * scale}px var(--font-sans)`;
    ctx.fillText(getAlertLabel(p.alert_type).toUpperCase(), w / 2, 65 * scale);

    // Status / trust metadata subtext
    ctx.fillStyle = isDark ? '#8b949e' : '#637381';
    ctx.font = `500 ${9 * scale}px var(--font-mono)`;
    ctx.fillText(`EDGE_NODE: ${p.node_id}   ·   TRUST: ${Math.round(p.confidence * 100)}%   ·   AUTHENTIC`, w / 2, 85 * scale);

    // Cryptographic Hash Box container
    const boxW = w - 40 * scale;
    const boxH = 30 * scale;
    const boxY = 105 * scale;
    ctx.fillStyle = isDark ? '#12171f' : '#ffffff';
    ctx.strokeStyle = isDark ? '#1f2937' : '#e5e7eb';
    ctx.lineWidth = 1 * scale;
    
    ctx.beginPath();
    ctx.roundRect(w / 2 - boxW / 2, boxY, boxW, boxH, 4 * scale);
    ctx.fill();
    ctx.stroke();

    // Render signature/hash string inside box
    ctx.fillStyle = accentColor;
    ctx.font = `500 ${9 * scale}px var(--font-mono)`;
    const hash = p.visual_proof_hash || 'sha256:awaiting-comms-restoration...';
    ctx.fillText(hash, w / 2, boxY + 18 * scale);

    // Coordinates and time stamp footer
    ctx.fillStyle = isDark ? '#57606a' : '#9ca3af';
    ctx.font = `400 ${9 * scale}px var(--font-mono)`;
    ctx.fillText(
      `COORDS: ${p.gps.lat.toFixed(6)}N, ${p.gps.lng.toFixed(6)}W   ·   TIME: ${new Date(p.timestamp).toLocaleString()}`,
      w / 2,
      h - 28 * scale
    );
  };

  useEffect(() => {
    if (selectedAlert) {
      drawEvidence();
      addLogLine(`[EVIDENCE] Decrypted node cached hash from ${selectedAlert.payload.node_id}. Visual Proof Verified.`, 'success');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAlert, theme]);

  if (!selectedAlert) {
    return (
      <div 
        className="flex flex-col items-center justify-center text-center p-8 border border-dashed rounded-lg bg-[var(--bg-inset)] h-full min-h-[220px]"
        style={{ borderColor: 'var(--border)' }}
      >
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="opacity-30 mb-2">
          <path d="M15 10l-4 4-2-2-4 4h14V10z" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <rect x="3" y="3" width="18" height="18" rx="2" />
        </svg>
        <p className="text-xs font-sans" style={{ color: 'var(--text-secondary)' }}>Select threat event to verify local cached visual proof</p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full min-h-[220px] rounded-lg overflow-hidden">
      <canvas ref={canvasRef} className="block w-full h-full" />
    </div>
  );
};
