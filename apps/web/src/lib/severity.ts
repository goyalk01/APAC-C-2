export type SeverityLevel = 'CRITICAL' | 'WARNING' | 'ELEVATED';

export interface SeverityTheme {
  color: string;
  lightColor: string;
  label: string;
}

export const SEVERITY_CONFIG: Record<SeverityLevel, SeverityTheme> = {
  CRITICAL: {
    color: '#ef4444',
    lightColor: '#e02424',
    label: 'Critical',
  },
  WARNING: {
    color: '#f97316',
    lightColor: '#b45309',
    label: 'Warning',
  },
  ELEVATED: {
    color: '#3b82f6',
    lightColor: '#1c64f2',
    label: 'Elevated',
  }
};

export const ALERT_LABELS: Record<string, string> = {
  BRIDGE_COLLAPSE: 'Bridge Collapse',
  FLOODING: 'Flooding',
  STRUCTURAL_FIRE: 'Structural Fire',
  GAS_LEAK: 'Gas Leak',
  CROWD_STAMPEDE: 'Crowd Stampede'
};

export function getAlertLabel(alertType: string): string {
  return ALERT_LABELS[alertType] || alertType.replace(/_/g, ' ');
}

/**
 * Calculates threat severity dynamically based on confidence and threat type impact levels
 */
export function getAlertSeverity(alertType: string, confidence: number): SeverityLevel {
  // If confidence is extremely high, escalate it to Critical
  if (confidence >= 0.95) {
    return 'CRITICAL';
  }

  // Base hazard level by type modified by confidence thresholds
  if (alertType === 'BRIDGE_COLLAPSE' || alertType === 'GAS_LEAK') {
    return confidence >= 0.90 ? 'CRITICAL' : 'WARNING';
  }

  if (alertType === 'STRUCTURAL_FIRE' || alertType === 'CROWD_STAMPEDE') {
    return confidence >= 0.85 ? 'WARNING' : 'ELEVATED';
  }

  // Default fallback (e.g. Flooding or lower-confidence warnings)
  return 'ELEVATED';
}
