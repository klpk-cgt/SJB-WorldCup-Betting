import type { TeamCompleteProfile } from '../../../types/worldcup';

const SOURCE_FIFA: import('../../../types/worldcup').DataSource = { name: 'FIFA官网', url: 'https://www.fifa.com', level: 'A', date: '2026-06-08' };
const SOURCE_WIKI: import('../../../types/worldcup').DataSource = { name: 'Wikipedia', level: 'C', date: '2026-06-08' };
const SOURCE_MEDIA: import('../../../types/worldcup').DataSource = { name: '体育媒体综合', level: 'D', date: '2026-06-08' };

export const PARAGUAY_PROFILE: TeamCompleteProfile = {
  profile: {
    teamId: 'PAR',
    nameZh: '巴拉圭',
    nameEn: 'Paraguay',
    confederation: 'CONMEBOL',
    coachName: '古斯塔沃·阿尔法罗',
    coachNationality: '阿根廷',
    captainName: '奥斯卡·卡多索',
    fifaRank: 53,
    worldCupAppearances: 10,
    bestResult: '八强(2010)',
    titles: 0,
    squadValue: 60000000,
    squadValueDate: '2026-06-07',
    intro: '巴拉圭10次参加世界杯，2010年闯入八强创造历史。南美小国以铁血防守著称，奇拉维特开创了门将罚点球的传奇。2026年重返世界杯令人期待。',
    tags: ['南美铁血', '2010八强', '奇拉维特传奇', '防守之师'],
    source: SOURCE_FIFA,
    accuracyLevel: 'verified',
  },
  worldCupHistory: {
    teamId: 'PAR',
    records: [
      { year: 2010, host: '南非', result: '八强', finalRank: 6, wins: 2, draws: 1, losses: 1, goalsFor: 5, goalsAgainst: 3, matchesPlayed: 4, note: '1/4决赛0-1负西班牙，卡多索点球胜日本' },
      { year: 2006, host: '德国', result: '十六强', finalRank: 9, wins: 1, draws: 0, losses: 2, goalsFor: 2, goalsAgainst: 3, matchesPlayed: 3, note: '0-1负英格兰' },
      { year: 2002, host: '韩日', result: '十六强', finalRank: 9, wins: 1, draws: 1, losses: 1, goalsFor: 6, goalsAgainst: 5, matchesPlayed: 4, note: '0-1负德国' },
      { year: 1998, host: '法国', result: '十六强', finalRank: 9, wins: 1, draws: 1, losses: 1, goalsFor: 3, goalsAgainst: 3, matchesPlayed: 4, note: '0-1负法国，布兰科金球绝杀' },
      { year: 1986, host: '墨西哥', result: '十六强', finalRank: 9, wins: 1, draws: 1, losses: 1, goalsFor: 4, goalsAgainst: 5, matchesPlayed: 4, note: '0-3负英格兰' },
    ],
    summary: '巴拉圭10次参加世界杯，2010年闯入八强创造历史。4次闯入十六强均未能更进一步。奇拉维特时代的巴拉圭以铁血防守闻名南美。',
    source: SOURCE_WIKI,
    accuracyLevel: 'verified',
  },
  qualification: {
    teamId: 'PAR',
    confederation: 'CONMEBOL',
    group: '预选赛',
    rank: 5,
    matchesPlayed: 18,
    wins: 8,
    draws: 4,
    losses: 6,
    goalsFor: 22,
    goalsAgainst: 18,
    points: 28,
    qualificationMethod: '南美区预选赛第5名直接晋级',
    keyMatches: [
      { date: '2025-09-09', opponent: '巴西', venue: 'home', score: '1-0', result: 'win', note: '主场击败巴西' },
      { date: '2025-11-18', opponent: '阿根廷', venue: 'home', score: '1-1', result: 'draw', note: '主场战平阿根廷' },
    ],
    source: SOURCE_FIFA,
    accuracyLevel: 'needs_review',
  },
  storyCards: [
    {
      id: 'par-story-1',
      teamId: 'PAR',
      type: 'legend',
      title: '奇拉维特：进球的门将',
      content: '何塞·路易斯·奇拉维特是巴拉圭足球史上最传奇的人物。作为门将，他职业生涯打入62球，其中包括8个世界杯预选赛进球。他主罚任意球和点球的能力举世闻名，曾扬言要在世界杯上进球。1998和2002年世界杯，奇拉维特是巴拉圭闯入十六强的核心。',
      source: SOURCE_MEDIA,
      accuracyLevel: 'verified',
    },
  ],
};
