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

export const PORTUGAL_PROFILE: TeamCompleteProfile = {
  profile: {
    teamId: 'POR',
    nameZh: '葡萄牙',
    nameEn: 'Portugal',
    confederation: 'UEFA',
    coachName: '罗伯托·马丁内斯',
    coachNationality: '西班牙',
    captainName: '克里斯蒂亚诺·罗纳尔多',
    fifaRank: 6,
    worldCupAppearances: 8,
    bestResult: '季军(1次)',
    titles: 0,
    squadValue: 1050000000,
    squadValueDate: '2026-06-07',
    intro:
      '葡萄牙是近年来世界足坛最具天赋的球队之一，2016年欧洲杯冠军证明了他们的实力。C罗的最后一届世界杯将成为2026年最动人的故事线，而B席、莱奥、鲁本·迪亚斯等球星让葡萄牙在任何比赛中都是夺冠热门。马丁内斯执教后球队攻击力大增，2026年将全力冲击队史首座大力神杯。',
    tags: ['C罗最后一舞', '欧洲杯冠军', '天赋爆棚', '马丁内斯执教', '冲击首冠'],
    source: SOURCE_FIFA,
    accuracyLevel: 'verified',
  },
  worldCupHistory: {
    teamId: 'POR',
    records: [
      { year: 2022, host: '卡塔尔', result: '八强', finalRank: 5, wins: 2, draws: 1, losses: 1, matchesPlayed: 4, goalsFor: 6, goalsAgainst: 5, note: '0-1负摩洛哥止步八强' },
      { year: 2018, host: '俄罗斯', result: '十六强', finalRank: 9, wins: 1, draws: 2, losses: 0, matchesPlayed: 3, goalsFor: 5, goalsAgainst: 4, note: '1-2负乌拉圭' },
      { year: 2014, host: '巴西', result: '小组赛', finalRank: 18, wins: 1, draws: 0, losses: 2, matchesPlayed: 3, goalsFor: 4, goalsAgainst: 7, note: '0-4惨败德国' },
      { year: 2010, host: '南非', result: '十六强', finalRank: 9, wins: 1, draws: 1, losses: 1, matchesPlayed: 3, goalsFor: 7, goalsAgainst: 1, note: '0-1负西班牙' },
      { year: 2006, host: '德国', result: '第四名', finalRank: 4, wins: 4, draws: 0, losses: 2, matchesPlayed: 6, goalsFor: 7, goalsAgainst: 5, note: '半决赛0-1负法国' },
      { year: 2002, host: '韩日', result: '小组赛', finalRank: 21, wins: 1, draws: 0, losses: 2, matchesPlayed: 3, goalsFor: 6, goalsAgainst: 4, note: '小组赛出局' },
      { year: 1986, host: '墨西哥', result: '小组赛', finalRank: 17, wins: 1, draws: 0, losses: 2, matchesPlayed: 3, goalsFor: 2, goalsAgainst: 4, note: '小组赛出局' },
      { year: 1966, host: '英格兰', result: '季军', finalRank: 3, wins: 4, draws: 0, losses: 1, matchesPlayed: 5, goalsFor: 9, goalsAgainst: 6, note: '尤西比奥9球夺金靴' },
    ],
    summary: '葡萄牙8次参加世界杯，最好成绩是1966年季军。虽然世界杯成绩不算突出，但2016年欧洲杯夺冠和近年来人才辈出，让葡萄牙成为2026年不可忽视的夺冠力量。C罗的最后一届世界杯更增添了传奇色彩。',
    source: SOURCE_FIFA,
    accuracyLevel: 'verified',
  },
  qualification: {
    teamId: 'POR',
    confederation: 'UEFA',
    group: 'F组',
    rank: 1,
    matchesPlayed: 8,
    wins: 7,
    draws: 1,
    losses: 0, goalsFor: 24,
    goalsAgainst: 4,
    points: 22,
    qualificationMethod: '欧洲区预选赛F组第1名直接晋级',
    keyMatches: [
      { date: '2025-09-06', opponent: '爱尔兰', venue: 'home', score: '4-0', result: 'win', note: '主场大胜开局' },
      { date: '2025-10-12', opponent: '瑞典', venue: 'away', score: '3-1', result: 'win', note: '客场击败瑞典' },
      { date: '2026-03-29', opponent: '爱尔兰', venue: 'away', score: '2-0', result: 'win', note: '客场完胜锁定头名' },
    ],
    source: SOURCE_FIFA,
    accuracyLevel: 'verified',
  },
  storyCards: [
    {
      id: 'por-story-1',
      teamId: 'POR',
      type: 'legend',
      title: 'C罗：世界杯的最后一舞',
      content: '克里斯蒂亚诺·罗纳尔多，足球史上最伟大的球员之一。2026年世界杯将是他第五次也是最后一次出征世界杯。从2006年21岁的青涩少年，到2026年41岁的传奇老将，C罗的世界杯之旅跨越了整整20年。虽然从未捧起大力神杯，但他的每一次出场都在书写历史。2026年，他能否以一座世界杯冠军为自己的国家队生涯画上完美句号？',
      source: SOURCE_MEDIA,
      accuracyLevel: 'verified',
    },
    {
      id: 'por-story-2',
      teamId: 'POR',
      type: 'legend',
      title: '尤西比奥：黑豹的1966',
      content: '1966年世界杯，24岁的尤西比奥以9粒进球夺得金靴奖，带领葡萄牙首次参加世界杯就获得季军。他在1/4决赛0-3落后朝鲜时连进4球完成大逆转，成为世界杯历史上最伟大的个人表演之一。这位来自莫桑比克的"黑豹"开创了葡萄牙足球的辉煌，至今仍是葡萄牙足球的象征。',
      source: SOURCE_WIKI,
      accuracyLevel: 'verified',
    },
    {
      id: 'por-story-3',
      teamId: 'POR',
      type: 'trivia',
      title: '世界杯无冠的遗憾',
      content: '葡萄牙是少数拥有金球奖得主（尤西比奥、菲戈、C罗）却从未赢得世界杯的国家之一。8次参赛，最好成绩仅为1966年季军。相比之下，他们在2016年欧洲杯上实现了突破。2026年，这支天赋异禀的球队能否在C罗的最后一届世界杯上弥补这个遗憾？',
      source: SOURCE_MEDIA,
      accuracyLevel: 'verified',
    },
  ],
};
