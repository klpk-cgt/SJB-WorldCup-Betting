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
  // 扩展字段（球队资料）
  fifaRank?: number;
  confederation?: string;
  coachName?: string;
  coachNationality?: string;
  formation?: string;
  worldCupAppearances?: number;
  bestResult?: string;
  bestResultYear?: number;
  qualificationStatus?: string;
  qualificationMethod?: string;
  qualificationGroup?: string;
  qualificationRecord?: string;
  qualificationKeyPlayers?: string;
  profileSummary?: string;
  heroPlayerNames?: string[];
  primaryColor?: string;
  secondaryColor?: string;
  marketValueMillion?: number;
}

export interface Player {
  id: string;
  teamId: string;
  name: string;
  nameZh?: string;
  shirtNumber?: number;
  position: 'GK' | 'DEF' | 'MID' | 'FWD';
  club?: string;
  age?: number;
  heightCm?: number;
  weightKg?: number;
  preferredFoot?: '左' | '右' | '双脚';
  marketValue?: number;
  avatarUrl?: string;
  isCaptain?: boolean;
  bioSummary?: string;
}

export interface TeamHistoryResult {
  id: string;
  teamId: string;
  year: number;
  host: string;
  result: string;
  matchesPlayed: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  note?: string;
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
  espnEventId?: string;
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
  scoreUnknown?: boolean;
}

