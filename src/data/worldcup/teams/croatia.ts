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

export const CROATIA_PROFILE: TeamCompleteProfile = {
  profile: {
    teamId: 'CRO',
    nameZh: '克罗地亚',
    nameEn: 'Croatia',
    confederation: 'UEFA',
    coachName: '兹拉特科·达利奇',
    coachNationality: '克罗地亚',
    captainName: '卢卡·莫德里奇',
    fifaRank: 11,
    worldCupAppearances: 6,
    bestResult: '亚军(1次)',
    titles: 0,
    squadValue: 380000000,
    squadValueDate: '2026-06-07',
    intro:
      '克罗地亚是世界杯历史上最令人惊叹的小国奇迹。1991年独立后仅7年就获得世界杯季军，2018年更是杀入决赛获得亚军。莫德里奇领衔的格子军团以坚韧不拔的精神和精湛的技术著称，总能在淘汰赛中爆发出惊人的能量。2026年莫德里奇可能迎来最后一届世界杯，格子军团将再次向世界证明小国也能创造大奇迹。',
    tags: ['小国奇迹', '2018亚军', '莫德里奇传奇', '加时赛之王', '格子军团'],
    source: SOURCE_FIFA,
    accuracyLevel: 'verified',
  },
  worldCupHistory: {
    teamId: 'CRO',
    records: [
      { year: 2022, host: '卡塔尔', result: '季军', finalRank: 3, wins: 3, draws: 2, losses: 2, matchesPlayed: 7, goalsFor: 8, goalsAgainst: 7, note: '半决赛0-3负阿根廷，2-1胜摩洛哥获季军' },
      { year: 2018, host: '俄罗斯', result: '亚军', finalRank: 2, wins: 4, draws: 2, losses: 1, matchesPlayed: 7, goalsFor: 14, goalsAgainst: 9, note: '2-4负法国，三场淘汰赛全部加时' },
      { year: 2014, host: '巴西', result: '小组赛', finalRank: 19, wins: 0, draws: 1, losses: 2, matchesPlayed: 3, goalsFor: 3, goalsAgainst: 6, note: '1-3负墨西哥出局' },
      { year: 2006, host: '德国', result: '小组赛', finalRank: 17, wins: 0, draws: 2, losses: 1, matchesPlayed: 3, goalsFor: 3, goalsAgainst: 4, note: '2-2平澳大利亚出局' },
      { year: 2002, host: '韩日', result: '小组赛', finalRank: 17, wins: 0, draws: 1, losses: 2, matchesPlayed: 3, goalsFor: 2, goalsAgainst: 3, note: '0-1负墨西哥出局' },
      { year: 1998, host: '法国', result: '季军', finalRank: 3, wins: 4, draws: 0, losses: 2, matchesPlayed: 6, goalsFor: 11, goalsAgainst: 5, note: '苏克6球夺金靴，独立后首次参赛' },
    ],
    summary: '克罗地亚6次参加世界杯，1次亚军（2018），2次季军（1998、2022）。作为一个仅400万人口的小国，克罗地亚的世界杯成绩堪称奇迹。尤其是2018年连续三场淘汰赛加时晋级决赛，展现了超凡的意志力。',
    source: SOURCE_FIFA,
    accuracyLevel: 'verified',
  },
  qualification: {
    teamId: 'CRO',
    confederation: 'UEFA',
    group: 'L组',
    rank: 1,
    matchesPlayed: 8,
    wins: 6,
    draws: 1,
    losses: 1, goalsFor: 17,
    goalsAgainst: 5,
    points: 19,
    qualificationMethod: '欧洲区预选赛L组第1名直接晋级',
    keyMatches: [
      { date: '2025-09-06', opponent: '捷克', venue: 'home', score: '3-0', result: 'win', note: '主场大胜开局' },
      { date: '2025-10-12', opponent: '捷克', venue: 'away', score: '1-1', result: 'draw', note: '客场战平捷克' },
      { date: '2026-03-29', opponent: '黑山', venue: 'home', score: '2-0', result: 'win', note: '主场获胜锁定晋级' },
    ],
    source: SOURCE_FIFA,
    accuracyLevel: 'verified',
  },
  storyCards: [
    {
      id: 'cro-story-1',
      teamId: 'CRO',
      type: 'classic_match',
      title: '2018半决赛：加时逆转英格兰',
      content: '2018年7月11日，莫斯科卢日尼基球场。克罗地亚在半决赛中0-1落后英格兰，但凭借佩里西奇第68分钟的扳平进球和曼朱基奇加时赛第109分钟的绝杀，2-1逆转英格兰闯入决赛。这是克罗地亚历史上最伟大的胜利，一个仅400万人口的小国杀入了世界杯决赛。全队拼到最后一刻的精神，让全世界为之动容。',
      source: SOURCE_MEDIA,
      accuracyLevel: 'verified',
    },
    {
      id: 'cro-story-2',
      teamId: 'CRO',
      type: 'legend',
      title: '莫德里奇：从战火中走出的金球先生',
      content: '卢卡·莫德里奇的童年在家乡扎达尔的战火中度过，他的祖父在战争中遇难。小小年纪的他就在酒店停车场里踢球，躲避炮火的威胁。从难民到金球奖得主，从战火中的孩子到世界杯决赛的队长，莫德里奇的故事是足球史上最励志的传奇之一。2018年世界杯，他带领克罗地亚杀入决赛，个人获得金球奖，向世界证明了天赋与坚韧可以战胜一切。',
      source: SOURCE_WIKI,
      accuracyLevel: 'verified',
    },
    {
      id: 'cro-story-3',
      teamId: 'CRO',
      type: 'trivia',
      title: '加时赛之王：克罗地亚的淘汰赛奇迹',
      content: '克罗地亚在世界杯淘汰赛中有着惊人的加时赛战绩。2018年，他们连续三场淘汰赛（对丹麦、俄罗斯、英格兰）全部打满120分钟并最终晋级，成为世界杯历史上第一支单届三场淘汰赛全部加时晋级的球队。2022年，他们又在1/8决赛和1/4决赛中通过点球大战淘汰日本和巴西。克罗地亚的加时赛和点球大战能力，堪称世界杯一绝。',
      source: SOURCE_MEDIA,
      accuracyLevel: 'verified',
    },
  ],
};
