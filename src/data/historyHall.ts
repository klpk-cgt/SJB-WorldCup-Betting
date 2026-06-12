export type ChampionTimelineItem = {
  year: number;
  host: string;
  champion: string;
  championCode: string;
  runnerUp: string;
  runnerUpCode: string;
  score: string;
  topScorer: string;
  topScorerGoals: number;
  note: string;
};

export type ClassicTeamItem = {
  title: string;
  team: string;
  code: string;
  era: string;
  highlight: string;
  summary: string;
};

export type LegendPlayerItem = {
  name: string;
  team: string;
  code: string;
  era: string;
  record: string;
  worldCups: number;
  goals: number;
  summary: string;
};

export type WorldCupRecordItem = {
  label: string;
  value: string;
  holder: string;
  holderCode: string;
  note: string;
};

export const CHAMPION_TIMELINE: ChampionTimelineItem[] = [
  {
    year: 2022,
    host: '卡塔尔',
    champion: '阿根廷',
    championCode: 'ARG',
    runnerUp: '法国',
    runnerUpCode: 'FRA',
    score: '3:3 (点球4:2)',
    topScorer: '姆巴佩',
    topScorerGoals: 8,
    note: '梅西完成生涯终章，决赛成为世界杯历史经典。姆巴佩决赛帽子戏法仍遗憾落败。',
  },
  {
    year: 2018,
    host: '俄罗斯',
    champion: '法国',
    championCode: 'FRA',
    runnerUp: '克罗地亚',
    runnerUpCode: 'CRO',
    score: '4:2',
    topScorer: '凯恩',
    topScorerGoals: 6,
    note: '法国再登顶，克罗地亚创造队史最佳成绩。VAR技术首次全面应用。',
  },
  {
    year: 2014,
    host: '巴西',
    champion: '德国',
    championCode: 'GER',
    runnerUp: '阿根廷',
    runnerUpCode: 'ARG',
    score: '1:0 (加时)',
    topScorer: '罗德里格斯',
    topScorerGoals: 6,
    note: '德国完成高位逼抢与技术流融合，格策加时赛一击致命。半决赛7:1屠巴西震惊世界。',
  },
  {
    year: 2010,
    host: '南非',
    champion: '西班牙',
    championCode: 'ESP',
    runnerUp: '荷兰',
    runnerUpCode: 'NED',
    score: '1:0 (加时)',
    topScorer: '穆勒 / 托马斯 / 斯内德 / 比利亚',
    topScorerGoals: 5,
    note: '传控足球达到巅峰，伊涅斯塔在决赛写下名字。世界杯首次来到非洲大陆。',
  },
  {
    year: 2006,
    host: '德国',
    champion: '意大利',
    championCode: 'ITA',
    runnerUp: '法国',
    runnerUpCode: 'FRA',
    score: '1:1 (点球5:3)',
    topScorer: '克洛泽',
    topScorerGoals: 5,
    note: '齐达内决赛头顶马特拉齐被红牌罚下，以最戏剧性的方式告别职业生涯。',
  },
  {
    year: 2002,
    host: '韩日',
    champion: '巴西',
    championCode: 'BRA',
    runnerUp: '德国',
    runnerUpCode: 'GER',
    score: '2:0',
    topScorer: '罗纳尔多',
    topScorerGoals: 8,
    note: '世界杯首次来到亚洲，罗纳尔多以8球登顶，"阿福头"成为经典记忆。',
  },
  {
    year: 1998,
    host: '法国',
    champion: '法国',
    championCode: 'FRA',
    runnerUp: '巴西',
    runnerUpCode: 'BRA',
    score: '3:0',
    topScorer: '苏克',
    topScorerGoals: 6,
    note: '法国在主场首次捧杯，齐达内用两个头球定格时代。世界杯扩军至32队。',
  },
  {
    year: 1994,
    host: '美国',
    champion: '巴西',
    championCode: 'BRA',
    runnerUp: '意大利',
    runnerUpCode: 'ITA',
    score: '0:0 (点球3:2)',
    topScorer: '斯托伊奇科夫 / 萨连科',
    topScorerGoals: 6,
    note: '世界杯决赛首次点球决胜，巴乔罚失点球后落寞的背影成为永恒画面。',
  },
  {
    year: 1990,
    host: '意大利',
    champion: '西德',
    championCode: 'GER',
    runnerUp: '阿根廷',
    runnerUpCode: 'ARG',
    score: '1:0',
    topScorer: '斯基拉奇',
    topScorerGoals: 6,
    note: '防守足球盛行的年代，决赛沉闷但西德复仇成功。喀麦隆成为首支进入八强的非洲球队。',
  },
  {
    year: 1986,
    host: '墨西哥',
    champion: '阿根廷',
    championCode: 'ARG',
    runnerUp: '西德',
    runnerUpCode: 'GER',
    score: '3:2',
    topScorer: '莱因克尔',
    topScorerGoals: 6,
    note: '马拉多纳封神之夏，留下"上帝之手"和世纪进球。一届属于个人的世界杯。',
  },
  {
    year: 1982,
    host: '西班牙',
    champion: '意大利',
    championCode: 'ITA',
    runnerUp: '西德',
    runnerUpCode: 'GER',
    score: '3:1',
    topScorer: '罗西',
    topScorerGoals: 6,
    note: '罗西从禁赛归来后上演帽子戏法，意大利三夺世界杯。扩军至24队。',
  },
  {
    year: 1978,
    host: '阿根廷',
    champion: '阿根廷',
    championCode: 'ARG',
    runnerUp: '荷兰',
    runnerUpCode: 'NED',
    score: '3:1 (加时)',
    topScorer: '肯佩斯',
    topScorerGoals: 6,
    note: '阿根廷主场夺冠，肯佩斯加时赛锁定胜局。荷兰再次饮恨决赛。',
  },
  {
    year: 1974,
    host: '西德',
    champion: '西德',
    championCode: 'GER',
    runnerUp: '荷兰',
    runnerUpCode: 'NED',
    score: '2:1',
    topScorer: '拉托',
    topScorerGoals: 7,
    note: '荷兰"全攻全守"震撼世界，但西德在决赛逆转。克鲁伊夫开球即造点球。',
  },
  {
    year: 1970,
    host: '墨西哥',
    champion: '巴西',
    championCode: 'BRA',
    runnerUp: '意大利',
    runnerUpCode: 'ITA',
    score: '4:1',
    topScorer: '穆勒',
    topScorerGoals: 10,
    note: '贝利领衔黄金巴西，第三次登顶永久保留雷米特杯。被公认为史上最伟大的球队。',
  },
  {
    year: 1966,
    host: '英格兰',
    champion: '英格兰',
    championCode: 'ENG',
    runnerUp: '西德',
    runnerUpCode: 'GER',
    score: '4:2 (加时)',
    topScorer: '尤西比奥',
    topScorerGoals: 9,
    note: '英格兰唯一一次世界杯冠军，赫斯特决赛帽子戏法。门线悬案至今仍有争议。',
  },
  {
    year: 1962,
    host: '智利',
    champion: '巴西',
    championCode: 'BRA',
    runnerUp: '捷克斯洛伐克',
    runnerUpCode: 'CZE',
    score: '3:1',
    topScorer: '加林查 / 瓦瓦 / 阿尔伯特 / 伊万诺夫 / 耶尔科维奇 / 桑切斯',
    topScorerGoals: 4,
    note: '贝利小组赛受伤退出，加林查扛起巴西卫冕。多人并列金靴。',
  },
  {
    year: 1958,
    host: '瑞典',
    champion: '巴西',
    championCode: 'BRA',
    runnerUp: '瑞典',
    runnerUpCode: 'SWE',
    score: '5:2',
    topScorer: '方丹',
    topScorerGoals: 13,
    note: '17岁的贝利横空出世，巴西第一次站上世界之巅。方丹13球纪录至今无人打破。',
  },
  {
    year: 1954,
    host: '瑞士',
    champion: '西德',
    championCode: 'GER',
    runnerUp: '匈牙利',
    runnerUpCode: 'HUN',
    score: '3:2',
    topScorer: '柯奇士',
    topScorerGoals: 11,
    note: '"伯尔尼奇迹"，西德在0:2落后下逆转无敌匈牙利。场均5.38球至今最高。',
  },
  {
    year: 1950,
    host: '巴西',
    champion: '乌拉圭',
    championCode: 'URU',
    runnerUp: '巴西',
    runnerUpCode: 'BRA',
    score: '2:1 (循环赛)',
    topScorer: '阿德米尔',
    topScorerGoals: 8,
    note: '"马拉卡纳惨案"，巴西主场20万观众面前被乌拉圭逆转。唯一没有正式决赛的世界杯。',
  },
  {
    year: 1938,
    host: '法国',
    champion: '意大利',
    championCode: 'ITA',
    runnerUp: '匈牙利',
    runnerUpCode: 'HUN',
    score: '4:2',
    topScorer: '莱昂尼达斯',
    topScorerGoals: 7,
    note: '意大利成为首支卫冕成功的球队。莱昂尼达斯光脚进球成为传奇。',
  },
  {
    year: 1934,
    host: '意大利',
    champion: '意大利',
    championCode: 'ITA',
    runnerUp: '捷克斯洛伐克',
    runnerUpCode: 'CZE',
    score: '2:1 (加时)',
    topScorer: '内耶德利',
    topScorerGoals: 5,
    note: '欧洲球队开始建立统治力，意大利主场首夺世界杯。首届需要预选赛的世界杯。',
  },
  {
    year: 1930,
    host: '乌拉圭',
    champion: '乌拉圭',
    championCode: 'URU',
    runnerUp: '阿根廷',
    runnerUpCode: 'ARG',
    score: '4:2',
    topScorer: '斯塔比莱',
    topScorerGoals: 8,
    note: '首届世界杯诞生，乌拉圭百年纪念体育场见证历史。只有13支球队参赛。',
  },
];

