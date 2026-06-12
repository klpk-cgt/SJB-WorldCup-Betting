/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router, Request, Response } from 'express';
import { dbService } from '../../db/db_service';
import {
  cancelPredictionByCard,
  getCardDefinitions,
  getUserCardInventory,
  userHasCard,
} from '../prediction_card_service';
import { getAuthenticatedUser } from '../helpers';

const router = Router();

router.get('/api/cards/definitions', (_req: Request, res: Response) => {
  res.json({ cards: getCardDefinitions() });
});

router.get('/api/cards/inventory', (req: Request, res: Response) => {
  const user = getAuthenticatedUser(req);
  if (!user) return res.status(401).json({ error: '请先登录。' });

  const inventory = getUserCardInventory(user.id);
  res.json({ ...inventory, definitions: getCardDefinitions() });
});

router.post('/api/cards/use-regret', (req: Request, res: Response) => {
  const user = getAuthenticatedUser(req);
  if (!user) return res.status(401).json({ error: '请先登录。' });

  const predictionId = String(req.body.predictionId || '');
  if (!predictionId) {
    return res.status(400).json({ error: '缺少 predictionId。' });
  }

  if (!userHasCard(user.id, 'REGRET')) {
    return res.status(400).json({ error: '反悔卡库存不足。' });
  }

  const db = dbService.getData();
  const prediction = db.predictions.find((item) => item.id === predictionId);
  if (!prediction) {
    return res.status(404).json({ error: '预测不存在。' });
  }
  if (prediction.userId !== user.id) {
    return res.status(403).json({ error: '只能撤销自己的预测。' });
  }
  if (prediction.status !== 'PENDING' && prediction.status !== 'LOCKED') {
    return res.status(400).json({ error: '只能撤销未结算的下注。' });
  }

  const match = db.matches.find((item) => item.id === prediction.matchId);
  if (match && new Date(match.startTimeUtc).getTime() <= Date.now()) {
    return res.status(400).json({ error: '比赛已开始，无法使用反悔卡。' });
  }

  const inventory = getUserCardInventory(user.id);
  inventory.cards.REGRET = Math.max(0, (inventory.cards.REGRET || 0) - 1);
  inventory.updatedAt = new Date().toISOString();
  prediction.usedCard = 'REGRET';

  const success = cancelPredictionByCard(prediction, '反悔卡：撤销下注，返还全部本金');
  if (!success) {
    return res.status(500).json({ error: '撤销下注失败。' });
  }

  res.json({ success: true, message: '反悔卡生效，已撤销下注并返还本金。' });
});

export default router;
