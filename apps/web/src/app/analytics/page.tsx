'use client';

import React from 'react';
import { AnalyticsCharts } from '../../components/analytics/AnalyticsCharts';
import { ConsoleLogs } from '../../components/analytics/ConsoleLogs';
import { useAlerts } from '../../context/AlertsContext';

export default function AnalyticsPage() {
  const { alerts } = useAlerts();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 flex-1 items-stretch">
      {/* LEFT COLUMN: Metric Graph Analysis (60% equivalent) */}
      <div className="lg:col-span-3 flex flex-col">
        <section 
          className="flex-1 flex flex-col rounded border shadow-sm overflow-hidden"
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
            <h2 style={{ color: 'var(--text-primary)' }}>METRIC GRAPH ANALYSIS</h2>
          </div>
          <div className="p-6 bg-[var(--bg-surface)] flex-1 flex items-center justify-center min-h-[300px]">
            {alerts.length === 0 ? (
              <div className="text-center font-mono text-xs text-neutral-500">
                Awaiting telemetry metrics to compile analysis
              </div>
            ) : (
              <AnalyticsCharts preview={false} />
            )}
          </div>
        </section>
      </div>

      {/* RIGHT COLUMN: Console Logs (40% equivalent) */}
      <div className="lg:col-span-2 flex flex-col">
        <section 
          className="flex-1 flex flex-col rounded border shadow-sm overflow-hidden"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border)',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div className="p-4 bg-[var(--bg-surface)] flex-1">
            <ConsoleLogs />
          </div>
        </section>
      </div>
    </div>
  );
}