export interface MatchOdds {
  matchId: string;
  h2h: {
    homeWin: number;
    draw: number;
    awayWin: number;
  };
  handicap?: {
    goalLine: number;   // 让球数，正数=主队让球，负数=客队让球
    homeWin: number;
    draw: number;
    awayWin: number;
  };
  correctScore: Array<{
    score: string;
    odds: number;
  }>;
  totalGoals: Array<{
    goals: string;      // "0"~"7+" 精确进球标签
    odds: number;
  }>;
  /** @deprecated 保留向前兼容，新数据用 totalGoals 数组 */
  totalGoalsLegacy?: {
    over25: number;
    under25: number;
  };
  halfFullTime?: {
    hh: number; hd: number; ha: number;   // 胜胜/胜平/胜负
    dh: number; dd: number; da: number;   // 平胜/平平/平负
    ah: number; ad: number; aa: number;   // 负胜/负平/负负
  };
  qualify?: {
    homeQualify: number;
    awayQualify: number;
  };
  lastUpdated: string;
  source?: 'The Odds API' | 'MANUAL' | 'Sporttery';
  syncStatus?: 'SYNCED' | 'PARTIAL' | 'MANUAL_FALLBACK' | 'FAILED' | 'UNSYNCED';
  lastSyncedAt?: string;
  correctScoreSource?: 'MANUAL' | 'INFERRED_FROM_H2H' | 'THIRD_PARTY' | 'SPORTTERY';
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

export type PlayerTitle =
  | '群聊新星'
  | '稳健分析师'
  | '连红猎手'
  | '冷门先知'
  | '金杯投资人'
  | '世界杯老炮'
  | '传奇球王'
  | '全胜将军'
  | '比分之王'
  | '新晋黑马'
  | '知识达人'
  | '明灯本灯'
  | '慈善赌王'
  | '破产兄弟';

export type AchievementBadgeId = string;
export type AchievementBadgeCategory =
  | 'newbie'
  | 'streak'
  | 'funny'
  | 'profit'
  | 'precision'
  | 'playstyle'
  | 'tournament'
  | 'activity'
  | 'knowledge'
  | 'history';
export type AchievementBadgeRarity = 'common' | 'rare' | 'epic' | 'legendary';
export type AchievementBadgePolarity = 'positive' | 'funny' | 'negative';

export interface AchievementBadgeSummary {
  id: AchievementBadgeId;
  label: string;
  description: string;
  icon: string;
  tone: 'emerald' | 'amber' | 'violet' | 'cyan' | 'rose' | 'slate';
  category?: AchievementBadgeCategory;
  rarity?: AchievementBadgeRarity;
  polarity?: AchievementBadgePolarity;
  sortOrder?: number;
  unlocked: boolean;
  current: number;
  progress?: number;
  target: number;
  unlockedAt?: string;
}

export interface UserProfileSummary {
  currentTitle: PlayerTitle;
  featuredBadge: AchievementBadgeSummary | null;
  achievementBadges: AchievementBadgeSummary[];
  achievementProgress: AchievementBadgeSummary[];
  badges?: AchievementBadgeSummary[];
  rareUnlockedCount?: number;
  totalBadgeCount?: number;
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
  | 'REFUND'
  | 'CARD_EFFECT'
  | 'CARD_REFUND';

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

export type PredictionMarket = 'H2H' | 'CORRECT_SCORE' | 'TOTAL_GOALS' | 'QUALIFY' | 'HANDICAP' | 'HAFU' | 'TOTAL_GOALS_PRECISE';

export type PredictionStatus = 'PENDING' | 'LOCKED' | 'WON' | 'LOST' | 'VOID' | 'CANCELLED';

export interface OddsSnapshotRecord {
  market: PredictionMarket;
  optionKey: string;
  optionLabel: string;
  oddsDecimal: number;
  capturedAt: string;
  source: 'The Odds API' | 'MANUAL' | 'LOCAL' | 'Sporttery';
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
  // 使用的竞猜卡（V1.3）
  usedCard?: PredictionCardId;
  cardEffectNotes?: string;
}

export type PredictionCardId = 'NO_LOSS' | 'DOUBLE' | 'REGRET' | 'FLOOR';

export interface PredictionCardDefinition {
  id: PredictionCardId;
  label: string;
  description: string;
  icon: string;
  tone: 'emerald' | 'rose' | 'amber' | 'violet' | 'cyan' | 'slate';
  rule: string;
}

export interface UserCardInventory {
  userId: string;
  cards: Partial<Record<PredictionCardId, number>>;
  updatedAt: string;
}

export interface UserTitleRecord {
  userId: string;
  title: PlayerTitle;
  updatedAt: string;
}

export interface AdminSessionRecord {
  token: string;
  expiresAt: number;
}

export interface CheckinLogRecord {
  id: string;
  userId: string;
  date: string;
  createdAt: string;
}

export interface QuizLogRecord {
  id: string;
  userId: string;
  date: string;
  questionIds: string[];
  selectedIndex?: number;
  correctCount: number;
  pointsEarned: number;
  createdAt: string;
}

export type TournamentBetType = 'champion' | 'golden_boot' | 'golden_ball';
export type TournamentBetStatus = 'OPEN' | 'LOCKED' | 'WON' | 'LOST' | 'VOID';

export interface TournamentBetOption {
  id: string;
  label: string;
  subLabel?: string;
  targetType: 'team' | 'player';
  oddsDecimal: number;
  marketType: TournamentBetType;
  flagCode?: string;
  avatarUrl?: string;
}

export interface TournamentBet {
  id: string;
  userId: string;
  roomId: string;
  type: TournamentBetType;
  targetId: string;
  targetLabel: string;
  targetSubLabel?: string;
  stakePoints: number;
  oddsDecimal: number;
  potentialReturn: number;
  status: TournamentBetStatus;
  openedAt: string;
  lockedAt?: string;
  placedAt: string;
  settledAt?: string;
  settledReturn?: number;
  settledProfit?: number;
}

export type BracketRoundKey =
  | 'ROUND_OF_32'
  | 'ROUND_OF_16'
  | 'QUARTER_FINAL'
  | 'SEMI_FINAL'
  | 'THIRD_PLACE'
  | 'FINAL';

export interface BracketMatchNode {
  id: string;
  round: BracketRoundKey;
  title: string;
  slotLabel?: string;
  matchId?: string;
  homeTeamId?: string;
  awayTeamId?: string;
  homeTeamName?: string;
  awayTeamName?: string;
  homeTeamCode?: string;
  awayTeamCode?: string;
  homeScore?: number;
  awayScore?: number;
  winnerTeamId?: string;
  startTimeUtc?: string;
  status?: MatchStatus;
  nextMatchId?: string;
}

export interface BracketRound {
  key: BracketRoundKey;
  label: string;
  matches: BracketMatchNode[];
}

export interface BracketState {
  generatedAt: string;
  rounds: BracketRound[];
}

export type AIContentType =
  | 'DAILY_RECOMMENDATION'
  | 'MATCH_PREDICTION'
  | 'PRE_MATCH_ANALYSIS'
  | 'POST_MATCH_RECAP'
  | 'LEADERBOARD_COMMENTARY'
  | 'SEARCH_ENHANCEMENT'
  | 'BET_SHARE_COPY';

export type AIProvider = 'DeepSeek' | 'Mimo' | 'Gemini' | 'Local';
export type AIContentScopeType = 'match' | 'room' | 'global';
export type AIEnhancementMode = 'off' | 'search' | 'multimodal' | 'search_multimodal';
export type AIContentStatus = 'ready' | 'stale' | 'error';
export type AIConfidenceBand = 'low' | 'medium' | 'high';

export interface AIPredictionResult {
  winner_pick: 'home' | 'draw' | 'away';
  score_pick: string;
  confidence_band: AIConfidenceBand;
  summary: string;
  bullets: string[];
  risk_warning: string;
}

export interface AIPreMatchAnalysisResult {
  summary: string;
  prediction: Pick<AIPredictionResult, 'winner_pick' | 'score_pick'>;
  bullets: string[];
  risk_warning: string;
  search_enhanced: boolean;
  multimodal_enhanced: boolean;
}

export interface AILeaderboardCommentaryResult {
  headline: string;
  summary: string;
  highlights: string[];
  fun_tags: string[];
  risk_warning?: string;
}

export interface AIContent {
  id: string;
  type: AIContentType;
  matchId?: string;
  predictionId?: string;
  title: string;
  content: string;
  model: string;
  createdAt: string;
  provider?: AIProvider;
  summary?: string;
  bullets?: string[];
  riskWarning?: string;
  fallbackUsed?: boolean;
  contentType?: AIContentType;
  scopeType?: AIContentScopeType;
  scopeId?: string;
  promptVersion?: string;
  dataVersion?: string;
  enhancementMode?: AIEnhancementMode;
  predictionJson?: AIPredictionResult;
  outputJson?: AIPredictionResult | AIPreMatchAnalysisResult | AILeaderboardCommentaryResult | Record<string, unknown>;
  inputSnapshotJson?: Record<string, unknown>;
  searchEnhanced?: boolean;
  multimodalEnhanced?: boolean;
  status?: AIContentStatus;
  expiresAt?: string;
  cacheKey?: string;
  headline?: string;
  highlights?: string[];
  funTags?: string[];
  roomId?: string;
}

export interface ShareCardRecord {
  id: string;
  userId: string;
  predictionId: string;
  matchId: string;
  mode: 'image' | 'text';
  text: string;
  imageDataUrl?: string;
  provider: AIProvider;
  model: string;
  fallbackUsed: boolean;
  createdAt: string;
  debugMeta?: Record<string, string | number | boolean | null>;
}

export type SyncProvider = 'The Odds API' | 'DeepSeek' | 'Mimo' | 'Gemini' | 'Local' | 'Sporttery' | 'ESPN';
export type SyncStatus = 'SUCCESS' | 'FAILED' | 'PARTIAL';
export type SyncType = 'fixtures' | 'livescore' | 'lineups' | 'events' | 'odds' | 'ai' | 'standings' | 'schedule';

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

// ─── 竞彩网积分榜数据 ───

export interface StandingTeamRow {
  teamId: string;       // 本地 team.id
  teamName: string;     // 中文队名
  teamCode: string;     // 队伍代码 (GER, BRA...)
  rank: number;         // 小组排名
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;           // 进球
  ga: number;           // 失球
  gd: number;           // 净胜球
  points: number;
}

export interface WorldCupStandings {
  /** 按小组 key (A-L) 分组的排名数据 */
  groups: Record<string, StandingTeamRow[]>;
  /** 数据来源 */
  source: 'ESPN' | 'Sporttery' | 'COMPUTED';
  /** 最后更新时间 */
  lastUpdated: string;
}
