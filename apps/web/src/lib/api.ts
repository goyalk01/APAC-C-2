import { BackendThreatEvent, AlertsListResponse, ThreatEvent } from './types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8010/api/v1';

export function mapBackendToFrontend(a: BackendThreatEvent): ThreatEvent {
  return {
    id: a.id,
    event_id: a.event_id,
    received_at: a.received_at,
    synced_to_cloud: a.synced_to_cloud === 1,
    payload: {
      node_id: a.node_id,
      alert_type: a.alert_type,
      confidence: a.confidence,
      gps: { lat: a.latitude, lng: a.longitude },
      timestamp: a.timestamp,
      model_version: a.model_version,
      visual_proof_hash: a.visual_proof_hash || '',
      signature: a.signature,
    },
  };
}

export async function fetchAlerts(limit: number = 100, offset: number = 0): Promise<{ items: ThreatEvent[]; total: number }> {
  try {
    const res = await fetch(`${API_BASE_URL}/alerts?limit=${limit}&offset=${offset}`, {
      cache: 'no-store',
    });
    if (!res.ok) {
      throw new Error(`Failed to fetch alerts: ${res.statusText}`);
    }
    const data: AlertsListResponse = await res.json();
    return {
      items: data.items.map(mapBackendToFrontend),
      total: data.total,
    };
  } catch (error) {
    console.error('API Error fetching alerts:', error);
    return { items: [], total: 0 };
  }
}
