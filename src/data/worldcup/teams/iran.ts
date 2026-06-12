import type { TeamCompleteProfile } from '../../../types/worldcup';

const SOURCE_FIFA: import('../../../types/worldcup').DataSource = { name: 'FIFA官网', url: 'https://www.fifa.com', level: 'A', date: '2026-06-08' };
const SOURCE_WIKI: import('../../../types/worldcup').DataSource = { name: 'Wikipedia', level: 'C', date: '2026-06-08' };
const SOURCE_MEDIA: import('../../../types/worldcup').DataSource = { name: '体育媒体综合', level: 'D', date: '2026-06-08' };

export const IRAN_PROFILE: TeamCompleteProfile = {
  profile: {
    teamId: 'IRN',
    nameZh: '伊朗',
    nameEn: 'Iran',
    confederation: 'AFC',
    coachName: '阿米尔·加莱诺伊',
    coachNationality: '伊朗',
    captainName: '萨达尔·阿兹蒙',
    fifaRank: 20,
    worldCupAppearances: 6,
    bestResult: '小组赛',
    titles: 0,
    squadValue: 80000000,
    squadValueDate: '2026-06-07',
    intro: '伊朗6次参加世界杯均止步小组赛，但1998年2-1胜美国和2018年1-1平葡萄牙展现了波斯铁骑的实力。阿兹蒙、塔雷米等球员在欧洲联赛站稳脚跟。',
    tags: ['波斯铁骑', '6次参赛', '阿兹蒙', '塔雷米'],
    source: SOURCE_FIFA,
    accuracyLevel: 'verified',
  },
  worldCupHistory: {
    teamId: 'IRN',
    records: [
      { year: 2022, host: '卡塔尔', result: '小组赛', finalRank: 20, wins: 1, draws: 0, losses: 2, goalsFor: 4, goalsAgainst: 7, matchesPlayed: 3, note: '2-0胜威尔士，2-6负英格兰' },
      { year: 2018, host: '俄罗斯', result: '小组赛', finalRank: 18, wins: 1, draws: 1, losses: 1, goalsFor: 2, goalsAgainst: 2, matchesPlayed: 3, note: '1-1平葡萄牙，1-0胜摩洛哥' },
      { year: 2014, host: '巴西', result: '小组赛', finalRank: 28, wins: 0, draws: 1, losses: 2, goalsFor: 1, goalsAgainst: 4, matchesPlayed: 3, note: '0-0平尼日利亚' },
      { year: 2006, host: '德国', result: '小组赛', finalRank: 25, wins: 0, draws: 1, losses: 2, goalsFor: 2, goalsAgainst: 6, matchesPlayed: 3, note: '1-1平安哥拉' },
      { year: 1998, host: '法国', result: '小组赛', finalRank: 17, wins: 1, draws: 0, losses: 2, goalsFor: 2, goalsAgainst: 4, matchesPlayed: 3, note: '2-1胜美国，政治意味深远' },
      { year: 1978, host: '阿根廷', result: '小组赛', finalRank: 14, wins: 0, draws: 1, losses: 2, goalsFor: 2, goalsAgainst: 8, matchesPlayed: 3, note: '1-1平苏格兰' },
    ],
    summary: '伊朗6次参加世界杯均止步小组赛。1998年2-1胜美国超越了体育本身，2018年1-1平葡萄牙险些出线。波斯铁骑始终是亚洲足球的强队，但世界杯出线仍是未解之题。',
    source: SOURCE_FIFA,
    accuracyLevel: 'verified',
  },
  qualification: {
    teamId: 'IRN',
    confederation: 'AFC',
    group: '第三轮A组',
    rank: 1,
    matchesPlayed: 10,
    wins: 8,
    draws: 1,
    losses: 1,
    goalsFor: 20,
    goalsAgainst: 5,
    points: 25,
    qualificationMethod: '亚洲区预选赛第三轮A组第1名直接晋级',
    keyMatches: [
      { date: '2025-06-05', opponent: '卡塔尔', venue: 'away', score: '2-1', result: 'win', note: '客场力克卡塔尔' },
      { date: '2025-10-15', opponent: '乌兹别克斯坦', venue: 'home', score: '3-0', result: 'win', note: '主场大胜乌兹别克' },
    ],
    source: SOURCE_FIFA,
    accuracyLevel: 'needs_review',
  },
  storyCards: [
    {
      id: 'irn-story-1',
      teamId: 'IRN',
      type: 'classic_match',
      title: '1998小组赛：2-1胜美国',
      content: '1998年6月21日，里昂热尔兰球场。伊朗在世界杯小组赛2-1击败美国。埃斯蒂利第40分钟首开记录，马达维基亚第84分钟锁定胜局。这是两国断交后首次在体育赛场正面交锋，赛前双方合影赠花的画面成为经典。这场比赛超越了体育，成为外交史上的重要时刻。',
      source: SOURCE_MEDIA,
      accuracyLevel: 'verified',
    },
  ],
};
