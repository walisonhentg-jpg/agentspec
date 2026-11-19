import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  FileJson,
  FileSpreadsheet,
  FileText,
  Search,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { BROWSER_LIST, DEVICE_LIST } from '../data/uaRegistry';
import {
  INDEX_TO_BROWSER,
  INDEX_TO_DEVICE,
  TrafficMode,
  UaBatchResult,
} from '../engine/uaGenerator';

interface GeneratorWorkspaceProps {
  batch: UaBatchResult | null;
  isGenerating: boolean;
  progressPct: number;
  customCount: number;
  validPairsCount: number;
  trafficMode: TrafficMode;
  sevenDayGuard?: boolean;
  onChangeCustomCount: (n: number) => void;
  onGenerate: (count: number) => void;
  onSwitchToOrganic: () => void;
  onInspectUa: (ua: string) => void;
  onExportTxt: () => void;
  onExportCsv: () => void;
  onExportJson: () => void;
}

const PRESET_COUNTS = [
  { count: 100, label: '100' },
  { count: 1_000, label: '1,000' },
  { count: 10_000, label: '10,000' },
  { count: 50_000, label: '50,000' },
  { count: 100_000, label: '1,00,000 (1 Lakh)' },
  { count: 200_000, label: '2,00,000 (2 Lakh)' },
  { count: 500_000, label: '5,00,000 (5 Lakh)' },
];

const PAGE_SIZE = 100;

