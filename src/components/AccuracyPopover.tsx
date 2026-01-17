import React, { useState, useRef, useEffect } from 'react';
import clsx from 'clsx';

interface AccuracyPopoverProps {
  accuracy: number;
  explanation: string;
  className?: string;
}

interface ParsedExplanation {
  koProb: string;
  targetInfo: string;
  initialStatus: string;
  tracks: string;
  rules: string[];
  calculations: CalculationStep[];
  leafNodes: LeafNode[];
}

interface CalculationStep {
  track: string;
  formula: string;
  result: string;
  hitBranch: string;
  missBranch: string;
}

interface LeafNode {
  damage: string;
  hp: string;
  isKO: boolean;
  prob: string;
}

function parseExplanation(text: string): ParsedExplanation {
  const lines = text.split('\n');
  const result: ParsedExplanation = {
    koProb: '',
    targetInfo: '',
    initialStatus: '',
    tracks: '',
    rules: [],
    calculations: [],
    leafNodes: [],
  };

  let inRules = false;
  let currentCalc: Partial<CalculationStep> | null = null;

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith('One-turn KO probability:')) {
      result.koProb = trimmed.replace('One-turn KO probability:', '').trim();
    } else if (trimmed.startsWith('Target level:')) {
      result.targetInfo = trimmed;
    } else if (trimmed.startsWith('Initial status:')) {
      result.initialStatus = trimmed;
    } else if (trimmed.startsWith('Tracks resolved:')) {
      result.tracks = trimmed.replace('Tracks resolved:', '').trim();
    } else if (trimmed === 'Rules summary:') {
      inRules = true;
    } else if (inRules && trimmed.startsWith('-')) {
      result.rules.push(trimmed.substring(1).trim());
    } else if (trimmed.match(/^(Lure|Sound|Throw|Squirt|Drop) hit%/)) {
      if (currentCalc) {
        result.calculations.push(currentCalc as CalculationStep);
      }
      const match = trimmed.match(/^(\w+) hit% = (.+) = (\d+)%$/);
      if (match) {
        currentCalc = {
          track: match[1],
          formula: match[2],
          result: match[3] + '%',
          hitBranch: '',
          missBranch: '',
        };
      } else if (trimmed.includes('auto-hit')) {
        const trackMatch = trimmed.match(/^(\w+): target is lured => auto-hit \(100%\)$/);
        if (trackMatch) {
          currentCalc = {
            track: trackMatch[1],
            formula: 'target is lured',
            result: '100% (auto-hit)',
            hitBranch: '',
            missBranch: '',
          };
        }
      } else if (trimmed.includes('auto-miss')) {
        currentCalc = {
          track: 'Drop',
          formula: 'target is lured',
          result: '0% (auto-miss)',
          hitBranch: '',
          missBranch: '',
        };
      }
    } else if (trimmed.includes('already lured => treated as no-op')) {
      if (currentCalc) {
        result.calculations.push(currentCalc as CalculationStep);
      }
      currentCalc = {
        track: 'Lure',
        formula: 'target already lured',
        result: '100% (no-op)',
        hitBranch: '',
        missBranch: '',
      };
    } else if (trimmed.startsWith('Hit branch:') && currentCalc) {
      currentCalc.hitBranch = trimmed.replace('Hit branch:', '').trim();
    } else if (trimmed.startsWith('Miss branch:') && currentCalc) {
      currentCalc.missBranch = trimmed.replace('Miss branch:', '').trim();
    } else if (trimmed.startsWith('Leaf:')) {
      if (currentCalc) {
        result.calculations.push(currentCalc as CalculationStep);
        currentCalc = null;
      }
      const leafMatch = trimmed.match(/Leaf: damage (\d+) ([<>=]+) HP (\d+) => (KO|no KO).+p=([0-9.]+)%/);
      if (leafMatch) {
        result.leafNodes.push({
          damage: leafMatch[1],
          hp: leafMatch[3],
          isKO: leafMatch[4] === 'KO',
          prob: leafMatch[5] + '%',
        });
      }
    }

    // Stop processing rules when we hit a calculation
    if (inRules && !trimmed.startsWith('-') && trimmed !== 'Rules summary:' && trimmed !== '') {
      inRules = false;
    }
  }

  if (currentCalc) {
    result.calculations.push(currentCalc as CalculationStep);
  }

  return result;
}

