'use client';

import React from 'react';
import { useAlerts } from '../../context/AlertsContext';

export const CloudSyncPanel: React.FC = () => {
  const { alerts, syncing, syncProgress, syncNow } = useAlerts();

  return (
    <div className="flex flex-col gap-6">
      {/* Sync Controls */}
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
          <h2>CLOUD SYNC CONTROLLER</h2>
          <span 
            className="px-1.5 py-0.5 rounded text-[8px] font-bold border"
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
            className="flex items-center gap-4 p-4 rounded border font-mono"
            style={{
              backgroundColor: 'var(--bg-inset)',
              borderColor: 'var(--border)',
            }}
          >
            <div className="text-3xl select-none" style={{ color: 'var(--accent-info)' }}>☁</div>
            <div className="flex flex-col gap-1">
              <h3 className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Offline Cache Store</h3>
              <p className="text-[10px] text-neutral-500">
                <span className="font-bold text-neutral-300 mr-1">{alerts.length}</span> 
                Alert records stored locally in SQLite
              </p>
            </div>
          </div>

          {/* Sync Button & Progress */}
          <div className="flex flex-col gap-4">
            <button
              onClick={syncNow}
              disabled={syncing || alerts.length === 0}
              className="w-full py-2.5 px-4 rounded text-xs font-mono font-bold uppercase transition-all border tracking-wider disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-[10px]">
            <div 
              className="p-3 border rounded flex flex-col gap-1"
              style={{
                borderColor: 'var(--border-dim)',
                backgroundColor: 'var(--bg-inset)',
              }}
            >
              <span className="font-bold text-neutral-300">Cloud Run Sync API</span>
              <span className="text-[9px] text-neutral-500">POST /api/v1/sync</span>
              <p className="text-neutral-500 leading-normal mt-1">
                Ingests cache JSON, validates signatures, writes to BigQuery.
              </p>
            </div>
            <div 
              className="p-3 border rounded flex flex-col gap-1"
              style={{
                borderColor: 'var(--border-dim)',
                backgroundColor: 'var(--bg-inset)',
              }}
            >
              <span className="font-bold text-neutral-300">BigQuery Threat Analytics</span>
              <span className="text-[9px] text-neutral-500">Dataset: swarmguard_analytics</span>
              <p className="text-neutral-500 leading-normal mt-1">
                Houses historical data for Looker Heatmaps and Vertex AI training.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* DB Cache Table */}
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
          <h2 style={{ color: 'var(--text-primary)' }}>CACHED SQLITE RECORDS (READY TO RESTORE)</h2>
        </div>
        <div className="overflow-x-auto w-full">
          <table className="w-full font-mono text-[10px] text-left border-collapse">
            <thead>
              <tr 
                className="border-b"
                style={{ 
                  borderColor: 'var(--border-dim)',
                  backgroundColor: 'var(--bg-inset)',
                }}
              >
                <th className="p-3 font-semibold text-neutral-500">EVENT ID</th>
                <th className="p-3 font-semibold text-neutral-500">NODE ID</th>
                <th className="p-3 font-semibold text-neutral-500">ALERT</th>
                <th className="p-3 font-semibold text-neutral-500">CONFIDENCE</th>
                <th className="p-3 font-semibold text-neutral-500">COORDINATES</th>
                <th className="p-3 font-semibold text-neutral-500">TIMESTAMP</th>
                <th className="p-3 font-semibold text-neutral-500">CRYPTO SIGNATURE (HEX)</th>
              </tr>
            </thead>
            <tbody>
              {alerts.length === 0 ? (
                <tr className="border-b" style={{ borderColor: 'var(--border-dim)' }}>
                  <td colSpan={7} className="p-6 text-center text-neutral-500 italic">
                    No cached database records found.
                  </td>
                </tr>
              ) : (
                alerts.map((a, index) => {
                  const p = a.payload;
                  return (
                    <tr 
                      key={a.event_id} 
                      className="border-b hover:bg-[var(--bg-hover)] transition-colors"
                      style={{ borderColor: 'var(--border-dim)' }}
                    >
                      <td className="p-3 text-neutral-300 font-bold">{1000 + alerts.length - 1 - index}</td>
                      <td className="p-3 text-neutral-400">{p.node_id}</td>
                      <td className="p-3">
                        <span style={{ color: 'var(--accent-info)' }}>{p.alert_type}</span>
                      </td>
                      <td className="p-3 text-neutral-400">{Math.round(p.confidence * 100)}%</td>
                      <td className="p-3 text-neutral-400">
                        {p.gps.lat.toFixed(5)}, {p.gps.lng.toFixed(5)}
                      </td>
                      <td className="p-3 text-neutral-400">
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
