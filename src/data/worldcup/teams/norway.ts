import type { TeamCompleteProfile } from '../../../types/worldcup';

const SOURCE_FIFA: import('../../../types/worldcup').DataSource = { name: 'FIFA官网', url: 'https://www.fifa.com', level: 'A', date: '2026-06-08' };
const SOURCE_WIKI: import('../../../types/worldcup').DataSource = { name: 'Wikipedia', level: 'C', date: '2026-06-08' };
const SOURCE_MEDIA: import('../../../types/worldcup').DataSource = { name: '体育媒体综合', level: 'D', date: '2026-06-08' };

export const NORWAY_PROFILE: TeamCompleteProfile = {
  profile: {
    teamId: 'NOR',
    nameZh: '挪威',
    nameEn: 'Norway',
    confederation: 'UEFA',
    coachName: '斯托尔·索尔巴肯',
    coachNationality: '挪威',
    captainName: '马丁·厄德高',
    fifaRank: 40,
    worldCupAppearances: 3,
    bestResult: '十六强(1998)',
    titles: 0,
    squadValue: 400000000,
    squadValueDate: '2026-06-07',
    intro: '挪威3次参加世界杯，1998年闯入十六强。厄德高和哈兰德的双星时代让挪威足球迎来复兴，维京战士时隔28年重返世界杯舞台。',
    tags: ['维京战士', '1998十六强', '厄德高核心', '哈兰德杀手'],
    source: SOURCE_FIFA,
    accuracyLevel: 'verified',
  },
  worldCupHistory: {
    teamId: 'NOR',
    records: [
      { year: 1998, host: '法国', result: '十六强', finalRank: 9, wins: 1, draws: 2, losses: 1, goalsFor: 5, goalsAgainst: 4, matchesPlayed: 4, note: '2-1胜巴西，1-0负意大利' },
      { year: 1994, host: '美国', result: '小组赛', finalRank: 10, wins: 1, draws: 1, losses: 1, goalsFor: 1, goalsAgainst: 1, matchesPlayed: 3, note: '1-0胜墨西哥，同分因进球少出局' },
      { year: 1938, host: '法国', result: '十六强', finalRank: 8, wins: 0, draws: 0, losses: 1, goalsFor: 1, goalsAgainst: 2, matchesPlayed: 1, note: '1-2负意大利' },
    ],
    summary: '挪威3次参加世界杯，1998年闯入十六强，2-1击败巴西是经典战役。1994年1胜1平1负因进球少出局令人惋惜。时隔28年重返世界杯，厄德高和哈兰德的双星组合令人期待。',
    source: SOURCE_FIFA,
    accuracyLevel: 'verified',
  },
  qualification: {
    teamId: 'NOR',
    confederation: 'UEFA',
    group: 'I组',
    rank: 1,
    matchesPlayed: 10,
    wins: 8,
    draws: 1,
    losses: 1,
    goalsFor: 24,
    goalsAgainst: 5,
    points: 25,
    qualificationMethod: '欧洲区预选赛I组第1名直接晋级',
    keyMatches: [
      { date: '2025-06-09', opponent: '意大利', venue: 'home', score: '2-1', result: 'win', note: '主场力克意大利' },
      { date: '2025-11-16', opponent: '意大利', venue: 'away', score: '1-1', result: 'draw', note: '客场战平意大利锁定头名' },
    ],
    source: SOURCE_FIFA,
    accuracyLevel: 'needs_review',
  },
  storyCards: [
    {
      id: 'nor-story-1',
      teamId: 'NOR',
      type: 'classic_match',
      title: '1998小组赛：2-1击败巴西',
      content: '1998年6月23日，马赛韦洛德罗姆球场。挪威在小组赛末轮2-1击败巴西。弗洛第83分钟扳平，雷克达尔第89分钟点球绝杀。这场胜利让挪威以小组第二出线，也是巴西当届唯一一场失利。维京战士用顽强的意志力击败了足球王国。',
      source: SOURCE_MEDIA,
      accuracyLevel: 'verified',
    },
  ],
};
