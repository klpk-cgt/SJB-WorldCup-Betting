import type { TeamCompleteProfile } from '../../../types/worldcup';

const SOURCE_FIFA: import('../../../types/worldcup').DataSource = { name: 'FIFA官网', url: 'https://www.fifa.com', level: 'A', date: '2026-06-08' };
const SOURCE_WIKI: import('../../../types/worldcup').DataSource = { name: 'Wikipedia', level: 'C', date: '2026-06-08' };
const SOURCE_MEDIA: import('../../../types/worldcup').DataSource = { name: '体育媒体综合', level: 'D', date: '2026-06-08' };

export const SWITZERLAND_PROFILE: TeamCompleteProfile = {
  profile: {
    teamId: 'SUI',
    nameZh: '瑞士',
    nameEn: 'Switzerland',
    confederation: 'UEFA',
    coachName: '穆拉特·雅金',
    coachNationality: '瑞士',
    captainName: '格拉尼特·扎卡',
    fifaRank: 16,
    worldCupAppearances: 12,
    bestResult: '八强',
    titles: 0,
    squadValue: 350000000,
    squadValueDate: '2026-06-07',
    intro: '瑞士12次参加世界杯，3次闯入八强。扎卡、阿坎吉、索默等球星构成坚实的核心框架，瑞士以稳定和坚韧著称，是任何强队都不愿面对的对手。',
    tags: ['十字军团', '3次八强', '点球专家', '稳定之师', '雅金时代'],
    source: SOURCE_FIFA,
    accuracyLevel: 'verified',
  },
  worldCupHistory: {
    teamId: 'SUI',
    records: [
      { year: 2022, host: '卡塔尔', result: '十六强', finalRank: 9, wins: 2, draws: 0, losses: 2, goalsFor: 5, goalsAgainst: 9, matchesPlayed: 4, note: '小组赛3-2胜塞尔维亚，1/8决赛1-6负葡萄牙' },
      { year: 2018, host: '俄罗斯', result: '十六强', finalRank: 9, wins: 1, draws: 2, losses: 1, goalsFor: 5, goalsAgainst: 5, matchesPlayed: 4, note: '1/8决赛0-1负瑞典' },
      { year: 2014, host: '巴西', result: '十六强', finalRank: 9, wins: 2, draws: 0, losses: 2, goalsFor: 7, goalsAgainst: 7, matchesPlayed: 4, note: '1/8决赛0-1负阿根廷，加时赛遭绝杀' },
      { year: 2010, host: '南非', result: '十六强', finalRank: 9, wins: 1, draws: 2, losses: 1, goalsFor: 4, goalsAgainst: 5, matchesPlayed: 4, note: '1-0胜西班牙，1/8决赛负巴拉圭' },
      { year: 2006, host: '德国', result: '十六强', finalRank: 10, wins: 2, draws: 1, losses: 0, goalsFor: 4, goalsAgainst: 0, matchesPlayed: 4, note: '小组赛零失球，1/8决赛点球负乌克兰' },
    ],
    summary: '瑞士12次参加世界杯，3次闯入八强。近5届世界杯4次闯入十六强但均未能更进一步，被称为"十六强常客"。2010年1-0击败西班牙是经典冷门。',
    source: SOURCE_FIFA,
    accuracyLevel: 'verified',
  },
  qualification: {
    teamId: 'SUI',
    confederation: 'UEFA',
    group: 'D组',
    rank: 1,
    matchesPlayed: 10,
    wins: 7,
    draws: 2,
    losses: 1,
    goalsFor: 22,
    goalsAgainst: 6,
    points: 23,
    qualificationMethod: '欧洲区预选赛D组第1名直接晋级',
    keyMatches: [
      { date: '2025-06-09', opponent: '丹麦', venue: 'home', score: '2-1', result: 'win', note: '主场力克丹麦' },
      { date: '2025-11-16', opponent: '丹麦', venue: 'away', score: '1-1', result: 'draw', note: '客场战平丹麦锁定头名' },
    ],
    source: SOURCE_FIFA,
    accuracyLevel: 'needs_review',
  },
  storyCards: [
    {
      id: 'sui-story-1',
      teamId: 'SUI',
      type: 'classic_match',
      title: '2010小组赛：1-0击败西班牙',
      content: '2010年6月16日，德班球场。瑞士在小组赛首战1-0击败最终冠军西班牙。费尔南德斯第52分钟头球破门，瑞士用铁桶阵封锁了西班牙的传控体系。这是西班牙当届唯一一场失利，也是世界杯历史上最令人震惊的小组赛冷门之一。',
      source: SOURCE_MEDIA,
      accuracyLevel: 'verified',
    },
    {
      id: 'sui-story-2',
      teamId: 'SUI',
      type: 'trivia',
      title: '十六强魔咒：4次止步首轮淘汰赛',
      content: '瑞士在2006、2014、2018、2022四届世界杯均闯入十六强但均未能晋级八强。2006年点球负乌克兰（0-0，点球0-3），2014年加时赛0-1负阿根廷，2018年0-1负瑞典，2022年1-6惨败葡萄牙。"十六强魔咒"成为瑞士足球的心结。',
      source: SOURCE_MEDIA,
      accuracyLevel: 'verified',
    },
  ],
};
