/**
 * 世界杯数据可视化 - 静态数据集
 * 用于历史长廊"数据图鉴"Tab的可视化图表
 * 包含：各大洲夺冠分布、历届进球趋势、东道主成绩、点球大战胜率
 */

export interface ContinentTitles {
  continent: string;
  continentZh: string;
  titles: number;
  runnerUps: number;
  teams: string[];
}

export interface GoalsPerTournament {
  year: number;
  totalGoals: number;
  matches: number;
  avgGoals: number;
}

export interface HostPerformance {
  year: number;
  host: string;
  hostCode: string;
  result: string;
  finalRank: number;
}

export interface PenaltyShootoutRecord {
  team: string;
  code: string;
  total: number;
  wins: number;
  losses: number;
  winRate: number;
}

// ═══ 各大洲夺冠次数分布 ═══
export const CONTINENT_TITLES: ContinentTitles[] = [
  {
    continent: 'Europe',
    continentZh: '欧洲',
    titles: 12,
    runnerUps: 16,
    teams: ['意大利(4)', '德国(4)', '法国(2)', '西班牙(1)', '英格兰(1)'],
  },
  {
    continent: 'South America',
    continentZh: '南美洲',
    titles: 10,
    runnerUps: 6,
    teams: ['巴西(5)', '阿根廷(3)', '乌拉圭(2)'],
  },
  {
    continent: 'North America',
    continentZh: '中北美洲',
    titles: 0,
    runnerUps: 0,
    teams: [],
  },
  {
    continent: 'Asia',
    continentZh: '亚洲',
    titles: 0,
    runnerUps: 0,
    teams: [],
  },
  {
    continent: 'Africa',
    continentZh: '非洲',
    titles: 0,
    runnerUps: 0,
    teams: [],
  },
  {
    continent: 'Oceania',
    continentZh: '大洋洲',
    titles: 0,
    runnerUps: 0,
    teams: [],
  },
];

// ═══ 历届进球数趋势 ═══
export const GOALS_PER_TOURNAMENT: GoalsPerTournament[] = [
  { year: 1930, totalGoals: 70, matches: 18, avgGoals: 3.89 },
  { year: 1934, totalGoals: 70, matches: 17, avgGoals: 4.12 },
  { year: 1938, totalGoals: 84, matches: 18, avgGoals: 4.67 },
  { year: 1950, totalGoals: 88, matches: 22, avgGoals: 4.00 },
  { year: 1954, totalGoals: 140, matches: 26, avgGoals: 5.38 },
  { year: 1958, totalGoals: 126, matches: 35, avgGoals: 3.60 },
  { year: 1962, totalGoals: 89, matches: 32, avgGoals: 2.78 },
  { year: 1966, totalGoals: 89, matches: 32, avgGoals: 2.78 },
  { year: 1970, totalGoals: 95, matches: 32, avgGoals: 2.97 },
  { year: 1974, totalGoals: 97, matches: 38, avgGoals: 2.55 },
  { year: 1978, totalGoals: 102, matches: 38, avgGoals: 2.68 },
  { year: 1982, totalGoals: 146, matches: 52, avgGoals: 2.81 },
  { year: 1986, totalGoals: 132, matches: 52, avgGoals: 2.54 },
  { year: 1990, totalGoals: 115, matches: 52, avgGoals: 2.21 },
  { year: 1994, totalGoals: 141, matches: 52, avgGoals: 2.71 },
  { year: 1998, totalGoals: 171, matches: 64, avgGoals: 2.67 },
  { year: 2002, totalGoals: 161, matches: 64, avgGoals: 2.52 },
  { year: 2006, totalGoals: 147, matches: 64, avgGoals: 2.30 },
  { year: 2010, totalGoals: 145, matches: 64, avgGoals: 2.27 },
  { year: 2014, totalGoals: 171, matches: 64, avgGoals: 2.67 },
  { year: 2018, totalGoals: 169, matches: 64, avgGoals: 2.64 },
  { year: 2022, totalGoals: 172, matches: 64, avgGoals: 2.69 },
];

