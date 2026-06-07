import { Player } from '../types';
import { PLAYER_AVATAR_MAP } from '../data/playerAvatars';

export function resolvePlayerAvatar(player: Player) {
  // 优先使用球员自带的 avatarUrl
  if (player.avatarUrl) return player.avatarUrl;
  // 然后使用映射表（teamId:name 格式）
  const key = `${player.teamId}:${player.name}`;
  return PLAYER_AVATAR_MAP[key] || null;
}
