import { useState } from 'react';

import HelpIcon from '../../assets/icons/help-circle.svg?react';
import VolumeOffIcon from '../../assets/icons/volume-off.svg?react';
import VolumeOnIcon from '../../assets/icons/volume-on.svg?react';
import HelpModal from './HelpModal';

export function Header({
  soundEnabled,
  setSoundEnabled,
  onOpenSettings,
}: {
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  onOpenSettings: () => void;
}) {
  const [helpModalOpen, setHelpModalOpen] = useState(false);

  return (
    <>
      <header className="flex items-center gap-2 p-2 font-minnie text-xl tracking-[-0.09em] text-[#FEF200]! lg:text-6xl">
        {soundEnabled ? (
          <VolumeOnIcon
            className="ml-auto h-6 w-6 lg:h-8 lg:w-8 cursor-pointer"
            onClick={() => setSoundEnabled(false)}
          />
        ) : (
          <VolumeOffIcon
            className="ml-auto h-6 w-6 lg:h-8 lg:w-8 cursor-pointer"
            onClick={() => setSoundEnabled(true)}
          />
        )}

        <button
          type="button"
          onClick={onOpenSettings}
          className="rounded-md border border-yellow-300/70 bg-yellow-200/10 px-2 py-1 text-[12px] font-extrabold text-yellow-200 hover:bg-yellow-200/20 lg:text-base"
          title="Copy/paste Settings JSON"
        >
          JSON
        </button>

        <h1 className="text-center">Big Brain Town</h1>
        <HelpIcon
          className="h-6 w-6 lg:h-8 lg:w-8 cursor-pointer hover:opacity-50"
          onClick={() => setHelpModalOpen(true)}
        />
      </header>
      {helpModalOpen && <HelpModal onClose={() => setHelpModalOpen(false)} />}
    </>
  );
}
