'use client';

import React from 'react';
import { useAlerts } from '../../context/AlertsContext';

export const ALERT_CONFIG: Record<string, { color: string; label: string; lightColor: string }> = {
  BRIDGE_COLLAPSE:  { color: '#ff3860', label: 'Bridge Collapse', lightColor: '#e02424' },
  FLOODING:         { color: '#00b8ff', label: 'Flooding', lightColor: '#1c64f2' },
  STRUCTURAL_FIRE:  { color: '#ffaa00', label: 'Structural Fire', lightColor: '#b45309' },
  GAS_LEAK:         { color: '#a78bfa', label: 'Gas Leak', lightColor: '#7c3aed' },
  CROWD_STAMPEDE:   { color: '#ff7700', label: 'Crowd Stampede', lightColor: '#ea580c' },
};

export const AlertFeed: React.FC = () => {
  const { alerts, selectedAlert, setSelectedAlert, theme } = useAlerts();

  return (
    <div className="flex flex-col gap-2 h-full max-h-[380px] overflow-y-auto pr-1">
      {alerts.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center p-8 py-16 border border-dashed rounded bg-[var(--bg-inset)] border-[var(--border)]">
          <span className="text-2xl mb-2 text-neutral-500 font-mono">⬡</span>
          <p className="text-xs font-bold font-mono tracking-wider text-neutral-400">AWAITING MESH PACKETS</p>
          <p className="text-[10px] text-neutral-500 font-mono mt-1">Simulate edge node scenarios to broadcast alerts</p>
        </div>
      ) : (
        alerts.map((alert) => {
          const p = alert.payload;
          const confPercent = Math.round(p.confidence * 100);
          const style = ALERT_CONFIG[p.alert_type] || { color: '#ff3860', label: p.alert_type, lightColor: '#e02424' };
          const isLight = theme === 'light';
          const accentColor = isLight ? style.lightColor : style.color;
          const isSelected = selectedAlert?.event_id === alert.event_id;

          return (
            <div
              key={alert.event_id}
              onClick={() => setSelectedAlert(alert)}
              className={`p-3 border rounded cursor-pointer transition-all duration-200 select-none ${
                confPercent >= 90 ? 'critical-glow' : ''
              }`}
              style={{
                backgroundColor: isSelected ? 'var(--bg-hover)' : 'var(--bg-surface)',
                borderColor: isSelected ? 'var(--accent-primary)' : 'var(--border)',
              }}
            >
              {/* Top Row: Type and Confidence */}
              <div className="flex items-center justify-between text-xs font-mono font-bold mb-2">
                <span className="flex items-center gap-1.5" style={{ color: accentColor }}>
                  <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ backgroundColor: accentColor }} />
                  {style.label.toUpperCase()}
                </span>
                <span 
                  className="px-2 py-0.5 rounded text-[10px]"
                  style={{
                    color: accentColor,
                    backgroundColor: isLight ? `${style.lightColor}15` : `${style.color}20`
                  }}
                >
                  {confPercent}%
                </span>
              </div>

              {/* Confidence Bar */}
              <div className="w-full h-1 bg-[var(--bg-inset)] rounded-full overflow-hidden mb-3">
                <div 
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${confPercent}%`,
                    backgroundColor: accentColor,
                  }}
                />
              </div>

              {/* Metadata row */}
              <div className="flex flex-wrap items-center gap-y-1.5 gap-x-3 text-[10px] font-mono text-neutral-500">
                <span className="flex items-center gap-1">
                  <span className="text-[8px]">⬡</span> {p.node_id}
                </span>
                <span className="flex items-center gap-1">
                  <span className="text-[8px]">◎</span> {p.gps.lat.toFixed(4)}, {p.gps.lng.toFixed(4)}
                </span>
                <span className="flex items-center gap-1">
                  <span className="text-[8px]">◷</span> {new Date(p.timestamp).toLocaleTimeString()}
                </span>
                <span className="flex items-center gap-1 ml-auto text-[9px]" style={{ color: 'var(--accent-primary)' }}>
                  <span>✓</span> Verified
                </span>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};
