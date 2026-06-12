import type { TeamCompleteProfile } from '../../../types/worldcup';

const SOURCE_FIFA: import('../../../types/worldcup').DataSource = { name: 'FIFA官网', url: 'https://www.fifa.com', level: 'A', date: '2026-06-08' };
const SOURCE_WIKI: import('../../../types/worldcup').DataSource = { name: 'Wikipedia', level: 'C', date: '2026-06-08' };
const SOURCE_MEDIA: import('../../../types/worldcup').DataSource = { name: '体育媒体综合', level: 'D', date: '2026-06-08' };

export const UZBEKISTAN_PROFILE: TeamCompleteProfile = {
  profile: {
    teamId: 'UZB',
    nameZh: '乌兹别克斯坦',
    nameEn: 'Uzbekistan',
    confederation: 'AFC',
    coachName: '卡帕泽',
    coachNationality: '乌兹别克斯坦',
    captainName: '埃尔多尔·肖穆罗多夫',
    fifaRank: 48,
    worldCupAppearances: 0,
    bestResult: '首次参赛',
    titles: 0,
    squadValue: 40000000,
    squadValueDate: '2026-06-07',
    intro: '乌兹别克斯坦2026年首次闯入世界杯，创造了中亚足球的历史。肖穆罗多夫领衔的白狼军团在亚洲区预选赛中表现出色，中亚足球迎来高光时刻。',
    tags: ['白狼军团', '首次参赛', '中亚之光', '肖穆罗多夫'],
    source: SOURCE_FIFA,
    accuracyLevel: 'needs_review',
  },
  worldCupHistory: {
    teamId: 'UZB',
    records: [],
    summary: '乌兹别克斯坦此前从未参加世界杯，2026年是队史首次闯入世界杯决赛圈。作为中亚足球的代表，乌兹别克斯坦的晋级填补了中亚足球在世界杯舞台上的空白。',
    source: SOURCE_WIKI,
    accuracyLevel: 'needs_review',
  },
  qualification: {
    teamId: 'UZB',
    confederation: 'AFC',
    group: '第三轮A组',
    rank: 3,
    matchesPlayed: 10,
    wins: 5,
    draws: 2,
    losses: 3,
    goalsFor: 14,
    goalsAgainst: 10,
    points: 17,
    qualificationMethod: '亚洲区预选赛第三轮A组第3名通过附加赛晋级',
    keyMatches: [
      { date: '2025-06-05', opponent: '伊朗', venue: 'home', score: '1-1', result: 'draw', note: '主场战平伊朗' },
      { date: '2026-03-24', opponent: '阿联酋', venue: 'neutral', score: '2-1', result: 'win', note: '附加赛击败阿联酋' },
    ],
    source: SOURCE_FIFA,
    accuracyLevel: 'needs_review',
  },
  storyCards: [
    {
      id: 'uzb-story-1',
      teamId: 'UZB',
      type: 'trivia',
      title: '中亚之光：乌兹别克斯坦的世界杯首秀',
      content: '乌兹别克斯坦是中亚地区首个闯入世界杯的国家。独立以来，乌兹别克足球经历了从苏联体系到独立发展的转型。2011年亚洲杯四强和多次世预赛亚洲区末轮的历练，终于在2026年开花结果。肖穆罗多夫在意甲的出色表现是乌兹别克足球崛起的缩影。',
      source: SOURCE_MEDIA,
      accuracyLevel: 'needs_review',
    },
  ],
};
