'use client';

import React from 'react';
import { useAlerts } from '../../context/AlertsContext';
import { getAlertSeverity } from '../../lib/severity';

export const StatusBar: React.FC = () => {
  const { wsConnected, totalAlertsCount, nodesReported, verifiedCount, alerts } = useAlerts();

  // Determine Risk Factor based on the highest active alert severity
  let riskText = 'STANDBY';
  let riskColor = 'var(--text-secondary)';
  let riskBg = 'var(--bg-surface)';
  let riskBorder = 'var(--border)';

  if (alerts.length > 0) {
    let hasCritical = false;
    let hasWarning = false;
    for (const alert of alerts) {
      const sev = getAlertSeverity(alert.payload.alert_type, alert.payload.confidence);
      if (sev === 'CRITICAL') hasCritical = true;
      if (sev === 'WARNING') hasWarning = true;
    }

    if (hasCritical) {
      riskText = 'CRITICAL';
      riskColor = 'var(--accent-critical)';
      riskBg = 'var(--accent-critical-bg)';
      riskBorder = 'var(--accent-critical-border)';
    } else if (hasWarning) {
      riskText = 'HIGH';
      riskColor = 'var(--accent-warning)';
      riskBg = 'var(--accent-warning-bg)';
      riskBorder = 'var(--accent-warning-border)';
    } else {
      riskText = 'ELEVATED';
      riskColor = 'var(--accent-info)';
      riskBg = 'var(--accent-info-bg)';
      riskBorder = 'var(--accent-info-border)';
    }
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
          className={`w-2 h-2 rounded-full inline-block ${!wsConnected ? 'animate-ping' : ''}`}
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
        <div className="flex flex-col items-start px-3 py-1 border border-[var(--border)] bg-[var(--bg-surface)] rounded-lg font-mono min-w-[100px]">
          <span className="text-[9px] font-semibold tracking-wider uppercase" style={{ color: 'var(--text-muted)' }}>ALERTS DETECTED</span>
          <span className="text-sm font-bold mt-0.5" style={{ color: totalAlertsCount > 0 ? 'var(--accent-critical)' : 'var(--text-primary)' }}>
            {totalAlertsCount}
          </span>
        </div>

        {/* Nodes Online */}
        <div className="flex flex-col items-start px-3 py-1 border border-[var(--border)] bg-[var(--bg-surface)] rounded-lg font-mono min-w-[100px]">
          <span className="text-[9px] font-semibold tracking-wider uppercase" style={{ color: 'var(--text-muted)' }}>NODES ONLINE</span>
          <span className="text-sm font-bold mt-0.5" style={{ color: 'var(--text-primary)' }}>
            {nodesReported.length}/5
          </span>
        </div>

        {/* Risk Factor */}
        <div 
          className="flex flex-col items-start px-3 py-1 border rounded-lg font-mono min-w-[100px]"
          style={{
            borderColor: riskBorder,
            backgroundColor: riskBg,
          }}
        >
          <span className="text-[9px] font-semibold tracking-wider uppercase" style={{ color: 'var(--text-muted)' }}>RISK FACTOR</span>
          <span className="text-sm font-bold mt-0.5 transition-colors duration-200" style={{ color: riskColor }}>
            {riskText}
          </span>
        </div>

        {/* Validated Signatures */}
        <div className="flex flex-col items-start px-3 py-1 border border-[var(--border)] bg-[var(--bg-surface)] rounded-lg font-mono min-w-[100px]">
          <span className="text-[9px] font-semibold tracking-wider uppercase" style={{ color: 'var(--text-muted)' }}>VALIDATED SIGS</span>
          <span className="text-sm font-bold mt-0.5" style={{ color: verifiedCount > 0 ? 'var(--accent-primary)' : 'var(--text-primary)' }}>
            {verifiedCount}
          </span>
        </div>
      </div>
    </div>
  );
};
