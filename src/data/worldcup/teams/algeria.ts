import type { TeamCompleteProfile } from '../../../types/worldcup';

const SOURCE_FIFA: import('../../../types/worldcup').DataSource = { name: 'FIFA官网', url: 'https://www.fifa.com', level: 'A', date: '2026-06-08' };
const SOURCE_WIKI: import('../../../types/worldcup').DataSource = { name: 'Wikipedia', level: 'C', date: '2026-06-08' };
const SOURCE_MEDIA: import('../../../types/worldcup').DataSource = { name: '体育媒体综合', level: 'D', date: '2026-06-08' };

export const ALGERIA_PROFILE: TeamCompleteProfile = {
  profile: {
    teamId: 'DZA',
    nameZh: '阿尔及利亚',
    nameEn: 'Algeria',
    confederation: 'CAF',
    coachName: '弗拉基米尔·佩特科维奇',
    coachNationality: '波黑',
    captainName: '里亚德·马赫雷斯',
    fifaRank: 41,
    worldCupAppearances: 4,
    bestResult: '十六强(2014)',
    titles: 0,
    squadValue: 150000000,
    squadValueDate: '2026-06-07',
    intro: '阿尔及利亚4次参加世界杯，2014年闯入十六强创造历史。马赫雷斯领衔的沙漠之狐是非洲足球的重要力量，1982年击败西德是世界杯经典冷门。',
    tags: ['沙漠之狐', '2014十六强', '马赫雷斯', '1982冷门'],
    source: SOURCE_FIFA,
    accuracyLevel: 'verified',
  },
  worldCupHistory: {
    teamId: 'DZA',
    records: [
      { year: 2014, host: '巴西', result: '十六强', finalRank: 9, wins: 1, draws: 1, losses: 1, goalsFor: 6, goalsAgainst: 5, matchesPlayed: 4, note: '1-2负德国加时赛，4-2胜韩国' },
      { year: 2010, host: '南非', result: '小组赛', finalRank: 22, wins: 0, draws: 1, losses: 2, goalsFor: 0, goalsAgainst: 2, matchesPlayed: 3, note: '0-0平英格兰' },
      { year: 1986, host: '墨西哥', result: '小组赛', finalRank: 22, wins: 0, draws: 1, losses: 2, goalsFor: 1, goalsAgainst: 5, matchesPlayed: 3, note: '1-1平北爱尔兰' },
      { year: 1982, host: '西班牙', result: '小组赛', finalRank: 13, wins: 1, draws: 0, losses: 2, goalsFor: 5, goalsAgainst: 5, matchesPlayed: 3, note: '2-1胜西德，遭"希洪之耻"出局' },
    ],
    summary: '阿尔及利亚4次参加世界杯，2014年闯入十六强创造历史。1982年2-1胜西德是经典冷门，但西德和奥地利的"希洪默契球"让阿尔及利亚出局，直接促使FIFA将末轮同时开球。',
    source: SOURCE_FIFA,
    accuracyLevel: 'verified',
  },
  qualification: {
    teamId: 'DZA',
    confederation: 'CAF',
    group: '第三轮H组',
    rank: 1,
    matchesPlayed: 6,
    wins: 4,
    draws: 1,
    losses: 1,
    goalsFor: 10,
    goalsAgainst: 4,
    points: 13,
    qualificationMethod: '非洲区预选赛第三轮H组第1名直接晋级',
    keyMatches: [
      { date: '2025-06-09', opponent: '几内亚', venue: 'home', score: '3-0', result: 'win', note: '主场大胜几内亚' },
      { date: '2025-11-17', opponent: '乌干达', venue: 'away', score: '1-0', result: 'win', note: '客场小胜乌干达' },
    ],
    source: SOURCE_FIFA,
    accuracyLevel: 'needs_review',
  },
  storyCards: [
    {
      id: 'dza-story-1',
      teamId: 'DZA',
      type: 'trivia',
      title: '希洪之耻：改变世界杯规则的默契球',
      content: '1982年世界杯，阿尔及利亚2-1击败西德，但一天后西德1-0胜奥地利，两队默契地各取所需携手出线，阿尔及利亚因净胜球劣势被淘汰。这场比赛被称为"希洪之耻"，直接促使FIFA将小组赛末轮改为同时开球。阿尔及利亚的牺牲换来了世界杯规则的进步。',
      source: SOURCE_MEDIA,
      accuracyLevel: 'verified',
    },
  ],
};
