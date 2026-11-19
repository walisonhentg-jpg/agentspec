import { Check, Trash2 } from 'lucide-react';
import {
  BROWSER_LIST,
  BrowserType,
  CHROMIUM_RELEASES,
  DEVICE_LIST,
  DeviceType,
  FIREFOX_RELEASES,
  FreshnessWindow,
  IOS_RELEASES,
  LocalePreset,
  SAMSUNG_BROWSER_PAIRS,
} from '../data/uaRegistry';
import {
  DEFAULT_VERSION_RANGES,
  TrafficMode,
  VersionRangeFilter,
  getValidPairs,
} from '../engine/uaGenerator';

interface SidebarControlsProps {
  browsers: BrowserType[];
  devices: DeviceType[];
  freshness: FreshnessWindow;
  trafficMode: TrafficMode;
  localePreset: LocalePreset;
  versionRanges: VersionRangeFilter;
  sevenDayGuard: boolean;
  protectedUaCount: number;
  estimatedPool: number;
  onToggleBrowser: (b: BrowserType) => void;
  onSetBrowsers: (b: BrowserType[]) => void;
  onToggleDevice: (d: DeviceType) => void;
  onSetDevices: (d: DeviceType[]) => void;
  onChangeFreshness: (f: FreshnessWindow) => void;
  onChangeTrafficMode: (m: TrafficMode) => void;
  onChangeLocale: (l: LocalePreset) => void;
  onChangeVersionRanges: (v: VersionRangeFilter) => void;
  onToggleSevenDay: (v: boolean) => void;
  onClearSevenDay: () => void;
}

const CHROME_MAJORS = [...CHROMIUM_RELEASES].map((r) => r.major).sort((a, b) => a - b);
const FIREFOX_MAJORS = [...FIREFOX_RELEASES].map((r) => r.major).sort((a, b) => a - b);
const SAFARI_VERSIONS = [...IOS_RELEASES].map((r) => r.safariNumeric).sort((a, b) => a - b);
const SAMSUNG_MAJORS = [...SAMSUNG_BROWSER_PAIRS].map((r) => r.major).sort((a, b) => a - b);

