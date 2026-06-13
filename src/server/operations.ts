import { Match, MatchOperationalStatus, MatchStatus, SettlementStatus } from '../types';

export const FINISHED_MATCH_STATUSES = new Set<MatchStatus>([
  MatchStatus.FT,
  MatchStatus.AET,
  MatchStatus.PEN,
]);

export function computeLockTime(match: Match, predictionLockMinutes: number) {
  return new Date(new Date(match.startTimeUtc).getTime() - predictionLockMinutes * 60 * 1000);
}

export function deriveOperationalStatus(
  match: Match,
  now = Date.now(),
  predictionLockMinutes = 5,
): MatchOperationalStatus {
  if (match.status === MatchStatus.CANCELLED) return 'CANCELLED';
  if (match.isSettled || match.settlementStatus === 'SETTLED') return 'SETTLED';
  if (FINISHED_MATCH_STATUSES.has(match.status)) return 'WAITING_SETTLEMENT';
  if (match.isPredictionLocked) return 'LOCKED';

  const lockTime = computeLockTime(match, predictionLockMinutes).getTime();
  const startTime = new Date(match.startTimeUtc).getTime();
  if (now >= lockTime || match.status !== MatchStatus.NS) {
    return 'LOCKED';
  }
  if (startTime - now <= 30 * 60 * 1000) {
    return 'LOCKING_SOON';
  }
  return 'BETTABLE';
}

export function deriveSettlementStatus(match: Match): SettlementStatus {
  if (match.isSettled) return 'SETTLED';
  if (FINISHED_MATCH_STATUSES.has(match.status)) return 'WAITING_SETTLEMENT';
  return 'PENDING';
}

export function hasResolvableScore(match: Match) {
  return typeof match.homeScore === 'number' && typeof match.awayScore === 'number';
}

export function enrichMatchLifecycle(match: Match, predictionLockMinutes = 5): Match {
  const lockTime = computeLockTime(match, predictionLockMinutes);
  return {
    ...match,
    autoLockAt: lockTime.toISOString(),
    operationalStatus: deriveOperationalStatus(match, Date.now(), predictionLockMinutes),
    settlementStatus: deriveSettlementStatus(match),
    lastStatusComputedAt: new Date().toISOString(),
  };
}

export function applyLifecycleUpdates(match: Match, predictionLockMinutes = 5) {
  const now = Date.now();
  const lockTime = computeLockTime(match, predictionLockMinutes).getTime();

  if (match.status !== MatchStatus.NS && !match.isPredictionLocked) {
    match.isPredictionLocked = true;
    match.predictionLockedAt = new Date(now).toISOString();
  }

  if (now >= lockTime && !match.isPredictionLocked) {
    match.isPredictionLocked = true;
    match.predictionLockedAt = new Date(now).toISOString();
  }

  if (match.isPredictionLocked && !match.isOddsFrozen) {
    match.isOddsFrozen = true;
    match.oddsFrozenAt = match.oddsFrozenAt || new Date(now).toISOString();
  }

  match.autoLockAt = new Date(lockTime).toISOString();
  match.operationalStatus = deriveOperationalStatus(match, now, predictionLockMinutes);
  match.settlementStatus = deriveSettlementStatus(match);
  match.lastStatusComputedAt = new Date(now).toISOString();
}
