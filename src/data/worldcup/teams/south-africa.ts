import type { TeamCompleteProfile } from '../../../types/worldcup';

const SOURCE_FIFA: import('../../../types/worldcup').DataSource = { name: 'FIFA官网', url: 'https://www.fifa.com', level: 'A', date: '2026-06-08' };
const SOURCE_WIKI: import('../../../types/worldcup').DataSource = { name: 'Wikipedia', level: 'C', date: '2026-06-08' };
const SOURCE_MEDIA: import('../../../types/worldcup').DataSource = { name: '体育媒体综合', level: 'D', date: '2026-06-08' };

export const SOUTH_AFRICA_PROFILE: TeamCompleteProfile = {
  profile: {
    teamId: 'RSA',
    nameZh: '南非',
    nameEn: 'South Africa',
    confederation: 'CAF',
    coachName: '雨果·布鲁斯',
    coachNationality: '比利时',
    captainName: '罗恩文·威廉姆斯',
    fifaRank: 58,
    worldCupAppearances: 3,
    bestResult: '小组赛',
    titles: 0,
    squadValue: 35000000,
    squadValueDate: '2026-06-07',
    intro: '南非是非洲大陆首个举办世界杯的国家，3次参加世界杯均止步小组赛。2010年主场作战虽未出线，但开幕式进球成为经典瞬间。',
    tags: ['彩虹之国', '2010东道主', '非洲杯常客', '小组赛魔咒'],
    source: SOURCE_FIFA,
    accuracyLevel: 'verified',
  },
  worldCupHistory: {
    teamId: 'RSA',
    records: [
      { year: 2010, host: '南非', result: '小组赛', finalRank: 20, wins: 1, draws: 1, losses: 1, goalsFor: 3, goalsAgainst: 5, matchesPlayed: 3, note: '东道主，1-1平墨西哥，开幕式查巴拉拉进球' },
      { year: 2002, host: '韩日', result: '小组赛', finalRank: 17, wins: 0, draws: 2, losses: 1, goalsFor: 3, goalsAgainst: 5, matchesPlayed: 3, note: '与巴拉圭同分因净胜球劣势出局' },
      { year: 1998, host: '法国', result: '小组赛', finalRank: 24, wins: 0, draws: 2, losses: 1, goalsFor: 3, goalsAgainst: 6, matchesPlayed: 3, note: '首次参赛' },
    ],
    summary: '南非3次参加世界杯均止步小组赛。2010年作为东道主虽未出线，但查巴拉拉的开幕式进球成为世界杯经典瞬间。',
    source: SOURCE_FIFA,
    accuracyLevel: 'verified',
  },
  qualification: {
    teamId: 'RSA',
    confederation: 'CAF',
    group: '第三轮C组',
    rank: 1,
    matchesPlayed: 6,
    wins: 4,
    draws: 1,
    losses: 1,
    goalsFor: 8,
    goalsAgainst: 3,
    points: 13,
    qualificationMethod: '非洲区预选赛第三轮C组第1名直接晋级',
    keyMatches: [
      { date: '2025-06-09', opponent: '尼日利亚', venue: 'home', score: '2-1', result: 'win', note: '主场力克尼日利亚' },
      { date: '2025-10-14', opponent: '贝宁', venue: 'away', score: '1-0', result: 'win', note: '客场小胜贝宁' },
    ],
    source: SOURCE_FIFA,
    accuracyLevel: 'needs_review',
  },
  storyCards: [
    {
      id: 'rsa-story-1',
      teamId: 'RSA',
      type: 'classic_match',
      title: '2010开幕式：查巴拉拉的世界杯第一球',
      content: '2010年6月11日，南非世界杯开幕式，东道主南非对阵墨西哥。第55分钟，查巴拉拉左脚抽射破门，打入当届世界杯首球，也是世界杯历史上最具标志性的开幕式进球之一。足球城体育场8万余名观众沸腾，整个非洲大陆为之欢呼。',
      source: SOURCE_MEDIA,
      accuracyLevel: 'verified',
    },
  ],
};
