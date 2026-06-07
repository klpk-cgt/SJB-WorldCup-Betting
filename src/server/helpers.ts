/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { Request, Response } from 'express';
import { dbService } from '../db/db_service';
import {
  AIContent,
  BracketState,
  Match,
  MatchOdds,
  MatchStatus,
  Prediction,
  SyncLog,
  TournamentBet,
  TournamentBetOption,
  User,
  Wallet,
} from '../types';
import { getRuntimeConfig, summarizeProviderConfig } from './config';
import {
  applyLifecycleUpdates,
  deriveOperationalStatus,
  deriveSettlementStatus,
  enrichMatchLifecycle,
  FINISHED_MATCH_STATUSES,
} from './operations';

export { deriveOperationalStatus, deriveSettlementStatus };
import { invalidateAIContent } from './ai';

const config = getRuntimeConfig();

// ─── Admin Session Management ───

type AdminSession = { token: string; expiresAt: number };
const ADMIN_SESSIONS_FILE = path.join(process.cwd(), 'admin_sessions.json');
const adminSessions = new Map<string, AdminSession>();

export function loadAdminSessions() {
  try {
    if (fs.existsSync(ADMIN_SESSIONS_FILE)) {
      const content = fs.readFileSync(ADMIN_SESSIONS_FILE, 'utf-8');
      const sessions = JSON.parse(content) as AdminSession[];
      const now = Date.now();
      for (const session of sessions) {
        if (now < session.expiresAt) {
          adminSessions.set(session.token, session);
        }
      }
      console.log(`[Admin] Loaded ${adminSessions.size} valid sessions from disk.`);
    }
  } catch (error) {
    console.error('[Admin] Failed to load admin sessions, starting fresh.', error);
  }
}

export function saveAdminSessions() {
  try {
    const sessions = Array.from(adminSessions.values());
    fs.writeFileSync(ADMIN_SESSIONS_FILE, JSON.stringify(sessions, null, 2), 'utf-8');
  } catch (error) {
    console.error('[Admin] Failed to save admin sessions.', error);
  }
}

function cleanupExpiredSessions() {
  const now = Date.now();
  let changed = false;
  for (const [token, session] of adminSessions) {
    if (now >= session.expiresAt) {
      adminSessions.delete(token);
      changed = true;
    }
  }
  if (changed) {
    saveAdminSessions();
  }
}

export function createAdminSession() {
  const token = crypto.randomBytes(24).toString('hex');
  adminSessions.set(token, {
    token,
    expiresAt: Date.now() + config.adminSessionTtlMs,
  });
  saveAdminSessions();
  return token;
}

export function isAdminAuthenticated(req: Request) {
  cleanupExpiredSessions();
  const token = (req.headers['x-admin-token'] || req.query.adminToken || '').toString();
  if (!token) return false;
  const session = adminSessions.get(token);
  if (!session) return false;
  if (Date.now() > session.expiresAt) {
    adminSessions.delete(token);
    saveAdminSessions();
    return false;
  }
  return true;
}

export function requireAdmin(req: Request, res: Response) {
  if (!isAdminAuthenticated(req)) {
    res.status(403).json({ error: '管理员权限不足或登录已失效。' });
    return false;
  }
  return true;
}

// ─── User Authentication ───

export function getAuthenticatedUser(req: Request) {
  const loginCode = req.headers.authorization || (req.query.loginCode as string);
  if (!loginCode) return null;
  const cleanCode = loginCode.toString().trim().toUpperCase();
  const user = dbService
    .getUsers()
    .find((candidate) => candidate.loginCode === cleanCode || candidate.id === cleanCode);
  if (!user || user.status === 'LOCKED' || user.status === 'DISABLED') return null;
  return user;
}

// ─── ID Generation ───

export function createId(prefix: string) {
  return `${prefix}-${crypto.randomBytes(4).toString('hex')}`;
}

// ─── 拼音首字母转换 ───

