import { useEffect, useMemo, useState } from 'react';
import {
  Camera,
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
  UserCircle2,
  XCircle,
} from 'lucide-react';
import {
  GmailValidationResult,
  probeEmailAvatar,
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

interface AvatarProbeState {
  loading: boolean;
  hasPic: boolean;
  url: string | null;
  sha256: string;
}

const SAMPLE_LISTS = [
  {
    label: 'Mixed Real & Fraud Test',
    value: [
      'j.a.m.e.s.carter94@gmail.com',
      'jamescarter94+us101@gmail.com',
      'john_smith99@gmail.com',
      '12345678@gmail.com',
      'fakeuser99@mailinator.com',
      'abc@gamil.com',
      'mar..cus@gmail.com',
      'alex.morgan@googlemail.com',
    ].join('\n'),
  },
  {
    label: 'Strict Anti-Bot & Fraud Traps',
    value: [
      'user_name99@gmail.com',
      '987654321@gmail.com',
      'testaccount01@gmail.com',
      'aaaaaa123@gmail.com',
      'someone@mail.gmail.com',
      'botuser@yopmail.com',
      '.leadingdot@gmail.com',
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

function getEmailInitials(email: string): string {
  const local = email.split('@')[0]?.replace(/[^a-z0-9]/gi, '') ?? '';
  if (!local) return 'GM';
  return local.slice(0, 2).toUpperCase();
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
  const [avatarMap, setAvatarMap] = useState<Record<string, AvatarProbeState>>({});
  const [isScanningPics, setIsScanningPics] = useState(false);

  const [dnsStatus, setDnsStatus] = useState<{
    loading: boolean;
    domain: string;
    mxRecords: string[];
    spfRecord: string | null;
    dmarcRecord: string | null;
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

  // Probe Gravatar SHA-256 public profile picture whenever selected email changes
  useEffect(() => {
    const emailKey = inspectedRow?.result.isValid
      ? inspectedRow.result.normalizedEmail
      : inspectedRow?.raw.trim().toLowerCase();
    if (!emailKey || !emailKey.includes('@')) return;
    if (avatarMap[emailKey]) return;

    let cancelled = false;
    setAvatarMap((prev) => ({
      ...prev,
      [emailKey]: { loading: true, hasPic: false, url: null, sha256: '' },
    }));

    void probeEmailAvatar(emailKey, 160).then((res) => {
      if (cancelled) return;
      setAvatarMap((prev) => ({
        ...prev,
        [emailKey]: {
          loading: false,
          hasPic: res.hasPic,
          url: res.url,
          sha256: res.sha256,
        },
      }));
    });

    return () => {
      cancelled = true;
    };
  }, [inspectedRow, avatarMap]);

  const runBatchPageAvatarScan = async () => {
    const targets = pageRows
      .filter((r) => r.result.isValid)
      .map((r) => r.result.normalizedEmail)
      .filter((email, i, arr) => arr.indexOf(email) === i);
    if (targets.length === 0) return;

    setIsScanningPics(true);
    const chunkSize = 8;
    for (let i = 0; i < targets.length; i += chunkSize) {
      const chunk = targets.slice(i, i + chunkSize);
      const results = await Promise.all(chunk.map((e) => probeEmailAvatar(e, 96)));
      setAvatarMap((prev) => {
        const next = { ...prev };
        for (let j = 0; j < chunk.length; j++) {
          next[chunk[j]] = {
            loading: false,
            hasPic: results[j].hasPic,
            url: results[j].url,
            sha256: results[j].sha256,
          };
        }
        return next;
      });
    }
    setIsScanningPics(false);
  };

  const runLiveDnsCheck = async () => {
    const domain = inspectedRow?.result.domain || 'gmail.com';
    setDnsStatus({ loading: true, domain, mxRecords: [], spfRecord: null, dmarcRecord: null, error: null });
    try {
      const [mxResp, txtResp, dmarcResp] = await Promise.all([
        fetch(`https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=MX`),
        fetch(`https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=TXT`),
        fetch(`https://dns.google/resolve?name=${encodeURIComponent(`_dmarc.${domain}`)}&type=TXT`),
      ]);
      if (!mxResp.ok) throw new Error(`DNS query failed (${mxResp.status})`);
      const mxJson = (await mxResp.json()) as { Answer?: Array<{ data: string }> };
      const txtJson = txtResp.ok
        ? ((await txtResp.json()) as { Answer?: Array<{ data: string }> })
        : { Answer: [] };
      const dmarcJson = dmarcResp.ok
        ? ((await dmarcResp.json()) as { Answer?: Array<{ data: string }> })
        : { Answer: [] };

      const mxRecords = (mxJson.Answer ?? []).map((a) => a.data);
      const spfRecord =
        (txtJson.Answer ?? []).map((a) => a.data).find((d) => d.toLowerCase().includes('spf')) ?? null;
      const dmarcRecord =
        (dmarcJson.Answer ?? []).map((a) => a.data).find((d) => d.toLowerCase().includes('dmarc')) ?? null;

      setDnsStatus({
        loading: false,
        domain,
        mxRecords,
        spfRecord,
        dmarcRecord,
        error: mxRecords.length === 0 ? `No MX mail servers found for ${domain}.` : null,
      });
    } catch (err) {
      setDnsStatus({
        loading: false,
        domain,
        mxRecords: [],
        spfRecord: null,
        dmarcRecord: null,
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
    const chunks: string[] = ['gmail,status,risk_level,canonical_inbox,duplicate_inbox,public_pic,reason\n'];
    for (const r of analysis.rows) {
      const failReason = r.result.checks.find((c) => !c.passed)?.detail ?? 'All Google syntax & anti-fraud rules passed';
      const picState = avatarMap[r.result.normalizedEmail];
      const line = [
        r.raw,
        r.result.isValid ? 'VALID' : 'INVALID',
        r.result.riskLevel,
        r.result.normalizedEmail,
        r.isDuplicateCanonical ? 'YES' : 'NO',
        picState ? (picState.hasPic ? 'PIC_FOUND' : 'NO_PUBLIC_PIC') : 'UNCHECKED',
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

  const inspectedAvatarKey = inspectedRow?.result.isValid
    ? inspectedRow.result.normalizedEmail
    : inspectedRow?.raw.trim().toLowerCase() ?? '';
  const inspectedAvatar = inspectedAvatarKey ? avatarMap[inspectedAvatarKey] : undefined;

  return (
    <div className="max-w-7xl mx-auto flex flex-col gap-6">
      {/* Top Header + Input Panel */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col gap-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Hardened Gmail Fraud, Bot &amp; Profile Pic Checker
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Enforces Google&apos;s strict letter-required &amp; 6–30 char rules, blocks disposable/bot/dummy traps, scans SHA-256 Gravatar public profile pictures, and checks live DNS MX + SPF + DMARC records.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => void runBatchPageAvatarScan()}
              disabled={isScanningPics || pageRows.length === 0}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg border border-slate-200 bg-white text-slate-800 hover:bg-slate-50 disabled:opacity-40 whitespace-nowrap cursor-pointer"
            >
              <Camera className="w-4 h-4 text-blue-600" aria-hidden="true" />
              <span>{isScanningPics ? 'Scanning Pics...' : 'Scan Page Pics'}</span>
            </button>
            <button
              type="button"
              onClick={() => void runLiveDnsCheck()}
              disabled={dnsStatus?.loading}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-lg bg-slate-900 text-white hover:bg-slate-800 whitespace-nowrap cursor-pointer"
            >
              <Globe className="w-4 h-4" aria-hidden="true" />
              <span>{dnsStatus?.loading ? 'Checking DNS...' : 'Live MX / SPF / DMARC'}</span>
            </button>
          </div>
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
                {dnsStatus.dmarcRecord && (
                  <div className="font-mono text-[11px] text-emerald-800 break-all">
                    DMARC: {dnsStatus.dmarcRecord}
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
          <div className="text-xs text-slate-500">Fraud / Rejected</div>
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

      {/* Main Split: Bulk Results Table + Single Rule & Profile Pic Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <section className="lg:col-span-2 bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
              {(
                [
                  { id: 'all', label: `All (${analysis.total})` },
                  { id: 'valid', label: `Valid (${analysis.validCount})` },
                  { id: 'invalid', label: `Fraud/Invalid (${analysis.invalidCount})` },
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
                  <th className="py-2.5 px-3">Status / Risk</th>
                  <th className="py-2.5 px-3">Pic</th>
                  <th className="py-2.5 px-3">Canonical Inbox</th>
                  <th className="py-2.5 pl-3 pr-4">Rule Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {pageRows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 px-4 text-center text-slate-500">
                      No emails match the current filter.
                    </td>
                  </tr>
                ) : (
                  pageRows.map((row) => {
                    const firstFail = row.result.checks.find((c) => !c.passed);
                    const isSelected = inspectedRow?.index === row.index;
                    const rowAvatar = avatarMap[row.result.normalizedEmail];
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
                            <span
                              className={`font-mono font-semibold ${
                                row.result.riskLevel === 'MEDIUM'
                                  ? 'text-amber-700'
                                  : 'text-emerald-700'
                              }`}
                            >
                              {row.matchesBase === true
                                ? 'BASE MATCH'
                                : row.result.riskLevel === 'MEDIUM'
                                ? 'VALID (MED)'
                                : 'VALID'}
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
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          {rowAvatar?.hasPic && rowAvatar.url ? (
                            <img
                              src={rowAvatar.url}
                              alt=""
                              className="w-6 h-6 rounded-full object-cover border border-emerald-300"
                            />
                          ) : rowAvatar && !rowAvatar.loading ? (
                            <span className="text-[10px] font-mono text-slate-400">NONE</span>
                          ) : (
                            <span className="text-[10px] font-mono text-slate-300">—</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-600 break-all">
                          {row.result.isValid ? row.result.normalizedEmail : '—'}
                        </td>
                        <td className="py-2.5 pl-3 pr-4 text-slate-600">
                          {firstFail
                            ? firstFail.detail
                            : row.result.patternFlag
                            ? `Passed · Caution: ${row.result.patternFlag}`
                            : 'Passes Google syntax & anti-fraud rules'}
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

        {/* Right Side: Deep Rule & Profile Picture Inspector for Selected Row */}
        <aside className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col gap-4 self-start">
          {/* Profile Pic Detection Card */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-3.5">
            {inspectedAvatar?.hasPic && inspectedAvatar.url ? (
              <img
                src={inspectedAvatar.url}
                alt={`Profile picture for ${inspectedRow?.raw ?? 'selected email'}`}
                className="w-14 h-14 rounded-full object-cover border-2 border-emerald-500 shrink-0 bg-white"
              />
            ) : (
              <div className="w-14 h-14 rounded-full bg-slate-200 text-slate-700 font-display font-bold text-base flex items-center justify-center shrink-0">
                {inspectedRow ? getEmailInitials(inspectedRow.raw) : <UserCircle2 className="w-7 h-7 text-slate-400" />}
              </div>
            )}

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                {inspectedAvatar?.loading ? (
                  <span className="text-[11px] font-mono font-semibold text-blue-700">
                    Probing Public Avatar...
                  </span>
                ) : inspectedAvatar?.hasPic ? (
                  <span className="text-[11px] font-mono font-semibold text-emerald-700">
                    PIC DETECTED (Gravatar Public Photo)
                  </span>
                ) : (
                  <span className="text-[11px] font-mono font-semibold text-slate-600">
                    NO PUBLIC PIC FOUND
                  </span>
                )}
              </div>
              <div className="text-xs font-mono text-slate-800 truncate mt-0.5">
                {inspectedRow ? inspectedRow.raw : 'No Email Selected'}
              </div>
              {inspectedAvatar?.sha256 && (
                <div className="text-[10px] font-mono text-slate-400 truncate mt-0.5">
                  SHA256: {inspectedAvatar.sha256.slice(0, 18)}…
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5 min-w-0">
              {inspectedRow?.result.isValid ? (
                <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" aria-hidden="true" />
              ) : (
                <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0" aria-hidden="true" />
              )}
              <div className="min-w-0">
                <div className="text-sm font-bold text-slate-900 truncate">
                  {inspectedRow?.result.isValid ? 'Valid Gmail Structure' : 'Rejected / Fraud'}
                </div>
                <div className="text-xs text-slate-500 truncate">
                  {inspectedRow?.result.isValid
                    ? `Canonical: ${inspectedRow.result.normalizedEmail}`
                    : 'Click any row on the left to inspect'}
                </div>
              </div>
            </div>

            {inspectedRow && (
              <span
                className={`text-[11px] font-mono font-semibold px-2 py-0.5 rounded shrink-0 ${
                  inspectedRow.result.riskLevel === 'LOW'
                    ? 'bg-emerald-100 text-emerald-800'
                    : inspectedRow.result.riskLevel === 'MEDIUM'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-rose-100 text-rose-800'
                }`}
              >
                RISK: {inspectedRow.result.riskLevel}
              </span>
            )}
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
            <strong>Honest Verification Scope:</strong> Verifies Google&apos;s strict character, letter-required, dot &amp; anti-bot rules, detects real public Gravatar profile pictures via SHA-256 lookup, and queries live Google DNS MX/SPF/DMARC records. Private profile photos inside <span className="font-mono">accounts.google.com</span> are protected by Google privacy and cannot be scraped without OAuth sign-in.
          </div>
        </aside>
      </div>
    </div>
  );
}
