import { ShieldAlert } from 'lucide-react';
import { DeviceVisualType } from '../engine/uaGenerator';

interface DeviceIllustrationProps {
  type: DeviceVisualType;
  brand: string;
  model: string;
  isFraudOrBot: boolean;
}

export function DeviceIllustration({
  type,
  brand,
  model,
  isFraudOrBot,
}: DeviceIllustrationProps) {
  const isApplePhone = type === 'iphone';
  const isSamsung = type === 'android_samsung';
  const isPixel = type === 'android_pixel';
  const isAndroid = isSamsung || isPixel || type === 'android_other';
  const isDesktop = type === 'windows' || type === 'mac' || type === 'linux';
  const isBot = type === 'bot';

  return (
    <div
      className={`rounded-xl border p-4 flex flex-col items-center justify-between gap-3 ${
        isFraudOrBot
          ? 'bg-rose-50/70 border-rose-200'
          : 'bg-slate-50/80 border-slate-200'
      }`}
    >
      <div className="w-full flex items-center justify-between gap-2">
        <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-slate-500">
          {brand}
        </span>
        <span
          className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded ${
            isFraudOrBot
              ? 'bg-rose-100 text-rose-700'
              : 'bg-emerald-100 text-emerald-700'
          }`}
        >
          {isBot ? 'BOT / AUTOMATION' : isFraudOrBot ? 'SPOOF ALERT' : 'REAL HARDWARE'}
        </span>
      </div>

      <div className="py-2 flex items-center justify-center">
        {isBot ? (
          <div className="w-28 h-36 rounded-2xl bg-slate-900 border-2 border-rose-500 flex flex-col items-center justify-center gap-2 shadow-sm">
            <ShieldAlert className="w-10 h-10 text-rose-400" aria-hidden="true" />
            <div className="w-16 h-1.5 rounded-full bg-rose-500/40" />
            <div className="w-12 h-1.5 rounded-full bg-slate-700" />
            <span className="text-[10px] font-mono text-rose-300 mt-1">BLOCKED</span>
          </div>
        ) : isApplePhone ? (
          <svg
            viewBox="0 0 120 220"
            className="w-28 h-40 drop-shadow-sm"
            role="img"
            aria-label={`${brand} ${model} illustration`}
          >
            <defs>
              <linearGradient id="iphone-screen" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#0f172a" />
                <stop offset="45%" stopColor="#1e3a8a" />
                <stop offset="100%" stopColor="#0ea5e9" />
              </linearGradient>
            </defs>
            {/* Outer titanium chassis */}
            <rect x="10" y="6" width="100" height="208" rx="22" fill="#1e293b" stroke="#475569" strokeWidth="2.5" />
            {/* Side buttons */}
            <rect x="7" y="48" width="3" height="16" rx="1" fill="#64748b" />
            <rect x="7" y="72" width="3" height="24" rx="1" fill="#64748b" />
            <rect x="110" y="62" width="3" height="28" rx="1" fill="#64748b" />
            {/* OLED Display */}
            <rect x="16" y="12" width="88" height="196" rx="17" fill="url(#iphone-screen)" />
            {/* Dynamic Island */}
            <rect x="43" y="19" width="34" height="9" rx="4.5" fill="#020617" />
            <circle cx="69" cy="23.5" r="2" fill="#1e293b" />
            {/* Screen Lock / App Grid Mock */}
            <text x="60" y="58" textAnchor="middle" fill="#e2e8f0" fontSize="16" fontFamily="monospace" fontWeight="700">
              09:41
            </text>
            <rect x="26" y="78" width="68" height="22" rx="6" fill="rgba(255,255,255,0.14)" />
            <rect x="26" y="108" width="31" height="31" rx="7" fill="rgba(255,255,255,0.18)" />
            <rect x="63" y="108" width="31" height="31" rx="7" fill="rgba(56,189,248,0.35)" />
            <rect x="26" y="146" width="68" height="16" rx="5" fill="rgba(255,255,255,0.12)" />
            {/* Home indicator */}
            <rect x="42" y="199" width="36" height="3.5" rx="1.75" fill="#cbd5e1" opacity="0.85" />
          </svg>
        ) : isAndroid ? (
          <svg
            viewBox="0 0 120 220"
            className="w-28 h-40 drop-shadow-sm"
            role="img"
            aria-label={`${brand} ${model} illustration`}
          >
            <defs>
              <linearGradient id="android-screen" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={isSamsung ? '#1e1b4b' : isPixel ? '#064e3b' : '#0f172a'} />
                <stop offset="60%" stopColor={isSamsung ? '#312e81' : isPixel ? '#047857' : '#334155'} />
                <stop offset="100%" stopColor={isSamsung ? '#6366f1' : isPixel ? '#10b981' : '#3b82f6'} />
              </linearGradient>
            </defs>
            {/* Outer chassis */}
            <rect
              x="12"
              y="6"
              width="96"
              height="208"
              rx={isSamsung ? '10' : '18'}
              fill="#0f172a"
              stroke="#475569"
              strokeWidth="2.5"
            />
            {/* Display */}
            <rect
              x="16"
              y="10"
              width="88"
              height="200"
              rx={isSamsung ? '7' : '15'}
              fill="url(#android-screen)"
            />
            {/* Punch-hole selfie camera */}
            <circle cx="60" cy="19" r="3" fill="#020617" />
            {/* Pixel camera visor hint or Samsung widget UI */}
            {isPixel ? (
              <rect x="24" y="34" width="72" height="16" rx="8" fill="rgba(255,255,255,0.2)" />
            ) : (
              <rect x="24" y="34" width="72" height="18" rx="4" fill="rgba(255,255,255,0.16)" />
            )}
            <rect x="24" y="64" width="33" height="33" rx="8" fill="rgba(255,255,255,0.18)" />
            <rect x="63" y="64" width="33" height="33" rx="8" fill="rgba(255,255,255,0.24)" />
            <rect x="24" y="106" width="72" height="44" rx="8" fill="rgba(255,255,255,0.12)" />
            {/* Navigation dock */}
            <circle cx="34" cy="182" r="7" fill="rgba(255,255,255,0.3)" />
            <circle cx="51" cy="182" r="7" fill="rgba(255,255,255,0.3)" />
            <circle cx="69" cy="182" r="7" fill="rgba(255,255,255,0.3)" />
            <circle cx="86" cy="182" r="7" fill="rgba(255,255,255,0.3)" />
            <rect x="44" y="201" width="32" height="3" rx="1.5" fill="#e2e8f0" opacity="0.75" />
          </svg>
        ) : isDesktop ? (
          <svg
            viewBox="0 0 200 140"
            className="w-40 h-32 drop-shadow-sm"
            role="img"
            aria-label={`${brand} ${model} workstation illustration`}
          >
            <defs>
              <linearGradient id="desktop-screen" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop
                  offset="0%"
                  stopColor={type === 'windows' ? '#0f172a' : type === 'mac' ? '#1e1b4b' : '#064e3b'}
                />
                <stop
                  offset="100%"
                  stopColor={type === 'windows' ? '#2563eb' : type === 'mac' ? '#7c3aed' : '#0f766e'}
                />
              </linearGradient>
            </defs>
            {/* Laptop Lid / Monitor */}
            <rect x="18" y="10" width="164" height="104" rx="8" fill="#0f172a" stroke="#475569" strokeWidth="2.5" />
            <rect x="24" y="16" width="152" height="92" rx="4" fill="url(#desktop-screen)" />
            {type === 'mac' && <rect x="88" y="16" width="24" height="5" rx="2" fill="#020617" />}
            {/* Window / OS glyph */}
            {type === 'windows' ? (
              <g fill="#bfdbfe" opacity="0.9">
                <rect x="86" y="44" width="12" height="12" rx="1.5" />
                <rect x="102" y="44" width="12" height="12" rx="1.5" />
                <rect x="86" y="60" width="12" height="12" rx="1.5" />
                <rect x="102" y="60" width="12" height="12" rx="1.5" />
              </g>
            ) : type === 'linux' ? (
              <text x="100" y="65" textAnchor="middle" fill="#a7f3d0" fontSize="20" fontFamily="monospace" fontWeight="700">
                &gt;_
              </text>
            ) : (
              <rect x="54" y="34" width="92" height="52" rx="6" fill="rgba(255,255,255,0.16)" />
            )}
            {/* Taskbar / Dock */}
            <rect x="52" y="96" width="96" height="7" rx="3.5" fill="rgba(255,255,255,0.28)" />
            {/* Base */}
            <path d="M6 116 H194 L184 128 H16 Z" fill="#cbd5e1" stroke="#94a3b8" strokeWidth="1.5" />
            <rect x="82" y="116" width="36" height="3" rx="1.5" fill="#64748b" />
          </svg>
        ) : (
          <svg
            viewBox="0 0 140 160"
            className="w-28 h-32"
            role="img"
            aria-label="Generic device illustration"
          >
            <rect x="20" y="12" width="100" height="136" rx="14" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="2" />
            <rect x="28" y="22" width="84" height="116" rx="8" fill="#f8fafc" />
            <text x="70" y="84" textAnchor="middle" fill="#64748b" fontSize="14" fontFamily="monospace">
              ?
            </text>
          </svg>
        )}
      </div>

      <div className="w-full text-center border-t border-slate-200/80 pt-2.5">
        <div className="text-xs font-bold text-slate-900 truncate" title={model}>
          {model}
        </div>
        <div className="text-[11px] text-slate-500 mt-0.5 truncate">
          {type === 'iphone'
            ? 'Apple iOS Hardware'
            : isSamsung
            ? 'Samsung Galaxy Hardware'
            : isPixel
            ? 'Google Pixel Hardware'
            : isAndroid
            ? 'Android Device'
            : isDesktop
            ? 'Desktop Workstation'
            : isBot
            ? 'Automated Bot Client'
            : 'Unclassified Client'}
        </div>
      </div>
    </div>
  );
}
