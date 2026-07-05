export interface GPS {
  lat: number;
  lng: number;
}

export interface ThreatPayload {
  node_id: string;
  alert_type: string;
  confidence: number;
  gps: GPS;
  timestamp: string;
  model_version: string;
  visual_proof_hash: string;
  signature: string;
}

export interface ThreatEvent {
  id?: number;
  event_id: string;
  payload: ThreatPayload;
  speech?: string | null;
  received_at?: string;
  synced_to_cloud?: boolean;
}

export interface BackendThreatEvent {
  id: number;
  event_id: string;
  node_id: string;
  alert_type: string;
  confidence: number;
  latitude: number;
  longitude: number;
  timestamp: string;
  model_version: string;
  visual_proof_hash: string | null;
  signature: string;
  received_at: string;
  synced_to_cloud: number;
}

export interface AlertsListResponse {
  items: BackendThreatEvent[];
  total: number;
}

export interface LogLine {
  time: string;
  message: string;
  type: 'info' | 'success' | 'warn' | 'error';
}

export interface NodeTelemetry {
  cpu: number;
  ram: number;
  signal: number;
  battery: number;
  status: 'ONLINE' | 'STANDBY';
  latency: number;
}
