import type { TeamCompleteProfile } from '../../../types/worldcup';

const SOURCE_FIFA: import('../../../types/worldcup').DataSource = { name: 'FIFA官网', url: 'https://www.fifa.com', level: 'A', date: '2026-06-08' };
const SOURCE_WIKI: import('../../../types/worldcup').DataSource = { name: 'Wikipedia', level: 'C', date: '2026-06-08' };
const SOURCE_MEDIA: import('../../../types/worldcup').DataSource = { name: '体育媒体综合', level: 'D', date: '2026-06-08' };

export const SENEGAL_PROFILE: TeamCompleteProfile = {
  profile: {
    teamId: 'SEN',
    nameZh: '塞内加尔',
    nameEn: 'Senegal',
    confederation: 'CAF',
    coachName: '帕普·蒂亚',
    coachNationality: '塞内加尔',
    captainName: '卡利杜·库利巴利',
    fifaRank: 17,
    worldCupAppearances: 3,
    bestResult: '八强(2002)',
    titles: 0,
    squadValue: 300000000,
    squadValueDate: '2026-06-07',
    intro: '塞内加尔3次参加世界杯，2002年首秀即闯入八强震惊世界。马内、库利巴利等球星让特兰加雄狮成为非洲足球的旗帜，2022年闯入十六强展现了持续竞争力。',
    tags: ['特兰加雄狮', '2002八强', '马内时代', '非洲旗帜'],
    source: SOURCE_FIFA,
    accuracyLevel: 'verified',
  },
  worldCupHistory: {
    teamId: 'SEN',
    records: [
      { year: 2022, host: '卡塔尔', result: '十六强', finalRank: 9, wins: 2, draws: 0, losses: 2, goalsFor: 5, goalsAgainst: 5, matchesPlayed: 4, note: '2-1胜厄瓜多尔出线，0-3负英格兰' },
      { year: 2018, host: '俄罗斯', result: '小组赛', finalRank: 17, wins: 1, draws: 0, losses: 2, goalsFor: 3, goalsAgainst: 3, matchesPlayed: 3, note: '因公平竞赛规则出局' },
      { year: 2002, host: '韩日', result: '八强', finalRank: 7, wins: 2, draws: 2, losses: 1, goalsFor: 7, goalsAgainst: 6, matchesPlayed: 5, note: '1-0胜法国，加时赛金球负土耳其' },
    ],
    summary: '塞内加尔3次参加世界杯，2002年首秀闯入八强创造历史，1-0击败卫冕冠军法国震惊世界。2018年因公平竞赛规则出局令人惋惜，2022年闯入十六强展现了持续竞争力。',
    source: SOURCE_FIFA,
    accuracyLevel: 'verified',
  },
  qualification: {
    teamId: 'SEN',
    confederation: 'CAF',
    group: '第三轮B组',
    rank: 1,
    matchesPlayed: 6,
    wins: 5,
    draws: 0,
    losses: 1,
    goalsFor: 11,
    goalsAgainst: 3,
    points: 15,
    qualificationMethod: '非洲区预选赛第三轮B组第1名直接晋级',
    keyMatches: [
      { date: '2025-06-09', opponent: '埃及', venue: 'away', score: '1-2', result: 'loss', note: '客场负埃及' },
      { date: '2025-11-17', opponent: '埃及', venue: 'home', score: '2-0', result: 'win', note: '主场完胜埃及锁定头名' },
    ],
    source: SOURCE_FIFA,
    accuracyLevel: 'needs_review',
  },
  storyCards: [
    {
      id: 'sen-story-1',
      teamId: 'SEN',
      type: 'classic_match',
      title: '2002首战：1-0击败卫冕冠军法国',
      content: '2002年5月31日，首尔世界杯体育场。世界杯揭幕战，首次参赛的塞内加尔1-0击败卫冕冠军法国。帕帕·布巴·迪奥普第30分钟推射破门，法迪加和迪乌夫的精彩配合撕碎了法国的防线。这是世界杯历史上最伟大的揭幕战冷门，塞内加尔一战成名。',
      source: SOURCE_MEDIA,
      accuracyLevel: 'verified',
    },
    {
      id: 'sen-story-2',
      teamId: 'SEN',
      type: 'trivia',
      title: '2018公平竞赛之殇',
      content: '2018年世界杯，塞内加尔与日本同分同净胜球同进球数，最终因黄牌数多（6张对4张）被淘汰。这是世界杯历史上首次因公平竞赛规则决定出线名额，塞内加尔成为这一规则的第一个"牺牲品"。此后国际足联修改规则，同分情况下先比较相互战绩。',
      source: SOURCE_MEDIA,
      accuracyLevel: 'verified',
    },
  ],
};
