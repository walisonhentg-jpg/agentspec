import { useMemo, useState } from 'react';
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Copy,
  FileSpreadsheet,
  FileText,
  Globe,
  MapPin,
  Search,
  ShieldAlert,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import {
  AddressValidationResult,
  validateStreetAddress,
} from '../engine/contactValidator';
import { IdentityProfile } from '../engine/identityGenerator';

interface AddressCheckerViewProps {
  addressInput: string;
  onChangeAddress: (val: string) => void;
  activeProfiles: IdentityProfile[];
}

interface CheckedAddressRow {
  index: number;
  raw: string;
  result: AddressValidationResult;
}

const SAMPLE_ADDRESSES = [
  {
    label: 'Valid US / UK / EU Mix',
    value: [
      '350 Fifth Avenue, New York, NY 10118, USA',
      '221B Baker Street, London, NW1 6XE, United Kingdom',
      'Friedrichstraße 43, 10969 Berlin, Germany',
      '24 Rue du Faubourg Saint-Honoré, 75008 Paris, France',
    ].join('\n'),
  },
  {
    label: 'Fraud: US State-ZIP Mismatch & Dummy',
    value: [
      '120 Broadway, New York, NY 90210, USA',
      '12345 Main Fake Street, Testville, CA 90001, USA',
      'P.O. Box 4421, Miami, FL 33101, USA',
      'No Street Number Avenue, Chicago, IL 60601, USA',
    ].join('\n'),
  },
];

