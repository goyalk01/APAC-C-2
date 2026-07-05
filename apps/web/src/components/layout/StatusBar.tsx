'use client';

import React from 'react';
import { useAlerts } from '../../context/AlertsContext';

export const StatusBar: React.FC = () => {
  const { wsConnected, totalAlertsCount, nodesReported, verifiedCount } = useAlerts();

  // Determine Risk Factor
  let riskText = 'STANDBY';
  let riskColor = 'var(--text-secondary)';
  let riskBg = 'var(--bg-surface)';
  let riskBorder = 'var(--border)';

  if (totalAlertsCount >= 4) {
    riskText = 'CRITICAL';
    riskColor = 'var(--accent-critical)';
    riskBg = 'var(--accent-critical-bg)';
    riskBorder = 'var(--accent-critical-border)';
  } else if (totalAlertsCount >= 2) {
    riskText = 'HIGH';
    riskColor = 'var(--accent-warning)';
    riskBg = 'var(--accent-warning-bg)';
    riskBorder = 'var(--accent-warning-border)';
  } else if (totalAlertsCount >= 1) {
    riskText = 'ELEVATED';
    riskColor = 'var(--accent-info)';
    riskBg = 'var(--accent-info-bg)';
    riskBorder = 'var(--accent-info-border)';
  }

  return (
    <div 
      className="flex flex-col md:flex-row items-stretch md:items-center justify-between px-6 py-3 border-b text-xs transition-colors duration-200"
      style={{
        backgroundColor: 'var(--bg-inset)',
        borderColor: 'var(--border-dim)',
      }}
    >
      {/* Connection Indicator */}
      <div className="flex items-center gap-2 font-mono py-1">
        <span 
          className="w-2 h-2 rounded-full inline-block animate-ping"
          style={{
            backgroundColor: wsConnected ? 'var(--accent-primary)' : 'var(--accent-critical)',
          }}
        />
        <span style={{ color: 'var(--text-primary)' }}>
          {wsConnected ? 'Mesh Connected' : 'Blackout Mode (No Relay)'}
        </span>
      </div>

      {/* Metric Pills */}
      <div className="flex flex-wrap items-center gap-4 py-1">
        {/* Alerts count */}
        <div className="flex flex-col items-start px-3 py-1 border border-[var(--border)] bg-[var(--bg-surface)] rounded font-mono min-w-[100px]">
          <span className="text-[9px] text-neutral-500 font-semibold tracking-wider uppercase">ALERTS DETECTED</span>
          <span className="text-sm font-bold mt-0.5" style={{ color: totalAlertsCount > 0 ? 'var(--accent-critical)' : 'var(--text-primary)' }}>
            {totalAlertsCount}
          </span>
        </div>

        {/* Nodes Online */}
        <div className="flex flex-col items-start px-3 py-1 border border-[var(--border)] bg-[var(--bg-surface)] rounded font-mono min-w-[100px]">
          <span className="text-[9px] text-neutral-500 font-semibold tracking-wider uppercase">NODES ONLINE</span>
          <span className="text-sm font-bold mt-0.5" style={{ color: 'var(--text-primary)' }}>
            {nodesReported.length}/5
          </span>
        </div>

        {/* Risk Factor */}
        <div 
          className="flex flex-col items-start px-3 py-1 border rounded font-mono min-w-[100px]"
          style={{
            borderColor: riskBorder,
            backgroundColor: riskBg,
          }}
        >
          <span className="text-[9px] text-neutral-500 font-semibold tracking-wider uppercase">RISK FACTOR</span>
          <span className="text-sm font-bold mt-0.5 transition-colors duration-200" style={{ color: riskColor }}>
            {riskText}
          </span>
        </div>

        {/* Validated Signatures */}
        <div className="flex flex-col items-start px-3 py-1 border border-[var(--border)] bg-[var(--bg-surface)] rounded font-mono min-w-[100px]">
          <span className="text-[9px] text-neutral-500 font-semibold tracking-wider uppercase">VALIDATED SIGS</span>
          <span className="text-sm font-bold mt-0.5" style={{ color: verifiedCount > 0 ? 'var(--accent-primary)' : 'var(--text-primary)' }}>
            {verifiedCount}
          </span>
        </div>
      </div>
    </div>
  );
};
