'use client';

import React from 'react';
import { TacticalMap } from '../components/dashboard/TacticalMap';
import { AlertFeed } from '../components/dashboard/AlertFeed';
import { EvidenceViewer } from '../components/dashboard/EvidenceViewer';
import { AnalyticsCharts } from '../components/analytics/AnalyticsCharts';
import { useAlerts } from '../context/AlertsContext';

export default function DashboardPage() {
  const { alerts } = useAlerts();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 flex-1 items-stretch">
      {/* LEFT COLUMN: Map & Analytics Preview (60% equivalent) */}
      <div className="lg:col-span-3 flex flex-col gap-6">
        {/* Tactical Map */}
        <section 
          className="flex-1 flex flex-col rounded border shadow-sm overflow-hidden"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border)',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div 
            className="flex items-center justify-between px-4 py-3 border-b font-mono text-xs font-bold"
            style={{ borderColor: 'var(--border-dim)' }}
          >
            <h2 style={{ color: 'var(--text-primary)' }}>TACTICAL MAP SCANNER</h2>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-neutral-500 tracking-wider">ACTIVE SWEEP</span>
              <span 
                className="px-1.5 py-0.5 rounded text-[8px] font-bold text-white bg-red-600 animate-pulse"
                style={{ textShadow: '0 0 4px rgba(255,0,0,0.5)' }}
              >
                LIVE
              </span>
            </div>
          </div>
          <div className="flex-1 relative bg-[var(--bg-inset)] min-h-[300px]">
            <TacticalMap />
            {/* Map Legend */}
            <div className="absolute bottom-4 left-4 flex flex-wrap gap-4 text-[9px] font-mono p-2 bg-neutral-900/80 border border-neutral-800 rounded backdrop-blur">
              <span className="flex items-center gap-1.5 text-neutral-400">
                <span className="w-1.5 h-1.5 rounded-full inline-block bg-[var(--accent-primary)]" />
                Active Node
              </span>
              <span className="flex items-center gap-1.5 text-neutral-400">
                <span className="w-1.5 h-1.5 rounded-full inline-block bg-[var(--accent-critical)]" />
                Threat Center
              </span>
              <span className="flex items-center gap-1.5 text-neutral-400">
                <span className="w-3 h-0.5 inline-block bg-[var(--accent-info)] opacity-50" />
                Mesh Channel
              </span>
            </div>
          </div>
        </section>

        {/* Analytics Preview */}
        <section 
          className="rounded border shadow-sm overflow-hidden flex flex-col"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border)',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div 
            className="px-4 py-3 border-b font-mono text-xs font-bold"
            style={{ borderColor: 'var(--border-dim)' }}
          >
            <h2 style={{ color: 'var(--text-primary)' }}>ANALYTICS PREVIEW</h2>
          </div>
          <div className="p-4 bg-[var(--bg-surface)] flex-1 flex items-center justify-center min-h-[160px]">
            {alerts.length === 0 ? (
              <div className="text-center font-mono text-xs text-neutral-500">
                Awaiting telemetry metrics to compile analysis
              </div>
            ) : (
              <AnalyticsCharts preview={true} />
            )}
          </div>
        </section>
      </div>

      {/* RIGHT COLUMN: Feed & Evidence (40% equivalent) */}
      <div className="lg:col-span-2 flex flex-col gap-6">
        {/* Threat Log Feed */}
        <section 
          className="flex-1 flex flex-col rounded border shadow-sm overflow-hidden"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border)',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div 
            className="flex items-center justify-between px-4 py-3 border-b font-mono text-xs font-bold"
            style={{ borderColor: 'var(--border-dim)' }}
          >
            <h2 style={{ color: 'var(--text-primary)' }}>THREAT LOG STREAM</h2>
            <span 
              className="px-2 py-0.5 rounded text-[9px] font-mono"
              style={{
                backgroundColor: 'var(--bg-inset)',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border)',
              }}
            >
              {alerts.length} EVENTS
            </span>
          </div>
          <div className="p-4 bg-[var(--bg-surface)] flex-1 overflow-hidden">
            <AlertFeed />
          </div>
        </section>

        {/* Evidence Viewer */}
        <section 
          className="rounded border shadow-sm overflow-hidden flex flex-col"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border)',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div 
            className="flex items-center justify-between px-4 py-3 border-b font-mono text-xs font-bold"
            style={{ borderColor: 'var(--border-dim)' }}
          >
            <h2 style={{ color: 'var(--text-primary)' }}>DECENTRALIZED EVIDENCE PULL</h2>
            <span 
              className={`px-2 py-0.5 rounded text-[9px] font-mono border`}
              style={{
                borderColor: 'var(--border)',
                backgroundColor: 'var(--bg-inset)',
                color: 'var(--text-muted)',
              }}
            >
              STANDBY
            </span>
          </div>
          <div className="p-4 bg-[var(--bg-surface)] min-h-[240px] flex items-stretch">
            <EvidenceViewer />
          </div>
        </section>
      </div>
    </div>
  );
}