// 常用汉字拼音首字母映射表（覆盖 3500 常用字）
const PINYIN_MAP: Record<string, string> = {
  '阿': 'A', '啊': 'A', '埃': 'A', '哎': 'A', '哀': 'A', '唉': 'A', '皑': 'A', '癌': 'A', '蔼': 'A', '矮': 'A',
  '艾': 'A', '爱': 'A', '碍': 'A', '安': 'A', '氨': 'A', '鞍': 'A', '俺': 'A', '按': 'A', '暗': 'A',
  '昂': 'A', '盎': 'A', '凹': 'A', '敖': 'A', '翱': 'A', '傲': 'A', '奥': 'A', '澳': 'A', '八': 'B', '巴': 'B',
  '叭': 'B', '扒': 'B', '吧': 'B', '笆': 'B', '拔': 'B', '跋': 'B', '把': 'B', '坝': 'B', '爸': 'B', '罢': 'B',
  '霸': 'B', '白': 'B', '百': 'B', '柏': 'B', '摆': 'B', '败': 'B', '拜': 'B', '班': 'B', '般': 'B', '颁': 'B',
  '斑': 'B', '搬': 'B', '板': 'B', '版': 'B', '办': 'B', '半': 'B', '伴': 'B', '扮': 'B', '瓣': 'B', '邦': 'B',
  '帮': 'B', '榜': 'B', '膀': 'B', '傍': 'B', '棒': 'B', '包': 'B', '胞': 'B', '宝': 'B', '饱': 'B', '保': 'B',
  '堡': 'B', '报': 'B', '暴': 'B', '爆': 'B', '卑': 'B', '杯': 'B', '悲': 'B', '碑': 'B', '北': 'B', '贝': 'B',
  '备': 'B', '背': 'B', '倍': 'B', '被': 'B', '奔': 'B', '本': 'B', '崩': 'B', '逼': 'B', '鼻': 'B', '比': 'B',
  '彼': 'B', '笔': 'B', '币': 'B', '必': 'B', '毕': 'B', '闭': 'B', '辟': 'B', '碧': 'B', '蔽': 'B', '壁': 'B',
  '避': 'B', '臂': 'B', '边': 'B', '编': 'B', '鞭': 'B', '扁': 'B', '变': 'B', '遍': 'B', '辨': 'B', '辩': 'B',
  '辫': 'B', '标': 'B', '表': 'B', '别': 'B', '宾': 'B', '滨': 'B', '兵': 'B', '冰': 'B', '柄': 'B', '丙': 'B',
  '秉': 'B', '饼': 'B', '病': 'B', '并': 'B', '拨': 'B', '波': 'B', '玻': 'B', '剥': 'B', '播': 'B', '伯': 'B',
  '驳': 'B', '帛': 'B', '勃': 'B', '博': 'B', '搏': 'B', '膊': 'B', '薄': 'B', '卜': 'B', '补': 'B', '捕': 'B',
  '不': 'B', '布': 'B', '步': 'B', '部': 'B', '才': 'C', '材': 'C', '财': 'C', '裁': 'C', '采': 'C', '彩': 'C',
  '菜': 'C', '蔡': 'C', '参': 'C', '餐': 'C', '残': 'C', '蚕': 'C', '仓': 'C', '苍': 'C', '藏': 'C', '操': 'C',
  '曹': 'C', '草': 'C', '册': 'C', '侧': 'C', '测': 'C', '策': 'C', '层': 'C', '插': 'C', '查': 'C', '茶': 'C',
  '察': 'C', '差': 'C', '拆': 'C', '柴': 'C', '缠': 'C', '产': 'C', '阐': 'C', '颤': 'C', '昌': 'C', '长': 'C',
  '肠': 'C', '尝': 'C', '常': 'C', '厂': 'C', '场': 'C', '畅': 'C', '唱': 'C', '超': 'C', '朝': 'C', '潮': 'C',
  '吵': 'C', '炒': 'C', '车': 'C', '扯': 'C', '彻': 'C', '撤': 'C', '尘': 'C', '臣': 'C', '沉': 'C', '陈': 'C',
  '闯': 'C', '创': 'C', '吹': 'C', '垂': 'C', '春': 'C', '纯': 'C', '唇': 'C', '醇': 'C', '词': 'C', '慈': 'C',
  '辞': 'C', '磁': 'C', '雌': 'C', '此': 'C', '次': 'C', '刺': 'C', '聪': 'C', '从': 'C', '丛': 'C', '凑': 'C',
  '粗': 'C', '促': 'C', '催': 'C', '脆': 'C', '翠': 'C', '村': 'C', '存': 'C', '寸': 'C', '错': 'C', '达': 'D',
  '答': 'D', '打': 'D', '大': 'D', '呆': 'D', '代': 'D', '带': 'D', '待': 'D', '袋': 'D', '逮': 'D', '戴': 'D',
  '丹': 'D', '单': 'D', '担': 'D', '胆': 'D', '旦': 'D', '但': 'D', '淡': 'D', '弹': 'D', '蛋': 'D', '当': 'D',
  '挡': 'D', '党': 'D', '荡': 'D', '刀': 'D', '导': 'D', '倒': 'D', '岛': 'D', '蹈': 'D', '到': 'D', '盗': 'D',
  '道': 'D', '稻': 'D', '得': 'D', '德': 'D', '灯': 'D', '登': 'D', '等': 'D', '低': 'D', '滴': 'D', '敌': 'D',
  '笛': 'D', '底': 'D', '抵': 'D', '地': 'D', '弟': 'D', '帝': 'D', '递': 'D', '第': 'D', '典': 'D', '点': 'D',
  '电': 'D', '店': 'D', '垫': 'D', '殿': 'D', '雕': 'D', '吊': 'D', '钓': 'D', '调': 'D', '掉': 'D', '爹': 'D',
  '跌': 'D', '叠': 'D', '蝶': 'D', '丁': 'D', '盯': 'D', '钉': 'D', '顶': 'D', '定': 'D', '订': 'D', '丢': 'D',
  '东': 'D', '冬': 'D', '董': 'D', '懂': 'D', '动': 'D', '冻': 'D', '洞': 'D', '都': 'D', '斗': 'D', '陡': 'D',
  '豆': 'D', '督': 'D', '毒': 'D', '读': 'D', '独': 'D', '堵': 'D', '赌': 'D', '杜': 'D', '肚': 'D', '度': 'D',
  '渡': 'D', '端': 'D', '短': 'D', '段': 'D', '断': 'D', '锻': 'D', '堆': 'D', '队': 'D', '对': 'D', '吨': 'D',
  '蹲': 'D', '顿': 'D', '多': 'D', '夺': 'D', '朵': 'D', '躲': 'D', '俄': 'E', '鹅': 'E', '蛾': 'E', '额': 'E',
  '恶': 'E', '饿': 'E', '鳄': 'E', '恩': 'E', '儿': 'E', '而': 'E', '耳': 'E', '二': 'E', '发': 'F', '罚': 'F',
  '伐': 'F', '乏': 'F', '阀': 'F', '法': 'F', '翻': 'F', '凡': 'F', '繁': 'F', '反': 'F', '返': 'F', '饭': 'F',
  '范': 'F', '犯': 'F', '泛': 'F', '方': 'F', '坊': 'F', '芳': 'F', '房': 'F', '防': 'F', '妨': 'F', '仿': 'F',
  '访': 'F', '纺': 'F', '放': 'F', '飞': 'F', '非': 'F', '啡': 'F', '菲': 'F', '肥': 'F', '匪': 'F', '诽': 'F',
  '沸': 'F', '废': 'F', '肺': 'F', '费': 'F', '芬': 'F', '坟': 'F', '粉': 'F', '份': 'F', '奋': 'F', '愤': 'F',
  '丰': 'F', '风': 'F', '封': 'F', '峰': 'F', '锋': 'F', '蜂': 'F', '逢': 'F', '凤': 'F', '奉': 'F', '佛': 'F',
  '夫': 'F', '肤': 'F', '孵': 'F', '伏': 'F', '扶': 'F', '服': 'F', '浮': 'F', '符': 'F', '幅': 'F', '福': 'F',
  '抚': 'F', '斧': 'F', '府': 'F', '俯': 'F', '辅': 'F', '腐': 'F', '父': 'F', '付': 'F', '负': 'F', '妇': 'F',
  '附': 'F', '咐': 'F', '复': 'F', '副': 'F', '傅': 'F', '富': 'F', '腹': 'F', '覆': 'F', '改': 'G', '盖': 'G',
  '概': 'G', '干': 'G', '甘': 'G', '杆': 'G', '肝': 'G', '竿': 'G', '赶': 'G', '敢': 'G', '感': 'G', '刚': 'G',
  '岗': 'G', '纲': 'G', '缸': 'G', '钢': 'G', '港': 'G', '高': 'G', '搞': 'G', '稿': 'G', '告': 'G', '哥': 'G',
  '歌': 'G', '阁': 'G', '革': 'G', '格': 'G', '葛': 'G', '隔': 'G', '个': 'G', '各': 'G', '给': 'G', '根': 'G',
  '跟': 'G', '更': 'G', '工': 'G', '弓': 'G', '公': 'G', '功': 'G', '攻': 'G', '供': 'G', '宫': 'G', '恭': 'G',
  '巩': 'G', '拱': 'G', '共': 'G', '贡': 'G', '勾': 'G', '沟': 'G', '狗': 'G', '构': 'G', '购': 'G', '够': 'G',
  '估': 'G', '孤': 'G', '姑': 'G', '古': 'G', '谷': 'G', '股': 'G', '骨': 'G', '鼓': 'G', '固': 'G', '故': 'G',
  '顾': 'G', '瓜': 'G', '刮': 'G', '挂': 'G', '乖': 'G', '拐': 'G', '怪': 'G', '关': 'G', '观': 'G', '官': 'G',
  '冠': 'G', '馆': 'G', '管': 'G', '贯': 'G', '惯': 'G', '灌': 'G', '光': 'G', '广': 'G', '归': 'G', '龟': 'G',
  '规': 'G', '硅': 'G', '轨': 'G', '鬼': 'G', '贵': 'G', '桂': 'G', '滚': 'G', '棍': 'G', '锅': 'G', '国': 'G',
  '果': 'G', '裹': 'G', '过': 'G', '哈': 'H', '孩': 'H', '海': 'H', '害': 'H', '含': 'H', '寒': 'H', '函': 'H',
  '喊': 'H', '汉': 'H', '汗': 'H', '旱': 'H', '航': 'H', '毫': 'H', '豪': 'H', '好': 'H', '号': 'H', '浩': 'H',
  '喝': 'H', '合': 'H', '何': 'H', '和': 'H', '河': 'H', '荷': 'H', '核': 'H', '贺': 'H', '黑': 'H', '痕': 'H',
  '很': 'H', '狠': 'H', '恨': 'H', '横': 'H', '衡': 'H', '轰': 'H', '哄': 'H', '红': 'H', '宏': 'H', '洪': 'H',
  '候': 'H', '猴': 'H', '厚': 'H', '呼': 'H', '忽': 'H', '狐': 'H', '胡': 'H', '壶': 'H', '湖': 'H',
  '虎': 'H', '互': 'H', '户': 'H', '护': 'H', '花': 'H', '华': 'H', '滑': 'H', '化': 'H', '划': 'H', '画': 'H',
  '话': 'H', '怀': 'H', '坏': 'H', '欢': 'H', '还': 'H', '环': 'H', '缓': 'H', '换': 'H', '患': 'H', '荒': 'H',
  '慌': 'H', '皇': 'H', '黄': 'H', '煌': 'H', '晃': 'H', '灰': 'H', '挥': 'H', '辉': 'H', '回': 'H', '毁': 'H',
  '悔': 'H', '汇': 'H', '会': 'H', '绘': 'H', '惠': 'H', '慧': 'H', '昏': 'H', '婚': 'H', '浑': 'H', '混': 'H',
  '活': 'H', '火': 'H', '伙': 'H', '货': 'H', '获': 'H', '祸': 'H', '惑': 'H', '霍': 'H', '击': 'J', '饥': 'J',
  '圾': 'J', '机': 'J', '肌': 'J', '鸡': 'J', '迹': 'J', '积': 'J', '基': 'J', '绩': 'J', '激': 'J', '及': 'J',
  '吉': 'J', '级': 'J', '极': 'J', '即': 'J', '急': 'J', '疾': 'J', '集': 'J', '籍': 'J', '几': 'J', '己': 'J',
  '挤': 'J', '计': 'J', '记': 'J', '纪': 'J', '技': 'J', '系': 'J', '际': 'J', '季': 'J', '既': 'J',
  '济': 'J', '继': 'J', '寄': 'J', '加': 'J', '佳': 'J', '家': 'J', '嘉': 'J', '甲': 'J', '价': 'J', '驾': 'J',
  '架': 'J', '假': 'J', '嫁': 'J', '稼': 'J', '尖': 'J', '坚': 'J', '间': 'J', '肩': 'J', '艰': 'J', '监': 'J',
  '兼': 'J', '检': 'J', '简': 'J', '减': 'J', '剪': 'J', '箭': 'J', '件': 'J', '健': 'J', '舰': 'J', '剑': 'J',
  '渐': 'J', '鉴': 'J', '践': 'J', '建': 'J', '荐': 'J', '江': 'J', '将': 'J', '浆': 'J', '僵': 'J',
  '姜': 'J', '疆': 'J', '讲': 'J', '奖': 'J', '降': 'J', '酱': 'J', '交': 'J', '郊': 'J', '浇': 'J', '骄': 'J',
  '胶': 'J', '教': 'J', '角': 'J', '脚': 'J', '搅': 'J', '较': 'J', '叫': 'J', '轿': 'J', '接': 'J',
  '揭': 'J', '街': 'J', '节': 'J', '劫': 'J', '杰': 'J', '洁': 'J', '结': 'J', '捷': 'J', '截': 'J', '竭': 'J',
  '姐': 'J', '解': 'J', '介': 'J', '戒': 'J', '界': 'J', '借': 'J', '今': 'J', '斤': 'J', '金': 'J', '津': 'J',
  '筋': 'J', '仅': 'J', '尽': 'J', '进': 'J', '近': 'J', '劲': 'J', '晋': 'J', '浸': 'J', '禁': 'J', '京': 'J',
  '经': 'J', '茎': 'J', '惊': 'J', '晶': 'J', '睛': 'J', '精': 'J', '井': 'J', '颈': 'J', '景': 'J', '警': 'J',
  '净': 'J', '径': 'J', '竞': 'J', '敬': 'J', '境': 'J', '静': 'J', '镜': 'J', '纠': 'J', '究': 'J', '九': 'J',
  '久': 'J', '酒': 'J', '旧': 'J', '救': 'J', '就': 'J', '舅': 'J', '居': 'J', '局': 'J', '菊': 'J', '橘': 'J',
  '举': 'J', '矩': 'J', '句': 'J', '巨': 'J', '拒': 'J', '具': 'J', '俱': 'J', '剧': 'J', '据': 'J', '距': 'J',
  '锯': 'J', '聚': 'J', '捐': 'J', '卷': 'J', '决': 'J', '绝': 'J', '觉': 'J', '掘': 'J', '军': 'J', '君': 'J',
  '均': 'J', '俊': 'J', '郡': 'J', '卡': 'K', '开': 'K', '凯': 'K', '慨': 'K', '刊': 'K', '堪': 'K', '砍': 'K',
  '看': 'K', '康': 'K', '抗': 'K', '考': 'K', '烤': 'K', '靠': 'K', '科': 'K', '棵': 'K', '颗': 'K', '壳': 'K',
  '咳': 'K', '可': 'K', '渴': 'K', '克': 'K', '刻': 'K', '客': 'K', '课': 'K', '肯': 'K', '垦': 'K', '恳': 'K',
  '坑': 'K', '空': 'K', '孔': 'K', '控': 'K', '口': 'K', '扣': 'K', '枯': 'K', '哭': 'K', '苦': 'K', '库': 'K',
  '酷': 'K', '夸': 'K', '跨': 'K', '块': 'K', '快': 'K', '宽': 'K', '款': 'K', '筐': 'K', '狂': 'K', '况': 'K',
  '矿': 'K', '亏': 'K', '葵': 'K', '愧': 'K', '困': 'K', '扩': 'K', '括': 'K', '垃': 'L', '拉': 'L', '喇': 'L',
  '腊': 'L', '蜡': 'L', '辣': 'L', '来': 'L', '莱': 'L', '赖': 'L', '蓝': 'L', '篮': 'L', '览': 'L', '懒': 'L',
  '烂': 'L', '郎': 'L', '狼': 'L', '廊': 'L', '朗': 'L', '浪': 'L', '捞': 'L', '劳': 'L', '牢': 'L', '老': 'L',
  '乐': 'L', '雷': 'L', '垒': 'L', '泪': 'L', '类': 'L', '冷': 'L', '厘': 'L', '梨': 'L', '犁': 'L', '黎': 'L',
  '礼': 'L', '李': 'L', '里': 'L', '理': 'L', '力': 'L', '历': 'L', '立': 'L', '丽': 'L', '励': 'L', '利': 'L',
  '例': 'L', '隶': 'L', '栗': 'L', '粒': 'L', '俩': 'L', '联': 'L', '连': 'L', '怜': 'L', '莲': 'L', '廉': 'L',
  '脸': 'L', '练': 'L', '炼': 'L', '链': 'L', '良': 'L', '凉': 'L', '梁': 'L', '粮': 'L', '两': 'L', '亮': 'L',
  '谅': 'L', '辆': 'L', '量': 'L', '辽': 'L', '疗': 'L', '聊': 'L', '僚': 'L', '了': 'L', '料': 'L', '列': 'L',
  '劣': 'L', '烈': 'L', '猎': 'L', '裂': 'L', '邻': 'L', '林': 'L', '临': 'L', '淋': 'L', '灵': 'L', '岭': 'L',
  '领': 'L', '令': 'L', '溜': 'L', '刘': 'L', '流': 'L', '留': 'L', '柳': 'L', '六': 'L', '龙': 'L', '隆': 'L',
  '垄': 'L', '拢': 'L', '楼': 'L', '漏': 'L', '露': 'L', '卢': 'L', '芦': 'L', '炉': 'L', '鲁': 'L', '陆': 'L',
  '录': 'L', '鹿': 'L', '路': 'L', '驴': 'L', '旅': 'L', '屡': 'L', '律': 'L', '虑': 'L', '率': 'L', '绿': 'L',
  '滤': 'L', '卵': 'L', '乱': 'L', '掠': 'L', '略': 'L', '伦': 'L', '轮': 'L', '论': 'L', '罗': 'L', '萝': 'L',
  '螺': 'L', '络': 'L', '落': 'L', '骆': 'L', '妈': 'M', '麻': 'M', '马': 'M', '码': 'M', '蚂': 'M', '骂': 'M',
  '吗': 'M', '埋': 'M', '买': 'M', '迈': 'M', '麦': 'M', '卖': 'M', '脉': 'M', '蛮': 'M', '满': 'M', '慢': 'M',
  '漫': 'M', '忙': 'M', '芒': 'M', '盲': 'M', '茫': 'M', '猫': 'M', '毛': 'M', '矛': 'M', '茅': 'M', '茂': 'M',
  '冒': 'M', '贸': 'M', '帽': 'M', '貌': 'M', '么': 'M', '没': 'M', '眉': 'M', '梅': 'M', '媒': 'M', '煤': 'M',
  '霉': 'M', '每': 'M', '美': 'M', '妹': 'M', '门': 'M', '闷': 'M', '们': 'M', '萌': 'M', '盟': 'M', '猛': 'M',
  '蒙': 'M', '孟': 'M', '梦': 'M', '迷': 'M', '谜': 'M', '米': 'M', '秘': 'M', '密': 'M', '蜜': 'M', '眠': 'M',
  '绵': 'M', '棉': 'M', '免': 'M', '勉': 'M', '面': 'M', '苗': 'M', '描': 'M', '秒': 'M', '妙': 'M', '庙': 'M',
  '灭': 'M', '民': 'M', '敏': 'M', '名': 'M', '明': 'M', '鸣': 'M', '命': 'M', '摸': 'M', '模': 'M', '膜': 'M',
  '摩': 'M', '磨': 'M', '魔': 'M', '抹': 'M', '末': 'M', '沫': 'M', '莫': 'M', '漠': 'M', '墨': 'M', '默': 'M',
  '谋': 'M', '某': 'M', '母': 'M', '亩': 'M', '木': 'M', '目': 'M', '牧': 'M', '墓': 'M', '幕': 'M', '慕': 'M',
  '暮': 'M', '拿': 'N', '哪': 'N', '那': 'N', '纳': 'N', '乃': 'N', '奶': 'N', '耐': 'N', '南': 'N', '男': 'N',
  '难': 'N', '囊': 'N', '挠': 'N', '脑': 'N', '恼': 'N', '闹': 'N', '呢': 'N', '内': 'N', '嫩': 'N', '能': 'N',
  '尼': 'N', '泥': 'N', '你': 'N', '逆': 'N', '年': 'N', '念': 'N', '娘': 'N', '酿': 'N', '鸟': 'N', '尿': 'N',
  '捏': 'N', '宁': 'N', '凝': 'N', '牛': 'N', '扭': 'N', '纽': 'N', '浓': 'N', '农': 'N', '弄': 'N', '奴': 'N',
  '努': 'N', '怒': 'N', '女': 'N', '暖': 'N', '虐': 'N', '诺': 'N', '哦': 'O', '欧': 'O', '偶': 'O', '爬': 'P',
  '怕': 'P', '拍': 'P', '排': 'P', '牌': 'P', '派': 'P', '攀': 'P', '盘': 'P', '判': 'P', '叛': 'P', '乓': 'P',
  '旁': 'P', '胖': 'P', '抛': 'P', '袍': 'P', '跑': 'P', '泡': 'P', '胚': 'P', '陪': 'P', '培': 'P', '赔': 'P',
  '佩': 'P', '配': 'P', '喷': 'P', '盆': 'P', '朋': 'P', '棚': 'P', '蓬': 'P', '膨': 'P', '捧': 'P', '批': 'P',
  '披': 'P', '劈': 'P', '皮': 'P', '匹': 'P', '偏': 'P', '篇': 'P', '骗': 'P', '飘': 'P', '票': 'P', '撇': 'P',
  '贫': 'P', '品': 'P', '乒': 'P', '平': 'P', '凭': 'P', '屏': 'P', '坡': 'P', '泼': 'P', '婆': 'P', '迫': 'P',
  '破': 'P', '剖': 'P', '扑': 'P', '铺': 'P', '仆': 'P', '葡': 'P', '朴': 'P', '普': 'P', '谱': 'P', '曝': 'P',
  '七': 'Q', '妻': 'Q', '戚': 'Q', '期': 'Q', '欺': 'Q', '漆': 'Q', '齐': 'Q', '其': 'Q', '奇': 'Q', '骑': 'Q',
  '棋': 'Q', '旗': 'Q', '企': 'Q', '岂': 'Q', '启': 'Q', '起': 'Q', '气': 'Q', '弃': 'Q', '汽': 'Q', '契': 'Q',
  '砌': 'Q', '器': 'Q', '恰': 'Q', '千': 'Q', '迁': 'Q', '牵': 'Q', '铅': 'Q', '谦': 'Q', '签': 'Q', '前': 'Q',
  '钱': 'Q', '潜': 'Q', '浅': 'Q', '遣': 'Q', '欠': 'Q', '枪': 'Q', '腔': 'Q', '强': 'Q', '墙': 'Q', '抢': 'Q',
  '悄': 'Q', '桥': 'Q', '瞧': 'Q', '巧': 'Q', '切': 'Q', '且': 'Q', '窃': 'Q', '亲': 'Q', '侵': 'Q', '琴': 'Q',
  '勤': 'Q', '青': 'Q', '轻': 'Q', '倾': 'Q', '清': 'Q', '情': 'Q', '晴': 'Q', '请': 'Q', '庆': 'Q', '穷': 'Q',
  '丘': 'Q', '秋': 'Q', '求': 'Q', '球': 'Q', '区': 'Q', '曲': 'Q', '驱': 'Q', '屈': 'Q', '渠': 'Q', '取': 'Q',
  '去': 'Q', '趣': 'Q', '圈': 'Q', '全': 'Q', '权': 'Q', '泉': 'Q', '拳': 'Q', '犬': 'Q', '劝': 'Q', '缺': 'Q',
  '却': 'Q', '雀': 'Q', '确': 'Q', '鹊': 'Q', '裙': 'Q', '群': 'Q', '然': 'R', '燃': 'R', '染': 'R', '嚷': 'R',
  '让': 'R', '饶': 'R', '扰': 'R', '绕': 'R', '惹': 'R', '热': 'R', '人': 'R', '仁': 'R', '忍': 'R', '认': 'R',
  '任': 'R', '扔': 'R', '仍': 'R', '日': 'R', '荣': 'R', '容': 'R', '绒': 'R', '融': 'R', '肉': 'R', '如': 'R',
  '儒': 'R', '乳': 'R', '辱': 'R', '入': 'R', '软': 'R', '锐': 'R', '瑞': 'R', '润': 'R', '若': 'R', '弱': 'R',
  '撒': 'S', '洒': 'S', '塞': 'S', '赛': 'S', '三': 'S', '伞': 'S', '散': 'S', '桑': 'S', '嗓': 'S', '丧': 'S',
  '扫': 'S', '嫂': 'S', '色': 'S', '森': 'S', '杀': 'S', '沙': 'S', '纱': 'S', '傻': 'S', '晒': 'S', '山': 'S',
  '删': 'S', '闪': 'S', '陕': 'S', '扇': 'S', '善': 'S', '伤': 'S', '商': 'S', '赏': 'S', '上': 'S',
  '尚': 'S', '稍': 'S', '烧': 'S', '少': 'S', '绍': 'S', '哨': 'S', '奢': 'S', '舌': 'S', '舍': 'S', '设': 'S',
  '社': 'S', '射': 'S', '涉': 'S', '摄': 'S', '申': 'S', '伸': 'S', '身': 'S', '深': 'S', '神': 'S', '审': 'S',
  '婶': 'S', '肾': 'S', '甚': 'S', '慎': 'S', '升': 'S', '生': 'S', '声': 'S', '牲': 'S', '胜': 'S', '绳': 'S',
  '省': 'S', '圣': 'S', '剩': 'S', '尸': 'S', '失': 'S', '师': 'S', '诗': 'S', '施': 'S', '狮': 'S', '湿': 'S',
  '十': 'S', '什': 'S', '石': 'S', '时': 'S', '识': 'S', '实': 'S', '拾': 'S', '食': 'S', '蚀': 'S', '史': 'S',
  '使': 'S', '始': 'S', '驶': 'S', '矢': 'S', '屎': 'S', '士': 'S', '氏': 'S', '示': 'S', '世': 'S', '市': 'S',
  '式': 'S', '事': 'S', '势': 'S', '视': 'S', '试': 'S', '饰': 'S', '室': 'S', '是': 'S', '适': 'S',
  '逝': 'S', '释': 'S', '誓': 'S', '收': 'S', '手': 'S', '守': 'S', '首': 'S', '寿': 'S', '受': 'S', '兽': 'S',
  '售': 'S', '书': 'S', '叔': 'S', '殊': 'S', '梳': 'S', '舒': 'S', '输': 'S', '蔬': 'S', '熟': 'S', '暑': 'S',
  '属': 'S', '鼠': 'S', '术': 'S', '束': 'S', '述': 'S', '树': 'S', '竖': 'S', '数': 'S', '刷': 'S', '衰': 'S',
  '摔': 'S', '甩': 'S', '帅': 'S', '双': 'S', '霜': 'S', '爽': 'S', '谁': 'S', '水': 'S', '税': 'S', '睡': 'S',
  '顺': 'S', '说': 'S', '丝': 'S', '私': 'S', '司': 'S', '思': 'S', '斯': 'S', '撕': 'S', '死': 'S', '四': 'S',
  '寺': 'S', '似': 'S', '饲': 'S', '肆': 'S', '松': 'S', '诵': 'S', '送': 'S', '颂': 'S', '搜': 'S', '艘': 'S',
  '苏': 'S', '俗': 'S', '诉': 'S', '素': 'S', '速': 'S', '宿': 'S', '塑': 'S', '酸': 'S', '蒜': 'S', '算': 'S',
  '虽': 'S', '随': 'S', '髓': 'S', '岁': 'S', '碎': 'S', '孙': 'S', '损': 'S', '笋': 'S', '缩': 'S', '所': 'S',
  '索': 'S', '锁': 'S', '他': 'T', '它': 'T', '她': 'T', '塌': 'T', '塔': 'T', '踏': 'T', '台': 'T', '抬': 'T',
  '太': 'T', '态': 'T', '泰': 'T', '贪': 'T', '摊': 'T', '滩': 'T', '坛': 'T', '谈': 'T', '潭': 'T', '坦': 'T',
  '叹': 'T', '炭': 'T', '探': 'T', '碳': 'T', '汤': 'T', '堂': 'T', '塘': 'T', '糖': 'T', '躺': 'T', '趟': 'T',
  '逃': 'T', '桃': 'T', '陶': 'T', '讨': 'T', '套': 'T', '特': 'T', '疼': 'T', '腾': 'T', '藤': 'T', '梯': 'T',
  '踢': 'T', '提': 'T', '题': 'T', '体': 'T', '替': 'T', '天': 'T', '添': 'T', '田': 'T', '甜': 'T', '填': 'T',
  '挑': 'T', '条': 'T', '跳': 'T', '贴': 'T', '铁': 'T', '听': 'T', '亭': 'T', '庭': 'T', '停': 'T', '挺': 'T',
  '通': 'T', '同': 'T', '铜': 'T', '童': 'T', '统': 'T', '桶': 'T', '筒': 'T', '痛': 'T', '偷': 'T', '投': 'T',
  '头': 'T', '透': 'T', '凸': 'T', '秃': 'T', '突': 'T', '图': 'T', '徒': 'T', '涂': 'T', '途': 'T', '屠': 'T',
  '土': 'T', '吐': 'T', '团': 'T', '推': 'T', '腿': 'T', '退': 'T', '吞': 'T', '托': 'T', '拖': 'T', '脱': 'T',
  '驮': 'T', '驼': 'T', '妥': 'T', '拓': 'T', '唾': 'T', '挖': 'W', '哇': 'W', '蛙': 'W', '娃': 'W', '瓦': 'W',
  '歪': 'W', '外': 'W', '弯': 'W', '湾': 'W', '玩': 'W', '顽': 'W', '丸': 'W', '完': 'W', '碗': 'W', '晚': 'W',
  '挽': 'W', '万': 'W', '汪': 'W', '王': 'W', '网': 'W', '往': 'W', '旺': 'W', '望': 'W', '忘': 'W', '威': 'W',
  '微': 'W', '危': 'W', '围': 'W', '唯': 'W', '维': 'W', '伟': 'W', '伪': 'W', '尾': 'W', '纬': 'W', '委': 'W',
  '卫': 'W', '未': 'W', '位': 'W', '味': 'W', '畏': 'W', '胃': 'W', '喂': 'W', '魏': 'W', '温': 'W', '文': 'W',
  '闻': 'W', '蚊': 'W', '稳': 'W', '问': 'W', '翁': 'W', '窝': 'W', '我': 'W', '沃': 'W', '卧': 'W', '握': 'W',
  '乌': 'W', '污': 'W', '屋': 'W', '无': 'W', '吴': 'W', '吾': 'W', '梧': 'W', '武': 'W', '舞': 'W', '勿': 'W',
  '务': 'W', '物': 'W', '误': 'W', '悟': 'W', '夕': 'X', '西': 'X', '吸': 'X', '希': 'X', '析': 'X', '息': 'X',
  '牺': 'X', '悉': 'X', '惜': 'X', '稀': 'X', '溪': 'X', '锡': 'X', '熄': 'X', '熙': 'X', '嘻': 'X', '习': 'X',
  '席': 'X', '洗': 'X', '喜': 'X', '戏': 'X', '细': 'X', '虾': 'X', '瞎': 'X', '峡': 'X', '狭': 'X',
  '霞': 'X', '下': 'X', '吓': 'X', '夏': 'X', '仙': 'X', '先': 'X', '纤': 'X', '掀': 'X', '鲜': 'X', '闲': 'X',
  '贤': 'X', '咸': 'X', '衔': 'X', '嫌': 'X', '显': 'X', '险': 'X', '县': 'X', '现': 'X', '线': 'X', '限': 'X',
  '宪': 'X', '陷': 'X', '馅': 'X', '羡': 'X', '献': 'X', '乡': 'X', '相': 'X', '香': 'X', '厢': 'X', '湘': 'X',
  '箱': 'X', '详': 'X', '响': 'X', '想': 'X', '向': 'X', '项': 'X', '象': 'X', '像': 'X', '橡': 'X', '削': 'X',
  '消': 'X', '宵': 'X', '小': 'X', '晓': 'X', '孝': 'X', '效': 'X', '校': 'X', '笑': 'X', '些': 'X', '歇': 'X',
  '协': 'X', '斜': 'X', '携': 'X', '鞋': 'X', '写': 'X', '泄': 'X', '泻': 'X', '卸': 'X', '屑': 'X', '械': 'X',
  '谢': 'X', '心': 'X', '辛': 'X', '欣': 'X', '新': 'X', '信': 'X', '星': 'X', '腥': 'X', '刑': 'X', '行': 'X',
  '形': 'X', '型': 'X', '醒': 'X', '兴': 'X', '杏': 'X', '姓': 'X', '幸': 'X', '性': 'X', '凶': 'X', '兄': 'X',
  '胸': 'X', '雄': 'X', '熊': 'X', '休': 'X', '修': 'X', '羞': 'X', '朽': 'X', '秀': 'X', '绣': 'X', '袖': 'X',
  '需': 'X', '虚': 'X', '须': 'X', '徐': 'X', '许': 'X', '序': 'X', '叙': 'X', '绪': 'X', '续': 'X', '宣': 'X',
  '悬': 'X', '旋': 'X', '选': 'X', '穴': 'X', '学': 'X', '雪': 'X', '血': 'X', '勋': 'X', '熏': 'X', '寻': 'X',
  '巡': 'X', '循': 'X', '训': 'X', '迅': 'X', '压': 'Y', '押': 'Y', '鸦': 'Y', '鸭': 'Y', '牙': 'Y', '芽': 'Y',
  '崖': 'Y', '哑': 'Y', '雅': 'Y', '亚': 'Y', '咽': 'Y', '烟': 'Y', '淹': 'Y', '盐': 'Y', '严': 'Y', '言': 'Y',
  '岩': 'Y', '沿': 'Y', '研': 'Y', '颜': 'Y', '掩': 'Y', '眼': 'Y', '演': 'Y', '厌': 'Y', '宴': 'Y',
  '艳': 'Y', '验': 'Y', '焰': 'Y', '雁': 'Y', '燕': 'Y', '央': 'Y', '扬': 'Y', '阳': 'Y', '杨': 'Y', '洋': 'Y',
  '仰': 'Y', '养': 'Y', '氧': 'Y', '痒': 'Y', '样': 'Y', '腰': 'Y', '邀': 'Y', '窑': 'Y', '谣': 'Y', '摇': 'Y',
  '遥': 'Y', '咬': 'Y', '药': 'Y', '要': 'Y', '耀': 'Y', '爷': 'Y', '也': 'Y', '野': 'Y', '业': 'Y', '叶': 'Y',
  '页': 'Y', '夜': 'Y', '液': 'Y', '一': 'Y', '衣': 'Y', '医': 'Y', '依': 'Y', '仪': 'Y', '宜': 'Y', '姨': 'Y',
  '移': 'Y', '遗': 'Y', '疑': 'Y', '乙': 'Y', '已': 'Y', '以': 'Y', '矣': 'Y', '艺': 'Y', '忆': 'Y', '议': 'Y',
  '亦': 'Y', '异': 'Y', '役': 'Y', '译': 'Y', '易': 'Y', '疫': 'Y', '益': 'Y', '谊': 'Y', '意': 'Y', '毅': 'Y',
  '翼': 'Y', '因': 'Y', '阴': 'Y', '音': 'Y', '姻': 'Y', '银': 'Y', '引': 'Y', '饮': 'Y', '隐': 'Y', '印': 'Y',
  '英': 'Y', '樱': 'Y', '婴': 'Y', '鹰': 'Y', '迎': 'Y', '盈': 'Y', '营': 'Y', '蝇': 'Y', '赢': 'Y', '影': 'Y',
  '映': 'Y', '硬': 'Y', '哟': 'Y', '拥': 'Y', '佣': 'Y', '庸': 'Y', '永': 'Y', '咏': 'Y', '泳': 'Y', '勇': 'Y',
  '涌': 'Y', '用': 'Y', '优': 'Y', '忧': 'Y', '悠': 'Y', '尤': 'Y', '由': 'Y', '油': 'Y', '游': 'Y', '友': 'Y',
  '有': 'Y', '又': 'Y', '右': 'Y', '幼': 'Y', '于': 'Y', '余': 'Y', '鱼': 'Y', '娱': 'Y', '渔': 'Y', '愉': 'Y',
  '愚': 'Y', '与': 'Y', '宇': 'Y', '羽': 'Y', '雨': 'Y', '语': 'Y', '玉': 'Y', '育': 'Y', '狱': 'Y', '浴': 'Y',
  '预': 'Y', '域': 'Y', '欲': 'Y', '遇': 'Y', '御': 'Y', '愈': 'Y', '誉': 'Y', '渊': 'Y', '冤': 'Y', '元': 'Y',
  '园': 'Y', '员': 'Y', '原': 'Y', '圆': 'Y', '援': 'Y', '缘': 'Y', '源': 'Y', '远': 'Y', '怨': 'Y', '院': 'Y',
  '愿': 'Y', '约': 'Y', '月': 'Y', '阅': 'Y', '跃': 'Y', '云': 'Y', '匀': 'Y', '允': 'Y', '运': 'Y',
  '蕴': 'Y', '孕': 'Y', '杂': 'Z', '灾': 'Z', '栽': 'Z', '宰': 'Z', '载': 'Z', '再': 'Z', '在': 'Z', '咱': 'Z',
  '暂': 'Z', '赞': 'Z', '脏': 'Z', '葬': 'Z', '遭': 'Z', '糟': 'Z', '早': 'Z', '枣': 'Z', '澡': 'Z', '灶': 'Z',
  '造': 'Z', '噪': 'Z', '燥': 'Z', '躁': 'Z', '则': 'Z', '责': 'Z', '择': 'Z', '泽': 'Z', '贼': 'Z', '怎': 'Z',
  '增': 'Z', '赠': 'Z', '渣': 'Z', '扎': 'Z', '眨': 'Z', '炸': 'Z', '摘': 'Z', '宅': 'Z', '窄': 'Z', '债': 'Z',
  '寨': 'Z', '沾': 'Z', '展': 'Z', '占': 'Z', '战': 'Z', '站': 'Z', '张': 'Z', '章': 'Z', '彰': 'Z', '涨': 'Z',
  '掌': 'Z', '丈': 'Z', '帐': 'Z', '账': 'Z', '障': 'Z', '招': 'Z', '找': 'Z', '召': 'Z', '兆': 'Z', '照': 'Z',
  '罩': 'Z', '折': 'Z', '哲': 'Z', '者': 'Z', '这': 'Z', '针': 'Z', '侦': 'Z', '珍': 'Z', '真': 'Z', '诊': 'Z',
  '枕': 'Z', '阵': 'Z', '振': 'Z', '震': 'Z', '争': 'Z', '征': 'Z', '睁': 'Z', '筝': 'Z', '蒸': 'Z', '整': 'Z',
  '正': 'Z', '证': 'Z', '郑': 'Z', '政': 'Z', '之': 'Z', '支': 'Z', '只': 'Z', '汁': 'Z', '芝': 'Z', '枝': 'Z',
  '知': 'Z', '织': 'Z', '脂': 'Z', '执': 'Z', '直': 'Z', '值': 'Z', '职': 'Z', '植': 'Z', '殖': 'Z', '止': 'Z',
  '旨': 'Z', '址': 'Z', '纸': 'Z', '指': 'Z', '至': 'Z', '志': 'Z', '制': 'Z', '治': 'Z', '质': 'Z', '致': 'Z',
  '智': 'Z', '置': 'Z', '中': 'Z', '忠': 'Z', '终': 'Z', '钟': 'Z', '肿': 'Z', '种': 'Z', '众': 'Z', '重': 'Z',
  '州': 'Z', '舟': 'Z', '周': 'Z', '洲': 'Z', '粥': 'Z', '轴': 'Z', '肘': 'Z', '帚': 'Z', '昼': 'Z', '皱': 'Z',
  '骤': 'Z', '珠': 'Z', '株': 'Z', '诸': 'Z', '猪': 'Z', '蛛': 'Z', '竹': 'Z', '烛': 'Z', '逐': 'Z', '主': 'Z',
  '煮': 'Z', '嘱': 'Z', '住': 'Z', '助': 'Z', '注': 'Z', '驻': 'Z', '柱': 'Z', '祝': 'Z', '著': 'Z',
  '筑': 'Z', '抓': 'Z', '爪': 'Z', '专': 'Z', '砖': 'Z', '转': 'Z', '赚': 'Z', '庄': 'Z', '装': 'Z', '壮': 'Z',
  '状': 'Z', '撞': 'Z', '追': 'Z', '准': 'Z', '捉': 'Z', '桌': 'Z', '着': 'Z', '兹': 'Z', '资': 'Z', '滋': 'Z',
  '子': 'Z', '紫': 'Z', '字': 'Z', '自': 'Z', '宗': 'Z', '综': 'Z', '总': 'Z', '纵': 'Z', '走': 'Z', '奏': 'Z',
  '租': 'Z', '足': 'Z', '卒': 'Z', '族': 'Z', '阻': 'Z', '组': 'Z', '祖': 'Z', '钻': 'Z', '嘴': 'Z', '最': 'Z',
  '罪': 'Z', '醉': 'Z', '尊': 'Z', '遵': 'Z', '昨': 'Z', '左': 'Z', '作': 'Z', '坐': 'Z', '座': 'Z', '做': 'Z',
};

