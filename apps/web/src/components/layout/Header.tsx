'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAlerts } from '../../context/AlertsContext';
import { Sun, Moon } from 'lucide-react';

export const Header: React.FC = () => {
  const pathname = usePathname();
  const { theme, toggleTheme, wsConnected } = useAlerts();
  const [timeStr, setTimeStr] = useState('--:--:--');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString('en-US', { hour12: false }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const navItems = [
    { label: 'Dashboard', path: '/' },
    { label: 'Mesh Topology', path: '/mesh' },
    { label: 'Analytics & Logs', path: '/analytics' },
    { label: 'Cloud Sync', path: '/sync' },
  ];

  return (
    <header 
      className="flex items-center justify-between px-6 py-4 border-b transition-colors duration-200"
      style={{
        backgroundColor: 'var(--header-bg)',
        borderColor: 'var(--header-border)',
      }}
    >
      {/* Branding Logo */}
      <div className="flex items-center gap-3">
        <svg className="w-6 h-6 animate-pulse" viewBox="0 0 32 32" fill="none" style={{ color: 'var(--accent-primary)' }}>
          <path d="M16 2L28 9V23L16 30L4 23V9L16 2Z" stroke="currentColor" strokeWidth="2" />
          <path d="M16 8L22 11.5V18.5L16 22L10 18.5V11.5L16 8Z" fill="currentColor" className="opacity-30" />
          <circle cx="16" cy="15" r="3.5" fill="currentColor" />
        </svg>
        <div className="flex flex-col">
          <span className="text-sm font-bold tracking-wider font-mono">
            SWARMGUARD <span style={{ color: 'var(--accent-primary)' }}>AI</span>
          </span>
          <span className="text-[9px] tracking-widest text-neutral-500 font-mono">
            DECISION INTELLIGENCE SYSTEM
          </span>
        </div>
      </div>

      {/* Tabs / Route Navigation */}
      <nav className="flex items-center gap-2">
        {navItems.map((item) => {
          const isActive = pathname === item.path;
          return (
            <Link
              key={item.path}
              href={item.path}
              className="text-xs font-mono font-medium py-1.5 px-4 rounded border border-transparent transition-all"
              style={{
                backgroundColor: isActive ? 'var(--nav-active-bg)' : 'transparent',
                color: isActive ? 'var(--nav-active-text)' : 'var(--text-secondary)',
                borderColor: isActive ? 'var(--nav-active-border)' : 'transparent',
              }}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Utilities / Mode / Theme / Clock */}
      <div className="flex items-center gap-4">
        {/* Mode Indicator */}
        <div 
          className="flex items-center gap-2 px-3 py-1 text-[9px] font-bold rounded border font-mono animate-pulse"
          style={{
            borderColor: wsConnected ? 'var(--accent-primary-border)' : 'var(--accent-critical-border)',
            backgroundColor: wsConnected ? 'var(--accent-primary-bg)' : 'var(--accent-critical-bg)',
            color: wsConnected ? 'var(--accent-primary)' : 'var(--accent-critical)',
          }}
        >
          <span 
            className="w-1.5 h-1.5 rounded-full"
            style={{
              backgroundColor: wsConnected ? 'var(--accent-primary)' : 'var(--accent-critical)',
            }}
          />
          <span>{wsConnected ? 'MESH COMMS ONLINE' : 'COMMS BLACKOUT'}</span>
        </div>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-1.5 rounded border hover:bg-neutral-800 transition-colors cursor-pointer"
          style={{
            borderColor: 'var(--border)',
            color: 'var(--text-secondary)',
          }}
          title="Toggle UI Mode"
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4" />
          ) : (
            <Moon className="w-4 h-4" />
          )}
        </button>

        {/* Clock */}
        <div className="text-xs font-mono font-bold tracking-wider" style={{ color: 'var(--text-primary)' }}>
          {timeStr}
        </div>
      </div>
    </header>
  );
};
