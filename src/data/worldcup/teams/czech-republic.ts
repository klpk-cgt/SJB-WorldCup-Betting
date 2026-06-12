import type { TeamCompleteProfile } from '../../../types/worldcup';

const SOURCE_FIFA: import('../../../types/worldcup').DataSource = { name: 'FIFA官网', url: 'https://www.fifa.com', level: 'A', date: '2026-06-08' };
const SOURCE_WIKI: import('../../../types/worldcup').DataSource = { name: 'Wikipedia', level: 'C', date: '2026-06-08' };
const SOURCE_MEDIA: import('../../../types/worldcup').DataSource = { name: '体育媒体综合', level: 'D', date: '2026-06-08' };

export const CZECH_REPUBLIC_PROFILE: TeamCompleteProfile = {
  profile: {
    teamId: 'CZE',
    nameZh: '捷克',
    nameEn: 'Czech Republic',
    confederation: 'UEFA',
    coachName: '伊万·哈谢克',
    coachNationality: '捷克',
    captainName: '弗拉基米尔·库法尔',
    fifaRank: 42,
    worldCupAppearances: 1,
    bestResult: '小组赛',
    titles: 0,
    squadValue: 180000000,
    squadValueDate: '2026-06-07',
    intro: '捷克独立后仅1次参加世界杯（2006年），但作为捷克斯洛伐克曾2次打入决赛。捷克足球底蕴深厚，希克、绍切克等球员活跃于欧洲顶级联赛。',
    tags: ['东欧铁骑', '捷克斯洛伐克传承', '希克射手', '欧洲杯常客'],
    source: SOURCE_FIFA,
    accuracyLevel: 'verified',
  },
  worldCupHistory: {
    teamId: 'CZE',
    records: [
      { year: 2006, host: '德国', result: '小组赛', finalRank: 18, wins: 1, draws: 0, losses: 2, goalsFor: 3, goalsAgainst: 5, matchesPlayed: 3, note: '3-0胜美国后连负加纳和意大利' },
    ],
    summary: '捷克独立后仅1次参加世界杯（2006年），止步小组赛。作为捷克斯洛伐克时期曾获1934和1962年亚军，足球传统深厚。',
    source: SOURCE_WIKI,
    accuracyLevel: 'verified',
  },
  qualification: {
    teamId: 'CZE',
    confederation: 'UEFA',
    group: 'E组',
    rank: 2,
    matchesPlayed: 10,
    wins: 6,
    draws: 2,
    losses: 2,
    goalsFor: 18,
    goalsAgainst: 8,
    points: 20,
    qualificationMethod: '欧洲区预选赛E组第2名通过附加赛晋级',
    keyMatches: [
      { date: '2025-10-14', opponent: '波兰', venue: 'home', score: '3-1', result: 'win', note: '主场大胜波兰' },
      { date: '2026-03-24', opponent: '苏格兰', venue: 'neutral', score: '2-1', result: 'win', note: '附加赛击败苏格兰' },
    ],
    source: SOURCE_FIFA,
    accuracyLevel: 'needs_review',
  },
  storyCards: [
    {
      id: 'cze-story-1',
      teamId: 'CZE',
      type: 'legend',
      title: '捷克斯洛伐克的辉煌传承',
      content: '捷克斯洛伐克曾在1934年和1962年两次打入世界杯决赛。1934年1-2负于意大利，1962年1-3负于巴西。内德维德、波博斯基等传奇球星延续了捷克足球的荣光。2026年捷克重返世界杯，希克和绍切克将扛起前辈的旗帜。',
      source: SOURCE_MEDIA,
      accuracyLevel: 'verified',
    },
  ],
};
