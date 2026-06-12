import type { TeamCompleteProfile } from '../../../types/worldcup';

const SOURCE_FIFA: import('../../../types/worldcup').DataSource = { name: 'FIFA官网', url: 'https://www.fifa.com', level: 'A', date: '2026-06-08' };
const SOURCE_WIKI: import('../../../types/worldcup').DataSource = { name: 'Wikipedia', level: 'C', date: '2026-06-08' };
const SOURCE_MEDIA: import('../../../types/worldcup').DataSource = { name: '体育媒体综合', level: 'D', date: '2026-06-08' };

export const MOROCCO_PROFILE: TeamCompleteProfile = {
  profile: {
    teamId: 'MAR',
    nameZh: '摩洛哥',
    nameEn: 'Morocco',
    confederation: 'CAF',
    coachName: '瓦利德·雷格拉吉',
    coachNationality: '摩洛哥',
    captainName: '罗曼·赛斯',
    fifaRank: 13,
    worldCupAppearances: 6,
    bestResult: '殿军(2022)',
    titles: 0,
    squadValue: 280000000,
    squadValueDate: '2026-06-07',
    intro: '摩洛哥是2022年世界杯最大黑马，成为首支闯入四强的非洲球队。雷格拉吉执教下，阿什拉夫、齐耶赫等球星打造了坚不可摧的防线，书写了非洲足球新篇章。',
    tags: ['阿特拉斯雄狮', '2022殿军', '非洲之光', '雷格拉吉', '铁血防线'],
    source: SOURCE_FIFA,
    accuracyLevel: 'verified',
  },
  worldCupHistory: {
    teamId: 'MAR',
    records: [
      { year: 2022, host: '卡塔尔', result: '殿军', finalRank: 4, wins: 3, draws: 1, losses: 2, goalsFor: 6, goalsAgainst: 5, matchesPlayed: 6, note: '首支闯入四强的非洲球队，1/4决赛1-0胜葡萄牙' },
      { year: 2018, host: '俄罗斯', result: '小组赛', finalRank: 27, wins: 0, draws: 1, losses: 2, goalsFor: 2, goalsAgainst: 4, matchesPlayed: 3, note: '2-2平西班牙' },
      { year: 1998, host: '法国', result: '小组赛', finalRank: 18, wins: 0, draws: 2, losses: 1, goalsFor: 3, goalsAgainst: 4, matchesPlayed: 3, note: '2-2平挪威' },
      { year: 1994, host: '美国', result: '小组赛', finalRank: 23, wins: 0, draws: 0, losses: 2, goalsFor: 2, goalsAgainst: 5, matchesPlayed: 3, note: '1-2负比利时' },
      { year: 1986, host: '墨西哥', result: '十六强', finalRank: 11, wins: 1, draws: 2, losses: 1, goalsFor: 3, goalsAgainst: 2, matchesPlayed: 4, note: '小组头名出线，0-1负西德' },
      { year: 1970, host: '墨西哥', result: '小组赛', finalRank: 14, wins: 0, draws: 1, losses: 2, goalsFor: 2, goalsAgainst: 6, matchesPlayed: 3, note: '首次参赛' },
    ],
    summary: '摩洛哥6次参加世界杯，2022年创造历史成为首支闯入四强的非洲球队。1986年也曾以小组头名出线闯入十六强。摩洛哥是非洲足球的旗帜。',
    source: SOURCE_FIFA,
    accuracyLevel: 'verified',
  },
  qualification: {
    teamId: 'MAR',
    confederation: 'CAF',
    group: '第三轮E组',
    rank: 1,
    matchesPlayed: 6,
    wins: 5,
    draws: 1,
    losses: 0,
    goalsFor: 14,
    goalsAgainst: 2,
    points: 16,
    qualificationMethod: '非洲区预选赛第三轮E组第1名直接晋级',
    keyMatches: [
      { date: '2025-06-09', opponent: '赞比亚', venue: 'home', score: '3-0', result: 'win', note: '主场大胜赞比亚' },
      { date: '2025-11-17', opponent: '刚果', venue: 'away', score: '2-0', result: 'win', note: '客场完胜刚果' },
    ],
    source: SOURCE_FIFA,
    accuracyLevel: 'needs_review',
  },
  storyCards: [
    {
      id: 'mar-story-1',
      teamId: 'MAR',
      type: 'classic_match',
      title: '2022四分之一决赛：1-0胜葡萄牙创历史',
      content: '2022年12月10日，多哈图玛玛球场。摩洛哥1-0击败葡萄牙，恩内斯里第42分钟头球破门，成为首支闯入世界杯四强的非洲球队。全场摩洛哥球迷的欢呼声震耳欲聋，阿特拉斯雄狮创造了非洲足球的历史。',
      source: SOURCE_MEDIA,
      accuracyLevel: 'verified',
    },
    {
      id: 'mar-story-2',
      teamId: 'MAR',
      type: 'trivia',
      title: '雷格拉吉：从出租车司机之子到民族英雄',
      content: '瓦利德·雷格拉吉2022年8月临危受命接手摩洛哥，仅4个月就带队闯入四强。他出生于巴黎郊区，父母是摩洛哥移民。他打造的4-1-2-1-2阵型和铁血防线让克罗地亚、比利时、西班牙、葡萄牙全部无功而返，成为摩洛哥的民族英雄。',
      source: SOURCE_MEDIA,
      accuracyLevel: 'verified',
    },
  ],
};
