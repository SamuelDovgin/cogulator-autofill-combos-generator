import type { BattleState, Strategy } from './model';
import { solveBattle } from './solveBattle';

self.onmessage = ({
  data,
}: MessageEvent<{ state: BattleState; strategy: Strategy }>) => {
  const { state, strategy } = data;
  self.postMessage(solveBattle(state, strategy));
};
