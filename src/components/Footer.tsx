import {
  AFFILIATION_NOTICE,
  APP_NAME,
  BUILD_DATE,
  FOOTER_BLURB,
} from '../constants/site';
import { BrandMark } from './BrandMark';

const buildDateLabel = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'long',
  timeStyle: 'short',
}).format(new Date(BUILD_DATE));

export function Footer() {
  return (
    <footer className="border-t border-slate-800/80 bg-slate-950/55">
      <div className="mx-auto flex w-full max-w-[96rem] flex-col gap-4 px-4 py-5 text-sm text-slate-300 sm:px-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="flex items-start gap-3">
            <BrandMark className="h-10 shrink-0 sm:h-12" alt="" />
            <div>
              <div className="text-sm font-semibold text-white">{APP_NAME}</div>
              <div className="mt-1 text-xs text-slate-400">{FOOTER_BLURB}</div>
            </div>
          </div>

          <div className="space-y-1 text-xs text-slate-400 md:text-right">
            <div>{AFFILIATION_NOTICE}</div>
            <div>
              Last build: <span className="text-slate-200">{buildDateLabel}</span>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-800/70 pt-3 text-xs text-slate-400">
          <div>
            Thanks to{' '}
            <a
              className="text-cyan-300 underline underline-offset-2 hover:text-cyan-200"
              href="https://big.brain.town/"
              rel="noreferrer"
              target="_blank"
            >
              Big Brain Town
            </a>{' '}
            and the{' '}
            <a
              className="text-cyan-300 underline underline-offset-2 hover:text-cyan-200"
              href="https://github.com/am-maneaters/cogulator"
              rel="noreferrer"
              target="_blank"
            >
              original Cogulator repository
            </a>{' '}
            by{' '}
            <a
              className="text-cyan-300 underline underline-offset-2 hover:text-cyan-200"
              href="https://www.matenaer.dev/projects"
              rel="noreferrer"
              target="_blank"
            >
              Master Reggie
            </a>
            . Some assets and UI elements in this project were adapted from his gag calculator.
          </div>
        </div>
      </div>
    </footer>
  );
}
