import { Download } from 'lucide-react';

export type ActiveTab =
  | 'generator'
  | 'identities'
  | 'gmail-gen'
  | 'number-gen'
  | 'gmail-check'
  | 'validators';

interface TopBarProps {
  activeTab: ActiveTab;
  onChangeTab: (tab: ActiveTab) => void;
  hasResults: boolean;
  resultCount: number;
  exportLabel?: string;
  onQuickDownload: () => void;
}

export function TopBar({
  activeTab,
  onChangeTab,
  hasResults,
  resultCount,
  exportLabel,
  onQuickDownload,
}: TopBarProps) {
  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-slate-200">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-6">
        {/* Zone 1: Single-element Brand Wordmark */}
        <button
          type="button"
          onClick={() => onChangeTab('generator')}
          className="font-display text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded"
        >
          AgentSpec
        </button>

        {/* Zone 2: Clean single-line navigation tabs */}
        <nav className="flex items-center gap-5 overflow-x-auto" aria-label="Primary Navigation">
          <button
            type="button"
            onClick={() => onChangeTab('generator')}
            className={`py-2 text-sm font-medium whitespace-nowrap shrink-0 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'generator'
                ? 'border-blue-600 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            User-Agents
          </button>
          <button
            type="button"
            onClick={() => onChangeTab('identities')}
            className={`py-2 text-sm font-medium whitespace-nowrap shrink-0 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'identities'
                ? 'border-blue-600 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            Profiles
          </button>
          <button
            type="button"
            onClick={() => onChangeTab('gmail-gen')}
            className={`py-2 text-sm font-medium whitespace-nowrap shrink-0 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'gmail-gen'
                ? 'border-blue-600 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            Gmail Gen
          </button>
          <button
            type="button"
            onClick={() => onChangeTab('number-gen')}
            className={`py-2 text-sm font-medium whitespace-nowrap shrink-0 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'number-gen'
                ? 'border-blue-600 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            Number Gen
          </button>
          <button
            type="button"
            onClick={() => onChangeTab('gmail-check')}
            className={`py-2 text-sm font-medium whitespace-nowrap shrink-0 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'gmail-check'
                ? 'border-blue-600 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            Gmail Checker
          </button>
          <button
            type="button"
            onClick={() => onChangeTab('validators')}
            className={`py-2 text-sm font-medium whitespace-nowrap shrink-0 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'validators'
                ? 'border-blue-600 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            Validators
          </button>
        </nav>

        {/* Zone 3: Single Primary Action */}
        <div className="shrink-0">
          <button
            type="button"
            onClick={onQuickDownload}
            disabled={!hasResults}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-lg bg-slate-900 text-white hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400 transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:cursor-not-allowed"
          >
            <Download className="w-3.5 h-3.5" aria-hidden="true" />
            <span>
              {hasResults
                ? exportLabel ?? `Export ${resultCount.toLocaleString('en-IN')} (.txt)`
                : 'Export Batch'}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}
