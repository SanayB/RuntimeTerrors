// Shared helper utilities

export const RISK_COLORS = {
  CRITICAL: '#ff3b5c',
  HIGH:     '#ff8c00',
  MEDIUM:   '#f5c518',
  LOW:      '#22d65f',
};

export function riskClass(level = '') {
  return level.toLowerCase();
}

export function formatTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString(undefined, {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export function scoreColor(score) {
  if (score >= 80) return RISK_COLORS.CRITICAL;
  if (score >= 60) return RISK_COLORS.HIGH;
  if (score >= 35) return RISK_COLORS.MEDIUM;
  return RISK_COLORS.LOW;
}
