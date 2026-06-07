/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import path from 'path';
import {
  GroupRoom,
  User,
  Wallet,
  Transaction,
  Team,
  ShareCardRecord,
  Match,
  MatchOdds,
  Prediction,
  AIContent,
  SyncLog,
  AdminOverride,
  BracketState,
  BracketRound,
  TournamentBet,
  Player,
  TeamHistoryResult,
} from '../types';
import { SEED_ROOMS, THE_TEAMS, PRESEEDED_USERS, SEED_MATCHES, SEED_ODDS } from './initial_data';
import { SEED_PLAYERS, SEED_TEAM_HISTORY } from './team_details_seed';
import { SQUAD_PLAYERS, TEAM_META } from '../data/squads';

export interface DatabaseSchema {
  rooms: GroupRoom[];
  users: User[];
  wallets: Wallet[];
  transactions: Transaction[];
  teams: Team[];
  matches: Match[];
  matchOdds: Record<string, MatchOdds>;
  predictions: Prediction[];
  tournamentBets: TournamentBet[];
  aiContents: AIContent[];
  shareCards: ShareCardRecord[];
  bracketState: BracketState;
  syncLogs: SyncLog[];
  adminOverrides: AdminOverride[];
  players: Player[];
  teamHistory: TeamHistoryResult[];
}

const DB_FILE_PATH = path.join(process.cwd(), 'db.json');

class DatabaseService {
  private cache: DatabaseSchema | null = null;

  constructor() {
    this.init();
  }

  private init() {
    try {
      if (fs.existsSync(DB_FILE_PATH)) {
        const fileContent = fs.readFileSync(DB_FILE_PATH, 'utf-8');
        this.cache = JSON.parse(fileContent);
        this.ensureDerivedState();
      } else {
        this.resetToDefaults();
      }
    } catch (e) {
      console.error('Failed to parse db.json, resetting to default seed data...', e);
      this.resetToDefaults();
    }
  }

