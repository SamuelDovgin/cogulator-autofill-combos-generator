import { useEffect, useMemo, useState } from 'react';

import XCircleIcon from '../../assets/icons/x-circle.svg?react';
import { Buttoon } from './Buttoon';

type Props = {
  onClose: () => void;
  /** Returns the full export JSON (Option B) */
  getFullJson: () => string;
  /** Returns a weights-only JSON */
  getWeightsJson: () => string;
  /** Apply pasted JSON */
  onApplyJson: (raw: string) => { ok: boolean; message: string };
  /** Reset everything back to defaults */
  onResetDefaults: () => void;
};

export default function SettingsJsonModal({
  onClose,
  getFullJson,
  getWeightsJson,
  onApplyJson,
  onResetDefaults,
}: Props) {
  const initial = useMemo(() => getFullJson(), [getFullJson]);
  const [text, setText] = useState(initial);
  const [status, setStatus] = useState<string>('');

  useEffect(() => {
    setText(getFullJson());
    setStatus('');
  }, [getFullJson]);

  const copyToClipboard = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setStatus('Copied to clipboard.');
    } catch {
      // Fallback: leave the JSON in the textbox so the user can copy manually
      setStatus('Could not auto-copy. Select the text and copy manually.');
      setText(value);
    }
  };

  return (
    <div className="fixed inset-0 z-30 flex h-full w-full items-center justify-center bg-black/60">
      <div className="w-full max-w-3xl rounded-2xl bg-white p-5 shadow-2xl border border-gray-200 relative">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-2xl font-extrabold text-gray-900">Settings JSON</h2>
          <Buttoon
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            onClick={onClose}
            aria-label="Close settings modal"
          >
            <XCircleIcon className="w-7 h-7" />
          </Buttoon>
        </div>

        <div className="text-sm text-gray-700">
          Copy/paste your full app configuration. This includes: selected gags, cog level, exclusions, enabled tracks,
          toon restrictions, sort mode + weights, generation cap, and hide-overkill.
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => copyToClipboard(getWeightsJson())}
            className="rounded-md border border-gray-300 bg-gray-50 px-3 py-1.5 text-sm font-bold text-gray-900 hover:bg-gray-100"
          >
            Copy weights JSON
          </button>
          <button
            type="button"
            onClick={() => copyToClipboard(getFullJson())}
            className="rounded-md border border-gray-300 bg-gray-50 px-3 py-1.5 text-sm font-bold text-gray-900 hover:bg-gray-100"
          >
            Copy full settings JSON
          </button>
          <button
            type="button"
            onClick={() => {
              const res = onApplyJson(text);
              setStatus(res.message);
              if (res.ok) setText(getFullJson());
            }}
            className="rounded-md border border-blue-600 bg-blue-600 px-3 py-1.5 text-sm font-bold text-white hover:bg-blue-700"
          >
            Apply JSON
          </button>
          <button
            type="button"
            onClick={() => {
              onResetDefaults();
              setStatus('Reset to defaults.');
              setText(getFullJson());
            }}
            className="rounded-md border border-red-600 bg-red-600 px-3 py-1.5 text-sm font-bold text-white hover:bg-red-700"
          >
            Reset defaults
          </button>
        </div>

        {status && (
          <div className="mt-2 rounded-md bg-gray-100 px-3 py-2 text-sm text-gray-800">
            {status}
          </div>
        )}

        <div className="mt-3">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            spellCheck={false}
            className="h-[380px] w-full rounded-xl border border-gray-300 bg-white p-3 font-mono text-[12px] text-gray-900 shadow-inner"
          />
        </div>
      </div>
    </div>
  );
}
