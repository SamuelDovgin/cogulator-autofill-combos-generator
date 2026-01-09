import XCircleIcon from '../../assets/icons/x-circle.svg?react';
import { Buttoon } from './Buttoon';

interface Props {
  onClose: () => void;
}

const changelog = [
  {
    date: 'May 25th, 2024',
    notes: ['Updated gag values for the Under New Management update!'],
  },
  {
    date: 'January 2nd, 2025',
    notes: [
      'Removed v2.0 cog functionality since it is no longer in the game. Thanks Shane!',
    ],
  },
  {
    date: 'July 22nd, 2025',
    notes: [
      'Upgraded packages behind the scenes.',
      'Show mathematical symbols in the cog damage table on large screens.',
      'Added a new help modal for the cog damage table.',
      'Rearranged some UI elements for better usability.',
      'Minor improvements to make the app more responsive.',
    ],
  },
  {
    date: 'July 23rd, 2025',
    notes: [
      "Fixed a bug where modals wouldn't show on Firefox. Thanks Nathan!",
    ],
  },
];

export default function HelpModal({ onClose }: Props) {
  return (
    <div className="fixed inset-0 z-20 flex h-full w-full items-center justify-center bg-black/60">
      <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl border border-gray-200 relative">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-3xl font-extrabold text-gray-900">About</h2>
          <Buttoon
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            onClick={onClose}
            aria-label="Close help modal"
          >
            <XCircleIcon className="w-7 h-7" />
          </Buttoon>
        </div>
        <div className="mt-2 space-y-5 text-gray-800">
          <p>
            <span className="font-semibold text-blue-700">Big Brain Town</span>{' '}
            is a calculator for Toontown Rewritten designed to help you figure
            out the exact damage you need to do to defeat each cog level. All
            rules and formulas follow the rules established in
            <a
              className="font-bold text-blue-600 underline ml-1"
              href="https://www.toontownrewritten.com"
              rel="noreferrer"
              target="_blank"
            >
              Toontown Rewritten
            </a>
            .
          </p>
          <p>
            This calculator is a work in progress. If you find any bugs or have
            any suggestions, please send me an email at
            <a
              className="font-bold text-blue-600 underline ml-1"
              href="mailto:big@brain.town"
            >
              big@brain.town
            </a>
            .
          </p>
          <p>
            <span className="bg-yellow-100 px-2 py-1 rounded text-yellow-800 font-medium">
              Note:
            </span>{' '}
            This tool is <strong>not</strong> affiliated with Disney or Toontown
            Rewritten.
          </p>
          <h2 className="text-2xl font-bold py-2 border-b border-gray-200 mb-2">
            Changelog
          </h2>
          <div
            className="space-y-4 max-h-64 overflow-y-auto pr-2"
            style={{ scrollbarGutter: 'stable' }}
          >
            {changelog
              .slice()
              .reverse()
              .map(({ date, notes }) => (
                <div
                  aria-label="Changelog entry"
                  key={date}
                  className="rounded-xl border border-gray-200 bg-gradient-to-br from-gray-50 to-gray-100 p-4 shadow"
                >
                  <h4 className="font-semibold text-lg text-blue-700 mb-2">
                    {date}
                  </h4>
                  <ul
                    aria-label="Changelog notes"
                    className="list-disc pl-6 text-gray-700 space-y-1"
                  >
                    {notes.map((bullet) => (
                      <li key={bullet}>{bullet}</li>
                    ))}
                  </ul>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}
