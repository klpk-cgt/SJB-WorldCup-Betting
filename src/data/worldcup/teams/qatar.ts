import type { TeamCompleteProfile } from '../../../types/worldcup';

const SOURCE_FIFA: import('../../../types/worldcup').DataSource = { name: 'FIFA官网', url: 'https://www.fifa.com', level: 'A', date: '2026-06-08' };
const SOURCE_WIKI: import('../../../types/worldcup').DataSource = { name: 'Wikipedia', level: 'C', date: '2026-06-08' };
const SOURCE_MEDIA: import('../../../types/worldcup').DataSource = { name: '体育媒体综合', level: 'D', date: '2026-06-08' };

export const QATAR_PROFILE: TeamCompleteProfile = {
  profile: {
    teamId: 'QAT',
    nameZh: '卡塔尔',
    nameEn: 'Qatar',
    confederation: 'AFC',
    coachName: '马克斯',
    coachNationality: '西班牙',
    captainName: '哈桑·海多斯',
    fifaRank: 52,
    worldCupAppearances: 1,
    bestResult: '小组赛',
    titles: 0,
    squadValue: 20000000,
    squadValueDate: '2026-06-07',
    intro: '卡塔尔2022年以东道主身份首次参加世界杯，三连败出局成为世界杯历史上表现最差的东道主之一。但阿斯拜尔青训体系的长期投入仍在持续。',
    tags: ['2022东道主', '阿斯拜尔青训', '首次参赛', '海湾足球'],
    source: SOURCE_FIFA,
    accuracyLevel: 'verified',
  },
  worldCupHistory: {
    teamId: 'QAT',
    records: [
      { year: 2022, host: '卡塔尔', result: '小组赛', finalRank: 32, wins: 0, draws: 0, losses: 3, goalsFor: 1, goalsAgainst: 7, matchesPlayed: 3, note: '世界杯历史上表现最差的东道主' },
    ],
    summary: '卡塔尔仅1次参加世界杯（2022年东道主），三连败零积分出局，成为世界杯历史上表现最差的东道主。2026年通过预选赛晋级，将证明自身实力。',
    source: SOURCE_FIFA,
    accuracyLevel: 'verified',
  },
  qualification: {
    teamId: 'QAT',
    confederation: 'AFC',
    group: '第三轮A组',
    rank: 2,
    matchesPlayed: 10,
    wins: 6,
    draws: 2,
    losses: 2,
    goalsFor: 18,
    goalsAgainst: 8,
    points: 20,
    qualificationMethod: '亚洲区预选赛第三轮A组第2名直接晋级',
    keyMatches: [
      { date: '2025-06-05', opponent: '伊朗', venue: 'home', score: '1-1', result: 'draw', note: '主场战平伊朗' },
      { date: '2025-10-15', opponent: '乌兹别克斯坦', venue: 'home', score: '2-1', result: 'win', note: '主场力克乌兹别克' },
    ],
    source: SOURCE_FIFA,
    accuracyLevel: 'needs_review',
  },
  storyCards: [
    {
      id: 'qat-story-1',
      teamId: 'QAT',
      type: 'trivia',
      title: '2022东道主之殇：最差东道主纪录',
      content: '2022年卡塔尔成为首个在世界杯小组赛三连败的东道主，也是首个小组赛出局的东道主。揭幕战0-2负厄瓜多尔，随后1-3负塞内加尔，0-2负荷兰。三场仅入1球，创造了东道主最差战绩。2026年卡塔尔将首次通过预选赛晋级，寻求正名。',
      source: SOURCE_MEDIA,
      accuracyLevel: 'verified',
    },
  ],
};