export function SidebarControls({
  browsers,
  devices,
  freshness,
  trafficMode,
  localePreset,
  versionRanges,
  sevenDayGuard,
  protectedUaCount,
  estimatedPool,
  onToggleBrowser,
  onSetBrowsers,
  onToggleDevice,
  onSetDevices,
  onChangeFreshness,
  onChangeTrafficMode,
  onChangeLocale,
  onChangeVersionRanges,
  onToggleSevenDay,
  onClearSevenDay,
}: SidebarControlsProps) {
  const validPairsCount = getValidPairs(browsers, devices).length;

  return (
    <aside className="w-full lg:w-[320px] shrink-0 bg-white border border-slate-200 rounded-xl p-5 flex flex-col gap-5 self-start">
      {/* Quick Profile Presets */}
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <h2 className="text-sm font-semibold text-slate-900">Quick Presets</h2>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          <button
            type="button"
            onClick={() => {
              onSetBrowsers(BROWSER_LIST.map((b) => b.id));
              onSetDevices(DEVICE_LIST.map((d) => d.id));
            }}
            className="px-2.5 py-2 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-left transition-colors whitespace-nowrap truncate cursor-pointer"
          >
            All Platforms
          </button>
          <button
            type="button"
            onClick={() => {
              onSetBrowsers(['facebook', 'instagram', 'youtube', 'tiktok']);
              onSetDevices(['android', 'iphone']);
            }}
            className="px-2.5 py-2 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-left transition-colors whitespace-nowrap truncate cursor-pointer"
          >
            Social Apps (2025–26)
          </button>
          <button
            type="button"
            onClick={() => {
              onSetBrowsers(['chrome', 'safari', 'firefox', 'edge', 'samsung', 'android_webview']);
              onSetDevices(['android', 'iphone']);
            }}
            className="px-2.5 py-2 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-left transition-colors whitespace-nowrap truncate cursor-pointer"
          >
            Mobile Browsers
          </button>
          <button
            type="button"
            onClick={() => {
              onSetBrowsers(['chrome', 'safari', 'firefox', 'edge']);
              onSetDevices(['windows', 'macos', 'linux']);
            }}
            className="px-2.5 py-2 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-left transition-colors whitespace-nowrap truncate cursor-pointer"
          >
            Desktop Browsers
          </button>
        </div>
      </div>

      <div className="h-px bg-slate-100" />

      {/* Browsers & Apps */}
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <h2 className="text-sm font-semibold text-slate-900">Browsers &amp; Social Apps</h2>
          <div className="flex items-center gap-2 text-xs">
            <button
              type="button"
              onClick={() => onSetBrowsers(BROWSER_LIST.map((b) => b.id))}
              className="text-blue-600 hover:underline font-medium cursor-pointer"
            >
              All
            </button>
            <span className="text-slate-300" aria-hidden="true">/</span>
            <button
              type="button"
              onClick={() => onSetBrowsers(['chrome'])}
              className="text-slate-500 hover:text-slate-800 cursor-pointer"
            >
              Reset
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-1.5">
          {BROWSER_LIST.map((b) => {
            const active = browsers.includes(b.id);
            const hasCompatibleDevice = b.supportedDevices.some((d) => devices.includes(d));
            return (
              <button
                key={b.id}
                type="button"
                onClick={() => onToggleBrowser(b.id)}
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
                  <span className="truncate">{b.label}</span>
                </span>
                <span className="text-[11px] text-slate-400 font-normal shrink-0 ml-2">
                  {active && !hasCompatibleDevice
                    ? 'No OS match'
                    : b.supportedDevices.length === 1
                    ? 'Android'
                    : b.supportedDevices.length === 2
                    ? 'Mobile'
                    : `${b.supportedDevices.length} OS`}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="h-px bg-slate-100" />

      {/* Custom Browser Version Range Selector */}
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <h2 className="text-sm font-semibold text-slate-900">Version Range Picker</h2>
          <button
            type="button"
            onClick={() => onChangeVersionRanges(DEFAULT_VERSION_RANGES)}
            className="text-xs text-blue-600 hover:underline font-medium cursor-pointer"
          >
            Full Range
          </button>
        </div>

        <div className="flex flex-col gap-2.5 text-xs">
          {/* Chrome 132 - 158 */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-slate-600 font-medium w-20 shrink-0">Chrome</span>
            <div className="flex items-center gap-1.5 flex-1">
              <select
                aria-label="Chrome minimum version"
                value={versionRanges.chromeMin}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  onChangeVersionRanges({
                    ...versionRanges,
                    chromeMin: val,
                    chromeMax: Math.max(val, versionRanges.chromeMax),
                  });
                }}
                className="flex-1 px-2 py-1.5 font-mono text-xs bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                {CHROME_MAJORS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
              <span className="text-slate-400">–</span>
              <select
                aria-label="Chrome maximum version"
                value={versionRanges.chromeMax}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  onChangeVersionRanges({
                    ...versionRanges,
                    chromeMax: val,
                    chromeMin: Math.min(val, versionRanges.chromeMin),
                  });
                }}
                className="flex-1 px-2 py-1.5 font-mono text-xs bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                {CHROME_MAJORS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Firefox 138 - 160 */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-slate-600 font-medium w-20 shrink-0">Firefox</span>
            <div className="flex items-center gap-1.5 flex-1">
              <select
                aria-label="Firefox minimum version"
                value={versionRanges.firefoxMin}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  onChangeVersionRanges({
                    ...versionRanges,
                    firefoxMin: val,
                    firefoxMax: Math.max(val, versionRanges.firefoxMax),
                  });
                }}
                className="flex-1 px-2 py-1.5 font-mono text-xs bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                {FIREFOX_MAJORS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
              <span className="text-slate-400">–</span>
              <select
                aria-label="Firefox maximum version"
                value={versionRanges.firefoxMax}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  onChangeVersionRanges({
                    ...versionRanges,
                    firefoxMax: val,
                    firefoxMin: Math.min(val, versionRanges.firefoxMin),
                  });
                }}
                className="flex-1 px-2 py-1.5 font-mono text-xs bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                {FIREFOX_MAJORS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Safari 18.3 - 27.2 */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-slate-600 font-medium w-20 shrink-0">Safari</span>
            <div className="flex items-center gap-1.5 flex-1">
              <select
                aria-label="Safari minimum version"
                value={versionRanges.safariMin}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  onChangeVersionRanges({
                    ...versionRanges,
                    safariMin: val,
                    safariMax: Math.max(val, versionRanges.safariMax),
                  });
                }}
                className="flex-1 px-2 py-1.5 font-mono text-xs bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                {SAFARI_VERSIONS.map((v) => (
                  <option key={v} value={v}>
                    {v.toFixed(1)}
                  </option>
                ))}
              </select>
              <span className="text-slate-400">–</span>
              <select
                aria-label="Safari maximum version"
                value={versionRanges.safariMax}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  onChangeVersionRanges({
                    ...versionRanges,
                    safariMax: val,
                    safariMin: Math.min(val, versionRanges.safariMin),
                  });
                }}
                className="flex-1 px-2 py-1.5 font-mono text-xs bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                {SAFARI_VERSIONS.map((v) => (
                  <option key={v} value={v}>
                    {v.toFixed(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Samsung Internet 27 - 31 */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-slate-600 font-medium w-20 shrink-0">Samsung</span>
            <div className="flex items-center gap-1.5 flex-1">
              <select
                aria-label="Samsung Internet minimum version"
                value={versionRanges.samsungMin}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  onChangeVersionRanges({
                    ...versionRanges,
                    samsungMin: val,
                    samsungMax: Math.max(val, versionRanges.samsungMax),
                  });
                }}
                className="flex-1 px-2 py-1.5 font-mono text-xs bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                {SAMSUNG_MAJORS.map((m) => (
                  <option key={m} value={m}>
                    {m}.0
                  </option>
                ))}
              </select>
              <span className="text-slate-400">–</span>
              <select
                aria-label="Samsung Internet maximum version"
                value={versionRanges.samsungMax}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  onChangeVersionRanges({
                    ...versionRanges,
                    samsungMax: val,
                    samsungMin: Math.min(val, versionRanges.samsungMin),
                  });
                }}
                className="flex-1 px-2 py-1.5 font-mono text-xs bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                {SAMSUNG_MAJORS.map((m) => (
                  <option key={m} value={m}>
                    {m}.0
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="h-px bg-slate-100" />

      {/* Devices / OS */}
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <h2 className="text-sm font-semibold text-slate-900">Devices &amp; OS</h2>
          <div className="flex items-center gap-2 text-xs">
            <button
              type="button"
              onClick={() => onSetDevices(DEVICE_LIST.map((d) => d.id))}
              className="text-blue-600 hover:underline font-medium cursor-pointer"
            >
              All
            </button>
            <span className="text-slate-300" aria-hidden="true">/</span>
            <button
              type="button"
              onClick={() => onSetDevices(['android', 'iphone'])}
              className="text-slate-500 hover:text-slate-800 cursor-pointer"
            >
              Mobile
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-1.5">
          {DEVICE_LIST.map((d) => {
            const active = devices.includes(d.id);
            return (
              <button
                key={d.id}
                type="button"
                onClick={() => onToggleDevice(d.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                  active
                    ? 'bg-blue-50/70 border-blue-200 text-slate-900'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span
                  className={`w-3.5 h-3.5 rounded flex items-center justify-center shrink-0 border ${
                    active
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : 'bg-white border-slate-300'
                  }`}
                >
                  {active && <Check className="w-2.5 h-2.5" strokeWidth={2.5} />}
                </span>
                <span className="truncate">{d.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="h-px bg-slate-100" />

      {/* Version Freshness */}
      <div>
        <h2 className="text-sm font-semibold text-slate-900 mb-2">Social &amp; OS Release Window</h2>
        <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-lg">
          {(
            [
              { id: 'latest', label: '2026 Top' },
              { id: 'recent', label: '2025–26' },
              { id: 'all', label: 'Full Pool' },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onChangeFreshness(item.id)}
              className={`px-2 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                freshness === item.id
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Traffic & Uniqueness Mode */}
      <div>
        <h2 className="text-sm font-semibold text-slate-900 mb-2">Volume &amp; Uniqueness</h2>
        <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-lg mb-2">
          <button
            type="button"
            onClick={() => onChangeTrafficMode('unique')}
            className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
              trafficMode === 'unique'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Strict Unique
          </button>
          <button
            type="button"
            onClick={() => onChangeTrafficMode('organic')}
            className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
              trafficMode === 'organic'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Organic Weighted
          </button>
        </div>
        <p className="text-xs text-slate-500 leading-relaxed">
          {trafficMode === 'unique'
            ? 'Every line is strictly unique up to the authentic combination limit.'
            : 'Samples by real market-share weights so any filter scales to 1,00,000+ lines.'}
        </p>
      </div>

      {/* Locale / Carrier Bias */}
      <div>
        <label htmlFor="locale-select" className="block text-sm font-semibold text-slate-900 mb-2">
          Region &amp; Carrier Locale
        </label>
        <select
          id="locale-select"
          value={localePreset}
          onChange={(e) => onChangeLocale(e.target.value as LocalePreset)}
          className="w-full px-3 py-2 text-xs font-medium text-slate-800 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
        >
          <option value="global">Global Mix (US, EU, BD, IN, BR)</option>
          <option value="south_asia">South Asia (BD / IN — GP, Robi, Jio)</option>
          <option value="us">United States (en_US — T-Mobile, AT&amp;T, VZW)</option>
          <option value="europe">Europe (UK, DE, FR, ES)</option>
          <option value="latam">Latin America (BR, MX, AR)</option>
        </select>
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
          Prevents repeating any User-Agent generated in the last 7 days.
        </p>
        <div className="flex items-center justify-between text-xs pt-1">
          <span className="text-slate-500 font-mono tabular-nums">
            {protectedUaCount.toLocaleString('en-IN')} protected (7d)
          </span>
          {protectedUaCount > 0 && (
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

      {/* Pool Capacity Readout */}
      <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
        <span className="text-slate-500">Authentic Unique Pool</span>
        <span className="font-mono font-semibold text-slate-900 tabular-nums">
          {validPairsCount === 0
            ? '0 (Select compatible OS)'
            : estimatedPool > 1_000_000
            ? `${(estimatedPool / 1_000_000).toFixed(1)}M+`
            : estimatedPool.toLocaleString('en-IN')}
        </span>
      </div>
    </aside>
  );
}