export const CLASSIC_TEAMS: ClassicTeamItem[] = [
  {
    title: '1970 巴西',
    team: '巴西',
    code: 'BRA',
    era: '1970',
    highlight: '史上最伟大球队',
    summary: '贝利、雅伊尔津霍、托斯唐、里维利诺组成的攻击线堪称完美，六战全胜夺冠，决赛4:1横扫意大利。国际足联官方认定为史上最伟大的国家队。',
  },
  {
    title: '2022 阿根廷',
    team: '阿根廷',
    code: 'ARG',
    era: '2022',
    highlight: '梅西圆梦',
    summary: '从开局爆冷输沙特到一路修正节奏，最终在史诗决赛点球击败法国。梅西以35岁完成生涯终章，斯卡洛尼的战术调整堪称教科书。',
  },
  {
    title: '2010 西班牙',
    team: '西班牙',
    code: 'ESP',
    era: '2008-2012',
    highlight: '传控巅峰',
    summary: '以哈维、伊涅斯塔、布斯克茨为核心的中场控制力达到极致，连续夺得欧洲杯-世界杯-欧洲杯三连冠，把国家队足球带入另一种美学。',
  },
  {
    title: '2002 巴西',
    team: '巴西',
    code: 'BRA',
    era: '2002',
    highlight: '3R攻击群',
    summary: '罗纳尔多、里瓦尔多、罗纳尔迪尼奥构成最有记忆点的进攻组合，七战全胜夺冠。罗纳尔多阿福头造型与8粒进球成为经典。',
  },
  {
    title: '1998 法国',
    team: '法国',
    code: 'FRA',
    era: '1998-2000',
    highlight: '主场首冠',
    summary: '用均衡结构和硬度拿下首冠，齐达内决赛双响。两年后又在欧洲杯夺冠，开启了法国足球的现代黄金期。',
  },
  {
    title: '1974 荷兰',
    team: '荷兰',
    code: 'NED',
    era: '1974',
    highlight: '全攻全守革命',
    summary: '克鲁伊夫领衔的荷兰队虽未夺冠，但"全攻全守"战术彻底改变了足球。决赛开场即造点球，却最终被西德逆转，成为最伟大的"无冕之王"。',
  },
  {
    title: '1954 西德',
    team: '西德',
    code: 'GER',
    era: '1954',
    highlight: '伯尔尼奇迹',
    summary: '在小组赛3:8惨败匈牙利后，决赛0:2落后完成3:2逆转。这场胜利不仅改变了足球，更成为战后德国重建信心的象征。',
  },
  {
    title: '1986 阿根廷',
    team: '阿根廷',
    code: 'ARG',
    era: '1986',
    highlight: '马拉多纳一个人的世界杯',
    summary: '马拉多纳以一己之力扛起整支球队，对阵英格兰的"上帝之手"和"世纪进球"同场出现，决赛3:2击败西德。这是最纯粹的个人英雄主义叙事。',
  },
];

