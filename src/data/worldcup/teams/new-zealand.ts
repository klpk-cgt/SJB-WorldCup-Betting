import type { TeamCompleteProfile } from '../../../types/worldcup';

const SOURCE_FIFA: import('../../../types/worldcup').DataSource = { name: 'FIFA官网', url: 'https://www.fifa.com', level: 'A', date: '2026-06-08' };
const SOURCE_WIKI: import('../../../types/worldcup').DataSource = { name: 'Wikipedia', level: 'C', date: '2026-06-08' };
const SOURCE_MEDIA: import('../../../types/worldcup').DataSource = { name: '体育媒体综合', level: 'D', date: '2026-06-08' };

export const NEW_ZEALAND_PROFILE: TeamCompleteProfile = {
  profile: {
    teamId: 'NZL',
    nameZh: '新西兰',
    nameEn: 'New Zealand',
    confederation: 'OFC',
    coachName: '丹尼·海伊',
    coachNationality: '新西兰',
    captainName: '克里斯·伍德',
    fifaRank: 90,
    worldCupAppearances: 2,
    bestResult: '小组赛',
    titles: 0,
    squadValue: 30000000,
    squadValueDate: '2026-06-07',
    intro: '新西兰2次参加世界杯均止步小组赛，但2010年三战三平保持不败却因进球少出局，堪称最遗憾的出局方式。克里斯·伍德是球队攻城拔寨的核心。',
    tags: ['全白军团', '2010不败出局', '伍德核心', '大洋洲代表'],
    source: SOURCE_FIFA,
    accuracyLevel: 'verified',
  },
  worldCupHistory: {
    teamId: 'NZL',
    records: [
      { year: 2010, host: '南非', result: '小组赛', finalRank: 14, wins: 0, draws: 3, losses: 0, goalsFor: 2, goalsAgainst: 2, matchesPlayed: 3, note: '1-1平意大利，三战不败仍出局' },
      { year: 1982, host: '西班牙', result: '小组赛', finalRank: 23, wins: 0, draws: 0, losses: 3, goalsFor: 2, goalsAgainst: 15, matchesPlayed: 3, note: '首次参赛，0-5负苏格兰' },
    ],
    summary: '新西兰2次参加世界杯均止步小组赛。2010年三战三平保持不败却因进球少出局，是世界杯历史上最遗憾的出局方式之一。1-1平意大利是经典战役。',
    source: SOURCE_FIFA,
    accuracyLevel: 'verified',
  },
  qualification: {
    teamId: 'NZL',
    confederation: 'OFC',
    group: '大洋洲预选赛',
    rank: 1,
    matchesPlayed: 6,
    wins: 5,
    draws: 1,
    losses: 0,
    goalsFor: 18,
    goalsAgainst: 3,
    points: 16,
    qualificationMethod: '大洋洲预选赛第1名通过洲际附加赛晋级',
    keyMatches: [
      { date: '2025-09-06', opponent: '新喀里多尼亚', venue: 'home', score: '3-0', result: 'win', note: '主场大胜新喀里多尼亚' },
      { date: '2026-03-24', opponent: '巴林', venue: 'neutral', score: '1-0', result: 'win', note: '洲际附加赛击败巴林' },
    ],
    source: SOURCE_FIFA,
    accuracyLevel: 'needs_review',
  },
  storyCards: [
    {
      id: 'nzl-story-1',
      teamId: 'NZL',
      type: 'trivia',
      title: '2010：不败却出局的世界杯奇闻',
      content: '2010年南非世界杯，新西兰三战三平保持不败：1-1平斯洛伐克，1-1平意大利，0-0平巴拉圭。然而3分1个净胜球让他们排名小组第三出局。新西兰成为世界杯历史上唯一一支不败却未能出线的球队，这段"光荣的出局"令人唏嘘。',
      source: SOURCE_MEDIA,
      accuracyLevel: 'verified',
    },
  ],
};