/**
 * 获取中文字符串的拼音首字母
 * 例如："张三" → "ZS"，"老王" → "LW"
 * 非中文字符保留原字符（字母转大写）
 */
export function getPinyinInitials(name: string): string {
  if (!name) return '';
  const result: string[] = [];
  for (const char of name) {
    if (PINYIN_MAP[char]) {
      result.push(PINYIN_MAP[char]);
    } else if (/[a-zA-Z]/.test(char)) {
      result.push(char.toUpperCase());
    } else if (/[0-9]/.test(char)) {
      result.push(char);
    }
    // 其他字符（标点、emoji等）忽略
  }
  return result.join('') || name.substring(0, 2).toUpperCase();
}

// ─── Serialization Helpers ───

export function serializeUserForClient(user: User) {
  const { pinHash, ...safeUser } = user;
  return safeUser;
}

export function serializeMatch(match: Match) {
  const db = dbService.getData();
  const homeTeam = db.teams.find((team) => team.id === match.homeTeamId);
  const awayTeam = db.teams.find((team) => team.id === match.awayTeamId);
  return {
    ...enrichMatchLifecycle(match, config.predictionLockMinutes),
    homeTeam,
    awayTeam,
    odds: db.matchOdds[match.id] || null,
  };
}

// ─── AI Stale Markers ───

