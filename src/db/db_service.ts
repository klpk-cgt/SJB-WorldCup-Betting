/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import path from 'path';
import {
  AdminOverride,
  AIContent,
  GroupRoom,
  Match,
  MatchOdds,
  Prediction,
  ShareCardRecord,
  SyncLog,
  Team,
  Transaction,
  User,
  Wallet,
} from '../types';
import { PRESEEDED_USERS, SEED_MATCHES, SEED_ODDS, SEED_ROOMS, THE_TEAMS } from './initial_data';

export interface DatabaseSchema {
  rooms: GroupRoom[];
  users: User[];
  wallets: Wallet[];
  transactions: Transaction[];
  teams: Team[];
  matches: Match[];
  matchOdds: Record<string, MatchOdds>;
  predictions: Prediction[];
  aiContents: AIContent[];
  shareCards: ShareCardRecord[];
  syncLogs: SyncLog[];
  adminOverrides: AdminOverride[];
}

const DB_FILE_PATH = path.join(process.cwd(), 'db.json');
const DB_TMP_PATH = `${DB_FILE_PATH}.tmp`;
const DB_BACKUP_PATH = path.join(process.cwd(), 'db.corrupt.backup.json');

class DatabaseService {
  private cache: DatabaseSchema | null = null;

  constructor() {
    this.init();
  }

  private init() {
    try {
      if (fs.existsSync(DB_FILE_PATH)) {
        const fileContent = fs.readFileSync(DB_FILE_PATH, 'utf-8');
        this.cache = this.hydrateSchema(JSON.parse(fileContent));
      } else {
        this.resetToDefaults();
      }
    } catch (error) {
      console.error('Failed to parse db.json, resetting to default seed data...', error);
      this.backupBrokenDatabase();
      this.resetToDefaults();
    }
  }

  private backupBrokenDatabase() {
    try {
      if (fs.existsSync(DB_FILE_PATH)) {
        fs.copyFileSync(DB_FILE_PATH, DB_BACKUP_PATH);
      }
    } catch (backupError) {
      console.error('Failed to backup broken database file.', backupError);
    }
  }

  private createSeedSchema(): DatabaseSchema {
    const users: User[] = [];
    const wallets: Wallet[] = [];
    const transactions: Transaction[] = [];

    for (const seededUser of PRESEEDED_USERS) {
      users.push({
        id: seededUser.id,
        groupId: seededUser.groupId,
        displayName: seededUser.displayName,
        avatarUrl: seededUser.avatarUrl,
        loginCode: seededUser.loginCode,
        pinHash: seededUser.pinHash,
        status: 'CLAIMED',
        claimedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      });

      wallets.push({
        userId: seededUser.id,
        balance: seededUser.balance,
        initialPoints: 10000,
      });

      transactions.push({
        id: `t-init-${seededUser.id}`,
        userId: seededUser.id,
        type: 'INITIAL_GRANT',
        amount: 10000,
        balanceBefore: 0,
        balanceAfter: 10000,
        note: 'System initial entertainment points grant',
        createdAt: new Date().toISOString(),
      });
    }

    return {
      rooms: SEED_ROOMS,
      users,
      wallets,
      transactions,
      teams: THE_TEAMS,
      matches: SEED_MATCHES,
      matchOdds: SEED_ODDS,
      predictions: [],
      aiContents: [],
      shareCards: [],
      syncLogs: [],
      adminOverrides: [],
    };
  }

  private hydrateSchema(raw: Partial<DatabaseSchema> | null | undefined): DatabaseSchema {
    const seed = this.createSeedSchema();
    return {
      rooms: Array.isArray(raw?.rooms) ? raw.rooms : seed.rooms,
      users: Array.isArray(raw?.users) ? raw.users : seed.users,
      wallets: Array.isArray(raw?.wallets) ? raw.wallets : seed.wallets,
      transactions: Array.isArray(raw?.transactions) ? raw.transactions : seed.transactions,
      teams: Array.isArray(raw?.teams) ? raw.teams : seed.teams,
      matches: Array.isArray(raw?.matches) ? raw.matches : seed.matches,
      matchOdds: raw?.matchOdds && typeof raw.matchOdds === 'object' ? raw.matchOdds : seed.matchOdds,
      predictions: Array.isArray(raw?.predictions) ? raw.predictions : seed.predictions,
      aiContents: Array.isArray(raw?.aiContents) ? raw.aiContents : seed.aiContents,
      shareCards: Array.isArray(raw?.shareCards) ? raw.shareCards : seed.shareCards,
      syncLogs: Array.isArray(raw?.syncLogs) ? raw.syncLogs : seed.syncLogs,
      adminOverrides: Array.isArray(raw?.adminOverrides) ? raw.adminOverrides : seed.adminOverrides,
    };
  }

  public resetToDefaults() {
    console.log('Seeding initial schema database...');
    this.cache = this.createSeedSchema();
    this.save();
  }

  public getData(): DatabaseSchema {
    if (!this.cache) {
      this.init();
    }
    return this.cache!;
  }

  public save() {
    try {
      const payload = JSON.stringify(this.cache, null, 2);
      fs.writeFileSync(DB_TMP_PATH, payload, 'utf-8');
      fs.renameSync(DB_TMP_PATH, DB_FILE_PATH);
    } catch (error) {
      console.error('Failed to write database to disk!', error);
    }
  }

  public getRooms(): GroupRoom[] { return this.getData().rooms; }
  public getUsers(): User[] { return this.getData().users; }
  public getWallets(): Wallet[] { return this.getData().wallets; }
  public getTransactions(): Transaction[] { return this.getData().transactions; }
  public getTeams(): Team[] { return this.getData().teams; }
  public getMatches(): Match[] { return this.getData().matches; }
  public getMatchOdds(): Record<string, MatchOdds> { return this.getData().matchOdds; }
  public getPredictions(): Prediction[] { return this.getData().predictions; }
  public getAIContents(): AIContent[] { return this.getData().aiContents; }
  public getShareCards(): ShareCardRecord[] { return this.getData().shareCards; }
  public getSyncLogs(): SyncLog[] { return this.getData().syncLogs; }
  public getAdminOverrides(): AdminOverride[] { return this.getData().adminOverrides; }
}

export const dbService = new DatabaseService();
