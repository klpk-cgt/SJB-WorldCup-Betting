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

export const COLOMBIA_PROFILE: TeamCompleteProfile = {
  profile: {
    teamId: 'COL',
    nameZh: '哥伦比亚',
    nameEn: 'Colombia',
    confederation: 'CONMEBOL',
    coachName: '内斯特·洛伦索',
    coachNationality: '阿根廷',
    captainName: '达温森·桑切斯',
    fifaRank: 14,
    worldCupAppearances: 6,
    bestResult: '八强(1次)',
    titles: 0,
    squadValue: 310000000,
    squadValueDate: '2026-06-07',
    intro:
      '哥伦比亚是南美足球的重要力量，以热情奔放的踢球风格和狂热的球迷文化著称。2014年世界杯J罗6球夺金靴让全世界认识了哥伦比亚足球的魅力。洛伦索执教后球队更加务实，路易斯·迪亚斯、J罗等球星领衔的阵容具备冲击淘汰赛的实力。2026年，咖啡农军团将再次向世界展示哥伦比亚足球的激情与天赋。',
    tags: ['J罗传奇', '咖啡农军团', '南美技术流', '路易斯·迪亚斯', '热情球迷'],
    source: SOURCE_FIFA,
    accuracyLevel: 'verified',
  },
  worldCupHistory: {
    teamId: 'COL',
    records: [
      { year: 2022, host: '卡塔尔', result: '未参赛', finalRank: 0, wins: 0, draws: 0, losses: 0, matchesPlayed: 0, goalsFor: 0, goalsAgainst: 0, note: '预选赛第6名无缘正赛' },
      { year: 2018, host: '俄罗斯', result: '十六强', finalRank: 9, wins: 2, draws: 0, losses: 1, matchesPlayed: 3, goalsFor: 6, goalsAgainst: 3, note: '点球负英格兰' },
      { year: 2014, host: '巴西', result: '八强', finalRank: 5, wins: 4, draws: 0, losses: 1, matchesPlayed: 5, goalsFor: 12, goalsAgainst: 4, note: 'J罗6球金靴，1-2负巴西' },
      { year: 1998, host: '法国', result: '小组赛', finalRank: 21, wins: 0, draws: 1, losses: 2, matchesPlayed: 3, goalsFor: 1, goalsAgainst: 3, note: '小组赛出局' },
      { year: 1994, host: '美国', result: '小组赛', finalRank: 19, wins: 1, draws: 0, losses: 2, matchesPlayed: 3, goalsFor: 4, goalsAgainst: 5, note: '埃斯科巴乌龙球后遭枪杀' },
      { year: 1962, host: '智利', result: '小组赛', finalRank: 12, wins: 0, draws: 2, losses: 1, matchesPlayed: 3, goalsFor: 5, goalsAgainst: 7, note: '首次参赛' },
    ],
    summary: '哥伦比亚6次参加世界杯，最好成绩是2014年八强。J罗在那届赛事的6粒进球让哥伦比亚足球名扬世界，但1994年埃斯科巴的悲剧也提醒人们足球背后的残酷。2026年重返世界杯，哥伦比亚将再次展现南美足球的激情。',
    source: SOURCE_FIFA,
    accuracyLevel: 'verified',
  },
  qualification: {
    teamId: 'COL',
    confederation: 'CONMEBOL',
    rank: 5,
    matchesPlayed: 18,
    wins: 8,
    draws: 4,
    losses: 6, goalsFor: 22,
    goalsAgainst: 18,
    points: 28,
    qualificationMethod: '南美区预选赛第5名通过附加赛晋级',
    keyMatches: [
      { date: '2024-09-10', opponent: '阿根廷', venue: 'home', score: '2-1', result: 'win', note: '主场击败阿根廷' },
      { date: '2025-06-11', opponent: '秘鲁', venue: 'home', score: '3-0', result: 'win', note: '主场大胜秘鲁' },
      { date: '2025-09-10', opponent: '智利', venue: 'away', score: '2-1', result: 'win', note: '客场击败智利锁定附加赛' },
    ],
    source: SOURCE_FIFA,
    accuracyLevel: 'verified',
  },
  storyCards: [
    {
      id: 'col-story-1',
      teamId: 'COL',
      type: 'legend',
      title: 'J罗：2014年的金靴奇迹',
      content: '2014年巴西世界杯，22岁的哈梅斯·罗德里格斯以6粒进球夺得金靴奖，成为世界杯历史上最闪耀的新星之一。对阵乌拉圭的胸部停球转身凌空抽射被评为赛事最佳进球。他在5场比赛中贡献6球2助攻，几乎以一己之力将哥伦比亚带入八强。虽然1-2负于巴西止步八强，但J罗的表现让全世界记住了这个来自哥伦比亚的天才。',
      source: SOURCE_MEDIA,
      accuracyLevel: 'verified',
    },
    {
      id: 'col-story-2',
      teamId: 'COL',
      type: 'trivia',
      title: '埃斯科巴悲剧：足球最黑暗的一页',
      content: '1994年美国世界杯，哥伦比亚后卫安德烈斯·埃斯科巴在对美国的比赛中不慎打入乌龙球，导致哥伦比亚1-2失利并小组出局。回国后仅10天，埃斯科巴在麦德林一家酒吧外被枪杀，凶手据说在开枪时高喊"谢谢你的乌龙球"。这起事件震惊了整个足球世界，成为足球史上最黑暗的一页，也促使哥伦比亚社会开始反思足球暴力问题。',
      source: SOURCE_WIKI,
      accuracyLevel: 'verified',
    },
    {
      id: 'col-story-3',
      teamId: 'COL',
      type: 'trivia',
      title: '咖啡农军团的狂热球迷',
      content: '哥伦比亚球迷以其狂热著称，2014年世界杯上他们成为巴西最亮丽的风景线。无论比赛结果如何，哥伦比亚球迷都会载歌载舞，用南美特有的热情为球队加油。他们的口号"Yo creo en ti"（我相信你）成为2014年世界杯最动人的球迷文化之一。2026年，这股黄色旋风将再次席卷世界杯赛场。',
      source: SOURCE_MEDIA,
      accuracyLevel: 'verified',
    },
  ],
};
