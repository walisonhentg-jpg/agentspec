import { useMemo, useState } from 'react';
import {
  Bot,
  CheckCircle2,
  Cpu,
  MonitorSmartphone,
  ShieldAlert,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { validateUserAgent } from '../engine/uaGenerator';
import { DeviceIllustration } from './DeviceIllustration';

interface InspectorViewProps {
  inputUa: string;
  onChangeUa: (ua: string) => void;
}

const SAMPLE_CASES = [
  {
    label: 'Real: iPhone 18 Pro Max (FB iOS 27)',
    ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 27_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/24B119 [FBAN/FBIOS;FBAV/588.0.0.42.55;FBBV/910482315;FBDV/iPhone19,3;FBMD/iPhone;FBSN/iOS;FBSV/27.2;FBSS/3;FBID/phone;FBLC/en_US;FBOP/5;FBRV/910902115]',
  },
  {
    label: 'Real: Chrome 2026 (Windows)',
    ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36',
  },
  {
    label: 'Real: Instagram Android (S25 Ultra)',
    ua: 'Mozilla/5.0 (Linux; Android 15; SM-S938B Build/AP3A.240905.015.A2; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/155.0.8059.84 Mobile Safari/537.36 Instagram 451.0.0.44.86 Android (35/15; 560dpi; 1440x3120; samsung; SM-S938B; sun; qcom; en_US; 906190445)',
  },
  {
    label: 'Fake Bot: HeadlessChrome',
    ua: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/144.0.0.0 Safari/537.36',
  },
  {
    label: 'Fraud: Spoofed Samsung/Pixel Build',
    ua: 'Mozilla/5.0 (Linux; Android 16; SM-S938B Build/BP4A.260105.011; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/155.0.0.0 Mobile Safari/537.36',
  },
  {
    label: 'Fraud: Fake Win NT 11.0',
    ua: 'Mozilla/5.0 (Windows NT 11.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.9999.12 Safari/537.36',
  },
  {
    label: 'Fraud: Fake iPhone Blink',
    ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Mobile Safari/537.36',
  },
];

export function InspectorView({ inputUa, onChangeUa }: InspectorViewProps) {
  const [selectedBatchIdx, setSelectedBatchIdx] = useState<number>(0);

  const analysis = useMemo(() => {
    const lines = inputUa
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    if (lines.length === 0) {
      const single = validateUserAgent('');
      return {
        isBatch: false,
        totalLines: 0,
        passedLines: 0,
        failedLines: 0,
        botCount: 0,
        items: [{ line: '', report: single }],
        primaryReport: single,
        inspectedLine: '',
      };
    }

    const items = lines.slice(0, 5000).map((line) => ({
      line,
      report: validateUserAgent(line),
    }));

    let passedLines = 0;
    let botCount = 0;
    let firstFailureIdx = -1;
    for (let i = 0; i < items.length; i++) {
      if (items[i].report.isValid) passedLines++;
      else if (firstFailureIdx === -1) firstFailureIdx = i;
      if (items[i].report.isBot) botCount++;
    }

    const activeIdx =
      selectedBatchIdx >= 0 && selectedBatchIdx < items.length
        ? selectedBatchIdx
        : firstFailureIdx !== -1
        ? firstFailureIdx
        : 0;

    return {
      isBatch: items.length > 1,
      totalLines: items.length,
      passedLines,
      failedLines: items.length - passedLines,
      botCount,
      items,
      primaryReport: items[activeIdx].report,
      inspectedLine: items[activeIdx].line,
      activeIdx,
    };
  }, [inputUa, selectedBatchIdx]);

  const report = analysis.primaryReport;
  const isFraudOrBot = report.verdict === 'FRAUD_OR_BOT';
  const isSuspicious = report.verdict === 'SUSPICIOUS';

  return (
    <div className="max-w-6xl mx-auto flex flex-col gap-6">
      <section className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h1 className="font-display text-xl font-bold text-slate-900 tracking-tight">
              Hardened Anti-Fraud &amp; Bot UA Inspector
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Detects headless bots, CLI scrapers, AI crawlers, spoofed OS/CPU tokens, Pixel/Samsung build mismatches, and unreleased browser versions — and extracts full device &amp; model details for authentic UAs.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          {SAMPLE_CASES.map((sample) => (
            <button
              key={sample.label}
              type="button"
              onClick={() => {
                setSelectedBatchIdx(0);
                onChangeUa(sample.ua);
              }}
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
          onChange={(e) => {
            setSelectedBatchIdx(0);
            onChangeUa(e.target.value);
          }}
          placeholder="Paste one or more User-Agent strings here (one per line)..."
          className="w-full p-3.5 font-mono text-xs text-slate-900 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-600"
        />
      </section>

      {analysis.isBatch && (
        <section className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
            <div>
              Batch Scan: <strong className="font-mono text-slate-900 tabular-nums">{analysis.totalLines.toLocaleString('en-IN')}</strong> lines
              <span className="mx-2 text-slate-300" aria-hidden="true">·</span>
              <span className="font-semibold text-emerald-700 font-mono tabular-nums">{analysis.passedLines.toLocaleString('en-IN')} REAL</span>
              <span className="mx-2 text-slate-300" aria-hidden="true">·</span>
              <span className={`font-semibold font-mono tabular-nums ${analysis.failedLines > 0 ? 'text-rose-700' : 'text-slate-500'}`}>
                {analysis.failedLines.toLocaleString('en-IN')} FRAUD / FAIL
              </span>
              {analysis.botCount > 0 && (
                <>
                  <span className="mx-2 text-slate-300" aria-hidden="true">·</span>
                  <span className="font-semibold text-rose-700 font-mono tabular-nums">
                    {analysis.botCount.toLocaleString('en-IN')} BOTS
                  </span>
                </>
              )}
            </div>
            <span className="text-[11px] text-slate-500">Click any line below to view full device picture &amp; forensic breakdown</span>
          </div>

          <div className="max-h-44 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100">
            {analysis.items.slice(0, 200).map((item, idx) => {
              const active = idx === (analysis.activeIdx ?? 0);
              return (
                <button
                  key={`${idx}-${item.line.slice(0, 24)}`}
                  type="button"
                  onClick={() => setSelectedBatchIdx(idx)}
                  className={`w-full text-left px-3 py-2 flex items-center justify-between gap-3 text-xs transition-colors cursor-pointer ${
                    active ? 'bg-blue-50/70' : 'hover:bg-slate-50'
                  }`}
                >
                  <span className="font-mono text-slate-800 truncate">
                    <span className="text-slate-400 mr-2">#{idx + 1}</span>
                    {item.line}
                  </span>
                  <span
                    className={`font-mono font-semibold text-[11px] shrink-0 ${
                      item.report.verdict === 'REAL'
                        ? 'text-emerald-700'
                        : item.report.verdict === 'SUSPICIOUS'
                        ? 'text-amber-700'
                        : 'text-rose-700'
                    }`}
                  >
                    {item.report.isBot ? 'BOT' : item.report.verdict}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Verdict & Full Hardware Profile with Device Picture */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            {report.isBot ? (
              <Bot className="w-7 h-7 text-rose-600 shrink-0" aria-hidden="true" />
            ) : report.isValid ? (
              <ShieldCheck className="w-7 h-7 text-emerald-600 shrink-0" aria-hidden="true" />
            ) : (
              <ShieldAlert className={`w-7 h-7 shrink-0 ${isSuspicious ? 'text-amber-600' : 'text-rose-600'}`} aria-hidden="true" />
            )}
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-base font-bold text-slate-900">
                  {report.verdict === 'REAL'
                    ? 'REAL — Authentic & Specification-Coherent'
                    : report.isBot
                    ? `FAKE BOT DETECTED — ${report.botCategory ?? 'Automated Client'}`
                    : isSuspicious
                    ? 'SUSPICIOUS — Structural Anomaly Detected'
                    : 'FRAUD / SPOOF DETECTED — Forged or Impossible Signature'}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-1">
                <span>{report.detectedBrowser} {report.detectedBrowserVersion !== '—' ? report.detectedBrowserVersion : ''}</span>
                <span aria-hidden="true">·</span>
                <span>
                  {report.deviceModel.toLowerCase().startsWith(report.deviceBrand.toLowerCase())
                    ? report.deviceModel
                    : `${report.deviceBrand} ${report.deviceModel}`}
                </span>
                <span aria-hidden="true">·</span>
                <span>{report.detectedOs}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6 shrink-0">
            <div className="text-left sm:text-right">
              <div className="text-xs text-slate-500">Fraud / Bot Risk</div>
              <div
                className={`font-mono text-2xl font-bold tabular-nums ${
                  report.riskScore === 0
                    ? 'text-emerald-700'
                    : report.riskScore <= 20
                    ? 'text-amber-700'
                    : 'text-rose-700'
                }`}
              >
                {report.riskScore}%
              </div>
            </div>
            <div className="text-left sm:text-right">
              <div className="text-xs text-slate-500">Forensic Rules</div>
              <div className="font-mono text-2xl font-bold text-slate-900 tabular-nums">
                {report.checks.filter((c) => c.passed).length}/{report.checks.length}
              </div>
            </div>
          </div>
        </div>

        {/* Parsed Device Illustration + Structured Specs */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          <div className="lg:col-span-4">
            <DeviceIllustration
              type={report.deviceVisualType}
              brand={report.deviceBrand}
              model={report.deviceModel}
              isFraudOrBot={isFraudOrBot}
            />
          </div>

          <div className="lg:col-span-8 bg-slate-50/70 border border-slate-200 rounded-xl p-5 flex flex-col justify-start gap-5">
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-800">
                <MonitorSmartphone className="w-4 h-4 text-blue-600" aria-hidden="true" />
                <span>Extracted Device, Model &amp; Browser Fingerprint</span>
              </div>
              <span className="inline-flex items-center gap-1 text-[11px] font-mono text-slate-500">
                <Cpu className="w-3.5 h-3.5" aria-hidden="true" />
                {report.deviceType}
              </span>
            </div>

            <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-5 gap-y-3.5 text-xs">
              <div>
                <dt className="text-[11px] text-slate-500">Browser Name</dt>
                <dd className="font-semibold text-slate-900 mt-0.5">{report.detectedBrowser}</dd>
              </div>
              <div>
                <dt className="text-[11px] text-slate-500">Browser Version</dt>
                <dd className="font-mono font-semibold text-slate-900 mt-0.5">{report.detectedBrowserVersion}</dd>
              </div>
              <div>
                <dt className="text-[11px] text-slate-500">Rendering Engine</dt>
                <dd className="font-semibold text-slate-900 mt-0.5">{report.detectedEngine}</dd>
              </div>

              <div>
                <dt className="text-[11px] text-slate-500">Device Brand</dt>
                <dd className="font-semibold text-slate-900 mt-0.5">{report.deviceBrand}</dd>
              </div>
              <div>
                <dt className="text-[11px] text-slate-500">Device Model</dt>
                <dd className="font-semibold text-slate-900 mt-0.5">{report.deviceModel}</dd>
              </div>
              <div>
                <dt className="text-[11px] text-slate-500">Hardware Model ID</dt>
                <dd className="font-mono font-semibold text-slate-900 mt-0.5">{report.hardwareId}</dd>
              </div>

              <div>
                <dt className="text-[11px] text-slate-500">Operating System</dt>
                <dd className="font-semibold text-slate-900 mt-0.5">{report.detectedOs}</dd>
              </div>
              <div>
                <dt className="text-[11px] text-slate-500">OS Build ID</dt>
                <dd className="font-mono text-slate-800 mt-0.5">{report.osBuild}</dd>
              </div>
              <div>
                <dt className="text-[11px] text-slate-500">Display / DPI / Scale</dt>
                <dd className="font-mono text-slate-800 mt-0.5">{report.screenSpec}</dd>
              </div>

              <div className="sm:col-span-2">
                <dt className="text-[11px] text-slate-500">Chipset / Board Architecture</dt>
                <dd className="font-mono text-slate-800 mt-0.5">{report.chipsetSpec}</dd>
              </div>
              <div>
                <dt className="text-[11px] text-slate-500">Locale · Carrier</dt>
                <dd className="font-mono text-slate-800 mt-0.5">
                  {report.localeDetected} · {report.carrierDetected}
                </dd>
              </div>
            </dl>
          </div>
        </div>

        {/* 11 Forensic Rules Breakdown */}
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
            11-Layer Anti-Fraud &amp; Specification Checks
          </h2>
          <div className="divide-y divide-slate-100 border-t border-slate-100">
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
        </div>
      </section>
    </div>
  );
}