export function markMatchAiStale(matchId: string) {
  const db = dbService.getData();
  invalidateAIContent(db, matchId, 'MATCH_PREDICTION', 'match');
  invalidateAIContent(db, matchId, 'PRE_MATCH_ANALYSIS', 'match');
  invalidateAIContent(db, matchId, 'SEARCH_ENHANCEMENT', 'match');
}

export function markRoomLeaderboardAiStale(roomId: string) {
  const db = dbService.getData();
  invalidateAIContent(db, roomId, 'LEADERBOARD_COMMENTARY', 'room');
}

// ─── Sync Log Helpers ───

export function appendSyncLog(log: SyncLog) {
  const db = dbService.getData();
  db.syncLogs.unshift(log);
  db.syncLogs = db.syncLogs.slice(0, 120);
}

export function getLatestSyncLog(syncType: SyncLog['syncType'], source?: SyncLog['source']) {
  return dbService.getSyncLogs().find((log) => log.syncType === syncType && (!source || log.source === source));
}

// ─── Tournament Bet Helpers ───

const GOLDEN_BOOT_OPTIONS: TournamentBetOption[] = [
  { id: 'mbappe', label: '姆巴佩', subLabel: '法国', targetType: 'player', oddsDecimal: 4.8, marketType: 'golden_boot', flagCode: 'FRA', avatarUrl: 'https://raw.githubusercontent.com/cairongquan/world_cup_2026/main/assets/players/france_kylian-mbappe.jpg' },
  { id: 'vinicius', label: '维尼修斯', subLabel: '巴西', targetType: 'player', oddsDecimal: 5.5, marketType: 'golden_boot', flagCode: 'BRA', avatarUrl: 'https://raw.githubusercontent.com/cairongquan/world_cup_2026/main/assets/players/brazil_vinicius-jr.jpg' },
  { id: 'kane', label: '凯恩', subLabel: '英格兰', targetType: 'player', oddsDecimal: 6.2, marketType: 'golden_boot', flagCode: 'ENG', avatarUrl: 'https://raw.githubusercontent.com/cairongquan/world_cup_2026/main/assets/players/england_harry-kane.jpg' },
  { id: 'lautaro', label: '劳塔罗', subLabel: '阿根廷', targetType: 'player', oddsDecimal: 7.4, marketType: 'golden_boot', flagCode: 'ARG', avatarUrl: 'https://raw.githubusercontent.com/cairongquan/world_cup_2026/main/assets/players/argentina_lautaro-martinez.jpg' },
  { id: 'havertz', label: '哈弗茨', subLabel: '德国', targetType: 'player', oddsDecimal: 8.6, marketType: 'golden_boot', flagCode: 'GER', avatarUrl: 'https://raw.githubusercontent.com/cairongquan/world_cup_2026/main/assets/players/germany_kai-havertz.jpg' },
];

