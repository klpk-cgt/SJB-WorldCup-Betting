/**
 * 世界杯静态资料库 - 球队数据统一导出
 * 分批次补充：
 *   V2: 3支样例球队（阿根廷、巴西、法国）
 *   V5/V6: 17支热门球队（+德国、西班牙、英格兰、葡萄牙、荷兰、意大利、比利时、克罗地亚、乌拉圭、哥伦比亚、墨西哥、美国、日本、韩国）
 *   V7: 48队全部补齐
 */

import type { TeamCompleteProfile } from '../../../types/worldcup';
import { ARGENTINA_PROFILE } from './argentina';
import { BRAZIL_PROFILE } from './brazil';
import { FRANCE_PROFILE } from './france';
import { GERMANY_PROFILE } from './germany';
import { SPAIN_PROFILE } from './spain';
import { ENGLAND_PROFILE } from './england';
import { PORTUGAL_PROFILE } from './portugal';
import { NETHERLANDS_PROFILE } from './netherlands';
import { ITALY_PROFILE } from './italy';
import { BELGIUM_PROFILE } from './belgium';
import { CROATIA_PROFILE } from './croatia';
import { URUGUAY_PROFILE } from './uruguay';
import { COLOMBIA_PROFILE } from './colombia';
import { MEXICO_PROFILE } from './mexico';
import { USA_PROFILE } from './usa';
import { JAPAN_PROFILE } from './japan';
import { KOREA_PROFILE } from './korea';
import { SOUTH_AFRICA_PROFILE } from './south-africa';
import { CZECH_REPUBLIC_PROFILE } from './czech-republic';
import { CAMEROON_PROFILE } from './cameroon';
import { CANADA_PROFILE } from './canada';
import { BOSNIA_AND_HERZEGOVINA_PROFILE } from './bosnia-and-herzegovina';
import { QATAR_PROFILE } from './qatar';
import { SWITZERLAND_PROFILE } from './switzerland';
import { MOROCCO_PROFILE } from './morocco';
import { HAITI_PROFILE } from './haiti';
import { SCOTLAND_PROFILE } from './scotland';
import { PARAGUAY_PROFILE } from './paraguay';
import { AUSTRALIA_PROFILE } from './australia';
import { TURKEY_PROFILE } from './turkey';
import { CURACAO_PROFILE } from './curacao';
import { COTE_DIVOIRE_PROFILE } from './cote-divoire';
import { ECUADOR_PROFILE } from './ecuador';
import { SWEDEN_PROFILE } from './sweden';
import { TUNISIA_PROFILE } from './tunisia';
import { EGYPT_PROFILE } from './egypt';
import { IRAN_PROFILE } from './iran';
import { NEW_ZEALAND_PROFILE } from './new-zealand';
import { CAPE_VERDE_PROFILE } from './cape-verde';
import { SAUDI_ARABIA_PROFILE } from './saudi-arabia';
import { SENEGAL_PROFILE } from './senegal';
import { IRAQ_PROFILE } from './iraq';
import { NORWAY_PROFILE } from './norway';
import { ALGERIA_PROFILE } from './algeria';
import { AUSTRIA_PROFILE } from './austria';
import { JORDAN_PROFILE } from './jordan';
import { DR_CONGO_PROFILE } from './dr-congo';
import { UZBEKISTAN_PROFILE } from './uzbekistan';
import { GHANA_PROFILE } from './ghana';
import { PANAMA_PROFILE } from './panama';

