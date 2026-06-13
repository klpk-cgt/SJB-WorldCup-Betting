/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Settings, Shield, Users, Trophy, Play, CheckCircle, RefreshCw, BarChart3, Database, Key, Coins, HelpCircle, FileText, AlertCircle, Sparkles, Plus, Trash2, Upload, X } from 'lucide-react';
import { ADMIN_KEY_STORAGE, apiRequest } from '../utils/api';
import { Match, User, SyncLog } from '../types';
import { useToast } from './ToastProvider';
import AdminDashboard from './AdminDashboard';

interface AdminPanelProps {
  onBackToApp: () => void;
}

export default function AdminPanel({ onBackToApp }: AdminPanelProps) {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [isAuthed, setIsAuthed] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'users' | 'matches' | 'ai' | 'logs' | 'predictions' | 'transactions'>('dashboard');
  const [errorStr, setErrorStr] = useState('');

  // Admin states
  const [users, setUsers] = useState<any[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);
  const [integrationStatus, setIntegrationStatus] = useState<any | null>(null);
  const [lastTestSyncResult, setLastTestSyncResult] = useState<any | null>(null);
  const [cardStats, setCardStats] = useState<any | null>(null);
  const [systemStatus, setSystemStatus] = useState<any | null>(null);
  const [syncRuntime, setSyncRuntime] = useState<any | null>(null);
  const [syncWindowPastDays, setSyncWindowPastDays] = useState('1');
  const [syncWindowFutureDays, setSyncWindowFutureDays] = useState('7');
  const [opsStatusMsg, setOpsStatusMsg] = useState('');

  // User provisioning helpers
  const [pasteNames, setPasteNames] = useState('');
  const [provisionRoom, setProvisionRoom] = useState('room-1');
  const [userMsg, setUserMsg] = useState('');

  // 单个创建账号
  const [singleName, setSingleName] = useState('');
  const [singleLoginCode, setSingleLoginCode] = useState('');
  const [singleRoom, setSingleRoom] = useState('room-1');
  const [singlePoints, setSinglePoints] = useState('10000');

  // 头像上传
  const [avatarUploadUserId, setAvatarUploadUserId] = useState<string | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 删除确认
  const [deleteConfirmUserId, setDeleteConfirmUserId] = useState<string | null>(null);

  // Balance adjust helpers
  const [adjustTargetUser, setAdjustTargetUser] = useState<any | null>(null);
  const [adjustAmount, setAdjustAmount] = useState('1000');
  const [adjustReason, setAdjustReason] = useState('群友有奖问答答对奖励');

  // Match edit helpers
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [homeScore, setHomeScore] = useState('0');
  const [awayScore, setAwayScore] = useState('0');
  const [matchStatus, setMatchStatus] = useState('NS');
  const [winnerId, setWinnerId] = useState('');

  // Odds edit helpers
  const [oddsHomeWin, setOddsHomeWin] = useState('1.8');
  const [oddsDraw, setOddsDraw] = useState('3.2');
  const [oddsAwayWin, setOddsAwayWin] = useState('4.0');
  const [oddsOver, setOddsOver] = useState('1.9');
  const [oddsUnder, setOddsUnder] = useState('1.9');

  const [settleStatusMsg, setSettleStatusMsg] = useState('');
  const [isWorking, setIsWorking] = useState(false);

  // 竞猜记录查询
  const [predUserId, setPredUserId] = useState('');
  const [predMatchId, setPredMatchId] = useState('');
  const [predictions, setPredictions] = useState<any[]>([]);
  const [predTotal, setPredTotal] = useState(0);
  const [predPage, setPredPage] = useState(1);

  // 积分流水查看
  const [txUserId, setTxUserId] = useState('');
  const [txType, setTxType] = useState('');
  const [transactions, setTransactions] = useState<any[]>([]);
  const [txTotal, setTxTotal] = useState(0);
  const [txPage, setTxPage] = useState(1);

  const toast = useToast();

  useEffect(() => {
    const savedToken = localStorage.getItem(ADMIN_KEY_STORAGE);
    if (savedToken) {
      setIsAuthed(true);
    }
  }, []);

  useEffect(() => {
    if (isAuthed) {
      loadAdminData();
    }
  }, [isAuthed]);

  const clearAdminSession = (message?: string) => {
    localStorage.removeItem(ADMIN_KEY_STORAGE);
    setIsAuthed(false);
    setErrorStr(message || '');
  };

  const formatStatusTime = (value?: string | number | null) => {
    if (!value) return 'Not available';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleString('zh-CN', {
      hour12: false,
      timeZone: 'Asia/Shanghai',
    });
  };

  const loadAdminData = async () => {
    try {
      const [uData, mData, logsData, statusData, systemData, syncStateData, csData] = await Promise.all([
        apiRequest('/api/admin/users'),
        apiRequest('/api/matches'),
        apiRequest('/api/admin/sync-logs'),
        apiRequest('/api/admin/integrations/status'),
        apiRequest('/api/admin/system/status'),
        apiRequest('/api/admin/sync-state'),
        apiRequest('/api/admin/cards/stats').catch(() => null),
      ]);
      setUsers(uData);
      setMatches(mData);
      setSyncLogs(logsData);
      setIntegrationStatus(statusData);
      setSystemStatus(systemData);
      setSyncRuntime(syncStateData);
      setCardStats(csData);
      setErrorStr('');

      // 卡牌统计（可选，失败不影响）
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : '未取得授权或网络读取错误，请重新登录。';
      if (message.includes('权限') || message.includes('登录已失效')) {
        clearAdminSession('管理员登录已失效，请重新登录。');
        return;
      }
      setErrorStr(message);
    }
  };

  const loadPredictions = async (page = 1) => {
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: '20' });
      if (predUserId) params.set('userId', predUserId);
      if (predMatchId) params.set('matchId', predMatchId);
      const data = await apiRequest(`/api/admin/predictions?${params}`);
      setPredictions(data.items || []);
      setPredTotal(data.total || 0);
      setPredPage(page);
    } catch (e) {
      console.error(e);
      toast.error('加载竞猜记录失败');
    }
  };

  const loadTransactions = async (page = 1) => {
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: '20' });
      if (txUserId) params.set('userId', txUserId);
      if (txType) params.set('type', txType);
      const data = await apiRequest(`/api/admin/transactions?${params}`);
      setTransactions(data.items || []);
      setTxTotal(data.total || 0);
      setTxPage(page);
    } catch (e) {
      console.error(e);
      toast.error('加载积分流水失败');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorStr('');
    if (!username.trim() || !password.trim()) {
      setErrorStr('请输入管理员账号和密码。');
      return;
    }
    try {
      const res = await apiRequest('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password })
      });
      if (res.success) {
        localStorage.setItem(ADMIN_KEY_STORAGE, res.token);
        setIsAuthed(true);
        setErrorStr('');
      }
    } catch (err: unknown) {
      setErrorStr(err.message || '管理员账号或密码错误。');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem(ADMIN_KEY_STORAGE);
    setIsAuthed(false);
    setPassword('');
  };

  // Bulk provisioning function
  const handleBulkProvision = async () => {
    if (!pasteNames.trim()) return;
    setIsWorking(true);
    setUserMsg('');
    try {
      const res = await apiRequest('/api/admin/users/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ names: pasteNames, roomId: provisionRoom })
      });
      setUserMsg(`🎉 成功批量创建了 ${res.createdUsers.length} 个账号闲置槽位！分配身份代码完毕。`);
      setPasteNames('');
      await loadAdminData();
    } catch (e: unknown) {
      setUserMsg(`❌ 导入程序出错: ${e.message}`);
    } finally {
      setIsWorking(false);
    }
  };

  // 单个创建账号
  const handleCreateSingleUser = async () => {
    if (!singleLoginCode.trim()) {
      toast.error('创建失败', '请输入登录码。');
      return;
    }
    if (!singleName.trim()) {
      toast.error('创建失败', '请输入用户昵称。');
      return;
    }
    setIsWorking(true);
    try {
      const res = await apiRequest('/api/admin/users/create', {
        method: 'POST',
        body: JSON.stringify({
          displayName: singleName,
          loginCode: singleLoginCode.trim().toUpperCase(),
          roomId: singleRoom,
          initialPoints: parseInt(singlePoints) || 10000,
        })
      });
      toast.success('创建成功', `账号 "${singleName}" 已创建，登录码: ${res.loginCode}`);
      setSingleName('');
      setSingleLoginCode('');
      await loadAdminData();
    } catch (e: unknown) {
      toast.error('创建失败', e.message);
    } finally {
      setIsWorking(false);
    }
  };

  // 删除账号
  const handleDeleteUser = async (userId: string) => {
    setIsWorking(true);
    try {
      const res = await apiRequest(`/api/admin/users/${userId}`, {
        method: 'DELETE',
      });
      toast.success('删除成功', res.message);
      setDeleteConfirmUserId(null);
      await loadAdminData();
    } catch (e: unknown) {
      toast.error('删除失败', e.message);
    } finally {
      setIsWorking(false);
    }
  };

  // 头像上传处理
  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>, userId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 验证文件类型
    if (!file.type.startsWith('image/')) {
      toast.error('格式错误', '请选择图片文件。');
      return;
    }

    // 验证文件大小（2MB）
    if (file.size > 2 * 1024 * 1024) {
      toast.error('文件过大', '请选择小于 2MB 的图片。');
      return;
    }

    // 读取为 Base64
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      setAvatarPreview(base64);

      // 上传到服务器
      setIsWorking(true);
      try {
        await apiRequest(`/api/admin/users/${userId}/avatar`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ avatarUrl: base64 })
        });
        toast.success('上传成功', '头像已更新。');
        setAvatarUploadUserId(null);
        setAvatarPreview('');
        await loadAdminData();
      } catch (err: unknown) {
        toast.error('上传失败', err.message);
      } finally {
        setIsWorking(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    };
    reader.readAsDataURL(file);
  };

  // Adjust funds
  const handleAdjustFunds = async () => {
    if (!adjustTargetUser) return;
    setIsWorking(true);
    try {
      await apiRequest(`/api/admin/users/${adjustTargetUser.id}/adjust-points`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: adjustAmount, reason: adjustReason })
      });
      setAdjustTargetUser(null);
      await loadAdminData();
      toast.success('调整成功', '用户积分已经更新。');
    } catch (e: unknown) {
      toast.error('调整积分失败', e.message);
    } finally {
      setIsWorking(false);
    }
  };

  // Adjust cards
  const handleAdjustCards = async (userId: string, cardId: string, delta: number) => {
    setIsWorking(true);
    try {
      await apiRequest(`/api/admin/users/${userId}/cards/adjust`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardId, delta }),
      });
      await loadAdminData();
      toast.success('卡牌已更新');
    } catch (e: unknown) {
      toast.error('调整卡牌失败', e.message);
    } finally {
      setIsWorking(false);
    }
  };

  // Bootstrap cards for all users
  const handleBootstrapCards = async () => {
    if (!confirm('确认给所有用户补齐初始卡牌？')) return;
    setIsWorking(true);
    try {
      const res = await apiRequest('/api/admin/cards/bootstrap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      toast.success('补卡完成', `已为 ${res.count || 0} 位用户补齐初始卡牌`);
      await loadAdminData();
    } catch (e: unknown) {
      toast.error('补卡失败', e.message);
    } finally {
      setIsWorking(false);
    }
  };

  const handleMatchSelect = (match: Match) => {
    setSelectedMatch(match);
    setHomeScore(match.homeScore?.toString() || '0');
    setAwayScore(match.awayScore?.toString() || '0');
    setMatchStatus(match.status);
    setWinnerId(match.winnerTeamId || '');

    // Setup odds editable controls
    if (match.odds) {
      setOddsHomeWin(match.odds.h2h.homeWin?.toString() || '2.0');
      setOddsDraw(match.odds.h2h.draw?.toString() || '3.2');
      setOddsAwayWin(match.odds.h2h.awayWin?.toString() || '3.0');
      setOddsOver(match.odds.totalGoals.over25?.toString() || '1.9');
      setOddsUnder(match.odds.totalGoals.under25?.toString() || '1.9');
    }
    setSettleStatusMsg('');
  };

  const handleUpdateMatchDetails = async () => {
    if (!selectedMatch) return;
    setIsWorking(true);
    try {
      // 1. Update status / scores First
      await apiRequest(`/api/admin/matches/${selectedMatch.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: matchStatus,
          homeScore: parseInt(homeScore),
          awayScore: parseInt(awayScore),
          winnerTeamId: winnerId || null
        })
      });

      // 2. Update match odds too
      await apiRequest(`/api/admin/matches/${selectedMatch.id}/odds`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          homeWin: parseFloat(oddsHomeWin),
          draw: parseFloat(oddsDraw),
          awayWin: parseFloat(oddsAwayWin),
          over25: parseFloat(oddsOver),
          under25: parseFloat(oddsUnder)
        })
      });

      toast.success('比赛数据已保存', '比分与赔率修改已经生效。');
      setSelectedMatch(null);
      await loadAdminData();
    } catch (e: unknown) {
      toast.error('更新比赛失败', e.message);
    } finally {
      setIsWorking(false);
    }
  };

  const handleTriggerSettlement = async () => {
    if (!selectedMatch) return;
    setIsWorking(true);
    setSettleStatusMsg('正在检索群 predictions 数据并自动核对计算派积分中...');
    try {
      const res = await apiRequest(`/api/admin/matches/${selectedMatch.id}/settle`, {
        method: 'POST'
      });
      setSettleStatusMsg(`🎉 派派结算打款完毕！共对 ${res.count} 条群 predictions 记录判定并进行了增扣记录流水。`);
      await loadAdminData();
    } catch (e: unknown) {
      setSettleStatusMsg(`❌ 结算打款挂账出错: ${e.message}`);
    } finally {
      setIsWorking(false);
    }
  };

  const handleSettleSelectedMatch = async (forceResettle = false) => {
    if (!selectedMatch) return;
    setIsWorking(true);
    setSettleStatusMsg(
      forceResettle
        ? '正在回滚并重算这场比赛的结算数据，请稍候...'
        : '正在按当前比分结算这场比赛，请稍候...',
    );
    try {
      const res = await apiRequest(`/api/admin/matches/${selectedMatch.id}/settle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(forceResettle ? { forceResettle: true } : {}),
      });
      setSettleStatusMsg(
        forceResettle
          ? `强制重算完成，已重新处理 ${res.count} 条竞猜记录。`
          : `结算完成，已处理 ${res.count} 条竞猜记录。`,
      );
      await loadAdminData();
    } catch (e: unknown) {
      setSettleStatusMsg(`结算失败: ${e.message}`);
    } finally {
      setIsWorking(false);
    }
  };

  const syncFixturesAPI = async () => {
    setIsWorking(true);
    try {
      await apiRequest('/api/admin/sync/today', { method: 'POST' });
      setOpsStatusMsg('Today sync completed.');
      toast.success('赛程同步完成', '本地赛程与缓存已重新构建。');
      await loadAdminData();
    } catch (e: unknown) {
      toast.error('赛程同步失败', e.message);
    } finally {
      setIsWorking(false);
    }
  };

  const syncWindowAPI = async () => {
    setIsWorking(true);
    setOpsStatusMsg('Syncing recent fixture window...');
    try {
      const result = await apiRequest('/api/admin/sync/window', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pastDays: Number(syncWindowPastDays) || 1,
          futureDays: Number(syncWindowFutureDays) || 7,
        }),
      });
      setOpsStatusMsg(
        `Window sync completed. Updated ${result.updatedMatches?.length || 0}, created ${result.createdMatches?.length || 0}.`,
      );
      toast.success('Window sync completed', `Updated ${result.updatedMatches?.length || 0}, created ${result.createdMatches?.length || 0}`);
      await loadAdminData();
    } catch (e: unknown) {
      setOpsStatusMsg(`Window sync failed: ${e.message}`);
      toast.error('Window sync failed', e.message);
    } finally {
      setIsWorking(false);
    }
  };

  const runIntegrationTestSync = async () => {
    setIsWorking(true);
    try {
      const result = await apiRequest('/api/admin/integrations/test-sync', { method: 'POST' });
      setLastTestSyncResult(result);
      setOpsStatusMsg(`Integration test finished for ${result.sampleDate || 'unknown date'}.`);
      await loadAdminData();
    } catch (e: unknown) {
      toast.error('同步校验失败', e.message || '请稍后重试。');
    } finally {
      setIsWorking(false);
    }
  };

  const syncSelectedMatch = async () => {
    if (!selectedMatch) return;
    setIsWorking(true);
    try {
      await apiRequest(`/api/admin/sync/matches/${selectedMatch.id}`, { method: 'POST' });
      setOpsStatusMsg(`Selected match synced: ${selectedMatch.id}`);
      toast.success('单场同步完成', '这场比赛已经重新同步。');
      await loadAdminData();
    } catch (e: unknown) {
      toast.error('单场同步失败', e.message);
    } finally {
      setIsWorking(false);
    }
  };

  if (!isAuthed) {
    return (
      <div className="max-w-md mx-auto my-12 bg-white p-7 rounded-3xl border border-rose-200 text-left space-y-4 shadow-md">
        <div className="flex items-center space-x-2 text-rose-600">
          <Shield className="w-6 h-6 shrink-0 text-rose-500" />
          <h2 className="font-display font-black text-sm uppercase tracking-wider">
            管理员专属授权验证枢纽
          </h2>
        </div>
        <p className="text-xs text-slate-500 font-bold leading-relaxed">
          出于积分操作及赛程同步安全考虑，请使用生产环境里配置的管理员账号和密码登录后台。
        </p>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block mb-1.5">
              管理员账号
            </label>
            <input
              type="text"
              placeholder="请输入管理员账号..."
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3 text-xs text-slate-800 focus:outline-none focus:border-rose-450 focus:bg-white transition"
            />
          </div>

          <div>
            <label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block mb-1.5">
              管理员密码
            </label>
            <input
              type="password"
              placeholder="请输入管理员密码..."
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3 text-xs text-slate-800 focus:outline-none focus:border-rose-450 focus:bg-white transition"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-rose-550 hover:bg-rose-600 bg-rose-500 text-white text-xs font-bold py-3.5 rounded-xl transition cursor-pointer shadow-xs font-sans"
          >
            开启操纵台进入
          </button>
        </form>

        {errorStr && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-bold">
            {errorStr}
          </div>
        )}

        <button
          onClick={onBackToApp}
          className="w-full text-center text-xs text-slate-400 hover:text-slate-600 mt-2 block cursor-pointer font-bold"
        >
          &larr; 返回普通球迷入口
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 text-left">
      {/* Header operations */}
      <div className="flex items-center justify-between p-4 bg-white/95 rounded-3xl border border-slate-205 shadow-2xs">
        <div className="flex items-center space-x-2.5">
          <Shield className="w-5 h-5 text-rose-500" />
          <div>
            <h2 className="font-display font-black text-xs text-slate-800">管理后台操纵室</h2>
            <p className="text-[10px] text-slate-400 font-bold mt-0.5">2026世界杯竞猜专版配置台</p>
          </div>
        </div>

        <div className="flex space-x-2">
          <button
            onClick={onBackToApp}
            className="text-xs bg-emerald-50 border border-emerald-200 text-emerald-700 px-3.5 py-2.5 rounded-xl hover:bg-emerald-100/60 cursor-pointer font-bold transition"
          >
            返回球员入口
          </button>
          <button
            onClick={handleLogout}
            className="text-xs bg-rose-50 border border-rose-150 text-rose-600 px-2.5 py-2.5 rounded-xl hover:bg-rose-100/50 cursor-pointer font-bold transition"
          >
            注销管理
          </button>
        </div>
      </div>

      {/* Sub tabs switcher */}
      <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200/80 shadow-2xs overflow-x-auto gap-1">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`py-2.5 text-center text-[10px] font-bold rounded-xl transition shrink-0 px-2.5 cursor-pointer ${
            activeTab === 'dashboard' ? 'bg-white text-emerald-600 font-extrabold shadow-sm' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <BarChart3 className="h-3 w-3 inline mr-1" />
          仪表盘
        </button>
        <button
          onClick={() => setActiveTab('matches')}
          className={`py-2.5 text-center text-[10px] font-bold rounded-xl transition shrink-0 px-2.5 cursor-pointer ${
            activeTab === 'matches' ? 'bg-white text-rose-600 font-extrabold shadow-sm' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          赛程结算
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`py-2.5 text-center text-[10px] font-bold rounded-xl transition shrink-0 px-2.5 cursor-pointer ${
            activeTab === 'users' ? 'bg-white text-rose-600 font-extrabold shadow-sm' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          人员拨款
        </button>
        <button
          onClick={() => { setActiveTab('predictions'); loadPredictions(); }}
          className={`py-2.5 text-center text-[10px] font-bold rounded-xl transition shrink-0 px-2.5 cursor-pointer ${
            activeTab === 'predictions' ? 'bg-white text-rose-600 font-extrabold shadow-sm' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          竞猜记录
        </button>
        <button
          onClick={() => { setActiveTab('transactions'); loadTransactions(); }}
          className={`py-2.5 text-center text-[10px] font-bold rounded-xl transition shrink-0 px-2.5 cursor-pointer ${
            activeTab === 'transactions' ? 'bg-white text-rose-600 font-extrabold shadow-sm' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          积分流水
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`py-2.5 text-center text-[10px] font-bold rounded-xl transition shrink-0 px-2.5 cursor-pointer ${
            activeTab === 'logs' ? 'bg-white text-rose-600 font-extrabold shadow-sm' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          同步日志
        </button>
      </div>

      {/* MATCHES ADMIN TAB */}
      {activeTab === 'matches' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center bg-slate-50 p-4.5 rounded-2xl border border-slate-200 gap-3">
            <div>
              <h4 className="text-xs font-black text-slate-700">世界杯赛事与盘口后台操纵</h4>
              <p className="text-[10px] text-slate-400 font-bold mt-0.5">更改赛前赔率，敲定结果后对群 predictions 展开结算派彩</p>
            </div>
            <button
              onClick={syncFixturesAPI}
              disabled={isWorking}
              className="px-3.5 py-2 bg-white border border-slate-200 text-emerald-600 font-bold font-mono text-[10px] rounded-xl hover:bg-slate-50 flex items-center gap-1 cursor-pointer self-start transition"
            >
              <Database className="w-3.5 h-3.5" />
              重新全量同步赛程
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Left list matches */}
            <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
              {matches.map((m) => (
                <div
                  key={m.id}
                  onClick={() => handleMatchSelect(m)}
                  className={`p-3.5 bg-white border rounded-2xl cursor-pointer hover:border-rose-300 transition duration-150 text-[11px] space-y-2 shadow-2xs ${
                    selectedMatch?.id === m.id ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200'
                  }`}
                >
                  <div className="flex justify-between text-slate-400 font-bold">
                    <span className="font-mono text-[9px]">{m.roundName} ({m.stage})</span>
                    <span className="text-[10px]">状态: {m.status === 'FT' ? '已结束 FT' : m.status === 'LIVE' ? '开踢 LIVE' : '未开赛 NS'}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs py-1">
                    <span className="font-black text-slate-800">{m.homeTeam?.nameZh}</span>
                    <span className="font-mono text-amber-600 font-black text-sm bg-amber-55 mb-0 px-2 py-0.5 rounded-lg border border-amber-250/50 bg-amber-50">
                      {m.homeScore !== undefined && m.status !== 'NS' ? `${m.homeScore} : ${m.awayScore}` : 'VS'}
                    </span>
                    <span className="font-black text-slate-800">{m.awayTeam?.nameZh}</span>
                  </div>
                  <div className="flex justify-between text-[10px] font-mono text-slate-400 mt-1 font-bold">
                    <span className="flex items-center gap-1">
                      结算：{m.isSettled ? (
                        <span className="text-emerald-600 flex items-center gap-0.5">✅ 已派发</span>
                      ) : (
                        <span className="text-rose-500 font-bold">❌ 尚未清算发放积分</span>
                      )}
                    </span>
                    <span className="text-slate-500">赔率: {m.odds ? `${m.odds.h2h.homeWin}/${m.odds.h2h.draw}/${m.odds.h2h.awayWin}` : '无'}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Right Editing Matching Details */}
            <div>
              {selectedMatch ? (
                <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-2xs space-y-4">
                  <h4 className="text-xs font-display font-black text-rose-600 uppercase tracking-widest border-b border-slate-100 pb-2 flex items-center gap-1.5">
                    <Settings className="w-4 h-4" />
                    操纵中赛事: {selectedMatch.homeTeam?.nameZh} vs {selectedMatch.awayTeam?.nameZh}
                  </h4>

                  {/* Edit Core Metrics */}
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-450 block mb-1 font-bold">主队进球</label>
                      <input
                        type="number"
                        value={homeScore}
                        onChange={(e) => setHomeScore(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 px-2 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-rose-400 focus:bg-white rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-450 block mb-1 font-bold">客队进球</label>
                      <input
                        type="number"
                        value={awayScore}
                        onChange={(e) => setAwayScore(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 px-2 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-rose-400 focus:bg-white rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-450 block mb-1 font-bold">比赛进度</label>
                      <select
                        value={matchStatus}
                        onChange={(e) => setMatchStatus(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 px-2 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-rose-500 rounded-lg text-left"
                      >
                        <option value="NS">未开赛 NS</option>
                        <option value="LIVE">进行中 LIVE</option>
                        <option value="FT">已完赛 FT</option>
                        <option value="CANCELLED">取消 CANCELLED</option>
                      </select>
                    </div>
                  </div>

                  {/* Edit Odds Snapshot Details */}
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <p className="text-[10px] text-slate-400 font-bold">手动配置即时竞猜指数赔率 Decimals</p>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-[9px] text-slate-400 block font-bold">主胜 (Home)</label>
                        <input
                          type="text"
                          value={oddsHomeWin}
                          onChange={(e) => setOddsHomeWin(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 px-2 py-1 rounded text-xs text-slate-800 font-mono font-bold"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] text-slate-400 block font-bold">平局 (Draw)</label>
                        <input
                          type="text"
                          value={oddsDraw}
                          onChange={(e) => setOddsDraw(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 px-2 py-1 rounded text-xs text-slate-800 font-mono font-bold"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] text-slate-400 block font-bold">客胜 (Away)</label>
                        <input
                          type="text"
                          value={oddsAwayWin}
                          onChange={(e) => setOddsAwayWin(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 px-2 py-1 rounded text-xs text-slate-800 font-mono font-bold"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-1">
                      <div>
                        <label className="text-[9px] text-slate-400 block font-bold">大 2.5分球</label>
                        <input
                          type="text"
                          value={oddsOver}
                          onChange={(e) => setOddsOver(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 px-2 py-1 rounded text-xs text-slate-800 font-mono font-bold"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] text-slate-400 block font-bold">小 2.5分球</label>
                        <input
                          type="text"
                          value={oddsUnder}
                          onChange={(e) => setOddsUnder(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 px-2 py-1 rounded text-xs text-slate-800 font-mono font-bold"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 pt-3 border-t border-slate-100">
                    <button
                      onClick={handleUpdateMatchDetails}
                      disabled={isWorking}
                      className="flex-1 bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold py-2.5 px-4 rounded-xl transition cursor-pointer"
                    >
                      保存比分/指数设置
                    </button>
                    <button
                      onClick={syncSelectedMatch}
                      disabled={isWorking}
                      className="flex-1 bg-white border border-slate-200 text-slate-700 text-xs font-bold py-2.5 px-4 rounded-xl transition cursor-pointer"
                    >
                      单场同步
                    </button>
                    {(selectedMatch.status === 'FT' || matchStatus === 'FT') && (
                      <button
                        onClick={handleTriggerSettlement}
                        disabled={isWorking}
                        className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black py-2.5 px-4 rounded-xl transition cursor-pointer"
                      >
                        一键清算本场派积分
                      </button>
                    )}
                  </div>

                  {selectedMatch && (selectedMatch.status === 'FT' || matchStatus === 'FT') && (
                    <button
                      onClick={() => handleSettleSelectedMatch(true)}
                      disabled={isWorking}
                      className="w-full bg-amber-500 hover:bg-amber-600 text-white text-xs font-black py-2.5 px-4 rounded-xl transition cursor-pointer"
                    >
                      强制重算本场结算
                    </button>
                  )}

                  {settleStatusMsg && (
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center text-xs text-slate-600 font-bold leading-relaxed">
                      {settleStatusMsg}
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-white/80 p-8 border border-dashed border-slate-200 rounded-3xl text-center text-xs text-slate-400 font-bold shadow-2xs">
                  请在左手边选择任意 2026 世界杯赛程行，展开结果更新、即时红利结算与赔口指控。
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* PROVISION AND WALLET ADJUST TAB */}
      {activeTab === 'dashboard' && (
        <div className="space-y-4">
          <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                    <BarChart3 className="w-4 h-4 text-emerald-500" />
                    系统状态
                  </h4>
                  <p className="mt-1 text-[11px] text-slate-500 font-bold">
                    快速确认存储模式、关键表数量和最近同步状态。
                  </p>
                </div>
                <button
                  onClick={loadAdminData}
                  disabled={isWorking}
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-black text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  刷新状态
                </button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Storage</div>
                  <div className="mt-2 text-sm font-black text-slate-900">{systemStatus?.storage?.mode || 'unknown'}</div>
                  <div className={`mt-1 text-[11px] font-bold ${systemStatus?.storage?.databaseConnected ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {systemStatus?.storage?.databaseConnected ? 'Database connected' : 'Database unavailable'}
                  </div>
                  {systemStatus?.storage?.logDirectory && (
                    <div className="mt-1 text-[10px] font-bold text-slate-400 break-all">
                      {systemStatus.storage.logDirectory}
                    </div>
                  )}
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Data</div>
                  <div className="mt-2 text-sm font-black text-slate-900">
                    {systemStatus?.counts?.teams || 0} teams / {systemStatus?.counts?.matches || 0} matches
                  </div>
                  <div className="mt-1 text-[11px] font-bold text-slate-500">
                    {systemStatus?.counts?.players || 0} players / {systemStatus?.counts?.teamHistory || 0} history
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Betting</div>
                  <div className="mt-2 text-sm font-black text-slate-900">
                    {systemStatus?.counts?.predictions || 0} predictions
                  </div>
                  <div className="mt-1 text-[11px] font-bold text-slate-500">
                    {systemStatus?.counts?.wallets || 0} wallets / {systemStatus?.counts?.transactions || 0} transactions
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Match health</div>
                  <div className="mt-2 text-sm font-black text-slate-900">
                    {systemStatus?.matches?.joinedTeamMatches || 0} joined matches
                  </div>
                  <div className={`mt-1 text-[11px] font-bold ${(systemStatus?.matches?.orphanTeamRefs || 0) > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                    orphan refs: {systemStatus?.matches?.orphanTeamRefs || 0}
                  </div>
                </div>
              </div>

              <div className="grid gap-3 lg:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-700">
                  <div className="font-black text-slate-900">最近同步</div>
                  <div className="mt-2 space-y-1.5">
                    <div>Fixtures: {systemStatus?.sync?.latestFixtures?.status || 'N/A'}</div>
                    <div>Fixtures time: {formatStatusTime(systemStatus?.sync?.latestFixtures?.createdAt || systemStatus?.sync?.latestFixtures?.lastRunAt)}</div>
                    <div>Odds: {systemStatus?.sync?.latestOdds?.status || 'N/A'}</div>
                    <div>Odds time: {formatStatusTime(systemStatus?.sync?.latestOdds?.createdAt || systemStatus?.sync?.latestOdds?.lastRunAt)}</div>
                    <div>Latest log: {formatStatusTime(systemStatus?.sync?.latest?.createdAt)}</div>
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-700">
                  <div className="font-black text-slate-900">调度状态</div>
                  <div className="mt-2 space-y-1.5">
                    <div>Priority: {syncRuntime?.state?.currentPriority || 'N/A'}</div>
                    <div>Reason: {syncRuntime?.state?.currentReason || 'N/A'}</div>
                    <div>Live sync interval: {syncRuntime?.plan?.liveScoreIntervalMs ? `${Math.round(syncRuntime.plan.liveScoreIntervalMs / 1000)}s` : 'disabled'}</div>
                    <div>Fixtures interval: {syncRuntime?.plan?.fixturesIntervalMs ? `${Math.round(syncRuntime.plan.fixturesIntervalMs / 60000)}m` : 'disabled'}</div>
                    <div>Match dates: {syncRuntime?.plan?.fixturesDates?.length || 0}</div>
                  </div>
                </div>
              </div>

              {systemStatus?.matches?.dateRange && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-700">
                  <div className="font-black text-slate-900">比赛覆盖范围</div>
                  <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1">
                    <span>First: {formatStatusTime(systemStatus.matches.dateRange.first)}</span>
                    <span>Last: {formatStatusTime(systemStatus.matches.dateRange.last)}</span>
                    <span>With scores: {systemStatus.matches.withScores || 0}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4">
              <div>
                <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                  <Database className="w-4 h-4 text-rose-500" />
                  一键运维
                </h4>
                <p className="mt-1 text-[11px] text-slate-500 font-bold">
                  不用上服务器敲命令，直接在这里做同步和自检。
                </p>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <button
                  onClick={syncFixturesAPI}
                  disabled={isWorking}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-xs font-black text-white transition hover:bg-slate-800 disabled:opacity-60"
                >
                  <Database className="h-3.5 w-3.5" />
                  同步今天赛程
                </button>
                <button
                  onClick={runIntegrationTestSync}
                  disabled={isWorking}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-black text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                >
                  <Play className="h-3.5 w-3.5" />
                  运行同步校验
                </button>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 space-y-3">
                <div className="text-[11px] font-black text-slate-700">窗口同步</div>
                <div className="grid grid-cols-2 gap-2">
                  <label className="text-[10px] font-bold text-slate-500">
                    往前天数
                    <input
                      type="number"
                      min="0"
                      value={syncWindowPastDays}
                      onChange={(e) => setSyncWindowPastDays(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:border-rose-400"
                    />
                  </label>
                  <label className="text-[10px] font-bold text-slate-500">
                    往后天数
                    <input
                      type="number"
                      min="1"
                      value={syncWindowFutureDays}
                      onChange={(e) => setSyncWindowFutureDays(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:border-rose-400"
                    />
                  </label>
                </div>
                <button
                  onClick={syncWindowAPI}
                  disabled={isWorking}
                  className="w-full rounded-2xl bg-emerald-500 px-4 py-3 text-xs font-black text-white transition hover:bg-emerald-600 disabled:opacity-60"
                >
                  同步近期赛程窗口
                </button>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                <div className="font-black text-slate-900">操作反馈</div>
                <div className="mt-2 leading-relaxed">
                  {opsStatusMsg || '还没有执行新的运维操作。'}
                </div>
              </div>
            </div>
          </div>

          <AdminDashboard />
        </div>
      )}

      {activeTab === 'users' && (
        <div className="space-y-6">
          {/* 单个创建账号 */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 space-y-4 shadow-2xs">
            <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5 font-display border-b border-slate-100 pb-2">
              <Plus className="w-5 h-5 text-emerald-500" />
              快速创建账号
            </h4>
            <p className="text-[10.5px] text-slate-450 leading-relaxed font-bold">
              手动设置登录码、昵称和初始积分。创建后无需 PIN，好友直接用登录码即可进入。
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="text-[9px] text-slate-400 block mb-1 font-bold">登录码</label>
                <input
                  type="text"
                  placeholder="例如：ZS"
                  value={singleLoginCode}
                  onChange={(e) => setSingleLoginCode(e.target.value.toUpperCase())}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs text-slate-700 font-mono font-bold focus:outline-none focus:border-emerald-400"
                />
              </div>
              <div>
                <label className="text-[9px] text-slate-400 block mb-1 font-bold">用户昵称</label>
                <input
                  type="text"
                  placeholder="例如：张三"
                  value={singleName}
                  onChange={(e) => setSingleName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs text-slate-700 font-bold focus:outline-none focus:border-emerald-400"
                />
              </div>
              <div>
                <label className="text-[9px] text-slate-400 block mb-1 font-bold">初始积分</label>
                <input
                  type="text"
                  value={singlePoints}
                  onChange={(e) => setSinglePoints(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs text-slate-700 font-bold focus:outline-none focus:border-emerald-400"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={handleCreateSingleUser}
                  disabled={isWorking}
                  className="w-full bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold py-2 rounded-xl transition cursor-pointer"
                >
                  {isWorking ? '创建中...' : '创建账号'}
                </button>
              </div>
            </div>
          </div>

          {/* 批量创建账号 */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 space-y-4 shadow-2xs">
            <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5 font-display border-b border-slate-100 pb-2">
              <Users className="w-5 h-5 text-rose-500" />
              批量创建账号
            </h4>
            <p className="text-[10.5px] text-slate-450 leading-relaxed font-bold">
              支持按换行录入多个昵称，默认分配 10,000 积分、默认 PIN「1234」。
            </p>

            <div className="space-y-3 pt-1">
              <div>
                <label className="text-[9px] text-slate-400 block mb-1 font-bold">选择群组</label>
                <select
                  value={provisionRoom}
                  onChange={(e) => setProvisionRoom(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs text-slate-700 w-full font-bold focus:outline-none"
                >
                  <option value="room-1">兄弟观赛竞猜团 (brothers)</option>
                  <option value="room-2">狂热球迷俱乐部 (fans)</option>
                </select>
              </div>

              <div>
                <label className="text-[9px] text-slate-400 block mb-1 font-bold">粘贴昵称列表 (换行分割)</label>
                <textarea
                  rows={3}
                  placeholder={`阿强大哥\n老王粉丝\n冷门收割豪`}
                  value={pasteNames}
                  onChange={(e) => setPasteNames(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs text-slate-800 focus:outline-none focus:bg-white transition"
                />
              </div>

              <button
                onClick={handleBulkProvision}
                disabled={isWorking}
                className="w-full bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold py-3 rounded-xl transition cursor-pointer"
              >
                {isWorking ? '预置导入中...' : '批量创建账号'}
              </button>

              {userMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 rounded-xl leading-relaxed font-bold">
                  {userMsg}
                </div>
              )}
            </div>
          </div>

          {/* 用户列表 */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 space-y-4 shadow-2xs">
            <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5 font-display border-b border-slate-100 pb-2">
              <Coins className="w-5 h-5 text-rose-500" />
              现存账号管理
            </h4>

            {/* 调账弹窗 */}
            {adjustTargetUser && (
              <div className="bg-gradient-to-tr from-rose-50/25 via-white to-white p-4 border border-rose-200 rounded-2xl space-y-3 shadow-2xs">
                <p className="text-xs font-bold text-rose-600">
                  调整用户 「{adjustTargetUser.displayName}」 积分
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[9px] text-slate-400 block font-bold">积分调幅 (负数扣减)</label>
                    <input
                      type="text"
                      value={adjustAmount}
                      onChange={(e) => setAdjustAmount(e.target.value)}
                      className="bg-slate-50 px-2 py-1.5 border border-slate-200 rounded-lg text-xs font-mono text-slate-800 w-full font-bold focus:outline-none focus:bg-white focus:border-rose-450"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] text-slate-400 block font-bold">备注</label>
                    <input
                      type="text"
                      value={adjustReason}
                      onChange={(e) => setAdjustReason(e.target.value)}
                      className="bg-slate-50 px-2 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-800 w-full font-bold focus:outline-none focus:bg-white"
                    />
                  </div>
                </div>
                <div className="flex justify-end space-x-2 pt-1">
                  <button
                    onClick={() => setAdjustTargetUser(null)}
                    className="px-2.5 py-1 text-slate-400 text-[10px] font-bold"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleAdjustFunds}
                    className="px-3.5 py-1.5 bg-rose-500 hover:bg-rose-600 text-white text-[10px] rounded-lg font-bold cursor-pointer transition"
                  >
                    确认调整
                  </button>
                </div>
              </div>
            )}

            {/* 头像上传弹窗 */}
            {avatarUploadUserId && (
              <div className="bg-gradient-to-tr from-emerald-50/25 via-white to-white p-4 border border-emerald-200 rounded-2xl space-y-3 shadow-2xs">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-emerald-600">上传头像</p>
                  <button
                    onClick={() => { setAvatarUploadUserId(null); setAvatarPreview(''); }}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleAvatarFileChange(e, avatarUploadUserId)}
                  className="w-full text-xs"
                />
                {avatarPreview && (
                  <div className="flex justify-center">
                    <img src={avatarPreview} alt="预览" className="w-20 h-20 rounded-full object-cover border-2 border-emerald-200" />
                  </div>
                )}
              </div>
            )}

            {/* 删除确认弹窗 - 模态 */}
            {deleteConfirmUserId && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setDeleteConfirmUserId(null)}>
                <div className="w-[90vw] max-w-sm rounded-3xl border border-red-200 bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                  <h4 className="text-sm font-black text-red-600">确认删除</h4>
                  <p className="mt-2 text-xs text-slate-700 font-bold">
                    确认删除用户「{users.find(u => u.id === deleteConfirmUserId)?.displayName}」？
                  </p>
                  <p className="mt-1 text-[10px] text-slate-500">
                    删除后将同时删除该用户的所有数据（钱包、预测记录、交易记录），此操作不可撤销。
                  </p>
                  <div className="mt-4 flex justify-end space-x-3">
                    <button
                      onClick={() => setDeleteConfirmUserId(null)}
                      className="px-4 py-2 text-slate-500 text-xs font-bold rounded-xl border border-slate-200 hover:bg-slate-50 transition cursor-pointer"
                    >
                      取消
                    </button>
                    <button
                      onClick={() => handleDeleteUser(deleteConfirmUserId)}
                      disabled={isWorking}
                      className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-xs rounded-xl font-bold cursor-pointer transition disabled:opacity-50"
                    >
                      {isWorking ? '删除中...' : '确认删除'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="max-h-[400px] overflow-y-auto divide-y divide-slate-100 pr-1">
              {users.map((u) => (
                <div key={u.id} className="flex justify-between items-center py-3 text-xs text-left">
                  <div className="flex items-center gap-3">
                    {/* 头像 */}
                    <div className="relative">
                      {u.avatarUrl && u.avatarUrl.startsWith('data:image/') ? (
                        <img src={u.avatarUrl} alt={u.displayName} className="w-10 h-10 rounded-full object-cover border border-slate-200" />
                      ) : u.avatarUrl && u.avatarUrl.length <= 2 ? (
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-lg border border-slate-200">
                          {u.avatarUrl}
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-xs text-slate-400 border border-slate-200">
                          {u.displayName?.charAt(0) || '?'}
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="font-extrabold text-slate-800">
                        {u.displayName}{' '}
                        <span className="text-[9.5px] text-slate-400 font-mono font-bold bg-slate-50 px-1 py-0.5 rounded border border-slate-150">
                          {u.loginCode}
                        </span>
                      </p>
                      <p className="text-[9px] text-slate-400 font-bold mt-1">
                        群组: {u.groupName || '未分组'} | 猜单: {u.betsCount} 场
                      </p>
                      {u.cards && Object.keys(u.cards).length > 0 && (
                        <p className="text-[9px] text-amber-600 font-bold mt-0.5">
                          🃏 {(u.cards.NO_LOSS || 0) + (u.cards.DOUBLE || 0) + (u.cards.REGRET || 0) + (u.cards.FLOOR || 0)} 张卡牌
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 font-mono text-right">
                    <div className="text-right">
                      <span className="text-emerald-600 font-black block">{u.balance?.toLocaleString()} PTS</span>
                      <span className="text-[9px] text-slate-400 block font-bold">Wallet</span>
                    </div>
                    <button
                      onClick={() => setAvatarUploadUserId(u.id)}
                      className="text-[10px] bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-150 px-2 py-1.5 rounded-lg font-bold cursor-pointer transition"
                      title="上传头像"
                    >
                      <Upload className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => {
                        setAdjustTargetUser(u);
                        setAdjustAmount('1000');
                        setAdjustReason('群友调增奖励');
                      }}
                      className="text-[10px] bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-150 px-2 py-1.5 rounded-lg font-bold cursor-pointer transition"
                    >
                      调账
                    </button>
                    <button
                      onClick={() => setDeleteConfirmUserId(u.id)}
                      className="text-[10px] bg-red-50 hover:bg-red-100 text-red-600 border border-red-150 px-2 py-1.5 rounded-lg font-bold cursor-pointer transition"
                      title="删除账号"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* 卡牌管理工具栏 */}
            <div className="mt-3 flex items-center justify-between rounded-2xl border border-amber-100 bg-amber-50/50 p-3">
              <div>
                <p className="text-xs font-bold text-amber-800">🃏 道具卡全局管理</p>
                <p className="text-[10px] text-amber-600">给所有用户补齐初始卡牌，让大家都玩起来</p>
              </div>
              <button
                onClick={handleBootstrapCards}
                disabled={isWorking}
                className="text-[10px] bg-amber-500 hover:bg-amber-600 text-white px-3 py-1.5 rounded-lg font-bold cursor-pointer transition disabled:opacity-50"
              >
                一键补卡
              </button>
            </div>

            {/* 卡牌使用统计 */}
            {cardStats && (
              <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50/50 p-3">
                <p className="text-xs font-black text-slate-800 mb-2">📊 卡牌使用统计</p>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: 'NO_LOSS', label: '免亏卡', icon: '🛡️' },
                    { id: 'DOUBLE', label: '双倍卡', icon: '⚡' },
                    { id: 'REGRET', label: '反悔卡', icon: '↩️' },
                    { id: 'FLOOR', label: '保底卡', icon: '🛟' },
                  ].map((c) => (
                    <div key={c.id} className="rounded-xl bg-white p-2 text-center">
                      <div className="text-base">{c.icon}</div>
                      <div className="text-[10px] font-bold text-slate-500">{c.label}</div>
                      <div className="text-[10px] text-slate-700 mt-0.5">库存 <span className="font-black text-emerald-600">{cardStats.totalStock?.[c.id] || 0}</span></div>
                      <div className="text-[10px] text-slate-700">已用 <span className="font-black text-amber-600">{cardStats.usedCount?.[c.id] || 0}</span></div>
                    </div>
                  ))}
                </div>
                {cardStats.recentUses && cardStats.recentUses.length > 0 && (
                  <div className="mt-2 max-h-32 overflow-y-auto rounded-lg bg-white p-2 text-[10px]">
                    {cardStats.recentUses.slice(0, 8).map((use: Record<string, unknown>, idx: number) => (
                      <div key={idx} className="flex justify-between items-center py-1 border-b border-slate-50 last:border-0">
                        <span>
                          <span className="font-black text-amber-700">{use.userName}</span>
                          <span className="text-slate-400"> 使用 </span>
                          <span className="font-mono text-slate-700">{use.cardId}</span>
                        </span>
                        <span className="text-slate-400 text-[9px]">{use.status}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SYNCLOGS TAB */}
      {activeTab === 'logs' && (
        <div className="bg-white p-5 rounded-3xl border border-slate-200 space-y-4 shadow-2xs">
          <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5 font-display border-b border-slate-105 pb-2">
            <Database className="w-5 h-5 text-rose-500" />
            第三方 API 同步及 Gemini 调用明细 (技术监控)
          </h4>

          {integrationStatus && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {Object.entries(integrationStatus.providers || {}).map(([key, value]: [string, any]) => (
                  <div key={key} className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-slate-900">{key}</span>
                      <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${value.configured ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                        {value.configured ? 'Configured' : 'Missing'}
                      </span>
                    </div>
                    <div className="mt-2 text-slate-500">Env: {value.env}</div>
                    {value.model && <div className="mt-1 text-slate-500">Model: {value.model}</div>}
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={runIntegrationTestSync}
                  disabled={isWorking}
                  className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-2.5 text-xs font-black text-white transition hover:bg-slate-800 disabled:opacity-60"
                >
                  <Play className="h-3.5 w-3.5" />
                  运行同步校验
                </button>
                <button
                  onClick={loadAdminData}
                  disabled={isWorking}
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  刷新状态
                </button>
              </div>

              {lastTestSyncResult && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-700">
                  <div className="font-black text-slate-900">最近一次同步校验</div>
                  <div className="mt-2">样本日期: {lastTestSyncResult.sampleDate}</div>
                  <div className="mt-1">赛程状态: {lastTestSyncResult.fixtures?.status}</div>
                  <div className="mt-1">赛程结果: {lastTestSyncResult.fixtures?.responseSummary}</div>
                  <div className="mt-3 space-y-2">
                    {(lastTestSyncResult.odds || []).map((item: Record<string, unknown>) => (
                      <div key={item.matchId} className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                        <div className="font-bold text-slate-900">
                          {item.homeTeam} vs {item.awayTeam}
                        </div>
                        <div className="mt-1 text-slate-500">
                          {item.source} · {item.syncStatus} · {item.synced ? 'Synced' : 'Not synced'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {syncLogs.length === 0 ? (
            <p className="text-xs text-slate-400 py-8 font-bold text-center">暂无日志调试包。</p>
          ) : (
            <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
              {syncLogs.map((l) => (
                <div key={l.id} className="p-3.5 bg-slate-50 border border-slate-150 rounded-2xl text-[10px] space-y-1.5 text-left transition hover:border-slate-300">
                  <div className="flex justify-between font-mono font-bold">
                    <span className="text-rose-600 font-black">{l.source} • {l.action}</span>
                    <span className="text-slate-400">{new Date(l.createdAt).toLocaleString()}</span>
                  </div>
                  <p className="text-slate-700 font-mono bg-slate-100/60 p-2 rounded-lg border border-slate-200/40">{l.requestSummary}</p>
                  <p className="text-slate-500 font-semibold">{l.responseSummary}</p>
                  {l.status === 'FAILED' && (
                    <div className="p-2 bg-rose-50 text-rose-700 font-bold border border-rose-150 rounded-xl leading-relaxed">
                      同步程序抓获错误: {l.errorMessage}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* PREDICTIONS ADMIN TAB */}
      {activeTab === 'predictions' && (
        <div className="bg-white p-5 rounded-3xl border border-slate-200 space-y-4 shadow-2xs">
          <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5 border-b border-slate-100 pb-2">
            <FileText className="w-5 h-5 text-rose-500" />
            竞猜记录查询
            <span className="ml-auto text-[10px] font-bold text-slate-400">共 {predTotal} 条</span>
          </h4>

          <div className="flex flex-wrap gap-2">
            <select
              value={predUserId}
              onChange={(e) => setPredUserId(e.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700"
            >
              <option value="">全部用户</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.displayName} ({u.loginCode})</option>
              ))}
            </select>
            <select
              value={predMatchId}
              onChange={(e) => setPredMatchId(e.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700"
            >
              <option value="">全部比赛</option>
              {matches.map((m) => (
                <option key={m.id} value={m.id}>{m.homeTeam?.nameZh || '?'} vs {m.awayTeam?.nameZh || '?'}</option>
              ))}
            </select>
            <button
              onClick={() => loadPredictions(1)}
              className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-black text-white hover:bg-rose-700 transition"
            >
              查询
            </button>
          </div>

          {predictions.length === 0 ? (
            <p className="text-xs text-slate-400 py-8 font-bold text-center">暂无竞猜记录</p>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {predictions.map((p) => (
                <div key={p.id} className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-slate-900">{p.userName}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${
                      p.status === 'WON' ? 'bg-emerald-100 text-emerald-700' : p.status === 'LOST' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-500'
                    }`}>{p.status}</span>
                  </div>
                  <div className="mt-1 text-slate-600">{p.matchLabel}</div>
                  <div className="mt-1 flex items-center gap-3 text-[10px] text-slate-500">
                    <span>{p.optionLabel}</span>
                    <span>赔率 {p.oddsDecimal}</span>
                    <span>投注 {p.stakePoints}</span>
                    {p.potentialReturn && <span>可赢 {p.potentialReturn}</span>}
                    {p.usedCard && <span className="text-violet-600">道具: {p.usedCard}</span>}
                  </div>
                  <div className="mt-1 text-[9px] text-slate-400">{p.placedAt}</div>
                </div>
              ))}
            </div>
          )}

          {predTotal > 20 && (
            <div className="flex items-center justify-center gap-2 text-xs">
              <button
                onClick={() => loadPredictions(predPage - 1)}
                disabled={predPage <= 1}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold disabled:opacity-40"
              >
                上一页
              </button>
              <span className="text-slate-500">第 {predPage} 页</span>
              <button
                onClick={() => loadPredictions(predPage + 1)}
                disabled={predPage * 20 >= predTotal}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold disabled:opacity-40"
              >
                下一页
              </button>
            </div>
          )}
        </div>
      )}

      {/* TRANSACTIONS ADMIN TAB */}
      {activeTab === 'transactions' && (
        <div className="bg-white p-5 rounded-3xl border border-slate-200 space-y-4 shadow-2xs">
          <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5 border-b border-slate-100 pb-2">
            <Coins className="w-5 h-5 text-rose-500" />
            积分流水查看
            <span className="ml-auto text-[10px] font-bold text-slate-400">共 {txTotal} 条</span>
          </h4>

          <div className="flex flex-wrap gap-2">
            <select
              value={txUserId}
              onChange={(e) => setTxUserId(e.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700"
            >
              <option value="">全部用户</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.displayName} ({u.loginCode})</option>
              ))}
            </select>
            <select
              value={txType}
              onChange={(e) => setTxType(e.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700"
            >
              <option value="">全部类型</option>
              <option value="INITIAL_GRANT">初始发放</option>
              <option value="BET_PLACED">下注扣除</option>
              <option value="BET_WON">中奖收入</option>
              <option value="BET_LOST">下注亏损</option>
              <option value="ADMIN_ADJUST">管理员调整</option>
              <option value="CARD_EFFECT">道具效果</option>
            </select>
            <button
              onClick={() => loadTransactions(1)}
              className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-black text-white hover:bg-rose-700 transition"
            >
              查询
            </button>
          </div>

          {transactions.length === 0 ? (
            <p className="text-xs text-slate-400 py-8 font-bold text-center">暂无积分流水</p>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {transactions.map((t) => (
                <div key={t.id} className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-slate-900">{t.userName}</span>
                    <span className={`font-black ${t.amount > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {t.amount > 0 ? '+' : ''}{t.amount}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-3 text-[10px] text-slate-500">
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 font-bold">{t.type}</span>
                    <span>余额: {t.balanceBefore} → {t.balanceAfter}</span>
                  </div>
                  {t.note && <div className="mt-1 text-[10px] text-slate-400">{t.note}</div>}
                  <div className="mt-1 text-[9px] text-slate-400">{t.createdAt}</div>
                </div>
              ))}
            </div>
          )}

          {txTotal > 20 && (
            <div className="flex items-center justify-center gap-2 text-xs">
              <button
                onClick={() => loadTransactions(txPage - 1)}
                disabled={txPage <= 1}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold disabled:opacity-40"
              >
                上一页
              </button>
              <span className="text-slate-500">第 {txPage} 页</span>
              <button
                onClick={() => loadTransactions(txPage + 1)}
                disabled={txPage * 20 >= txTotal}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold disabled:opacity-40"
              >
                下一页
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
