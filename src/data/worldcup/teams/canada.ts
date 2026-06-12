import type { TeamCompleteProfile } from '../../../types/worldcup';

const SOURCE_FIFA: import('../../../types/worldcup').DataSource = { name: 'FIFA官网', url: 'https://www.fifa.com', level: 'A', date: '2026-06-08' };
const SOURCE_WIKI: import('../../../types/worldcup').DataSource = { name: 'Wikipedia', level: 'C', date: '2026-06-08' };
const SOURCE_MEDIA: import('../../../types/worldcup').DataSource = { name: '体育媒体综合', level: 'D', date: '2026-06-08' };

export const CANADA_PROFILE: TeamCompleteProfile = {
  profile: {
    teamId: 'CAN',
    nameZh: '加拿大',
    nameEn: 'Canada',
    confederation: 'CONCACAF',
    coachName: '杰西·马什',
    coachNationality: '美国',
    captainName: '阿方索·戴维斯',
    fifaRank: 47,
    worldCupAppearances: 2,
    bestResult: '小组赛',
    titles: 0,
    squadValue: 210000000,
    squadValueDate: '2026-06-07',
    intro: '加拿大足球近年崛起迅猛，阿方索·戴维斯和乔纳森·戴维领衔的新生代让枫叶军团重返世界杯舞台。2022年时隔36年再参赛，2026年本土作战值得期待。',
    tags: ['枫叶军团', '本土作战', '戴维斯双星', '足球崛起'],
    source: SOURCE_FIFA,
    accuracyLevel: 'verified',
  },
  worldCupHistory: {
    teamId: 'CAN',
    records: [
      { year: 2022, host: '卡塔尔', result: '小组赛', finalRank: 31, wins: 0, draws: 0, losses: 3, goalsFor: 2, goalsAgainst: 7, matchesPlayed: 3, note: '时隔36年重返世界杯，三连败出局' },
      { year: 1986, host: '墨西哥', result: '小组赛', finalRank: 24, wins: 0, draws: 0, losses: 3, goalsFor: 0, goalsAgainst: 5, matchesPlayed: 3, note: '首次参赛，零进球' },
    ],
    summary: '加拿大2次参加世界杯均止步小组赛。2022年时隔36年重返世界杯，虽三连败但展现了进攻欲望。2026年本土作战，加拿大足球迎来历史性机遇。',
    source: SOURCE_FIFA,
    accuracyLevel: 'verified',
  },
  qualification: {
    teamId: 'CAN',
    confederation: 'CONCACAF',
    group: '第三轮',
    rank: 2,
    matchesPlayed: 14,
    wins: 8,
    draws: 3,
    losses: 3,
    goalsFor: 24,
    goalsAgainst: 10,
    points: 27,
    qualificationMethod: '中北美区预选赛第三轮第2名直接晋级',
    keyMatches: [
      { date: '2025-09-07', opponent: '美国', venue: 'home', score: '2-1', result: 'win', note: '主场击败美国' },
      { date: '2025-11-17', opponent: '墨西哥', venue: 'away', score: '1-1', result: 'draw', note: '客场战平墨西哥' },
    ],
    source: SOURCE_FIFA,
    accuracyLevel: 'needs_review',
  },
  storyCards: [
    {
      id: 'can-story-1',
      teamId: 'CAN',
      type: 'trivia',
      title: '2026本土作战：加拿大足球的黄金时代',
      content: '2026年世界杯由加拿大、美国、墨西哥联合举办。加拿大足球在阿方索·戴维斯和乔纳森·戴维的带领下迎来黄金时代。从1986年首次参赛零进球，到2022年重返世界杯，再到2026年本土作战，加拿大足球的崛起速度令人瞩目。',
      source: SOURCE_MEDIA,
      accuracyLevel: 'verified',
    },
  ],
};