// ═══ 东道主成绩统计 ═══
export const HOST_PERFORMANCE: HostPerformance[] = [
  { year: 1930, host: '乌拉圭', hostCode: 'URU', result: '冠军', finalRank: 1 },
  { year: 1934, host: '意大利', hostCode: 'ITA', result: '冠军', finalRank: 1 },
  { year: 1938, host: '法国', hostCode: 'FRA', result: '八强', finalRank: 6 },
  { year: 1950, host: '巴西', hostCode: 'BRA', result: '亚军', finalRank: 2 },
  { year: 1954, host: '瑞士', hostCode: 'SUI', result: '八强', finalRank: 5 },
  { year: 1958, host: '瑞典', hostCode: 'SWE', result: '亚军', finalRank: 2 },
  { year: 1962, host: '智利', hostCode: 'CHI', result: '季军', finalRank: 3 },
  { year: 1966, host: '英格兰', hostCode: 'ENG', result: '冠军', finalRank: 1 },
  { year: 1970, host: '墨西哥', hostCode: 'MEX', result: '八强', finalRank: 6 },
  { year: 1974, host: '西德', hostCode: 'GER', result: '冠军', finalRank: 1 },
  { year: 1978, host: '阿根廷', hostCode: 'ARG', result: '冠军', finalRank: 1 },
  { year: 1982, host: '西班牙', hostCode: 'ESP', result: '第二阶段小组赛', finalRank: 12 },
  { year: 1986, host: '墨西哥', hostCode: 'MEX', result: '八强', finalRank: 6 },
  { year: 1990, host: '意大利', hostCode: 'ITA', result: '季军', finalRank: 3 },
  { year: 1994, host: '美国', hostCode: 'USA', result: '十六强', finalRank: 14 },
  { year: 1998, host: '法国', hostCode: 'FRA', result: '冠军', finalRank: 1 },
  { year: 2002, host: '韩日', hostCode: 'KOR', result: '韩国四强/日本十六强', finalRank: 4 },
  { year: 2006, host: '德国', hostCode: 'GER', result: '季军', finalRank: 3 },
  { year: 2010, host: '南非', hostCode: 'RSA', result: '小组赛', finalRank: 20 },
  { year: 2014, host: '巴西', hostCode: 'BRA', result: '第四名', finalRank: 4 },
  { year: 2018, host: '俄罗斯', hostCode: 'RUS', result: '八强', finalRank: 7 },
  { year: 2022, host: '卡塔尔', hostCode: 'QAT', result: '小组赛', finalRank: 29 },
];

// ═══ 点球大战胜率排行 ═══
export const PENALTY_SHOOTOUT_RECORDS: PenaltyShootoutRecord[] = [
  { team: '德国', code: 'GER', total: 4, wins: 4, losses: 0, winRate: 100 },
  { team: '阿根廷', code: 'ARG', total: 6, wins: 5, losses: 1, winRate: 83.3 },
  { team: '克罗地亚', code: 'CRO', total: 3, wins: 3, losses: 0, winRate: 100 },
  { team: '巴西', code: 'BRA', total: 4, wins: 3, losses: 1, winRate: 75 },
  { team: '法国', code: 'FRA', total: 4, wins: 2, losses: 2, winRate: 50 },
  { team: '意大利', code: 'ITA', total: 5, wins: 3, losses: 2, winRate: 60 },
  { team: '西班牙', code: 'ESP', total: 5, wins: 2, losses: 3, winRate: 40 },
  { team: '荷兰', code: 'NED', total: 4, wins: 1, losses: 3, winRate: 25 },
  { team: '英格兰', code: 'ENG', total: 4, wins: 1, losses: 3, winRate: 25 },
  { team: '乌拉圭', code: 'URU', total: 3, wins: 2, losses: 1, winRate: 66.7 },
];
