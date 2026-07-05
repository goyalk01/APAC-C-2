'use client';

import React from 'react';
import { useAlerts } from '../../context/AlertsContext';

export const NodeTelemetryGrid: React.FC = () => {
  const { nodeTelemetry, nodesReported } = useAlerts();

  return (
    <div className="flex flex-col gap-4">
      {/* Simulation Info Badge */}
      <div 
        className="flex items-center justify-between p-2.5 px-3 rounded-lg border text-[10px] font-sans font-semibold"
        style={{
          backgroundColor: 'var(--bg-inset)',
          borderColor: 'var(--accent-warning-border)',
          color: 'var(--accent-warning)',
        }}
      >
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-warning)]" />
          <span>SIMULATED TELEMETRY PANEL</span>
        </div>
        <span className="font-semibold uppercase tracking-wider text-[9px] border px-1.5 py-0.5 rounded-md" style={{ borderColor: 'var(--accent-warning-border)' }}>
          Simulation Overlay Active
        </span>
      </div>

      {/* Grid of Nodes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-4">
        {Object.entries(nodeTelemetry).map(([nodeId, t]) => {
          const isOnline = nodesReported.includes(nodeId);
          
          // Display values are zeroed out if offline
          const cpuVal = isOnline ? t.cpu : 0;
          const ramVal = isOnline ? t.ram : 0;
          const signalVal = isOnline ? t.signal : 0;
          const batteryVal = isOnline ? t.battery : 100;
          const latencyVal = isOnline ? t.latency : 0;

          return (
            <div 
              key={nodeId}
              className="p-4 border rounded-lg flex flex-col justify-between gap-3 shadow-sm font-mono text-xs transition-all duration-200"
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: isOnline ? 'var(--accent-primary-border)' : 'var(--border)',
              }}
            >
              {/* Card Header */}
              <div className="flex items-center justify-between font-sans">
                <span className="font-bold tracking-wider" style={{ color: 'var(--text-primary)' }}>
                  {nodeId}
                </span>
                <span 
                  className="px-2 py-0.5 rounded-md text-[9px] font-bold"
                  style={{
                    backgroundColor: isOnline ? 'var(--accent-primary-bg)' : 'var(--bg-inset)',
                    color: isOnline ? 'var(--accent-primary)' : 'var(--text-muted)',
                    border: `1px solid ${isOnline ? 'var(--accent-primary-border)' : 'var(--border)'}`,
                  }}
                >
                  {isOnline ? 'ONLINE' : 'STANDBY'}
                </span>
              </div>

              {/* Metric Items */}
              <div className="flex flex-col gap-2 font-sans">
                {/* CPU Load */}
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-[10px]">
                    <span style={{ color: 'var(--text-muted)' }}>CPU LOAD</span>
                    <span className="font-bold font-mono" style={{ color: 'var(--text-secondary)' }}>{cpuVal}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-[var(--bg-inset)] rounded-full overflow-hidden">
                    <div 
                       className="h-full rounded-full transition-all duration-500" 
                       style={{ 
                         width: `${cpuVal}%`,
                         backgroundColor: 'var(--accent-info)' 
                       }} 
                    />
                  </div>
                </div>

                {/* RAM Memory */}
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-[10px]">
                    <span style={{ color: 'var(--text-muted)' }}>MEMORY</span>
                    <span className="font-bold font-mono" style={{ color: 'var(--text-secondary)' }}>{ramVal}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-[var(--bg-inset)] rounded-full overflow-hidden">
                    <div 
                       className="h-full rounded-full transition-all duration-500" 
                       style={{ 
                         width: `${ramVal}%`,
                         backgroundColor: 'var(--accent-warning)' 
                       }} 
                    />
                  </div>
                </div>

                {/* Mesh Signal */}
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-[10px]">
                    <span style={{ color: 'var(--text-muted)' }}>MESH SIGNAL</span>
                    <span className="font-bold font-mono" style={{ color: 'var(--text-secondary)' }}>{signalVal} dBm</span>
                  </div>
                  <div className="w-full h-1.5 bg-[var(--bg-inset)] rounded-full overflow-hidden">
                    <div 
                       className="h-full rounded-full transition-all duration-500" 
                       style={{ 
                         width: `${signalVal}%`,
                         backgroundColor: 'var(--accent-primary)' 
                       }} 
                    />
                  </div>
                </div>

                {/* Battery */}
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-[10px]">
                    <span style={{ color: 'var(--text-muted)' }}>BATTERY</span>
                    <span className="font-bold font-mono" style={{ color: 'var(--text-secondary)' }}>{batteryVal}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-[var(--bg-inset)] rounded-full overflow-hidden">
                    <div 
                       className="h-full rounded-full transition-all duration-500" 
                       style={{ 
                         width: `${batteryVal}%`,
                         backgroundColor: batteryVal < 30 ? 'var(--accent-critical)' : 'var(--accent-primary)' 
                       }} 
                    />
                  </div>
                </div>
              </div>

              {/* Card Footer */}
              <div 
                className="flex items-center justify-between text-[10px] pt-2 border-t font-mono"
                style={{ 
                  color: 'var(--text-muted)',
                  borderColor: 'var(--border-dim)'
                }}
              >
                <span>LATENCY: {latencyVal}ms</span>
                <span className="text-[9px]">KEY: Ed25519_Sec...</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
