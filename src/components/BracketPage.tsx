import React, { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { BracketState } from '../types';
import { apiRequest } from '../utils/api';
import { useWebSocket } from '../hooks/useWebSocket';
import BracketBoard from './BracketBoard';

export default function BracketPage({ onOpenMatch }: { onOpenMatch: (matchId?: string) => void }) {
  const [bracket, setBracket] = useState<BracketState | null>(null);
  const [loading, setLoading] = useState(true);

  const loadBracket = () => {
    apiRequest('/api/bracket')
      .then((data) => setBracket(data))
      .catch(() => setBracket(null))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadBracket();
  }, []);

  // 比赛结算或比分更新时自动刷新对阵图
  useWebSocket({
    enabled: true,
    onMatchSettled: () => loadBracket(),
    onScoreUpdate: () => loadBracket(),
  });

  if (loading) {
    return (
      <div className="space-y-4 rounded-[28px] border border-slate-200 bg-white py-20 text-center shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
        <div className="relative mx-auto flex h-12 w-12 items-center justify-center">
          <RefreshCw className="absolute h-8 w-8 animate-spin text-emerald-600" />
        </div>
        <p className="text-xs font-bold text-slate-500">正在加载淘汰赛对阵图...</p>
      </div>
    );
  }

  return <div className="pb-24"><BracketBoard bracket={bracket} onOpenMatch={onOpenMatch} /></div>;
}