  public resetToDefaults() {
    console.log('Seeding initial schema database...');
    const users: User[] = [];
    const wallets: Wallet[] = [];
    const transactions: Transaction[] = [];
    const predictions: Prediction[] = [];
    const tournamentBets: TournamentBet[] = [];
    const shareCards: ShareCardRecord[] = [];

    // Seed users, wallets and active logs
    for (const u of PRESEEDED_USERS) {
      users.push({
        id: u.id,
        groupId: u.groupId,
        displayName: u.displayName,
        avatarUrl: u.avatarUrl,
        loginCode: u.loginCode,
        pinHash: u.pinHash, // store simple text for demo and ease of token verification
        status: 'CLAIMED',
        claimedAt: new Date().toISOString(),
        createdAt: new Date().toISOString()
      });

      wallets.push({
        userId: u.id,
        balance: u.balance,
        initialPoints: 10000
      });

      transactions.push({
        id: `t-init-${u.id}`,
        userId: u.id,
        type: 'INITIAL_GRANT',
        amount: 10000,
        balanceBefore: 0,
        balanceAfter: 10000,
        note: '系统初始娱乐积分赠送',
        createdAt: new Date(Date.now() - 36000000).toISOString()
      });

      if (u.balance > 10000) {
        transactions.push({
          id: `t-adjust-${u.id}`,
          userId: u.id,
          type: 'ADMIN_ADJUST',
          amount: u.balance - 10000,
          balanceBefore: 10000,
          balanceAfter: u.balance,
          note: '首场赛事竞猜赢取/管理员福利赠送',
          createdAt: new Date(Date.now() - 18000000).toISOString()
        });
      } else if (u.balance < 10000) {
        transactions.push({
          id: `t-adjust-${u.id}`,
          userId: u.id,
          type: 'ADMIN_ADJUST',
          amount: u.balance - 10000,
          balanceBefore: 10000,
          balanceAfter: u.balance,
          note: '首场赛事竞猜未中扣除',
          createdAt: new Date(Date.now() - 18000000).toISOString()
        });
      }
    }

    // Seed standard historical predictions for USA vs MEX (m-1) won 2-1
    // Player 1: (小李) Predicted Mexico win - LOST
    predictions.push({
      id: 'pred-1',
      userId: 'u1',
      groupId: 'room-1',
      matchId: 'm-1',
      market: 'H2H',
      optionKey: 'away',
      optionLabel: '墨西哥 胜',
      stakePoints: 2000,
      oddsDecimal: 3.40,
      potentialReturn: 6800,
      status: 'LOST',
      settledReturn: 0,
      settledProfit: -2000,
      placedAt: new Date(Date.now() - 48 * 3600000).toISOString(),
      settledAt: new Date(Date.now() - 22 * 3600000).toISOString()
    });

    // Player 2: (豪哥) Predicted USA win - WON
    predictions.push({
      id: 'pred-2',
      userId: 'u2',
      groupId: 'room-1',
      matchId: 'm-1',
      market: 'H2H',
      optionKey: 'home',
      optionLabel: '美国 胜',
      stakePoints: 4000,
      oddsDecimal: 2.125,
      potentialReturn: 8500,
      status: 'WON',
      settledReturn: 8500,
      settledProfit: 4500,
      placedAt: new Date(Date.now() - 48 * 3600000).toISOString(),
      settledAt: new Date(Date.now() - 22 * 3600000).toISOString()
    });

    // Player 3: (阿强) Correct score 2-1 - LOST (let's say he predicted 2-0 and lost 1500)
    predictions.push({
      id: 'pred-3',
      userId: 'u3',
      groupId: 'room-1',
      matchId: 'm-1',
      market: 'CORRECT_SCORE',
      optionKey: 'correctScore_2_0',
      optionLabel: '波胆 2-0',
      stakePoints: 1500,
      oddsDecimal: 9.00,
      potentialReturn: 13500,
      status: 'LOST',
      settledReturn: 0,
      settledProfit: -1500,
      placedAt: new Date(Date.now() - 40 * 3600000).toISOString(),
      settledAt: new Date(Date.now() - 22 * 3600000).toISOString()
    });

    const aiContents: AIContent[] = [
      {
        id: 'ai-1',
        type: 'DAILY_RECOMMENDATION',
        title: 'AI 世界杯黄金看点推荐 - 法德经典恩怨对决',
        content: `亲爱的球迷朋友们，今日焦点战局，高卢雄鸡法国对阵铁血战车德国。法国队在德尚指导下阵容磨合度高，姆巴佩和登贝莱两翼齐飞速度致命；德国由纳格尔斯曼变阵青年近卫军，维尔茨和穆西亚拉双子星中场创造力十足，这场对攻大战极其引人注目。

**AI 娱乐预测风向：**
- 🌟 **核心观点**：法国战局偏主动，法国进攻火力更猛。德国能否扼杀左路内切将是比赛胜负手。
- 🔮 **娱乐指数**：预计 90 分钟内胜负一球之间，建议关注大球！
- ⚠️ **冷门预警**：托尼·克罗斯谢幕后德国更倚重双子星，若中场组织受限于坎特、琼阿梅尼，德国恐遭零封。`,
        model: 'gemini-3.5-flash',
        createdAt: new Date().toISOString()
      },
      {
        id: 'ai-2',
        type: 'PRE_MATCH_ANALYSIS',
        matchId: 'm-2',
        title: 'AI 赛前极秘速递: 法国 vs 德国',
        content: `这是一场典型的火星撞地球。双方在2026世界杯小组赛交手，都旨在拿到出线绝对主动权。
- **法国阵眼**：姆巴佩与特奥的左侧走廊堪称核武器，德国后防核心吕迪格将要面临重重考验。
- **德国战术**：哈弗茨突前作为桥头堡，利用穆西亚拉和维尔茨在中场衔接。
- 建议关注 90 分钟胜负平竞猜，法国独赢指数为 1.85，非常具有性价比。预计比分：2-1 或 2-2。`,
        model: 'gemini-3.5-flash',
        createdAt: new Date().toISOString()
      }
    ];

    const syncLogs: SyncLog[] = [
      {
        id: 'log-1',
        source: 'API-Football',
        action: 'Fetch WC 2026 Fixtures',
        status: 'SUCCESS',
        requestSummary: 'GET /fixtures?league=1&season=2026',
        responseSummary: '成功拉取 104 场 2026 世界杯赛程，本地同步写入 5 场焦点赛事缓存。',
        createdAt: new Date(Date.now() - 3600000).toISOString()
      },
      {
        id: 'log-2',
        source: 'The Odds API',
        action: 'Sync Live Odds Snaphots',
        status: 'SUCCESS',
        requestSummary: 'GET /sports/soccer_fifa_world_cup/odds',
        responseSummary: '同步 5 场赛事的胜平负和比分、总筹码指数。',
        createdAt: new Date(Date.now() - 1800000).toISOString()
      }
    ];

    this.cache = {
      rooms: SEED_ROOMS,
      users,
      wallets,
      transactions,
      teams: THE_TEAMS,
      matches: SEED_MATCHES,
      matchOdds: SEED_ODDS,
      predictions,
      tournamentBets,
      aiContents,
      shareCards,
      bracketState: buildBracketState(SEED_MATCHES, THE_TEAMS),
      syncLogs,
      adminOverrides: [],
      players: SQUAD_PLAYERS,
      teamHistory: SEED_TEAM_HISTORY,
    };

    this.save();
  }

