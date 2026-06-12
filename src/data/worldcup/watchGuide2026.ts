export interface GroupAnalysis {
  group: string;
  teams: string[];
  groupName: string;
  analysis: string;
  darkHorse?: string;
  darkHorseReason: string;
}

export interface MustWatchMatch {
  homeTeam: string;
  homeTeamCode: string;
  awayTeam: string;
  awayTeamCode: string;
  reason: string;
  stage: string;
}

export interface DebutTeam {
  teamId: string;
  teamName: string;
  story: string;
  keyPlayer: string;
  expectation: string;
}

export interface WatchGuide2026 {
  groupAnalyses: GroupAnalysis[];
  mustWatchMatches: MustWatchMatch[];
  debutTeams: DebutTeam[];
  overallPrediction: string;
}

export const WATCH_GUIDE_2026: WatchGuide2026 = {
  groupAnalyses: [
    {
      group: "A",
      teams: ["ARG", "CRO", "EGY", "NZL"],
      groupName: "法老与探戈",
      analysis:
        "阿根廷作为卫冕冠军，小组出线几无悬念。克罗地亚虽核心老化但底蕴犹存，将与埃及争夺第二个出线名额。萨拉赫领衔的埃及渴望突破小组赛魔咒，新西兰实力偏弱但大洋洲代表不容小觑。本组看点在于克罗地亚与埃及的直接对话，胜者很可能锁定出线资格。",
      darkHorse: "EGY",
      darkHorseReason: "萨拉赫状态火热，埃及整体战术日趋成熟，有望力压克罗地亚抢得出线名额。",
    },
    {
      group: "B",
      teams: ["BRA", "URU", "SWE", "CPV"],
      groupName: "桑巴与北欧",
      analysis:
        "巴西队星光熠熠，小组头名当之无愧。乌拉圭新老交替顺利，苏亚雷斯之后仍有努涅斯等锋线尖刀，出线前景光明。瑞典北欧铁血风格令人忌惮，库拉索作为加勒比黑马首次参赛，实力有限但充满激情。本组巴西与乌拉圭的对决将是南美德比级别的精彩较量。",
      darkHorse: "SWE",
      darkHorseReason: "瑞典身体素质出众，定位球威胁极大，大赛经验丰富，有望在混战中抢得出线席位。",
    },
    {
      group: "C",
      teams: ["FRA", "COL", "CMR", "IRQ"],
      groupName: "高卢雄鸡",
      analysis:
        "法国阵容深度冠绝全球，姆巴佩领衔的攻击线令人生畏，小组头名毫无悬念。哥伦比亚在J罗之后迎来新一代球员崛起，竞争力不容忽视。喀麦隆非洲雄狮底蕴深厚，伊拉克虽实力偏弱但斗志昂扬。本组焦点在于哥伦比亚与喀麦隆的出线之争，两队风格迥异必将碰撞出精彩火花。",
      darkHorse: "CMR",
      darkHorseReason: "喀麦隆身体素质出色，非洲杯经验丰富，若能发挥速度优势，有望力压哥伦比亚出线。",
    },
    {
      group: "D",
      teams: ["ENG", "AUS", "SEN", "SUI"],
      groupName: "英伦风暴",
      analysis:
        "英格兰人才井喷，贝林厄姆与福登等新生代已挑大梁，小组出线稳如磐石。瑞士队大赛发挥稳定，屡屡在淘汰赛制造惊喜，出线概率较高。塞内加尔拥有马内等球星，具备爆冷实力。澳大利亚虽实力有限但作风顽强。本组看点是瑞士与塞内加尔的直接较量，将决定第二张出线门票归属。",
      darkHorse: "SEN",
      darkHorseReason: "塞内加尔阵容均衡，前场攻击力强劲，若马内状态在线，完全有能力超越瑞士拿下出线权。",
    },
    {
      group: "E",
      teams: ["GER", "JPN", "MAR", "CIV"],
      groupName: "死亡之组",
      analysis:
        "德国战车经历低谷后正在复苏，穆西亚拉等新星崛起让球迷重燃希望，小组头名可期。日本队连续在世界杯创造奇迹，技术流打法日趋成熟，是出线热门。摩洛哥上届杀入四强震惊世界，阿什拉夫领衔的防线固若金汤。科特迪瓦虽有大牌球员但整体性欠佳。本组三队争夺两个出线名额，堪称死亡之组。",
      darkHorse: "MAR",
      darkHorseReason: "摩洛哥上届四强底蕴犹存，防守反击体系成熟，有望再创佳绩力压日本出线。",
    },
    {
      group: "F",
      teams: ["ESP", "MEX", "TUN", "UZB"],
      groupName: "斗牛士之舞",
      analysis:
        "西班牙传控足球登峰造极，佩德里与加维组成的中场双核令对手窒息，小组头名悬念不大。墨西哥世界杯常客但始终难以突破十六强魔咒，出线是基本目标。突尼斯北非劲旅防守顽强，乌兹别克斯坦首次参赛充满未知数。本组看点在于墨西哥能否延续小组出线的传统，以及乌兹别克斯坦的首次世界杯之旅。",
      darkHorse: "UZB",
      darkHorseReason: "乌兹别克斯坦青训成果显著，亚洲杯表现出色，首次参赛或能带来惊喜。",
    },
    {
      group: "G",
      teams: ["POR", "KOR", "ECU", "JOR"],
      groupName: "黄金远航",
      analysis:
        "葡萄牙虽C罗时代落幕，但新生代人才辈出，莱奥与费利克斯撑起进攻大旗，出线无忧。韩国队孙兴慜仍是亚洲一哥，整体实力在亚洲顶尖。厄瓜多尔高原主场培养出顽强作风，约旦首次参赛充满斗志。本组葡萄牙一家独大，韩国与厄瓜多尔争夺第二出线名额将是主要看点。",
      darkHorse: "ECU",
      darkHorseReason: "厄瓜多尔南美预选赛表现出色，球员体能充沛，高位逼抢战术或让韩国难以招架。",
    },
    {
      group: "H",
      teams: ["NED", "TUR", "PAR", "GHA"],
      groupName: "橙色风暴",
      analysis:
        "荷兰全攻全守传统延续，范迪克坐镇后防稳如泰山，小组出线不在话下。土耳其拥有恰尔汗奥卢等球星，技术细腻且充满激情。巴拉圭南美铁血防守著称，加纳非洲黑星天赋异禀。本组竞争激烈，土耳其与加纳的出线之争将是一大看点，两队风格截然不同必将奉献精彩对决。",
      darkHorse: "GHA",
      darkHorseReason: "加纳年轻球员成长迅速，身体素质出众，若能提升战术纪律性，完全有实力争夺出线名额。",
    },
    {
      group: "I",
      teams: ["ITA", "CZE", "RSA", "NOR"],
      groupName: "蓝衣传奇",
      analysis:
        "意大利虽缺席上届世界杯，但欧国联表现出色，巴雷拉与巴斯托尼领衔的阵容实力强劲。捷克东欧铁骑作风硬朗，大赛经验丰富。挪威拥有哈兰德这一超级杀器，进球能力惊人。南非非洲杯表现起伏不定。本组最大看点是哈兰德能否率挪威创造奇迹，意大利与挪威的对决将是进球盛宴。",
      darkHorse: "NOR",
      darkHorseReason: "哈兰德一人足以改变战局，挪威若围绕其打造战术体系，有望力压捷克抢得出线资格。",
    },
    {
      group: "J",
      teams: ["BEL", "CAN", "AUT", "QAT"],
      groupName: "红魔出征",
      analysis:
        "比利时黄金一代谢幕，但德布劳内仍在中场运筹帷幄，小组出线仍有保障。加拿大阿方索·戴维斯速度惊人，上届世界杯已展现实力。奥地利朗尼克执教下战术体系成熟，德甲班底实力不俗。卡塔尔上届主场作战惨淡收场，此次客场挑战更为艰难。本组比利时领跑，加拿大与奥地利争夺出线权。",
      darkHorse: "AUT",
      darkHorseReason: "奥地利在朗尼克调教下高位逼抢体系成熟，萨比策与阿拉巴领衔，有望力压加拿大出线。",
    },
    {
      group: "K",
      teams: ["USA", "SCO", "HAI", "DZA"],
      groupName: "北美争霸",
      analysis:
        "美国队本土作战优势明显，普利西奇与麦肯尼等人在欧洲历练多年，小组头名志在必得。苏格兰时隔多年重返世界杯，罗伯逊领衔的阵容斗志昂扬。海地加勒比足球代表，虽实力有限但激情四溢。阿尔及利亚北非之狐技术细腻，马赫雷斯仍是核心。本组美国出线无忧，苏格兰与阿尔及利亚争夺第二名额。",
      darkHorse: "DZA",
      darkHorseReason: "阿尔及利亚拥有马赫雷斯等欧洲联赛球员，技术能力出众，有望在关键时刻超越苏格兰出线。",
    },
    {
      group: "L",
      teams: ["IRN", "KSA", "CUR", "COD"],
      groupName: "波斯湾风云",
      analysis:
        "伊朗亚洲铁骑身体对抗能力出色，阿兹蒙与塔雷米组成锋线双煞，小组出线有较大希望。沙特阿拉伯技术流打法独树一帜，上届击败阿根廷令人印象深刻。库拉索加勒比小岛奇迹，首次参赛已是巨大成就。刚果民主共和国非洲新贵，身体素质惊人。本组四队实力接近，堪称最开放的小组，每场比赛都充满悬念。",
      darkHorse: "COD",
      darkHorseReason: "刚果民主共和国球员天赋出众，若能提升整体配合，有望在本组混战中脱颖而出。",
    },
  ],
  mustWatchMatches: [
    {
      homeTeam: "阿根廷",
      homeTeamCode: "ARG",
      awayTeam: "克罗地亚",
      awayTeamCode: "CRO",
      reason:
        "卫冕冠军与上届半决赛对手再度相遇，梅西之后阿根廷能否延续辉煌，克罗地亚黄金一代的谢幕之战，充满戏剧性与情感张力。",
      stage: "小组赛A组",
    },
    {
      homeTeam: "巴西",
      homeTeamCode: "BRA",
      awayTeam: "乌拉圭",
      awayTeamCode: "URU",
      reason:
        "南美两大豪强的经典对决，巴西桑巴足球与乌拉圭铁血风格的碰撞，历史恩怨与足球艺术的完美融合，注定是一场视觉盛宴。",
      stage: "小组赛B组",
    },
    {
      homeTeam: "德国",
      homeTeamCode: "GER",
      awayTeam: "日本",
      awayTeamCode: "JPN",
      reason:
        "上届世界杯日本逆转德国的噩梦仍历历在目，德国战车志在复仇，日本则渴望再创奇迹，这场对决注定火星四溅。",
      stage: "小组赛E组",
    },
    {
      homeTeam: "法国",
      homeTeamCode: "FRA",
      awayTeam: "哥伦比亚",
      awayTeamCode: "COL",
      reason:
        "姆巴佩的速度对决哥伦比亚的南美技术流，两种截然不同足球哲学的碰撞，进球与精彩配合可期。",
      stage: "小组赛C组",
    },
    {
      homeTeam: "英格兰",
      homeTeamCode: "ENG",
      awayTeam: "瑞士",
      awayTeamCode: "SUI",
      reason:
        "英格兰豪华攻击线对阵瑞士铁血防线，矛与盾的较量，贝林厄姆能否突破瑞士的铜墙铁壁是一大看点。",
      stage: "小组赛D组",
    },
    {
      homeTeam: "意大利",
      homeTeamCode: "ITA",
      awayTeam: "挪威",
      awayTeamCode: "NOR",
      reason:
        "意大利链式防守对阵哈兰德的恐怖进球能力，这是最极致的攻防对决，哈兰德每一次触球都可能改写比分。",
      stage: "小组赛I组",
    },
    {
      homeTeam: "荷兰",
      homeTeamCode: "NED",
      awayTeam: "土耳其",
      awayTeamCode: "TUR",
      reason:
        "荷兰全攻全守对阵土耳其的激情足球，两支技术型球队的碰撞，恰尔汗奥卢与范迪克的直接对话令人期待。",
      stage: "小组赛H组",
    },
    {
      homeTeam: "葡萄牙",
      homeTeamCode: "POR",
      awayTeam: "韩国",
      awayTeamCode: "KOR",
      reason:
        "葡萄牙新生代攻击群对阵孙兴慜领衔的韩国队，莱奥的速度对决孙兴慜的射术，亚洲与欧洲足球的巅峰对话。",
      stage: "小组赛G组",
    },
    {
      homeTeam: "比利时",
      homeTeamCode: "BEL",
      awayTeam: "奥地利",
      awayTeamCode: "AUT",
      reason:
        "德布劳内的组织大师表演对阵朗尼克的高位逼抢体系，两种现代足球理念的碰撞，中场控制权的争夺将决定比赛走向。",
      stage: "小组赛J组",
    },
    {
      homeTeam: "伊朗",
      homeTeamCode: "IRN",
      awayTeam: "沙特阿拉伯",
      awayTeamCode: "KSA",
      reason:
        "中东两大宿敌的世界杯对决，地缘政治的紧张关系为这场比赛增添了超越足球的意义，双方球员必将倾尽全力。",
      stage: "小组赛L组",
    },
  ],
  debutTeams: [
    {
      teamId: "UZB",
      teamName: "乌兹别克斯坦",
      story:
        "乌兹别克斯坦历经数十年耕耘终圆世界杯梦。苏联解体后独立参赛以来，这支中亚球队多次倒在预选赛最后一关。2026年，凭借完善的青训体系和归化策略，他们终于突破重围，成为中亚足球的骄傲，书写了不屈不挠的足球传奇。",
      keyPlayer: "肖穆罗多夫",
      expectation: "力争小组出线，展现中亚足球风采",
    },
    {
      teamId: "JOR",
      teamName: "约旦",
      story:
        "约旦足球在亚洲杯上的惊艳表现让他们获得了世界瞩目。这支来自中东的球队以顽强的防守和快速反击著称，亚洲杯杀入决赛震惊足坛。首次踏上世界杯舞台，约旦人带着整个阿拉伯世界的期望，誓要证明小国也能在足球最高殿堂绽放光芒。",
      keyPlayer: "塔马里",
      expectation: "争取小组出线，延续亚洲杯神奇表现",
    },
    {
      teamId: "CUR",
      teamName: "库拉索",
      story:
        "库拉索是加勒比海上的明珠，人口仅十五万却孕育出世界杯参赛队，堪称足球奇迹。这支球队主要由荷兰联赛球员组成，继承了荷兰全攻全守的足球基因。从小岛走向世界舞台，库拉索的故事本身就是对足球梦想最好的诠释。",
      keyPlayer: "库罗",
      expectation: "享受世界杯之旅，展现加勒比足球魅力",
    },
    {
      teamId: "CPV",
      teamName: "佛得角",
      story:
        "佛得角群岛位于非洲西海岸，这个岛国凭借深厚的足球底蕴和大量旅欧球员首次闯入世界杯。球队融合了非洲球员的身体天赋与欧洲足球的战术素养，近年来在非洲杯上屡有亮眼表现。首次登上世界杯舞台，佛得角渴望向世界展示岛国足球的独特魅力。",
      keyPlayer: "门德斯",
      expectation: "力争小组出线，证明非洲岛国实力",
    },
  ],
  overallPrediction:
    "2026世界杯将是一届格局重塑的赛事。卫冕冠军阿根廷仍是夺冠热门，但法国、巴西的整体阵容深度更为恐怖。德国与西班牙的复苏让传统强队格局更加稳固，而摩洛哥等新兴力量的崛起为赛事增添变数。亚洲球队中日本最具突破潜力，非洲球队则可能制造更多惊喜。最终冠军很可能在法国与巴西之间产生，但足球的魅力正在于不可预测性，让我们拭目以待。",
};
