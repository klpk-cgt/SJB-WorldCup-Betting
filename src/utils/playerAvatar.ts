import { Player } from '../types';
import { PLAYER_AVATAR_MAP } from '../data/playerAvatars';

/**
 * 将外部头像 URL 转换为本地路径
 * - GitHub raw URL → /player-avatars/xxx.jpg（本地文件）
 * - ui-avatars.com URL → null（使用 SmartAvatar 首字母回退，避免外部网络依赖）
 */
export function toLocalAvatarUrl(url: string): string | null {
  if (!url) return null;
  // GitHub raw → 本地路径
  const ghMatch = url.match(/\/assets\/players\/([a-z0-9_-]+\.jpg)$/i);
  if (ghMatch) return `/player-avatars/${ghMatch[1]}`;
  // ui-avatars.com 等外部服务 → 不使用，直接回退首字母
  if (url.includes('ui-avatars.com')) return null;
  return url;
}

export function resolvePlayerAvatar(player: Player) {
  // 优先使用球员自带的 avatarUrl（转为本地路径）
  if (player.avatarUrl) return toLocalAvatarUrl(player.avatarUrl);
  // 然后使用映射表（teamId:name 格式，也转为本地路径）
  const key = `${player.teamId}:${player.name}`;
  const mapped = PLAYER_AVATAR_MAP[key];
  return mapped ? toLocalAvatarUrl(mapped) : null;
}
