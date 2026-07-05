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
    <div className="flex flex-col h-full min-h-[300px]">
      {/* Header and Controls */}
      <div 
        className="flex items-center justify-between pb-3 border-b border-[var(--border-dim)] mb-3"
      >
        <span className="text-[10px] font-mono text-neutral-400 font-bold uppercase tracking-wider">
          SYSTEM SECURE LOGS (CRYPTO VERIFICATION)
        </span>
        <button
          onClick={clearLogs}
          className="px-3 py-1 text-[10px] font-mono rounded border hover:bg-neutral-800 transition-colors border-[var(--border)] text-neutral-400 font-semibold cursor-pointer"
        >
          CLEAR TERMINAL
        </button>
      </div>

      {/* Logs Viewport */}
      <div
        ref={consoleRef}
        className="flex-1 overflow-y-auto p-4 rounded font-mono text-xs leading-relaxed flex flex-col gap-1.5 h-[280px]"
        style={{
          backgroundColor: 'var(--console-bg)',
          border: '1px solid var(--console-border)',
        }}
      >
        {logs.length === 0 ? (
          <div className="text-neutral-600 italic text-[11px]">Console buffers empty. Awaiting mesh telemetry...</div>
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
  );
};
