/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router, Request, Response } from 'express';
import { dbService } from '../../db/db_service';

const router = Router();

router.get('/api/teams', (_req: Request, res: Response) => {
  res.json(dbService.getTeams());
});

router.get('/api/teams/:id', (req: Request, res: Response) => {
  const team = dbService.getTeams().find(t => t.id === req.params.id);
  if (!team) return res.status(404).json({ error: '未找到该球队。' });
  res.json(team);
});

router.get('/api/teams/:id/players', (req: Request, res: Response) => {
  const team = dbService.getTeams().find(t => t.id === req.params.id);
  if (!team) return res.status(404).json({ error: '未找到该球队。' });
  const players = dbService.getPlayersByTeamId(req.params.id).sort((a, b) => (b.marketValue || 0) - (a.marketValue || 0));
  res.json(players);
});

router.get('/api/teams/:id/history', (req: Request, res: Response) => {
  const team = dbService.getTeams().find(t => t.id === req.params.id);
  if (!team) return res.status(404).json({ error: '未找到该球队。' });
  const history = dbService.getTeamHistoryByTeamId(req.params.id);
  res.json(history);
});

router.get('/api/teams/:id/detail', (req: Request, res: Response) => {
  const team = dbService.getTeams().find(t => t.id === req.params.id);
  if (!team) return res.status(404).json({ error: '未找到该球队。' });
  const players = dbService.getPlayersByTeamId(req.params.id).sort((a, b) => (b.marketValue || 0) - (a.marketValue || 0));
  const history = dbService.getTeamHistoryByTeamId(req.params.id);
  res.json({ team, players, history });
});

export default router;
