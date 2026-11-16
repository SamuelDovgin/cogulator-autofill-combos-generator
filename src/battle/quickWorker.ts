import type { BattleState, Strategy } from './model';
import { solveQuickBattle, type QuickPlans } from './solveQuickBattle';

export interface QuickRequest {
  id: number;
  board: Omit<BattleState, 'toons'>;
  strategy: Strategy;
  allowLevel7: boolean;
}

export interface QuickResponse {
  id: number;
  plans: QuickPlans;
}

self.onmessage = ({ data }: MessageEvent<QuickRequest>) => {
  const { id, board, strategy, allowLevel7 } = data;
  self.postMessage({
    id,
    plans: solveQuickBattle(board, strategy, allowLevel7),
  } satisfies QuickResponse);
};