/** 已完成的球队资料映射 */
export const TEAM_PROFILES: Record<string, TeamCompleteProfile> = {
  ARG: ARGENTINA_PROFILE,
  BRA: BRAZIL_PROFILE,
  FRA: FRANCE_PROFILE,
  GER: GERMANY_PROFILE,
  ESP: SPAIN_PROFILE,
  ENG: ENGLAND_PROFILE,
  POR: PORTUGAL_PROFILE,
  NED: NETHERLANDS_PROFILE,
  ITA: ITALY_PROFILE,
  BEL: BELGIUM_PROFILE,
  CRO: CROATIA_PROFILE,
  URU: URUGUAY_PROFILE,
  COL: COLOMBIA_PROFILE,
  MEX: MEXICO_PROFILE,
  USA: USA_PROFILE,
  JPN: JAPAN_PROFILE,
  KOR: KOREA_PROFILE,
  RSA: SOUTH_AFRICA_PROFILE,
  CZE: CZECH_REPUBLIC_PROFILE,
  CMR: CAMEROON_PROFILE,
  CAN: CANADA_PROFILE,
  BIH: BOSNIA_AND_HERZEGOVINA_PROFILE,
  QAT: QATAR_PROFILE,
  SUI: SWITZERLAND_PROFILE,
  MAR: MOROCCO_PROFILE,
  HAI: HAITI_PROFILE,
  SCO: SCOTLAND_PROFILE,
  PAR: PARAGUAY_PROFILE,
  AUS: AUSTRALIA_PROFILE,
  TUR: TURKEY_PROFILE,
  CUR: CURACAO_PROFILE,
  CIV: COTE_DIVOIRE_PROFILE,
  ECU: ECUADOR_PROFILE,
  SWE: SWEDEN_PROFILE,
  TUN: TUNISIA_PROFILE,
  EGY: EGYPT_PROFILE,
  IRN: IRAN_PROFILE,
  NZL: NEW_ZEALAND_PROFILE,
  CPV: CAPE_VERDE_PROFILE,
  KSA: SAUDI_ARABIA_PROFILE,
  SEN: SENEGAL_PROFILE,
  IRQ: IRAQ_PROFILE,
  NOR: NORWAY_PROFILE,
  DZA: ALGERIA_PROFILE,
  AUT: AUSTRIA_PROFILE,
  JOR: JORDAN_PROFILE,
  COD: DR_CONGO_PROFILE,
  UZB: UZBEKISTAN_PROFILE,
  GHA: GHANA_PROFILE,
  PAN: PANAMA_PROFILE,
};

const PROFILE_ALIASES: Record<string, string[]> = {
  USA: ['united states', 'usa', 'usmnt'],
  KOR: ['south korea', 'korea republic', 'republic of korea', 'korea'],
  CUR: ['curacao', 'curaçao'],
  CIV: ["cote d'ivoire", 'cote divoire', "côte d'ivoire", 'ivory coast'],
  BIH: ['bosnia and herzegovina', 'bosnia-herzegovina', 'bosnia'],
  CPV: ['cape verde', 'cabo verde'],
  COD: ['dr congo', 'democratic republic of congo', 'congo dr', 'congo-kinshasa'],
  CZE: ['czech republic', 'czechia'],
};

function normalizeProfileLookup(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '');
}

const PROFILE_LOOKUP = new Map<string, TeamCompleteProfile>();

for (const [teamId, profile] of Object.entries(TEAM_PROFILES)) {
  PROFILE_LOOKUP.set(normalizeProfileLookup(teamId), profile);
  for (const alias of PROFILE_ALIASES[teamId] || []) {
    PROFILE_LOOKUP.set(normalizeProfileLookup(alias), profile);
  }
}

function resolveProfileCandidate(candidate?: string | null) {
  if (!candidate) return undefined;
  return PROFILE_LOOKUP.get(normalizeProfileLookup(candidate));
}

export function resolveTeamProfile(
  input?: string | { id?: string | null; code?: string | null; name?: string | null; nameZh?: string | null },
): TeamCompleteProfile | undefined {
  if (!input) return undefined;
  if (typeof input === 'string') {
    return resolveProfileCandidate(input);
  }

  return (
    resolveProfileCandidate(input.id) ||
    resolveProfileCandidate(input.code) ||
    resolveProfileCandidate(input.name) ||
    resolveProfileCandidate(input.nameZh)
  );
}

/** 获取单支球队完整资料 */
export function getTeamProfile(teamId: string): TeamCompleteProfile | undefined {
  return resolveTeamProfile(teamId);
}

/** 获取所有已完成资料的球队ID列表 */
export function getCompletedTeamIds(): string[] {
  return Object.keys(TEAM_PROFILES);
}

/** 检查某支球队资料是否已完成 */
export function hasTeamProfile(teamId: string): boolean {
  return teamId in TEAM_PROFILES;
}
