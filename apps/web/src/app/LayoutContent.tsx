'use client';

import React from 'react';
import { useAlerts } from '../context/AlertsContext';
import { Header } from '../components/layout/Header';
import { StatusBar } from '../components/layout/StatusBar';

import { useEffect } from 'react';
import { initSentry } from '../lib/sentry';

interface LayoutContentProps {
  children: React.ReactNode;
}

export default function LayoutContent({ children }: LayoutContentProps) {
  const { ttsActive, ttsIndicatorText, flashActive } = useAlerts();

  useEffect(() => {
    initSentry();
  }, []);

  return (
    <div className="flex flex-col min-h-screen relative">
      {/* Screen flash on incoming alert */}
      {flashActive && (
        <div 
          className="fixed inset-0 pointer-events-none z-50 flash-active-overlay"
          style={{
            mixBlendMode: 'screen',
          }}
        />
      )}

      {/* Static Headers */}
      <Header />
      <StatusBar />

      {/* Main Page Layout Container */}
      <main className="flex-1 flex flex-col p-6 overflow-auto">
        {children}
      </main>

      {/* Global TTS voice announcements indicator */}
      {ttsActive && (
        <div 
          className="fixed bottom-6 right-6 flex items-center gap-3 px-4 py-2 border shadow-lg z-50 rounded animate-bounce font-mono text-xs font-semibold"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--accent-primary-border)',
            boxShadow: 'var(--shadow-lg)',
          }}
        >
          <div className="flex items-end h-3 gap-0.5">
            <span className="tts-bar-span" />
            <span className="tts-bar-span" />
            <span className="tts-bar-span" />
            <span className="tts-bar-span" />
            <span className="tts-bar-span" />
          </div>
          <span style={{ color: 'var(--accent-primary)' }}>
            {ttsIndicatorText}
          </span>
        </div>
      )}
    </div>
  );
}
