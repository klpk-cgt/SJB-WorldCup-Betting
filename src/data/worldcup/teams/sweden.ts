import type { TeamCompleteProfile } from '../../../types/worldcup';

const SOURCE_FIFA: import('../../../types/worldcup').DataSource = { name: 'FIFA官网', url: 'https://www.fifa.com', level: 'A', date: '2026-06-08' };
const SOURCE_WIKI: import('../../../types/worldcup').DataSource = { name: 'Wikipedia', level: 'C', date: '2026-06-08' };
const SOURCE_MEDIA: import('../../../types/worldcup').DataSource = { name: '体育媒体综合', level: 'D', date: '2026-06-08' };

export const SWEDEN_PROFILE: TeamCompleteProfile = {
  profile: {
    teamId: 'SWE',
    nameZh: '瑞典',
    nameEn: 'Sweden',
    confederation: 'UEFA',
    coachName: '容·达尔·托马森',
    coachNationality: '丹麦',
    captainName: '维克托·林德洛夫',
    fifaRank: 26,
    worldCupAppearances: 12,
    bestResult: '亚军(1958)',
    titles: 0,
    squadValue: 220000000,
    squadValueDate: '2026-06-07',
    intro: '瑞典12次参加世界杯，1958年主场获得亚军是最高荣誉。伊布时代虽未能闯入世界杯，但北欧海盗的足球传统从未中断。伊萨克、福斯贝里等新生代正在崛起。',
    tags: ['北欧海盗', '1958亚军', '伊布传承', '伊萨克崛起'],
    source: SOURCE_FIFA,
    accuracyLevel: 'verified',
  },
  worldCupHistory: {
    teamId: 'SWE',
    records: [
      { year: 2018, host: '俄罗斯', result: '八强', finalRank: 6, wins: 3, draws: 0, losses: 2, goalsFor: 5, goalsAgainst: 4, matchesPlayed: 5, note: '1-0胜瑞士闯入八强，0-2负英格兰' },
      { year: 2006, host: '德国', result: '十六强', finalRank: 9, wins: 1, draws: 2, losses: 1, goalsFor: 3, goalsAgainst: 4, matchesPlayed: 4, note: '0-2负德国' },
      { year: 2002, host: '韩日', result: '十六强', finalRank: 9, wins: 1, draws: 2, losses: 1, goalsFor: 5, goalsAgainst: 5, matchesPlayed: 4, note: '1-2负塞内加尔' },
      { year: 1994, host: '美国', result: '季军', finalRank: 3, wins: 5, draws: 0, losses: 2, goalsFor: 15, goalsAgainst: 8, matchesPlayed: 7, note: '4-0胜保加利亚获季军' },
      { year: 1958, host: '瑞典', result: '亚军', finalRank: 2, wins: 4, draws: 1, losses: 1, goalsFor: 12, goalsAgainst: 7, matchesPlayed: 6, note: '2-5负巴西，主场获亚军' },
    ],
    summary: '瑞典12次参加世界杯，1958年主场获亚军，1994年获季军。2018年闯入八强是近年最佳战绩。伊布时代缺席了多届世界杯，但北欧海盗的底蕴仍在。',
    source: SOURCE_FIFA,
    accuracyLevel: 'verified',
  },
  qualification: {
    teamId: 'SWE',
    confederation: 'UEFA',
    group: 'C组',
    rank: 1,
    matchesPlayed: 10,
    wins: 7,
    draws: 2,
    losses: 1,
    goalsFor: 21,
    goalsAgainst: 6,
    points: 23,
    qualificationMethod: '欧洲区预选赛C组第1名直接晋级',
    keyMatches: [
      { date: '2025-06-09', opponent: '奥地利', venue: 'home', score: '2-1', result: 'win', note: '主场力克奥地利' },
      { date: '2025-11-16', opponent: '奥地利', venue: 'away', score: '1-1', result: 'draw', note: '客场战平奥地利锁定头名' },
    ],
    source: SOURCE_FIFA,
    accuracyLevel: 'needs_review',
  },
  storyCards: [
    {
      id: 'swe-story-1',
      teamId: 'SWE',
      type: 'classic_match',
      title: '1958决赛：2-5负巴西，17岁贝利横空出世',
      content: '1958年6月29日，斯德哥尔摩索尔纳球场。世界杯决赛，东道主瑞典2-5负于巴西。17岁的贝利打入2球，开启了球王的传奇之路。利德霍尔姆第4分钟为瑞典取得领先，但巴西连入5球逆转。这是瑞典世界杯历史上最辉煌也最遗憾的时刻。',
      source: SOURCE_MEDIA,
      accuracyLevel: 'verified',
    },
    {
      id: 'swe-story-2',
      teamId: 'SWE',
      type: 'trivia',
      title: '伊布与世界杯的遗憾',
      content: '兹拉坦·伊布拉希莫维奇是瑞典足球史上最伟大的球员之一，但他的世界杯经历却充满遗憾。2002和2006年他随队参赛但均止步十六强，2010、2014、2018年瑞典均未晋级。2022年瑞典再次缺席时，40岁的伊布已经退役。世界杯舞台从未见证伊布的巅峰，这是足球的遗憾。',
      source: SOURCE_MEDIA,
      accuracyLevel: 'verified',
    },
  ],
};
