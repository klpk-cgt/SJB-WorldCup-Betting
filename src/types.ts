/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum MatchStatus {
  NS = 'NS',
  LIVE = 'LIVE',
  HT = 'HT',
  FT = 'FT',
  AET = 'AET',
  PEN = 'PEN',
  CANCELLED = 'CANCELLED',
}

export type MatchOperationalStatus =
  | 'BETTABLE'
  | 'LOCKING_SOON'
  | 'LOCKED'
  | 'WAITING_SETTLEMENT'
  | 'SETTLED'
  | 'CANCELLED';

export type SettlementStatus = 'PENDING' | 'WAITING_SETTLEMENT' | 'SETTLED' | 'ROLLED_BACK';

export interface Team {
  id: string;
  name: string;
  nameZh: string;
  code: string;
  logoUrl: string;
  groupName: string;
}

export interface MatchStatistics {
  ballPossession?: { home: string; away: string };
  shotsOnGoal?: { home: number; away: number };
  fouls?: { home: number; away: number };
  cornerKicks?: { home: number; away: number };
}

export interface MatchLineupSide {
  formation: string;
  coach: string;
  starting: Array<{ number: number; name: string; position: string }>;
  substitutes: Array<{ number: number; name: string; position: string }>;
}

export interface MatchEvent {
  type: 'GOAL' | 'YELLOW_CARD' | 'RED_CARD' | 'SUBSTITUTION' | 'PENALTY';
  minute: number;
  teamId: string;
  playerName: string;
  detail?: string;
}

export interface MatchProviderMeta {
  apiFootballFixtureId?: number;
  oddsEventId?: string;
  lastFixturesSyncAt?: string;
  lastOddsSyncAt?: string;
  lastLiveSyncAt?: string;
}

export interface MatchLifecycle {
  operationalStatus?: MatchOperationalStatus;
  settlementStatus?: SettlementStatus;
  autoLockAt?: string;
  lastStatusComputedAt?: string;
}

export interface Match extends MatchLifecycle {
  id: string;
  homeTeamId: string;
  awayTeamId: string;
  stage:
    | 'Group Stage'
    | 'Round of 32'
    | 'Round of 16'
    | 'Quarter-finals'
    | 'Semi-finals'
    | 'Final'
    | 'Third-place play-off';
  roundName: string;
  venueName: string;
  venueCity: string;
  startTimeUtc: string;
  startTimeBeijing: string;
  status: MatchStatus;
  homeTeam?: Team;
  awayTeam?: Team;
  odds?: MatchOdds | null;
  homeScore?: number;
  awayScore?: number;
  homePenaltyScore?: number;
  awayPenaltyScore?: number;
  winnerTeamId?: string;
  isOddsFrozen: boolean;
  oddsFrozenAt?: string;
  isPredictionLocked: boolean;
  predictionLockedAt?: string;
  isSettled: boolean;
  settledAt?: string;
  statistics?: MatchStatistics;
  lineups?: {
    home: MatchLineupSide;
    away: MatchLineupSide;
  };
  events?: MatchEvent[];
  providerMeta?: MatchProviderMeta;
}

export interface MatchOdds {
  matchId: string;
  h2h: {
    homeWin: number;
    draw: number;
    awayWin: number;
  };
  correctScore: Array<{
    score: string;
    odds: number;
  }>;
  totalGoals: {
    over25: number;
    under25: number;
  };
  qualify?: {
    homeQualify: number;
    awayQualify: number;
  };
  lastUpdated: string;
  source?: 'API-Football' | 'The Odds API' | 'MANUAL';
  syncStatus?: 'SYNCED' | 'PARTIAL' | 'MANUAL_FALLBACK' | 'FAILED';
  lastSyncedAt?: string;
}

export interface GroupRoom {
  id: string;
  name: string;
  slug: string;
  inviteCode: string;
  description: string;
  isActive: boolean;
  createdAt: string;
}

