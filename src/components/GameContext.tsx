/**
 * GameContext - 减少 Prop Drilling
 * 提供 user/wallet/onRefreshWallet 等公共数据
 */
import React, { createContext, useContext } from 'react';
import type { User, Wallet } from '../types';

interface GameContextValue {
  user: User | null;
  wallet: Wallet | null;
  onRefreshWallet: () => void;
}

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({
  children,
  value,
}: {
  children: React.ReactNode;
  value: GameContextValue;
}) {
  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGameContext(): GameContextValue {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGameContext must be used within GameProvider');
  return ctx;
}
