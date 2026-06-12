import type { TeamCompleteProfile } from '../../../types/worldcup';

const SOURCE_FIFA: import('../../../types/worldcup').DataSource = { name: 'FIFA官网', url: 'https://www.fifa.com', level: 'A', date: '2026-06-08' };
const SOURCE_WIKI: import('../../../types/worldcup').DataSource = { name: 'Wikipedia', level: 'C', date: '2026-06-08' };
const SOURCE_MEDIA: import('../../../types/worldcup').DataSource = { name: '体育媒体综合', level: 'D', date: '2026-06-08' };

export const GHANA_PROFILE: TeamCompleteProfile = {
  profile: {
    teamId: 'GHA',
    nameZh: '加纳',
    nameEn: 'Ghana',
    confederation: 'CAF',
    coachName: '奥托·阿多',
    coachNationality: '加纳',
    captainName: '安德烈·阿尤',
    fifaRank: 36,
    worldCupAppearances: 4,
    bestResult: '八强(2010)',
    titles: 0,
    squadValue: 150000000,
    squadValueDate: '2026-06-07',
    intro: '加纳4次参加世界杯，2010年闯入八强距四强仅一步之遥。苏亚雷斯的门线手球和吉安的点球中横梁是世界杯最戏剧性的瞬间之一。黑星军团始终是非洲足球的重要力量。',
    tags: ['黑星军团', '2010八强', '苏亚雷斯手球', '吉安遗憾'],
    source: SOURCE_FIFA,
    accuracyLevel: 'verified',
  },
  worldCupHistory: {
    teamId: 'GHA',
    records: [
      { year: 2022, host: '卡塔尔', result: '小组赛', finalRank: 24, wins: 0, draws: 0, losses: 3, goalsFor: 2, goalsAgainst: 7, matchesPlayed: 3, note: '2-3负葡萄牙，三连败出局' },
      { year: 2014, host: '巴西', result: '小组赛', finalRank: 25, wins: 0, draws: 1, losses: 2, goalsFor: 4, goalsAgainst: 6, matchesPlayed: 3, note: '2-2平德国，2-1负美国' },
      { year: 2010, host: '南非', result: '八强', finalRank: 7, wins: 2, draws: 1, losses: 1, goalsFor: 5, goalsAgainst: 4, matchesPlayed: 5, note: '1/4决赛点球负乌拉圭，苏亚雷斯手球' },
      { year: 2006, host: '德国', result: '十六强', finalRank: 9, wins: 2, draws: 0, losses: 2, goalsFor: 4, goalsAgainst: 5, matchesPlayed: 4, note: '首次参赛闯入十六强，2-0胜捷克，0-3负巴西' },
    ],
    summary: '加纳4次参加世界杯，2010年闯入八强是最高荣誉。1/4决赛苏亚雷斯的门线手球和吉安加时赛点球中横梁是世界杯最戏剧性的瞬间。2006年首次参赛即闯入十六强展现了黑星军团的实力。',
    source: SOURCE_FIFA,
    accuracyLevel: 'verified',
  },
  qualification: {
    teamId: 'GHA',
    confederation: 'CAF',
    group: '第三轮I组',
    rank: 2,
    matchesPlayed: 6,
    wins: 4,
    draws: 0,
    losses: 2,
    goalsFor: 8,
    goalsAgainst: 5,
    points: 12,
    qualificationMethod: '非洲区预选赛第三轮I组第2名通过附加赛晋级',
    keyMatches: [
      { date: '2025-06-09', opponent: '刚果民主共和国', venue: 'home', score: '2-1', result: 'win', note: '主场力克刚果' },
      { date: '2026-03-24', opponent: '尼日利亚', venue: 'neutral', score: '2-1', result: 'win', note: '附加赛击败尼日利亚' },
    ],
    source: SOURCE_FIFA,
    accuracyLevel: 'needs_review',
  },
  storyCards: [
    {
      id: 'gha-story-1',
      teamId: 'GHA',
      type: 'classic_match',
      title: '2010四分之一决赛：苏亚雷斯的手球',
      content: '2010年7月2日，约翰内斯堡足球城。1/4决赛加时赛最后时刻，加纳1-1平乌拉圭。阿皮亚头球攻门，苏亚雷斯在门线上用手将球挡出，被红牌罚下。吉安主罚点球击中横梁！比赛进入点球大战，乌拉圭4-2获胜。苏亚雷斯在通道里庆祝的画面和吉安绝望的眼神，成为世界杯最戏剧性的瞬间。',
      source: SOURCE_MEDIA,
      accuracyLevel: 'verified',
    },
  ],
};