export type UserStatus = 'UNCLAIMED' | 'CLAIMED' | 'LOCKED' | 'DISABLED';

export interface User {
  id: string;
  groupId: string;
  displayName: string;
  avatarUrl: string;
  loginCode: string;
  pinHash: string;
  status: UserStatus;
  claimedAt?: string;
  lastLoginAt?: string;
  createdAt: string;
}

export interface Wallet {
  userId: string;
  balance: number;
  initialPoints: number;
}

export type TransactionType =
  | 'INITIAL_GRANT'
  | 'PREDICTION_STAKE'
  | 'PREDICTION_WIN'
  | 'PREDICTION_LOSE'
  | 'ADMIN_ADJUST'
  | 'REFUND';

export interface Transaction {
  id: string;
  userId: string;
  type: TransactionType;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  relatedPredictionId?: string;
  relatedMatchId?: string;
  note: string;
  createdAt: string;
}

export type PredictionMarket = 'H2H' | 'CORRECT_SCORE' | 'TOTAL_GOALS' | 'QUALIFY';

export type PredictionStatus = 'PENDING' | 'LOCKED' | 'WON' | 'LOST' | 'VOID' | 'CANCELLED';

export interface OddsSnapshotRecord {
  market: PredictionMarket;
  optionKey: string;
  optionLabel: string;
  oddsDecimal: number;
  capturedAt: string;
  source: 'API-Football' | 'The Odds API' | 'MANUAL' | 'LOCAL';
}

export interface Prediction {
  id: string;
  userId: string;
  groupId: string;
  matchId: string;
  market: PredictionMarket;
  optionKey: string;
  optionLabel: string;
  stakePoints: number;
  oddsDecimal: number;
  potentialReturn: number;
  status: PredictionStatus;
  settledReturn?: number;
  settledProfit?: number;
  placedAt: string;
  settledAt?: string;
  oddsSnapshot?: OddsSnapshotRecord;
}

export interface AIContent {
  id: string;
  type:
    | 'DAILY_RECOMMENDATION'
    | 'PRE_MATCH_ANALYSIS'
    | 'POST_MATCH_RECAP'
    | 'LEADERBOARD_COMMENTARY'
    | 'BET_SHARE_COPY';
  matchId?: string;
  predictionId?: string;
  title: string;
  content: string;
  model: string;
  createdAt: string;
  provider?: 'DeepSeek' | 'MiMo' | 'Gemini' | 'Local';
  summary?: string;
  bullets?: string[];
  riskWarning?: string;
  fallbackUsed?: boolean;
  debugMeta?: Record<string, string | number | boolean | null>;
}

export interface ShareCardRecord {
  id: string;
  userId: string;
  predictionId: string;
  matchId: string;
  mode: 'image' | 'text';
  text: string;
  imageDataUrl?: string;
  provider: 'DeepSeek' | 'MiMo' | 'Gemini' | 'Local';
  model: string;
  fallbackUsed: boolean;
  createdAt: string;
  debugMeta?: Record<string, string | number | boolean | null>;
}

export type SyncProvider = 'API-Football' | 'The Odds API' | 'DeepSeek' | 'MiMo' | 'Gemini' | 'Local';
export type SyncStatus = 'SUCCESS' | 'FAILED' | 'PARTIAL';
export type SyncType = 'fixtures' | 'livescore' | 'lineups' | 'events' | 'odds' | 'ai';

export interface SyncLog {
  id: string;
  source: SyncProvider;
  action: string;
  status: SyncStatus;
  requestSummary: string;
  responseSummary: string;
  errorMessage?: string;
  createdAt: string;
  syncType?: SyncType;
  targetMatchId?: string;
  targetDate?: string;
  startedAt?: string;
  finishedAt?: string;
}

export interface AdminOverride {
  id: string;
  adminUser: string;
  targetType: string;
  targetId: string;
  action: string;
  beforeJson: string;
  afterJson: string;
  reason: string;
  createdAt: string;
}
