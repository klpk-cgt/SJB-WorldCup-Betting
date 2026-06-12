import type { TeamCompleteProfile } from '../../../types/worldcup';

const SOURCE_FIFA: import('../../../types/worldcup').DataSource = { name: 'FIFA官网', url: 'https://www.fifa.com', level: 'A', date: '2026-06-08' };
const SOURCE_WIKI: import('../../../types/worldcup').DataSource = { name: 'Wikipedia', level: 'C', date: '2026-06-08' };
const SOURCE_MEDIA: import('../../../types/worldcup').DataSource = { name: '体育媒体综合', level: 'D', date: '2026-06-08' };

export const ECUADOR_PROFILE: TeamCompleteProfile = {
  profile: {
    teamId: 'ECU',
    nameZh: '厄瓜多尔',
    nameEn: 'Ecuador',
    confederation: 'CONMEBOL',
    coachName: '塞巴斯蒂安·贝卡塞斯',
    coachNationality: '阿根廷',
    captainName: '恩纳·瓦伦西亚',
    fifaRank: 30,
    worldCupAppearances: 4,
    bestResult: '十六强(2006)',
    titles: 0,
    squadValue: 120000000,
    squadValueDate: '2026-06-07',
    intro: '厄瓜多尔4次参加世界杯，2006年闯入十六强创造历史。高原主场基多是南美预选赛最恐怖的客场，恩纳·瓦伦西亚是球队的精神领袖。',
    tags: ['高原之鹰', '2006十六强', '基多主场', '瓦伦西亚'],
    source: SOURCE_FIFA,
    accuracyLevel: 'verified',
  },
  worldCupHistory: {
    teamId: 'ECU',
    records: [
      { year: 2022, host: '卡塔尔', result: '小组赛', finalRank: 17, wins: 1, draws: 1, losses: 1, goalsFor: 4, goalsAgainst: 3, matchesPlayed: 3, note: '2-0胜卡塔尔，1-2负塞内加尔' },
      { year: 2014, host: '巴西', result: '小组赛', finalRank: 17, wins: 1, draws: 1, losses: 1, goalsFor: 3, goalsAgainst: 3, matchesPlayed: 3, note: '1-2负瑞士，2-1胜洪都拉斯' },
      { year: 2006, host: '德国', result: '十六强', finalRank: 9, wins: 2, draws: 0, losses: 2, goalsFor: 5, goalsAgainst: 5, matchesPlayed: 4, note: '0-1负英格兰，瓦伦西亚进球' },
      { year: 2002, host: '韩日', result: '小组赛', finalRank: 24, wins: 0, draws: 0, losses: 3, goalsFor: 1, goalsAgainst: 5, matchesPlayed: 3, note: '首次参赛，三连败' },
    ],
    summary: '厄瓜多尔4次参加世界杯，2006年闯入十六强创造历史。2022年小组赛1胜1平1负因净胜球劣势出局令人惋惜。高原主场基多是南美预选赛的魔鬼主场。',
    source: SOURCE_FIFA,
    accuracyLevel: 'verified',
  },
  qualification: {
    teamId: 'ECU',
    confederation: 'CONMEBOL',
    group: '预选赛',
    rank: 4,
    matchesPlayed: 18,
    wins: 9,
    draws: 4,
    losses: 5,
    goalsFor: 24,
    goalsAgainst: 16,
    points: 31,
    qualificationMethod: '南美区预选赛第4名直接晋级',
    keyMatches: [
      { date: '2025-09-09', opponent: '乌拉圭', venue: 'home', score: '2-1', result: 'win', note: '高原主场力克乌拉圭' },
      { date: '2025-11-18', opponent: '哥伦比亚', venue: 'home', score: '1-0', result: 'win', note: '主场小胜哥伦比亚' },
    ],
    source: SOURCE_FIFA,
    accuracyLevel: 'needs_review',
  },
  storyCards: [
    {
      id: 'ecu-story-1',
      teamId: 'ECU',
      type: 'trivia',
      title: '海拔2850米的魔鬼主场',
      content: '厄瓜多尔首都基多海拔2850米，是南美预选赛最恐怖的客场。高原缺氧让客队球员体能迅速下降，巴西、阿根廷等强队在此都曾吃尽苦头。2002年厄瓜多尔首次闯入世界杯，高原主场功不可没。这座"魔鬼主场"是厄瓜多尔足球最强大的武器。',
      source: SOURCE_MEDIA,
      accuracyLevel: 'verified',
    },
  ],
};
