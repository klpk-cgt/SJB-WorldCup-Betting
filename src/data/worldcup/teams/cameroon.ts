import type { TeamCompleteProfile } from '../../../types/worldcup';

const SOURCE_FIFA: import('../../../types/worldcup').DataSource = { name: 'FIFA官网', url: 'https://www.fifa.com', level: 'A', date: '2026-06-08' };
const SOURCE_WIKI: import('../../../types/worldcup').DataSource = { name: 'Wikipedia', level: 'C', date: '2026-06-08' };
const SOURCE_MEDIA: import('../../../types/worldcup').DataSource = { name: '体育媒体综合', level: 'D', date: '2026-06-08' };

export const CAMEROON_PROFILE: TeamCompleteProfile = {
  profile: {
    teamId: 'CMR',
    nameZh: '喀麦隆',
    nameEn: 'Cameroon',
    confederation: 'CAF',
    coachName: '马克·布里松',
    coachNationality: '喀麦隆',
    captainName: '文森特·阿布巴卡尔',
    fifaRank: 38,
    worldCupAppearances: 8,
    bestResult: '八强(1990)',
    titles: 0,
    squadValue: 130000000,
    squadValueDate: '2026-06-07',
    intro: '喀麦隆是非洲世界杯参赛次数最多的球队之一，8次出征。1990年意大利之夏闯入八强，米拉大叔的角旗舞成为永恒经典，开创了非洲足球的新纪元。',
    tags: ['非洲雄狮', '1990八强', '米拉大叔', '8次参赛', '非洲先驱'],
    source: SOURCE_FIFA,
    accuracyLevel: 'verified',
  },
  worldCupHistory: {
    teamId: 'CMR',
    records: [
      { year: 2022, host: '卡塔尔', result: '小组赛', finalRank: 28, wins: 1, draws: 0, losses: 2, goalsFor: 4, goalsAgainst: 5, matchesPlayed: 3, note: '1-0胜巴西，阿布巴卡尔头球绝杀' },
      { year: 2014, host: '巴西', result: '小组赛', finalRank: 31, wins: 0, draws: 0, losses: 3, goalsFor: 4, goalsAgainst: 9, matchesPlayed: 3, note: '三连败出局' },
      { year: 2010, host: '南非', result: '小组赛', finalRank: 31, wins: 0, draws: 0, losses: 3, goalsFor: 2, goalsAgainst: 5, matchesPlayed: 3, note: '三连败出局' },
      { year: 2002, host: '韩日', result: '小组赛', finalRank: 17, wins: 1, draws: 1, losses: 1, goalsFor: 4, goalsAgainst: 4, matchesPlayed: 3, note: '与德国同分因净胜球劣势出局' },
      { year: 1998, host: '法国', result: '小组赛', finalRank: 25, wins: 0, draws: 2, losses: 1, goalsFor: 2, goalsAgainst: 4, matchesPlayed: 3, note: '与意大利同分因净胜球劣势出局' },
      { year: 1994, host: '美国', result: '小组赛', finalRank: 22, wins: 0, draws: 1, losses: 2, goalsFor: 3, goalsAgainst: 11, matchesPlayed: 3, note: '1-6惨败俄罗斯' },
      { year: 1990, host: '意大利', result: '八强', finalRank: 7, wins: 3, draws: 0, losses: 1, goalsFor: 7, goalsAgainst: 6, matchesPlayed: 5, note: '首战1-0胜阿根廷，米拉大叔两球逆转罗马尼亚' },
      { year: 1982, host: '西班牙', result: '小组赛', finalRank: 13, wins: 0, draws: 3, losses: 0, goalsFor: 3, goalsAgainst: 3, matchesPlayed: 3, note: '三战皆平因进球少出局' },
    ],
    summary: '喀麦隆8次参加世界杯，1990年闯入八强创造非洲足球历史。米拉大叔的角旗舞和击败阿根廷的壮举永载史册。2022年虽未出线但1-0击败巴西令人印象深刻。',
    source: SOURCE_FIFA,
    accuracyLevel: 'verified',
  },
  qualification: {
    teamId: 'CMR',
    confederation: 'CAF',
    group: '第三轮D组',
    rank: 1,
    matchesPlayed: 6,
    wins: 5,
    draws: 0,
    losses: 1,
    goalsFor: 12,
    goalsAgainst: 4,
    points: 15,
    qualificationMethod: '非洲区预选赛第三轮D组第1名直接晋级',
    keyMatches: [
      { date: '2025-06-09', opponent: '科特迪瓦', venue: 'home', score: '2-1', result: 'win', note: '主场力克科特迪瓦' },
      { date: '2025-11-17', opponent: '加蓬', venue: 'away', score: '3-0', result: 'win', note: '客场大胜加蓬' },
    ],
    source: SOURCE_FIFA,
    accuracyLevel: 'needs_review',
  },
  storyCards: [
    {
      id: 'cmr-story-1',
      teamId: 'CMR',
      type: 'classic_match',
      title: '1990首战：1-0击败卫冕冠军阿根廷',
      content: '1990年6月8日，米兰圣西罗球场。世界杯开幕式，喀麦隆1-0击败卫冕冠军阿根廷。比耶克第67分钟头球破门，尽管喀麦隆两人被罚下仍守住胜果。这是非洲球队首次在世界杯击败卫冕冠军，震惊世界。',
      source: SOURCE_MEDIA,
      accuracyLevel: 'verified',
    },
    {
      id: 'cmr-story-2',
      teamId: 'CMR',
      type: 'legend',
      title: '米拉大叔的角旗舞',
      content: '1990年世界杯，38岁的罗杰·米拉替补出场，在对罗马尼亚和哥伦比亚的比赛中连入4球，每次进球后都跑到角旗旁跳起标志性的舞蹈。他成为世界杯历史上最年长的进球者，"米拉大叔"的角旗舞成为世界杯永恒的经典画面。',
      source: SOURCE_MEDIA,
      accuracyLevel: 'verified',
    },
  ],
};
