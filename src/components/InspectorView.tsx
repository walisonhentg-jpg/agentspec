import { useMemo } from 'react';
import { CheckCircle2, ShieldAlert, ShieldCheck, XCircle } from 'lucide-react';
import { validateUserAgent } from '../engine/uaGenerator';

interface InspectorViewProps {
  inputUa: string;
  onChangeUa: (ua: string) => void;
}

const SAMPLE_CASES = [
  {
    label: 'Chrome 2026 (Windows)',
    ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36',
  },
  {
    label: 'Facebook iPhone 16 Pro',
    ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/22H20 [FBAN/FBIOS;FBAV/539.0.0;FBBV/804118245;FBDV/iPhone17,1;FBMD/iPhone;FBSN/iOS;FBSV/18.7;FBSS/3;FBID/phone;FBLC/en_US;FBOP/5;FBRV/804912340]',
  },
  {
    label: 'Instagram Android',
    ua: 'Mozilla/5.0 (Linux; Android 15; SM-S938B Build/AP3A.240905.015.A2; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/143.0.7499.192 Mobile Safari/537.36 Instagram 410.0.0.46.88 Android (35/15; 560dpi; 1440x3120; samsung; SM-S938B; sun; qcom; en_US; 814209115)',
  },
  {
    label: 'Negative Test: Fake Win NT 11.0',
    ua: 'Mozilla/5.0 (Windows NT 11.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.9999.12 Safari/537.36',
  },
  {
    label: 'Negative Test: Fake iPhone Blink',
    ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Mobile Safari/537.36',
  },
];

export function InspectorView({ inputUa, onChangeUa }: InspectorViewProps) {
  const analysis = useMemo(() => {
    const lines = inputUa
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    if (lines.length <= 1) {
      const single = validateUserAgent(lines[0] ?? '');
      return {
        isBatch: false,
        totalLines: lines.length,
        passedLines: single.isValid ? 1 : 0,
        failedLines: single.isValid ? 0 : lines.length,
        primaryReport: single,
        inspectedLine: lines[0] ?? '',
      };
    }

    let passedLines = 0;
    let firstFailure: { line: string; report: ReturnType<typeof validateUserAgent> } | null = null;
    let firstReport = validateUserAgent(lines[0]);

    for (let i = 0; i < lines.length; i++) {
      const rep = i === 0 ? firstReport : validateUserAgent(lines[i]);
      if (rep.isValid) {
        passedLines++;
      } else if (!firstFailure) {
        firstFailure = { line: lines[i], report: rep };
      }
    }

    return {
      isBatch: true,
      totalLines: lines.length,
      passedLines,
      failedLines: lines.length - passedLines,
      primaryReport: firstFailure ? firstFailure.report : firstReport,
      inspectedLine: firstFailure ? firstFailure.line : lines[0],
    };
  }, [inputUa]);

  const report = analysis.primaryReport;

  return (
    <div className="max-w-5xl mx-auto flex flex-col gap-6">
      <section className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h1 className="font-display text-xl font-bold text-slate-900 tracking-tight">
              Anti-Bot &amp; Coherence Inspector
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Paste one or multiple User-Agent strings (one per line) to verify against 10 structural rules used by Cloudflare, Akamai, DataDome, and Meta.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          {SAMPLE_CASES.map((sample) => (
            <button
              key={sample.label}
              type="button"
              onClick={() => onChangeUa(sample.ua)}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
            >
              {sample.label}
            </button>
          ))}
        </div>

        <label htmlFor="ua-inspector-input" className="sr-only">
          User-Agent String to Inspect
        </label>
        <textarea
          id="ua-inspector-input"
          rows={4}
          value={inputUa}
          onChange={(e) => onChangeUa(e.target.value)}
          placeholder="Paste one or more User-Agent strings here (one per line)..."
          className="w-full p-3.5 font-mono text-xs text-slate-900 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-600"
        />
      </section>

      {/* Diagnostic Verdict Strip */}
      <section className="bg-white border border-slate-200 rounded-xl p-6">
        {analysis.isBatch && (
          <div className="mb-5 pb-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-slate-600">
              Batch Mode: Validated <strong className="font-mono text-slate-900 tabular-nums">{analysis.totalLines.toLocaleString('en-IN')}</strong> lines
              <span className="mx-2 text-slate-300" aria-hidden="true">·</span>
              <span className="font-semibold text-emerald-700 font-mono tabular-nums">{analysis.passedLines.toLocaleString('en-IN')} PASS</span>
              <span className="mx-2 text-slate-300" aria-hidden="true">·</span>
              <span className={`font-semibold font-mono tabular-nums ${analysis.failedLines > 0 ? 'text-rose-700' : 'text-slate-500'}`}>
                {analysis.failedLines.toLocaleString('en-IN')} FAIL
              </span>
            </div>
            <div className="text-xs text-slate-500 truncate max-w-md font-mono">
              Showing: {analysis.inspectedLine}
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            {report.isValid ? (
              <ShieldCheck className="w-7 h-7 text-emerald-600 shrink-0" aria-hidden="true" />
            ) : (
              <ShieldAlert className="w-7 h-7 text-rose-600 shrink-0" aria-hidden="true" />
            )}
            <div>
              <div className="text-base font-bold text-slate-900">
                {report.isValid
                  ? 'PASS — Authentic & Specification-Coherent'
                  : 'FAIL — Structural Anomaly or Invalid Token Detected'}
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-1">
                <span>Browser: {report.detectedBrowser}</span>
                <span aria-hidden="true">·</span>
                <span>OS: {report.detectedOs}</span>
                <span aria-hidden="true">·</span>
                <span>Engine: {report.detectedEngine}</span>
              </div>
            </div>
          </div>

          <div className="text-left sm:text-right">
            <div className="text-xs text-slate-500">Coherence Checks</div>
            <div className="font-mono text-2xl font-bold text-slate-900 tabular-nums">
              {report.checks.filter((c) => c.passed).length}/{report.checks.length}
            </div>
          </div>
        </div>

        <div className="divide-y divide-slate-100 mt-2">
          {report.checks.map((check) => (
            <div key={check.id} className="py-3.5 flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                {check.passed ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" aria-hidden="true" />
                ) : (
                  <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" aria-hidden="true" />
                )}
                <div>
                  <div className="text-sm font-medium text-slate-900">{check.label}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{check.detail}</div>
                </div>
              </div>
              <span
                className={`text-xs font-mono font-semibold shrink-0 ${
                  check.passed ? 'text-emerald-700' : 'text-rose-700'
                }`}
              >
                {check.passed ? 'PASS' : 'FAIL'}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
