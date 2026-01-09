import clsx from 'clsx';
import XCircleIcon from '../../assets/icons/x-circle.svg?react';
import { Buttoon } from './Buttoon';
import { CogDamageGauge } from './CogDamageGauge';

interface Props {
  onClose: () => void;
}
export default function CogDamageHelpModal({ onClose }: Props) {
  return (
    <div className="fixed inset-0 z-10 flex h-full w-full items-center justify-center bg-black/60">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-800">Help!</h2>
          <Buttoon
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            onClick={onClose}
            aria-label="Close"
          >
            <XCircleIcon className="w-6 h-6" />
          </Buttoon>
        </div>
        <div className="flex flex-col gap-6">
          <section>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">
              Cog Damage Table
            </h3>
            <div className="flex justify-center">
              <div className="rounded-xl border border-gray-500 bg-gray-400 p-4 shadow-lg w-56">
                <div className="flex flex-row justify-center rounded-lg">
                  <div
                    className={clsx(
                      'flex flex-col items-center font-cog text-base md:text-xl outline-double p-4',
                    )}
                  >
                    <div>
                      <span className="text-base md:text-lg font-bold text-gray-800">
                        Level
                      </span>
                    </div>
                    <div className="text-xs md:text-sm text-gray-800">
                      Remaining HP
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <p className="mt-4 text-gray-700 leading-relaxed">
              The cog damage table displays the total damage dealt to cogs by
              the selected gags. It shows the level of each cog and the
              remaining health after the damage is applied. If a cell is
              highlighted green, it means the cog is defeated. Red means the cog
              is still alive.
            </p>
          </section>
          <section>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">
              Cog Damage Gauge
            </h3>
            <div className="flex justify-center my-4">
              <div className="w-full max-w-xs rounded-xl border border-gray-200 bg-gray-400 p-4 shadow-md flex items-center justify-center overflow-hidden">
                <div className="w-full">
                  <CogDamageGauge totalDamage={25} selectedGags={[]} />
                </div>
              </div>
            </div>
            <p className="text-gray-700 leading-relaxed">
              The cog damage gauge displays the total damage dealt to cogs as a
              percentage fill bar. The bar fills up as you select gags, and it
              shows the total damage dealt to cogs. If you hover over a gag, it
              will show the hypothetical total damage that would be dealt if
              that gag were selected.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