export const LEGEND_PLAYERS: LegendPlayerItem[] = [
  {
    name: '贝利',
    team: '巴西',
    code: 'BRA',
    era: '1958-1970',
    record: '三届世界杯冠军',
    worldCups: 4,
    goals: 12,
    summary: '17岁横空出世，29岁功成身退，三夺世界杯至今无人能及。他是足球的第一位全球偶像，也是"美丽游戏"的代名词。',
  },
  {
    name: '马拉多纳',
    team: '阿根廷',
    code: 'ARG',
    era: '1982-1994',
    record: '1986封神',
    worldCups: 4,
    goals: 8,
    summary: '一届世界杯里同时留下争议与神迹，仍是世界杯最浓烈的个人叙事。上帝之手与世纪进球，天堂与地狱仅一线之隔。',
  },
  {
    name: '梅西',
    team: '阿根廷',
    code: 'ARG',
    era: '2006-2022',
    record: '世界杯冠军 + 2次金球奖',
    worldCups: 5,
    goals: 13,
    summary: '五届世界杯的漫长等待，终于在35岁完成生涯拼图。26场世界杯出场纪录，让"球王讨论"有了终极注脚。',
  },
  {
    name: '克洛泽',
    team: '德国',
    code: 'GER',
    era: '2002-2014',
    record: '世界杯总进球16球',
    worldCups: 4,
    goals: 16,
    summary: '从空翻少年到纪录之王，四届世界杯16球超越罗纳尔多。高效率与持久度共同构成的世界杯射手纪录。',
  },
  {
    name: '罗纳尔多',
    team: '巴西',
    code: 'BRA',
    era: '1998-2006',
    record: '世界杯总进球15球',
    worldCups: 4,
    goals: 15,
    summary: '1998决赛前离奇发病、2002阿福头8球王者归来、2006追平穆勒纪录。极致爆发力与伤病重生，共同构成最传奇的前锋故事线。',
  },
  {
    name: '齐达内',
    team: '法国',
    code: 'FRA',
    era: '1998-2006',
    record: '世界杯冠军核心',
    worldCups: 3,
    goals: 5,
    summary: '1998决赛两个头球、2006决赛一头撞人——在关键淘汰赛和决赛总能写出艺术般的控制力与决定性瞬间，也以最戏剧性的方式告别。',
  },
  {
    name: '克鲁伊夫',
    team: '荷兰',
    code: 'NED',
    era: '1974',
    record: '全攻全守的灵魂',
    worldCups: 1,
    goals: 3,
    summary: '只参加了一届世界杯，却永远改变了足球。克鲁伊夫转身成为永恒经典，他代表的不仅是荷兰，更是足球哲学的革命。',
  },
  {
    name: '方丹',
    team: '法国',
    code: 'FRA',
    era: '1958',
    record: '单届13球纪录',
    worldCups: 1,
    goals: 13,
    summary: '仅参加一届世界杯便打入13球，这个纪录已屹立66年无人打破。单届进球效率之高，堪称世界杯最不可思议的个人数据。',
  },
  {
    name: '穆勒',
    team: '西德',
    code: 'GER',
    era: '1970-1974',
    record: '世界杯14球',
    worldCups: 2,
    goals: 14,
    summary: '"轰炸机"穆勒在两届世界杯轰入14球，1970年单届10球，1974年决赛致胜进球。禁区内的终结者，效率惊人。',
  },
  {
    name: '马特乌斯',
    team: '德国',
    code: 'GER',
    era: '1982-1998',
    record: '5届世界杯25场出场',
    worldCups: 5,
    goals: 6,
    summary: '世界杯出场纪录保持者，从22岁到37岁五次出征。1990年以队长身份捧杯，是德国足球铁血精神的化身。',
  },
];

