import { useContext } from 'react';

import { SfxContext } from '../context/sfxContext';

export function useSfx() {
  return useContext(SfxContext);
}
