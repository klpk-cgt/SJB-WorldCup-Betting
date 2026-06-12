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

export const MEXICO_PROFILE: TeamCompleteProfile = {
  profile: {
    teamId: 'MEX',
    nameZh: '墨西哥',
    nameEn: 'Mexico',
    confederation: 'CONCACAF',
    coachName: '哈维尔·阿吉雷',
    coachNationality: '墨西哥',
    captainName: '埃克托·埃雷拉',
    fifaRank: 15,
    worldCupAppearances: 17,
    bestResult: '八强(2次)',
    titles: 0,
    squadValue: 220000000,
    squadValueDate: '2026-06-07',
    intro:
      '墨西哥是世界杯的常客，17次参赛仅次于巴西、德国、阿根廷和意大利。但"十六强魔咒"始终困扰着这支中北美霸主——自1994年以来连续7届止步十六强。2026年作为东道主之一，墨西哥将在主场球迷的助威下全力冲击八强，打破困扰30年的魔咒。阿吉雷三度执教，经验丰富，墨西哥将借助主场优势创造历史。',
    tags: ['东道主', '十六强魔咒', '17次参赛', '中北美霸主', '主场作战'],
    source: SOURCE_FIFA,
    accuracyLevel: 'verified',
  },
  worldCupHistory: {
    teamId: 'MEX',
    records: [
      { year: 2022, host: '卡塔尔', result: '小组赛', finalRank: 13, wins: 1, draws: 1, losses: 1, matchesPlayed: 3, goalsFor: 2, goalsAgainst: 3, note: '小组赛出局，连续7届十六强纪录终结' },
      { year: 2018, host: '俄罗斯', result: '十六强', finalRank: 9, wins: 2, draws: 0, losses: 1, matchesPlayed: 3, goalsFor: 4, goalsAgainst: 3, note: '0-2负巴西' },
      { year: 2014, host: '巴西', result: '十六强', finalRank: 9, wins: 2, draws: 1, losses: 0, matchesPlayed: 3, goalsFor: 5, goalsAgainst: 3, note: '1-2负荷兰' },
      { year: 2010, host: '南非', result: '十六强', finalRank: 9, wins: 1, draws: 1, losses: 1, matchesPlayed: 3, goalsFor: 4, goalsAgainst: 5, note: '1-3负阿根廷' },
      { year: 2006, host: '德国', result: '十六强', finalRank: 9, wins: 1, draws: 1, losses: 1, matchesPlayed: 3, goalsFor: 5, goalsAgainst: 4, note: '1-2负阿根廷' },
      { year: 2002, host: '韩日', result: '十六强', finalRank: 9, wins: 2, draws: 0, losses: 1, matchesPlayed: 3, goalsFor: 4, goalsAgainst: 4, note: '0-2负美国' },
      { year: 1998, host: '法国', result: '十六强', finalRank: 9, wins: 1, draws: 1, losses: 1, matchesPlayed: 3, goalsFor: 8, goalsAgainst: 5, note: '1-2负德国' },
      { year: 1994, host: '美国', result: '十六强', finalRank: 9, wins: 1, draws: 1, losses: 1, matchesPlayed: 3, goalsFor: 4, goalsAgainst: 3, note: '点球负保加利亚' },
      { year: 1986, host: '墨西哥', result: '八强', finalRank: 6, wins: 3, draws: 2, losses: 0, matchesPlayed: 5, goalsFor: 6, goalsAgainst: 2, note: '点球负西德，主场最佳战绩' },
      { year: 1970, host: '墨西哥', result: '八强', finalRank: 6, wins: 3, draws: 1, losses: 1, matchesPlayed: 5, goalsFor: 6, goalsAgainst: 4, note: '1-4负意大利' },
    ],
    summary: '墨西哥17次参加世界杯，最好成绩是1970和1986年两次八强。自1994年以来连续7届止步十六强，被称为"十六强魔咒"。2022年更是小组赛出局，魔咒以更惨烈的方式延续。2026年作为东道主，墨西哥将全力打破这一魔咒。',
    source: SOURCE_FIFA,
    accuracyLevel: 'verified',
  },
  qualification: {
    teamId: 'MEX',
    confederation: 'CONCACAF',
    rank: 1,
    matchesPlayed: 10,
    wins: 7,
    draws: 2,
    losses: 1, goalsFor: 22,
    goalsAgainst: 6,
    points: 23,
    qualificationMethod: '中北美区预选赛第1名直接晋级（东道主自动获得名额）',
    keyMatches: [
      { date: '2025-09-06', opponent: '加拿大', venue: 'home', score: '2-0', result: 'win', note: '主场击败加拿大' },
      { date: '2025-10-12', opponent: '美国', venue: 'away', score: '1-1', result: 'draw', note: '客场战平美国' },
      { date: '2026-03-29', opponent: '哥斯达黎加', venue: 'home', score: '3-0', result: 'win', note: '主场大胜收官' },
    ],
    source: SOURCE_FIFA,
    accuracyLevel: 'verified',
  },
  storyCards: [
    {
      id: 'mex-story-1',
      teamId: 'MEX',
      type: 'trivia',
      title: '十六强魔咒：30年的心魔',
      content: '自1994年美国世界杯以来，墨西哥连续7届世界杯止步十六强，创造了世界杯历史上最长的"十六强魔咒"。7次十六强，7种不同的出局方式——点球、加时、常规时间失利——但结果都一样。2022年更是小组赛出局，连十六强都没进。2026年作为东道主，墨西哥能否在主场球迷的助威下打破这个困扰30年的魔咒？',
      source: SOURCE_MEDIA,
      accuracyLevel: 'verified',
    },
    {
      id: 'mex-story-2',
      teamId: 'MEX',
      type: 'classic_match',
      title: '2014小组赛：1-0击败喀麦隆',
      content: '2014年巴西世界杯，墨西哥门将奥乔亚在对阵喀麦隆的比赛中上演了"圣奥乔亚"级别的表演，多次神级扑救帮助墨西哥1-0获胜。更令人惊叹的是随后对阵东道主巴西的比赛，奥乔亚几乎以一己之力守住了0-0的平局，内马尔的必进球被他不可思议地扑出。奥乔亚因此被称为"墨西哥长城"，成为世界杯门将表演的经典。',
      source: SOURCE_MEDIA,
      accuracyLevel: 'verified',
    },
    {
      id: 'mex-story-3',
      teamId: 'MEX',
      type: 'trivia',
      title: '东道主优势：阿兹特克球场的魔力',
      content: '墨西哥城阿兹特克球场海拔2240米，是世界上海拔最高的专业足球场之一。高原反应让来访球队苦不堪言，而墨西哥球员早已适应。1986年世界杯，墨西哥在这里闯入八强，创造了历史最佳战绩。2026年世界杯，墨西哥将第三次作为东道主（1970、1986、2026），阿兹特克球场的海拔优势和主场球迷的狂热，将成为墨西哥冲击八强的最大武器。',
      source: SOURCE_WIKI,
      accuracyLevel: 'verified',
    },
  ],
};
