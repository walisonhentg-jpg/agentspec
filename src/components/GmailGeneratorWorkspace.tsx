import { useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  FileJson,
  FileSpreadsheet,
  FileText,
  Mail,
  Search,
  ShieldCheck,
  Trash2,
  Zap,
} from 'lucide-react';
import {
  COUNTRY_OPTIONS,
  CountryCode,
  GenderFilter,
} from '../data/identityRegistry';
import {
  GmailBatchResult,
  GmailGeneratorMode,
  GmailStyle,
  getMaxDotVariants,
  parseCanonicalGmailBase,
} from '../engine/identityGenerator';

interface GmailGeneratorWorkspaceProps {
  mode: GmailGeneratorMode;
  baseRealGmail: string;
  country: CountryCode;
  gender: GenderFilter;
  style: GmailStyle;
  sevenDayGuard: boolean;
  protectedGmailCount: number;
  customCount: number;
  batch: GmailBatchResult | null;
  isGenerating: boolean;
  progressPct: number;
  onChangeMode: (m: GmailGeneratorMode) => void;
  onChangeBaseRealGmail: (email: string) => void;
  onChangeCountry: (c: CountryCode) => void;
  onChangeGender: (g: GenderFilter) => void;
  onChangeStyle: (s: GmailStyle) => void;
  onToggleSevenDay: (v: boolean) => void;
  onClearSevenDay: () => void;
  onChangeCustomCount: (n: number) => void;
  onGenerate: (count: number, baseOverride?: string) => void;
  onVerifyGmail: (gmail: string) => void;
  onExportTxt: () => void;
  onExportCsv: () => void;
  onExportJson: () => void;
}

const PRESETS = [
  { count: 50, label: '50' },
  { count: 500, label: '500' },
  { count: 1_000, label: '1,000' },
  { count: 10_000, label: '10,000' },
  { count: 50_000, label: '50,000' },
  { count: 100_000, label: '1,00,000 (1 Lakh)' },
];

const PAGE_SIZE = 100;

