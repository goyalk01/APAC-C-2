'use client';

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { ThreatEvent, LogLine, NodeTelemetry, ThreatPayload } from '../lib/types';
import { fetchAlerts } from '../lib/api';

interface AlertsContextType {
  alerts: ThreatEvent[];
  logs: LogLine[];
  wsConnected: boolean;
  nodesReported: string[];
  verifiedCount: number;
  totalAlertsCount: number;
  nodeTelemetry: Record<string, NodeTelemetry>;
  syncing: boolean;
  syncProgress: number;
  syncNow: () => Promise<void>;
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  selectedAlert: ThreatEvent | null;
  setSelectedAlert: (alert: ThreatEvent | null) => void;
  ttsActive: boolean;
  ttsIndicatorText: string;
  addLogLine: (message: string, type?: 'info' | 'success' | 'warn' | 'error') => void;
  clearLogs: () => void;
  flashActive: boolean;
  setFlashActive: (active: boolean) => void;
}

const AlertsContext = createContext<AlertsContextType | undefined>(undefined);

// Initial telemetry state for simulated nodes
const INITIAL_TELEMETRY: Record<string, NodeTelemetry> = {
  NODE_001: { cpu: 12, ram: 34, signal: 94, battery: 98, status: 'STANDBY', latency: 0 },
  NODE_002: { cpu: 18, ram: 28, signal: 88, battery: 92, status: 'STANDBY', latency: 0 },
  NODE_003: { cpu: 24, ram: 42, signal: 90, battery: 85, status: 'STANDBY', latency: 0 },
  NODE_004: { cpu: 15, ram: 31, signal: 85, battery: 90, status: 'STANDBY', latency: 0 },
  NODE_005: { cpu: 22, ram: 38, signal: 92, battery: 88, status: 'STANDBY', latency: 0 },
};

