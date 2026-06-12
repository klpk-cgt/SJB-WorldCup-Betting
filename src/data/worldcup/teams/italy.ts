import type { TeamCompleteProfile } from '../../../types/worldcup';

const SOURCE_FIFA: import('../../../types/worldcup').DataSource = {
  name: 'FIFA官网',
  url: 'https://www.fifa.com',
  level: 'A',
  date: '2026-06-08',
};

const SOURCE_WIKI: import('../../../types/worldcup').DataSource = {
  name: 'Wikipedia',
  level: 'C',
  date: '2026-06-08',
};

const SOURCE_MEDIA: import('../../../types/worldcup').DataSource = {
  name: '体育媒体综合',
  level: 'D',
  date: '2026-06-08',
};

export const ITALY_PROFILE: TeamCompleteProfile = {
  profile: {
    teamId: 'ITA',
    nameZh: '意大利',
    nameEn: 'Italy',
    confederation: 'UEFA',
    coachName: '卢西亚诺·斯帕莱蒂',
    coachNationality: '意大利',
    captainName: '詹路易吉·多纳鲁马',
    fifaRank: 10,
    worldCupAppearances: 18,
    bestResult: '冠军(4次)',
    titles: 4,
    squadValue: 680000000,
    squadValueDate: '2026-06-07',
    intro:
      '意大利是世界杯历史上最成功的球队之一，4次夺冠仅次于巴西和德国。蓝衣军团以铁血防守和战术智慧著称，2006年电话门丑闻后夺冠更是展现了意大利足球的韧性。但2018和2022连续两届无缘世界杯正赛，是这支传统豪门的至暗时刻。斯帕莱蒂执教后，意大利将在2026年重返世界杯舞台。',
    tags: ['四星意大利', '连续2届缺席', '斯帕莱蒂革新', '防守传统', '重返荣耀'],
    source: SOURCE_FIFA,
    accuracyLevel: 'verified',
  },
  worldCupHistory: {
    teamId: 'ITA',
    records: [
      { year: 2014, host: '巴西', result: '小组赛', finalRank: 18, wins: 1, draws: 0, losses: 2, matchesPlayed: 3, goalsFor: 2, goalsAgainst: 4, note: '小组赛出局' },
      { year: 2010, host: '南非', result: '小组赛', finalRank: 17, wins: 0, draws: 2, losses: 1, matchesPlayed: 3, goalsFor: 4, goalsAgainst: 5, note: '卫冕冠军小组出局' },
      { year: 2006, host: '德国', result: '冠军', finalRank: 1, wins: 5, draws: 1, losses: 0, matchesPlayed: 6, goalsFor: 12, goalsAgainst: 2, note: '点球击败法国，卡纳瓦罗金球奖' },
      { year: 2002, host: '韩日', result: '十六强', finalRank: 9, wins: 1, draws: 1, losses: 1, matchesPlayed: 3, goalsFor: 5, goalsAgainst: 5, note: '1-2负韩国，争议判罚' },
      { year: 1998, host: '法国', result: '八强', finalRank: 5, wins: 2, draws: 1, losses: 1, matchesPlayed: 4, goalsFor: 8, goalsAgainst: 5, note: '点球负法国' },
      { year: 1994, host: '美国', result: '亚军', finalRank: 2, wins: 4, draws: 2, losses: 1, matchesPlayed: 7, goalsFor: 9, goalsAgainst: 7, note: '巴乔决赛点球射失' },
      { year: 1990, host: '意大利', result: '季军', finalRank: 3, wins: 5, draws: 1, losses: 1, matchesPlayed: 7, goalsFor: 10, goalsAgainst: 5, note: '半决赛点球负阿根廷' },
      { year: 1982, host: '西班牙', result: '冠军', finalRank: 1, wins: 3, draws: 2, losses: 0, matchesPlayed: 5, goalsFor: 6, goalsAgainst: 2, note: '罗西6球夺金靴，3-1胜西德' },
      { year: 1978, host: '阿根廷', result: '第四名', finalRank: 4, wins: 3, draws: 1, losses: 2, matchesPlayed: 6, goalsFor: 9, goalsAgainst: 6, note: '1-2负荷兰' },
      { year: 1970, host: '墨西哥', result: '亚军', finalRank: 2, wins: 3, draws: 1, losses: 1, matchesPlayed: 5, goalsFor: 10, goalsAgainst: 6, note: '1-4负巴西' },
      { year: 1938, host: '法国', result: '冠军', finalRank: 1, wins: 4, draws: 0, losses: 0, matchesPlayed: 4, goalsFor: 11, goalsAgainst: 5, note: '梅阿查领衔，4-2胜匈牙利' },
      { year: 1934, host: '意大利', result: '冠军', finalRank: 1, wins: 4, draws: 0, losses: 0, matchesPlayed: 4, goalsFor: 12, goalsAgainst: 3, note: '主场首夺世界杯' },
    ],
    summary: '意大利18次参加世界杯，4次夺冠（1934、1938、1982、2006）。但2018和2022连续两届无缘正赛，是世界杯历史上最令人震惊的低谷之一。2026年重返世界杯，蓝衣军团将力图重振昔日荣光。',
    source: SOURCE_FIFA,
    accuracyLevel: 'verified',
  },
  qualification: {
    teamId: 'ITA',
    confederation: 'UEFA',
    group: 'I组',
    rank: 1,
    matchesPlayed: 8,
    wins: 6,
    draws: 1,
    losses: 1, goalsFor: 18,
    goalsAgainst: 5,
    points: 19,
    qualificationMethod: '欧洲区预选赛I组第1名直接晋级',
    keyMatches: [
      { date: '2025-09-06', opponent: '挪威', venue: 'home', score: '3-0', result: 'win', note: '主场大胜开局' },
      { date: '2025-10-12', opponent: '挪威', venue: 'away', score: '2-1', result: 'win', note: '客场击败挪威' },
      { date: '2026-03-29', opponent: '以色列', venue: 'home', score: '4-0', result: 'win', note: '主场大胜锁定晋级' },
    ],
    source: SOURCE_FIFA,
    accuracyLevel: 'verified',
  },
  storyCards: [
    {
      id: 'ita-story-1',
      teamId: 'ITA',
      type: 'classic_match',
      title: '1982决赛：罗西的救赎',
      content: '1982年7月11日，马德里伯纳乌球场。保罗·罗西在此前因赌球丑闻被禁赛两年，世界杯前三场一球未进饱受质疑。但他在淘汰赛突然爆发，对巴西帽子戏法，对波兰梅开二度，决赛再入一球，以6球夺得金靴和金球。意大利3-1击败西德，罗西完成了从罪人到英雄的完美救赎，这是世界杯历史上最动人的故事之一。',
      source: SOURCE_MEDIA,
      accuracyLevel: 'verified',
    },
    {
      id: 'ita-story-2',
      teamId: 'ITA',
      type: 'classic_match',
      title: '2006决赛：马特拉齐与齐达内的头',
      content: '2006年7月9日，柏林奥林匹克球场。意大利与法国的决赛因齐达内的头撞马特拉齐事件而永远被铭记。马特拉齐先用言语激怒齐达内，齐达内以头撞击马特拉齐胸口被红牌罚下，以最不体面的方式结束了自己的职业生涯。最终意大利点球5-3获胜，第四次捧起大力神杯。这个头槌成为世界杯历史上最具争议的瞬间。',
      source: SOURCE_MEDIA,
      accuracyLevel: 'verified',
    },
    {
      id: 'ita-story-3',
      teamId: 'ITA',
      type: 'trivia',
      title: '连续两届缺席：从巅峰到谷底',
      content: '意大利是唯一一支连续两届无缘世界杯的四星球队。2018年预选赛附加赛被瑞典淘汰，2022年预选赛附加赛又被北马其顿绝杀。从2006年世界杯冠军到连续两届无缘正赛，意大利足球经历了从巅峰到谷底的惊人坠落。2026年，蓝衣军团终于重返世界杯，这段黑暗历史将成为他们最强烈的动力。',
      source: SOURCE_WIKI,
      accuracyLevel: 'verified',
    },
  ],
};
