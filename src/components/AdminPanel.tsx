/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Settings, Shield, Users, Trophy, Play, CheckCircle, RefreshCw, BarChart3, Database, Key, Coins, HelpCircle, FileText, AlertCircle, Sparkles } from 'lucide-react';
import { apiRequest } from '../utils/api';
import { Match, User, SyncLog } from '../types';

interface AdminPanelProps {
  onBackToApp: () => void;
}

export default function AdminPanel({ onBackToApp }: AdminPanelProps) {
  const [password, setPassword] = useState('');
  const [isAuthed, setIsAuthed] = useState(false);
  const [activeTab, setActiveTab] = useState<'users' | 'matches' | 'ai' | 'logs'>('matches');
  const [errorStr, setErrorStr] = useState('');

  // Admin states
  const [users, setUsers] = useState<any[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);
  const [integrationStatus, setIntegrationStatus] = useState<any | null>(null);
  const [lastTestSyncResult, setLastTestSyncResult] = useState<any | null>(null);

  // User provisioning helpers
  const [pasteNames, setPasteNames] = useState('');
  const [provisionRoom, setProvisionRoom] = useState('room-1');
  const [userMsg, setUserMsg] = useState('');

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

  useEffect(() => {
    const savedToken = localStorage.getItem('wc_admin_token');
    if (savedToken) {
      setIsAuthed(true);
      loadAdminData();
    }
  }, [isAuthed]);

  const loadAdminData = async () => {
    try {
      const uData = await apiRequest('/api/admin/users');
      setUsers(uData);

      const mData = await apiRequest('/api/matches');
      setMatches(mData);

      const logsData = await apiRequest('/api/admin/sync-logs');
      setSyncLogs(logsData);

      const statusData = await apiRequest('/api/admin/integrations/status');
      setIntegrationStatus(statusData);
    } catch (e: any) {
      console.error(e);
      setErrorStr('未取得授权或网络读取错误，请重新登录。');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorStr('');
    try {
      const res = await apiRequest('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'admin', password })
      });
      if (res.success) {
        localStorage.setItem('wc_admin_token', res.token);
        setIsAuthed(true);
        loadAdminData();
      }
    } catch (err: any) {
      setErrorStr(err.message || '管理员密钥错误，请联系技术人员。');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('wc_admin_token');
    setIsAuthed(false);
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
    } catch (e: any) {
      setUserMsg(`❌ 导入程序出错: ${e.message}`);
    } finally {
      setIsWorking(false);
    }
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
      alert('调整成功');
    } catch (e: any) {
      alert(`调整拨款出错: ${e.message}`);
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

      alert('比赛成绩与即时赔率指数已一并保存修改！');
      setSelectedMatch(null);
      await loadAdminData();
    } catch (e: any) {
      alert(`更新赛果出错: ${e.message}`);
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
    } catch (e: any) {
      setSettleStatusMsg(`❌ 结算打款挂账出错: ${e.message}`);
    } finally {
      setIsWorking(false);
    }
  };

  const syncFixturesAPI = async () => {
    setIsWorking(true);
    try {
      await apiRequest('/api/admin/sync/today', { method: 'POST' });
      alert('已模拟拉取 API-Football 重新构建本地 World Cup 静态赛程与动态缓存。');
      await loadAdminData();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setIsWorking(false);
    }
  };

  const runIntegrationTestSync = async () => {
    setIsWorking(true);
    try {
      const result = await apiRequest('/api/admin/integrations/test-sync', { method: 'POST' });
      setLastTestSyncResult(result);
      await loadAdminData();
    } catch (e: any) {
      alert(e.message || '鍚屾楠岃瘉澶辫触');
    } finally {
      setIsWorking(false);
    }
  };

  const syncSelectedMatch = async () => {
    if (!selectedMatch) return;
    setIsWorking(true);
    try {
      await apiRequest(`/api/admin/sync/matches/${selectedMatch.id}`, { method: 'POST' });
      alert('已重新同步这场比赛。');
      await loadAdminData();
    } catch (e: any) {
      alert(e.message);
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
          出于积分操作及赛程模拟安全考虑，管理模块已被安全加密拦截。请输入您部署或指定的管理密钥以读取大权。
        </p>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block mb-1.5">
              授权访问密钥 (ADMIN PIN)
            </label>
            <input
              type="password"
              placeholder="请输入管理员私有密钥..."
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
      <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200/80 shadow-2xs overflow-x-auto">
        <button
          onClick={() => setActiveTab('matches')}
          className={`flex-1 py-3 text-center text-xs font-bold rounded-xl transition shrink-0 px-3 cursor-pointer ${
            activeTab === 'matches' ? 'bg-white text-rose-600 font-extrabold shadow-sm' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          🏟️ 赛程结果和一键结算
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`flex-1 py-3 text-center text-xs font-bold rounded-xl transition shrink-0 px-3 cursor-pointer ${
            activeTab === 'users' ? 'bg-white text-rose-600 font-extrabold shadow-sm' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          		&#120140; 人员预置与调拨款
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`flex-1 py-3 text-center text-xs font-bold rounded-xl transition shrink-0 px-3 cursor-pointer ${
            activeTab === 'logs' ? 'bg-white text-rose-600 font-extrabold shadow-sm' : 'text-slate-500 hover:text-slate-850'
          }`}
        >
          📊 API 同步调试账单
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
      {activeTab === 'users' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* provision form */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 space-y-4 shadow-2xs">
            <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5 font-display border-b border-slate-100 pb-2">
              <Users className="w-5 h-5 text-rose-500" />
              世界杯圈：批量人员账号预置
            </h4>
            <p className="text-[10.5px] text-slate-450 leading-relaxed font-bold">
              支持群主在后台以硬编码或纯文本预创建好友身份。支持在下方文本框中按换行录入吹牛的好友，默认分配10,000底注娱乐积分、默认PIN「1234」、提供专属自研WC代码。
            </p>

            <div className="space-y-3 pt-1">
              <div>
                <label className="text-[9px] text-slate-400 block mb-1 font-bold">选择宿主群组</label>
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
                <label className="text-[9px] text-slate-400 block mb-1 font-bold">粘贴昵称花名列表 (换行分割)</label>
                <textarea
                  rows={4}
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
                {isWorking ? '预置导入中...' : '确认预置并自动化派发账号'}
              </button>

              {userMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 rounded-xl leading-relaxed font-bold">
                  {userMsg}
                </div>
              )}
            </div>
          </div>

          {/* Users lists & Wallets console */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 space-y-4 shadow-2xs">
            <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5 font-display border-b border-slate-100 pb-2">
              <Coins className="w-5 h-5 text-rose-500" />
              现存群友账号目录(调账及密钥重置)
            </h4>

            {/* Adjustment Pop Form */}
            {adjustTargetUser && (
              <div className="bg-gradient-to-tr from-rose-50/25 via-white to-white p-4 border border-rose-200 rounded-2xl space-y-3 shadow-2xs">
                <p className="text-xs font-bold text-rose-600">
                  划拨调拨：群友 「{adjustTargetUser.displayName}」 娱乐积分
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[9px] text-slate-400 block font-bold">积分调幅 (负数代表扣减)</label>
                    <input
                      type="text"
                      value={adjustAmount}
                      onChange={(e) => setAdjustAmount(e.target.value)}
                      className="bg-slate-50 px-2 py-1.5 border border-slate-200 rounded-lg text-xs font-mono text-slate-800 w-full font-bold focus:outline-none focus:bg-white focus:border-rose-450"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] text-slate-400 block font-bold">调拨事因备注</label>
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
                    确认划拨
                  </button>
                </div>
              </div>
            )}

            <div className="max-h-[340px] overflow-y-auto divide-y divide-slate-100 pr-1">
              {users.map((u) => (
                <div key={u.id} className="flex justify-between items-center py-3 text-xs text-left">
                  <div>
                    <p className="font-extrabold text-slate-800">
                      {u.displayName}{' '}
                      <span className="text-[9.5px] text-slate-405 text-slate-400 font-mono font-bold bg-slate-50 px-1 py-0.5 rounded border border-slate-150">
                        {u.loginCode}
                      </span>
                    </p>
                    <p className="text-[9px] text-slate-400 font-bold mt-1">
                      宿群房: {u.groupName || '宿主观赛群'} | 累计猜单: {u.betsCount} 场次
                    </p>
                  </div>

                  <div className="flex items-center space-x-2.5 font-mono text-right">
                    <div>
                      <span className="text-emerald-600 font-black block">{u.balance?.toLocaleString()} PTS</span>
                      <span className="text-[9px] text-slate-400 block font-bold">Wallet</span>
                    </div>
                    <button
                      onClick={() => {
                        setAdjustTargetUser(u);
                        setAdjustAmount('1000');
                        setAdjustReason('群友调增奖励');
                      }}
                      className="text-[10px] bg-rose-50 hover:bg-rose-100 text-rose-605 text-rose-600 border border-rose-150 px-2 py-1.5 rounded-lg font-bold cursor-pointer transition"
                    >
                      调账
                    </button>
                  </div>
                </div>
              ))}
            </div>
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
                    {(lastTestSyncResult.odds || []).map((item: any) => (
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
    </div>
  );
}
