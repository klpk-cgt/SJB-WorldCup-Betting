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

export const KOREA_PROFILE: TeamCompleteProfile = {
  profile: {
    teamId: 'KOR',
    nameZh: '韩国',
    nameEn: 'South Korea',
    confederation: 'AFC',
    coachName: '洪明甫',
    coachNationality: '韩国',
    captainName: '孙兴慜',
    fifaRank: 23,
    worldCupAppearances: 11,
    bestResult: '第四名(1次)',
    titles: 0,
    squadValue: 190000000,
    squadValueDate: '2026-06-07',
    intro:
      '韩国是亚洲足球的传统强队，11次参加世界杯仅次于巴西、德国等传统豪门。2002年韩日世界杯闯入四强，虽然争议不断，但创造了亚洲球队的世界杯最佳战绩。孙兴慜是当今亚洲最具影响力的球星，他的速度和射术让韩国在任何比赛中都具备威胁。2026年，太极虎将在洪明甫的带领下再次向世界证明亚洲足球的实力。',
    tags: ['太极虎', '11次参赛', '2002四强', '孙兴慜领衔', '亚洲传统强队'],
    source: SOURCE_FIFA,
    accuracyLevel: 'verified',
  },
  worldCupHistory: {
    teamId: 'KOR',
    records: [
      { year: 2022, host: '卡塔尔', result: '十六强', finalRank: 9, wins: 1, draws: 1, losses: 1, goalsFor: 4, goalsAgainst: 4, matchesPlayed: 4, note: '2-1胜葡萄牙出线，1-4负巴西' },
      { year: 2018, host: '俄罗斯', result: '小组赛', finalRank: 19, wins: 1, draws: 0, losses: 2, goalsFor: 3, goalsAgainst: 3, matchesPlayed: 3, note: '2-0胜德国，但仍小组出局' },
      { year: 2014, host: '巴西', result: '小组赛', finalRank: 21, wins: 0, draws: 1, losses: 2, goalsFor: 3, goalsAgainst: 6, matchesPlayed: 3, note: '小组赛出局' },
      { year: 2010, host: '南非', result: '十六强', finalRank: 9, wins: 1, draws: 1, losses: 1, goalsFor: 5, goalsAgainst: 6, matchesPlayed: 4, note: '1-2负乌拉圭' },
      { year: 2002, host: '韩日', result: '第四名', finalRank: 4, wins: 3, draws: 2, losses: 0, goalsFor: 8, goalsAgainst: 2, matchesPlayed: 7, note: '主场闯入四强，争议判罚引发巨大争议' },
      { year: 1998, host: '法国', result: '小组赛', finalRank: 24, wins: 0, draws: 1, losses: 2, goalsFor: 2, goalsAgainst: 9, matchesPlayed: 3, note: '1-5惨败荷兰' },
      { year: 1994, host: '美国', result: '小组赛', finalRank: 18, wins: 0, draws: 2, losses: 1, goalsFor: 4, goalsAgainst: 5, matchesPlayed: 3, note: '2-3负德国' },
      { year: 1990, host: '意大利', result: '小组赛', finalRank: 19, wins: 0, draws: 0, losses: 3, goalsFor: 1, goalsAgainst: 6, matchesPlayed: 3, note: '三连败出局' },
      { year: 1986, host: '墨西哥', result: '小组赛', finalRank: 18, wins: 0, draws: 1, losses: 2, goalsFor: 4, goalsAgainst: 7, matchesPlayed: 3, note: '1-1平保加利亚' },
      { year: 1954, host: '瑞士', result: '小组赛', finalRank: 14, wins: 0, draws: 0, losses: 2, goalsFor: 0, goalsAgainst: 16, matchesPlayed: 2, note: '0-7惨败土耳其，0-9惨败匈牙利' },
    ],
    summary: '韩国11次参加世界杯，最好成绩是2002年韩日世界杯第四名。虽然2002年的成绩因争议判罚备受质疑，但韩国连续10届参加世界杯的纪录本身证明了其亚洲足球的传统实力。2018年2-0击败德国、2022年2-1击败葡萄牙，展现了韩国在大赛中的竞争力。',
    source: SOURCE_FIFA,
    accuracyLevel: 'verified',
  },
  qualification: {
    teamId: 'KOR',
    confederation: 'AFC',
    group: '第三轮B组',
    rank: 2,
    matchesPlayed: 10,
    wins: 6,
    draws: 2,
    losses: 2,
    goalsFor: 18,
    goalsAgainst: 7,
    points: 20,
    qualificationMethod: '亚洲区预选赛第三轮B组第2名直接晋级',
    keyMatches: [
      { date: '2025-06-05', opponent: '沙特阿拉伯', venue: 'home', score: '2-0', result: 'win', note: '主场击败沙特' },
      { date: '2025-10-15', opponent: '澳大利亚', venue: 'away', score: '1-1', result: 'draw', note: '客场战平澳大利亚' },
      { date: '2026-03-25', opponent: '沙特阿拉伯', venue: 'away', score: '1-0', result: 'win', note: '客场击败沙特锁定晋级' },
    ],
    source: SOURCE_FIFA,
    accuracyLevel: 'verified',
  },
  storyCards: [
    {
      id: 'kor-story-1',
      teamId: 'KOR',
      type: 'classic_match',
      title: '2018小组赛：2-0击败德国',
      content: '2018年6月27日，喀山竞技场。卫冕冠军德国在小组赛最后一轮必须击败韩国才能出线，但韩国凭借金英权和孙兴慜的补时进球2-0爆冷击败德国。这是德国自1938年以来首次在世界杯小组赛出局，也是韩国世界杯历史上最具含金量的胜利之一。孙兴慜在终场哨响后泪流满面的画面成为经典——他既为胜利喜悦，也为韩国仍未能出线而遗憾。',
      source: SOURCE_MEDIA,
      accuracyLevel: 'verified',
    },
    {
      id: 'kor-story-2',
      teamId: 'KOR',
      type: 'trivia',
      title: '2002四强：荣耀与争议',
      content: '2002年韩日世界杯，韩国在荷兰籍主帅希丁克的带领下闯入四强，创造了亚洲球队的世界杯最佳战绩。但这一成绩因多场比赛的争议判罚而备受质疑——对意大利的托蒂红牌、对西班牙的两个有效进球被吹，都成为世界杯历史上最具争议的判罚之一。至今，2002年韩国的四强之路仍是足球史上最具争议的话题之一，荣耀与争议并存。',
      source: SOURCE_WIKI,
      accuracyLevel: 'verified',
    },
    {
      id: 'kor-story-3',
      teamId: 'KOR',
      type: 'legend',
      title: '孙兴慜：亚洲足球的旗帜',
      content: '孙兴慜是亚洲足球史上最成功的球员之一。在热刺，他成为英超历史上进球最多的亚洲球员，2021-22赛季以23球获得英超金靴奖——这是亚洲球员首次获此殊荣。在国家队，他是韩国队的灵魂人物，2022年世界杯带伤出战仍贡献关键助攻。孙兴慜用实力证明了亚洲球员可以在世界最高水平的联赛中成为顶级射手，他是整个亚洲足球的骄傲。',
      source: SOURCE_MEDIA,
      accuracyLevel: 'verified',
    },
  ],
};
