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

export const BELGIUM_PROFILE: TeamCompleteProfile = {
  profile: {
    teamId: 'BEL',
    nameZh: '比利时',
    nameEn: 'Belgium',
    confederation: 'UEFA',
    coachName: '罗伯托·迪亚兹',
    coachNationality: '西班牙',
    captainName: '凯文·德布劳内',
    fifaRank: 5,
    worldCupAppearances: 14,
    bestResult: '季军(1次)',
    titles: 0,
    squadValue: 620000000,
    squadValueDate: '2026-06-07',
    intro:
      '比利时曾长期占据FIFA世界第一的排名，被誉为"黄金一代"。德布劳内、卢卡库、库尔图瓦等球星让比利时在2018年世界杯获得季军。虽然黄金一代逐渐老去，但新一代球员正在崛起。2026年世界杯将是德布劳内等核心球员的最后机会，也是比利时证明自己不仅仅是"纸面实力第一"的关键时刻。',
    tags: ['黄金一代', 'FIFA前5', '德布劳内核心', '2018季军', '最后机会'],
    source: SOURCE_FIFA,
    accuracyLevel: 'verified',
  },
  worldCupHistory: {
    teamId: 'BEL',
    records: [
      { year: 2022, host: '卡塔尔', result: '小组赛', finalRank: 17, wins: 1, draws: 0, losses: 2, matchesPlayed: 3, goalsFor: 1, goalsAgainst: 3, note: '0-2负摩洛哥，小组出局' },
      { year: 2018, host: '俄罗斯', result: '季军', finalRank: 3, wins: 5, draws: 0, losses: 1, matchesPlayed: 6, goalsFor: 16, goalsAgainst: 6, note: '2-0胜英格兰获季军' },
      { year: 2014, host: '巴西', result: '八强', finalRank: 5, wins: 3, draws: 0, losses: 1, matchesPlayed: 4, goalsFor: 6, goalsAgainst: 3, note: '0-1负阿根廷' },
      { year: 2002, host: '韩日', result: '十六强', finalRank: 9, wins: 1, draws: 2, losses: 0, matchesPlayed: 3, goalsFor: 6, goalsAgainst: 5, note: '0-2负巴西' },
      { year: 1998, host: '法国', result: '小组赛', finalRank: 19, wins: 0, draws: 3, losses: 0, matchesPlayed: 3, goalsFor: 3, goalsAgainst: 3, note: '三连平出局' },
      { year: 1994, host: '美国', result: '十六强', finalRank: 11, wins: 1, draws: 0, losses: 1, matchesPlayed: 2, goalsFor: 3, goalsAgainst: 4, note: '2-3负德国' },
      { year: 1990, host: '意大利', result: '十六强', finalRank: 9, wins: 1, draws: 1, losses: 1, matchesPlayed: 3, goalsFor: 3, goalsAgainst: 3, note: '0-1负英格兰' },
      { year: 1986, host: '墨西哥', result: '第四名', finalRank: 4, wins: 3, draws: 1, losses: 2, matchesPlayed: 6, goalsFor: 7, goalsAgainst: 7, note: '2-2点球负阿根廷' },
      { year: 1930, host: '乌拉圭', result: '小组赛', finalRank: 11, wins: 1, draws: 0, losses: 1, matchesPlayed: 2, goalsFor: 4, goalsAgainst: 5, note: '首届世界杯参赛' },
    ],
    summary: '比利时14次参加世界杯，最好成绩是2018年季军。虽然长期位居FIFA排名前列，但始终未能突破大赛瓶颈。德布劳内等黄金一代球员的2026年世界杯，可能是他们最后冲击大力神杯的机会。',
    source: SOURCE_FIFA,
    accuracyLevel: 'verified',
  },
  qualification: {
    teamId: 'BEL',
    confederation: 'UEFA',
    group: 'H组',
    rank: 1,
    matchesPlayed: 8,
    wins: 6,
    draws: 1,
    losses: 1, goalsFor: 20,
    goalsAgainst: 5,
    points: 19,
    qualificationMethod: '欧洲区预选赛H组第1名直接晋级',
    keyMatches: [
      { date: '2025-09-06', opponent: '威尔士', venue: 'home', score: '3-1', result: 'win', note: '德布劳内传射建功' },
      { date: '2025-10-12', opponent: '波兰', venue: 'away', score: '2-0', result: 'win', note: '客场完胜波兰' },
      { date: '2026-03-29', opponent: '威尔士', venue: 'away', score: '1-0', result: 'win', note: '客场小胜锁定晋级' },
    ],
    source: SOURCE_FIFA,
    accuracyLevel: 'verified',
  },
  storyCards: [
    {
      id: 'bel-story-1',
      teamId: 'BEL',
      type: 'classic_match',
      title: '2018八强：2-1逆转巴西',
      content: '2018年7月6日，喀山竞技场。比利时在1/4决赛中2-1逆转五冠王巴西，这是比利时世界杯历史上最伟大的胜利。费尔南迪尼奥的乌龙球为比利时打开局面，德布劳内一记世界波锁定胜局。虽然蒂亚戈·席尔瓦击中门柱，但库尔图瓦的神勇扑救确保了胜利。这场比赛证明了比利时黄金一代的实力。',
      source: SOURCE_MEDIA,
      accuracyLevel: 'verified',
    },
    {
      id: 'bel-story-2',
      teamId: 'BEL',
      type: 'trivia',
      title: 'FIFA第一却无冠：纸面实力的尴尬',
      content: '比利时在2018-2022年间长期占据FIFA世界排名第一的位置，却从未赢得任何大赛冠军。2018年世界杯季军、2020年欧洲杯八强、2022年世界杯小组出局——"FIFA第一"的排名与实际成绩形成了鲜明对比。比利时因此被戏称为"纸面实力第一"，2026年他们将努力摘掉这个标签。',
      source: SOURCE_MEDIA,
      accuracyLevel: 'verified',
    },
    {
      id: 'bel-story-3',
      teamId: 'BEL',
      type: 'legend',
      title: '德布劳内：中场大师的最后机会',
      content: '凯文·德布劳内被公认为当代最出色的中场球员之一。在曼城，他赢得了几乎所有俱乐部荣誉；但在国家队，他始终未能帮助比利时突破大赛瓶颈。2026年世界杯将是这位32岁中场大师最后冲击大力神杯的机会。他的传球视野、远射能力和比赛掌控力，将是比利时走多远的关键。',
      source: SOURCE_MEDIA,
      accuracyLevel: 'verified',
    },
  ],
};