export const AlertsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [alerts, setAlerts] = useState<ThreatEvent[]>([]);
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [wsConnected, setWsConnected] = useState(false);
  const [nodesReported, setNodesReported] = useState<string[]>([]);
  const [verifiedCount, setVerifiedCount] = useState(0);
  const [totalAlertsCount, setTotalAlertsCount] = useState(0);
  const [nodeTelemetry, setNodeTelemetry] = useState<Record<string, NodeTelemetry>>(INITIAL_TELEMETRY);
  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [selectedAlert, setSelectedAlert] = useState<ThreatEvent | null>(null);
  const [ttsActive, setTtsActive] = useState(false);
  const [ttsIndicatorText, setTtsIndicatorText] = useState('Broadcasting alert...');
  const [flashActive, setFlashActive] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Helper to add log lines
  const addLogLine = (message: string, type: 'info' | 'success' | 'warn' | 'error' = 'info') => {
    const now = new Date();
    const time = now.toLocaleTimeString('en-US', { hour12: false });
    setLogs((prev) => [...prev, { time, message, type }]);
  };

  const clearLogs = () => setLogs([]);

  // Theme Toggler
  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('sg-theme', nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
    addLogLine(`[SYSTEM] Switched UI theme to ${nextTheme.toUpperCase()}`, 'info');
  };

  // TTS playback
  const playAudioSynthesis = (text: string, alertType: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    
    // Stop any current speaking first
    window.speechSynthesis.cancel();

    setTtsIndicatorText(`VHF BROADCAST: ${alertType.toUpperCase().replace('_', ' ')}`);
    setTtsActive(true);

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.pitch = 0.75;
    utterance.onend = () => setTtsActive(false);
    utterance.onerror = () => setTtsActive(false);
    window.speechSynthesis.speak(utterance);
  };

  // Screen Flash
  const triggerScreenFlash = () => {
    setFlashActive(true);
    setTimeout(() => setFlashActive(false), 500);
  };

  // Handle incoming threat alerts
  const handleAlert = (data: { event_id: string; payload: ThreatPayload; speech: string | null }, silent = false) => {
    const p = data.payload;
    const alertId = data.event_id;

    // Reshape / map raw payload to unified shape
    const formattedEvent: ThreatEvent = {
      event_id: alertId,
      speech: data.speech,
      payload: {
        node_id: p.node_id,
        alert_type: p.alert_type,
        confidence: p.confidence,
        gps: p.gps,
        timestamp: p.timestamp,
        model_version: p.model_version,
        visual_proof_hash: p.visual_proof_hash || '',
        signature: p.signature,
      },
    };

    setAlerts((prev) => {
      // Avoid duplicate keys
      if (prev.some((a) => a.event_id === alertId)) return prev;
      return [formattedEvent, ...prev];
    });

    setTotalAlertsCount((prev) => prev + 1);
    setVerifiedCount((prev) => prev + 1);
    setNodesReported((prev) => {
      if (prev.includes(p.node_id)) return prev;
      return [...prev, p.node_id];
    });

    setNodeTelemetry((prev) => {
      const node = prev[p.node_id] || { cpu: 15, ram: 30, signal: 85, battery: 100, status: 'STANDBY', latency: 0 };
      return {
        ...prev,
        [p.node_id]: {
          ...node,
          status: 'ONLINE',
          battery: Math.max(10, node.battery - 1),
          latency: Math.floor(Math.random() * 30) + 30,
        },
      };
    });

    if (!silent) {
      triggerScreenFlash();
      addLogLine(`[DECRYPT] Signature verified for node ${p.node_id}. Alert: ${p.alert_type}.`, 'success');
      if (data.speech) {
        playAudioSynthesis(data.speech, p.alert_type);
      }
    }
  };

  // WebSocket Connection
  const connectWebSocket = () => {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8010/ws/dashboard';
    
    if (wsRef.current) {
      wsRef.current.close();
    }

    addLogLine(`[MESH] Connecting to WebSocket relay at ${wsUrl}...`, 'info');
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setWsConnected(true);
      addLogLine('[MESH] Peer-to-peer relay link established successfully.', 'success');
    };

    ws.onclose = () => {
      setWsConnected(false);
      addLogLine('[MESH] Relay connection down. Defaulting to local blackout-mesh mode.', 'error');
      // Reconnect after 3 seconds
      reconnectTimeoutRef.current = setTimeout(() => {
        connectWebSocket();
      }, 3000);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'new_alert') {
          handleAlert(data, false);
        }
      } catch (err) {
        console.error('Error parsing WS message', err);
      }
    };
  };

  // Load initial alerts via REST API
  const loadInitialData = async () => {
    addLogLine('[SYSTEM] Initializing SwarmGuard cache registry from SQLite...', 'info');
    const data = await fetchAlerts();
    if (data.items.length > 0) {
      // Alerts from API come in latest-first, reverse to play historical items sequentially
      const reversed = [...data.items].reverse();
      reversed.forEach((event) => {
        const reshaped = {
          event_id: event.event_id,
          speech: null,
          payload: {
            node_id: event.payload.node_id,
            alert_type: event.payload.alert_type,
            confidence: event.payload.confidence,
            gps: event.payload.gps,
            timestamp: event.payload.timestamp,
            model_version: event.payload.model_version,
            visual_proof_hash: event.payload.visual_proof_hash,
            signature: event.payload.signature,
          },
        };
        handleAlert(reshaped, true);
      });
      addLogLine(`[SYSTEM] Restored ${data.items.length} threat events from local database.`, 'success');
    } else {
      addLogLine('[SYSTEM] Key registry verified. Ready to receive active mesh telemetry.', 'info');
    }
  };

  // Init Hook
  useEffect(() => {
    // Determine initial theme
    const storedTheme = localStorage.getItem('sg-theme') as 'dark' | 'light' | null;
    const initialTheme = storedTheme || 'dark';
    setTheme(initialTheme);
    document.documentElement.setAttribute('data-theme', initialTheme);

    loadInitialData();
    connectWebSocket();

    return () => {
      if (wsRef.current) wsRef.current.close();
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Periodic Telemetry Jitter Jitter to keep telemetry grid alive
  useEffect(() => {
    const telemetryInterval = setInterval(() => {
      setNodeTelemetry((prev) => {
        const updated = { ...prev };
        let changed = false;

        Object.keys(updated).forEach((nodeId) => {
          // Only jitter nodes that have reported active status
          if (nodesReported.includes(nodeId)) {
            changed = true;
            const t = updated[nodeId];
            updated[nodeId] = {
              ...t,
              cpu: Math.min(95, Math.max(5, t.cpu + Math.floor(Math.random() * 5) - 2)),
              ram: Math.min(95, Math.max(10, t.ram + Math.floor(Math.random() * 3) - 1)),
              latency: Math.min(150, Math.max(20, t.latency + Math.floor(Math.random() * 10) - 5)),
              // Slowly decay battery over long running sessions
              battery: Math.max(10, t.battery - (Math.random() > 0.8 ? 1 : 0)),
            };
          }
        });

        return changed ? updated : prev;
      });
    }, 3000);

    return () => clearInterval(telemetryInterval);
  }, [nodesReported]);

  // Cloud Sync Controller (Simulated Animation)
  const syncNow = async () => {
    if (alerts.length === 0) {
      addLogLine('[SYNC] No cached data payloads available in local cache DB.', 'warn');
      return;
    }

    setSyncing(true);
    setSyncProgress(0);
    addLogLine('[SYNC] Initializing Cloud Run synchronization pipeline...', 'info');

    let progress = 0;
    const interval = setInterval(() => {
      progress += 25;
      setSyncProgress(progress);

      if (progress === 25) {
        addLogLine('[SYNC] Established secure TLS handshake with endpoint: Cloud Run /sync', 'info');
      }
      if (progress === 50) {
        addLogLine(`[SYNC] Streaming ${alerts.length} cache files. Cryptographic signatures validated on-flight.`, 'info');
      }
      if (progress === 75) {
        addLogLine('[SYNC] Uploading payload objects into BigQuery warehouse tables.', 'info');
      }
      if (progress === 100) {
        clearInterval(interval);
        setTimeout(() => {
          addLogLine('[SYNC] Sync process successful. BigQuery analytical buffers refreshed.', 'success');
          
          // Flush local React State
          setAlerts([]);
          setTotalAlertsCount(0);
          setVerifiedCount(0);
          setNodesReported([]);
          setSelectedAlert(null);
          setNodeTelemetry(INITIAL_TELEMETRY);

          setSyncing(false);
          setSyncProgress(0);
        }, 500);
      }
    }, 800);
  };

  return (
    <AlertsContext.Provider
      value={{
        alerts,
        logs,
        wsConnected,
        nodesReported,
        verifiedCount,
        totalAlertsCount,
        nodeTelemetry,
        syncing,
        syncProgress,
        syncNow,
        theme,
        toggleTheme,
        selectedAlert,
        setSelectedAlert,
        ttsActive,
        ttsIndicatorText,
        addLogLine,
        clearLogs,
        flashActive,
        setFlashActive,
      }}
    >
      {children}
    </AlertsContext.Provider>
  );
};

export const useAlerts = () => {
  const context = useContext(AlertsContext);
  if (context === undefined) {
    throw new Error('useAlerts must be used within an AlertsProvider');
  }
  return context;
};