export const WORLD_CUP_RECORDS: WorldCupRecordItem[] = [
  {
    label: '夺冠次数最多',
    value: '5 次',
    holder: '巴西',
    holderCode: 'BRA',
    note: '1958、1962、1970、1994、2002。五星巴西是世界杯历史上最成功的国家队。',
  },
  {
    label: '决赛出场最多',
    value: '8 次',
    holder: '德国',
    holderCode: 'GER',
    note: '1954、1966、1974、1982、1986、1990、2002、2014。4次夺冠4次亚军，兼具稳定性与延续性。',
  },
  {
    label: '历史射手王',
    value: '克洛泽 16 球',
    holder: '德国',
    holderCode: 'GER',
    note: '四届世界杯（2002-2014）共打入16球，2014年半决赛超越罗纳尔多的15球纪录。',
  },
  {
    label: '单届进球最多',
    value: '方丹 13 球',
    holder: '法国',
    holderCode: 'FRA',
    note: '1958年瑞典世界杯仅用6场比赛打入13球，这个纪录已保持66年。',
  },
  {
    label: '出场次数最多',
    value: '马特乌斯 25 场',
    holder: '德国',
    holderCode: 'GER',
    note: '1982-1998五届世界杯共出场25次，是世界杯赛场上的永恒铁人。',
  },
  {
    label: '单届进球最多球队',
    value: '匈牙利 27 球',
    holder: '匈牙利',
    holderCode: 'HUN',
    note: '1954年5场轰入27球，场均5.4球。普斯卡什领衔的"黄金队"火力至今令人惊叹。',
  },
  {
    label: '最大比分胜利',
    value: '匈牙利 10:1 萨尔瓦多',
    holder: '匈牙利',
    holderCode: 'HUN',
    note: '1982年西班牙世界杯小组赛。世界杯历史上最大比分胜利之一。',
  },
  {
    label: '决赛最大比分',
    value: '巴西 5:2 瑞典',
    holder: '巴西',
    holderCode: 'BRA',
    note: '1958年决赛，17岁贝利梅开二度。这也是东道主在决赛中最大比分失利。',
  },
  {
    label: '最快进球',
    value: '哈坎·苏克 11秒',
    holder: '土耳其',
    holderCode: 'TUR',
    note: '2002年三四名决赛对阵韩国，开场仅11秒即破门得分。',
  },
  {
    label: '参赛次数最多',
    value: '巴西 22 次',
    holder: '巴西',
    holderCode: 'BRA',
    note: '唯一参加了每一届世界杯的球队，从1930年到2022年从未缺席。',
  },
  {
    label: '连续出场最多',
    value: '马特乌斯 5 届',
    holder: '德国',
    holderCode: 'GER',
    note: '1982-1998连续五届世界杯出场，与墨西哥的卡巴哈尔、韩国的洪明甫共享此纪录。',
  },
  {
    label: '最年长进球者',
    value: '米拉 42岁39天',
    holder: '喀麦隆',
    holderCode: 'CMR',
    note: '1994年美国世界杯对阵俄罗斯时破门，"米拉大叔"的庆祝舞步成为经典。',
  },
];

