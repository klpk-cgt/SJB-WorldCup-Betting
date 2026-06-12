export interface TeamTactics {
  teamId: string;
  formation: string;
  formationAlt?: string;
  style: string[];
  attackPattern: string;
  defensePattern: string;
  keyPlayerRole: {
    playerName: string;
    role: string;
    description: string;
  }[];
  setPieceThreat: 'high' | 'medium' | 'low';
  counterAttack: 'high' | 'medium' | 'low';
  possessionStyle: 'dominant' | 'balanced' | 'direct';
  weakness: string;
  summary: string;
}

export const TEAM_TACTICS: Record<string, TeamTactics> = {
  ARG: {
    teamId: 'ARG',
    formation: '4-3-3',
    formationAlt: '4-4-2',
    style: ['控球渗透', '灵活换位', '中路突破', '高位逼抢'],
    attackPattern: '以Messi为核心的组织体系，通过中路短传渗透与边路内切相结合，Mac Allister与De Paul掌控节奏，Álvarez提供前场跑动与压迫，进攻层次丰富且极具创造力。',
    defensePattern: '中前场积极高位逼抢，Enzo Fernández负责中场拦截与扫荡，后防线保持紧凑，边后卫适度压上但留有回追空间，整体防守纪律性强。',
    keyPlayerRole: [
      { playerName: 'Messi', role: '前场自由人', description: '拥有绝对球权自由度，回撤组织与禁区终结双重威胁，是进攻体系的核心枢纽' },
      { playerName: 'Mac Allister', role: '中场节拍器', description: '掌控比赛节奏，串联攻防转换，具备出色的传球视野与定位球能力' },
      { playerName: 'Álvarez', role: '逼抢前锋', description: '前场第一道防线，通过高强度跑动压迫对手出球，同时提供纵深跑位' },
    ],
    setPieceThreat: 'high',
    counterAttack: 'high',
    possessionStyle: 'dominant',
    weakness: '对Messi依赖度高，其体能下降时进攻威胁明显减弱；边后卫位置攻守转换时偶有暴露空当。',
    summary: '阿根廷以Messi为核心的战术体系已趋成熟，2022世界杯夺冠后风格更加自信从容。中场控制力出色，攻防转换流畅，定位球威胁大。整体战术灵活性强，可根据对手调整阵型与节奏。核心球员老化与替补深度是需要关注的问题，但大赛经验和团队凝聚力仍是最大优势。',
  },

  BRA: {
    teamId: 'BRA',
    formation: '4-2-3-1',
    formationAlt: '4-3-3',
    style: ['技术流控球', '边路突破', '灵活跑位', '创造性进攻'],
    attackPattern: '以Vinícius Jr.和Rodrygo的边路突破为核心武器，内马尔或Bruno Guimarães负责中路组织串联，边后卫大幅压上形成宽度优势，进攻节奏快且变化多端。',
    defensePattern: '双后腰提供中路保护，Casemiro或João Gomes负责拦截扫荡，边后卫压上后依靠后腰补位，整体防守偏积极但阵型拉开时中路偶有空虚。',
    keyPlayerRole: [
      { playerName: 'Vinícius Jr.', role: '左边路爆点', description: '一对一突破能力极强，内切射门与传中均具威胁，是进攻端最大爆点' },
      { playerName: 'Bruno Guimarães', role: '中场组织核心', description: '承上启下的枢纽，传球视野开阔，具备推进与远射能力' },
      { playerName: 'Rodrygo', role: '右路攻击手', description: '技术细腻，可内切可拉边，与Vinícius形成双翼齐飞' },
    ],
    setPieceThreat: 'medium',
    counterAttack: 'high',
    possessionStyle: 'balanced',
    weakness: '中后卫组合稳定性不足，面对高强度逼抢时后场出球偶有失误；进攻过于依赖边路个人能力。',
    summary: '巴西队延续技术流传统，以Vinícius Jr.和Rodrygo的边路双星为进攻利器，配合Bruno Guimarães的中场调度，进攻端天赋极高。但近年来大赛表现起伏，防守端中卫搭档尚未固定，整体战术执行力有待提升。球队需要在华丽进攻与务实防守之间找到更好平衡。',
  },

  FRA: {
    teamId: 'FRA',
    formation: '4-2-3-1',
    formationAlt: '4-3-3',
    style: ['快速反击', '身体对抗', '边路冲击', '攻守平衡'],
    attackPattern: '以Mbappé的绝对速度为核心反击武器，边路突破与内切极具威胁，Griezmann负责串联组织与无球跑动，中场具备强大推进能力，进攻转换速度极快。',
    defensePattern: 'Tchouaméni与Kanté或Rabiot组成双后腰屏障，中路防守硬朗，Saliba领衔的后防线个人能力突出，整体防守层次分明，阵地战防守稳固。',
    keyPlayerRole: [
      { playerName: 'Mbappé', role: '反击终结者', description: '速度与终结能力的完美结合，反击中最大威胁点，也可拉边制造空间' },
      { playerName: 'Griezmann', role: '影锋/组织者', description: '攻防两端贡献巨大，无球跑动与关键传球是进攻润滑剂' },
      { playerName: 'Tchouaméni', role: '防守型后腰', description: '中场屏障，拦截与出球能力兼备，是攻防转换的关键节点' },
    ],
    setPieceThreat: 'high',
    counterAttack: 'high',
    possessionStyle: 'balanced',
    weakness: '控球体系不够细腻，面对密集防守时缺乏有效渗透手段；部分位置替补深度不足。',
    summary: '法国队拥有世界顶级阵容深度，以Mbappé的反击速度和Griezmann的全能串联为核心竞争力。中后场身体对抗与防守硬度出色，定位球威胁大。球队在攻守转换中极具杀伤力，但阵地战进攻创造力有时不足。整体实力均衡，大赛经验丰富，始终是夺冠热门。',
  },

  GER: {
    teamId: 'GER',
    formation: '4-2-3-1',
    formationAlt: '3-4-2-1',
    style: ['高位逼抢', '快速传导', '位置轮转', '边路进攻'],
    attackPattern: '以Wirtz和Müller或Musiala的创造性中场为核心，通过快速短传与位置轮转撕开防线，边后卫大幅压上提供宽度，进攻节奏快且层次分明，强调整体配合。',
    defensePattern: '前场高位逼抢积极，中场以Andrich或Gündoğan负责拦截与过渡，后防线在Rüdiger带领下对抗能力强，但高位防线身后空间是隐患。',
    keyPlayerRole: [
      { playerName: 'Wirtz', role: '前场组织核心', description: '传球创造力与突破能力兼备，是进攻端最具威胁的创造者' },
      { playerName: 'Musiala', role: '盘带突破手', description: '持球推进能力极强，能在密集防守中制造空间与机会' },
      { playerName: 'Rüdiger', role: '后防领袖', description: '防守硬朗且具备出球能力，是后防线的精神支柱' },
    ],
    setPieceThreat: 'medium',
    counterAttack: 'medium',
    possessionStyle: 'dominant',
    weakness: '高位防线身后空间大，速度型前锋可针对性打击；中锋位置缺乏世界级终结者。',
    summary: '德国队在纳格尔斯曼执教下回归高位逼抢与快速传导风格，Wirtz与Musiala的双核驱动赋予进攻极大创造力。边后卫压上积极，整体阵型压得靠前。但高位防线身后空当明显，且缺少顶级中锋仍是老问题。2024欧洲杯后球队正在新老交替中寻找最佳平衡。',
  },

  ESP: {
    teamId: 'ESP',
    formation: '4-3-3',
    formationAlt: '4-2-3-1',
    style: ['传控主导', '高位逼抢', '边路渗透', '技术流'],
    attackPattern: '以Rodri为节拍器的传控体系，通过Lamine Yamal和Nico Williams的边路突破撕开防线，Pedri负责中路串联，整体进攻以控球为基础层层推进，传球精度极高。',
    defensePattern: '以控球代防守的理念，丢球后立即就地反抢，Rodri提供中场拦截保障，后防线保持高位，整体防守以主动压迫为主而非被动退守。',
    keyPlayerRole: [
      { playerName: 'Rodri', role: '中场枢纽', description: '攻防转换核心，传球调度与拦截扫荡兼备，是体系运转的关键' },
      { playerName: 'Lamine Yamal', role: '右边路天才', description: '突破与传中能力出色，年轻但已具备改变比赛的能力' },
      { playerName: 'Pedri', role: '中场创造者', description: '传球视野与控球技术顶级，负责中前场串联与关键传球' },
    ],
    setPieceThreat: 'medium',
    counterAttack: 'medium',
    possessionStyle: 'dominant',
    weakness: '面对高强度身体对抗时中场控制力下降；缺少传统中锋，禁区内终结能力不足。',
    summary: '西班牙在2024欧洲杯夺冠证明了传控体系的新生，Lamine Yamal和Nico Williams的边路双翼为传统tiki-taka注入速度与突破。Rodri的中场统治力是体系基石，Pedri的创造力提供进攻纵深。但缺少顶级中锋仍是隐患，面对身体对抗强硬的对手时需要更多战术变化。',
  },

  ENG: {
    teamId: 'ENG',
    formation: '4-3-3',
    formationAlt: '3-4-3',
    style: ['边路进攻', '快速反击', '身体对抗', '定位球威胁'],
    attackPattern: '以Bellingham的中路推进和Saka的边路突破为核心，Kane回撤串联与禁区内终结兼顾，Rice提供中场防守保障，进攻端个人能力突出但整体配合尚需磨合。',
    defensePattern: 'Rice担任单后腰提供中路屏障，后防线以Stones和Guehi为核心，边后卫内收加强中路防守，整体防守偏稳健但面对快速反击时转身速度是隐患。',
    keyPlayerRole: [
      { playerName: 'Bellingham', role: '全能中场', description: '前插得分与组织兼备，攻防两端影响力巨大，是中场核心' },
      { playerName: 'Kane', role: '回撤中锋', description: '回撤组织串联的同时保持禁区内的终结威胁，战术价值极高' },
      { playerName: 'Saka', role: '右边路爆点', description: '突破与传中能力出色，内切射门威胁大，是进攻端重要武器' },
    ],
    setPieceThreat: 'high',
    counterAttack: 'high',
    possessionStyle: 'balanced',
    weakness: '中场控制力在面对顶级传控球队时不足；战术体系过于依赖核心球员个人发挥，整体配合不够流畅。',
    summary: '英格兰拥有顶级阵容天赋，Bellingham、Kane和Saka组成的核心框架攻守兼备。定位球是重要得分手段，反击速度极快。但近年来大赛中战术执行力常受质疑，中场在面对强队时控制力不足，主教练的战术安排与临场调整能力是关键变量。整体实力不容小觑但需提升整体性。',
  },

  POR: {
    teamId: 'POR',
    formation: '4-3-3',
    formationAlt: '4-2-3-1',
    style: ['边路突破', '快速反击', '技术流', '灵活换位'],
    attackPattern: '以Leão和Bernardo Silva的边路突破为核心，Bruno Fernandes负责中路组织与关键传球，中锋位置由Ramos或Gonçalo Ramos提供终结，进攻节奏快且边路威胁极大。',
    defensePattern: '中场以Vitinha和Neves负责拦截与出球，后防线以Dias为核心组织防守，边后卫适度压上但回追积极，整体防守纪律性较好但面对身体对抗时偶有吃亏。',
    keyPlayerRole: [
      { playerName: 'Bruno Fernandes', role: '中场组织核心', description: '传球视野与关键球能力出色，定位球威胁大，是进攻端大脑' },
      { playerName: 'Leão', role: '左边路爆点', description: '速度与突破能力极强，一对一几乎无法防守，反击中最大威胁' },
      { playerName: 'Rúben Dias', role: '后防领袖', description: '防守组织与对抗能力出色，是后防线稳定性的保障' },
    ],
    setPieceThreat: 'high',
    counterAttack: 'high',
    possessionStyle: 'balanced',
    weakness: '中锋位置缺乏稳定世界级射手；后防线年龄偏大，面对速度型前锋时回追能力不足。',
    summary: '葡萄牙后C罗时代已完成核心更替，Bruno Fernandes和Leão成为新进攻双核。边路突破与反击速度是最大武器，定位球威胁大。中场技术细腻，Vitinha的成长增强了控制力。但中锋位置始终缺少顶级终结者，后防线老化问题逐渐显现。整体实力强劲但大赛心理素质仍需证明。',
  },

  NED: {
    teamId: 'NED',
    formation: '3-4-3',
    formationAlt: '4-3-3',
    style: ['全攻全守', '边翼卫进攻', '高位逼抢', '技术流'],
    attackPattern: '三后卫体系下边翼卫大幅压上提供宽度，Simons和Frimpong的边路冲击力极强，中场以Reijnders负责组织调度，Depay或Weghorst提供前场支点，进攻层次丰富。',
    defensePattern: '三中卫体系以Van Dijk为核心，Ake和De Vrij提供灵活性，边翼卫回撤形成五后卫，中场De Jong负责拦截与出球，整体防守体系严密但边翼卫身后空间是弱点。',
    keyPlayerRole: [
      { playerName: 'Van Dijk', role: '后防核心', description: '防空与对抗能力顶级，指挥防线与出球能力兼备，是防守体系基石' },
      { playerName: 'Simons', role: '前场自由人', description: '跑位灵活，突破与射门能力出色，是进攻端最具活力的球员' },
      { playerName: 'Reijnders', role: '中场组织者', description: '传球视野开阔，掌控节奏与推进能力兼备，是中场核心' },
    ],
    setPieceThreat: 'high',
    counterAttack: 'medium',
    possessionStyle: 'balanced',
    weakness: '边翼卫压上后身后空当大，容易被针对性反击；中锋位置缺乏稳定得分点。',
    summary: '荷兰队坚持三后卫全攻全守传统，Van Dijk领衔的防线稳固，边翼卫体系提供强大进攻宽度。Simons的崛起为前场注入活力，Reijnders的中场调度日趋成熟。但边翼卫身后的空当始终是对手重点打击目标，中锋位置的得分效率也需提升。整体战术风格鲜明，大赛中竞争力不俗。',
  },

  ITA: {
    teamId: 'ITA',
    formation: '4-3-3',
    formationAlt: '3-5-2',
    style: ['防守反击', '链式防守', '战术纪律', '定位球进攻'],
    attackPattern: '以Barella的中场推进和Chiesa的边路突破为核心，Pellegrini或Frattesi提供前插得分能力，整体进攻偏务实，善于抓住对手失误快速反击，阵地战创造力有限。',
    defensePattern: '传统链式防守理念，Bastoni领衔后防线组织严密，中场三人组协作拦截，整体防守层次分明且纪律性极强，擅长压缩空间与切断传球线路。',
    keyPlayerRole: [
      { playerName: 'Barella', role: '全能中场', description: '跑动覆盖面大，攻防转换中作用突出，是中场发动机' },
      { playerName: 'Bastoni', role: '出球中卫', description: '防守稳健且出球能力出色，是后场组织的起点' },
      { playerName: 'Chiesa', role: '边路突击手', description: '速度与突破能力是反击中最锐利的武器' },
    ],
    setPieceThreat: 'medium',
    counterAttack: 'high',
    possessionStyle: 'balanced',
    weakness: '锋线缺乏世界级射手，阵地战进攻创造力不足；阵容深度相比顶级强队略显薄弱。',
    summary: '意大利延续防守反击传统，链式防守体系严密，Barella的全能与Bastoni的出球是攻防转换关键。Chiesa的边路突破是反击利器，但整体进攻端缺乏顶级终结者。2024欧洲杯表现不佳暴露了进攻乏力的问题，球队需要在保持防守传统的同时提升进攻创造力与阵容深度。',
  },

  BEL: {
    teamId: 'BEL',
    formation: '4-2-3-1',
    formationAlt: '4-3-3',
    style: ['快速反击', '边路进攻', '技术流', '灵活换位'],
    attackPattern: '以De Bruyne的组织调度为核心，Doku和Trossard的边路突破提供宽度与速度，Lukaku作为前场支点吸引防守，进攻端个人能力突出但整体配合流畅度有起伏。',
    defensePattern: '双后腰Onana和Tielemans提供中路屏障，后防线以Fofana和Theate为核心，整体防守偏积极但后防线稳定性不足，面对高压时出球失误偏多。',
    keyPlayerRole: [
      { playerName: 'De Bruyne', role: '中场大师', description: '传球视野与创造力世界顶级，是进攻端绝对核心与大脑' },
      { playerName: 'Doku', role: '左边路爆点', description: '盘带突破能力极强，一对一成功率极高，是边路最大威胁' },
      { playerName: 'Lukaku', role: '支点中锋', description: '身体对抗与终结能力兼备，是前场战术支点' },
    ],
    setPieceThreat: 'medium',
    counterAttack: 'high',
    possessionStyle: 'balanced',
    weakness: '黄金一代逐渐老去，后防线稳定性不足；关键时刻心理素质受质疑，大赛表现常低于预期。',
    summary: '比利时黄金一代逐渐谢幕，De Bruyne仍是世界顶级中场核心，Doku的崛起为边路注入新活力。但后防线重建尚未完成，整体阵容深度下滑明显。球队大赛心理素质长期受质疑，关键时刻屡屡掉链子。新一代球员需要尽快成长，否则球队竞争力将持续下滑。',
  },

  CRO: {
    teamId: 'CRO',
    formation: '4-3-3',
    formationAlt: '4-2-3-1',
    style: ['中场控制', '技术流', '顽强防守', '战术纪律'],
    attackPattern: '以Modrić和Kovačić的中场控制为基础，通过精准传球与节奏变化组织进攻，Perišić和Kramarić提供前场威胁，进攻偏重中场组织但缺乏绝对速度与爆发力。',
    defensePattern: '中场三人组协作拦截保护后防，Gvardiol领衔后防线个人能力突出，整体防守以中场控制减少对手进攻机会，阵地战防守韧性极强。',
    keyPlayerRole: [
      { playerName: 'Modrić', role: '中场大师', description: '传球与控球能力仍是顶级，是球队节奏掌控者与精神领袖' },
      { playerName: 'Gvardiol', role: '后防核心', description: '防守与出球能力兼备，可踢中卫和左后卫，战术灵活性高' },
      { playerName: 'Kramarić', role: '影锋', description: '跑位灵活，射门技术出色，是前场主要得分点' },
    ],
    setPieceThreat: 'medium',
    counterAttack: 'medium',
    possessionStyle: 'dominant',
    weakness: '核心球员年龄偏大，体能与速度下降明显；锋线缺乏顶级射手，进攻终结效率不足。',
    summary: '克罗地亚以Modrić为代表的中场技术流仍是球队标签，Kovačić和Gvardiol的支撑使中场控制力保持较高水准。但核心阵容老化严重，新生代球员尚未完全接班。球队大赛韧性极强，但进攻端缺乏速度与终结能力，面对高强度逼抢时中场优势难以发挥。正处于新老交替的关键期。',
  },

  URU: {
    teamId: 'URU',
    formation: '4-4-2',
    formationAlt: '4-3-3',
    style: ['高位逼抢', '快速反击', '身体对抗', '顽强拼搏'],
    attackPattern: '以Núñez的前场逼抢与冲击力为核心，Valverde提供中场推进与远射威胁，两翼Pellistri和De Arrascaeta提供宽度与创造力，进攻节奏快且对抗强度高。',
    defensePattern: '前场积极逼抢，中场四人组协作拦截，Araújo和Giménez组成硬朗中卫搭档，整体防守风格凶悍且纪律性强，善于通过对抗打乱对手节奏。',
    keyPlayerRole: [
      { playerName: 'Valverde', role: '全能中场', description: '跑动覆盖面极大，远射与推进能力突出，是中场发动机' },
      { playerName: 'Núñez', role: '冲击型中锋', description: '速度与对抗兼备，前场逼抢积极，是反击第一点' },
      { playerName: 'Araújo', role: '后防核心', description: '速度与对抗能力出色，是后防线最稳定的屏障' },
    ],
    setPieceThreat: 'high',
    counterAttack: 'high',
    possessionStyle: 'direct',
    weakness: '进攻端终结效率不稳定，Núñez把握机会能力起伏大；中场技术细腻度不足，控球能力有限。',
    summary: '乌拉圭在贝尔萨执教下风格鲜明，高位逼抢与快速反击是核心战术。Valverde的全能与Núñez的冲击力是进攻利器，Araújo领衔的防线稳固且对抗强硬。球队比赛强度极高，但进攻终结效率不稳定，中场控球能力偏弱。整体竞争力强劲，大赛中任何对手都不敢轻视。',
  },

  COL: {
    teamId: 'COL',
    formation: '4-3-3',
    formationAlt: '4-2-3-1',
    style: ['快速反击', '边路突破', '技术流', '灵活跑位'],
    attackPattern: '以Luis Díaz的边路突破为核心武器，James Rodríguez负责中路组织与关键传球，中路配合与边路突破相结合，进攻节奏快且富有创造力，反击中威胁极大。',
    defensePattern: '中场以Lerma和Barrios负责拦截与扫荡，后防线以Sánchez为核心组织防守，整体防守偏积极但纪律性有时不足，面对持续施压时防线偶有混乱。',
    keyPlayerRole: [
      { playerName: 'Luis Díaz', role: '左边路爆点', description: '速度与突破能力极强，反击中最大威胁点，内切射门能力出色' },
      { playerName: 'James Rodríguez', role: '组织核心', description: '传球视野与创造力仍是顶级，定位球与关键传球是进攻利器' },
      { playerName: 'Sánchez', role: '后防核心', description: '对抗与防空能力出色，是后防线稳定性的保障' },
    ],
    setPieceThreat: 'high',
    counterAttack: 'high',
    possessionStyle: 'balanced',
    weakness: '后防线稳定性不足，面对顶级进攻时容易失误；James体能下降后中场控制力减弱。',
    summary: '哥伦比亚以Luis Díaz的边路突破和James的组织为核心，反击速度快且创造力强。2024美洲杯表现出色证明球队竞争力。但后防线面对强队时不够稳健，James体能问题影响中场控制。整体风格积极进取，技术流与速度兼备，是南美不可忽视的力量。',
  },

  MEX: {
    teamId: 'MEX',
    formation: '4-3-3',
    formationAlt: '4-2-3-1',
    style: ['小范围配合', '快速传递', '技术流', '高位逼抢'],
    attackPattern: '以小范围快速传递和二过一配合为特色，中场技术细腻善于地面渗透，边路突破与内切相结合，进攻节奏快但缺乏绝对爆点，依赖整体配合创造机会。',
    defensePattern: '前场积极逼抢试图在对方半场夺回球权，中场协作拦截但身体对抗偏弱，后防线以Álvarez为核心组织防守，整体防守纪律性尚可但面对强攻时抗压能力不足。',
    keyPlayerRole: [
      { playerName: 'Álvarez', role: '后防领袖', description: '防守经验丰富且出球能力不错，是后防线组织核心' },
      { playerName: 'Lozano', role: '边路突击手', description: '速度与突破能力出色，是反击中最具威胁的球员' },
      { playerName: 'Jiménez', role: '支点中锋', description: '技术全面可回撤串联，但得分效率近年有所下滑' },
    ],
    setPieceThreat: 'low',
    counterAttack: 'medium',
    possessionStyle: 'balanced',
    weakness: '身体对抗能力不足，面对欧洲强队时中场容易被压制；缺乏顶级射手，终结能力偏弱。',
    summary: '墨西哥延续技术流传统，小范围配合与快速传递是进攻特色。Lozano的边路速度是反击利器，但整体缺乏绝对爆点与顶级射手。身体对抗不足导致面对欧洲强队时中场常被压制，大赛淘汰赛阶段始终难以突破。球队需要在保持技术特色的同时提升对抗强度与终结效率。',
  },

  USA: {
    teamId: 'USA',
    formation: '4-3-3',
    formationAlt: '4-2-3-1',
    style: ['高位逼抢', '快速反击', '身体对抗', '跑动积极'],
    attackPattern: '以Pulisic的边路突破和McKennie的中场推进为核心，Weah提供边路速度与冲击力，整体进攻偏重速度与身体对抗，反击中威胁较大但阵地战创造力有限。',
    defensePattern: '前场高位逼抢积极，中场以Adams负责拦截扫荡，后防线以Richards和Ream为核心，整体防守跑动积极但战术纪律性有待提升，面对技术流球队时容易失位。',
    keyPlayerRole: [
      { playerName: 'Pulisic', role: '进攻核心', description: '突破与射门能力出色，是进攻端最具威胁的球员与创造力来源' },
      { playerName: 'Adams', role: '防守型后腰', description: '跑动覆盖面大，拦截与对抗能力强，是中场防守屏障' },
      { playerName: 'McKennie', role: '全能中场', description: '身体对抗与推进能力突出，攻防两端贡献大' },
    ],
    setPieceThreat: 'medium',
    counterAttack: 'high',
    possessionStyle: 'direct',
    weakness: '阵地战进攻缺乏创造力，面对密集防守时办法不多；后防线稳定性不足，关键时刻容易失误。',
    summary: '美国队以Pulisic为核心的进攻体系反击速度快，Adams和McKennie的中场对抗能力强。高位逼抢是标志性战术，但阵地战创造力不足且后防线不够稳健。2026世界杯主场作战是巨大动力，球队需要在波切蒂诺带领下提升战术素养与比赛控制力，方能在主场有所突破。',
  },

  JPN: {
    teamId: 'JPN',
    formation: '4-2-3-1',
    formationAlt: '4-3-3',
    style: ['快速传导', '高位逼抢', '技术流', '团队配合'],
    attackPattern: '以久保建英的前场创造力和三笘薫的边路突破为核心，中场快速传导与无球跑动相结合，善于通过地面配合渗透防线，进攻节奏快且团队配合默契。',
    defensePattern: '前场积极逼抢试图高位夺回球权，远藤航负责中场拦截与扫荡，后防线保持紧凑且协作性强，整体防守以团队协作为基础弥补个人对抗不足。',
    keyPlayerRole: [
      { playerName: '久保建英', role: '前场组织核心', description: '传球创造力与突破能力出色，是进攻端最具威胁的创造者' },
      { playerName: '三笘薫', role: '左边路爆点', description: '速度与盘带能力极强，一对一突破成功率极高' },
      { playerName: '遠藤航', role: '防守型后腰', description: '拦截与对抗能力出色，是中场防守屏障与攻防转换枢纽' },
    ],
    setPieceThreat: 'low',
    counterAttack: 'high',
    possessionStyle: 'balanced',
    weakness: '身体对抗能力不足，面对高大强壮对手时定位球防守吃亏；中锋位置缺乏世界级终结者。',
    summary: '日本队技术流与团队配合日趋成熟，久保建英和三笘薫的边路双核赋予进攻极大威胁。遠藤航的中场拦截保障攻守平衡，高位逼抢执行到位。但身体对抗不足始终是面对欧洲强队时的短板，定位球攻防吃亏明显。球队已具备与世界强队抗衡的实力，但突破天花板仍需提升对抗与终结能力。',
  },

  KOR: {
    teamId: 'KOR',
    formation: '4-4-2',
    formationAlt: '4-2-3-1',
    style: ['快速反击', '高位逼抢', '跑动积极', '边路进攻'],
    attackPattern: '以孫興慜的边路突破和内切射门为核心武器，李剛仁负责中路组织与创造力，黄喜燦提供前场跑动与逼抢，反击速度快且边路威胁大，但阵地战手段相对单一。',
    defensePattern: '前场逼抢积极但持续性不足，金玟哉领衔后防线个人能力突出，中场协作拦截但整体防守组织性有待提升，面对持续施压时防线容易出现漏洞。',
    keyPlayerRole: [
      { playerName: '孫興慜', role: '进攻核心', description: '速度与射门能力顶级，内切射门是招牌武器，是进攻端绝对核心' },
      { playerName: '李剛仁', role: '中场创造者', description: '传球视野与技术细腻，负责中前场串联与关键传球' },
      { playerName: '金玟哉', role: '后防核心', description: '对抗与出球能力出色，是后防线最稳定的屏障' },
    ],
    setPieceThreat: 'medium',
    counterAttack: 'high',
    possessionStyle: 'direct',
    weakness: '中场控制力不足，面对强队时容易被压制；孫興慜依赖度高，其被限制时进攻威胁大减。',
    summary: '韩国队以孫興慜的速度与终结能力为核心竞争力，李剛仁的成长增强了中场创造力，金玟哉的防守保障后场稳定。反击速度快是最大武器，但中场控制力不足且对孫興慜依赖度过高。整体跑动积极但战术执行力有时不够稳定，面对顶级强队时需要更整体的发挥才能有所突破。',
  },
};
