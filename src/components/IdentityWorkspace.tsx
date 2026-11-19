import { useMemo, useState } from 'react';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  FileJson,
  FileSpreadsheet,
  FileText,
  Search,
  Trash2,
  Zap,
} from 'lucide-react';
import {
  COUNTRY_OPTIONS,
  CountryCode,
  GenderFilter,
} from '../data/identityRegistry';
import {
  IdentityBatchResult,
  IdentityProfile,
  PhoneFormat,
} from '../engine/identityGenerator';

interface IdentityWorkspaceProps {
  countries: CountryCode[];
  gender: GenderFilter;
  phoneFormat: PhoneFormat;
  sevenDayGuard: boolean;
  protectedCount: number;
  customCount: number;
  batch: IdentityBatchResult | null;
  isGenerating: boolean;
  progressPct: number;
  onToggleCountry: (c: CountryCode) => void;
  onSetCountries: (c: CountryCode[]) => void;
  onChangeGender: (g: GenderFilter) => void;
  onChangePhoneFormat: (p: PhoneFormat) => void;
  onToggleSevenDay: (v: boolean) => void;
  onClearSevenDay: () => void;
  onChangeCustomCount: (n: number) => void;
  onGenerate: (count: number) => void;
  onVerifyProfile: (phone: string, gmail: string) => void;
  onExportCsv: () => void;
  onExportTxt: () => void;
  onExportJson: () => void;
}

const PROFILE_PRESETS = [
  { count: 50, label: '50' },
  { count: 500, label: '500' },
  { count: 1_000, label: '1,000' },
  { count: 10_000, label: '10,000' },
  { count: 50_000, label: '50,000' },
  { count: 100_000, label: '1,00,000 (1 Lakh)' },
];

const PAGE_SIZE = 100;

