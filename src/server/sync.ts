import { DatabaseSchema } from '../db/db_service';
import { Team } from '../types';
import { generateDefaultOdds } from '../utils/odds';

// ── 默认赔率生成（委托给 utils/odds.ts 统一版本） ──
export { generateDefaultOdds };

/** 为所有缺少赔率的已确定比赛生成默认赔率 */
export function ensureDefaultOdds(db: DatabaseSchema): string[] {
  const filled: string[] = [];
  const teamMap = new Map(db.teams.map(t => [t.id, t]));
  for (const match of db.matches) {
    if (match.homeTeamId === 'TBD' || match.awayTeamId === 'TBD') continue;
    if (!db.matchOdds[match.id]) {
      const home = teamMap.get(match.homeTeamId);
      const away = teamMap.get(match.awayTeamId);
      db.matchOdds[match.id] = generateDefaultOdds(match.id, home?.fifaRank, away?.fifaRank);
      filled.push(match.id);
    }
  }
  return filled;
}

export function normalizeName(value: string) {
  return (value || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

export const TEAM_NAME_ALIASES: Record<string, string[]> = {
  // ESPN scoreboard 返回的 abbreviation 与本地 team.code 一致，无需额外别名
  // 保留扩展点：未来可在此追加特定数据源的别名映射
};

export function buildTeamAliases(team: Team) {
  const aliases = new Set<string>();
  if (team.name) aliases.add(normalizeName(team.name));
  if (team.nameZh) aliases.add(normalizeName(team.nameZh));
  if (team.code) aliases.add(normalizeName(team.code));
  const extra = TEAM_NAME_ALIASES[team.code] || TEAM_NAME_ALIASES[team.id] || [];
  for (const a of extra) aliases.add(normalizeName(a));
  return Array.from(aliases);
}

export function resolveTeamByExternalName(db: DatabaseSchema, teamName: string) {
  const normalized = normalizeName(teamName);
  if (!normalized) return null;
  return db.teams.find((team) => buildTeamAliases(team).includes(normalized)) || null;
}