  public getData(): DatabaseSchema {
    if (!this.cache) {
      this.init();
    }
    this.ensureDerivedState();
    return this.cache!;
  }

  public save() {
    try {
      fs.writeFileSync(DB_FILE_PATH, JSON.stringify(this.cache, null, 2), 'utf-8');
    } catch (e) {
      console.error('Failed to write database to disk!', e);
    }
  }

  // Update wrapper helpers
  public getRooms(): GroupRoom[] { return this.getData().rooms; }
  public getUsers(): User[] { return this.getData().users; }
  public getWallets(): Wallet[] { return this.getData().wallets; }
  public getTransactions(): Transaction[] { return this.getData().transactions; }
  public getTeams(): Team[] { return this.getData().teams; }
  public getMatches(): Match[] { return this.getData().matches; }
  public getMatchOdds(): Record<string, MatchOdds> { return this.getData().matchOdds; }
  public getPredictions(): Prediction[] { return this.getData().predictions; }
  public getTournamentBets(): TournamentBet[] { return this.getData().tournamentBets; }
  public getAIContents(): AIContent[] { return this.getData().aiContents; }
  public getShareCards(): ShareCardRecord[] { return this.getData().shareCards; }
  public getBracketState(): BracketState { return this.getData().bracketState; }
  public getSyncLogs(): SyncLog[] { return this.getData().syncLogs; }
  public getAdminOverrides(): AdminOverride[] { return this.getData().adminOverrides; }
  public getPlayers(): Player[] { return this.getData().players; }
  public getTeamHistory(): TeamHistoryResult[] { return this.getData().teamHistory; }
  public getPlayersByTeamId(teamId: string): Player[] { return this.getPlayers().filter(p => p.teamId === teamId); }
  public getTeamHistoryByTeamId(teamId: string): TeamHistoryResult[] { return this.getTeamHistory().filter(h => h.teamId === teamId).sort((a, b) => b.year - a.year); }
  public refreshBracketState() {
    const db = this.getData();
    db.bracketState = buildBracketState(db.matches, db.teams);
    return db.bracketState;
  }

  private ensureDerivedState() {
    if (!this.cache) return;
    if (!Array.isArray(this.cache.tournamentBets)) {
      this.cache.tournamentBets = [];
    }
    if (!Array.isArray(this.cache.shareCards)) {
      this.cache.shareCards = [];
    }
    if (!Array.isArray(this.cache.players)) {
      this.cache.players = SQUAD_PLAYERS;
    }
    if (!Array.isArray(this.cache.teamHistory)) {
      this.cache.teamHistory = SEED_TEAM_HISTORY;
    }
    // 合并球队扩展字段（fifaRank、coachName等）
    if (Array.isArray(this.cache.teams)) {
      const seedTeamMap = new Map(THE_TEAMS.map(t => [t.id, t]));
      this.cache.teams = this.cache.teams.map(team => {
        const seed = seedTeamMap.get(team.id);
        const meta = TEAM_META[team.id];
        return {
          ...team,
          ...(seed && !team.fifaRank && seed.fifaRank ? seed : {}),
          ...(meta ? {
            fifaRank: team.fifaRank || meta.fifaRank || undefined,
            coachName: team.coachName || meta.coachName || undefined,
            worldCupAppearances: team.worldCupAppearances || meta.worldCupAppearances || undefined,
            confederation: team.confederation || meta.confederation || undefined,
          } : {}),
        };
      });
    }
    if (!this.cache.bracketState || !Array.isArray(this.cache.bracketState.rounds)) {
      this.cache.bracketState = buildBracketState(this.cache.matches || [], this.cache.teams || []);
    }
  }
}

