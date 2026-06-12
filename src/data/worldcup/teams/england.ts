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

export const ENGLAND_PROFILE: TeamCompleteProfile = {
  profile: {
    teamId: 'ENG',
    nameZh: '英格兰',
    nameEn: 'England',
    confederation: 'UEFA',
    coachName: '托马斯·图赫尔',
    coachNationality: '德国',
    captainName: '哈里·凯恩',
    fifaRank: 4,
    worldCupAppearances: 16,
    bestResult: '冠军(1次)',
    titles: 1,
    squadValue: 1520000000,
    squadValueDate: '2026-06-07',
    intro:
      '英格兰是现代足球的发源地，1966年在本土夺得唯一一座世界杯。三狮军团近年来人才井喷，贝林厄姆、萨卡、福登等新生代球星让球队身价高居世界第一。图赫尔2025年接任主帅，带来更务实的战术风格。2026年，英格兰将全力冲击"让足球回家"的梦想。',
    tags: ['1966冠军', '身价第一', '贝林厄姆领衔', '图赫尔执教', '让足球回家'],
    source: SOURCE_FIFA,
    accuracyLevel: 'verified',
  },
  worldCupHistory: {
    teamId: 'ENG',
    records: [
      { year: 2022, host: '卡塔尔', result: '八强', finalRank: 5, wins: 3, draws: 1, losses: 1, matchesPlayed: 5, goalsFor: 13, goalsAgainst: 4, note: '1-2负法国止步八强' },
      { year: 2018, host: '俄罗斯', result: '第四名', finalRank: 4, wins: 3, draws: 0, losses: 3, matchesPlayed: 6, goalsFor: 12, goalsAgainst: 8, note: '半决赛1-2负克罗地亚' },
      { year: 2014, host: '巴西', result: '小组赛', finalRank: 18, wins: 0, draws: 1, losses: 2, matchesPlayed: 3, goalsFor: 2, goalsAgainst: 4, note: '小组垫底出局' },
      { year: 2010, host: '南非', result: '十六强', finalRank: 9, wins: 1, draws: 2, losses: 0, matchesPlayed: 3, goalsFor: 3, goalsAgainst: 5, note: '1-4惨败德国' },
      { year: 2006, host: '德国', result: '八强', finalRank: 7, wins: 2, draws: 2, losses: 1, matchesPlayed: 5, goalsFor: 6, goalsAgainst: 4, note: '点球负葡萄牙' },
      { year: 2002, host: '韩日', result: '八强', finalRank: 6, wins: 2, draws: 1, losses: 1, matchesPlayed: 4, goalsFor: 6, goalsAgainst: 3, note: '1-2负巴西' },
      { year: 1998, host: '法国', result: '十六强', finalRank: 9, wins: 2, draws: 0, losses: 1, matchesPlayed: 3, goalsFor: 7, goalsAgainst: 4, note: '点球负阿根廷，贝克汉姆红牌' },
      { year: 1990, host: '意大利', result: '第四名', finalRank: 4, wins: 3, draws: 2, losses: 1, matchesPlayed: 6, goalsFor: 8, goalsAgainst: 6, note: '半决赛点球负西德' },
      { year: 1986, host: '墨西哥', result: '八强', finalRank: 6, wins: 2, draws: 1, losses: 1, matchesPlayed: 4, goalsFor: 7, goalsAgainst: 3, note: '1-2负阿根廷，马拉多纳上帝之手' },
      { year: 1966, host: '英格兰', result: '冠军', finalRank: 1, wins: 5, draws: 1, losses: 0, matchesPlayed: 6, goalsFor: 11, goalsAgainst: 3, note: '赫斯特决赛帽子戏法，4-2胜西德' },
    ],
    summary: '英格兰16次参加世界杯，1次夺冠（1966）。作为现代足球的发源地，英格兰的世界杯成绩长期未能匹配其足球地位。但2018年第四名和近年青年才俊的涌现，让三狮军团重新成为夺冠热门。',
    source: SOURCE_FIFA,
    accuracyLevel: 'verified',
  },
  qualification: {
    teamId: 'ENG',
    confederation: 'UEFA',
    group: 'K组',
    rank: 1,
    matchesPlayed: 8,
    wins: 7,
    draws: 1,
    losses: 0, goalsFor: 25,
    goalsAgainst: 3,
    points: 22,
    qualificationMethod: '欧洲区预选赛K组第1名直接晋级',
    keyMatches: [
      { date: '2025-09-06', opponent: '塞尔维亚', venue: 'home', score: '4-0', result: 'win', note: '图赫尔首秀大胜' },
      { date: '2025-10-12', opponent: '丹麦', venue: 'away', score: '2-1', result: 'win', note: '客场逆转丹麦' },
      { date: '2026-03-29', opponent: '塞尔维亚', venue: 'away', score: '3-0', result: 'win', note: '客场完胜锁定晋级' },
    ],
    source: SOURCE_FIFA,
    accuracyLevel: 'verified',
  },
  storyCards: [
    {
      id: 'eng-story-1',
      teamId: 'ENG',
      type: 'classic_match',
      title: '1966决赛：赫斯特的帽子戏法与门线悬案',
      content: '1966年7月30日，温布利球场。英格兰在决赛中4-2击败西德，赫斯特成为世界杯决赛史上唯一上演帽子戏法的球员。但他的第二粒进球是否越过门线至今仍是足球史上最大的悬案之一——皮球击中横梁弹地后是否完全越过门线？苏联裁判判罚进球有效，这个争议至今未消。无论如何，这是英格兰足球最辉煌的时刻。',
      source: SOURCE_MEDIA,
      accuracyLevel: 'verified',
    },
    {
      id: 'eng-story-2',
      teamId: 'ENG',
      type: 'rivalry',
      title: '英德大战：永恒的经典对决',
      content: '英格兰与德国的对决是世界杯历史上最具戏剧性的宿敌之战。1966年决赛4-2，1970年3-2被逆转，1990年半决赛点球大战，2010年1-4惨败……每一次英德大战都充满故事。兰帕德2010年的进球门线冤案，更是让这对宿敌的恩怨再添新章。两队在世界杯上的交锋，总是能制造出最令人难忘的瞬间。',
      source: SOURCE_MEDIA,
      accuracyLevel: 'verified',
    },
    {
      id: 'eng-story-3',
      teamId: 'ENG',
      type: 'trivia',
      title: '点球魔咒：三狮军团最深的痛',
      content: '英格兰在世界杯点球大战中的战绩堪称噩梦——1990年半决赛负西德，1998年十六强负阿根廷，2006年八强负葡萄牙，2018年十六强终于打破魔咒胜哥伦比亚。从1990到2018年，英格兰在大赛点球大战中仅赢过2次，"点球魔咒"成为三狮军团挥之不去的阴影。皮克福德2018年的扑救终于让这个魔咒开始松动。',
      source: SOURCE_WIKI,
      accuracyLevel: 'verified',
    },
  ],
};