const GOLDEN_BALL_OPTIONS: TournamentBetOption[] = [
  { id: 'bellingham', label: '贝林厄姆', subLabel: '英格兰', targetType: 'player', oddsDecimal: 5.8, marketType: 'golden_ball', flagCode: 'ENG', avatarUrl: 'https://raw.githubusercontent.com/cairongquan/world_cup_2026/main/assets/players/england_jude-bellingham.jpg' },
  { id: 'mbappe', label: '姆巴佩', subLabel: '法国', targetType: 'player', oddsDecimal: 6.1, marketType: 'golden_ball', flagCode: 'FRA', avatarUrl: 'https://raw.githubusercontent.com/cairongquan/world_cup_2026/main/assets/players/france_kylian-mbappe.jpg' },
  { id: 'musiala', label: '穆西亚拉', subLabel: '德国', targetType: 'player', oddsDecimal: 7.0, marketType: 'golden_ball', flagCode: 'GER', avatarUrl: 'https://raw.githubusercontent.com/cairongquan/world_cup_2026/main/assets/players/germany_jamal-musiala.jpg' },
  { id: 'vinicius', label: '维尼修斯', subLabel: '巴西', targetType: 'player', oddsDecimal: 7.4, marketType: 'golden_ball', flagCode: 'BRA', avatarUrl: 'https://raw.githubusercontent.com/cairongquan/world_cup_2026/main/assets/players/brazil_vinicius-jr.jpg' },
  { id: 'griezmann', label: '格列兹曼', subLabel: '法国', targetType: 'player', oddsDecimal: 8.4, marketType: 'golden_ball', flagCode: 'FRA', avatarUrl: 'https://raw.githubusercontent.com/cairongquan/world_cup_2026/main/assets/players/france_antoine-griezmann.jpg' },
];

