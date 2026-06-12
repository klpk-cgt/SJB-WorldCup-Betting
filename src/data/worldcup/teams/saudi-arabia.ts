import type { TeamCompleteProfile } from '../../../types/worldcup';

const SOURCE_FIFA: import('../../../types/worldcup').DataSource = { name: 'FIFA官网', url: 'https://www.fifa.com', level: 'A', date: '2026-06-08' };
const SOURCE_WIKI: import('../../../types/worldcup').DataSource = { name: 'Wikipedia', level: 'C', date: '2026-06-08' };
const SOURCE_MEDIA: import('../../../types/worldcup').DataSource = { name: '体育媒体综合', level: 'D', date: '2026-06-08' };

export const SAUDI_ARABIA_PROFILE: TeamCompleteProfile = {
  profile: {
    teamId: 'KSA',
    nameZh: '沙特阿拉伯',
    nameEn: 'Saudi Arabia',
    confederation: 'AFC',
    coachName: '埃尔韦·勒纳尔',
    coachNationality: '法国',
    captainName: '萨尔曼·法拉杰',
    fifaRank: 54,
    worldCupAppearances: 6,
    bestResult: '十六强(1994)',
    titles: 0,
    squadValue: 40000000,
    squadValueDate: '2026-06-07',
    intro: '沙特阿拉伯6次参加世界杯，1994年闯入十六强创造历史。2022年2-1击败阿根廷的惊天冷门震惊世界，沙漠绿鹰在世界杯上总能制造惊喜。',
    tags: ['沙漠绿鹰', '1994十六强', '2-1胜阿根廷', '勒纳尔回归'],
    source: SOURCE_FIFA,
    accuracyLevel: 'verified',
  },
  worldCupHistory: {
    teamId: 'KSA',
    records: [
      { year: 2022, host: '卡塔尔', result: '小组赛', finalRank: 24, wins: 1, draws: 0, losses: 2, goalsFor: 3, goalsAgainst: 5, matchesPlayed: 3, note: '2-1胜阿根廷，0-2负波兰，1-2负墨西哥' },
      { year: 2018, host: '俄罗斯', result: '小组赛', finalRank: 26, wins: 0, draws: 0, losses: 2, goalsFor: 2, goalsAgainst: 7, matchesPlayed: 3, note: '0-5负俄罗斯' },
      { year: 2006, host: '德国', result: '小组赛', finalRank: 24, wins: 0, draws: 1, losses: 2, goalsFor: 2, goalsAgainst: 7, matchesPlayed: 3, note: '0-4负乌克兰' },
      { year: 2002, host: '韩日', result: '小组赛', finalRank: 32, wins: 0, draws: 0, losses: 3, goalsFor: 0, goalsAgainst: 12, matchesPlayed: 3, note: '0-8负德国，当届最差' },
      { year: 1998, host: '法国', result: '小组赛', finalRank: 28, wins: 0, draws: 0, losses: 3, goalsFor: 2, goalsAgainst: 7, matchesPlayed: 3, note: '三连败出局' },
      { year: 1994, host: '美国', result: '十六强', finalRank: 12, wins: 2, draws: 0, losses: 2, goalsFor: 5, goalsAgainst: 6, matchesPlayed: 4, note: '1-0胜比利时，奥维兰千里走单骑' },
    ],
    summary: '沙特阿拉伯6次参加世界杯，1994年闯入十六强创造历史。2022年2-1击败阿根廷是世界杯历史上最令人震惊的冷门之一。但2002年0-8负德国也是沙特足球最黑暗的时刻。',
    source: SOURCE_FIFA,
    accuracyLevel: 'verified',
  },
  qualification: {
    teamId: 'KSA',
    confederation: 'AFC',
    group: '第三轮B组',
    rank: 3,
    matchesPlayed: 10,
    wins: 5,
    draws: 2,
    losses: 3,
    goalsFor: 14,
    goalsAgainst: 9,
    points: 17,
    qualificationMethod: '亚洲区预选赛第三轮B组第3名通过附加赛晋级',
    keyMatches: [
      { date: '2025-06-05', opponent: '中国', venue: 'home', score: '3-0', result: 'win', note: '主场大胜中国' },
      { date: '2026-03-24', opponent: '阿曼', venue: 'neutral', score: '2-0', result: 'win', note: '附加赛击败阿曼' },
    ],
    source: SOURCE_FIFA,
    accuracyLevel: 'needs_review',
  },
  storyCards: [
    {
      id: 'ksa-story-1',
      teamId: 'KSA',
      type: 'classic_match',
      title: '2022小组赛：2-1逆转阿根廷',
      content: '2022年11月22日，卢塞尔体育场。沙特阿拉伯在世界杯小组赛2-1逆转阿根廷。梅西第10分钟点球为阿根廷取得领先，但下半场谢赫里第48分钟扳平，阿尔道萨里第53分钟世界波反超。阿根廷36场不败纪录终结，这是世界杯历史上最令人震惊的冷门之一。',
      source: SOURCE_MEDIA,
      accuracyLevel: 'verified',
    },
    {
      id: 'ksa-story-2',
      teamId: 'KSA',
      type: 'classic_match',
      title: '1994奥维兰千里走单骑',
      content: '1994年美国世界杯，沙特对阵比利时。赛义德·奥维兰从本方半场带球连过4名比利时球员后推射破门，这个进球被誉为世界杯历史上最精彩的个人突破之一，堪比马拉多纳1986年对英格兰的世纪进球。沙特1-0击败比利时闯入十六强。',
      source: SOURCE_MEDIA,
      accuracyLevel: 'verified',
    },
  ],
};
