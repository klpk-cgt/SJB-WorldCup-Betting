import type { TeamCompleteProfile } from '../../../types/worldcup';

const SOURCE_FIFA: import('../../../types/worldcup').DataSource = { name: 'FIFA官网', url: 'https://www.fifa.com', level: 'A', date: '2026-06-08' };
const SOURCE_WIKI: import('../../../types/worldcup').DataSource = { name: 'Wikipedia', level: 'C', date: '2026-06-08' };
const SOURCE_MEDIA: import('../../../types/worldcup').DataSource = { name: '体育媒体综合', level: 'D', date: '2026-06-08' };

export const BOSNIA_AND_HERZEGOVINA_PROFILE: TeamCompleteProfile = {
  profile: {
    teamId: 'BIH',
    nameZh: '波黑',
    nameEn: 'Bosnia and Herzegovina',
    confederation: 'UEFA',
    coachName: '塞尔盖伊·巴尔巴雷斯',
    coachNationality: '波黑',
    captainName: '埃丁·哲科',
    fifaRank: 59,
    worldCupAppearances: 1,
    bestResult: '小组赛',
    titles: 0,
    squadValue: 80000000,
    squadValueDate: '2026-06-07',
    intro: '波黑独立后仅1次参加世界杯（2014年），哲科和皮亚尼奇领衔的黄金一代虽止步小组赛，但展现了巴尔干足球的韧性。2026年重返世界杯令人期待。',
    tags: ['巴尔干之鹰', '哲科传奇', '2014首秀', '重返世界杯'],
    source: SOURCE_FIFA,
    accuracyLevel: 'verified',
  },
  worldCupHistory: {
    teamId: 'BIH',
    records: [
      { year: 2014, host: '巴西', result: '小组赛', finalRank: 19, wins: 1, draws: 0, losses: 2, goalsFor: 4, goalsAgainst: 4, matchesPlayed: 3, note: '3-1胜伊朗，负阿根廷和尼日利亚' },
    ],
    summary: '波黑独立后仅1次参加世界杯（2014年），1胜2负止步小组赛。哲科领衔的黄金一代虽未出线，但3-1胜伊朗取得队史世界杯首胜。',
    source: SOURCE_WIKI,
    accuracyLevel: 'verified',
  },
  qualification: {
    teamId: 'BIH',
    confederation: 'UEFA',
    group: 'H组',
    rank: 2,
    matchesPlayed: 10,
    wins: 6,
    draws: 1,
    losses: 3,
    goalsFor: 17,
    goalsAgainst: 9,
    points: 19,
    qualificationMethod: '欧洲区预选赛H组第2名通过附加赛晋级',
    keyMatches: [
      { date: '2025-10-11', opponent: '斯洛伐克', venue: 'home', score: '2-0', result: 'win', note: '主场完胜斯洛伐克' },
      { date: '2026-03-24', opponent: '乌克兰', venue: 'neutral', score: '1-0', result: 'win', note: '附加赛小胜乌克兰' },
    ],
    source: SOURCE_FIFA,
    accuracyLevel: 'needs_review',
  },
  storyCards: [
    {
      id: 'bih-story-1',
      teamId: 'BIH',
      type: 'legend',
      title: '哲科：波黑足球的不朽旗帜',
      content: '埃丁·哲科是波黑足球史上最伟大的球员。从战火中成长的少年到罗马和曼城的传奇射手，哲科用进球书写了波黑足球的荣耀。2014年世界杯他打入波黑世界杯历史首球，2026年40岁的他仍可能为国出征，这份忠诚令人动容。',
      source: SOURCE_MEDIA,
      accuracyLevel: 'verified',
    },
  ],
};
