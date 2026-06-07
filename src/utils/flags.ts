import type React from 'react';

const TEAM_TO_FLAG_KEY: Record<string, string> = {
  ARG: 'AR',
  AUS: 'AU',
  AUT: 'AT',
  BEL: 'BE',
  BIH: 'BA',
  BRA: 'BR',
  CAN: 'CA',
  CIV: 'CI',
  CMR: 'CM',
  COD: 'CD',
  COL: 'CO',
  CPV: 'CV',
  CRO: 'HR',
  CUR: 'CW',
  CZE: 'CZ',
  DZA: 'DZ',
  ECU: 'EC',
  EGY: 'EG',
  ENG: 'GB-ENG',
  ESP: 'ES',
  FRA: 'FR',
  GER: 'DE',
  GHA: 'GH',
  HAI: 'HT',
  IRN: 'IR',
  IRQ: 'IQ',
  ITA: 'IT',
  JOR: 'JO',
  JPN: 'JP',
  KOR: 'KR',
  KSA: 'SA',
  MAR: 'MA',
  MEX: 'MX',
  NED: 'NL',
  NOR: 'NO',
  NZL: 'NZ',
  PAN: 'PA',
  PAR: 'PY',
  POR: 'PT',
  QAT: 'QA',
  RSA: 'ZA',
  SCO: 'GB-SCT',
  SEN: 'SN',
  SUI: 'CH',
  SWE: 'SE',
  TBD: 'TBD',
  TUN: 'TN',
  TUR: 'TR',
  URU: 'UY',
  USA: 'US',
  UZB: 'UZ',
};