export type FunFactItem = {
  title: string;
  fact: string;
  icon: string;
};

export const FUN_FACTS: FunFactItem[] = [
  { title: '奖杯曾失窃', fact: '1966年世界杯前，雷米特杯在伦敦展览时被盗，一只名叫Pickles的牧羊犬在灌木丛中找到了它。', icon: '🐕' },
  { title: '决赛帽子戏法', fact: '1966年英格兰的赫斯特在决赛中上演帽子戏法，至今仍是唯一在世界杯决赛中做到这一点的球员。', icon: '🎩' },
  { title: '金球制胜', fact: '1998年法国世界杯首次使用"金球制"（突然死亡法），布兰科打入世界杯史上第一个金球。', icon: '✨' },
  { title: '最远进球', fact: '2010年南非世界杯，西班牙的比利亚在对阵智利时从中圈附近射门得分，距离约45米。', icon: '🚀' },
  { title: '红牌最多一届', fact: '2006年德国世界杯共出示28张红牌，是历史上红牌最多的一届，被称为"红牌世界杯"。', icon: '🟥' },
  { title: '点球大战之王', fact: '德国队在世界杯点球大战中4战4胜，是点球大战胜率100%的球队。英格兰则3战1胜2负。', icon: '🎯' },
  { title: '东道主魔咒', fact: '2010年南非是第一个小组未出线的东道主。此前所有东道主都至少进入了淘汰赛阶段。', icon: '🏠' },
  { title: '卫冕冠军魔咒', fact: '2002年法国、2010年意大利、2014年西班牙、2018年德国——近20年4支卫冕冠军全部小组出局。', icon: '🔮' },
];