export function GmailGeneratorWorkspace({
  mode,
  baseRealGmail,
  country,
  gender,
  style,
  sevenDayGuard,
  protectedGmailCount,
  customCount,
  batch,
  isGenerating,
  progressPct,
  onChangeMode,
  onChangeBaseRealGmail,
  onChangeCountry,
  onChangeGender,
  onChangeStyle,
  onToggleSevenDay,
  onClearSevenDay,
  onChangeCustomCount,
  onGenerate,
  onVerifyGmail,
  onExportTxt,
  onExportCsv,
  onExportJson,
}: GmailGeneratorWorkspaceProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [copiedRow, setCopiedRow] = useState<number | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);
  const [basePromptError, setBasePromptError] = useState(false);
  const baseInputRef = useRef<HTMLInputElement | null>(null);

  const selectedCountryMeta = COUNTRY_OPTIONS.find((c) => c.code === country);
  const canonicalBase = useMemo(
    () => parseCanonicalGmailBase(baseRealGmail),
    [baseRealGmail]
  );
  const maxDotPool = useMemo(
    () => (canonicalBase ? getMaxDotVariants(canonicalBase) : 0),
    [canonicalBase]
  );

  const isRealMode = mode === 'real_dots' || mode === 'real_plus';

  const promptForBaseGmail = () => {
    setBasePromptError(true);
    setTimeout(() => {
      baseInputRef.current?.focus();
      baseInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 0);
  };

  const handleTriggerGenerate = (countToRun: number) => {
    if (isRealMode && !canonicalBase) {
      promptForBaseGmail();
      return;
    }
    setBasePromptError(false);
    setPage(1);
    onGenerate(countToRun);
  };

  const handleModeSelect = (nextMode: GmailGeneratorMode) => {
    onChangeMode(nextMode);
    if ((nextMode === 'real_dots' || nextMode === 'real_plus') && !parseCanonicalGmailBase(baseRealGmail)) {
      promptForBaseGmail();
    } else {
      setBasePromptError(false);
    }
  };

  const filteredItems = useMemo(() => {
    if (!batch) return [];
    const q = searchQuery.trim().toLowerCase();
    if (!q) return batch.items;
    return batch.items.filter(
      (item) =>
        item.gmail.toLowerCase().includes(q) ||
        item.fullName.toLowerCase().includes(q) ||
        item.deliveryNote.toLowerCase().includes(q)
    );
  }, [batch, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);

  const pageRows = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filteredItems.slice(start, start + PAGE_SIZE);
  }, [filteredItems, safePage]);

  const handleCopyAll = async () => {
    if (filteredItems.length === 0) return;
    try {
      await navigator.clipboard.writeText(
        filteredItems.slice(0, 100_000).map((i) => i.gmail).join('\n')
      );
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 1800);
    } catch {
      // Clipboard blocked
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 items-start">
      <aside className="w-full lg:w-[320px] shrink-0 bg-white border border-slate-200 rounded-xl p-5 flex flex-col gap-5 self-start">
        {/* Mode Switcher */}
        <div>
          <h2 className="text-sm font-semibold text-slate-900 mb-2">Gmail Authenticity Mode</h2>
          <div className="grid grid-cols-1 gap-1.5">
            <button
              type="button"
              onClick={() => handleModeSelect('real_dots')}
              className={`px-3 py-2.5 rounded-lg text-left border transition-colors cursor-pointer ${
                mode === 'real_dots'
                  ? 'bg-emerald-50/70 border-emerald-300 text-slate-900'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <div className="text-xs font-semibold">
                100% Real Dot-Variants (Google Login)
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Uses your real Gmail — passes Google Sign-In &amp; delivers to your inbox.
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleModeSelect('real_plus')}
              className={`px-3 py-2.5 rounded-lg text-left border transition-colors cursor-pointer ${
                mode === 'real_plus'
                  ? 'bg-emerald-50/70 border-emerald-300 text-slate-900'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <div className="text-xs font-semibold">
                100% Real +Alias (1,00,000+ Inbox)
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Unlimited country-tagged aliases delivered to your real Gmail.
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleModeSelect('synthetic')}
              className={`px-3 py-2.5 rounded-lg text-left border transition-colors cursor-pointer ${
                mode === 'synthetic'
                  ? 'bg-blue-50/70 border-blue-200 text-slate-900'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <div className="text-xs font-semibold">
                Synthetic Format-Valid (Mock Data)
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Random regional names (unregistered placeholder format only).
              </div>
            </button>
          </div>
        </div>

        <div className="h-px bg-slate-100" />

        {/* Country Selector */}
        <div>
          <h2 className="text-sm font-semibold text-slate-900 mb-2">
            Strict Country Lock (1 Country Only)
          </h2>
          <div className="grid grid-cols-1 gap-1.5">
            {COUNTRY_OPTIONS.map((c) => {
              const active = country === c.code;
              return (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => onChangeCountry(c.code)}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                    active
                      ? 'bg-blue-50/70 border-blue-200 text-slate-900'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <span
                      className={`w-3.5 h-3.5 rounded-full flex items-center justify-center border ${
                        active ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300'
                      }`}
                    >
                      {active && <Check className="w-2.5 h-2.5" strokeWidth={2.5} />}
                    </span>
                    <span>{c.name}</span>
                  </span>
                  <span className="font-mono text-[11px] text-slate-400">{c.code}</span>
                </button>
              );
            })}
          </div>
        </div>

        {mode === 'synthetic' && (
          <>
            <div className="h-px bg-slate-100" />
            <div>
              <h2 className="text-sm font-semibold text-slate-900 mb-2">Gender (Men / Women)</h2>
              <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-lg">
                {(
                  [
                    { id: 'all', label: 'All' },
                    { id: 'male', label: 'Men' },
                    { id: 'female', label: 'Women' },
                  ] as const
                ).map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => onChangeGender(g.id)}
                    className={`px-2 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                      gender === g.id
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {g.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label htmlFor="gmail-style-select" className="block text-sm font-semibold text-slate-900 mb-2">
                Gmail Handle Pattern
              </label>
              <select
                id="gmail-style-select"
                value={style}
                onChange={(e) => onChangeStyle(e.target.value as GmailStyle)}
                className="w-full px-3 py-2 text-xs font-medium text-slate-800 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                <option value="mixed">Mixed Natural (All Valid Patterns)</option>
                <option value="dot_year">first.last94@gmail.com</option>
                <option value="plain_num">firstlast128@gmail.com</option>
                <option value="initial_dot">f.last1996@gmail.com</option>
                <option value="country_tag">first.last.us42@gmail.com</option>
              </select>
            </div>
          </>
        )}

        <div className="h-px bg-slate-100" />

        {/* 7-Day No-Repeat Guard */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-900">7-Day Freshness Guard</span>
            <button
              type="button"
              onClick={() => onToggleSevenDay(!sevenDayGuard)}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-md border cursor-pointer ${
                sevenDayGuard
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  : 'bg-slate-100 border-slate-200 text-slate-600'
              }`}
            >
              {sevenDayGuard ? 'ON' : 'OFF'}
            </button>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            Prevents repeating any Gmail generated in the last 7 days.
          </p>
          <div className="flex items-center justify-between text-xs pt-1">
            <span className="text-slate-500 font-mono tabular-nums">
              {protectedGmailCount.toLocaleString('en-IN')} protected (7d)
            </span>
            {protectedGmailCount > 0 && (
              <button
                type="button"
                onClick={onClearSevenDay}
                className="inline-flex items-center gap-1 text-rose-600 hover:underline font-medium cursor-pointer"
              >
                <Trash2 className="w-3 h-3" aria-hidden="true" />
                <span>Clear</span>
              </button>
            )}
          </div>
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col gap-5">
        <section className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col gap-4">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h1 className="font-display text-xl sm:text-2xl font-bold text-slate-900 tracking-tight text-balance">
                {mode === 'real_dots'
                  ? '100% Real Google-Verified Dot-Variant Gmail Generator'
                  : mode === 'real_plus'
                  ? `100% Real Deliverable +Alias Generator (${selectedCountryMeta?.name})`
                  : `Synthetic Format-Valid Gmails (${selectedCountryMeta?.name})`}
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                {mode === 'real_dots'
                  ? 'Because Google ignores dots in usernames, every generated dot-variant resolves to your REAL Google account—passing Google Sign-In & delivering real emails.'
                  : mode === 'real_plus'
                  ? 'Generates unlimited country-tagged +aliases routed straight into your real Gmail inbox.'
                  : 'Creates format-valid mock addresses using regional names (not pre-registered on Google Sign-In).'}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <input
                type="number"
                aria-label="Custom Gmail Count"
                min={1}
                max={200000}
                value={customCount}
                onChange={(e) =>
                  onChangeCustomCount(Math.max(1, Math.min(200000, Number(e.target.value) || 1)))
                }
                className="w-28 px-3 py-2 text-sm font-mono tabular-nums bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
              <button
                type="button"
                disabled={isGenerating}
                onClick={() => handleTriggerGenerate(customCount)}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:cursor-not-allowed"
              >
                <Zap className="w-4 h-4" aria-hidden="true" />
                <span>{isGenerating ? `${progressPct}%` : 'Generate'}</span>
              </button>
            </div>
          </div>

          {isRealMode && (
            <div
              className={`p-4 rounded-lg border flex flex-col gap-2.5 transition-colors ${
                basePromptError && !canonicalBase
                  ? 'bg-rose-50/70 border-rose-300 ring-2 ring-rose-500/20'
                  : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex items-center gap-2 shrink-0">
                  <Mail className="w-4 h-4 text-blue-600" aria-hidden="true" />
                  <label htmlFor="real-base-gmail" className="text-xs font-semibold text-slate-800 whitespace-nowrap">
                    Step 1 — Your Real Base Gmail:
                  </label>
                </div>
                <input
                  ref={baseInputRef}
                  id="real-base-gmail"
                  type="email"
                  value={baseRealGmail}
                  onChange={(e) => {
                    onChangeBaseRealGmail(e.target.value);
                    if (parseCanonicalGmailBase(e.target.value)) {
                      setBasePromptError(false);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleTriggerGenerate(customCount);
                    }
                  }}
                  placeholder="Type your real @gmail.com (e.g. yourname@gmail.com)"
                  className="flex-1 px-3 py-2 font-mono text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
                <div className="flex items-center gap-2 shrink-0">
                  {canonicalBase ? (
                    <span className="text-xs text-emerald-700 font-medium font-mono">
                      {mode === 'real_dots'
                        ? `${maxDotPool.toLocaleString('en-IN')} dot-variants ready`
                        : 'Unlimited +aliases ready'}
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        const demoEmail = 'alexmorgan1994@gmail.com';
                        onChangeBaseRealGmail(demoEmail);
                        setBasePromptError(false);
                        setPage(1);
                        onGenerate(customCount, demoEmail);
                      }}
                      className="px-3 py-2 text-xs font-medium rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 whitespace-nowrap cursor-pointer"
                    >
                      Try Demo &amp; Generate
                    </button>
                  )}
                </div>
              </div>
              {basePromptError && !canonicalBase && (
                <p className="text-xs text-rose-700 font-medium">
                  Enter your own real @gmail.com above (6–30 characters before @gmail.com) and click Generate — or click &ldquo;Try Demo &amp; Generate&rdquo; to preview instantly.
                </p>
              )}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.count}
                type="button"
                disabled={isGenerating}
                onClick={() => {
                  onChangeCustomCount(p.count);
                  handleTriggerGenerate(p.count);
                }}
                className={`px-3.5 py-2 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50 ${
                  batch?.requestedCount === p.count
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {batch?.poolExhausted && mode === 'real_dots' && (
            <div className="p-3.5 rounded-lg bg-amber-50 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-900">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />
                <span>
                  {batch.items.length === 0 ? (
                    <>
                      All unique real dot-variants for <span className="font-mono">{canonicalBase}@gmail.com</span> were already generated in the last 7 days. Turn <strong>OFF</strong> the 7-Day Guard on the left to re-view them, or switch to <strong>Real +Alias</strong> for 1,00,000+ fresh aliases.
                    </>
                  ) : (
                    <>
                      Generated all <strong className="font-mono">{batch.items.length.toLocaleString('en-IN')}</strong> unique real dot-variants for <span className="font-mono">{canonicalBase}@gmail.com</span> (within Google&apos;s 30-char limit &amp; 7-day history). Switch to <strong>Real +Alias</strong> for 1,00,000+ real deliverable addresses.
                    </>
                  )}
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleModeSelect('real_plus')}
                className="px-3 py-1.5 rounded-md bg-amber-900 text-white font-medium hover:bg-amber-800 whitespace-nowrap shrink-0 cursor-pointer"
              >
                Switch to +Alias
              </button>
            </div>
          )}
        </section>

        <section className="bg-white border border-slate-200 rounded-xl px-5 py-4 grid grid-cols-2 sm:grid-cols-4 gap-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
          <div className="pt-2 sm:pt-0 sm:pr-4">
            <div className="text-xs text-slate-500">Generated Gmails</div>
            <div className="font-mono text-xl font-semibold text-slate-900 tabular-nums mt-0.5">
              {batch ? batch.items.length.toLocaleString('en-IN') : '0'}
            </div>
          </div>
          <div className="pt-2 sm:pt-0 sm:px-4">
            <div className="text-xs text-slate-500">Locked Country</div>
            <div className="text-sm font-semibold text-slate-900 mt-1">
              {selectedCountryMeta?.name} Only
            </div>
          </div>
          <div className="pt-2 sm:pt-0 sm:px-4">
            <div className="text-xs text-slate-500">Synthesis Time</div>
            <div className="font-mono text-xl font-semibold text-slate-900 tabular-nums mt-0.5">
              {batch ? `${batch.durationMs} ms` : '—'}
            </div>
          </div>
          <div className="pt-2 sm:pt-0 sm:pl-4">
            <div className="text-xs text-slate-500">Account Guarantee</div>
            <div className="flex items-center gap-1.5 text-sm font-semibold text-emerald-700 mt-1">
              <ShieldCheck className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>
                {mode === 'real_dots'
                  ? 'Real Google Account'
                  : mode === 'real_plus'
                  ? 'Real Inbox Delivery'
                  : 'Format-Valid Only'}
              </span>
            </div>
          </div>
        </section>

        <section className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                placeholder="Filter by Gmail..."
                className="w-full pl-9 pr-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                disabled={filteredItems.length === 0}
                onClick={() => void handleCopyAll()}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{copiedAll ? 'Copied All' : 'Copy Gmails'}</span>
              </button>
              <button
                type="button"
                disabled={filteredItems.length === 0}
                onClick={onExportTxt}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5" aria-hidden="true" />
                <span>.TXT</span>
              </button>
              <button
                type="button"
                disabled={filteredItems.length === 0}
                onClick={onExportCsv}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" aria-hidden="true" />
                <span>.CSV</span>
              </button>
              <button
                type="button"
                disabled={filteredItems.length === 0}
                onClick={onExportJson}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
              >
                <FileJson className="w-3.5 h-3.5" aria-hidden="true" />
                <span>.JSON</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold text-slate-500">
                  <th className="py-2.5 pl-4 pr-3 w-14">#</th>
                  <th className="py-2.5 px-3">Gmail Address</th>
                  <th className="py-2.5 px-3">Owner / Base</th>
                  <th className="py-2.5 px-3">Country</th>
                  <th className="py-2.5 px-3">Delivery Status</th>
                  <th className="py-2.5 pl-3 pr-4 text-right w-32">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {pageRows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 px-4 text-center text-slate-500">
                      {isRealMode && !canonicalBase
                        ? 'Enter your real @gmail.com above and click Generate to produce 100% real Google-recognized Gmail addresses.'
                        : 'No matching Gmail addresses in this batch.'}
                    </td>
                  </tr>
                ) : (
                  pageRows.map((item, idx) => {
                    const rowNum = (safePage - 1) * PAGE_SIZE + idx + 1;
                    return (
                      <tr key={`${rowNum}-${item.gmail}`} className="hover:bg-slate-50/90">
                        <td className="py-2.5 pl-4 pr-3 font-mono text-slate-400 tabular-nums">
                          {rowNum.toLocaleString('en-IN')}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-900 font-medium">
                          {item.gmail}
                        </td>
                        <td className="py-2.5 px-3 text-slate-700">{item.fullName}</td>
                        <td className="py-2.5 px-3 text-slate-500">{item.country}</td>
                        <td className="py-2.5 px-3 text-slate-600">{item.deliveryNote}</td>
                        <td className="py-2.5 pl-3 pr-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={async () => {
                                try {
                                  await navigator.clipboard.writeText(item.gmail);
                                  setCopiedRow(rowNum);
                                  setTimeout(() => setCopiedRow(null), 1200);
                                } catch {
                                  // ignore
                                }
                              }}
                              className="px-2 py-1 text-[11px] font-medium rounded border border-slate-200 text-slate-600 hover:bg-slate-100 cursor-pointer"
                            >
                              {copiedRow === rowNum ? 'Copied' : 'Copy'}
                            </button>
                            <button
                              type="button"
                              onClick={() => onVerifyGmail(item.gmail)}
                              className="px-2 py-1 text-[11px] font-medium rounded border border-slate-200 text-blue-600 hover:bg-blue-50 cursor-pointer"
                            >
                              Verify
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="px-4 py-3 border-t border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-600">
            <div className="tabular-nums">
              Showing{' '}
              <strong className="font-mono text-slate-900">
                {filteredItems.length === 0 ? 0 : ((safePage - 1) * PAGE_SIZE + 1).toLocaleString('en-IN')}
              </strong>
              –
              <strong className="font-mono text-slate-900">
                {Math.min(safePage * PAGE_SIZE, filteredItems.length).toLocaleString('en-IN')}
              </strong>{' '}
              of{' '}
              <strong className="font-mono text-slate-900">
                {filteredItems.length.toLocaleString('en-IN')}
              </strong>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-slate-200 bg-white text-slate-700 disabled:opacity-40 cursor-pointer"
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
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-slate-200 bg-white text-slate-700 disabled:opacity-40 cursor-pointer"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
