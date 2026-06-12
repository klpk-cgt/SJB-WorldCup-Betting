/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router, Request, Response } from 'express';
import { getCardDefinitions, getUserCardInventory } from '../prediction_card_service';
import { getAuthenticatedUser } from '../helpers';
import { runBusinessTransaction } from '../services/transaction_guard';
import { useRegretCard } from '../services/card_transaction_service';

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

router.post('/api/cards/use-regret', async (req: Request, res: Response) => {
  const user = getAuthenticatedUser(req);
  if (!user) return res.status(401).json({ error: '请先登录。' });

  const predictionId = String(req.body.predictionId || '');
  if (!predictionId) {
    return res.status(400).json({ error: '缺少 predictionId。' });
  }

  try {
    const result = await runBusinessTransaction('useRegretCard', () => {
      return useRegretCard({
        userId: user.id,
        predictionId,
      });
    });

    res.json({ success: true, message: result.message });
  } catch (error) {
    const message = error instanceof Error ? error.message : '撤销失败';
    const status = message.includes('不足') || message.includes('不存在') || message.includes('只能') || message.includes('已开始') ? 400 : 500;
    res.status(status).json({ error: message });
  }
});

export default router;
