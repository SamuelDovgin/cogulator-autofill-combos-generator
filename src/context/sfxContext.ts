import React from 'react';

interface SfxContextType {
  playHoverSfx: () => void;
  playClickSfx: () => void;
}

export const SfxContext = React.createContext<SfxContextType>({
  playHoverSfx: () => {},
  playClickSfx: () => {},
});

export function useSfx(): SfxContextType {
  return React.useContext(SfxContext);
}
