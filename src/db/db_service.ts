/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import { execFileSync } from 'child_process';
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
  UserTitleRecord,
  AdminSessionRecord,
  CheckinLogRecord,
  QuizLogRecord,
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
  // 群内动态时间线（V1.2 新增）
  activities?: import('../server/activity_service').Activity[];
  // 称号 / 徽章数据（V1.2 新增）
  userBadges?: import('../server/badge_service').UserBadgeRecord[];
  // 竞猜卡牌库存（V1.3 新增）
  cardInventories?: import('../types').UserCardInventory[];
  userTitles?: UserTitleRecord[];
  adminSessions?: AdminSessionRecord[];
  checkinLog?: CheckinLogRecord[];
  quizLogs?: QuizLogRecord[];
  // 赛后战报（V1.4 新增）
  postMatchReports?: import('../server/services/post_match_report_service').PostMatchReport[];
}

const DATA_DIR = process.env.APP_DATA_DIR
  ? path.resolve(process.cwd(), process.env.APP_DATA_DIR)
  : process.cwd();
const DB_FILE_PATH = path.join(DATA_DIR, 'db.json');
const STORAGE_SCRIPT_PATH = path.join(process.cwd(), 'scripts', 'db-storage.mjs');
const MYSQL_STORAGE_MODE = 'mysql';

class DatabaseService {
  private cache: DatabaseSchema | null = null;
  private _derived = false;
  private _saveTimer: ReturnType<typeof setTimeout> | null = null;
  private _writeLock = false;
  private _lockWaiters: Array<() => void> = [];

  constructor() {
    this.init();
  }

  private init() {
    try {
      this.ensureDataDir();
      if (this.useMySqlStorage()) {
        try {
          const snapshot = this.readMySqlSnapshot();
          if (snapshot && snapshot.teams.length > 0) {
            this.cache = snapshot;
            this.ensureDerivedState();
            return;
          }
          // MySQL tables exist but are empty — seed default data
          console.log('MySQL snapshot is empty, seeding default data...');
        } catch (error) {
          console.warn('Failed to read MySQL snapshot, falling back to local db.json.', error);
        }
      }
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
      activities: [],
      userBadges: [],
      cardInventories: [],
      userTitles: [],
      adminSessions: [],
      checkinLog: [],
      quizLogs: [],
    };

    this.save();
  }

  public getData(): DatabaseSchema {
    if (!this.cache) {
      this.init();
    }
    if (!this._derived) {
      this.ensureDerivedState();
    }
    return this.cache!;
  }

  public getStorageInfo() {
    return {
      mode: this.useMySqlStorage() ? MYSQL_STORAGE_MODE : 'json',
    };
  }

  public getPrimaryRoomId() {
    const rooms = this.getRooms();
    const room = rooms.find((item) => item.isActive) || rooms[0];
    return room?.id || 'room-1';
  }

  public save() {
    try {
      this.persistCurrentState();
    } catch (e) {
      console.error('Failed to write database to disk!', e);
    }
  }

  public saveOrThrow() {
    this.persistCurrentState();
  }

