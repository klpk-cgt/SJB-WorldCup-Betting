import type { TeamCompleteProfile } from '../../../types/worldcup';

const SOURCE_FIFA: import('../../../types/worldcup').DataSource = { name: 'FIFA官网', url: 'https://www.fifa.com', level: 'A', date: '2026-06-08' };
const SOURCE_WIKI: import('../../../types/worldcup').DataSource = { name: 'Wikipedia', level: 'C', date: '2026-06-08' };
const SOURCE_MEDIA: import('../../../types/worldcup').DataSource = { name: '体育媒体综合', level: 'D', date: '2026-06-08' };

export const IRAQ_PROFILE: TeamCompleteProfile = {
  profile: {
    teamId: 'IRQ',
    nameZh: '伊拉克',
    nameEn: 'Iraq',
    confederation: 'AFC',
    coachName: '赫苏斯·卡萨斯',
    coachNationality: '西班牙',
    captainName: '尤尼斯·马哈茂德',
    fifaRank: 55,
    worldCupAppearances: 1,
    bestResult: '小组赛',
    titles: 0,
    squadValue: 20000000,
    squadValueDate: '2026-06-07',
    intro: '伊拉克仅1次参加世界杯（1986年），但2007年亚洲杯夺冠是伊拉克足球最辉煌的时刻。战火中的足球梦想从未熄灭，美索不达米亚雄狮在困境中前行。',
    tags: ['美索不达米亚雄狮', '2007亚洲杯冠军', '战火足球', '卡萨斯执教'],
    source: SOURCE_FIFA,
    accuracyLevel: 'verified',
  },
  worldCupHistory: {
    teamId: 'IRQ',
    records: [
      { year: 1986, host: '墨西哥', result: '小组赛', finalRank: 23, wins: 0, draws: 0, losses: 3, goalsFor: 1, goalsAgainst: 4, matchesPlayed: 3, note: '首次参赛，三连败出局' },
    ],
    summary: '伊拉克仅1次参加世界杯（1986年），三连败止步小组赛。但2007年亚洲杯夺冠是伊拉克足球最辉煌的时刻，战火中的足球奇迹感动世界。2026年时隔40年重返世界杯。',
    source: SOURCE_WIKI,
    accuracyLevel: 'verified',
  },
  qualification: {
    teamId: 'IRQ',
    confederation: 'AFC',
    group: '第三轮A组',
    rank: 2,
    matchesPlayed: 10,
    wins: 5,
    draws: 3,
    losses: 2,
    goalsFor: 14,
    goalsAgainst: 7,
    points: 18,
    qualificationMethod: '亚洲区预选赛第三轮A组第2名直接晋级',
    keyMatches: [
      { date: '2025-06-05', opponent: '伊朗', venue: 'home', score: '1-1', result: 'draw', note: '主场战平伊朗' },
      { date: '2025-10-15', opponent: '卡塔尔', venue: 'away', score: '2-1', result: 'win', note: '客场力克卡塔尔' },
    ],
    source: SOURCE_FIFA,
    accuracyLevel: 'needs_review',
  },
  storyCards: [
    {
      id: 'irq-story-1',
      teamId: 'IRQ',
      type: 'classic_match',
      title: '2007亚洲杯决赛：战火中的冠军',
      content: '2007年7月29日，雅加达。伊拉克在亚洲杯决赛1-0击败沙特阿拉伯，尤尼斯·马哈茂德第71分钟头球破门。这是伊拉克足球史上最伟大的时刻——国内战火纷飞，球员却用冠军为祖国带来了短暂的欢乐。赛后伊拉克球员举起国旗泪流满面的画面，成为体育史上最动人的瞬间之一。',
      source: SOURCE_MEDIA,
      accuracyLevel: 'verified',
    },
  ],
};
