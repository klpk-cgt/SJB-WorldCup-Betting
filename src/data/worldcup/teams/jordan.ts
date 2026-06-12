import type { TeamCompleteProfile } from '../../../types/worldcup';

const SOURCE_FIFA: import('../../../types/worldcup').DataSource = { name: 'FIFA官网', url: 'https://www.fifa.com', level: 'A', date: '2026-06-08' };
const SOURCE_WIKI: import('../../../types/worldcup').DataSource = { name: 'Wikipedia', level: 'C', date: '2026-06-08' };
const SOURCE_MEDIA: import('../../../types/worldcup').DataSource = { name: '体育媒体综合', level: 'D', date: '2026-06-08' };

export const JORDAN_PROFILE: TeamCompleteProfile = {
  profile: {
    teamId: 'JOR',
    nameZh: '约旦',
    nameEn: 'Jordan',
    confederation: 'AFC',
    coachName: '阿姆尔塔',
    coachNationality: '摩洛哥',
    captainName: '亚赞·阿拉伯',
    fifaRank: 67,
    worldCupAppearances: 0,
    bestResult: '首次参赛',
    titles: 0,
    squadValue: 10000000,
    squadValueDate: '2026-06-07',
    intro: '约旦2026年首次闯入世界杯，创造了约旦足球的历史。2024年亚洲杯亚军是崛起的标志，中东小国足球正在书写属于自己的传奇。',
    tags: ['中东新星', '首次参赛', '2024亚洲杯亚军', '阿拉伯之鹰'],
    source: SOURCE_FIFA,
    accuracyLevel: 'needs_review',
  },
  worldCupHistory: {
    teamId: 'JOR',
    records: [],
    summary: '约旦此前从未参加世界杯，2026年是队史首次闯入世界杯决赛圈。2024年亚洲杯获得亚军是约旦足球崛起的标志，从亚洲二流到世界杯参赛者，约旦足球的进步令人瞩目。',
    source: SOURCE_WIKI,
    accuracyLevel: 'needs_review',
  },
  qualification: {
    teamId: 'JOR',
    confederation: 'AFC',
    group: '第三轮B组',
    rank: 4,
    matchesPlayed: 10,
    wins: 4,
    draws: 2,
    losses: 4,
    goalsFor: 12,
    goalsAgainst: 12,
    points: 14,
    qualificationMethod: '亚洲区预选赛第三轮B组第4名通过附加赛晋级',
    keyMatches: [
      { date: '2025-06-05', opponent: '澳大利亚', venue: 'home', score: '1-1', result: 'draw', note: '主场战平澳大利亚' },
      { date: '2026-03-24', opponent: '巴林', venue: 'neutral', score: '2-1', result: 'win', note: '附加赛击败巴林' },
    ],
    source: SOURCE_FIFA,
    accuracyLevel: 'needs_review',
  },
  storyCards: [
    {
      id: 'jor-story-1',
      teamId: 'JOR',
      type: 'trivia',
      title: '从亚洲杯亚军到世界杯首秀',
      content: '约旦足球的崛起令人瞩目。2024年亚洲杯，约旦一路杀入决赛获得亚军，塔马里和阿拉伯的精彩表现让世界认识了这支中东球队。2026年世界杯是约旦队史首次参赛，从中东小国到世界杯舞台，约旦足球正在书写属于自己的传奇。',
      source: SOURCE_MEDIA,
      accuracyLevel: 'needs_review',
    },
  ],
};