export function IdentityWorkspace({
  countries,
  gender,
  phoneFormat,
  sevenDayGuard,
  protectedCount,
  customCount,
  batch,
  isGenerating,
  progressPct,
  onToggleCountry,
  onSetCountries,
  onChangeGender,
  onChangePhoneFormat,
  onToggleSevenDay,
  onClearSevenDay,
  onChangeCustomCount,
  onGenerate,
  onVerifyProfile,
  onExportCsv,
  onExportTxt,
  onExportJson,
}: IdentityWorkspaceProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [bulkCopiedLabel, setBulkCopiedLabel] = useState<string | null>(null);

  const filteredProfiles = useMemo(() => {
    if (!batch) return [];
    const q = searchQuery.trim().toLowerCase();
    if (!q) return batch.profiles;
    return batch.profiles.filter(
      (p) =>
        p.fullName.toLowerCase().includes(q) ||
        p.fullAddress.toLowerCase().includes(q) ||
        p.phone.toLowerCase().includes(q) ||
        p.gmail.toLowerCase().includes(q) ||
        p.country.toLowerCase().includes(q)
    );
  }, [batch, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredProfiles.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);

  const pageRows = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filteredProfiles.slice(start, start + PAGE_SIZE);
  }, [filteredProfiles, safePage]);

  const copyField = async (value: string, key: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey((prev) => (prev === key ? null : prev)), 1300);
    } catch {
      // Clipboard blocked
    }
  };

  const copyColumn = async (kind: 'gmails' | 'phones' | 'all') => {
    if (!batch || batch.profiles.length === 0) return;
    const targetList = filteredProfiles.slice(0, 100_000);
    const text =
      kind === 'gmails'
        ? targetList.map((p) => p.gmail).join('\n')
        : kind === 'phones'
        ? targetList.map((p) => p.phone).join('\n')
        : targetList
            .map((p) => `${p.fullName} | ${p.gender} | ${p.fullAddress} | ${p.phone} | ${p.gmail}`)
            .join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setBulkCopiedLabel(kind);
      setTimeout(() => setBulkCopiedLabel(null), 1800);
    } catch {
      // Clipboard blocked
    }
  };

  const formatRowLine = (p: IdentityProfile) =>
    `${p.fullName}\n${p.fullAddress}\n${p.phone}\n${p.gmail}`;

  const lockedCountrySummary = useMemo(() => {
    if (countries.length === 1) {
      const match = COUNTRY_OPTIONS.find((c) => c.code === countries[0]);
      return match ? `${match.name} Only` : countries[0];
    }
    if (countries.length === COUNTRY_OPTIONS.length) {
      return 'All 10 Countries';
    }
    return countries.join(' · ');
  }, [countries]);

  return (
    <div className="flex flex-col lg:flex-row gap-6 items-start">
      {/* Left Configuration Sidebar */}
      <aside className="w-full lg:w-[320px] shrink-0 bg-white border border-slate-200 rounded-xl p-5 flex flex-col gap-5 self-start">
        {/* Quick Region Locks */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-slate-900">Country Lock</h2>
            <button
              type="button"
              onClick={() => onSetCountries(COUNTRY_OPTIONS.map((c) => c.code))}
              className="text-xs text-blue-600 hover:underline font-medium cursor-pointer"
            >
              All 10
            </button>
          </div>

          <div className="grid grid-cols-3 gap-1.5 mb-2.5">
            <button
              type="button"
              onClick={() => onSetCountries(['US'])}
              className={`px-2 py-1.5 text-[11px] font-medium rounded-md border transition-colors cursor-pointer ${
                countries.length === 1 && countries[0] === 'US'
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              USA Only
            </button>
            <button
              type="button"
              onClick={() => onSetCountries(['GB'])}
              className={`px-2 py-1.5 text-[11px] font-medium rounded-md border transition-colors cursor-pointer ${
                countries.length === 1 && countries[0] === 'GB'
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              UK Only
            </button>
            <button
              type="button"
              onClick={() =>
                onSetCountries(['DE', 'FR', 'ES', 'IT', 'NL', 'PL', 'SE', 'IE'])
              }
              className={`px-2 py-1.5 text-[11px] font-medium rounded-md border transition-colors cursor-pointer ${
                countries.length === 8 && !countries.includes('US') && !countries.includes('GB')
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              EU Only
            </button>
          </div>

          <div className="grid grid-cols-1 gap-1.5">
            {COUNTRY_OPTIONS.map((c) => {
              const active = countries.includes(c.code);
              return (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => onToggleCountry(c.code)}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                    active
                      ? 'bg-blue-50/70 border-blue-200 text-slate-900'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span className="flex items-center gap-2.5 truncate">
                    <span
                      className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border ${
                        active
                          ? 'bg-blue-600 border-blue-600 text-white'
                          : 'bg-white border-slate-300'
                      }`}
                    >
                      {active && <Check className="w-3 h-3" strokeWidth={2.5} />}
                    </span>
                    <span className="truncate">{c.name}</span>
                  </span>
                  <span className="font-mono text-[11px] text-slate-400 shrink-0 ml-2">
                    {c.dialCode}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="h-px bg-slate-100" />

        {/* Gender */}
        <div>
          <h2 className="text-sm font-semibold text-slate-900 mb-2">Gender (Men / Women)</h2>
          <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-lg">
            {(
              [
                { id: 'all', label: 'All' },
                { id: 'male', label: 'Men' },
                { id: 'female', label: 'Women' },
              ] as const
            ).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onChangeGender(item.id)}
                className={`px-2 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                  gender === item.id
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Phone Format */}
        <div>
          <h2 className="text-sm font-semibold text-slate-900 mb-2">Phone Number Format</h2>
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
                className={`px-2 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
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

        {/* 7-Day Freshness Guard */}
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
            Blocks any Address, Phone Number, or Gmail generated in the last 7 days from repeating.
          </p>
          <div className="flex items-center justify-between text-xs pt-1">
            <span className="text-slate-500 font-mono tabular-nums">
              {protectedCount.toLocaleString('en-IN')} protected (7d)
            </span>
            {protectedCount > 0 && (
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

      {/* Main Content */}
      <div className="flex-1 min-w-0 flex flex-col gap-5">
        {/* Bulk Generator Panel */}
        <section className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-4">
            <div>
              <h1 className="font-display text-xl sm:text-2xl font-bold text-slate-900 tracking-tight text-balance">
                USA · UK · Europe Identity Profile Studio
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                Generate geographically matched Men &amp; Women names, street addresses, postal codes, area-code phone numbers, and Gmail addresses.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <label htmlFor="custom-profile-count" className="sr-only">
                Custom Profile Count
              </label>
              <input
                id="custom-profile-count"
                type="number"
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
                <span>{isGenerating ? `Generating ${progressPct}%` : 'Generate'}</span>
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {PROFILE_PRESETS.map((preset) => (
              <button
                key={preset.count}
                type="button"
                disabled={isGenerating}
                onClick={() => {
                  onChangeCustomCount(preset.count);
                  setPage(1);
                  onGenerate(preset.count);
                }}
                className={`px-3.5 py-2 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50 ${
                  batch?.requestedCount === preset.count
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {isGenerating && (
            <div className="mt-4">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
                <span>Synthesizing regional profiles...</span>
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
        </section>

        {/* Summary Strip */}
        <section className="bg-white border border-slate-200 rounded-xl px-5 py-4 grid grid-cols-2 sm:grid-cols-4 gap-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
          <div className="pt-2 sm:pt-0 sm:pr-4">
            <div className="text-xs text-slate-500">Generated Profiles</div>
            <div className="font-mono text-xl font-semibold text-slate-900 tabular-nums mt-0.5">
              {batch ? batch.profiles.length.toLocaleString('en-IN') : '0'}
            </div>
          </div>
          <div className="pt-2 sm:pt-0 sm:px-4">
            <div className="text-xs text-slate-500">Locked Countries</div>
            <div className="text-sm font-semibold text-slate-900 mt-1 truncate">
              {lockedCountrySummary}
            </div>
          </div>
          <div className="pt-2 sm:pt-0 sm:px-4">
            <div className="text-xs text-slate-500">Gender Filter</div>
            <div className="text-sm font-semibold text-slate-900 mt-1">
              {gender === 'all' ? 'Men & Women' : gender === 'male' ? 'Men Only' : 'Women Only'}
            </div>
          </div>
          <div className="pt-2 sm:pt-0 sm:pl-4">
            <div className="text-xs text-slate-500">Generation Speed</div>
            <div className="font-mono text-xl font-semibold text-slate-900 tabular-nums mt-0.5">
              {batch ? `${batch.durationMs} ms` : '—'}
            </div>
          </div>
        </section>

        {/* Toolbar & Table */}
        <section className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-200 flex flex-col xl:flex-row xl:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                placeholder="Search by name, city, ZIP, phone, or Gmail..."
                className="w-full pl-9 pr-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                disabled={!batch || batch.profiles.length === 0}
                onClick={() => void copyColumn('gmails')}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 whitespace-nowrap cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{bulkCopiedLabel === 'gmails' ? 'Copied Gmails' : 'Copy Gmails'}</span>
              </button>

              <button
                type="button"
                disabled={!batch || batch.profiles.length === 0}
                onClick={() => void copyColumn('phones')}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 whitespace-nowrap cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{bulkCopiedLabel === 'phones' ? 'Copied Numbers' : 'Copy Numbers'}</span>
              </button>

              <button
                type="button"
                disabled={!batch || batch.profiles.length === 0}
                onClick={onExportCsv}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 whitespace-nowrap cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" aria-hidden="true" />
                <span>.CSV</span>
              </button>

              <button
                type="button"
                disabled={!batch || batch.profiles.length === 0}
                onClick={onExportTxt}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 whitespace-nowrap cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5" aria-hidden="true" />
                <span>.TXT</span>
              </button>

              <button
                type="button"
                disabled={!batch || batch.profiles.length === 0}
                onClick={onExportJson}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 whitespace-nowrap cursor-pointer"
              >
                <FileJson className="w-3.5 h-3.5" aria-hidden="true" />
                <span>.JSON</span>
              </button>
            </div>
          </div>

          {!batch || batch.profiles.length === 0 ? (
            <div className="py-16 px-6 text-center">
              <p className="text-sm font-medium text-slate-700">No profiles generated yet</p>
              <button
                type="button"
                onClick={() => onGenerate(50)}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Generate 50 Sample Profiles</span>
              </button>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold text-slate-500">
                      <th className="py-2.5 pl-4 pr-2 w-12">#</th>
                      <th className="py-2.5 px-3">Full Name &amp; Gender</th>
                      <th className="py-2.5 px-3">Full Address</th>
                      <th className="py-2.5 px-3">Phone Number</th>
                      <th className="py-2.5 px-3">Gmail</th>
                      <th className="py-2.5 pl-3 pr-4 text-right w-32">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {pageRows.map((p, idx) => {
                      const rowNum = (safePage - 1) * PAGE_SIZE + idx + 1;
                      return (
                        <tr key={`${rowNum}-${p.gmail}`} className="hover:bg-slate-50/90 transition-colors">
                          <td className="py-2.5 pl-4 pr-2 font-mono text-slate-400 tabular-nums align-top">
                            {rowNum.toLocaleString('en-IN')}
                          </td>
                          <td className="py-2.5 px-3 align-top whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => void copyField(p.fullName, `name-${rowNum}`)}
                              className="text-left group cursor-pointer"
                              title="Click to copy name"
                            >
                              <div className="font-semibold text-slate-900 group-hover:text-blue-600">
                                {copiedKey === `name-${rowNum}` ? 'Copied!' : p.fullName}
                              </div>
                              <div className="text-[11px] text-slate-500">
                                {p.gender} · {p.country}
                              </div>
                            </button>
                          </td>
                          <td className="py-2.5 px-3 text-slate-700 align-top max-w-xs">
                            <button
                              type="button"
                              onClick={() => void copyField(p.fullAddress, `addr-${rowNum}`)}
                              className="text-left hover:text-blue-600 cursor-pointer"
                              title="Click to copy address"
                            >
                              {copiedKey === `addr-${rowNum}` ? (
                                <span className="text-emerald-700 font-medium">Address Copied</span>
                              ) : (
                                p.fullAddress
                              )}
                            </button>
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-800 whitespace-nowrap align-top">
                            <button
                              type="button"
                              onClick={() => void copyField(p.phone, `phone-${rowNum}`)}
                              className="hover:text-blue-600 cursor-pointer"
                              title="Click to copy phone"
                            >
                              {copiedKey === `phone-${rowNum}` ? 'Copied!' : p.phone}
                            </button>
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-800 whitespace-nowrap align-top">
                            <button
                              type="button"
                              onClick={() => void copyField(p.gmail, `mail-${rowNum}`)}
                              className="hover:text-blue-600 cursor-pointer"
                              title="Click to copy Gmail"
                            >
                              {copiedKey === `mail-${rowNum}` ? 'Copied!' : p.gmail}
                            </button>
                          </td>
                          <td className="py-2.5 pl-3 pr-4 text-right whitespace-nowrap align-top">
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => void copyField(formatRowLine(p), `row-${rowNum}`)}
                                className="px-2 py-1 text-[11px] font-medium rounded border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
                              >
                                {copiedKey === `row-${rowNum}` ? 'Copied' : 'Copy'}
                              </button>
                              <button
                                type="button"
                                onClick={() => onVerifyProfile(p.phone, p.gmail)}
                                className="px-2 py-1 text-[11px] font-medium rounded border border-slate-200 text-blue-600 hover:bg-blue-50 cursor-pointer"
                                title="Verify Phone & Gmail"
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
                    {((safePage - 1) * PAGE_SIZE + 1).toLocaleString('en-IN')}
                  </strong>
                  –
                  <strong className="font-mono text-slate-900">
                    {Math.min(safePage * PAGE_SIZE, filteredProfiles.length).toLocaleString('en-IN')}
                  </strong>{' '}
                  of{' '}
                  <strong className="font-mono text-slate-900">
                    {filteredProfiles.length.toLocaleString('en-IN')}
                  </strong>{' '}
                  profiles
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
    </div>
  );
}
