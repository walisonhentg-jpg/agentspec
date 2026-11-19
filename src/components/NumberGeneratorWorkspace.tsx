import { useMemo, useState } from 'react';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  FileJson,
  FileSpreadsheet,
  FileText,
  Search,
  ShieldCheck,
  Trash2,
  Zap,
} from 'lucide-react';
import {
  COUNTRY_OPTIONS,
  CountryCode,
  US_CITIES,
} from '../data/identityRegistry';
import { PhoneBatchResult, PhoneFormat } from '../engine/identityGenerator';

interface NumberGeneratorWorkspaceProps {
  country: CountryCode;
  usCity: string;
  phoneFormat: PhoneFormat;
  sevenDayGuard: boolean;
  protectedPhoneCount: number;
  customCount: number;
  batch: PhoneBatchResult | null;
  isGenerating: boolean;
  progressPct: number;
  onChangeCountry: (c: CountryCode) => void;
  onChangeUsCity: (city: string) => void;
  onChangePhoneFormat: (f: PhoneFormat) => void;
  onToggleSevenDay: (v: boolean) => void;
  onClearSevenDay: () => void;
  onChangeCustomCount: (n: number) => void;
  onGenerate: (count: number) => void;
  onVerifyPhone: (phone: string) => void;
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

export function NumberGeneratorWorkspace({
  country,
  usCity,
  phoneFormat,
  sevenDayGuard,
  protectedPhoneCount,
  customCount,
  batch,
  isGenerating,
  progressPct,
  onChangeCountry,
  onChangeUsCity,
  onChangePhoneFormat,
  onToggleSevenDay,
  onClearSevenDay,
  onChangeCustomCount,
  onGenerate,
  onVerifyPhone,
  onExportTxt,
  onExportCsv,
  onExportJson,
}: NumberGeneratorWorkspaceProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [copiedRow, setCopiedRow] = useState<number | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);

  const selectedCountryMeta = COUNTRY_OPTIONS.find((c) => c.code === country);

