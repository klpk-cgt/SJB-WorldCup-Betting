import type { TeamCompleteProfile } from '../../../types/worldcup';

const SOURCE_FIFA: import('../../../types/worldcup').DataSource = { name: 'FIFA官网', url: 'https://www.fifa.com', level: 'A', date: '2026-06-08' };
const SOURCE_WIKI: import('../../../types/worldcup').DataSource = { name: 'Wikipedia', level: 'C', date: '2026-06-08' };
const SOURCE_MEDIA: import('../../../types/worldcup').DataSource = { name: '体育媒体综合', level: 'D', date: '2026-06-08' };

export const PANAMA_PROFILE: TeamCompleteProfile = {
  profile: {
    teamId: 'PAN',
    nameZh: '巴拿马',
    nameEn: 'Panama',
    confederation: 'CONCACAF',
    coachName: '托马斯·克里斯蒂安森',
    coachNationality: '丹麦',
    captainName: '阿尼巴尔·戈多伊',
    fifaRank: 73,
    worldCupAppearances: 1,
    bestResult: '小组赛',
    titles: 0,
    squadValue: 15000000,
    squadValueDate: '2026-06-07',
    intro: '巴拿马仅1次参加世界杯（2018年），三连败出局但洛曼·巴洛伊的历史性进球让全国沸腾。运河之国时隔8年重返世界杯，渴望证明自己。',
    tags: ['运河之国', '2018首秀', '巴洛伊进球', '重返世界杯'],
    source: SOURCE_FIFA,
    accuracyLevel: 'verified',
  },
  worldCupHistory: {
    teamId: 'PAN',
    records: [
      { year: 2018, host: '俄罗斯', result: '小组赛', finalRank: 29, wins: 0, draws: 0, losses: 3, goalsFor: 2, goalsAgainst: 11, matchesPlayed: 3, note: '1-6负英格兰，巴洛伊打入队史世界杯首球' },
    ],
    summary: '巴拿马仅1次参加世界杯（2018年），三连败止步小组赛。洛曼·巴洛伊对英格兰的头球是巴拿马世界杯历史首球，全国为之沸腾。2026年重返世界杯，运河之国渴望更多进球和胜利。',
    source: SOURCE_FIFA,
    accuracyLevel: 'verified',
  },
  qualification: {
    teamId: 'PAN',
    confederation: 'CONCACAF',
    group: '第三轮',
    rank: 5,
    matchesPlayed: 14,
    wins: 5,
    draws: 4,
    losses: 5,
    goalsFor: 14,
    goalsAgainst: 14,
    points: 19,
    qualificationMethod: '中北美区预选赛第三轮第5名通过附加赛晋级',
    keyMatches: [
      { date: '2025-09-07', opponent: '哥斯达黎加', venue: 'away', score: '1-0', result: 'win', note: '客场小胜哥斯达黎加' },
      { date: '2026-03-24', opponent: '萨尔瓦多', venue: 'neutral', score: '2-0', result: 'win', note: '附加赛击败萨尔瓦多' },
    ],
    source: SOURCE_FIFA,
    accuracyLevel: 'needs_review',
  },
  storyCards: [
    {
      id: 'pan-story-1',
      teamId: 'PAN',
      type: 'trivia',
      title: '巴洛伊的头球：巴拿马的世界杯第一球',
      content: '2018年6月24日，下诺夫哥罗德。巴拿马1-6负英格兰，但洛曼·巴洛伊第78分钟头球破门，打入了巴拿马世界杯历史首球。那一刻，巴拿马全国沸腾，即使大比分落后也无人离场。这个进球超越了比分本身，成为巴拿马足球史上最珍贵的时刻。',
      source: SOURCE_MEDIA,
      accuracyLevel: 'verified',
    },
  ],
};
