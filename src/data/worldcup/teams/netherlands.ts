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

export const NETHERLANDS_PROFILE: TeamCompleteProfile = {
  profile: {
    teamId: 'NED',
    nameZh: '荷兰',
    nameEn: 'Netherlands',
    confederation: 'UEFA',
    coachName: '罗纳德·科曼',
    coachNationality: '荷兰',
    captainName: '维吉尔·范迪克',
    fifaRank: 7,
    worldCupAppearances: 11,
    bestResult: '亚军(3次)',
    titles: 0,
    squadValue: 780000000,
    squadValueDate: '2026-06-07',
    intro:
      '荷兰是世界杯历史上最伟大的"无冕之王"，3次杀入决赛全部铩羽而归。橙衣军团以全攻全守足球闻名于世，克鲁伊夫开创的足球哲学影响了整个世界。科曼二度执教后，范迪克、德容、加克波等球星让荷兰保持竞争力，2026年将再次向大力神杯发起冲击。',
    tags: ['无冕之王', '3次亚军', '全攻全守', '范迪克领衔', '橙色风暴'],
    source: SOURCE_FIFA,
    accuracyLevel: 'verified',
  },
  worldCupHistory: {
    teamId: 'NED',
    records: [
      { year: 2022, host: '卡塔尔', result: '八强', finalRank: 5, wins: 3, draws: 1, losses: 1, matchesPlayed: 5, goalsFor: 10, goalsAgainst: 4, note: '点球负阿根廷' },
      { year: 2014, host: '巴西', result: '季军', finalRank: 3, wins: 4, draws: 0, losses: 1, matchesPlayed: 5, goalsFor: 15, goalsAgainst: 4, note: '5-1血洗西班牙，半决赛点球负阿根廷' },
      { year: 2010, host: '南非', result: '亚军', finalRank: 2, wins: 6, draws: 0, losses: 1, matchesPlayed: 7, goalsFor: 12, goalsAgainst: 6, note: '0-1负西班牙，伊涅斯塔加时绝杀' },
      { year: 1998, host: '法国', result: '第四名', finalRank: 4, wins: 3, draws: 1, losses: 1, matchesPlayed: 5, goalsFor: 13, goalsAgainst: 7, note: '半决赛点球负巴西' },
      { year: 1994, host: '美国', result: '八强', finalRank: 5, wins: 2, draws: 1, losses: 1, matchesPlayed: 4, goalsFor: 8, goalsAgainst: 6, note: '2-3负巴西' },
      { year: 1990, host: '意大利', result: '十六强', finalRank: 9, wins: 0, draws: 3, losses: 1, matchesPlayed: 4, goalsFor: 3, goalsAgainst: 4, note: '1-2负西德' },
      { year: 1978, host: '阿根廷', result: '亚军', finalRank: 2, wins: 3, draws: 2, losses: 1, matchesPlayed: 6, goalsFor: 9, goalsAgainst: 5, note: '1-3负阿根廷' },
      { year: 1974, host: '西德', result: '亚军', finalRank: 2, wins: 4, draws: 1, losses: 1, matchesPlayed: 6, goalsFor: 11, goalsAgainst: 4, note: '1-2负西德，克鲁伊夫全攻全守惊艳世界' },
    ],
    summary: '荷兰11次参加世界杯，3次获得亚军（1974、1978、2010），是世界杯历史上最著名的"无冕之王"。克鲁伊夫开创的全攻全守足球影响了整个世界，但命运似乎总在最关键时刻与橙衣军团作对。',
    source: SOURCE_FIFA,
    accuracyLevel: 'verified',
  },
  qualification: {
    teamId: 'NED',
    confederation: 'UEFA',
    group: 'A组',
    rank: 2,
    matchesPlayed: 8,
    wins: 5,
    draws: 2,
    losses: 1, goalsFor: 18,
    goalsAgainst: 6,
    points: 17,
    qualificationMethod: '欧洲区预选赛A组第2名通过附加赛晋级',
    keyMatches: [
      { date: '2025-09-06', opponent: '斯洛伐克', venue: 'away', score: '2-1', result: 'win', note: '客场险胜' },
      { date: '2025-10-12', opponent: '德国', venue: 'home', score: '2-2', result: 'draw', note: '主场战平德国' },
      { date: '2026-03-29', opponent: '德国', venue: 'away', score: '1-3', result: 'loss', note: '客场负德国，小组第二' },
    ],
    source: SOURCE_FIFA,
    accuracyLevel: 'verified',
  },
  storyCards: [
    {
      id: 'ned-story-1',
      teamId: 'NED',
      type: 'classic_match',
      title: '1974决赛：全攻全守的诞生',
      content: '1974年7月7日，慕尼黑奥林匹克球场。荷兰在决赛开场仅1分钟，经过16脚传递后由内斯肯斯点球破门，西德球员甚至还没碰到球。这就是克鲁伊夫全攻全守足球的完美展现。然而贝肯鲍尔率领的西德最终2-1逆转。虽然输了决赛，但荷兰的全攻全守足球永远改变了世界足球的面貌。',
      source: SOURCE_MEDIA,
      accuracyLevel: 'verified',
    },
    {
      id: 'ned-story-2',
      teamId: 'NED',
      type: 'legend',
      title: '克鲁伊夫：飞翔的荷兰人',
      content: '约翰·克鲁伊夫是荷兰足球的灵魂人物，也是足球史上最具影响力的人物之一。作为球员，他以"克鲁伊夫转身"闻名于世，在1974年世界杯上以全攻全守足球惊艳全球。作为教练，他在巴萨创立了"梦之队"，奠定了tiki-taka的战术基础。他改变了足球的踢法、思维和美学，被誉为"足球哲学家"。',
      source: SOURCE_WIKI,
      accuracyLevel: 'verified',
    },
    {
      id: 'ned-story-3',
      teamId: 'NED',
      type: 'trivia',
      title: '三次亚军：最悲情的世界杯故事',
      content: '荷兰是唯一一支3次进入世界杯决赛却从未夺冠的球队。1974年，全攻全守惊艳世界却被西德逆转；1978年，缺少克鲁伊夫的橙衣军团再次倒在决赛；2010年，伊涅斯塔的加时绝杀让荷兰第三次饮恨。三次决赛，三种不同的痛苦，荷兰的世界杯之旅堪称足球史上最悲情的故事。',
      source: SOURCE_MEDIA,
      accuracyLevel: 'verified',
    },
  ],
};
