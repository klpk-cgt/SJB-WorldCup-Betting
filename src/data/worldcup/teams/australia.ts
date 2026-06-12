import type { TeamCompleteProfile } from '../../../types/worldcup';

const SOURCE_FIFA: import('../../../types/worldcup').DataSource = { name: 'FIFA官网', url: 'https://www.fifa.com', level: 'A', date: '2026-06-08' };
const SOURCE_WIKI: import('../../../types/worldcup').DataSource = { name: 'Wikipedia', level: 'C', date: '2026-06-08' };
const SOURCE_MEDIA: import('../../../types/worldcup').DataSource = { name: '体育媒体综合', level: 'D', date: '2026-06-08' };

export const AUSTRALIA_PROFILE: TeamCompleteProfile = {
  profile: {
    teamId: 'AUS',
    nameZh: '澳大利亚',
    nameEn: 'Australia',
    confederation: 'AFC',
    coachName: '托尼·波波维奇',
    coachNationality: '澳大利亚',
    captainName: '马修·瑞安',
    fifaRank: 25,
    worldCupAppearances: 6,
    bestResult: '十六强',
    titles: 0,
    squadValue: 90000000,
    squadValueDate: '2026-06-07',
    intro: '澳大利亚6次参加世界杯，2006年闯入十六强。从大洋洲转战亚洲后，袋鼠军团成为亚洲足球的重要力量，2022年再次闯入十六强展现竞争力。',
    tags: ['袋鼠军团', '2006十六强', '亚洲劲旅', '波波维奇执教'],
    source: SOURCE_FIFA,
    accuracyLevel: 'verified',
  },
  worldCupHistory: {
    teamId: 'AUS',
    records: [
      { year: 2022, host: '卡塔尔', result: '十六强', finalRank: 9, wins: 2, draws: 0, losses: 2, goalsFor: 4, goalsAgainst: 5, matchesPlayed: 4, note: '1-2负阿根廷，1-0胜丹麦' },
      { year: 2018, host: '俄罗斯', result: '小组赛', finalRank: 26, wins: 0, draws: 1, losses: 2, goalsFor: 2, goalsAgainst: 5, matchesPlayed: 3, note: '1-1平丹麦' },
      { year: 2014, host: '巴西', result: '小组赛', finalRank: 30, wins: 0, draws: 0, losses: 3, goalsFor: 3, goalsAgainst: 9, matchesPlayed: 3, note: '三连败出局' },
      { year: 2010, host: '南非', result: '小组赛', finalRank: 21, wins: 1, draws: 1, losses: 1, goalsFor: 3, goalsAgainst: 5, matchesPlayed: 3, note: '2-1胜塞尔维亚' },
      { year: 2006, host: '德国', result: '十六强', finalRank: 9, wins: 1, draws: 1, losses: 1, goalsFor: 5, goalsAgainst: 6, matchesPlayed: 4, note: '0-1负意大利，格罗索争议点球' },
    ],
    summary: '澳大利亚6次参加世界杯，2006和2022年两次闯入十六强。2006年0-1负意大利的争议点球令人难忘。加入亚足联后澳大利亚在亚洲区预选赛中保持强势。',
    source: SOURCE_FIFA,
    accuracyLevel: 'verified',
  },
  qualification: {
    teamId: 'AUS',
    confederation: 'AFC',
    group: '第三轮B组',
    rank: 2,
    matchesPlayed: 10,
    wins: 6,
    draws: 2,
    losses: 2,
    goalsFor: 17,
    goalsAgainst: 7,
    points: 20,
    qualificationMethod: '亚洲区预选赛第三轮B组第2名直接晋级',
    keyMatches: [
      { date: '2025-06-05', opponent: '日本', venue: 'away', score: '0-2', result: 'loss', note: '客场负日本' },
      { date: '2025-10-15', opponent: '沙特阿拉伯', venue: 'home', score: '3-1', result: 'win', note: '主场大胜沙特' },
    ],
    source: SOURCE_FIFA,
    accuracyLevel: 'needs_review',
  },
  storyCards: [
    {
      id: 'aus-story-1',
      teamId: 'AUS',
      type: 'classic_match',
      title: '2006十六强：格罗索的争议点球',
      content: '2006年6月26日，凯泽斯劳滕。澳大利亚在1/8决赛0-1负于意大利。第95分钟，格罗索突入禁区与尼尔接触倒地，裁判判罚点球，托蒂主罚命中绝杀。这个争议判罚至今仍被澳大利亚球迷视为不公，但澳大利亚在世界杯上的顽强表现赢得了尊重。',
      source: SOURCE_MEDIA,
      accuracyLevel: 'verified',
    },
  ],
};