export const flagStyles: Record<string, React.CSSProperties> = {
  AR: { background: 'linear-gradient(180deg, #7dd3fc 0 33%, #f8fafc 33% 66%, #7dd3fc 66% 100%)' },
  AT: { background: 'linear-gradient(180deg, #ef4444 0 33%, #f8fafc 33% 66%, #ef4444 66% 100%)' },
  AU: { background: 'linear-gradient(135deg, #1d4ed8 0 30%, #ef4444 30% 45%, #f8fafc 45% 55%, #ef4444 55% 70%, #1d4ed8 70% 100%)' },
  BA: { background: 'linear-gradient(180deg, #1d4ed8 0 55%, #facc15 55% 100%)' },
  BE: { background: 'linear-gradient(90deg, #111827 0 33%, #facc15 33% 66%, #ef4444 66% 100%)' },
  BR: { background: 'radial-gradient(circle at center, #1d4ed8 0 18%, transparent 18%), linear-gradient(135deg, transparent 34%, #facc15 34% 66%, transparent 66%), #16a34a' },
  CA: { background: 'linear-gradient(90deg, #ef4444 0 25%, #f8fafc 25% 75%, #ef4444 75% 100%)' },
  CD: { background: 'linear-gradient(135deg, #1d4ed8 0 45%, #facc15 45% 55%, #ef4444 55% 100%)' },
  CH: { background: 'radial-gradient(circle at center, #f8fafc 0 18%, transparent 18%), #ef4444' },
  CI: { background: 'linear-gradient(90deg, #f97316 0 33%, #f8fafc 33% 66%, #16a34a 66% 100%)' },
  CM: { background: 'linear-gradient(90deg, #16a34a 0 33%, #ef4444 33% 66%, #facc15 66% 100%)' },
  CO: { background: 'linear-gradient(180deg, #facc15 0 50%, #1d4ed8 50% 75%, #ef4444 75% 100%)' },
  CV: { background: 'linear-gradient(180deg, #1d4ed8 0 45%, #f8fafc 45% 47%, #ef4444 47% 49%, #f8fafc 49% 51%, #1d4ed8 51% 100%)' },
  CW: { background: 'linear-gradient(180deg, #1d4ed8 0 45%, #facc15 45% 55%, #1d4ed8 55% 100%)' },
  CZ: { background: 'linear-gradient(180deg, #f8fafc 0 50%, #ef4444 50% 100%), linear-gradient(90deg, transparent 0 40%, #1d4ed8 40% 100%)' },
  DE: { background: 'linear-gradient(180deg, #111827 0 33%, #dc2626 33% 66%, #f59e0b 66% 100%)' },
  DZ: { background: 'linear-gradient(90deg, #16a34a 0 50%, #f8fafc 50% 100%)' },
  EC: { background: 'linear-gradient(180deg, #facc15 0 50%, #1d4ed8 50% 75%, #ef4444 75% 100%)' },
  EG: { background: 'linear-gradient(180deg, #ef4444 0 33%, #f8fafc 33% 66%, #111827 66% 100%)' },
  ES: { background: 'linear-gradient(180deg, #dc2626 0 25%, #facc15 25% 75%, #dc2626 75% 100%)' },
  FR: { background: 'linear-gradient(90deg, #1d4ed8 0 33%, #f8fafc 33% 66%, #ef4444 66% 100%)' },
  GB: { background: 'linear-gradient(0deg, transparent 42%, #f8fafc 42% 58%, transparent 58%), linear-gradient(90deg, transparent 42%, #f8fafc 42% 58%, transparent 58%), #1d4ed8' },
  'GB-ENG': { background: 'linear-gradient(0deg, transparent 42%, #dc2626 42% 58%, transparent 58%), linear-gradient(90deg, transparent 42%, #dc2626 42% 58%, transparent 58%), #f8fafc' },
  'GB-SCT': { background: 'linear-gradient(45deg, transparent 43%, #f8fafc 43% 57%, transparent 57%), linear-gradient(-45deg, transparent 43%, #f8fafc 43% 57%, transparent 57%), #1d4ed8' },
  GH: { background: 'linear-gradient(180deg, #ef4444 0 33%, #facc15 33% 66%, #16a34a 66% 100%)' },
  HR: { background: 'linear-gradient(180deg, #ef4444 0 33%, #f8fafc 33% 66%, #1d4ed8 66% 100%)' },
  HT: { background: 'linear-gradient(180deg, #1d4ed8 0 50%, #ef4444 50% 100%)' },
  IQ: { background: 'linear-gradient(180deg, #ef4444 0 33%, #f8fafc 33% 66%, #111827 66% 100%)' },
  IR: { background: 'linear-gradient(180deg, #16a34a 0 33%, #f8fafc 33% 66%, #ef4444 66% 100%)' },
  IT: { background: 'linear-gradient(90deg, #16a34a 0 33%, #f8fafc 33% 66%, #ef4444 66% 100%)' },
  JO: { background: 'linear-gradient(180deg, #111827 0 33%, #f8fafc 33% 66%, #16a34a 66% 100%)' },
  JP: { background: 'radial-gradient(circle at center, #ef4444 0 24%, transparent 24%), #f8fafc' },
  KR: { background: 'radial-gradient(circle at 50% 44%, #ef4444 0 18%, transparent 18%), radial-gradient(circle at 50% 56%, #2563eb 0 18%, transparent 18%), #f8fafc' },
  MA: { background: '#ef4444' },
  MX: { background: 'linear-gradient(90deg, #16a34a 0 33%, #f8fafc 33% 66%, #ef4444 66% 100%)' },
  NL: { background: 'linear-gradient(180deg, #ef4444 0 33%, #f8fafc 33% 66%, #2563eb 66% 100%)' },
  NO: { background: 'linear-gradient(0deg, transparent 38%, #1d4ed8 38% 46%, transparent 46%), linear-gradient(90deg, transparent 38%, #1d4ed8 38% 46%, transparent 46%), #ef4444' },
  NZ: { background: 'linear-gradient(135deg, #1d4ed8 0 30%, #ef4444 30% 45%, #f8fafc 45% 55%, #ef4444 55% 70%, #1d4ed8 70% 100%)' },
  PA: { background: 'linear-gradient(180deg, #f8fafc 0 25%, #1d4ed8 25% 50%, #ef4444 50% 75%, #f8fafc 75% 100%)' },
  PT: { background: 'linear-gradient(90deg, #166534 0 40%, #dc2626 40% 100%)' },
  PY: { background: 'linear-gradient(180deg, #ef4444 0 33%, #f8fafc 33% 66%, #1d4ed8 66% 100%)' },
  QA: { background: 'linear-gradient(90deg, #f8fafc 0 35%, #881337 35% 100%)' },
  SA: { background: '#16a34a' },
  SE: { background: 'linear-gradient(0deg, transparent 38%, #facc15 38% 46%, transparent 46%), linear-gradient(90deg, transparent 38%, #facc15 38% 46%, transparent 46%), #1d4ed8' },
  SN: { background: 'linear-gradient(90deg, #16a34a 0 33%, #facc15 33% 66%, #ef4444 66% 100%)' },
  TN: { background: '#ef4444' },
  TR: { background: '#ef4444' },
  US: { background: 'linear-gradient(180deg, #dc2626 0 14%, #f8fafc 14% 28%, #dc2626 28% 42%, #f8fafc 42% 56%, #dc2626 56% 70%, #f8fafc 70% 84%, #dc2626 84% 100%)' },
  UY: { background: 'linear-gradient(180deg, #f8fafc 0 20%, #1d4ed8 20% 40%, #f8fafc 40% 60%, #1d4ed8 60% 80%, #f8fafc 80% 100%)' },
  UZ: { background: 'linear-gradient(180deg, #1d4ed8 0 33%, #f8fafc 33% 34%, #ef4444 34% 35%, #f8fafc 35% 36%, #16a34a 36% 100%)' },
  ZA: { background: 'linear-gradient(135deg, #ef4444 0 20%, #1d4ed8 20% 40%, #f8fafc 40% 50%, #16a34a 50% 55%, #f8fafc 55% 60%, #facc15 60% 70%, #111827 70% 100%)' },
};

export function normalizeFlagCode(code?: string) {
  if (!code) return '';
  const normalized = code.trim().toUpperCase();
  if (TEAM_TO_FLAG_KEY[normalized]) {
    return TEAM_TO_FLAG_KEY[normalized];
  }
  if (normalized.length === 2) {
    return normalized;
  }
  return normalized.slice(0, 2);
}

export function getFlagStyle(code?: string) {
  const normalized = normalizeFlagCode(code);
  if (flagStyles[normalized]) {
    return flagStyles[normalized];
  }
  if (normalized.startsWith('GB-')) {
    return flagStyles.GB;
  }
  return null;
}

export function toFlagEmoji(code?: string) {
  const normalized = normalizeFlagCode(code);
  if (!normalized || normalized.length !== 2) {
    return '';
  }

  return String.fromCodePoint(
    ...normalized.split('').map((char) => 127397 + char.charCodeAt(0)),
  );
}

export function getFlagFallbackText(code?: string) {
  const normalized = (code || '').trim().toUpperCase();
  if (!normalized) return 'FC';
  return normalized.slice(0, 3);
}
