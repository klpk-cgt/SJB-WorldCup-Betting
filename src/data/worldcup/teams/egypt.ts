import type { TeamCompleteProfile } from '../../../types/worldcup';

const SOURCE_FIFA: import('../../../types/worldcup').DataSource = { name: 'FIFA官网', url: 'https://www.fifa.com', level: 'A', date: '2026-06-08' };
const SOURCE_WIKI: import('../../../types/worldcup').DataSource = { name: 'Wikipedia', level: 'C', date: '2026-06-08' };
const SOURCE_MEDIA: import('../../../types/worldcup').DataSource = { name: '体育媒体综合', level: 'D', date: '2026-06-08' };

export const EGYPT_PROFILE: TeamCompleteProfile = {
  profile: {
    teamId: 'EGY',
    nameZh: '埃及',
    nameEn: 'Egypt',
    confederation: 'CAF',
    coachName: '鲁伊·维多利亚',
    coachNationality: '葡萄牙',
    captainName: '穆罕默德·埃尔内尼',
    fifaRank: 33,
    worldCupAppearances: 3,
    bestResult: '小组赛',
    titles: 0,
    squadValue: 90000000,
    squadValueDate: '2026-06-07',
    intro: '埃及3次参加世界杯均止步小组赛，但7次非洲杯冠军傲视非洲。萨拉赫时代虽未能改变世界杯命运，但法老军团在非洲赛场始终是不可忽视的力量。',
    tags: ['法老军团', '7次非洲杯', '萨拉赫时代', '世界杯魔咒'],
    source: SOURCE_FIFA,
    accuracyLevel: 'verified',
  },
  worldCupHistory: {
    teamId: 'EGY',
    records: [
      { year: 2018, host: '俄罗斯', result: '小组赛', finalRank: 26, wins: 0, draws: 0, losses: 3, goalsFor: 2, goalsAgainst: 6, matchesPlayed: 3, note: '萨拉赫2球，1-3负俄罗斯' },
      { year: 1990, host: '意大利', result: '小组赛', finalRank: 20, wins: 0, draws: 2, losses: 1, goalsFor: 1, goalsAgainst: 2, matchesPlayed: 3, note: '1-1平荷兰' },
      { year: 1934, host: '意大利', result: '十六强', finalRank: 13, wins: 0, draws: 0, losses: 1, goalsFor: 2, goalsAgainst: 4, matchesPlayed: 1, note: '2-4负匈牙利' },
    ],
    summary: '埃及3次参加世界杯均止步小组赛（1934年为淘汰赛制首战出局）。7次非洲杯冠军是非洲之最，但世界杯始终是法老军团的魔咒。2018年萨拉赫带伤参赛仍未能出线。',
    source: SOURCE_FIFA,
    accuracyLevel: 'verified',
  },
  qualification: {
    teamId: 'EGY',
    confederation: 'CAF',
    group: '第三轮B组',
    rank: 1,
    matchesPlayed: 6,
    wins: 5,
    draws: 0,
    losses: 1,
    goalsFor: 13,
    goalsAgainst: 3,
    points: 15,
    qualificationMethod: '非洲区预选赛第三轮B组第1名直接晋级',
    keyMatches: [
      { date: '2025-06-09', opponent: '塞内加尔', venue: 'home', score: '2-1', result: 'win', note: '主场力克塞内加尔' },
      { date: '2025-11-17', opponent: '摩洛哥', venue: 'away', score: '1-0', result: 'win', note: '客场小胜摩洛哥' },
    ],
    source: SOURCE_FIFA,
    accuracyLevel: 'needs_review',
  },
  storyCards: [
    {
      id: 'egy-story-1',
      teamId: 'EGY',
      type: 'trivia',
      title: '萨拉赫的眼泪：2018世界杯之殇',
      content: '2018年世界杯前，萨拉赫在欧冠决赛被拉莫斯拉伤肩膀，带伤出征世界杯。虽在对沙特和俄罗斯各入一球，但埃及三连败出局。赛后萨拉赫独坐替补席的画面令人心碎。2026年将是萨拉赫最后一届世界杯，法老军团能否为他圆梦？',
      source: SOURCE_MEDIA,
      accuracyLevel: 'verified',
    },
  ],
};