  /**
   * 写锁机制 - 防止并发写入导致数据不一致
   * 适用于钱包扣减等需要原子性的操作
   *
   * 使用 Promise + waiter 队列实现公平锁：
   * - 新请求等待在 waiter 队列中，按 FIFO 顺序获取锁
   * - 避免自旋等待的 CPU 浪费
   * - 超时保护防止死锁
   */
  public async acquireWriteLock(timeout = 5000): Promise<void> {
    if (!this._writeLock) {
      this._writeLock = true;
      return;
    }

    // 锁已被占用，加入等待队列
    return new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        // 超时：从等待队列中移除
        const idx = this._lockWaiters.indexOf(waiter);
        if (idx !== -1) this._lockWaiters.splice(idx, 1);
        reject(new Error('获取写锁超时'));
      }, timeout);

      const waiter = () => {
        clearTimeout(timer);
        if (!this._writeLock) {
          this._writeLock = true;
          resolve();
        } else {
          // 极端情况：锁又被抢了，继续等待
          this._lockWaiters.push(waiter);
        }
      };

      this._lockWaiters.push(waiter);
    });
  }

  public releaseWriteLock() {
    this._writeLock = false;
    // 唤醒下一个等待者
    const waiter = this._lockWaiters.shift();
    if (waiter) waiter();
  }

  /**
   * 在写锁保护下执行操作
   */
  public async withWriteLock<T>(fn: () => Promise<T> | T): Promise<T> {
    await this.acquireWriteLock();
    try {
      return await fn();
    } finally {
      this.releaseWriteLock();
    }
  }

  public createSnapshot(): DatabaseSchema {
    return structuredClone(this.getData());
  }

  public restoreSnapshot(snapshot: DatabaseSchema) {
    this.cache = structuredClone(snapshot);
    this._derived = false;
    this.ensureDerivedState();
  }

  /** 延迟异步写入，合并短时间内的多次写入请求，不阻塞事件循环 */
  public saveAsync() {
    if (this._saveTimer) return; // 已有待写入的定时器，跳过
    this._saveTimer = setTimeout(() => {
      this._saveTimer = null;
      this.ensureDataDir();
      const normalized = this.normalizeForPersistence();
      const data = JSON.stringify(normalized, null, 2);
      fs.promises.writeFile(DB_FILE_PATH, data, 'utf-8').catch((e) => {
        console.error('Failed to write database to disk!', e);
      });
      if (this.useMySqlStorage()) {
        try {
          this.writeMySqlSnapshot(normalized);
        } catch (e) {
          console.error('Failed to persist database to MySQL!', e);
        }
      }
    }, 100);
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

  private ensureDataDir() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  }
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

  private useMySqlStorage() {
    const mode = String(process.env.APP_STORAGE_MODE || '').trim().toLowerCase();
    return mode === MYSQL_STORAGE_MODE || (!!process.env.DATABASE_URL && mode !== 'json');
  }

  private persistCurrentState() {
    this.ensureDataDir();
    const normalized = this.normalizeForPersistence();
    fs.writeFileSync(DB_FILE_PATH, JSON.stringify(normalized, null, 2), 'utf-8');
    if (this.useMySqlStorage()) {
      this.writeMySqlSnapshot(normalized);
    }
  }

  private normalizeForPersistence() {
    const db = this.getData();
    this.normalizeSingleRoomData(db);
    this.normalizePointState(db);
    db.bracketState = buildBracketState(db.matches, db.teams);
    return db;
  }

  private normalizeSingleRoomData(db: DatabaseSchema) {
    if (!Array.isArray(db.rooms) || db.rooms.length === 0) {
      db.rooms = [SEED_ROOMS[0]];
    }

    const primaryRoom = db.rooms.find((item) => item.isActive) || db.rooms[0];
    db.rooms = [primaryRoom];

    for (const user of db.users) {
      user.groupId = primaryRoom.id;
    }
    for (const prediction of db.predictions) {
      prediction.groupId = primaryRoom.id;
    }
    for (const bet of db.tournamentBets) {
      bet.roomId = primaryRoom.id;
    }
    for (const activity of db.activities || []) {
      activity.groupId = primaryRoom.id;
    }
  }

  private roundPoints(value: number | undefined | null) {
    return Number.isFinite(value) ? Math.round(value as number) : 0;
  }

  private normalizePointState(db: DatabaseSchema) {
    db.wallets = db.wallets.map((wallet) => ({
      ...wallet,
      balance: this.roundPoints(wallet.balance),
      initialPoints: this.roundPoints(wallet.initialPoints),
    }));

    db.transactions = db.transactions.map((transaction) => ({
      ...transaction,
      amount: this.roundPoints(transaction.amount),
      balanceBefore: this.roundPoints(transaction.balanceBefore),
      balanceAfter: this.roundPoints(transaction.balanceAfter),
    }));

    db.predictions = db.predictions.map((prediction) => ({
      ...prediction,
      stakePoints: this.roundPoints(prediction.stakePoints),
      potentialReturn: this.roundPoints(prediction.potentialReturn),
      settledReturn:
        typeof prediction.settledReturn === 'number' ? this.roundPoints(prediction.settledReturn) : prediction.settledReturn,
      settledProfit:
        typeof prediction.settledProfit === 'number' ? this.roundPoints(prediction.settledProfit) : prediction.settledProfit,
    }));

    db.tournamentBets = db.tournamentBets.map((bet) => ({
      ...bet,
      stakePoints: this.roundPoints(bet.stakePoints),
      potentialReturn: this.roundPoints(bet.potentialReturn),
      settledReturn: typeof bet.settledReturn === 'number' ? this.roundPoints(bet.settledReturn) : bet.settledReturn,
      settledProfit: typeof bet.settledProfit === 'number' ? this.roundPoints(bet.settledProfit) : bet.settledProfit,
    }));
  }

  private readMySqlSnapshot(): DatabaseSchema | null {
    if (!fs.existsSync(STORAGE_SCRIPT_PATH)) {
      throw new Error(`MySQL storage script not found: ${STORAGE_SCRIPT_PATH}`);
    }
    const raw = execFileSync(process.execPath, [STORAGE_SCRIPT_PATH, 'load'], {
      cwd: process.cwd(),
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const parsed = JSON.parse(raw) as DatabaseSchema;
    return parsed;
  }

  private writeMySqlSnapshot(snapshot: DatabaseSchema) {
    if (!fs.existsSync(STORAGE_SCRIPT_PATH)) {
      throw new Error(`MySQL storage script not found: ${STORAGE_SCRIPT_PATH}`);
    }
    const tempFile = path.join(os.tmpdir(), `worldcup-db-${Date.now()}.json`);
    fs.writeFileSync(tempFile, JSON.stringify(snapshot, null, 2), 'utf-8');
    try {
      execFileSync(process.execPath, [STORAGE_SCRIPT_PATH, 'save', tempFile], {
        cwd: process.cwd(),
        encoding: 'utf-8',
        stdio: ['ignore', 'pipe', 'pipe'],
      });
    } finally {
      if (fs.existsSync(tempFile)) {
        fs.unlinkSync(tempFile);
      }
    }
  }

  private ensureDerivedState() {
    if (!this.cache) return;
    this.normalizeSingleRoomData(this.cache);
    this.normalizePointState(this.cache);
    if (!Array.isArray(this.cache.tournamentBets)) {
      this.cache.tournamentBets = [];
    }
    if (!Array.isArray(this.cache.shareCards)) {
      this.cache.shareCards = [];
    }
    if (!Array.isArray(this.cache.players)) {
      this.cache.players = SQUAD_PLAYERS;
    } else {
      // 合并 SQUAD_PLAYERS 中缺失的球员（确保所有 48 队都有完整阵容）
      const existingIds = new Set(this.cache.players.map(p => p.id));
      const missing = SQUAD_PLAYERS.filter(p => !existingIds.has(p.id));
      if (missing.length > 0) {
        this.cache.players = [...this.cache.players, ...missing];
      }
      // 去重：同一球队中，如果两个球员的 nameZh 是包含关系（如"姆巴佩"和"基利安·姆巴佩"），视为同一人
      // 优先保留有 avatarUrl 或 nameZh 更长的记录
      const deduped: Player[] = [];
      const used = new Set<number>();
      for (let i = 0; i < this.cache.players.length; i++) {
        if (used.has(i)) continue;
        const pi = this.cache.players[i];
        let best = pi;
        let bestIdx = i;
        for (let j = i + 1; j < this.cache.players.length; j++) {
          if (used.has(j)) continue;
          const pj = this.cache.players[j];
          if (pi.teamId !== pj.teamId) continue;
          // 检查 nameZh 是否是包含关系
          if (pi.nameZh.includes(pj.nameZh) || pj.nameZh.includes(pi.nameZh)) {
            // 优先保留 nameZh 更长的（全名），或 avatarUrl 存在的
            const iHasAvatar = !!(best as any).avatarUrl;
            const jHasAvatar = !!(pj as any).avatarUrl;
            if (jHasAvatar && !iHasAvatar) {
              best = pj;
              bestIdx = j;
            } else if (pj.nameZh.length > best.nameZh.length && iHasAvatar === jHasAvatar) {
              best = pj;
              bestIdx = j;
            }
            used.add(j === bestIdx ? i : j);
          }
        }
        deduped.push(best);
        used.add(bestIdx);
      }
      if (deduped.length !== this.cache.players.length) {
        this.cache.players = deduped;
      }
      this.saveAsync();
    }
    if (!Array.isArray(this.cache.teamHistory)) {
      this.cache.teamHistory = SEED_TEAM_HISTORY;
    } else {
      const existingHistoryIds = new Set(this.cache.teamHistory.map((item) => item.id));
      const missingHistory = SEED_TEAM_HISTORY.filter((item) => !existingHistoryIds.has(item.id));
      if (missingHistory.length > 0) {
        this.cache.teamHistory = [...this.cache.teamHistory, ...missingHistory];
      }
    }
    if (!Array.isArray((this.cache as any).activities)) {
      (this.cache as any).activities = [];
    }
    if (!Array.isArray((this.cache as any).userBadges)) {
      (this.cache as any).userBadges = [];
    }
    if (!Array.isArray((this.cache as any).cardInventories)) {
      (this.cache as any).cardInventories = [];
    }
    if (!Array.isArray((this.cache as any).userTitles)) {
      (this.cache as any).userTitles = [];
    }
    if (!Array.isArray((this.cache as any).adminSessions)) {
      (this.cache as any).adminSessions = [];
    }
    if (!Array.isArray((this.cache as any).checkinLog)) {
      (this.cache as any).checkinLog = [];
    }
    if (!Array.isArray((this.cache as any).quizLogs)) {
      (this.cache as any).quizLogs = [];
    }
    // 合并球队扩展字段（fifaRank、coachName等），并补齐缺失球队
    if (Array.isArray(this.cache.teams)) {
      const seedTeamMap = new Map(THE_TEAMS.map(t => [t.id, t]));
      const existingTeamIds = new Set(this.cache.teams.map((team) => team.id));
      const missingTeams = THE_TEAMS.filter((team) => !existingTeamIds.has(team.id));
      const mergedTeams = [...this.cache.teams, ...missingTeams];

      this.cache.teams = mergedTeams.map(team => {
        const seed = seedTeamMap.get(team.id);
        const meta = TEAM_META[team.id];
        return {
          ...team,
          ...(seed && !team.fifaRank && seed.fifaRank ? seed : {}),
          ...(meta ? {
            fifaRank: team.fifaRank || meta.fifaRank || undefined,
            coachName: team.coachName || meta.coachName || undefined,
            coachNationality: team.coachNationality || meta.coachNationality || undefined,
            worldCupAppearances: team.worldCupAppearances || meta.worldCupAppearances || undefined,
            confederation: team.confederation || meta.confederation || undefined,
            marketValueMillion: team.marketValueMillion || meta.marketValueMillion || undefined,
          } : {}),
        };
      });
    }
    if (Array.isArray(this.cache.matches)) {
      const existingMatchIds = new Set(this.cache.matches.map((match) => match.id));
      const hasComparableMatch = (candidate: Match) =>
        this.cache!.matches.some((match) => {
          if (existingMatchIds.has(candidate.id) && match.id === candidate.id) {
            return true;
          }

          return (
            match.homeTeamId === candidate.homeTeamId &&
            match.awayTeamId === candidate.awayTeamId &&
            match.startTimeUtc.slice(0, 16) === candidate.startTimeUtc.slice(0, 16)
          );
        });

      const missingMatches = SEED_MATCHES.filter((match) => !hasComparableMatch(match));
      if (missingMatches.length > 0) {
        this.cache.matches = [...this.cache.matches, ...missingMatches];
      }
    }
    if (!this.cache.bracketState || !Array.isArray(this.cache.bracketState.rounds)) {
      this.cache.bracketState = buildBracketState(this.cache.matches || [], this.cache.teams || []);
    }
    this._derived = true;
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
