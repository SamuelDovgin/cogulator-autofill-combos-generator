import VolumeOffIcon from '../../assets/icons/volume-off.svg?react';
import VolumeOnIcon from '../../assets/icons/volume-on.svg?react';
import { APP_NAME, APP_SHORT_NAME, APP_TAGLINE } from '../constants/site';
import { BrandMark } from './BrandMark';

export function Header({
  soundEnabled,
  setSoundEnabled,
  onOpenSettings,
}: {
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  onOpenSettings: () => void;
}) {
  return (
    <header className="border-b border-slate-800/80 bg-slate-950/60 backdrop-blur-sm">
      <div className="mx-auto flex w-full max-w-[96rem] flex-col gap-4 px-4 py-5 sm:px-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 items-start gap-3 sm:gap-4">
          <BrandMark className="h-16 shrink-0 sm:h-20 lg:h-24" />
          <div className="min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-[0.35em] text-cyan-300/75">
              {APP_SHORT_NAME}
            </div>
            <h1 className="mt-1 text-2xl font-semibold text-white sm:text-3xl lg:text-[2rem]">
              {APP_NAME}
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-300">{APP_TAGLINE}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 lg:mt-1">
          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="rounded-full border border-slate-700 bg-slate-900/70 p-2 text-slate-200 transition-colors hover:border-slate-500 hover:text-white"
            aria-label={soundEnabled ? 'Disable sound effects' : 'Enable sound effects'}
            title={soundEnabled ? 'Disable sound effects' : 'Enable sound effects'}
          >
            {soundEnabled ? (
              <VolumeOnIcon className="h-5 w-5" />
            ) : (
              <VolumeOffIcon className="h-5 w-5" />
            )}
          </button>

          <button
            type="button"
            onClick={onOpenSettings}
            className="rounded-md border border-cyan-400/40 bg-cyan-400/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100 transition-colors hover:bg-cyan-400/20"
            title="Copy or paste settings JSON"
          >
            Settings JSON
          </button>
        </div>
      </div>
    </header>
  );
}
