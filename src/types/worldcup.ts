/**
 * 2026世界杯静态资料库 - 核心类型定义
 * 与 src/types.ts 互补，不重复定义已有字段
 */

// 数据来源分级
export type SourceLevel = 'A' | 'B' | 'C' | 'D';

export interface DataSource {
  name: string;
  url?: string;
  level: SourceLevel;
  date: string; // 数据获取/更新日期 ISO格式
}

// 数据准确性等级
export type AccuracyLevel = 'verified' | 'needs_review' | 'summary_only';

// 带来源标注的数据项基础接口
export interface SourcedData {
  source: DataSource;
  accuracyLevel: AccuracyLevel;
}

// ═══ 球队基础资料 ═══
export interface TeamProfile extends SourcedData {
  teamId: string;
  nameZh: string;
  nameEn: string;
  confederation: 'AFC' | 'CAF' | 'CONCACAF' | 'CONMEBOL' | 'OFC' | 'UEFA';
  coachName: string;
  coachNationality?: string;
  captainName: string;
  fifaRank: number;
  worldCupAppearances: number;
  bestResult: string; // 如 "冠军(3次)"
  titles: number;
  squadValue?: number; // 总身价（欧元）
  squadValueDate?: string; // 身价数据日期
  intro: string; // 100-200字简介
  tags: string[]; // 3-5个标签，如 "卫冕冠军", "夺冠热门"
}

// ═══ 历届世界杯战绩 ═══
export interface WorldCupRecord {
  year: number;
  host: string;
  result: string; // 如 "冠军", "亚军", "八强"
  finalRank?: number;
  matchesPlayed: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  note?: string; // 特殊备注，如 "首次夺冠", "点球失利"
}

export interface TeamWorldCupRecord extends SourcedData {
  teamId: string;
  records: WorldCupRecord[];
  summary: string; // 历史总结，50-100字
}

// ═══ 2026预选赛战绩 ═══
export interface QualificationMatch {
  date: string;
  opponent: string;
  venue: 'home' | 'away' | 'neutral';
  score: string; // 如 "4-1"
  result: 'win' | 'draw' | 'loss';
  note?: string;
}

export interface TeamQualificationRecord extends SourcedData {
  teamId: string;
  confederation: string;
  group?: string;
  rank: number;
  matchesPlayed: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
  qualificationMethod: string; // 如 "小组第一直接晋级"
  keyMatches: QualificationMatch[]; // 2-3场关键比赛
}

// ═══ 历史交锋 ═══
export interface HeadToHeadMatch {
  date: string;
  competition: string;
  venue: string;
  score: string;
  winner?: string; // teamId 或 'draw'
  note?: string;
}

export interface WorldCupHeadToHead extends SourcedData {
  teamA: string; // teamId
  teamB: string; // teamId
  worldCupMatches: HeadToHeadMatch[];
  recentMatches: HeadToHeadMatch[]; // 最近5场
  worldCupSummary: string; // 世界杯交锋总结
}

// ═══ 球队故事卡片 ═══
export type StoryCardType = 'classic_match' | 'legend' | 'record' | 'rivalry' | 'trivia';

export interface TeamStoryCard extends SourcedData {
  id: string;
  teamId: string;
  type: StoryCardType;
  title: string;
  content: string; // 150字以内
  imageUrl?: string;
}

// ═══ 统一导出类型 ═══
export interface TeamCompleteProfile {
  profile: TeamProfile;
  worldCupHistory: TeamWorldCupRecord;
  qualification: TeamQualificationRecord;
  storyCards: TeamStoryCard[];
}
