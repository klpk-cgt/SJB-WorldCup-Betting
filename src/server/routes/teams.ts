﻿﻿﻿﻿/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router, Request, Response } from 'express';
import { dbService } from '../../db/db_service';
import { THE_TEAMS } from '../../db/initial_data';
import { resolveTeamProfile } from '../../data/worldcup/teams';
import { serializeMatch, toLocalAvatarUrl } from '../helpers';

const router = Router();

function resolveTeamById(teamId: string) {
  return dbService.getTeams().find((team) => team.id === teamId) || THE_TEAMS.find((team) => team.id === teamId);
}

router.get('/api/teams', (_req: Request, res: Response) => {
  res.json(dbService.getTeams());
});

router.get('/api/teams/search', async (req: Request, res: Response) => {
  const db = dbService.getData();
  const { q } = req.query as { q?: string };

  if (!q || !q.trim()) {
    return res.json({ teams: [] });
  }

  const query = q.trim().toLowerCase();
  const teams = db.teams
    .filter(
      (team) =>
        (team.nameZh || '').toLowerCase().includes(query) ||
        (team.name || '').toLowerCase().includes(query),
    )
    .slice(0, 20);

  res.json({
    teams: teams.map((team) => ({
      id: team.id,
      name: team.name,
      nameZh: team.nameZh,
      flag: (team as any).flag ?? team.logoUrl ?? '',
    })),
  });
});

router.get('/api/teams/:id', (req: Request, res: Response) => {
  const team = resolveTeamById(req.params.id);
  if (!team) return res.status(404).json({ error: '未找到该球队。' });
  res.json(team);
});

router.get('/api/teams/:id/players', (req: Request, res: Response) => {
  const team = resolveTeamById(req.params.id);
  if (!team) return res.status(404).json({ error: '未找到该球队。' });

  const players = dbService
    .getPlayersByTeamId(req.params.id)
    .sort((a, b) => (b.marketValue || 0) - (a.marketValue || 0));

  res.json(players.map((p: any) => ({ ...p, avatarUrl: toLocalAvatarUrl(p.avatarUrl) })));
});

router.get('/api/teams/:id/history', (req: Request, res: Response) => {
  const team = resolveTeamById(req.params.id);
  if (!team) return res.status(404).json({ error: '未找到该球队。' });

  const history = dbService.getTeamHistoryByTeamId(req.params.id);
  res.json(history);
});

router.get('/api/teams/:id/detail', (req: Request, res: Response) => {
  const team = resolveTeamById(req.params.id);
  if (!team) return res.status(404).json({ error: '未找到该球队。' });

  const players = dbService
    .getPlayersByTeamId(req.params.id)
    .sort((a, b) => (b.marketValue || 0) - (a.marketValue || 0));
  const history = dbService.getTeamHistoryByTeamId(req.params.id);
  const matches = dbService
    .getMatches()
    .filter((match) => match.homeTeamId === req.params.id || match.awayTeamId === req.params.id)
    .map(serializeMatch);
  const staticProfile = resolveTeamProfile(team);

  res.json({
    team,
    players: (players || []).map((p: any) => ({ ...p, avatarUrl: toLocalAvatarUrl(p.avatarUrl) })),
    history: history || [],
    matches,
    staticProfile: staticProfile || null,
  });
});

export default router;
