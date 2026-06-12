import type { TeamCompleteProfile } from '../../../types/worldcup';

const SOURCE_FIFA: import('../../../types/worldcup').DataSource = { name: 'FIFA官网', url: 'https://www.fifa.com', level: 'A', date: '2026-06-08' };
const SOURCE_WIKI: import('../../../types/worldcup').DataSource = { name: 'Wikipedia', level: 'C', date: '2026-06-08' };
const SOURCE_MEDIA: import('../../../types/worldcup').DataSource = { name: '体育媒体综合', level: 'D', date: '2026-06-08' };

export const CURACAO_PROFILE: TeamCompleteProfile = {
  profile: {
    teamId: 'CUR',
    nameZh: '库拉索',
    nameEn: 'Curaçao',
    confederation: 'CONCACAF',
    coachName: '迪克·艾德沃卡特',
    coachNationality: '荷兰',
    captainName: '莱安德罗·巴库纳',
    fifaRank: 72,
    worldCupAppearances: 0,
    bestResult: '首次参赛',
    titles: 0,
    squadValue: 20000000,
    squadValueDate: '2026-06-07',
    intro: '库拉索是加勒比海小岛国，人口仅15万，2026年首次闯入世界杯。受荷兰足球影响深远，多名球员效力荷甲，创造了小岛足球的奇迹。',
    tags: ['加勒比奇迹', '首次参赛', '荷甲血脉', '小岛传奇'],
    source: SOURCE_FIFA,
    accuracyLevel: 'needs_review',
  },
  worldCupHistory: {
    teamId: 'CUR',
    records: [],
    summary: '库拉索此前从未参加世界杯，2026年是队史首次闯入世界杯决赛圈。作为人口仅15万的加勒比海小岛国，库拉索的晋级本身就是足球奇迹。',
    source: SOURCE_WIKI,
    accuracyLevel: 'needs_review',
  },
  qualification: {
    teamId: 'CUR',
    confederation: 'CONCACAF',
    group: '第三轮',
    rank: 4,
    matchesPlayed: 14,
    wins: 6,
    draws: 4,
    losses: 4,
    goalsFor: 16,
    goalsAgainst: 12,
    points: 22,
    qualificationMethod: '中北美区预选赛第三轮第4名通过附加赛晋级',
    keyMatches: [
      { date: '2025-09-07', opponent: '洪都拉斯', venue: 'home', score: '2-0', result: 'win', note: '主场完胜洪都拉斯' },
      { date: '2026-03-24', opponent: '特立尼达和多巴哥', venue: 'neutral', score: '2-1', result: 'win', note: '附加赛击败特多' },
    ],
    source: SOURCE_FIFA,
    accuracyLevel: 'needs_review',
  },
  storyCards: [
    {
      id: 'cur-story-1',
      teamId: 'CUR',
      type: 'trivia',
      title: '15万人的世界杯梦',
      content: '库拉索是加勒比海小岛国，人口仅约15万，是2026年世界杯参赛国中人口最少的国家之一。受荷兰殖民历史影响，库拉索足球深深烙印着荷兰风格，多名球员在荷甲效力。从库拉索联赛到世界杯舞台，这个小岛创造了足球的奇迹。',
      source: SOURCE_MEDIA,
      accuracyLevel: 'needs_review',
    },
  ],
};