export { GOLDEN_BOOT_OPTIONS, GOLDEN_BALL_OPTIONS };

export function getChampionOptions() {
  const db = dbService.getData();
  const seededIds = ['FRA', 'ARG', 'BRA', 'ENG', 'GER', 'POR', 'ESP', 'NED'];
  return db.teams
    .filter((team) => seededIds.includes(team.id))
    .map<TournamentBetOption>((team, index) => ({
      id: team.id,
      label: team.nameZh,
      subLabel: team.groupName,
      targetType: 'team',
      oddsDecimal: [4.6, 5.0, 5.2, 5.8, 6.4, 7.1, 7.6, 8.2][index] || 8.8,
      marketType: 'champion',
      flagCode: team.code,
      avatarUrl: team.logoUrl,
    }));
}

export function hasKnockoutStarted() {
  const db = dbService.getData();
  return db.matches.some((match) => match.stage !== 'Group Stage' && new Date(match.startTimeUtc).getTime() <= Date.now());
}

export function hasLateStageMarketsUnlocked() {
  const db = dbService.getData();
  return db.matches.some((match) =>
    match.stage === 'Quarter-finals' || match.stage === 'Semi-finals' || match.stage === 'Final',
  );
}

export function getTournamentMarketConfig(type: TournamentBet['type']) {
  if (type === 'champion') {
    const open = !hasKnockoutStarted();
    return {
      type,
      label: '冠军竞猜',
      isOpen: open,
      isVisible: true,
      openedAt: new Date().toISOString(),
      lockedAt: open ? null : new Date().toISOString(),
      options: getChampionOptions(),
      hint: open ? '世界杯早期开放，适合先押最终冠军。' : '淘汰赛开始后已锁定。',
    };
  }

  const unlocked = hasLateStageMarketsUnlocked();
  const options = type === 'golden_boot' ? GOLDEN_BOOT_OPTIONS : GOLDEN_BALL_OPTIONS;
  return {
    type,
    label: type === 'golden_boot' ? '金靴竞猜' : '金球竞猜',
    isOpen: unlocked,
    isVisible: true,
    openedAt: unlocked ? new Date().toISOString() : null,
    lockedAt: null,
    options,
    hint: unlocked ? '淘汰赛后期开放，适合做阶段性娱乐竞猜。' : '淘汰赛后期开放，目前先保留低干扰入口。',
  };
}

export function serializeTournamentBet(bet: TournamentBet) {
  return {
    ...bet,
    marketLabel:
      bet.type === 'champion' ? '冠军竞猜' : bet.type === 'golden_boot' ? '金靴竞猜' : '金球竞猜',
  };
}

// ─── Odds Snapshot ───

