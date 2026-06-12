import type { TeamCompleteProfile } from '../../../types/worldcup';

const SOURCE_FIFA: import('../../../types/worldcup').DataSource = { name: 'FIFA官网', url: 'https://www.fifa.com', level: 'A', date: '2026-06-08' };
const SOURCE_WIKI: import('../../../types/worldcup').DataSource = { name: 'Wikipedia', level: 'C', date: '2026-06-08' };
const SOURCE_MEDIA: import('../../../types/worldcup').DataSource = { name: '体育媒体综合', level: 'D', date: '2026-06-08' };

export const SCOTLAND_PROFILE: TeamCompleteProfile = {
  profile: {
    teamId: 'SCO',
    nameZh: '苏格兰',
    nameEn: 'Scotland',
    confederation: 'UEFA',
    coachName: '史蒂夫·克拉克',
    coachNationality: '苏格兰',
    captainName: '安德鲁·罗伯逊',
    fifaRank: 44,
    worldCupAppearances: 8,
    bestResult: '小组赛',
    titles: 0,
    squadValue: 180000000,
    squadValueDate: '2026-06-07',
    intro: '苏格兰8次参加世界杯均止步小组赛，是世界杯历史上参赛次数最多却从未闯过小组赛的球队。罗伯逊和麦克托米奈领衔，苏格兰渴望打破宿命。',
    tags: ['风笛军团', '8次小组赛', '宿命之队', '罗伯逊领衔'],
    source: SOURCE_FIFA,
    accuracyLevel: 'verified',
  },
  worldCupHistory: {
    teamId: 'SCO',
    records: [
      { year: 1998, host: '法国', result: '小组赛', finalRank: 18, wins: 0, draws: 1, losses: 2, goalsFor: 2, goalsAgainst: 3, matchesPlayed: 3, note: '1-1平挪威' },
      { year: 1990, host: '意大利', result: '小组赛', finalRank: 13, wins: 1, draws: 0, losses: 2, goalsFor: 2, goalsAgainst: 3, matchesPlayed: 3, note: '2-1胜瑞典' },
      { year: 1986, host: '墨西哥', result: '小组赛', finalRank: 14, wins: 0, draws: 1, losses: 2, goalsFor: 1, goalsAgainst: 3, matchesPlayed: 3, note: '0-1负丹麦' },
      { year: 1982, host: '西班牙', result: '小组赛', finalRank: 15, wins: 1, draws: 1, losses: 1, goalsFor: 8, goalsAgainst: 8, matchesPlayed: 3, note: '5-2胜新西兰' },
      { year: 1978, host: '阿根廷', result: '小组赛', finalRank: 9, wins: 1, draws: 0, losses: 2, goalsFor: 5, goalsAgainst: 6, matchesPlayed: 3, note: '3-2胜荷兰' },
    ],
    summary: '苏格兰8次参加世界杯均止步小组赛，是世界杯历史上参赛最多却从未出线的球队。1978年3-2胜荷兰是经典战役。2026年苏格兰渴望打破这一宿命。',
    source: SOURCE_WIKI,
    accuracyLevel: 'verified',
  },
  qualification: {
    teamId: 'SCO',
    confederation: 'UEFA',
    group: 'A组',
    rank: 2,
    matchesPlayed: 10,
    wins: 6,
    draws: 2,
    losses: 2,
    goalsFor: 16,
    goalsAgainst: 7,
    points: 20,
    qualificationMethod: '欧洲区预选赛A组第2名通过附加赛晋级',
    keyMatches: [
      { date: '2025-10-14', opponent: '克罗地亚', venue: 'home', score: '2-1', result: 'win', note: '主场力克克罗地亚' },
      { date: '2026-03-24', opponent: '威尔士', venue: 'neutral', score: '2-0', result: 'win', note: '附加赛击败威尔士' },
    ],
    source: SOURCE_FIFA,
    accuracyLevel: 'needs_review',
  },
  storyCards: [
    {
      id: 'sco-story-1',
      teamId: 'SCO',
      type: 'classic_match',
      title: '1978小组赛：3-2胜荷兰',
      content: '1978年阿根廷世界杯，苏格兰在小组赛3-2击败最终亚军荷兰。达格利什和索内斯领衔的苏格兰打出了经典一战，但此前0-3负秘鲁和1-1平伊朗导致最终未能出线。这场胜利是苏格兰世界杯历史上最辉煌的时刻之一。',
      source: SOURCE_MEDIA,
      accuracyLevel: 'verified',
    },
    {
      id: 'sco-story-2',
      teamId: 'SCO',
      type: 'trivia',
      title: '小组赛魔咒：8次参赛0次出线',
      content: '苏格兰是世界杯历史上参赛次数最多却从未闯过小组赛的球队。8次出征，8次铩羽而归。1974年甚至1胜2平仍因净胜球劣势出局。2026年苏格兰能否打破这一"宿命"，成为全世界球迷关注的焦点。',
      source: SOURCE_MEDIA,
      accuracyLevel: 'verified',
    },
  ],
};