export type GoldenBootItem = {
  year: number;
  player: string;
  code: string;
  team: string;
  goals: number;
};

export const GOLDEN_BOOT_WINNERS: GoldenBootItem[] = [
  { year: 2022, player: '姆巴佩', code: 'FRA', team: '法国', goals: 8 },
  { year: 2018, player: '凯恩', code: 'ENG', team: '英格兰', goals: 6 },
  { year: 2014, player: 'J罗', code: 'COL', team: '哥伦比亚', goals: 6 },
  { year: 2010, player: '穆勒', code: 'GER', team: '德国', goals: 5 },
  { year: 2006, player: '克洛泽', code: 'GER', team: '德国', goals: 5 },
  { year: 2002, player: '罗纳尔多', code: 'BRA', team: '巴西', goals: 8 },
  { year: 1998, player: '苏克', code: 'CRO', team: '克罗地亚', goals: 6 },
  { year: 1994, player: '斯托伊奇科夫', code: 'BUL', team: '保加利亚', goals: 6 },
  { year: 1990, player: '斯基拉奇', code: 'ITA', team: '意大利', goals: 6 },
  { year: 1986, player: '莱因克尔', code: 'ENG', team: '英格兰', goals: 6 },
  { year: 1982, player: '罗西', code: 'ITA', team: '意大利', goals: 6 },
  { year: 1978, player: '肯佩斯', code: 'ARG', team: '阿根廷', goals: 6 },
  { year: 1974, player: '拉托', code: 'POL', team: '波兰', goals: 7 },
  { year: 1970, player: '穆勒', code: 'GER', team: '西德', goals: 10 },
  { year: 1966, player: '尤西比奥', code: 'POR', team: '葡萄牙', goals: 9 },
  { year: 1962, player: '加林查', code: 'BRA', team: '巴西', goals: 4 },
  { year: 1958, player: '方丹', code: 'FRA', team: '法国', goals: 13 },
  { year: 1954, player: '柯奇士', code: 'HUN', team: '匈牙利', goals: 11 },
  { year: 1950, player: '阿德米尔', code: 'BRA', team: '巴西', goals: 8 },
  { year: 1938, player: '莱昂尼达斯', code: 'BRA', team: '巴西', goals: 7 },
  { year: 1934, player: '内耶德利', code: 'TCH', team: '捷克斯洛伐克', goals: 5 },
  { year: 1930, player: '斯塔比莱', code: 'ARG', team: '阿根廷', goals: 8 },
];