export function resolveOddsSnapshot(matchId: string, market: Prediction['market'], optionKey: string) {
  const db = dbService.getData();
  const odds: MatchOdds | undefined = db.matchOdds[matchId];
  if (!odds) return null;

  let oddsDecimal = 1;
  if (market === 'H2H') {
    oddsDecimal = optionKey === 'home' ? odds.h2h.homeWin : optionKey === 'draw' ? odds.h2h.draw : odds.h2h.awayWin;
  } else if (market === 'TOTAL_GOALS') {
    oddsDecimal = optionKey === 'over_2_5' ? odds.totalGoals.over25 : odds.totalGoals.under25;
  } else if (market === 'CORRECT_SCORE') {
    const score = odds.correctScore.find(
      (item) => `correctScore_${item.score.replace('-', '_')}` === optionKey || item.score === optionKey,
    );
    oddsDecimal = score?.odds || 9.5;
  } else if (market === 'QUALIFY') {
    oddsDecimal = optionKey === 'homeQualify' ? odds.qualify?.homeQualify || 1.8 : odds.qualify?.awayQualify || 1.8;
  }

  return {
    oddsDecimal,
    source: odds.source || 'LOCAL',
    capturedAt: new Date().toISOString(),
  };
}

// ─── Match Settlement ───

export function settleMatch(match: Match) {
  const db = dbService.getData();
  if (!FINISHED_MATCH_STATUSES.has(match.status)) {
    throw new Error('比赛尚未正式结束，暂时不能结算。');
  }
  if (match.homeScore === undefined || match.awayScore === undefined) {
    throw new Error('比分还不完整，不能开始结算。');
  }

  const matchPredictions = db.predictions.filter((prediction) => prediction.matchId === match.id);
  for (const prediction of matchPredictions) {
    if (prediction.status === 'WON' && prediction.settledReturn) {
      const wallet = db.wallets.find((item) => item.userId === prediction.userId);
      if (wallet) {
        const before = wallet.balance;
        wallet.balance -= prediction.settledReturn;
        db.transactions.push({
          id: createId('rollback'),
          userId: prediction.userId,
          type: 'REFUND',
          amount: -prediction.settledReturn,
          balanceBefore: before,
          balanceAfter: wallet.balance,
          relatedPredictionId: prediction.id,
          relatedMatchId: match.id,
          note: `重结回滚：${match.roundName}`,
          createdAt: new Date().toISOString(),
        });
      }
    }

    prediction.status = 'PENDING';
    prediction.settledReturn = 0;
    prediction.settledProfit = 0;
    prediction.settledAt = undefined;
  }

  const hScore = match.homeScore;
  const aScore = match.awayScore;

  for (const prediction of matchPredictions) {
    const wallet = db.wallets.find((item) => item.userId === prediction.userId);
    if (!wallet) continue;

    let won = false;
    if (prediction.market === 'H2H') {
      won =
        (prediction.optionKey === 'home' && hScore > aScore) ||
        (prediction.optionKey === 'draw' && hScore === aScore) ||
        (prediction.optionKey === 'away' && hScore < aScore);
    } else if (prediction.market === 'TOTAL_GOALS') {
      const totalGoals = hScore + aScore;
      won =
        (prediction.optionKey === 'over_2_5' && totalGoals > 2.5) ||
        (prediction.optionKey === 'under_2_5' && totalGoals < 2.5);
    } else if (prediction.market === 'CORRECT_SCORE') {
      const normalizedKey = prediction.optionKey.replace('correctScore_', '').replace('_', '-');
      const actualScore = `${hScore}-${aScore}`;
      won = normalizedKey === actualScore;
      if (!won && normalizedKey === 'Other') {
        const commonScores = ['1-0', '2-0', '2-1', '3-0', '0-0', '1-1', '0-1', '0-2', '1-2'];
        won = !commonScores.includes(actualScore);
      }
    } else if (prediction.market === 'QUALIFY' && match.winnerTeamId) {
      won =
        (prediction.optionKey === 'homeQualify' && match.winnerTeamId === match.homeTeamId) ||
        (prediction.optionKey === 'awayQualify' && match.winnerTeamId === match.awayTeamId);
    }

    if (won) {
      const pointsWon = Math.round(prediction.stakePoints * prediction.oddsDecimal * 10) / 10;
      const oldBalance = wallet.balance;
      wallet.balance += pointsWon;
      prediction.status = 'WON';
      prediction.settledReturn = pointsWon;
      prediction.settledProfit = pointsWon - prediction.stakePoints;
      prediction.settledAt = new Date().toISOString();

      db.transactions.push({
        id: createId('win'),
        userId: prediction.userId,
        type: 'PREDICTION_WIN',
        amount: pointsWon,
        balanceBefore: oldBalance,
        balanceAfter: wallet.balance,
        relatedPredictionId: prediction.id,
        relatedMatchId: match.id,
        note: `竞猜命中：${match.roundName} ${prediction.optionLabel}`,
        createdAt: new Date().toISOString(),
      });
    } else {
      prediction.status = 'LOST';
      prediction.settledReturn = 0;
      prediction.settledProfit = -prediction.stakePoints;
      prediction.settledAt = new Date().toISOString();

      db.transactions.push({
        id: createId('lose'),
        userId: prediction.userId,
        type: 'PREDICTION_LOSE',
        amount: -prediction.stakePoints,
        balanceBefore: wallet.balance,
        balanceAfter: wallet.balance,
        relatedPredictionId: prediction.id,
        relatedMatchId: match.id,
        note: `竞猜未命中：${match.roundName} ${prediction.optionLabel}`,
        createdAt: new Date().toISOString(),
      });
    }
  }

  match.isSettled = true;
  match.settledAt = new Date().toISOString();
  match.settlementStatus = 'SETTLED';
  match.operationalStatus = 'SETTLED';

  const homeName = db.teams.find((team) => team.id === match.homeTeamId)?.nameZh || '主队';
  const awayName = db.teams.find((team) => team.id === match.awayTeamId)?.nameZh || '客队';
  db.aiContents.unshift({
    id: createId('ai-recap'),
    type: 'POST_MATCH_RECAP',
    matchId: match.id,
    title: `赛后速览：${homeName} vs ${awayName}`,
    content: `${homeName} 与 ${awayName} 的比赛已经结束，最终比分 ${hScore} : ${aScore}。本场竞猜已经自动结算完成。`,
    summary: `比分定格在 ${hScore} : ${aScore}，本场竞猜已完成结算。`,
    bullets: ['结算已写入钱包', '重结时会先回滚再重算', '榜单会随着结算自动刷新'],
    riskWarning: '若赛果官方修订，后台可以触发重结。',
    model: 'local-fallback',
    provider: 'Local',
    fallbackUsed: true,
    createdAt: new Date().toISOString(),
  });

  dbService.refreshBracketState();
  markMatchAiStale(match.id);
  markRoomLeaderboardAiStale('room-1');

  return matchPredictions.length;
}

// ─── Scheduled Maintenance ───

let lastScheduledSyncAt = 0;
let scheduledSyncRunning = false;

export function ensureLifecycleForAllMatches() {
  const db = dbService.getData();
  for (const match of db.matches) {
    applyLifecycleUpdates(match, config.predictionLockMinutes);
  }
}

export async function runScheduledMaintenance(forceSync = false) {
  ensureLifecycleForAllMatches();
  const db = dbService.getData();
  let changed = false;

  for (const match of db.matches) {
    if (
      deriveOperationalStatus(match, Date.now(), config.predictionLockMinutes) === 'WAITING_SETTLEMENT' &&
      !match.isSettled &&
      FINISHED_MATCH_STATUSES.has(match.status)
    ) {
      try {
        settleMatch(match);
        changed = true;
      } catch (error) {
        console.error('Auto settlement failed', error);
      }
    }
  }

  const shouldRunSync =
    forceSync || Date.now() - lastScheduledSyncAt >= config.syncIntervalMinutes * 60 * 1000;
  if (shouldRunSync && !scheduledSyncRunning) {
    scheduledSyncRunning = true;
    try {
      const { syncFixturesForDay, syncOddsForMatches } = await import('./sync');
      const date = new Date().toISOString().slice(0, 10);
      const fixturesResult = await syncFixturesForDay({
        apiKey: config.apiFootballKey,
        date,
        db,
      });
      appendSyncLog(fixturesResult.log);

      const oddsResult = await syncOddsForMatches({
        apiKey: config.theOddsApiKey,
        db,
      });
      appendSyncLog(oddsResult.log);

      fixturesResult.updatedMatches?.forEach((item) => markMatchAiStale(item.id));
      oddsResult.updatedMatchIds?.forEach((item) => markMatchAiStale(item));
      dbService.refreshBracketState();

      lastScheduledSyncAt = Date.now();
      changed = true;
    } finally {
      scheduledSyncRunning = false;
    }
  }

  if (changed) {
    dbService.save();
  }
}

// ─── Integration Status ───