  const filteredItems = useMemo(() => {
    if (!batch) return [];
    const q = searchQuery.trim().toLowerCase();
    if (!q) return batch.items;
    return batch.items.filter(
      (item) =>
        item.phone.toLowerCase().includes(q) ||
        item.e164.toLowerCase().includes(q) ||
        item.areaOrCity.toLowerCase().includes(q)
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
        filteredItems.slice(0, 100_000).map((i) => i.phone).join('\n')
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
        <div>
          <h2 className="text-sm font-semibold text-slate-900 mb-2">
            Strict Country Lock (1 Country Only)
          </h2>
          <p className="text-xs text-slate-500 mb-2.5">
            Generates numbers strictly for the chosen country &amp; carrier prefix rules.
          </p>
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
                  <span className="font-mono text-[11px] text-slate-500">{c.dialCode}</span>
                </button>
              );
            })}
          </div>
        </div>

        {country === 'US' && (
          <div>
            <label htmlFor="us-city-filter" className="block text-sm font-semibold text-slate-900 mb-2">
              USA City / Area Code Filter
            </label>
            <select
              id="us-city-filter"
              value={usCity}
              onChange={(e) => onChangeUsCity(e.target.value)}
              className="w-full px-3 py-2 text-xs font-medium text-slate-800 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              <option value="ALL">All 22 US Cities</option>
              {US_CITIES.map((c) => (
                <option key={c.city} value={c.city}>
                  {c.city}, {c.state} ({c.areaCodes.join('/')})
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <h2 className="text-sm font-semibold text-slate-900 mb-2">Number Format</h2>
          <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-lg">
            {(
              [
                { id: 'international', label: 'Formatted' },
                { id: 'e164', label: 'E.164' },
                { id: 'national', label: 'Local' },
              ] as const
            ).map((fmt) => (
              <button
                key={fmt.id}
                type="button"
                onClick={() => onChangePhoneFormat(fmt.id)}
                className={`px-2 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                  phoneFormat === fmt.id
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {fmt.label}
              </button>
            ))}
          </div>
        </div>

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
            Blocks any phone number generated within the past 7 days from appearing again.
          </p>
          <div className="flex items-center justify-between text-xs pt-1">
            <span className="text-slate-500 font-mono tabular-nums">
              {protectedPhoneCount.toLocaleString('en-IN')} protected (7d)
            </span>
            {protectedPhoneCount > 0 && (
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
        <section className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-4">
            <div>
              <h1 className="font-display text-xl sm:text-2xl font-bold text-slate-900 tracking-tight text-balance">
                Country-Locked Number Generator ({selectedCountryMeta?.name} {selectedCountryMeta?.dialCode})
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                ITU-T E.164 compliant phone numbers excluding fictional 555, N11, and Ofcom drama blocks.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <input
                type="number"
                aria-label="Custom Number Count"
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
                onClick={() => {
                  setPage(1);
                  onGenerate(customCount);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Zap className="w-4 h-4" aria-hidden="true" />
                <span>{isGenerating ? `${progressPct}%` : 'Generate'}</span>
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.count}
                type="button"
                disabled={isGenerating}
                onClick={() => {
                  onChangeCustomCount(p.count);
                  setPage(1);
                  onGenerate(p.count);
                }}
                className={`px-3.5 py-2 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  batch?.requestedCount === p.count
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </section>

        <section className="bg-white border border-slate-200 rounded-xl px-5 py-4 grid grid-cols-2 sm:grid-cols-4 gap-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
          <div className="pt-2 sm:pt-0 sm:pr-4">
            <div className="text-xs text-slate-500">Generated Numbers</div>
            <div className="font-mono text-xl font-semibold text-slate-900 tabular-nums mt-0.5">
              {batch ? batch.items.length.toLocaleString('en-IN') : '0'}
            </div>
          </div>
          <div className="pt-2 sm:pt-0 sm:px-4">
            <div className="text-xs text-slate-500">Locked Dial Code</div>
            <div className="font-mono text-sm font-semibold text-slate-900 mt-1">
              {selectedCountryMeta?.name} ({selectedCountryMeta?.dialCode})
            </div>
          </div>
          <div className="pt-2 sm:pt-0 sm:px-4">
            <div className="text-xs text-slate-500">Synthesis Time</div>
            <div className="font-mono text-xl font-semibold text-slate-900 tabular-nums mt-0.5">
              {batch ? `${batch.durationMs} ms` : '—'}
            </div>
          </div>
          <div className="pt-2 sm:pt-0 sm:pl-4">
            <div className="text-xs text-slate-500">Numbering Standard</div>
            <div className="flex items-center gap-1.5 text-sm font-semibold text-emerald-700 mt-1">
              <ShieldCheck className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>100% E.164 Valid</span>
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
                placeholder="Filter by phone number or city..."
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
                <span>{copiedAll ? 'Copied All' : 'Copy Numbers'}</span>
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
                  <th className="py-2.5 px-3">Phone Number</th>
                  <th className="py-2.5 px-3">E.164 Normalized</th>
                  <th className="py-2.5 px-3">Area / Carrier Type</th>
                  <th className="py-2.5 pl-3 pr-4 text-right w-32">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {pageRows.map((item, idx) => {
                  const rowNum = (safePage - 1) * PAGE_SIZE + idx + 1;
                  return (
                    <tr key={`${rowNum}-${item.e164}`} className="hover:bg-slate-50/90">
                      <td className="py-2.5 pl-4 pr-3 font-mono text-slate-400 tabular-nums">
                        {rowNum.toLocaleString('en-IN')}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-900 font-medium">
                        {item.phone}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-600">{item.e164}</td>
                      <td className="py-2.5 px-3 text-slate-500">{item.areaOrCity}</td>
                      <td className="py-2.5 pl-3 pr-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                await navigator.clipboard.writeText(item.phone);
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
                            onClick={() => onVerifyPhone(item.phone)}
                            className="px-2 py-1 text-[11px] font-medium rounded border border-slate-200 text-blue-600 hover:bg-blue-50 cursor-pointer"
                          >
                            Verify
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
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
