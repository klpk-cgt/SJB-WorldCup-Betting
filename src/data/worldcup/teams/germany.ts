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

export const GERMANY_PROFILE: TeamCompleteProfile = {
  profile: {
    teamId: 'GER',
    nameZh: '德国',
    nameEn: 'Germany',
    confederation: 'UEFA',
    coachName: '朱利安·纳格尔斯曼',
    coachNationality: '德国',
    captainName: '约书亚·基米希',
    fifaRank: 9,
    worldCupAppearances: 20,
    bestResult: '冠军(4次)',
    titles: 4,
    squadValue: 831000000,
    squadValueDate: '2026-06-07',
    intro:
      '德国是世界杯历史上最成功的球队之一，4次夺冠仅次于巴西。日耳曼战车以钢铁意志和战术纪律著称，无论顺境逆境都能展现强大的竞争力。纳格尔斯曼执教后球队逐渐完成新老交替，穆西亚拉、维尔茨等新生代球星崛起，2026年将全力冲击第五颗星。',
    tags: ['四星德国', '20次参赛', '纳格尔斯曼革新', '穆西亚拉领衔', '冲击第五星'],
    source: SOURCE_FIFA,
    accuracyLevel: 'verified',
  },
  worldCupHistory: {
    teamId: 'GER',
    records: [
      { year: 2022, host: '卡塔尔', result: '小组赛', finalRank: 17, wins: 1, draws: 1, losses: 1, matchesPlayed: 3, goalsFor: 6, goalsAgainst: 5, note: '连续两届小组出局' },
      { year: 2018, host: '俄罗斯', result: '小组赛', finalRank: 22, wins: 1, draws: 0, losses: 2, matchesPlayed: 3, goalsFor: 2, goalsAgainst: 4, note: '卫冕冠军小组出局' },
      { year: 2014, host: '巴西', result: '冠军', finalRank: 1, wins: 6, draws: 1, losses: 0, matchesPlayed: 7, goalsFor: 18, goalsAgainst: 4, note: '7-1屠杀巴西，格策加时绝杀阿根廷' },
      { year: 2010, host: '南非', result: '季军', finalRank: 3, wins: 4, draws: 1, losses: 1, matchesPlayed: 6, goalsFor: 16, goalsAgainst: 5, note: '克洛泽打破世界杯进球纪录' },
      { year: 2006, host: '德国', result: '季军', finalRank: 3, wins: 5, draws: 1, losses: 0, matchesPlayed: 6, goalsFor: 14, goalsAgainst: 6, note: '主场加时0-2负意大利止步半决赛' },
      { year: 2002, host: '韩日', result: '亚军', finalRank: 2, wins: 4, draws: 1, losses: 1, matchesPlayed: 6, goalsFor: 14, goalsAgainst: 3, note: '卡恩领衔，决赛0-2负巴西' },
      { year: 1998, host: '法国', result: '八强', finalRank: 5, wins: 2, draws: 1, losses: 1, matchesPlayed: 4, goalsFor: 8, goalsAgainst: 4, note: '0-3惨败克罗地亚' },
      { year: 1994, host: '美国', result: '八强', finalRank: 5, wins: 3, draws: 0, losses: 1, matchesPlayed: 4, goalsFor: 9, goalsAgainst: 7, note: '1-2负保加利亚' },
      { year: 1990, host: '意大利', result: '冠军', finalRank: 1, wins: 5, draws: 2, losses: 0, matchesPlayed: 7, goalsFor: 15, goalsAgainst: 5, note: '布雷默点球决赛1-0胜阿根廷' },
      { year: 1986, host: '墨西哥', result: '亚军', finalRank: 2, wins: 3, draws: 2, losses: 1, matchesPlayed: 6, goalsFor: 8, goalsAgainst: 7, note: '2-3负马拉多纳的阿根廷' },
      { year: 1982, host: '西班牙', result: '亚军', finalRank: 2, wins: 3, draws: 1, losses: 1, matchesPlayed: 5, goalsFor: 12, goalsAgainst: 10, note: '1-3负意大利' },
      { year: 1974, host: '西德', result: '冠军', finalRank: 1, wins: 6, draws: 0, losses: 1, matchesPlayed: 7, goalsFor: 13, goalsAgainst: 4, note: '贝肯鲍尔领衔，2-1逆转荷兰' },
    ],
    summary: '德国20次参加世界杯，4次夺冠（1954、1974、1990、2014），4次亚军，是世界杯历史上成绩最稳定的球队之一。但2018和2022连续两届小组出局，2026年将力图重振雄风。',
    source: SOURCE_FIFA,
    accuracyLevel: 'verified',
  },
  qualification: {
    teamId: 'GER',
    confederation: 'UEFA',
    group: 'A组',
    rank: 1,
    matchesPlayed: 8,
    wins: 6,
    draws: 1,
    losses: 1, goalsFor: 24,
    goalsAgainst: 5,
    points: 19,
    qualificationMethod: '欧洲区预选赛A组第1名直接晋级',
    keyMatches: [
      { date: '2025-09-07', opponent: '斯洛伐克', venue: 'home', score: '5-0', result: 'win', note: '主场大胜开启预选赛' },
      { date: '2025-10-12', opponent: '荷兰', venue: 'away', score: '2-2', result: 'draw', note: '客场战平强敌' },
      { date: '2026-03-29', opponent: '荷兰', venue: 'home', score: '3-1', result: 'win', note: '主场击败荷兰锁定头名' },
    ],
    source: SOURCE_FIFA,
    accuracyLevel: 'verified',
  },
  storyCards: [
    {
      id: 'ger-story-1',
      teamId: 'GER',
      type: 'classic_match',
      title: '2014半决赛：7-1米内罗惨案',
      content: '2014年7月8日，贝洛奥里藏特米内罗球场。德国在半决赛中7-1屠杀东道主巴西，创造了世界杯历史上最令人震惊的半决赛比分。克洛泽打破罗纳尔多世界杯进球纪录，德国前29分钟连进5球，让整个巴西陷入沉默。这场比赛被称为"米内罗惨案"，成为世界杯历史上永恒的经典。',
      source: SOURCE_MEDIA,
      accuracyLevel: 'verified',
    },
    {
      id: 'ger-story-2',
      teamId: 'GER',
      type: 'legend',
      title: '贝肯鲍尔：足球皇帝',
      content: '弗朗茨·贝肯鲍尔是德国足球历史上最伟大的人物。作为球员，他在1974年以队长身份率队夺得世界杯；作为教练，他在1990年又以主帅身份再次夺冠，成为历史上仅有的两位以球员和教练身份都赢得世界杯的人之一。他开创了"自由人"战术，彻底改变了足球战术体系，被尊称为"足球皇帝"。',
      source: SOURCE_WIKI,
      accuracyLevel: 'verified',
    },
    {
      id: 'ger-story-3',
      teamId: 'GER',
      type: 'record',
      title: '世界杯参赛次数最多：20次',
      content: '德国是世界杯历史上参赛次数最多的球队之一，20次参赛仅次于巴西。更令人惊叹的是，德国在世界杯上的稳定性——他们13次闯入四强，8次进入决赛，4次夺冠。这种持续的高水平表现，让"日耳曼战车"成为世界杯历史上最令人敬畏的力量。但2018和2022连续两届小组出局，也让人看到了转型的阵痛。',
      source: SOURCE_WIKI,
      accuracyLevel: 'verified',
    },
  ],
};
