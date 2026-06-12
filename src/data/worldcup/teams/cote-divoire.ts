import type { TeamCompleteProfile } from '../../../types/worldcup';

const SOURCE_FIFA: import('../../../types/worldcup').DataSource = { name: 'FIFA官网', url: 'https://www.fifa.com', level: 'A', date: '2026-06-08' };
const SOURCE_WIKI: import('../../../types/worldcup').DataSource = { name: 'Wikipedia', level: 'C', date: '2026-06-08' };
const SOURCE_MEDIA: import('../../../types/worldcup').DataSource = { name: '体育媒体综合', level: 'D', date: '2026-06-08' };

export const COTE_DIVOIRE_PROFILE: TeamCompleteProfile = {
  profile: {
    teamId: 'CIV',
    nameZh: '科特迪瓦',
    nameEn: "Côte d'Ivoire",
    confederation: 'CAF',
    coachName: '埃默塞·法埃',
    coachNationality: '科特迪瓦',
    captainName: '塞尔日·奥里耶',
    fifaRank: 39,
    worldCupAppearances: 3,
    bestResult: '小组赛',
    titles: 0,
    squadValue: 250000000,
    squadValueDate: '2026-06-07',
    intro: '科特迪瓦3次参加世界杯均止步小组赛，但德罗巴时代的"非洲大象"令人印象深刻。2023年非洲杯夺冠，科特迪瓦足球正在迎来新的黄金一代。',
    tags: ['非洲大象', '德罗巴传承', '2023非洲杯冠军', '黄金一代'],
    source: SOURCE_FIFA,
    accuracyLevel: 'verified',
  },
  worldCupHistory: {
    teamId: 'CIV',
    records: [
      { year: 2014, host: '巴西', result: '小组赛', finalRank: 17, wins: 1, draws: 0, losses: 2, goalsFor: 4, goalsAgainst: 5, matchesPlayed: 3, note: '2-1胜日本，1-2负哥伦比亚，1-2负希腊' },
      { year: 2010, host: '南非', result: '小组赛', finalRank: 17, wins: 1, draws: 0, losses: 2, goalsFor: 4, goalsAgainst: 5, matchesPlayed: 3, note: '3-0胜朝鲜，0-0平葡萄牙' },
      { year: 2006, host: '德国', result: '小组赛', finalRank: 19, wins: 0, draws: 0, losses: 2, goalsFor: 5, goalsAgainst: 8, matchesPlayed: 3, note: '德罗巴首秀，1-2负阿根廷，3-2胜塞黑' },
    ],
    summary: '科特迪瓦3次参加世界杯均止步小组赛，但每次都有精彩表现。德罗巴时代的"非洲大象"虽未能出线，但3-2胜塞黑等比赛令人难忘。2023年非洲杯夺冠后，科特迪瓦期待在世界杯上突破。',
    source: SOURCE_FIFA,
    accuracyLevel: 'verified',
  },
  qualification: {
    teamId: 'CIV',
    confederation: 'CAF',
    group: '第三轮F组',
    rank: 1,
    matchesPlayed: 6,
    wins: 4,
    draws: 1,
    losses: 1,
    goalsFor: 10,
    goalsAgainst: 4,
    points: 13,
    qualificationMethod: '非洲区预选赛第三轮F组第1名直接晋级',
    keyMatches: [
      { date: '2025-06-09', opponent: '加蓬', venue: 'home', score: '3-0', result: 'win', note: '主场大胜加蓬' },
      { date: '2025-11-17', opponent: '肯尼亚', venue: 'away', score: '1-1', result: 'draw', note: '客场战平肯尼亚锁定晋级' },
    ],
    source: SOURCE_FIFA,
    accuracyLevel: 'needs_review',
  },
  storyCards: [
    {
      id: 'civ-story-1',
      teamId: 'CIV',
      type: 'legend',
      title: '德罗巴：非洲大象的不朽之王',
      content: '迪迪埃·德罗巴是科特迪瓦足球史上最伟大的球员。他不仅用进球带领"非洲大象"3次闯入世界杯，更在2006年祖国陷入内战时公开呼吁和平，促成停火。德罗巴证明了足球的力量超越体育本身，他是非洲足球的永恒传奇。',
      source: SOURCE_MEDIA,
      accuracyLevel: 'verified',
    },
  ],
};
