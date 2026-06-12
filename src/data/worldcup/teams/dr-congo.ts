import type { TeamCompleteProfile } from '../../../types/worldcup';

const SOURCE_FIFA: import('../../../types/worldcup').DataSource = { name: 'FIFA官网', url: 'https://www.fifa.com', level: 'A', date: '2026-06-08' };
const SOURCE_WIKI: import('../../../types/worldcup').DataSource = { name: 'Wikipedia', level: 'C', date: '2026-06-08' };
const SOURCE_MEDIA: import('../../../types/worldcup').DataSource = { name: '体育媒体综合', level: 'D', date: '2026-06-08' };

export const DR_CONGO_PROFILE: TeamCompleteProfile = {
  profile: {
    teamId: 'COD',
    nameZh: '刚果民主共和国',
    nameEn: 'DR Congo',
    confederation: 'CAF',
    coachName: '塞巴斯蒂安·德布雷',
    coachNationality: '法国',
    captainName: '切卢斯特',
    fifaRank: 60,
    worldCupAppearances: 1,
    bestResult: '小组赛',
    titles: 0,
    squadValue: 60000000,
    squadValueDate: '2026-06-07',
    intro: '刚果民主共和国仅1次参加世界杯（1974年，以扎伊尔名义），0-9负南斯拉夫是世界杯历史上最惨痛的失利之一。但非洲杯两次夺冠证明了刚果足球的底蕴。',
    tags: ['非洲豹', '1974首秀', '两次非洲杯冠军', '重返世界杯'],
    source: SOURCE_FIFA,
    accuracyLevel: 'verified',
  },
  worldCupHistory: {
    teamId: 'COD',
    records: [
      { year: 1974, host: '西德', result: '小组赛', finalRank: 16, wins: 0, draws: 0, losses: 3, goalsFor: 0, goalsAgainst: 14, matchesPlayed: 3, note: '0-9负南斯拉夫，以扎伊尔名义参赛' },
    ],
    summary: '刚果民主共和国仅1次参加世界杯（1974年以扎伊尔名义），三连败零进球出局，0-9负南斯拉夫是世界杯历史上最惨痛的失利之一。时隔52年重返世界杯，刚果足球渴望正名。',
    source: SOURCE_WIKI,
    accuracyLevel: 'verified',
  },
  qualification: {
    teamId: 'COD',
    confederation: 'CAF',
    group: '第三轮I组',
    rank: 1,
    matchesPlayed: 6,
    wins: 4,
    draws: 1,
    losses: 1,
    goalsFor: 9,
    goalsAgainst: 4,
    points: 13,
    qualificationMethod: '非洲区预选赛第三轮I组第1名直接晋级',
    keyMatches: [
      { date: '2025-06-09', opponent: '马里', venue: 'home', score: '2-0', result: 'win', note: '主场完胜马里' },
      { date: '2025-11-17', opponent: '加纳', venue: 'away', score: '1-1', result: 'draw', note: '客场战平加纳' },
    ],
    source: SOURCE_FIFA,
    accuracyLevel: 'needs_review',
  },
  storyCards: [
    {
      id: 'cod-story-1',
      teamId: 'COD',
      type: 'trivia',
      title: '0-9：世界杯最惨痛的回忆',
      content: '1974年世界杯，扎伊尔（现刚果民主共和国）0-9惨败南斯拉夫，创造了世界杯历史上最大比分失利之一。更令人啼笑皆非的是，伊隆加在对方任意球时提前将球踢走，成为世界杯历史上的荒诞一幕。52年后重返世界杯，刚果足球渴望洗刷这段耻辱。',
      source: SOURCE_MEDIA,
      accuracyLevel: 'verified',
    },
  ],
};
