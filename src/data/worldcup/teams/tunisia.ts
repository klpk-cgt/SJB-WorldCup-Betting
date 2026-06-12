import type { TeamCompleteProfile } from '../../../types/worldcup';

const SOURCE_FIFA: import('../../../types/worldcup').DataSource = { name: 'FIFA官网', url: 'https://www.fifa.com', level: 'A', date: '2026-06-08' };
const SOURCE_WIKI: import('../../../types/worldcup').DataSource = { name: 'Wikipedia', level: 'C', date: '2026-06-08' };
const SOURCE_MEDIA: import('../../../types/worldcup').DataSource = { name: '体育媒体综合', level: 'D', date: '2026-06-08' };

export const TUNISIA_PROFILE: TeamCompleteProfile = {
  profile: {
    teamId: 'TUN',
    nameZh: '突尼斯',
    nameEn: 'Tunisia',
    confederation: 'CAF',
    coachName: '萨德·巴德里',
    coachNationality: '突尼斯',
    captainName: '亚辛·梅里亚',
    fifaRank: 35,
    worldCupAppearances: 6,
    bestResult: '小组赛',
    titles: 0,
    squadValue: 70000000,
    squadValueDate: '2026-06-07',
    intro: '突尼斯6次参加世界杯均止步小组赛，是非洲参赛次数最多却从未出线的球队。1978年首战3-1胜墨西哥开创非洲足球新纪元，但出线魔咒始终未破。',
    tags: ['迦太基之鹰', '6次小组赛', '1978先驱', '出线魔咒'],
    source: SOURCE_FIFA,
    accuracyLevel: 'verified',
  },
  worldCupHistory: {
    teamId: 'TUN',
    records: [
      { year: 2022, host: '卡塔尔', result: '小组赛', finalRank: 21, wins: 1, draws: 0, losses: 2, goalsFor: 1, goalsAgainst: 3, matchesPlayed: 3, note: '1-0胜法国，但仍未出线' },
      { year: 2018, host: '俄罗斯', result: '小组赛', finalRank: 22, wins: 1, draws: 0, losses: 2, goalsFor: 5, goalsAgainst: 7, matchesPlayed: 3, note: '2-5负比利时，2-1胜巴拿马' },
      { year: 2006, host: '德国', result: '小组赛', finalRank: 21, wins: 0, draws: 1, losses: 2, goalsFor: 3, goalsAgainst: 6, matchesPlayed: 3, note: '2-2平沙特' },
      { year: 2002, host: '韩日', result: '小组赛', finalRank: 26, wins: 0, draws: 1, losses: 2, goalsFor: 1, goalsAgainst: 5, matchesPlayed: 3, note: '1-1平比利时' },
      { year: 1998, host: '法国', result: '小组赛', finalRank: 24, wins: 0, draws: 1, losses: 2, goalsFor: 2, goalsAgainst: 4, matchesPlayed: 3, note: '1-1平哥伦比亚' },
      { year: 1978, host: '阿根廷', result: '小组赛', finalRank: 9, wins: 1, draws: 0, losses: 2, goalsFor: 5, goalsAgainst: 6, matchesPlayed: 3, note: '3-1胜墨西哥，非洲球队世界杯首胜' },
    ],
    summary: '突尼斯6次参加世界杯均止步小组赛，是非洲参赛最多却从未出线的球队。1978年3-1胜墨西哥是非洲球队世界杯首胜，2022年1-0胜法国仍未能出线，魔咒难破。',
    source: SOURCE_FIFA,
    accuracyLevel: 'verified',
  },
  qualification: {
    teamId: 'TUN',
    confederation: 'CAF',
    group: '第三轮A组',
    rank: 1,
    matchesPlayed: 6,
    wins: 4,
    draws: 1,
    losses: 1,
    goalsFor: 9,
    goalsAgainst: 3,
    points: 13,
    qualificationMethod: '非洲区预选赛第三轮A组第1名直接晋级',
    keyMatches: [
      { date: '2025-06-09', opponent: '赤道几内亚', venue: 'home', score: '2-0', result: 'win', note: '主场完胜赤道几内亚' },
      { date: '2025-11-17', opponent: '纳米比亚', venue: 'away', score: '1-0', result: 'win', note: '客场小胜纳米比亚' },
    ],
    source: SOURCE_FIFA,
    accuracyLevel: 'needs_review',
  },
  storyCards: [
    {
      id: 'tun-story-1',
      teamId: 'TUN',
      type: 'classic_match',
      title: '1978首战：3-1胜墨西哥，非洲首胜',
      content: '1978年6月2日，罗萨里奥。突尼斯在世界杯首战3-1击败墨西哥，这是非洲球队在世界杯上的首场胜利。阿里布、加姆比和德贝布各入一球，开创了非洲足球的新纪元。此后喀麦隆、尼日利亚等非洲球队纷纷在世界杯上创造奇迹，突尼斯是这一切的开端。',
      source: SOURCE_MEDIA,
      accuracyLevel: 'verified',
    },
  ],
};
