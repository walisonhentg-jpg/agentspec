import { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Globe,
  Mail,
  Phone,
  ShieldAlert,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import {
  probeEmailAvatar,
  validateGmailAddress,
  validatePhoneNumber,
} from '../engine/contactValidator';
import { IdentityProfile } from '../engine/identityGenerator';

interface PhoneGmailCheckerViewProps {
  phoneInput: string;
  gmailInput: string;
  activeProfiles: IdentityProfile[];
  onChangePhone: (v: string) => void;
  onChangeGmail: (v: string) => void;
}

const SAMPLE_TESTS = [
  {
    label: 'Valid USA (+1 NYC)',
    phone: '+1 (212) 648-3910',
    gmail: 'james.carter94@gmail.com',
  },
  {
    label: 'Valid UK (+44 Mobile)',
    phone: '+44 7742 819304',
    gmail: 'olivia.bennett1996@gmail.com',
  },
  {
    label: 'Valid Germany (+49)',
    phone: '+49 171 8492014',
    gmail: 'lukas.weber.de88@gmail.com',
  },
  {
    label: 'Invalid: Fake 555 + Underscore',
    phone: '+1 (212) 555-0199',
    gmail: 'john_smith99@gmail.com',
  },
  {
    label: 'Invalid: Short Gmail + Bad UK',
    phone: '+44 7700 900123',
    gmail: 'abc@gamil.com',
  },
];

export function PhoneGmailCheckerView({
  phoneInput,
  gmailInput,
  activeProfiles,
  onChangePhone,
  onChangeGmail,
}: PhoneGmailCheckerViewProps) {
  const [mxStatus, setMxStatus] = useState<{
    loading: boolean;
    domain: string;
    records: string[];
    error: string | null;
  } | null>(null);

  const [batchAudit, setBatchAudit] = useState<{
    total: number;
    phonePassed: number;
    gmailPassed: number;
    durationMs: number;
  } | null>(null);

  const [gmailAvatar, setGmailAvatar] = useState<{
    email: string;
    loading: boolean;
    hasPic: boolean;
    url: string | null;
  } | null>(null);

  const phoneAnalysis = useMemo(() => {
    const lines = phoneInput
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length <= 1) {
      const single = validatePhoneNumber(lines[0] ?? '');
      return {
        isBatch: false,
        total: lines.length,
        passed: single.isValid ? 1 : 0,
        primary: single,
        inspected: lines[0] ?? '',
      };
    }
    let passed = 0;
    let firstFail: { line: string; res: ReturnType<typeof validatePhoneNumber> } | null = null;
    const first = validatePhoneNumber(lines[0]);
    for (let i = 0; i < lines.length; i++) {
      const r = i === 0 ? first : validatePhoneNumber(lines[i]);
      if (r.isValid) passed++;
      else if (!firstFail) firstFail = { line: lines[i], res: r };
    }
    return {
      isBatch: true,
      total: lines.length,
      passed,
      primary: firstFail ? firstFail.res : first,
      inspected: firstFail ? firstFail.line : lines[0],
    };
  }, [phoneInput]);

  const gmailAnalysis = useMemo(() => {
    const lines = gmailInput
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length <= 1) {
      const single = validateGmailAddress(lines[0] ?? '');
      return {
        isBatch: false,
        total: lines.length,
        passed: single.isValid ? 1 : 0,
        primary: single,
        inspected: lines[0] ?? '',
      };
    }
    let passed = 0;
    let firstFail: { line: string; res: ReturnType<typeof validateGmailAddress> } | null = null;
    const first = validateGmailAddress(lines[0]);
    for (let i = 0; i < lines.length; i++) {
      const r = i === 0 ? first : validateGmailAddress(lines[i]);
      if (r.isValid) passed++;
      else if (!firstFail) firstFail = { line: lines[i], res: r };
    }
    return {
      isBatch: true,
      total: lines.length,
      passed,
      primary: firstFail ? firstFail.res : first,
      inspected: firstFail ? firstFail.line : lines[0],
    };
  }, [gmailInput]);

  useEffect(() => {
    const emailKey = gmailAnalysis.primary.isValid
      ? gmailAnalysis.primary.normalizedEmail
      : gmailAnalysis.inspected.trim().toLowerCase();
    if (!emailKey || !emailKey.includes('@')) {
      setGmailAvatar(null);
      return;
    }
    let cancelled = false;
    setGmailAvatar({ email: emailKey, loading: true, hasPic: false, url: null });
    void probeEmailAvatar(emailKey, 128).then((res) => {
      if (cancelled) return;
      setGmailAvatar({ email: emailKey, loading: false, hasPic: res.hasPic, url: res.url });
    });
    return () => {
      cancelled = true;
    };
  }, [gmailAnalysis.inspected, gmailAnalysis.primary.isValid, gmailAnalysis.primary.normalizedEmail]);

  const runLiveDnsMxLookup = async () => {
    const domain = gmailAnalysis.primary.domain || 'gmail.com';
    setMxStatus({ loading: true, domain, records: [], error: null });
    try {
      const resp = await fetch(
        `https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=MX`
      );
      if (!resp.ok) throw new Error(`DNS query returned ${resp.status}`);
      const json = (await resp.json()) as {
        Status?: number;
        Answer?: Array<{ data: string }>;
      };
      const records = (json.Answer ?? []).map((a) => a.data);
      setMxStatus({
        loading: false,
        domain,
        records,
        error: records.length === 0 ? `No MX mail exchange records found for ${domain}.` : null,
      });
    } catch (err) {
      setMxStatus({
        loading: false,
        domain,
        records: [],
        error: err instanceof Error ? err.message : 'DNS lookup failed.',
      });
    }
  };

  const handleAuditActiveBatch = () => {
    const start = performance.now();
    let phonePassed = 0;
    let gmailPassed = 0;
    for (let i = 0; i < activeProfiles.length; i++) {
      if (validatePhoneNumber(activeProfiles[i].phone).isValid) phonePassed++;
      if (validateGmailAddress(activeProfiles[i].gmail).isValid) gmailPassed++;
    }
    setBatchAudit({
      total: activeProfiles.length,
      phonePassed,
      gmailPassed,
      durationMs: Math.round(performance.now() - start),
    });
  };

  return (
    <div className="max-w-6xl mx-auto flex flex-col gap-6">
      {/* Header & Quick Test Samples */}
      <section className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div>
            <h1 className="font-display text-xl font-bold text-slate-900 tracking-tight">
              Phone Number &amp; Gmail Validator
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Verify ITU-T E.164 dialing codes, NANP/Ofcom fictional-range blocks, Google Gmail username rules (6–30 chars, zero underscores), and live DNS MX mail routing.
            </p>
          </div>

          {activeProfiles.length > 0 && (
            <button
              type="button"
              onClick={handleAuditActiveBatch}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-lg bg-slate-900 text-white hover:bg-slate-800 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" aria-hidden="true" />
              <span>Verify All {activeProfiles.length.toLocaleString('en-IN')} Generated Profiles</span>
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {SAMPLE_TESTS.map((s) => (
            <button
              key={s.label}
              type="button"
              onClick={() => {
                onChangePhone(s.phone);
                onChangeGmail(s.gmail);
              }}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
            >
              {s.label}
            </button>
          ))}
        </div>

        {batchAudit && (
          <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center gap-6 text-xs">
            <div>
              <span className="text-slate-500">Profiles Audited: </span>
              <strong className="font-mono text-slate-900 tabular-nums">
                {batchAudit.total.toLocaleString('en-IN')}
              </strong>
            </div>
            <div>
              <span className="text-slate-500">Phone Numbers Valid: </span>
              <strong className="font-mono text-emerald-700 tabular-nums">
                {batchAudit.phonePassed.toLocaleString('en-IN')} / {batchAudit.total.toLocaleString('en-IN')}
              </strong>
            </div>
            <div>
              <span className="text-slate-500">Gmail Addresses Valid: </span>
              <strong className="font-mono text-emerald-700 tabular-nums">
                {batchAudit.gmailPassed.toLocaleString('en-IN')} / {batchAudit.total.toLocaleString('en-IN')}
              </strong>
            </div>
            <div className="text-slate-400 font-mono tabular-nums">
              {batchAudit.durationMs} ms
            </div>
          </div>
        )}
      </section>

      {/* Split Panel: Phone Validator + Gmail Validator */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Phone Number Checker */}
        <section className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col gap-5">
          <div className="flex items-center gap-2.5">
            <Phone className="w-5 h-5 text-blue-600" aria-hidden="true" />
            <h2 className="text-base font-bold text-slate-900">Phone Number Verification</h2>
          </div>

          <div>
            <label htmlFor="phone-check-input" className="sr-only">
              Phone Numbers to Validate
            </label>
            <textarea
              id="phone-check-input"
              rows={3}
              value={phoneInput}
              onChange={(e) => onChangePhone(e.target.value)}
              placeholder="Paste one or more phone numbers (e.g. +1 (212) 648-3910, +44 7742 819304, +49 171 8492014)..."
              className="w-full p-3 font-mono text-xs text-slate-900 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-600"
            />
          </div>

          {phoneAnalysis.isBatch && (
            <div className="text-xs text-slate-600 pb-3 border-b border-slate-100">
              Batch: <strong className="font-mono text-slate-900 tabular-nums">{phoneAnalysis.passed}/{phoneAnalysis.total}</strong> valid
              <span className="mx-2 text-slate-300" aria-hidden="true">·</span>
              <span className="font-mono text-slate-500">Showing: {phoneAnalysis.inspected}</span>
            </div>
          )}

          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              {phoneAnalysis.primary.isValid ? (
                <ShieldCheck className="w-6 h-6 text-emerald-600 shrink-0" aria-hidden="true" />
              ) : (
                <ShieldAlert className="w-6 h-6 text-rose-600 shrink-0" aria-hidden="true" />
              )}
              <div>
                <div className="text-sm font-bold text-slate-900">
                  {phoneAnalysis.primary.isValid ? 'VALID NUMBER' : 'INVALID / REJECTED'}
                </div>
                <div className="text-xs text-slate-500">
                  {phoneAnalysis.primary.country} · {phoneAnalysis.primary.numberType}
                </div>
              </div>
            </div>
            {phoneAnalysis.primary.normalizedE164 && (
              <div className="font-mono text-xs font-semibold text-slate-800 bg-slate-100 px-2.5 py-1 rounded">
                {phoneAnalysis.primary.normalizedE164}
              </div>
            )}
          </div>

          <div className="divide-y divide-slate-100">
            {phoneAnalysis.primary.checks.map((c) => (
              <div key={c.id} className="py-3 flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  {c.passed ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" aria-hidden="true" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" aria-hidden="true" />
                  )}
                  <div>
                    <div className="text-xs font-semibold text-slate-900">{c.label}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{c.detail}</div>
                  </div>
                </div>
                <span className={`text-xs font-mono font-semibold ${c.passed ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {c.passed ? 'PASS' : 'FAIL'}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Gmail Checker */}
        <section className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col gap-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Mail className="w-5 h-5 text-blue-600" aria-hidden="true" />
              <h2 className="text-base font-bold text-slate-900">Gmail Address Verification</h2>
            </div>

            <button
              type="button"
              onClick={() => void runLiveDnsMxLookup()}
              disabled={mxStatus?.loading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 cursor-pointer"
            >
              <Globe className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{mxStatus?.loading ? 'Checking MX...' : 'Live MX DNS Check'}</span>
            </button>
          </div>

          <div>
            <label htmlFor="gmail-check-input" className="sr-only">
              Gmail Addresses to Validate
            </label>
            <textarea
              id="gmail-check-input"
              rows={3}
              value={gmailInput}
              onChange={(e) => onChangeGmail(e.target.value)}
              placeholder="Paste one or more @gmail.com addresses (one per line)..."
              className="w-full p-3 font-mono text-xs text-slate-900 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-600"
            />
          </div>

          {gmailAnalysis.isBatch && (
            <div className="text-xs text-slate-600 pb-3 border-b border-slate-100">
              Batch: <strong className="font-mono text-slate-900 tabular-nums">{gmailAnalysis.passed}/{gmailAnalysis.total}</strong> valid
              <span className="mx-2 text-slate-300" aria-hidden="true">·</span>
              <span className="font-mono text-slate-500">Showing: {gmailAnalysis.inspected}</span>
            </div>
          )}

          <div className="flex items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3 min-w-0">
              {gmailAvatar?.hasPic && gmailAvatar.url ? (
                <img
                  src={gmailAvatar.url}
                  alt=""
                  className="w-11 h-11 rounded-full object-cover border-2 border-emerald-500 shrink-0"
                />
              ) : gmailAnalysis.primary.isValid ? (
                <ShieldCheck className="w-6 h-6 text-emerald-600 shrink-0" aria-hidden="true" />
              ) : (
                <ShieldAlert className="w-6 h-6 text-rose-600 shrink-0" aria-hidden="true" />
              )}
              <div className="min-w-0">
                <div className="text-sm font-bold text-slate-900">
                  {gmailAnalysis.primary.isValid ? 'VALID GMAIL FORMAT' : 'INVALID / FRAUD GMAIL'}
                </div>
                <div className="text-xs text-slate-500 truncate">
                  Canonical: {gmailAnalysis.primary.normalizedEmail || '—'} ·{' '}
                  {gmailAvatar?.loading
                    ? 'Probing pic...'
                    : gmailAvatar?.hasPic
                    ? 'Public Pic Detected'
                    : 'No Public Gravatar Pic'}
                </div>
              </div>
            </div>
            <span
              className={`text-[11px] font-mono font-semibold px-2 py-0.5 rounded shrink-0 ${
                gmailAnalysis.primary.riskLevel === 'LOW'
                  ? 'bg-emerald-100 text-emerald-800'
                  : gmailAnalysis.primary.riskLevel === 'MEDIUM'
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-rose-100 text-rose-800'
              }`}
            >
              RISK: {gmailAnalysis.primary.riskLevel}
            </span>
          </div>

          {gmailAnalysis.primary.isValid && (
            <div className="p-3.5 rounded-lg border border-amber-200 bg-amber-50/80 text-xs text-amber-950 leading-relaxed">
              <strong>Important:</strong> Passing syntax &amp; DNS MX checks proves the address follows Google&apos;s format rules—it does <strong>not</strong> mean someone has registered it on <span className="font-mono">accounts.google.com</span> (Google blocks external tools from scanning private user accounts). To get addresses that <strong>100% exist on Google &amp; receive real mail</strong>, use <strong>Real Dot-Variants</strong> or <strong>Real +Alias</strong> in the <strong>Gmail Gen</strong> tab with your own real Gmail.
            </div>
          )}

          {mxStatus && !mxStatus.loading && (
            <div
              className={`p-3 rounded-lg border text-xs ${
                mxStatus.error
                  ? 'bg-rose-50 border-rose-200 text-rose-800'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-900'
              }`}
            >
              {mxStatus.error ? (
                <span>MX Check ({mxStatus.domain}): {mxStatus.error}</span>
              ) : (
                <div>
                  <div className="font-semibold">
                    Live DNS MX Verified for {mxStatus.domain} ({mxStatus.records.length} mail servers)
                  </div>
                  <div className="font-mono text-[11px] mt-1 text-emerald-800 break-all">
                    {mxStatus.records.slice(0, 3).join(' · ')}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="divide-y divide-slate-100">
            {gmailAnalysis.primary.checks.map((c) => (
              <div key={c.id} className="py-3 flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  {c.passed ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" aria-hidden="true" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" aria-hidden="true" />
                  )}
                  <div>
                    <div className="text-xs font-semibold text-slate-900">{c.label}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{c.detail}</div>
                  </div>
                </div>
                <span className={`text-xs font-mono font-semibold ${c.passed ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {c.passed ? 'PASS' : 'FAIL'}
                </span>
              </div>
            ))}
          </div>

          <p className="text-[11px] text-slate-400 leading-relaxed pt-2 border-t border-slate-100">
            Validates Google username rules (6–30 base chars, a–z / 0–9 / dot, +alias support) and live DNS MX mail server routing.
          </p>
        </section>
      </div>
    </div>
  );
}