export default function AccuracyPopover({ accuracy, explanation, className }: AccuracyPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const formatAccuracy = (value: number) =>
    Number.isFinite(value) ? `${(value * 100).toFixed(1)}%` : '0.0%';

  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event: MouseEvent) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const parsed = parseExplanation(explanation);

  return (
    <div className="relative inline-block">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={clsx(
          'cursor-pointer tabular-nums underline decoration-dotted underline-offset-2 hover:text-yellow-300 transition-colors',
          className
        )}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
      >
        {formatAccuracy(accuracy)}
      </button>

      {isOpen && (
        <div
          ref={popoverRef}
          role="dialog"
          aria-modal="true"
          className="absolute left-0 top-full z-50 mt-2 w-[400px] max-w-[90vw] rounded-lg border border-blue-700/60 bg-slate-900/98 p-4 shadow-xl backdrop-blur-sm"
          style={{ maxHeight: '70vh', overflowY: 'auto' }}
        >
          {/* Header */}
          <div className="mb-3 flex items-center justify-between border-b border-slate-700 pb-2">
            <h3 className="text-sm font-bold text-white">Accuracy Breakdown</h3>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-white transition-colors"
              aria-label="Close"
            >
              <span className="text-lg">&times;</span>
            </button>
          </div>

          {/* KO Probability */}
          <div className="mb-3 rounded-md bg-blue-900/40 p-2">
            <div className="text-xs text-slate-400 uppercase tracking-wide">One-Turn KO Chance</div>
            <div className="text-xl font-bold text-yellow-300">{parsed.koProb || formatAccuracy(accuracy)}</div>
          </div>

          {/* Target Info */}
          <div className="mb-3 space-y-1 text-xs">
            <div className="text-slate-300">{parsed.targetInfo}</div>
            <div className="text-slate-300">{parsed.initialStatus}</div>
            {parsed.tracks && (
              <div className="text-slate-400">
                <span className="text-slate-500">Tracks:</span> {parsed.tracks}
              </div>
            )}
          </div>

          {/* Calculation Steps */}
          {parsed.calculations.length > 0 && (
            <div className="mb-3">
              <div className="mb-2 text-xs font-bold text-slate-300 uppercase tracking-wide">Calculation Steps</div>
              <div className="space-y-2">
                {parsed.calculations.map((calc, idx) => (
                  <div key={idx} className="rounded-md bg-slate-800/60 p-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className={clsx(
                        'font-bold',
                        calc.track === 'Lure' && 'text-green-400',
                        calc.track === 'Sound' && 'text-purple-400',
                        calc.track === 'Throw' && 'text-orange-400',
                        calc.track === 'Squirt' && 'text-cyan-400',
                        calc.track === 'Drop' && 'text-blue-400',
                      )}>
                        {calc.track}
                      </span>
                      <span className={clsx(
                        'font-mono font-bold',
                        calc.result.includes('100%') && 'text-green-400',
                        calc.result.includes('0%') && 'text-red-400',
                        !calc.result.includes('100%') && !calc.result.includes('0%') && 'text-yellow-300',
                      )}>
                        {calc.result}
                      </span>
                    </div>
                    {calc.formula && !calc.formula.includes('lured') && (
                      <div className="mt-1 font-mono text-[10px] text-slate-400 break-all">
                        {calc.formula}
                      </div>
                    )}
                    {calc.formula.includes('lured') && (
                      <div className="mt-1 text-[10px] text-slate-500 italic">
                        {calc.formula}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Outcome Branches */}
          {parsed.leafNodes.length > 0 && (
            <div className="mb-3">
              <div className="mb-2 text-xs font-bold text-slate-300 uppercase tracking-wide">Possible Outcomes</div>
              <div className="space-y-1">
                {parsed.leafNodes.map((leaf, idx) => (
                  <div
                    key={idx}
                    className={clsx(
                      'flex items-center justify-between rounded px-2 py-1 text-xs',
                      leaf.isKO ? 'bg-green-900/30' : 'bg-red-900/30',
                    )}
                  >
                    <span>
                      <span className="font-mono">{leaf.damage}</span>
                      <span className="text-slate-500"> dmg vs </span>
                      <span className="font-mono">{leaf.hp}</span>
                      <span className="text-slate-500"> HP</span>
                    </span>
                    <span className="flex items-center gap-2">
                      <span className={leaf.isKO ? 'text-green-400' : 'text-red-400'}>
                        {leaf.isKO ? 'KO' : 'Survives'}
                      </span>
                      <span className="font-mono text-slate-400">({leaf.prob})</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Rules Summary */}
          {parsed.rules.length > 0 && (
            <details className="text-xs">
              <summary className="cursor-pointer text-slate-400 hover:text-slate-300 transition-colors">
                Rules Reference
              </summary>
              <ul className="mt-2 space-y-1 text-slate-500">
                {parsed.rules.map((rule, idx) => (
                  <li key={idx} className="pl-2 border-l border-slate-700">{rule}</li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
