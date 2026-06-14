/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * 战报墙页面
 * 按时间倒序展示所有已结算比赛的赛后群战报
 */

import React, { useEffect, useState } from 'react';
import { FileText } from 'lucide-react';
import BattleReportCard, { type BattleReportData } from './BattleReportCard';
import { apiRequest } from '../utils/api';

interface BattleReportWallProps {
  onNavigate: (tab: string, matchId?: string, detailTab?: string) => void;
}

export default function BattleReportWall({ onNavigate }: BattleReportWallProps) {
  const [reports, setReports] = useState<BattleReportData[]>([]);
  const [loading, setLoading] = useState(true);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const fetchReports = async (reset = false) => {
    const currentOffset = reset ? 0 : offset;
    try {
      const data = await apiRequest(`/api/battle-reports?limit=10&offset=${currentOffset}`);
      const items: BattleReportData[] = data.items || [];
      if (reset) {
        setReports(items);
        setOffset(items.length);
      } else {
        setReports((prev) => [...prev, ...items]);
        setOffset((prev) => prev + items.length);
      }
      setHasMore(data.hasMore || false);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchReports(true);
  }, []);

  const handleLoadMore = () => {
    if (!hasMore || loading) return;
    fetchReports(false);
  };

  return (
    <div className="space-y-4 pb-8">
      {/* 标题栏 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-amber-500" />
          <h2 className="text-lg font-black text-slate-900">战报墙</h2>
        </div>
        {reports.length > 0 && (
          <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[10px] font-bold text-amber-700">
            {reports.length} 场
          </span>
        )}
      </div>

      {/* 加载中 */}
      {loading && reports.length === 0 && (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-amber-500" />
        </div>
      )}

      {/* 空状态 */}
      {!loading && reports.length === 0 && (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-5 py-16 text-center">
          <FileText className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-3 text-sm font-bold text-slate-400">暂无战报</p>
          <p className="mt-1 text-xs text-slate-400">比赛结算后将自动生成赛后群战报</p>
        </div>
      )}

      {/* 战报列表 */}
      {reports.length > 0 && (
        <div className="space-y-3">
          {reports.map((report) => (
            <BattleReportCard
              key={report.matchId}
              report={report}
              mode="full"
              onClick={(matchId) => onNavigate('match-detail', matchId, 'report')}
            />
          ))}
        </div>
      )}

      {/* 加载更多 */}
      {hasMore && reports.length > 0 && (
        <div className="flex justify-center pt-2">
          <button
            onClick={handleLoadMore}
            disabled={loading}
            className="rounded-2xl bg-amber-50 px-5 py-2.5 text-xs font-black text-amber-700 transition hover:bg-amber-100 disabled:opacity-50"
          >
            {loading ? '加载中...' : '加载更多'}
          </button>
        </div>
      )}
    </div>
  );
}
