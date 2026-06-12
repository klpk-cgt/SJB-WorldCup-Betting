import type { TeamCompleteProfile } from '../../../types/worldcup';

const SOURCE_FIFA: import('../../../types/worldcup').DataSource = { name: 'FIFA官网', url: 'https://www.fifa.com', level: 'A', date: '2026-06-08' };
const SOURCE_WIKI: import('../../../types/worldcup').DataSource = { name: 'Wikipedia', level: 'C', date: '2026-06-08' };
const SOURCE_MEDIA: import('../../../types/worldcup').DataSource = { name: '体育媒体综合', level: 'D', date: '2026-06-08' };

export const CAPE_VERDE_PROFILE: TeamCompleteProfile = {
  profile: {
    teamId: 'CPV',
    nameZh: '佛得角',
    nameEn: 'Cape Verde',
    confederation: 'CAF',
    coachName: '布巴卡尔·科斯塔',
    coachNationality: '佛得角',
    captainName: '瑞安·门德斯',
    fifaRank: 65,
    worldCupAppearances: 0,
    bestResult: '首次参赛',
    titles: 0,
    squadValue: 25000000,
    squadValueDate: '2026-06-07',
    intro: '佛得角是非洲大西洋上的群岛国家，人口仅50万，2026年首次闯入世界杯。受葡萄牙足球影响深远，多名球员效力葡超，小国足球的奇迹令人惊叹。',
    tags: ['大西洋明珠', '首次参赛', '葡超血脉', '群岛奇迹'],
    source: SOURCE_FIFA,
    accuracyLevel: 'needs_review',
  },
  worldCupHistory: {
    teamId: 'CPV',
    records: [],
    summary: '佛得角此前从未参加世界杯，2026年是队史首次闯入世界杯决赛圈。作为人口仅50万的大西洋群岛国家，佛得角的晋级本身就是足球奇迹。',
    source: SOURCE_WIKI,
    accuracyLevel: 'needs_review',
  },
  qualification: {
    teamId: 'CPV',
    confederation: 'CAF',
    group: '第三轮G组',
    rank: 1,
    matchesPlayed: 6,
    wins: 4,
    draws: 1,
    losses: 1,
    goalsFor: 8,
    goalsAgainst: 3,
    points: 13,
    qualificationMethod: '非洲区预选赛第三轮G组第1名直接晋级',
    keyMatches: [
      { date: '2025-06-09', opponent: '安哥拉', venue: 'home', score: '2-0', result: 'win', note: '主场完胜安哥拉' },
      { date: '2025-11-17', opponent: '利比亚', venue: 'away', score: '1-0', result: 'win', note: '客场小胜利比亚' },
    ],
    source: SOURCE_FIFA,
    accuracyLevel: 'needs_review',
  },
  storyCards: [
    {
      id: 'cpv-story-1',
      teamId: 'CPV',
      type: 'trivia',
      title: '50万人的世界杯梦',
      content: '佛得角是非洲大西洋上的群岛国家，人口仅约50万，是2026年世界杯参赛国中人口最少的国家之一。受葡萄牙殖民历史影响，佛得角足球深深烙印着葡萄牙风格，多名球员在葡超效力。从2013年首次参加非洲杯到2026年闯入世界杯，佛得角用15年完成了从鱼腩到世界杯参赛者的蜕变。',
      source: SOURCE_MEDIA,
      accuracyLevel: 'needs_review',
    },
  ],
};
