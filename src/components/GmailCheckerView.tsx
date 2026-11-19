import { useMemo, useState } from 'react';
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Copy,
  FileSpreadsheet,
  FileText,
  Globe,
  Mail,
  Search,
  ShieldAlert,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import {
  GmailValidationResult,
  validateGmailAddress,
} from '../engine/contactValidator';
import { parseCanonicalGmailBase } from '../engine/identityGenerator';

interface GmailCheckerViewProps {
  gmailInput: string;
  onChangeGmail: (val: string) => void;
  generatedGmails?: string[];
}

interface CheckedRow {
  index: number;
  raw: string;
  result: GmailValidationResult;
  isDuplicateCanonical: boolean;
  matchesBase: boolean | null;
}

const SAMPLE_LISTS = [
  {
    label: 'Mixed Real & Invalid Test',
    value: [
      'j.a.m.e.s.carter94@gmail.com',
      'jamescarter94+us101@gmail.com',
      'john_smith99@gmail.com',
      'abc@gamil.com',
      'mar..cus@gmail.com',
      'alex.morgan@googlemail.com',
    ].join('\n'),
  },
  {
    label: 'Strict Invalid Patterns',
    value: [
      'user_name99@gmail.com',
      'ab@gmail.com',
      '.leadingdot@gmail.com',
      'trailingdot.@gmail.com',
      'double..dot@gmail.com',
      'someone@gamil.com',
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

export function GmailCheckerView({
  gmailInput,
  onChangeGmail,
  generatedGmails = [],
}: GmailCheckerViewProps) {
  const [baseMatchInput, setBaseMatchInput] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'valid' | 'invalid' | 'duplicates'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [selectedIdx, setSelectedIdx] = useState<number>(0);
  const [copiedValid, setCopiedValid] = useState(false);

  const [dnsStatus, setDnsStatus] = useState<{
    loading: boolean;
    domain: string;
    mxRecords: string[];
    spfRecord: string | null;
    error: string | null;
  } | null>(null);

  const targetCanonicalBase = useMemo(
    () => parseCanonicalGmailBase(baseMatchInput),
    [baseMatchInput]
  );

  const analysis = useMemo(() => {
    const tokens = gmailInput
      .split(/[\r\n,;]+/)
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 100_000);

    const seenCanonical = new Set<string>();
    const rows: CheckedRow[] = [];
    let validCount = 0;
    let invalidCount = 0;
    let duplicateCount = 0;
    let baseMatchCount = 0;

    for (let i = 0; i < tokens.length; i++) {
      const raw = tokens[i];
      const result = validateGmailAddress(raw);
      let isDuplicateCanonical = false;
      let matchesBase: boolean | null = null;

      if (result.isValid) {
        validCount++;
        if (seenCanonical.has(result.normalizedEmail)) {
          isDuplicateCanonical = true;
          duplicateCount++;
        } else {
          seenCanonical.add(result.normalizedEmail);
        }
        if (targetCanonicalBase) {
          matchesBase = result.normalizedEmail === `${targetCanonicalBase}@gmail.com`;
          if (matchesBase) baseMatchCount++;
        }
      } else {
        invalidCount++;
        if (targetCanonicalBase) matchesBase = false;
      }

      rows.push({
        index: i + 1,
        raw,
        result,
        isDuplicateCanonical,
        matchesBase,
      });
    }

    return {
      rows,
      total: rows.length,
      validCount,
      invalidCount,
      duplicateCount,
      uniqueCanonicalCount: seenCanonical.size,
      baseMatchCount,
    };
  }, [gmailInput, targetCanonicalBase]);

  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return analysis.rows.filter((row) => {
      if (filterMode === 'valid' && !row.result.isValid) return false;
      if (filterMode === 'invalid' && row.result.isValid) return false;
      if (filterMode === 'duplicates' && !row.isDuplicateCanonical) return false;
      if (q && !row.raw.toLowerCase().includes(q) && !row.result.normalizedEmail.toLowerCase().includes(q)) {
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
    analysis.rows.find((r) => !r.result.isValid) ??
    analysis.rows[0] ??
    null;

  const runLiveDnsCheck = async () => {
    const domain = inspectedRow?.result.domain || 'gmail.com';
    setDnsStatus({ loading: true, domain, mxRecords: [], spfRecord: null, error: null });
    try {
      const [mxResp, txtResp] = await Promise.all([
        fetch(`https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=MX`),
        fetch(`https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=TXT`),
      ]);
      if (!mxResp.ok) throw new Error(`DNS query failed (${mxResp.status})`);
      const mxJson = (await mxResp.json()) as { Answer?: Array<{ data: string }> };
      const txtJson = txtResp.ok
        ? ((await txtResp.json()) as { Answer?: Array<{ data: string }> })
        : { Answer: [] };

      const mxRecords = (mxJson.Answer ?? []).map((a) => a.data);
      const spfRecord =
        (txtJson.Answer ?? []).map((a) => a.data).find((d) => d.toLowerCase().includes('spf')) ?? null;

      setDnsStatus({
        loading: false,
        domain,
        mxRecords,
        spfRecord,
        error: mxRecords.length === 0 ? `No MX mail servers found for ${domain}.` : null,
      });
    } catch (err) {
      setDnsStatus({
        loading: false,
        domain,
        mxRecords: [],
        spfRecord: null,
        error: err instanceof Error ? err.message : 'DNS lookup error.',
      });
    }
  };

  const handleCopyValid = async () => {
    const valids = analysis.rows.filter((r) => r.result.isValid).map((r) => r.raw);
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
    const valids = analysis.rows.filter((r) => r.result.isValid).map((r) => r.raw);
    if (valids.length === 0) return;
    triggerDownload(
      new Blob([valids.join('\n')], { type: 'text/plain;charset=utf-8' }),
      `valid-gmails-${valids.length}.txt`
    );
  };

  const handleExportReportCsv = () => {
    if (analysis.rows.length === 0) return;
    const chunks: string[] = ['gmail,status,canonical_inbox,duplicate_inbox,reason\n'];
    for (const r of analysis.rows) {
      const failReason = r.result.checks.find((c) => !c.passed)?.detail ?? 'All Google syntax rules passed';
      const line = [
        r.raw,
        r.result.isValid ? 'VALID' : 'INVALID',
        r.result.normalizedEmail,
        r.isDuplicateCanonical ? 'YES' : 'NO',
        failReason,
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(',');
      chunks.push(`${line}\n`);
    }
    triggerDownload(
      new Blob(chunks, { type: 'text/csv;charset=utf-8' }),
      `gmail-check-report-${analysis.rows.length}.csv`
    );
  };

  return (
    <div className="max-w-7xl mx-auto flex flex-col gap-6">
      {/* Top Header + Input Panel */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col gap-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Standalone Gmail Checker (Single &amp; Bulk)
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Check 1 or up to 1,00,000 Gmails for Google username rules, canonical inbox duplicates, typo domains, real base ownership, and live DNS MX + SPF records.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void runLiveDnsCheck()}
            disabled={dnsStatus?.loading}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-lg bg-slate-900 text-white hover:bg-slate-800 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Globe className="w-4 h-4" aria-hidden="true" />
            <span>{dnsStatus?.loading ? 'Checking DNS...' : 'Live Google DNS MX & SPF Check'}</span>
          </button>
        </div>

        {/* Sample / Import Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {SAMPLE_LISTS.map((s) => (
            <button
              key={s.label}
              type="button"
              onClick={() => {
                onChangeGmail(s.value);
                setSelectedIdx(0);
                setPage(1);
              }}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 cursor-pointer"
            >
              {s.label}
            </button>
          ))}
          {generatedGmails.length > 0 && (
            <button
              type="button"
              onClick={() => {
                onChangeGmail(generatedGmails.slice(0, 50_000).join('\n'));
                setSelectedIdx(0);
                setPage(1);
              }}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 cursor-pointer"
            >
              Load {Math.min(generatedGmails.length, 50_000).toLocaleString('en-IN')} Generated Gmails
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <label htmlFor="standalone-gmail-input" className="block text-xs font-semibold text-slate-700 mb-1.5">
              Paste Gmail Addresses (1 per line, or comma separated)
            </label>
            <textarea
              id="standalone-gmail-input"
              rows={5}
              value={gmailInput}
              onChange={(e) => {
                onChangeGmail(e.target.value);
                setSelectedIdx(0);
                setPage(1);
              }}
              placeholder="Paste single or bulk @gmail.com addresses here..."
              className="w-full p-3 font-mono text-xs text-slate-900 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div className="flex flex-col justify-between gap-3 p-4 rounded-lg bg-slate-50 border border-slate-200">
            <div>
              <label htmlFor="base-owner-matcher" className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 mb-1.5">
                <Mail className="w-3.5 h-3.5 text-blue-600" aria-hidden="true" />
                <span>Real Base Account Matcher (Optional)</span>
              </label>
              <input
                id="base-owner-matcher"
                type="email"
                value={baseMatchInput}
                onChange={(e) => setBaseMatchInput(e.target.value)}
                placeholder="e.g. yourname@gmail.com"
                className="w-full px-3 py-2 font-mono text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
              <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
                Enter your real base Gmail to verify 100% which pasted dot-variants or +aliases actually route into your live inbox.
              </p>
            </div>
            {targetCanonicalBase && (
              <div className="text-xs font-mono text-emerald-700 font-semibold pt-2 border-t border-slate-200">
                Matched to Base: {analysis.baseMatchCount.toLocaleString('en-IN')} / {analysis.total.toLocaleString('en-IN')}
              </div>
            )}
          </div>
        </div>

        {dnsStatus && !dnsStatus.loading && (
          <div
            className={`p-3.5 rounded-lg border text-xs ${
              dnsStatus.error
                ? 'bg-rose-50 border-rose-200 text-rose-800'
                : 'bg-emerald-50 border-emerald-200 text-emerald-950'
            }`}
          >
            {dnsStatus.error ? (
              <span>DNS Check ({dnsStatus.domain}): {dnsStatus.error}</span>
            ) : (
              <div className="flex flex-col gap-1">
                <div className="font-semibold">
                  Live DNS Verified for {dnsStatus.domain}: {dnsStatus.mxRecords.length} MX Mail Servers Active
                </div>
                <div className="font-mono text-[11px] text-emerald-800 break-all">
                  MX: {dnsStatus.mxRecords.slice(0, 3).join(' · ')}
                </div>
                {dnsStatus.spfRecord && (
                  <div className="font-mono text-[11px] text-emerald-800 break-all">
                    SPF: {dnsStatus.spfRecord}
                  </div>
                )}
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
          <div className="text-xs text-slate-500">Valid Gmail Format</div>
          <div className="font-mono text-xl font-semibold text-emerald-700 tabular-nums mt-0.5">
            {analysis.validCount.toLocaleString('en-IN')}
          </div>
        </div>
        <div className="pt-2 sm:pt-0 sm:px-4">
          <div className="text-xs text-slate-500">Invalid / Rejected</div>
          <div className="font-mono text-xl font-semibold text-rose-700 tabular-nums mt-0.5">
            {analysis.invalidCount.toLocaleString('en-IN')}
          </div>
        </div>
        <div className="pt-2 sm:pt-0 sm:pl-4">
          <div className="text-xs text-slate-500">Unique Canonical Inboxes</div>
          <div className="font-mono text-xl font-semibold text-slate-900 tabular-nums mt-0.5">
            {analysis.uniqueCanonicalCount.toLocaleString('en-IN')}
          </div>
        </div>
      </section>

      {/* Main Split: Bulk Results Table + Single Rule Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <section className="lg:col-span-2 bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
              {(
                [
                  { id: 'all', label: `All (${analysis.total})` },
                  { id: 'valid', label: `Valid (${analysis.validCount})` },
                  { id: 'invalid', label: `Invalid (${analysis.invalidCount})` },
                  { id: 'duplicates', label: `Duplicates (${analysis.duplicateCount})` },
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
                <span>{copiedValid ? 'Copied Valid' : 'Copy Valid'}</span>
              </button>
              <button
                type="button"
                disabled={analysis.validCount === 0}
                onClick={handleExportValidTxt}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Valid .TXT</span>
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
                placeholder="Filter checked results..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold text-slate-500">
                  <th className="py-2.5 pl-4 pr-2 w-12">#</th>
                  <th className="py-2.5 px-3">Gmail Address</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Canonical Inbox</th>
                  <th className="py-2.5 pl-3 pr-4">Rule Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {pageRows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-10 px-4 text-center text-slate-500">
                      No emails match the current filter.
                    </td>
                  </tr>
                ) : (
                  pageRows.map((row) => {
                    const firstFail = row.result.checks.find((c) => !c.passed);
                    const isSelected = inspectedRow?.index === row.index;
                    return (
                      <tr
                        key={`${row.index}-${row.raw}`}
                        onClick={() => setSelectedIdx(row.index - 1)}
                        className={`cursor-pointer transition-colors ${
                          isSelected ? 'bg-blue-50/60' : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className="py-2.5 pl-4 pr-2 font-mono text-slate-400 tabular-nums">
                          {row.index}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-900 break-all">
                          {row.raw}
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          {row.result.isValid ? (
                            <span className="font-mono font-semibold text-emerald-700">
                              {row.matchesBase === true ? 'BASE MATCH' : 'VALID'}
                            </span>
                          ) : (
                            <span className="font-mono font-semibold text-rose-700">INVALID</span>
                          )}
                          {row.isDuplicateCanonical && (
                            <span className="ml-1.5 text-[11px] text-amber-700 font-medium">
                              · Dup
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-600 break-all">
                          {row.result.isValid ? row.result.normalizedEmail : '—'}
                        </td>
                        <td className="py-2.5 pl-3 pr-4 text-slate-600">
                          {firstFail ? firstFail.detail : 'Passes Google username & domain rules'}
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

        {/* Right Side: Deep Rule Inspector for Selected Row */}
        <aside className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col gap-4 self-start">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            {inspectedRow?.result.isValid ? (
              <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" aria-hidden="true" />
            ) : (
              <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0" aria-hidden="true" />
            )}
            <div className="min-w-0">
              <div className="text-sm font-bold text-slate-900 truncate">
                {inspectedRow ? inspectedRow.raw : 'No Email Selected'}
              </div>
              <div className="text-xs text-slate-500">
                {inspectedRow?.result.isValid
                  ? `Canonical: ${inspectedRow.result.normalizedEmail}`
                  : 'Click any row on the left to inspect'}
              </div>
            </div>
          </div>

          {inspectedRow && (
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
          )}

          <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-950 leading-relaxed">
            <strong>Honest Verification Scope:</strong> Verifies Google&apos;s strict character/length/dot rules, detects canonical inbox duplicates, matches against your real base Gmail, and queries live Google DNS MX &amp; SPF records. Private third-party mailbox registration on <span className="font-mono">accounts.google.com</span> cannot be probed externally without sending a verification email/OTP.
          </div>
        </aside>
      </div>
    </div>
  );
}