const PAGE_SIZE = 100;

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function AddressCheckerView({
  addressInput,
  onChangeAddress,
  activeProfiles,
}: AddressCheckerViewProps) {
  const [filterMode, setFilterMode] = useState<'all' | 'valid' | 'suspicious' | 'invalid'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [selectedIdx, setSelectedIdx] = useState<number>(0);
  const [copiedValid, setCopiedValid] = useState(false);

  const [geoStatus, setGeoStatus] = useState<{
    loading: boolean;
    query: string;
    matchedDisplay: string | null;
    lat: string | null;
    lon: string | null;
    error: string | null;
  } | null>(null);

  const analysis = useMemo(() => {
    const lines = addressInput
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 50_000);

    const rows: CheckedAddressRow[] = [];
    let validCount = 0;
    let suspiciousCount = 0;
    let invalidCount = 0;

    for (let i = 0; i < lines.length; i++) {
      const raw = lines[i];
      const result = validateStreetAddress(raw);
      if (result.verdict === 'REAL_FORMAT') validCount++;
      else if (result.verdict === 'SUSPICIOUS') suspiciousCount++;
      else invalidCount++;
      rows.push({ index: i + 1, raw, result });
    }

    return {
      rows,
      total: rows.length,
      validCount,
      suspiciousCount,
      invalidCount,
    };
  }, [addressInput]);

  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return analysis.rows.filter((row) => {
      if (filterMode === 'valid' && row.result.verdict !== 'REAL_FORMAT') return false;
      if (filterMode === 'suspicious' && row.result.verdict !== 'SUSPICIOUS') return false;
      if (filterMode === 'invalid' && row.result.verdict !== 'INVALID_OR_FRAUD') return false;
      if (
        q &&
        !row.raw.toLowerCase().includes(q) &&
        !row.result.countryName.toLowerCase().includes(q) &&
        !row.result.postalCode.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [analysis.rows, filterMode, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filteredRows.slice(start, start + PAGE_SIZE);
  }, [filteredRows, safePage]);

  const inspectedRow =
    analysis.rows[selectedIdx] ??
    analysis.rows.find((r) => r.result.verdict !== 'REAL_FORMAT') ??
    analysis.rows[0] ??
    null;

  const runLiveGeoVerify = async () => {
    const query = inspectedRow?.raw;
    if (!query) return;
    setGeoStatus({
      loading: true,
      query,
      matchedDisplay: null,
      lat: null,
      lon: null,
      error: null,
    });

    try {
      const resp = await fetch(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(query)}`
      );
      if (!resp.ok) throw new Error(`Geocoder returned HTTP ${resp.status}`);
      const results = (await resp.json()) as Array<{
        display_name?: string;
        lat?: string;
        lon?: string;
      }>;
      if (!results || results.length === 0) {
        setGeoStatus({
          loading: false,
          query,
          matchedDisplay: null,
          lat: null,
          lon: null,
          error: 'No real-world street match found on OpenStreetMap for this exact query.',
        });
      } else {
        setGeoStatus({
          loading: false,
          query,
          matchedDisplay: results[0].display_name ?? 'Matched location',
          lat: results[0].lat ?? null,
          lon: results[0].lon ?? null,
          error: null,
        });
      }
    } catch (err) {
      setGeoStatus({
        loading: false,
        query,
        matchedDisplay: null,
        lat: null,
        lon: null,
        error: err instanceof Error ? err.message : 'Live geo lookup failed.',
      });
    }
  };

  const handleCopyValid = async () => {
    const valids = analysis.rows
      .filter((r) => r.result.verdict === 'REAL_FORMAT')
      .map((r) => r.raw);
    if (valids.length === 0) return;
    try {
      await navigator.clipboard.writeText(valids.join('\n'));
      setCopiedValid(true);
      setTimeout(() => setCopiedValid(false), 1800);
    } catch {
      // Clipboard blocked
    }
  };

  const handleExportValidTxt = () => {
    const valids = analysis.rows
      .filter((r) => r.result.verdict === 'REAL_FORMAT')
      .map((r) => r.raw);
    if (valids.length === 0) return;
    triggerDownload(
      new Blob([valids.join('\n')], { type: 'text/plain;charset=utf-8' }),
      `valid-addresses-${valids.length}.txt`
    );
  };

  const handleExportReportCsv = () => {
    if (analysis.rows.length === 0) return;
    const chunks: string[] = ['address,verdict,country,postal_code,address_type,reason\n'];
    for (const r of analysis.rows) {
      const failReason =
        r.result.checks.find((c) => !c.passed)?.detail ?? 'All street & postal coherence checks passed';
      const line = [
        r.raw,
        r.result.verdict,
        r.result.countryName,
        r.result.postalCode,
        r.result.addressType,
        failReason,
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(',');
      chunks.push(`${line}\n`);
    }
    triggerDownload(
      new Blob(chunks, { type: 'text/csv;charset=utf-8' }),
      `address-check-report-${analysis.rows.length}.csv`
    );
  };

  return (
    <div className="max-w-7xl mx-auto flex flex-col gap-6">
      {/* Header & Input */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col gap-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-xl font-bold text-slate-900 tracking-tight">
              Hardened Street Address &amp; Postal Fraud Checker
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Validates street building numbers, US State ↔ ZIP prefix coherence, UK/EU/CA postal formats, blocks fake/dummy words &amp; P.O. Box traps, and checks live OpenStreetMap geocoding.
            </p>
          </div>

          <button
            type="button"
            disabled={!inspectedRow || geoStatus?.loading}
            onClick={() => void runLiveGeoVerify()}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-lg bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-40 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Globe className="w-4 h-4" aria-hidden="true" />
            <span>{geoStatus?.loading ? 'Checking OSM...' : 'Live Geo Verify (OSM)'}</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {SAMPLE_ADDRESSES.map((s) => (
            <button
              key={s.label}
              type="button"
              onClick={() => {
                onChangeAddress(s.value);
                setSelectedIdx(0);
                setPage(1);
                setGeoStatus(null);
              }}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 cursor-pointer"
            >
              {s.label}
            </button>
          ))}
          {activeProfiles.length > 0 && (
            <button
              type="button"
              onClick={() => {
                onChangeAddress(activeProfiles.slice(0, 50_000).map((p) => p.fullAddress).join('\n'));
                setSelectedIdx(0);
                setPage(1);
                setGeoStatus(null);
              }}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 cursor-pointer"
            >
              Load {Math.min(activeProfiles.length, 50_000).toLocaleString('en-IN')} Generated Profile Addresses
            </button>
          )}
        </div>

        <div>
          <label htmlFor="address-check-input" className="block text-xs font-semibold text-slate-700 mb-1.5">
            Paste Street Addresses (1 per line, e.g. 350 Fifth Avenue, New York, NY 10118, USA)
          </label>
          <textarea
            id="address-check-input"
            rows={4}
            value={addressInput}
            onChange={(e) => {
              onChangeAddress(e.target.value);
              setSelectedIdx(0);
              setPage(1);
              setGeoStatus(null);
            }}
            placeholder="Paste single or bulk street addresses (one per line)..."
            className="w-full p-3 font-mono text-xs text-slate-900 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-600"
          />
        </div>

        {geoStatus && !geoStatus.loading && (
          <div
            className={`p-3.5 rounded-lg border text-xs ${
              geoStatus.error
                ? 'bg-amber-50 border-amber-200 text-amber-950'
                : 'bg-emerald-50 border-emerald-200 text-emerald-950'
            }`}
          >
            {geoStatus.error ? (
              <span>OSM Live Geo Check: {geoStatus.error}</span>
            ) : (
              <div className="flex flex-col gap-1">
                <div className="font-semibold">
                  Live Geo Match Found ({geoStatus.lat}, {geoStatus.lon})
                </div>
                <div className="text-emerald-900">{geoStatus.matchedDisplay}</div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Metrics Strip */}
      <section className="bg-white border border-slate-200 rounded-xl px-5 py-4 grid grid-cols-2 sm:grid-cols-4 gap-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
        <div className="pt-2 sm:pt-0 sm:pr-4">
          <div className="text-xs text-slate-500">Total Checked</div>
          <div className="font-mono text-xl font-semibold text-slate-900 tabular-nums mt-0.5">
            {analysis.total.toLocaleString('en-IN')}
          </div>
        </div>
        <div className="pt-2 sm:pt-0 sm:px-4">
          <div className="text-xs text-slate-500">Real Format</div>
          <div className="font-mono text-xl font-semibold text-emerald-700 tabular-nums mt-0.5">
            {analysis.validCount.toLocaleString('en-IN')}
          </div>
        </div>
        <div className="pt-2 sm:pt-0 sm:px-4">
          <div className="text-xs text-slate-500">Suspicious / P.O. Box</div>
          <div className="font-mono text-xl font-semibold text-amber-700 tabular-nums mt-0.5">
            {analysis.suspiciousCount.toLocaleString('en-IN')}
          </div>
        </div>
        <div className="pt-2 sm:pt-0 sm:pl-4">
          <div className="text-xs text-slate-500">Invalid / Fraud</div>
          <div className="font-mono text-xl font-semibold text-rose-700 tabular-nums mt-0.5">
            {analysis.invalidCount.toLocaleString('en-IN')}
          </div>
        </div>
      </section>

      {/* Split Table + Deep Address Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <section className="lg:col-span-2 bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
              {(
                [
                  { id: 'all', label: `All (${analysis.total})` },
                  { id: 'valid', label: `Real (${analysis.validCount})` },
                  { id: 'suspicious', label: `Warn (${analysis.suspiciousCount})` },
                  { id: 'invalid', label: `Fraud/Invalid (${analysis.invalidCount})` },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setFilterMode(tab.id);
                    setPage(1);
                  }}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                    filterMode === tab.id
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                disabled={analysis.validCount === 0}
                onClick={() => void handleCopyValid()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{copiedValid ? 'Copied Valid' : 'Copy Real'}</span>
              </button>
              <button
                type="button"
                disabled={analysis.validCount === 0}
                onClick={handleExportValidTxt}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Real .TXT</span>
              </button>
              <button
                type="button"
                disabled={analysis.total === 0}
                onClick={handleExportReportCsv}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Report .CSV</span>
              </button>
            </div>
          </div>

          <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50/50">
            <div className="relative max-w-sm">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                placeholder="Filter by street, country, or ZIP..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold text-slate-500">
                  <th className="py-2.5 pl-4 pr-2 w-12">#</th>
                  <th className="py-2.5 px-3">Street Address</th>
                  <th className="py-2.5 px-3">Country · Postal</th>
                  <th className="py-2.5 px-3">Verdict</th>
                  <th className="py-2.5 pl-3 pr-4">Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {pageRows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-10 px-4 text-center text-slate-500">
                      No addresses match the current filter.
                    </td>
                  </tr>
                ) : (
                  pageRows.map((row) => {
                    const firstFail = row.result.checks.find((c) => !c.passed);
                    const isSelected = inspectedRow?.index === row.index;
                    return (
                      <tr
                        key={`${row.index}-${row.raw.slice(0, 20)}`}
                        onClick={() => {
                          setSelectedIdx(row.index - 1);
                          setGeoStatus(null);
                        }}
                        className={`cursor-pointer transition-colors ${
                          isSelected ? 'bg-blue-50/60' : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className="py-2.5 pl-4 pr-2 font-mono text-slate-400 tabular-nums">
                          {row.index}
                        </td>
                        <td className="py-2.5 px-3 text-slate-900">
                          {row.raw}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-600 whitespace-nowrap">
                          {row.result.countryCode} · {row.result.postalCode}
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span
                            className={`font-mono font-semibold ${
                              row.result.verdict === 'REAL_FORMAT'
                                ? 'text-emerald-700'
                                : row.result.verdict === 'SUSPICIOUS'
                                ? 'text-amber-700'
                                : 'text-rose-700'
                            }`}
                          >
                            {row.result.verdict === 'REAL_FORMAT'
                              ? 'REAL FORMAT'
                              : row.result.verdict === 'SUSPICIOUS'
                              ? 'PO BOX / WARN'
                              : 'FRAUD / INVALID'}
                          </span>
                        </td>
                        <td className="py-2.5 pl-3 pr-4 text-slate-600">
                          {firstFail ? firstFail.detail : 'Passes street, postal & state coherence'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="px-4 py-3 border-t border-slate-200 bg-slate-50/50 flex items-center justify-between text-xs text-slate-600">
            <span className="tabular-nums">
              Page <strong className="font-mono text-slate-900">{safePage}</strong> /{' '}
              <strong className="font-mono text-slate-900">{totalPages}</strong>
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-slate-200 bg-white text-slate-700 disabled:opacity-40 cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Prev</span>
              </button>
              <button
                type="button"
                disabled={safePage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-slate-200 bg-white text-slate-700 disabled:opacity-40 cursor-pointer"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </div>
          </div>
        </section>

        {/* Right Side: Parsed Components & 6 Rule Checks */}
        <aside className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col gap-4 self-start">
          <div className="flex items-start gap-2.5 pb-3 border-b border-slate-100">
            {inspectedRow?.result.verdict === 'REAL_FORMAT' ? (
              <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" aria-hidden="true" />
            ) : (
              <ShieldAlert
                className={`w-5 h-5 shrink-0 mt-0.5 ${
                  inspectedRow?.result.verdict === 'SUSPICIOUS' ? 'text-amber-600' : 'text-rose-600'
                }`}
                aria-hidden="true"
              />
            )}
            <div className="min-w-0">
              <div className="text-sm font-bold text-slate-900">
                {inspectedRow
                  ? inspectedRow.result.verdict === 'REAL_FORMAT'
                    ? 'Verified Street & Postal Format'
                    : inspectedRow.result.verdict === 'SUSPICIOUS'
                    ? 'P.O. Box / Residential Warning'
                    : 'Fraudulent or Invalid Address'
                  : 'No Address Selected'}
              </div>
              <div className="text-xs text-slate-500 mt-0.5 break-words">
                {inspectedRow ? inspectedRow.raw : 'Click any address row to inspect'}
              </div>
            </div>
          </div>

          {inspectedRow && (
            <>
              <dl className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                <div>
                  <dt className="text-[10px] text-slate-500 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-blue-600" aria-hidden="true" />
                    Country
                  </dt>
                  <dd className="font-semibold text-slate-900 mt-0.5">
                    {inspectedRow.result.countryName} ({inspectedRow.result.countryCode})
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] text-slate-500">Postal / ZIP</dt>
                  <dd className="font-mono font-semibold text-slate-900 mt-0.5">
                    {inspectedRow.result.postalCode}
                  </dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-[10px] text-slate-500">Street Line</dt>
                  <dd className="font-medium text-slate-900 mt-0.5">{inspectedRow.result.streetLine}</dd>
                </div>
                <div>
                  <dt className="text-[10px] text-slate-500">City / Locality</dt>
                  <dd className="font-medium text-slate-900 mt-0.5">{inspectedRow.result.city}</dd>
                </div>
                <div>
                  <dt className="text-[10px] text-slate-500">State / Type</dt>
                  <dd className="font-medium text-slate-900 mt-0.5">
                    {inspectedRow.result.stateOrRegion} · {inspectedRow.result.addressType === 'PO_BOX_OR_PMB' ? 'P.O. Box' : 'Street'}
                  </dd>
                </div>
              </dl>

              <div className="divide-y divide-slate-100">
                {inspectedRow.result.checks.map((c) => (
                  <div key={c.id} className="py-2.5 flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2">
                      {c.passed ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" aria-hidden="true" />
                      ) : (
                        <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" aria-hidden="true" />
                      )}
                      <div>
                        <div className="text-xs font-semibold text-slate-900">{c.label}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">{c.detail}</div>
                      </div>
                    </div>
                    <span className={`text-[11px] font-mono font-semibold shrink-0 ${c.passed ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {c.passed ? 'PASS' : 'FAIL'}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
