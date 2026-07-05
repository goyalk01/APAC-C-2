'use client';

import React from 'react';
import { useAlerts } from '../../context/AlertsContext';
import { getAlertSeverity, SEVERITY_CONFIG, getAlertLabel } from '../../lib/severity';

export const CloudSyncPanel: React.FC = () => {
  const { alerts, syncing, syncProgress, syncNow, theme } = useAlerts();

  return (
    <div className="flex flex-col gap-6">
      {/* Sync Controls */}
      <section 
        className="rounded-lg border shadow-sm overflow-hidden flex flex-col"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border)',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div 
          className="flex items-center justify-between px-4 py-3 border-b font-sans text-xs font-bold"
          style={{ borderColor: 'var(--border-dim)' }}
        >
          <h2>CLOUD SYNC CONTROLLER</h2>
          <span 
            className="px-1.5 py-0.5 rounded-md text-[8px] font-bold border font-sans"
            style={{
              borderColor: 'var(--accent-warning-border)',
              backgroundColor: 'var(--accent-warning-bg)',
              color: 'var(--accent-warning)',
            }}
          >
            SIMULATED INTERACTION
          </span>
        </div>

        <div className="p-6 flex flex-col gap-6">
          {/* Status Sub-card */}
          <div 
            className="flex items-center gap-4 p-4 rounded-lg border font-sans"
            style={{
              backgroundColor: 'var(--bg-inset)',
              borderColor: 'var(--border)',
            }}
          >
            <div className="text-3xl select-none" style={{ color: 'var(--accent-info)' }}>☁</div>
            <div className="flex flex-col gap-1">
              <h3 className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Offline Cache Store</h3>
              <p className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>
                <span className="font-bold mr-1" style={{ color: 'var(--text-primary)' }}>{alerts.length}</span> 
                Alert records stored locally in SQLite
              </p>
            </div>
          </div>

          {/* Sync Button & Progress */}
          <div className="flex flex-col gap-4">
            <button
              onClick={syncNow}
              disabled={syncing || alerts.length === 0}
              className="w-full py-2.5 px-4 rounded-lg text-xs font-sans font-bold uppercase transition-all border tracking-wider disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              style={{
                backgroundColor: syncing ? 'var(--bg-hover)' : 'var(--accent-primary-bg)',
                borderColor: syncing ? 'var(--border)' : 'var(--accent-primary-border)',
                color: syncing ? 'var(--text-secondary)' : 'var(--accent-primary)',
              }}
            >
              {syncing ? 'SYNCING DATAPAYLOADS...' : 'SYNC DATAPAYLOADS TO GOOGLE CLOUD'}
            </button>

            {syncing && (
              <div 
                className="w-full h-2 rounded-full overflow-hidden"
                style={{ backgroundColor: 'var(--bg-inset)' }}
              >
                <div 
                  className="h-full rounded-full transition-all duration-300 bg-[var(--accent-primary)]"
                  style={{ width: `${syncProgress}%` }}
                />
              </div>
            )}
          </div>

          {/* Architecture info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-sans text-[10px]">
            <div 
              className="p-3 border rounded-lg flex flex-col gap-1"
              style={{
                borderColor: 'var(--border-dim)',
                backgroundColor: 'var(--bg-inset)',
              }}
            >
              <span className="font-bold" style={{ color: 'var(--text-secondary)' }}>Cloud Run Sync API</span>
              <span className="text-[9px] font-mono" style={{ color: 'var(--text-muted)' }}>POST /api/v1/sync</span>
              <p className="leading-normal mt-1" style={{ color: 'var(--text-muted)' }}>
                Ingests cache JSON, validates signatures, writes to BigQuery.
              </p>
            </div>
            <div 
              className="p-3 border rounded-lg flex flex-col gap-1"
              style={{
                borderColor: 'var(--border-dim)',
                backgroundColor: 'var(--bg-inset)',
              }}
            >
              <span className="font-bold" style={{ color: 'var(--text-secondary)' }}>BigQuery Threat Analytics</span>
              <span className="text-[9px] font-mono" style={{ color: 'var(--text-muted)' }}>Dataset: swarmguard_analytics</span>
              <p className="leading-normal mt-1" style={{ color: 'var(--text-muted)' }}>
                Houses historical data for Looker Heatmaps and Vertex AI training.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* DB Cache Table */}
      <section 
        className="rounded-lg border shadow-sm overflow-hidden flex flex-col"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border)',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div 
          className="px-4 py-3 border-b font-sans text-xs font-bold"
          style={{ borderColor: 'var(--border-dim)' }}
        >
          <h2 style={{ color: 'var(--text-primary)' }}>CACHED SQLITE RECORDS (READY TO RESTORE)</h2>
        </div>
        <div className="overflow-x-auto w-full">
          <table className="w-full font-mono text-[10px] text-left border-collapse">
            <thead>
              <tr 
                className="border-b font-sans"
                style={{ 
                  borderColor: 'var(--border-dim)',
                  backgroundColor: 'var(--bg-inset)',
                }}
              >
                <th className="p-3 font-semibold" style={{ color: 'var(--text-muted)' }}>EVENT ID</th>
                <th className="p-3 font-semibold" style={{ color: 'var(--text-muted)' }}>NODE ID</th>
                <th className="p-3 font-semibold" style={{ color: 'var(--text-muted)' }}>ALERT</th>
                <th className="p-3 font-semibold" style={{ color: 'var(--text-muted)' }}>CONFIDENCE</th>
                <th className="p-3 font-semibold" style={{ color: 'var(--text-muted)' }}>COORDINATES</th>
                <th className="p-3 font-semibold" style={{ color: 'var(--text-muted)' }}>TIMESTAMP</th>
                <th className="p-3 font-semibold" style={{ color: 'var(--text-muted)' }}>CRYPTO SIGNATURE (HEX)</th>
              </tr>
            </thead>
            <tbody>
              {alerts.length === 0 ? (
                <tr className="border-b" style={{ borderColor: 'var(--border-dim)' }}>
                  <td colSpan={7} className="p-6 text-center italic" style={{ color: 'var(--text-muted)' }}>
                    No cached database records found.
                  </td>
                </tr>
              ) : (
                alerts.map((a, index) => {
                  const p = a.payload;
                  const severity = getAlertSeverity(p.alert_type, p.confidence);
                  const themeConfig = SEVERITY_CONFIG[severity];
                  const severityColor = theme === 'light' ? themeConfig.lightColor : themeConfig.color;
                  return (
                    <tr 
                      key={a.event_id} 
                      className="border-b hover:bg-[var(--bg-hover)] transition-colors"
                      style={{ borderColor: 'var(--border-dim)' }}
                    >
                      <td className="p-3 font-bold" style={{ color: 'var(--text-secondary)' }}>{1000 + alerts.length - 1 - index}</td>
                      <td className="p-3" style={{ color: 'var(--text-secondary)' }}>{p.node_id}</td>
                      <td className="p-3">
                        <span className="font-bold font-sans" style={{ color: severityColor }}>{getAlertLabel(p.alert_type)}</span>
                      </td>
                      <td className="p-3" style={{ color: 'var(--text-secondary)' }}>{Math.round(p.confidence * 100)}%</td>
                      <td className="p-3" style={{ color: 'var(--text-secondary)' }}>
                        {p.gps.lat.toFixed(5)}, {p.gps.lng.toFixed(5)}
                      </td>
                      <td className="p-3" style={{ color: 'var(--text-secondary)' }}>
                        {new Date(p.timestamp).toLocaleTimeString()}
                      </td>
                      <td className="p-3 font-bold" style={{ color: 'var(--accent-primary)' }}>
                        {p.signature ? `${p.signature.substring(0, 16)}...` : 'SECURE_SIG'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
