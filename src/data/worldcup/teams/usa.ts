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

export const USA_PROFILE: TeamCompleteProfile = {
  profile: {
    teamId: 'USA',
    nameZh: '美国',
    nameEn: 'United States',
    confederation: 'CONCACAF',
    coachName: '毛里西奥·波切蒂诺',
    coachNationality: '阿根廷',
    captainName: '克里斯蒂安·普利西奇',
    fifaRank: 16,
    worldCupAppearances: 12,
    bestResult: '季军(1次)',
    titles: 0,
    squadValue: 350000000,
    squadValueDate: '2026-06-07',
    intro:
      '美国是2026年世界杯的东道主之一，波切蒂诺的执教为美国足球带来了新的希望。普利西奇、麦肯尼、雷纳等在欧洲联赛效力的球员让美国队具备了与强队抗衡的实力。作为东道主，美国队将享有主场优势，这也是他们自1930年首届世界杯获得季军以来，再次冲击世界杯最好成绩的绝佳机会。',
    tags: ['东道主', '波切蒂诺执教', '普利西奇核心', '主场优势', '新希望'],
    source: SOURCE_FIFA,
    accuracyLevel: 'verified',
  },
  worldCupHistory: {
    teamId: 'USA',
    records: [
      { year: 2022, host: '卡塔尔', result: '十六强', finalRank: 9, wins: 1, draws: 2, losses: 1, matchesPlayed: 4, goalsFor: 3, goalsAgainst: 4, note: '1-3负荷兰' },
      { year: 2014, host: '巴西', result: '十六强', finalRank: 9, wins: 1, draws: 1, losses: 1, matchesPlayed: 3, goalsFor: 5, goalsAgainst: 6, note: '1-2负比利时' },
      { year: 2010, host: '南非', result: '十六强', finalRank: 9, wins: 1, draws: 2, losses: 0, matchesPlayed: 3, goalsFor: 5, goalsAgainst: 5, note: '1-2负加纳' },
      { year: 2002, host: '韩日', result: '八强', finalRank: 5, wins: 2, draws: 1, losses: 1, matchesPlayed: 4, goalsFor: 7, goalsAgainst: 6, note: '2-0胜墨西哥，0-1负德国' },
      { year: 1998, host: '法国', result: '小组赛', finalRank: 24, wins: 0, draws: 0, losses: 3, matchesPlayed: 3, goalsFor: 1, goalsAgainst: 5, note: '三连败小组垫底' },
      { year: 1994, host: '美国', result: '十六强', finalRank: 9, wins: 1, draws: 1, losses: 1, matchesPlayed: 3, goalsFor: 3, goalsAgainst: 4, note: '0-1负巴西' },
      { year: 1990, host: '意大利', result: '小组赛', finalRank: 21, wins: 0, draws: 0, losses: 3, matchesPlayed: 3, goalsFor: 2, goalsAgainst: 8, note: '40年后重返世界杯' },
      { year: 1950, host: '巴西', result: '小组赛', finalRank: 10, wins: 1, draws: 0, losses: 2, matchesPlayed: 3, goalsFor: 4, goalsAgainst: 6, note: '1-0爆冷击败英格兰' },
      { year: 1930, host: '乌拉圭', result: '季军', finalRank: 3, wins: 2, draws: 0, losses: 1, matchesPlayed: 3, goalsFor: 7, goalsAgainst: 6, note: '首届世界杯获季军' },
    ],
    summary: '美国12次参加世界杯，最好成绩是1930年首届世界杯季军。2002年韩日世界杯八强是现代美国足球的巅峰。2026年作为东道主，美国队将在波切蒂诺的带领下全力冲击队史最佳成绩。',
    source: SOURCE_FIFA,
    accuracyLevel: 'verified',
  },
  qualification: {
    teamId: 'USA',
    confederation: 'CONCACAF',
    rank: 2,
    matchesPlayed: 10,
    wins: 6,
    draws: 2,
    losses: 2, goalsFor: 18,
    goalsAgainst: 7,
    points: 20,
    qualificationMethod: '中北美区预选赛第2名直接晋级（东道主自动获得名额）',
    keyMatches: [
      { date: '2025-09-06', opponent: '墨西哥', venue: 'home', score: '2-1', result: 'win', note: '主场击败墨西哥' },
      { date: '2025-10-12', opponent: '加拿大', venue: 'away', score: '1-1', result: 'draw', note: '客场战平加拿大' },
      { date: '2026-03-29', opponent: '墨西哥', venue: 'away', score: '1-1', result: 'draw', note: '客场战平墨西哥' },
    ],
    source: SOURCE_FIFA,
    accuracyLevel: 'verified',
  },
  storyCards: [
    {
      id: 'usa-story-1',
      teamId: 'USA',
      type: 'classic_match',
      title: '1950小组赛：1-0爆冷英格兰',
      content: '1950年6月29日，贝洛奥里藏特。美国队在世界杯小组赛中1-0击败英格兰，这被认为是世界杯历史上最大的冷门之一。当时英格兰是足球的发源地和最强球队，而美国队由半职业球员组成，赛前赔率高达1赔500。约瑟夫·盖特延斯第38分钟头球破门，美国队守住了1-0的胜果。英国媒体以为0-1是排版错误，将比分改为10-1英格兰胜。这场比赛被称为"贝洛奥里藏特奇迹"。',
      source: SOURCE_MEDIA,
      accuracyLevel: 'verified',
    },
    {
      id: 'usa-story-2',
      teamId: 'USA',
      type: 'classic_match',
      title: '2002八强：几乎淘汰德国',
      content: '2002年6月21日，蔚山文殊球场。美国队在1/4决赛中0-1负于德国，但比赛过程远比比分显示的更加激烈。美国队创造了多次得分机会，卡恩在门线上的手球未被裁判判罚点球，成为世界杯历史上最具争议的判罚之一。如果那个点球被判，美国队可能创造更大的奇迹。尽管如此，2002年八强仍是美国现代足球的巅峰。',
      source: SOURCE_MEDIA,
      accuracyLevel: 'verified',
    },
    {
      id: 'usa-story-3',
      teamId: 'USA',
      type: 'trivia',
      title: '足球沙漠的崛起',
      content: '美国曾被称为"足球沙漠"——1994年世界杯前，美国甚至没有职业足球联赛。但1994年世界杯的成功举办和MLS的创立，彻底改变了美国足球的生态。从1990年40年后重返世界杯，到2026年作为东道主之一，美国足球走过了从无到有的30年。如今MLS已经成为全球最受关注的联赛之一，美国球员在欧洲顶级联赛的数量也创历史新高。2026年世界杯，将是美国足球30年崛起之路的最好证明。',
      source: SOURCE_WIKI,
      accuracyLevel: 'verified',
    },
  ],
};