export const dbService = new DatabaseService();

function buildBracketState(matches: Match[], teams: Team[]): BracketState {
  const knockoutMatches = matches.filter((match) => match.stage !== 'Group Stage');
  const teamMap = new Map(teams.map((team) => [team.id, team]));

  const rounds: BracketRound[] = [
    { key: 'ROUND_OF_32', label: '32 强', matches: [] },
    { key: 'ROUND_OF_16', label: '16 强', matches: [] },
    { key: 'QUARTER_FINAL', label: '8 强', matches: [] },
    { key: 'SEMI_FINAL', label: '半决赛', matches: [] },
    { key: 'THIRD_PLACE', label: '季军赛', matches: [] },
    { key: 'FINAL', label: '决赛', matches: [] },
  ];

  const roundMap = new Map(rounds.map((round) => [round.key, round]));
  for (const match of knockoutMatches) {
    const roundKey = mapStageToBracketRound(match.stage);
    if (!roundKey) continue;
    const home = teamMap.get(match.homeTeamId);
    const away = teamMap.get(match.awayTeamId);
    roundMap.get(roundKey)?.matches.push({
      id: `bracket-${match.id}`,
      round: roundKey,
      title: match.roundName,
      matchId: match.id,
      homeTeamId: match.homeTeamId,
      awayTeamId: match.awayTeamId,
      homeTeamName: home?.nameZh,
      awayTeamName: away?.nameZh,
      homeTeamCode: home?.code,
      awayTeamCode: away?.code,
      homeScore: match.homeScore,
      awayScore: match.awayScore,
      winnerTeamId: match.winnerTeamId,
      startTimeUtc: match.startTimeUtc,
      status: match.status,
    });
  }

  if (roundMap.get('ROUND_OF_32')?.matches.length === 0) {
    roundMap.get('ROUND_OF_32')!.matches = buildPlaceholderRound('ROUND_OF_32', '32 强', 16);
  }
  if (roundMap.get('ROUND_OF_16')?.matches.length === 0) {
    roundMap.get('ROUND_OF_16')!.matches = buildPlaceholderRound('ROUND_OF_16', '16 强', 8);
  }
  if (roundMap.get('QUARTER_FINAL')?.matches.length === 0) {
    roundMap.get('QUARTER_FINAL')!.matches = buildPlaceholderRound('QUARTER_FINAL', '8 强', 4);
  }
  if (roundMap.get('SEMI_FINAL')?.matches.length === 0) {
    roundMap.get('SEMI_FINAL')!.matches = buildPlaceholderRound('SEMI_FINAL', '半决赛', 2);
  }
  if (roundMap.get('THIRD_PLACE')?.matches.length === 0) {
    roundMap.get('THIRD_PLACE')!.matches = buildPlaceholderRound('THIRD_PLACE', '季军赛', 1);
  }
  if (roundMap.get('FINAL')?.matches.length === 0) {
    roundMap.get('FINAL')!.matches = buildPlaceholderRound('FINAL', '决赛', 1);
  }

  return {
    generatedAt: new Date().toISOString(),
    rounds,
  };
}

function buildPlaceholderRound(round: BracketRound['key'], label: string, count: number) {
  return Array.from({ length: count }, (_, index) => ({
    id: `placeholder-${round}-${index + 1}`,
    round,
    title: `${label} 对阵 ${index + 1}`,
    slotLabel: `待定席位 ${index + 1}`,
  }));
}

function mapStageToBracketRound(stage: Match['stage']): BracketRound['key'] | null {
  if (stage === 'Round of 32') return 'ROUND_OF_32';
  if (stage === 'Round of 16') return 'ROUND_OF_16';
  if (stage === 'Quarter-finals') return 'QUARTER_FINAL';
  if (stage === 'Semi-finals') return 'SEMI_FINAL';
  if (stage === 'Third-place play-off') return 'THIRD_PLACE';
  if (stage === 'Final') return 'FINAL';
  return null;
}