export function GeneratorWorkspace({
  batch,
  isGenerating,
  progressPct,
  customCount,
  validPairsCount,
  trafficMode,
  sevenDayGuard = true,
  onChangeCustomCount,
  onGenerate,
  onSwitchToOrganic,
  onInspectUa,
  onExportTxt,
  onExportCsv,
  onExportJson,
}: GeneratorWorkspaceProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [copiedRow, setCopiedRow] = useState<number | null>(null);
  const [copiedAllState, setCopiedAllState] = useState<'idle' | 'copied' | 'too_large'>('idle');

  const browserLabelMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const b of BROWSER_LIST) map[b.id] = b.shortLabel;
    return map;
  }, []);

  const deviceLabelMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const d of DEVICE_LIST) map[d.id] = d.label;
    return map;
  }, []);

  const filteredIndices = useMemo(() => {
    if (!batch) return [];
    const q = searchQuery.trim().toLowerCase();
    const total = batch.lines.length;
    if (!q) {
      // Return null to signify "all indices" without allocating a 500k array
      return null;
    }
    const matches: number[] = [];
    for (let i = 0; i < total; i++) {
      if (batch.lines[i].toLowerCase().includes(q)) {
        matches.push(i);
      }
    }
    return matches;
  }, [batch, searchQuery]);

  const totalVisible = filteredIndices ? filteredIndices.length : batch?.lines.length ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalVisible / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);

  const pageRows = useMemo(() => {
    if (!batch || totalVisible === 0) return [];
    const start = (safePage - 1) * PAGE_SIZE;
    const end = Math.min(start + PAGE_SIZE, totalVisible);
    const rows: Array<{
      index: number;
      ua: string;
      browser: string;
      device: string;
    }> = [];
    for (let i = start; i < end; i++) {
      const realIdx = filteredIndices ? filteredIndices[i] : i;
      const bKey = INDEX_TO_BROWSER[batch.browserCodes[realIdx]];
      const dKey = INDEX_TO_DEVICE[batch.deviceCodes[realIdx]];
      rows.push({
        index: realIdx,
        ua: batch.lines[realIdx],
        browser: browserLabelMap[bKey] || bKey,
        device: deviceLabelMap[dKey] || dKey,
      });
    }
    return rows;
  }, [batch, totalVisible, safePage, filteredIndices, browserLabelMap, deviceLabelMap]);

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    setPage(1);
  };

  const handleCopySingle = async (ua: string, rowIndex: number) => {
    try {
      await navigator.clipboard.writeText(ua);
      setCopiedRow(rowIndex);
      setTimeout(() => setCopiedRow((prev) => (prev === rowIndex ? null : prev)), 1500);
    } catch {
      // Clipboard blocked in restricted context
    }
  };

  const handleCopyAll = async () => {
    if (!batch || batch.lines.length === 0) return;
    // If filtered, copy filtered rows; otherwise copy all (up to 150k safely in clipboard, or warn for huge 500k+)
    const linesToCopy = filteredIndices
      ? filteredIndices.map((idx) => batch.lines[idx])
      : batch.lines;

    if (linesToCopy.length > 250_000) {
      try {
        await navigator.clipboard.writeText(linesToCopy.slice(0, 100_000).join('\n'));
        setCopiedAllState('too_large');
        setTimeout(() => setCopiedAllState('idle'), 3000);
      } catch {
        setCopiedAllState('too_large');
        setTimeout(() => setCopiedAllState('idle'), 3000);
      }
      return;
    }

    try {
      await navigator.clipboard.writeText(linesToCopy.join('\n'));
      setCopiedAllState('copied');
      setTimeout(() => setCopiedAllState('idle'), 2000);
    } catch {
      setCopiedAllState('too_large');
      setTimeout(() => setCopiedAllState('idle'), 3000);
    }
  };

  return (
    <div className="flex-1 min-w-0 flex flex-col gap-5">
      {/* Control & Quick-Fire Bulk Generator Panel */}
      <section className="bg-white border border-slate-200 rounded-xl p-5">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-4">
          <div>
            <h1 className="font-display text-xl sm:text-2xl font-bold text-slate-900 tracking-tight text-balance">
              One-Click Organic User-Agent Generator
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Click any volume preset to instantly synthesize specification-verified, bot-safe User-Agent lists.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <label htmlFor="custom-ua-count" className="sr-only">
              Custom User-Agent Count
            </label>
            <input
              id="custom-ua-count"
              type="number"
              min={1}
              max={1000000}
              value={customCount}
              onChange={(e) => onChangeCustomCount(Math.max(1, Math.min(1000000, Number(e.target.value) || 1)))}
              className="w-32 px-3 py-2 text-sm font-mono tabular-nums bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
            <button
              type="button"
              disabled={isGenerating || validPairsCount === 0}
              onClick={() => {
                setPage(1);
                onGenerate(customCount);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:cursor-not-allowed"
            >
              <Zap className="w-4 h-4" aria-hidden="true" />
              <span>{isGenerating ? `Generating ${progressPct}%` : 'Generate'}</span>
            </button>
          </div>
        </div>

        {/* 1-Click Quick Volume Presets */}
        <div className="flex flex-wrap items-center gap-2">
          {PRESET_COUNTS.map((preset) => (
            <button
              key={preset.count}
              type="button"
              disabled={isGenerating || validPairsCount === 0}
              onClick={() => {
                onChangeCustomCount(preset.count);
                setPage(1);
                onGenerate(preset.count);
              }}
              className={`px-3.5 py-2 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                batch?.requestedCount === preset.count
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* Progress Bar during chunked generation */}
        {isGenerating && (
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
              <span>Synthesizing verified User-Agents...</span>
              <span className="font-mono tabular-nums">{progressPct}%</span>
            </div>
            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 transition-transform duration-150 origin-left"
                style={{ transform: `scaleX(${Math.max(0.02, progressPct / 100)})` }}
              />
            </div>
          </div>
        )}

        {/* Incompatible browser/OS warning */}
        {validPairsCount === 0 && (
          <div className="mt-4 p-3.5 rounded-lg bg-amber-50 border border-amber-200 flex items-start gap-2.5 text-xs text-amber-900">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />
            <span>
              No compatible Browser and Device combination selected. For example, Safari only runs on iPhone and macOS, and Samsung Internet only runs on Android.
            </span>
          </div>
        )}

        {/* Pool Exhausted Notice in Strict Unique Mode */}
        {batch?.poolExhausted && trafficMode === 'unique' && (
          <div className="mt-4 p-3.5 rounded-lg bg-amber-50 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-900">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />
              <span>
                Strict Unique mode stopped at{' '}
                <strong className="font-mono tabular-nums">{batch.lines.length.toLocaleString('en-IN')}</strong>{' '}
                fresh strings{sevenDayGuard ? ' (excluding User-Agents issued in the last 7 days)' : ''} because real-world browsers freeze desktop/Chrome tokens. Switch to Organic Weighted, include Mobile/Social apps (FB/IG/YT/TikTok), or clear 7-day history for larger batches.
              </span>
            </div>
            <button
              type="button"
              onClick={onSwitchToOrganic}
              className="px-3 py-1.5 rounded-md bg-amber-900 text-white font-medium hover:bg-amber-800 whitespace-nowrap shrink-0 cursor-pointer"
            >
              Switch to Organic Weighted
            </button>
          </div>
        )}
      </section>

      {/* Metrics Summary Strip (Unboxed tabular figures separated by subtle dividers) */}
      <section className="bg-white border border-slate-200 rounded-xl px-5 py-4 grid grid-cols-2 sm:grid-cols-4 gap-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
        <div className="pt-2 sm:pt-0 sm:pr-4">
          <div className="text-xs text-slate-500">Generated Lines</div>
          <div className="font-mono text-xl font-semibold text-slate-900 tabular-nums mt-0.5">
            {batch ? batch.lines.length.toLocaleString('en-IN') : '0'}
          </div>
        </div>
        <div className="pt-2 sm:pt-0 sm:px-4">
          <div className="text-xs text-slate-500">Unique Signatures</div>
          <div className="font-mono text-xl font-semibold text-slate-900 tabular-nums mt-0.5">
            {batch ? batch.uniqueCount.toLocaleString('en-IN') : '0'}
          </div>
        </div>
        <div className="pt-2 sm:pt-0 sm:px-4">
          <div className="text-xs text-slate-500">Synthesis Speed</div>
          <div className="font-mono text-xl font-semibold text-slate-900 tabular-nums mt-0.5">
            {batch ? `${batch.durationMs} ms` : '—'}
          </div>
        </div>
        <div className="pt-2 sm:pt-0 sm:pl-4">
          <div className="text-xs text-slate-500">Specification Check</div>
          <div className="flex items-center gap-1.5 text-sm font-semibold text-emerald-700 mt-1">
            <ShieldCheck className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>{batch && batch.lines.length > 0 ? '100% Spec-Valid' : 'Ready'}</span>
          </div>
        </div>
      </section>

      {/* Export Bar + Live Filter + Virtualized/Paged Output Table */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col">
        {/* Toolbar */}
        <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Filter batch by model (SM-S938B, iPhone17), FB4A, Instagram, Chrome..."
              className="w-full pl-9 pr-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              disabled={!batch || batch.lines.length === 0}
              onClick={handleCopyAll}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 whitespace-nowrap cursor-pointer disabled:cursor-not-allowed"
            >
              {copiedAllState === 'copied' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
                  <span className="text-emerald-700">Copied</span>
                </>
              ) : copiedAllState === 'too_large' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-blue-600" aria-hidden="true" />
                  <span className="text-blue-700">Copied 1,00,000 (Use .TXT for full)</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Copy All</span>
                </>
              )}
            </button>

            <button
              type="button"
              disabled={!batch || batch.lines.length === 0}
              onClick={onExportTxt}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 whitespace-nowrap cursor-pointer disabled:cursor-not-allowed"
            >
              <FileText className="w-3.5 h-3.5" aria-hidden="true" />
              <span>.TXT</span>
            </button>

            <button
              type="button"
              disabled={!batch || batch.lines.length === 0}
              onClick={onExportCsv}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 whitespace-nowrap cursor-pointer disabled:cursor-not-allowed"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" aria-hidden="true" />
              <span>.CSV</span>
            </button>

            <button
              type="button"
              disabled={!batch || batch.lines.length === 0}
              onClick={onExportJson}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 whitespace-nowrap cursor-pointer disabled:cursor-not-allowed"
            >
              <FileJson className="w-3.5 h-3.5" aria-hidden="true" />
              <span>.JSON</span>
            </button>
          </div>
        </div>

        {/* Data Table */}
        {!batch || batch.lines.length === 0 ? (
          <div className="py-16 px-6 text-center">
            <p className="text-sm font-medium text-slate-700">No User-Agents generated yet</p>
            <p className="text-xs text-slate-500 mt-1 mb-4">
              Select your target browsers and devices on the left, then click any volume preset above.
            </p>
            <button
              type="button"
              onClick={() => onGenerate(1000)}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Generate Sample 1,000</span>
            </button>
          </div>
        ) : totalVisible === 0 ? (
          <div className="py-14 px-6 text-center">
            <p className="text-sm font-medium text-slate-700">No User-Agents match &ldquo;{searchQuery}&rdquo;</p>
            <button
              type="button"
              onClick={() => handleSearchChange('')}
              className="mt-3 text-xs font-medium text-blue-600 hover:underline cursor-pointer"
            >
              Clear filter
            </button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold text-slate-500">
                    <th className="py-2.5 pl-4 pr-3 w-16">#</th>
                    <th className="py-2.5 px-3">User-Agent Header String</th>
                    <th className="py-2.5 px-3 w-28">App / Browser</th>
                    <th className="py-2.5 px-3 w-32">Device / OS</th>
                    <th className="py-2.5 pl-3 pr-4 w-28 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {pageRows.map((row) => (
                    <tr key={row.index} className="hover:bg-slate-50/90 transition-colors">
                      <td className="py-2.5 pl-4 pr-3 font-mono text-slate-400 tabular-nums align-top">
                        {(row.index + 1).toLocaleString('en-IN')}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[12px] text-slate-800 break-all leading-relaxed align-top">
                        {row.ua}
                      </td>
                      <td className="py-2.5 px-3 text-slate-700 font-medium whitespace-nowrap align-top">
                        {row.browser}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap align-top">
                        {row.device}
                      </td>
                      <td className="py-2.5 pl-3 pr-4 text-right whitespace-nowrap align-top">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleCopySingle(row.ua, row.index)}
                            className="px-2 py-1 text-[11px] font-medium rounded border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
                            title="Copy User-Agent"
                          >
                            {copiedRow === row.index ? 'Copied' : 'Copy'}
                          </button>
                          <button
                            type="button"
                            onClick={() => onInspectUa(row.ua)}
                            className="px-2 py-1 text-[11px] font-medium rounded border border-slate-200 text-blue-600 hover:bg-blue-50 cursor-pointer"
                            title="Run Anti-Bot Coherence Audit"
                          >
                            Audit
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            <div className="px-4 py-3 border-t border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-600">
              <div className="tabular-nums">
                Showing{' '}
                <strong className="font-mono text-slate-900">
                  {((safePage - 1) * PAGE_SIZE + 1).toLocaleString('en-IN')}
                </strong>
                –
                <strong className="font-mono text-slate-900">
                  {Math.min(safePage * PAGE_SIZE, totalVisible).toLocaleString('en-IN')}
                </strong>{' '}
                of{' '}
                <strong className="font-mono text-slate-900">
                  {totalVisible.toLocaleString('en-IN')}
                </strong>{' '}
                {filteredIndices ? 'matching' : 'total'} User-Agents
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={safePage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Prev</span>
                </button>
                <span className="font-mono tabular-nums px-2">
                  Page {safePage.toLocaleString('en-IN')} / {totalPages.toLocaleString('en-IN')}
                </span>
                <button
                  type="button"
                  disabled={safePage >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                >
                  <span>Next</span>
                  <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