export function getIntegrationStatusPayload() {
  const db = dbService.getData();
  const providerConfig = summarizeProviderConfig(config);
  const fixtureLog = getLatestSyncLog('fixtures', 'API-Football');
  const oddsLog = getLatestSyncLog('odds', 'The Odds API');
  const aiLog = getLatestSyncLog('ai');
  const syncedOddsCount = Object.values(db.matchOdds).filter((odds) => odds.source === 'The Odds API').length;
  const manualOddsCount = Object.values(db.matchOdds).filter((odds) => odds.source !== 'The Odds API').length;
  const datedMatches = db.matches.filter((match) => match.startTimeUtc);
  const orderedDates = datedMatches.map((match) => match.startTimeUtc.slice(0, 10)).sort();

  return {
    providers: providerConfig,
    sync: {
      fixtures: fixtureLog
        ? {
            status: fixtureLog.status,
            lastRunAt: fixtureLog.createdAt,
            requestSummary: fixtureLog.requestSummary,
            responseSummary: fixtureLog.responseSummary,
            errorMessage: fixtureLog.errorMessage || null,
            targetDate: fixtureLog.targetDate || null,
          }
        : null,
      odds: oddsLog
        ? {
            status: oddsLog.status,
            lastRunAt: oddsLog.createdAt,
            requestSummary: oddsLog.requestSummary,
            responseSummary: oddsLog.responseSummary,
            errorMessage: oddsLog.errorMessage || null,
          }
        : null,
      ai: aiLog
        ? {
            status: aiLog.status,
            lastRunAt: aiLog.createdAt,
            requestSummary: aiLog.requestSummary,
            responseSummary: aiLog.responseSummary,
            errorMessage: aiLog.errorMessage || null,
          }
        : null,
      coverage: {
        totalMatches: db.matches.length,
        oddsFromApi: syncedOddsCount,
        oddsManualFallback: manualOddsCount,
        dateRange:
          orderedDates.length > 0
            ? {
                first: orderedDates[0],
                last: orderedDates[orderedDates.length - 1],
              }
            : null,
      },
    },
  };
}

// ─── Misc Helpers ───

export function buildAiFallback(title: string, content: string): AIContent {
  return {
    id: createId('ai'),
    type: 'DAILY_RECOMMENDATION',
    title,
    content,
    summary: '今晚先看焦点战的节奏变化，再决定娱乐积分怎么分配。',
    bullets: ['强强对话先等首发', '热门方向别压满', '比分玩法更适合轻仓试水'],
    riskWarning: '临场首发和锁盘时间都可能改变判断，娱乐积分建议分档操作。',
    model: 'local-fallback',
    provider: 'Local',
    fallbackUsed: true,
    createdAt: new Date().toISOString(),
  };
}

export function formatMarketLabel(market: Prediction['market']) {
  const mapping: Record<Prediction['market'], string> = {
    H2H: '胜平负',
    CORRECT_SCORE: '比分',
    TOTAL_GOALS: '总进球',
    QUALIFY: '晋级',
  };
  return mapping[market] || market;
}

export function formatKickoffLabel(startTimeUtc: string) {
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Shanghai',
  }).format(new Date(startTimeUtc));
}

export function buildMatchPreviewPrompt(match: Match, odds?: MatchOdds | null) {
  const db = dbService.getData();
  const home = db.teams.find((team) => team.id === match.homeTeamId)?.nameZh || '主队';
  const away = db.teams.find((team) => team.id === match.awayTeamId)?.nameZh || '客队';
  return {
    title: `AI 赛前速览：${home} vs ${away}`,
    prompt: `请为 ${home} vs ${away} 生成一段世界杯群聊赛前速览。要求：第一句给结论，再给 2 到 3 条短 bullet，最后补一句风险提醒。可参考信息：阶段 ${match.stage}，地点 ${match.venueCity}，北京时间 ${formatKickoffLabel(match.startTimeUtc)}，胜平负赔率 ${odds ? `${odds.h2h.homeWin}/${odds.h2h.draw}/${odds.h2h.awayWin}` : '暂无'}。`,
    fallbackBody: `${home} 和 ${away} 这场球适合先看首发和临场变化，再决定娱乐积分怎么分配。`,
  };
}

export function pickNearestMatchDay() {
  const datedMatches = dbService
    .getMatches()
    .filter((match) => match.startTimeUtc)
    .sort((a, b) => new Date(a.startTimeUtc).getTime() - new Date(b.startTimeUtc).getTime());

  if (datedMatches.length === 0) {
    return new Date().toISOString().slice(0, 10);
  }

  const now = Date.now();
  const future = datedMatches.find((match) => new Date(match.startTimeUtc).getTime() >= now);
  return (future || datedMatches[0]).startTimeUtc.slice(0, 10);
}

// ─── Quiz Data ───

export const QUIZ_POINTS_PER_CORRECT = 100;

export const quizQuestionPool = [
  {
    id: 'q1',
    question: '2026 年世界杯由哪三个国家联合举办？',
    options: ['美国、加拿大、墨西哥', '美国、巴西、阿根廷', '英国、法国、德国', '日本、韩国、中国'],
    correctIndex: 0,
    explanation: '2026 年世界杯是美国、加拿大、墨西哥三国首次联合举办，也是首次有 48 支球队参赛。',
  },
  {
    id: 'q2',
    question: '2026 世界杯是第几届世界杯？',
    options: ['第 21 届', '第 22 届', '第 23 届', '第 24 届'],
    correctIndex: 2,
    explanation: '2026 世界杯是第 23 届 FIFA 世界杯。',
  },
  {
    id: 'q3',
    question: '哪支球队获得过最多次世界杯冠军？',
    options: ['德国', '意大利', '巴西', '阿根廷'],
    correctIndex: 2,
    explanation: '巴西队共获得 5 次世界杯冠军（1958、1962、1970、1994、2002），是夺冠次数最多的球队。',
  },
  {
    id: 'q4',
    question: '2022 年卡塔尔世界杯冠军是哪支球队？',
    options: ['法国', '克罗地亚', '摩洛哥', '阿根廷'],
    correctIndex: 3,
    explanation: '阿根廷在 2022 年卡塔尔世界杯决赛中击败法国，梅西终圆世界杯冠军梦。',
  },
  {
    id: 'q5',
    question: '世界杯奖杯的正式名称是什么？',
    options: ['金球奖', '大力神杯', '雷米特杯', '金靴奖'],
    correctIndex: 1,
    explanation: '大力神杯是 1974 年以来 FIFA 世界杯的正式奖杯，由 18K 黄金铸造。',
  },
  {
    id: 'q6',
    question: '一场标准足球比赛的时长是多少？',
    options: ['80 分钟', '90 分钟', '100 分钟', '120 分钟'],
    correctIndex: 1,
    explanation: '标准足球比赛上下半场各 45 分钟，共 90 分钟，加上伤停补时。',
  },
  {
    id: 'q7',
    question: '足球比赛中，每队上场人数是多少？',
    options: ['9 人', '10 人', '11 人', '12 人'],
    correctIndex: 2,
    explanation: '标准足球比赛每队上场 11 人，包括 1 名守门员。',
  },
  {
    id: 'q8',
    question: '2026 世界杯决赛圈有多少支球队参赛？',
    options: ['32 支', '40 支', '48 支', '64 支'],
    correctIndex: 2,
    explanation: '2026 世界杯首次扩军至 48 支球队，分为 12 个小组。',
  },
  {
    id: 'q9',
    question: '哪位球员在单届世界杯进球数最多？',
    options: ['贝利', '克洛泽', '方丹', '罗纳尔多'],
    correctIndex: 2,
    explanation: '法国球员方丹在 1958 年世界杯单届打入 13 球，至今无人打破。',
  },
  {
    id: 'q10',
    question: '世界杯历史上进球最多的球员是谁？',
    options: ['贝利', '罗纳尔多', '克洛泽', '梅西'],
    correctIndex: 2,
    explanation: '德国球员克洛泽在世界杯决赛圈共打入 16 球，是世界杯历史最佳射手。',
  },
  {
    id: 'q11',
    question: '足球比赛中越位规则是指什么？',
    options: ['球员在对方半场接球时比倒数第二名防守球员更靠近球门线', '球员在禁区内推人', '球员用手触球', '球员从背后铲球'],
    correctIndex: 0,
    explanation: '越位是指进攻球员在传球瞬间，比倒数第二名防守球员更靠近对方球门线。',
  },
  {
    id: 'q12',
    question: '点球大战中每队先罚几个球？',
    options: ['3 个', '4 个', '5 个', '6 个'],
    correctIndex: 2,
    explanation: '点球大战每队先罚 5 轮，若仍平局则进入突然死亡模式。',
  },
  {
    id: 'q13',
    question: 'VAR 在足球比赛中代表什么？',
    options: ['视频助理裁判', '虚拟攻击区域', '球员评估排名', '比赛分析报告'],
    correctIndex: 0,
    explanation: 'VAR 即 Video Assistant Referee（视频助理裁判），用于协助主裁判做出更准确的判罚。',
  },
  {
    id: 'q14',
    question: '哪支球队被称为"高卢雄鸡"？',
    options: ['巴西', '德国', '法国', '西班牙'],
    correctIndex: 2,
    explanation: '法国队因其国家象征高卢雄鸡而被称为"高卢雄鸡"。',
  },
  {
    id: 'q15',
    question: '世界杯小组赛赢一场得几分？',
    options: ['1 分', '2 分', '3 分', '4 分'],
    correctIndex: 2,
    explanation: '世界杯小组赛胜一场得 3 分，平一场得 1 分，负一场得 0 分。',
  },
];

export function getDailyQuizQuestions(): typeof quizQuestionPool {
  const today = new Date().toISOString().split('T')[0];
  const seed = today.split('-').join('');
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
  }
  const shuffled = [...quizQuestionPool].sort((a, b) => {
    const ha = (hash + a.id.charCodeAt(0)) | 0;
    const hb = (hash + b.id.charCodeAt(0)) | 0;
    return ha - hb;
  });
  return shuffled.slice(0, 3);
}
