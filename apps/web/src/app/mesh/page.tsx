'use client';

import React from 'react';
import { TacticalMap } from '../../components/dashboard/TacticalMap';
import { NodeTelemetryGrid } from '../../components/mesh/NodeTelemetryGrid';

export default function MeshPage() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 flex-1 items-stretch">
      {/* LEFT COLUMN: Large Tactical Map (60% equivalent) */}
      <div className="lg:col-span-3 flex flex-col">
        <section 
          className="flex-1 flex flex-col rounded-lg border shadow-sm overflow-hidden"
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
            <h2 style={{ color: 'var(--text-primary)' }}>FORCE-DIRECTED MESH NETWORK GRAPH</h2>
            <span 
              className="px-1.5 py-0.5 rounded-md text-[8px] font-bold text-white bg-green-600 font-sans"
              style={{ textShadow: '0 0 4px rgba(0,255,0,0.5)' }}
            >
              GRID ACTIVE
            </span>
          </div>
          <div className="flex-1 relative bg-[var(--bg-inset)] min-h-[400px]">
            <TacticalMap large={true} />
          </div>
        </section>
      </div>

      {/* RIGHT COLUMN: Node Telemetry Panel (40% equivalent) */}
      <div className="lg:col-span-2 flex flex-col">
        <section 
          className="flex-1 flex flex-col rounded-lg border shadow-sm overflow-hidden"
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
            <h2 style={{ color: 'var(--text-primary)' }}>EDGE NODE TELEMETRY</h2>
          </div>
          <div className="p-4 bg-[var(--bg-surface)] flex-1 overflow-auto">
            <NodeTelemetryGrid />
          </div>
        </section>
      </div>
    </div>
  );
}
