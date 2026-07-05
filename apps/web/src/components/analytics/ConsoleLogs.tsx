'use client';

import React, { useEffect, useRef } from 'react';
import { useAlerts } from '../../context/AlertsContext';

export const ConsoleLogs: React.FC = () => {
  const { logs, clearLogs } = useAlerts();
  const consoleRef = useRef<HTMLDivElement | null>(null);

  // Auto scroll to bottom
  useEffect(() => {
    if (consoleRef.current) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="flex flex-col h-full flex-1">
      {/* Header and Controls */}
      <div 
        className="flex items-center justify-between px-4 py-3 border-b font-sans text-xs font-bold"
        style={{ borderColor: 'var(--border-dim)' }}
      >
        <h2 style={{ color: 'var(--text-primary)' }}>SYSTEM SECURE LOGS (CRYPTO VERIFICATION)</h2>
        <button
          onClick={clearLogs}
          className="px-3 py-1 text-[10px] font-sans rounded-md border hover:bg-[var(--bg-hover)] transition-colors font-semibold cursor-pointer"
          style={{
            borderColor: 'var(--border)',
            color: 'var(--text-secondary)',
          }}
        >
          CLEAR TERMINAL
        </button>
      </div>

      {/* Logs Viewport */}
      <div className="p-4 flex-1 flex flex-col h-full min-h-[300px]">
        <div
          ref={consoleRef}
          className="flex-1 overflow-y-auto p-4 rounded-lg font-mono text-xs leading-relaxed flex flex-col gap-1.5 h-[280px]"
          style={{
            backgroundColor: 'var(--console-bg)',
            border: '1px solid var(--console-border)',
          }}
        >
          {logs.length === 0 ? (
            <div className="italic text-[11px]" style={{ color: 'var(--text-muted)' }}>Console buffers empty. Awaiting mesh telemetry...</div>
          ) : (
            logs.map((log, idx) => {
              let textColor = 'var(--console-text-dim)';
              if (log.type === 'success') {
                textColor = 'var(--console-text)';
              } else if (log.type === 'error') {
                textColor = 'var(--console-text-error)';
              } else if (log.type === 'warn') {
                textColor = 'var(--console-text-warn)';
              }

              return (
                <div 
                  key={idx} 
                  style={{ color: textColor }}
                  className="whitespace-pre-wrap break-all"
                >
                  <span className="opacity-40 select-none mr-2">[{log.time}]</span>
                  {log.message}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
