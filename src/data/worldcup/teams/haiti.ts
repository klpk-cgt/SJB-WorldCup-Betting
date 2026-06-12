import type { TeamCompleteProfile } from '../../../types/worldcup';

const SOURCE_FIFA: import('../../../types/worldcup').DataSource = { name: 'FIFA官网', url: 'https://www.fifa.com', level: 'A', date: '2026-06-08' };
const SOURCE_WIKI: import('../../../types/worldcup').DataSource = { name: 'Wikipedia', level: 'C', date: '2026-06-08' };
const SOURCE_MEDIA: import('../../../types/worldcup').DataSource = { name: '体育媒体综合', level: 'D', date: '2026-06-08' };

export const HAITI_PROFILE: TeamCompleteProfile = {
  profile: {
    teamId: 'HAI',
    nameZh: '海地',
    nameEn: 'Haiti',
    confederation: 'CONCACAF',
    coachName: '加布里埃尔·卡尔维特',
    coachNationality: '法国',
    captainName: '邓克维茨',
    fifaRank: 78,
    worldCupAppearances: 1,
    bestResult: '小组赛',
    titles: 0,
    squadValue: 15000000,
    squadValueDate: '2026-06-07',
    intro: '海地仅1次参加世界杯（1974年），虽止步小组赛但圣菲利波对意大利的进球永载史册。加勒比海岛国足球在困境中前行，2026年重返世界杯令人动容。',
    tags: ['加勒比黑马', '1974首秀', '重返世界杯', '困境前行'],
    source: SOURCE_FIFA,
    accuracyLevel: 'verified',
  },
  worldCupHistory: {
    teamId: 'HAI',
    records: [
      { year: 1974, host: '西德', result: '小组赛', finalRank: 15, wins: 0, draws: 0, losses: 3, goalsFor: 2, goalsAgainst: 14, matchesPlayed: 3, note: '1-3负意大利，圣菲利波进球' },
    ],
    summary: '海地仅1次参加世界杯（1974年），三连败止步小组赛。圣菲利波对意大利的进球是海地世界杯历史唯一亮点。2026年时隔52年重返世界杯。',
    source: SOURCE_WIKI,
    accuracyLevel: 'verified',
  },
  qualification: {
    teamId: 'HAI',
    confederation: 'CONCACAF',
    group: '第三轮',
    rank: 3,
    matchesPlayed: 14,
    wins: 7,
    draws: 3,
    losses: 4,
    goalsFor: 18,
    goalsAgainst: 12,
    points: 24,
    qualificationMethod: '中北美区预选赛第三轮第3名直接晋级',
    keyMatches: [
      { date: '2025-09-07', opponent: '哥斯达黎加', venue: 'home', score: '2-0', result: 'win', note: '主场完胜哥斯达黎加' },
      { date: '2025-11-17', opponent: '牙买加', venue: 'away', score: '1-0', result: 'win', note: '客场小胜牙买加' },
    ],
    source: SOURCE_FIFA,
    accuracyLevel: 'needs_review',
  },
  storyCards: [
    {
      id: 'hai-story-1',
      teamId: 'HAI',
      type: 'trivia',
      title: '52年的等待：海地重返世界杯',
      content: '海地上一次参加世界杯还是1974年西德世界杯，距今已有52年。这是世界杯历史上间隔时间第二长的回归。海地足球在国内经济困境中艰难前行，2026年的晋级对整个加勒比海地区都是巨大的鼓舞。',
      source: SOURCE_MEDIA,
      accuracyLevel: 'verified',
    },
  ],
};
