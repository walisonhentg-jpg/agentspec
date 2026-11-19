import {
  ANDROID_DEVICES,
  ANDROID_OS_LIST,
  AndroidDeviceModel,
  AndroidOsSpec,
  BROWSER_LIST,
  BrowserType,
  CARRIER_POOLS,
  CHROMIUM_RELEASES,
  ChromiumRelease,
  DEVICE_LIST,
  DeviceType,
  FACEBOOK_VERSIONS,
  FIREFOX_RELEASES,
  FreshnessWindow,
  INSTAGRAM_VERSIONS,
  IOS_RELEASES,
  IPHONE_MODELS,
  IphoneModel,
  IosRelease,
  LOCALE_POOLS,
  LocalePreset,
  OEM_ANDROID_BUILDS,
  SAMSUNG_BROWSER_PAIRS,
  TIKTOK_VERSIONS,
  YOUTUBE_VERSIONS,
} from '../data/uaRegistry';
import { sevenDayStore } from './sevenDayStore';

export type TrafficMode = 'unique' | 'organic';

export interface VersionRangeFilter {
  chromeMin: number;
  chromeMax: number;
  firefoxMin: number;
  firefoxMax: number;
  safariMin: number;
  safariMax: number;
  samsungMin: number;
  samsungMax: number;
}

export const DEFAULT_VERSION_RANGES: VersionRangeFilter = {
  chromeMin: 132,
  chromeMax: 158,
  firefoxMin: 138,
  firefoxMax: 160,
  safariMin: 18.3,
  safariMax: 27.2,
  samsungMin: 27,
  samsungMax: 31,
};

export interface GeneratorConfig {
  browsers: BrowserType[];
  devices: DeviceType[];
  freshness: FreshnessWindow;
  trafficMode: TrafficMode;
  localePreset: LocalePreset;
  versionRanges?: VersionRangeFilter;
  sevenDayGuard?: boolean;
  skipHistoryRecord?: boolean;
  count: number;
}

export interface UaBatchResult {
  lines: string[];
  browserCodes: Uint8Array;
  deviceCodes: Uint8Array;
  uniqueCount: number;
  requestedCount: number;
  durationMs: number;
  poolCapacity: number;
  poolExhausted: boolean;
}

export const BROWSER_INDEX_MAP: Record<BrowserType, number> = {
  chrome: 0,
  safari: 1,
  firefox: 2,
  edge: 3,
  samsung: 4,
  facebook: 5,
  instagram: 6,
  youtube: 7,
  tiktok: 8,
  android_webview: 9,
};

export const INDEX_TO_BROWSER: BrowserType[] = [
  'chrome',
  'safari',
  'firefox',
  'edge',
  'samsung',
  'facebook',
  'instagram',
  'youtube',
  'tiktok',
  'android_webview',
];

export const DEVICE_INDEX_MAP: Record<DeviceType, number> = {
  android: 0,
  iphone: 1,
  windows: 2,
  macos: 3,
  linux: 4,
};

export const INDEX_TO_DEVICE: DeviceType[] = [
  'android',
  'iphone',
  'windows',
  'macos',
  'linux',
];

function isTierIncluded(itemTier: FreshnessWindow, selected: FreshnessWindow): boolean {
  if (selected === 'all') return true;
  if (selected === 'recent') return itemTier === 'latest' || itemTier === 'recent';
  return itemTier === 'latest';
}

function filterVersionPools(
  freshness: FreshnessWindow,
  ranges: VersionRangeFilter = DEFAULT_VERSION_RANGES
) {
  const cMin = Math.min(ranges.chromeMin, ranges.chromeMax);
  const cMax = Math.max(ranges.chromeMin, ranges.chromeMax);
  const fMin = Math.min(ranges.firefoxMin, ranges.firefoxMax);
  const fMax = Math.max(ranges.firefoxMin, ranges.firefoxMax);
  const sMin = Math.min(ranges.safariMin, ranges.safariMax);
  const sMax = Math.max(ranges.safariMin, ranges.safariMax);
  const sbMin = Math.min(ranges.samsungMin, ranges.samsungMax);
  const sbMax = Math.max(ranges.samsungMin, ranges.samsungMax);

  const chromes = CHROMIUM_RELEASES.filter(
    (r) => r.major >= cMin && r.major <= cMax && (cMin > 132 || cMax < 158 ? true : isTierIncluded(r.tier, freshness))
  );
  const firefoxes = FIREFOX_RELEASES.filter(
    (r) => r.major >= fMin && r.major <= fMax && (fMin > 138 || fMax < 160 ? true : isTierIncluded(r.tier, freshness))
  );
  const iosList = IOS_RELEASES.filter(
    (r) => r.safariNumeric >= sMin && r.safariNumeric <= sMax && (sMin > 18.3 || sMax < 27.2 ? true : isTierIncluded(r.tier, freshness))
  );
  const sbs = SAMSUNG_BROWSER_PAIRS.filter(
    (r) => r.major >= sbMin && r.major <= sbMax && (sbMin > 27 || sbMax < 31 ? true : isTierIncluded(r.tier, freshness))
  );

  return {
    chromes: chromes.length > 0 ? chromes : CHROMIUM_RELEASES.filter((r) => r.major >= cMin && r.major <= cMax),
    firefoxes: firefoxes.length > 0 ? firefoxes : FIREFOX_RELEASES.filter((r) => r.major >= fMin && r.major <= fMax),
    iosList: iosList.length > 0 ? iosList : IOS_RELEASES.filter((r) => r.safariNumeric >= sMin && r.safariNumeric <= sMax),
    sbs: sbs.length > 0 ? sbs : SAMSUNG_BROWSER_PAIRS.filter((r) => r.major >= sbMin && r.major <= sbMax),
  };
}

// Fast xorshift32 PRNG for millions of UAs per second
function createFastRng(seed: number) {
  let s = seed | 0 || 123456789;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return (s >>> 0) / 4294967296;
  };
}

function pickWeighted<T extends { weight: number }>(items: T[], rng: () => number): T {
  let total = 0;
  for (let i = 0; i < items.length; i++) total += items[i].weight;
  let r = rng() * total;
  for (let i = 0; i < items.length; i++) {
    r -= items[i].weight;
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

function pickRandom<T>(arr: T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)];
}

function randInt(min: number, max: number, rng: () => number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

export interface ValidPair {
  browser: BrowserType;
  device: DeviceType;
  weight: number;
}

export function getValidPairs(browsers: BrowserType[], devices: DeviceType[]): ValidPair[] {
  const deviceSet = new Set(devices);
  const pairs: ValidPair[] = [];
  for (const bMeta of BROWSER_LIST) {
    if (!browsers.includes(bMeta.id)) continue;
    for (const d of bMeta.supportedDevices) {
      if (!deviceSet.has(d)) continue;
      const dMeta = DEVICE_LIST.find((x) => x.id === d);
      pairs.push({
        browser: bMeta.id,
        device: d,
        weight: Math.max(1, Math.round((bMeta.weight * (dMeta?.weight ?? 10)) / 10)),
      });
    }
  }
  return pairs;
}

export function estimateUniquePoolSize(config: Omit<GeneratorConfig, 'count' | 'trafficMode'>): number {
  const pairs = getValidPairs(config.browsers, config.devices);
  if (pairs.length === 0) return 0;

  const { chromes, firefoxes, iosList, sbs } = filterVersionPools(
    config.freshness,
    config.versionRanges
  );
  const androidOs = ANDROID_OS_LIST.filter((r) => isTierIncluded(r.tier, config.freshness));
  const fbs = FACEBOOK_VERSIONS.filter((r) => isTierIncluded(r.tier, config.freshness));
  const igs = INSTAGRAM_VERSIONS.filter((r) => isTierIncluded(r.tier, config.freshness));
  const yts = YOUTUBE_VERSIONS.filter((r) => isTierIncluded(r.tier, config.freshness));
  const tts = TIKTOK_VERSIONS.filter((r) => isTierIncluded(r.tier, config.freshness));

  const localesCount = LOCALE_POOLS[config.localePreset].length;
  const carriersCount = CARRIER_POOLS[config.localePreset].length;

  let avgChromePatches = 0;
  let avgChromeIosPatches = 0;
  let avgEdgeDesktopPatches = 0;
  let avgEdgeMobilePatches = 0;
  for (const c of chromes) {
    avgChromePatches += c.androidPatches.length;
    avgChromeIosPatches += c.iosPatches.length;
    avgEdgeDesktopPatches += c.edgeDesktopPatches.length;
    avgEdgeMobilePatches += c.edgeAndroidPatches.length + c.edgeIosPatches.length;
  }

  const androidBuildsCount = androidOs.reduce((acc, os) => acc + os.buildIds.length, 0);
  const androidDeviceCount = ANDROID_DEVICES.length;
  const iphoneCount = IPHONE_MODELS.length;
  const iosBuildCount = iosList.reduce((acc, r) => acc + r.buildIds.length, 0);

  let total = 0;
  for (const p of pairs) {
    switch (p.browser) {
      case 'chrome':
        if (p.device === 'windows' || p.device === 'macos' || p.device === 'linux') {
          total += chromes.length;
        } else if (p.device === 'android') {
          total += chromes.length; // UA-reduced Chrome Android
        } else if (p.device === 'iphone') {
          total += iosList.length * Math.max(1, avgChromeIosPatches);
        }
        break;
      case 'safari':
        if (p.device === 'macos') {
          total += iosList.length; // Safari versions matching macOS Safari
        } else if (p.device === 'iphone') {
          total += iosList.length;
        }
        break;
      case 'firefox':
        if (p.device === 'android') {
          total += firefoxes.length * androidOs.length;
        } else if (p.device === 'iphone') {
          total += firefoxes.length * iosList.length;
        } else {
          total += firefoxes.length;
        }
        break;
      case 'edge':
        if (p.device === 'iphone') {
          total += Math.max(1, avgEdgeMobilePatches) * iosList.length;
        } else if (p.device === 'android') {
          total += Math.max(1, avgEdgeMobilePatches);
        } else {
          total += Math.max(1, avgEdgeDesktopPatches);
        }
        break;
      case 'samsung':
        total += sbs.length;
        break;
      case 'facebook':
        if (p.device === 'android') {
          total += androidDeviceCount * androidBuildsCount * avgChromePatches * fbs.length * localesCount * carriersCount;
        } else {
          total += iphoneCount * iosBuildCount * fbs.length * localesCount * 20;
        }
        break;
      case 'instagram':
        if (p.device === 'android') {
          total += androidDeviceCount * androidBuildsCount * avgChromePatches * igs.length * localesCount;
        } else {
          total += iphoneCount * iosBuildCount * igs.length * localesCount;
        }
        break;
      case 'youtube':
        if (p.device === 'android') {
          total += androidDeviceCount * androidBuildsCount * yts.length * localesCount;
        } else {
          total += iphoneCount * iosBuildCount * yts.length * localesCount;
        }
        break;
      case 'android_webview':
        total += androidDeviceCount * androidBuildsCount * avgChromePatches;
        break;
      case 'tiktok':
        if (p.device === 'android') {
          total += androidDeviceCount * androidBuildsCount * avgChromePatches * tts.length * localesCount;
        } else {
          total += iphoneCount * iosBuildCount * tts.length * localesCount;
        }
        break;
    }
  }
  return total;
}

function buildUserAgent(
  browser: BrowserType,
  device: DeviceType,
  pools: {
    chromes: ChromiumRelease[];
    firefoxes: typeof FIREFOX_RELEASES;
    iosList: IosRelease[];
    androidOs: AndroidOsSpec[];
    fbs: typeof FACEBOOK_VERSIONS;
    igs: typeof INSTAGRAM_VERSIONS;
    yts: typeof YOUTUBE_VERSIONS;
    tts: typeof TIKTOK_VERSIONS;
    sbs: typeof SAMSUNG_BROWSER_PAIRS;
    locales: string[];
    carriers: string[];
  },
  rng: () => number
): string {
  const pickChrome = () => pickWeighted(pools.chromes, rng);
  const pickChromeAndroid = (): { ch: ChromiumRelease; patch: number } => {
    const eligible = pools.chromes.filter((c) => c.androidPatches.length > 0);
    const ch = pickWeighted(eligible.length > 0 ? eligible : pools.chromes, rng);
    const patch = pickRandom(ch.androidPatches.length > 0 ? ch.androidPatches : [ch.maxPatch], rng);
    return { ch, patch };
  };
  const pickChromeIos = (): { ch: ChromiumRelease; patch: number } => {
    const eligible = pools.chromes.filter((c) => c.iosPatches.length > 0);
    const pool = eligible.length > 0
      ? eligible
      : CHROMIUM_RELEASES.filter((c) => c.iosPatches.length > 0);
    const ch = pickWeighted(pool, rng);
    const patch = pickRandom(ch.iosPatches, rng);
    return { ch, patch };
  };
  const pickIos = () => pickWeighted(pools.iosList, rng);

  const pickCompatibleIphoneAndIos = (): { ios: IosRelease; iphone: IphoneModel; buildId: string } => {
    const ios = pickIos();
    const eligible = IPHONE_MODELS.filter((m) => m.minIosMajor <= ios.major);
    const iphone = pickWeighted(eligible.length > 0 ? eligible : IPHONE_MODELS, rng);
    const buildId = pickRandom(ios.buildIds, rng);
    return { ios, iphone, buildId };
  };

  const pickCompatibleAndroid = (samsungOnly = false): {
    os: AndroidOsSpec;
    deviceModel: AndroidDeviceModel;
    buildId: string;
  } => {
    const os = pickWeighted(pools.androidOs, rng);
    const osNum = Number(os.version);
    const getModelBuilds = (d: AndroidDeviceModel, osVer: number) =>
      d.androidBuilds?.[osVer] ?? OEM_ANDROID_BUILDS[d.oem]?.[osVer];
    const isEligible = (d: AndroidDeviceModel, osVer: number, onlySam: boolean) => {
      const modelBuilds = getModelBuilds(d, osVer);
      return (
        osVer >= d.minAndroid &&
        osVer <= d.maxAndroid &&
        Boolean(modelBuilds && modelBuilds.length > 0) &&
        (!onlySam || d.samsungOnly)
      );
    };

    let chosenOs = os;
    let eligible = ANDROID_DEVICES.filter((d) => isEligible(d, osNum, samsungOnly));
    if (eligible.length === 0) {
      eligible = ANDROID_DEVICES.filter((d) => isEligible(d, osNum, false));
    }
    if (eligible.length === 0) {
      chosenOs = pools.androidOs[0] ?? ANDROID_OS_LIST[0];
      const fallbackOsNum = Number(chosenOs.version);
      eligible = ANDROID_DEVICES.filter((d) => isEligible(d, fallbackOsNum, false));
    }
    const deviceModel = pickWeighted(eligible, rng);
    const modelBuilds = getModelBuilds(deviceModel, Number(chosenOs.version));
    const buildId =
      modelBuilds && modelBuilds.length > 0
        ? pickRandom(modelBuilds, rng)
        : pickRandom(chosenOs.buildIds, rng);
    return { os: chosenOs, deviceModel, buildId };
  };

  if (browser === 'chrome') {
    const ch = pickChrome();
    if (device === 'windows') {
      return `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${ch.major}.0.0.0 Safari/537.36`;
    }
    if (device === 'macos') {
      return `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${ch.major}.0.0.0 Safari/537.36`;
    }
    if (device === 'linux') {
      return `Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${ch.major}.0.0.0 Safari/537.36`;
    }
    if (device === 'android') {
      // Chromium Android UA-Reduction standard
      return `Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${ch.major}.0.0.0 Mobile Safari/537.36`;
    }
    // iPhone CriOS (strictly Chrome for iOS verified patches)
    const ios = pickIos();
    const { ch: iosCh, patch } = pickChromeIos();
    return `Mozilla/5.0 (iPhone; CPU iPhone OS ${ios.safariWebOsUnderscore} like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/${iosCh.major}.0.${iosCh.branch}.${patch} Mobile/15E148 Safari/604.1`;
  }

  if (browser === 'safari') {
    const ios = pickIos();
    if (device === 'macos') {
      return `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/${ios.safariVersion} Safari/605.1.15`;
    }
    return `Mozilla/5.0 (iPhone; CPU iPhone OS ${ios.safariWebOsUnderscore} like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/${ios.safariVersion} Mobile/15E148 Safari/604.1`;
  }

  if (browser === 'firefox') {
    const ff = pickWeighted(pools.firefoxes, rng);
    if (device === 'windows') {
      return `Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:${ff.version}) Gecko/20100101 Firefox/${ff.version}`;
    }
    if (device === 'macos') {
      return `Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:${ff.version}) Gecko/20100101 Firefox/${ff.version}`;
    }
    if (device === 'linux') {
      return `Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:${ff.version}) Gecko/20100101 Firefox/${ff.version}`;
    }
    if (device === 'android') {
      const os = pickWeighted(pools.androidOs, rng);
      return `Mozilla/5.0 (Android ${os.version}; Mobile; rv:${ff.version}) Gecko/${ff.version} Firefox/${ff.version}`;
    }
    const ios = pickIos();
    return `Mozilla/5.0 (iPhone; CPU iPhone OS ${ios.safariWebOsUnderscore} like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/${ff.version} Mobile/15E148 Safari/605.1.15`;
  }

  if (browser === 'edge') {
    if (device === 'windows' || device === 'macos') {
      const eligible = pools.chromes.filter((c) => c.edgeDesktopPatches.length > 0);
      const pool = eligible.length > 0
        ? eligible
        : CHROMIUM_RELEASES.filter((c) => c.edgeDesktopPatches.length > 0);
      const ch = pickWeighted(pool, rng);
      const edgePatch = pickRandom(ch.edgeDesktopPatches, rng);
      if (device === 'windows') {
        return `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${ch.major}.0.0.0 Safari/537.36 Edg/${ch.major}.0.${ch.edgeBranch}.${edgePatch}`;
      }
      return `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${ch.major}.0.0.0 Safari/537.36 Edg/${ch.major}.0.${ch.edgeBranch}.${edgePatch}`;
    }
    if (device === 'android') {
      const eligible = pools.chromes.filter((c) => c.edgeAndroidPatches.length > 0);
      const pool = eligible.length > 0
        ? eligible
        : CHROMIUM_RELEASES.filter((c) => c.edgeAndroidPatches.length > 0);
      const ch = pickWeighted(pool, rng);
      const edgePatch = pickRandom(ch.edgeAndroidPatches, rng);
      return `Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${ch.major}.0.0.0 Mobile Safari/537.36 EdgA/${ch.major}.0.${ch.edgeBranch}.${edgePatch}`;
    }
    const ios = pickIos();
    const eligible = pools.chromes.filter((c) => c.edgeIosPatches.length > 0);
    const pool = eligible.length > 0
      ? eligible
      : CHROMIUM_RELEASES.filter((c) => c.edgeIosPatches.length > 0);
    const ch = pickWeighted(pool, rng);
    const edgePatch = pickRandom(ch.edgeIosPatches, rng);
    return `Mozilla/5.0 (iPhone; CPU iPhone OS ${ios.safariWebOsUnderscore} like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 EdgiOS/${ch.major}.${ch.edgeBranch}.${edgePatch} Mobile/15E148 Safari/605.1.15`;
  }

  if (browser === 'samsung') {
    const sb = pickRandom(pools.sbs, rng);
    return `Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/${sb.sbVer} Chrome/${sb.chromeVer} Mobile Safari/537.36`;
  }

  if (browser === 'facebook') {
    const fb = pickRandom(pools.fbs, rng);
    const locale = pickRandom(pools.locales, rng);
    if (device === 'android') {
      const { ch, patch } = pickChromeAndroid();
      const { os, deviceModel, buildId } = pickCompatibleAndroid();
      const carrier = pickRandom(pools.carriers, rng);
      const [w, h] = deviceModel.res.split('x');
      const densityMap: Record<number, string> = {
        320: '2.0',
        400: '2.5',
        420: '2.625',
        440: '2.75',
        450: '2.8125',
        480: '3.0',
        560: '3.5',
      };
      const density = densityMap[deviceModel.dpi] ?? (deviceModel.dpi / 160).toFixed(2);
      const fbrv = String(Number(fb.build) + randInt(100000, 999999, rng));

      // Alternate authentically between compact IAB and full FB4A metadata signatures
      if (rng() < 0.35) {
        return `Mozilla/5.0 (Linux; Android ${os.version}; ${deviceModel.model} Build/${buildId}; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/${ch.major}.0.${ch.branch}.${patch} Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/${fb.ver};IABMV/1;]`;
      }
      return `Mozilla/5.0 (Linux; Android ${os.version}; ${deviceModel.model} Build/${buildId}; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/${ch.major}.0.${ch.branch}.${patch} Mobile Safari/537.36 [FBAN/FB4A;FBAV/${fb.ver};FBBV/${fb.build};FBDM/{density=${density},width=${w},height=${h}};FBLC/${locale};FBRV/${fbrv};FBCR/${carrier};FBMF/${deviceModel.brand};FBBD/${deviceModel.brand};FBPN/com.facebook.katana;FBDV/${deviceModel.model};FBSV/${os.version};FBOP/1;FBCA/arm64-v8a:;]`;
    }

    const { ios, iphone, buildId } = pickCompatibleIphoneAndIos();
    const fbShortVer = fb.ver.split('.').slice(0, 3).join('.');
    const fbrv = String(Number(fb.build) + randInt(100000, 999999, rng));
    return `Mozilla/5.0 (iPhone; CPU iPhone OS ${ios.osUnderscore} like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/${buildId} [FBAN/FBIOS;FBAV/${fbShortVer};FBBV/${fb.build};FBDV/${iphone.id};FBMD/iPhone;FBSN/iOS;FBSV/${ios.osDot};FBSS/${iphone.scale};FBID/phone;FBLC/${locale};FBOP/5;FBRV/${fbrv}]`;
  }

  if (browser === 'instagram') {
    const ig = pickRandom(pools.igs, rng);
    const locale = pickRandom(pools.locales, rng);
    if (device === 'android') {
      const { ch, patch } = pickChromeAndroid();
      const { os, deviceModel, buildId } = pickCompatibleAndroid();
      return `Mozilla/5.0 (Linux; Android ${os.version}; ${deviceModel.model} Build/${buildId}; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/${ch.major}.0.${ch.branch}.${patch} Mobile Safari/537.36 Instagram ${ig.ver} Android (${os.sdk}/${os.version}; ${deviceModel.dpi}dpi; ${deviceModel.res}; ${deviceModel.brand}; ${deviceModel.model}; ${deviceModel.board}; ${deviceModel.chipset}; ${locale}; ${ig.build})`;
    }
    const { ios, iphone, buildId } = pickCompatibleIphoneAndIos();
    const lang = locale.split('_')[0];
    return `Mozilla/5.0 (iPhone; CPU iPhone OS ${ios.osUnderscore} like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/${buildId} Instagram ${ig.ver} (${iphone.id}; iOS ${ios.osUnderscore}; ${locale}; ${lang}; scale=${iphone.scale}.00; ${iphone.pxRes}; ${ig.build})`;
  }

  if (browser === 'youtube') {
    const yt = pickRandom(pools.yts, rng);
    const locale = pickRandom(pools.locales, rng);
    if (device === 'android') {
      const { os, deviceModel, buildId } = pickCompatibleAndroid();
      // Native YouTube Android App (Cronet networking client)
      return `com.google.android.youtube/${yt.ver} (Linux; U; Android ${os.version}; ${locale}; ${deviceModel.model}; Build/${buildId}) Cronet/${yt.cronet}`;
    }
    const { ios, iphone } = pickCompatibleIphoneAndIos();
    // Native YouTube iOS App
    return `com.google.ios.youtube/${yt.ver} (${iphone.id}; U; CPU iOS ${ios.osUnderscore} like Mac OS X; ${locale})`;
  }

  if (browser === 'android_webview') {
    const { ch, patch } = pickChromeAndroid();
    const { os, deviceModel, buildId } = pickCompatibleAndroid();
    // Standard Android System WebView (; wv + Version/4.0 + verified Chromium Android branch)
    return `Mozilla/5.0 (Linux; Android ${os.version}; ${deviceModel.model} Build/${buildId}; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/${ch.major}.0.${ch.branch}.${patch} Mobile Safari/537.36`;
  }

  // TikTok IAB
  const tt = pickRandom(pools.tts, rng);
  const locale = pickRandom(pools.locales, rng);
  const [lang, region] = locale.split('_');
  const localeDash = `${lang}-${region || 'US'}`;
  if (device === 'android') {
    const { ch, patch } = pickChromeAndroid();
    const { os, deviceModel, buildId } = pickCompatibleAndroid();
    return `Mozilla/5.0 (Linux; Android ${os.version}; ${deviceModel.model} Build/${buildId}; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/${ch.major}.0.${ch.branch}.${patch} Mobile Safari/537.36 trill_${tt.build} JsSdk/1.0 NetType/WIFI Channel/googleplay AppName/musical_ly app_version/${tt.ver} ByteLocale/${localeDash} Region/${region || 'US'} BytedanceWebview/d8a21c6`;
  }
  const { ios, iphone, buildId } = pickCompatibleIphoneAndIos();
  return `Mozilla/5.0 (iPhone; CPU iPhone OS ${ios.osUnderscore} like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/${buildId} BytedanceWebview/d8a21c6 Musical_ly/${tt.ver} (${iphone.id}; iOS ${ios.osDot}; ${localeDash}; Scale/${iphone.scale}.00)`;
}

export async function generateUserAgentsAsync(
  config: GeneratorConfig,
  onProgress?: (pct: number) => void
): Promise<UaBatchResult> {
  const start = performance.now();
  const pairs = getValidPairs(config.browsers, config.devices);
  const poolCapacity = estimateUniquePoolSize(config);

  if (pairs.length === 0 || config.count <= 0) {
    return {
      lines: [],
      browserCodes: new Uint8Array(0),
      deviceCodes: new Uint8Array(0),
      uniqueCount: 0,
      requestedCount: config.count,
      durationMs: 0,
      poolCapacity: 0,
      poolExhausted: false,
    };
  }

  const filteredPools = filterVersionPools(config.freshness, config.versionRanges);
  const pools = {
    chromes: filteredPools.chromes,
    firefoxes: filteredPools.firefoxes,
    iosList: filteredPools.iosList,
    androidOs: ANDROID_OS_LIST.filter((r) => isTierIncluded(r.tier, config.freshness)),
    fbs: FACEBOOK_VERSIONS.filter((r) => isTierIncluded(r.tier, config.freshness)),
    igs: INSTAGRAM_VERSIONS.filter((r) => isTierIncluded(r.tier, config.freshness)),
    yts: YOUTUBE_VERSIONS.filter((r) => isTierIncluded(r.tier, config.freshness)),
    tts: TIKTOK_VERSIONS.filter((r) => isTierIncluded(r.tier, config.freshness)),
    sbs: filteredPools.sbs,
    locales: LOCALE_POOLS[config.localePreset],
    carriers: CARRIER_POOLS[config.localePreset],
  };

  const rng = createFastRng((Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0);
  const target = Math.min(config.count, 1_000_000);

  const lines: string[] = [];
  const browserArr: number[] = [];
  const deviceArr: number[] = [];

  const CHUNK_SIZE = 20_000;
  let poolExhausted = false;

  const useSevenDay = config.sevenDayGuard !== false;
  const shouldRecord = useSevenDay && !config.skipHistoryRecord;

  if (config.trafficMode === 'unique') {
    const seen = new Set<string>();
    const maxAttempts = Math.min(target * 4, target + 250_000);
    let attempts = 0;
    let consecutiveDupes = 0;

    while (lines.length < target && attempts < maxAttempts) {
      const chunkEnd = Math.min(attempts + CHUNK_SIZE, maxAttempts);
      while (lines.length < target && attempts < chunkEnd) {
        attempts++;
        const pair = pickWeighted(pairs, rng);
        const ua = buildUserAgent(pair.browser, pair.device, pools, rng);
        const alreadyIn7Days = useSevenDay && sevenDayStore.has('ua', ua);
        if (!seen.has(ua) && !alreadyIn7Days) {
          seen.add(ua);
          lines.push(ua);
          browserArr.push(BROWSER_INDEX_MAP[pair.browser]);
          deviceArr.push(DEVICE_INDEX_MAP[pair.device]);
          consecutiveDupes = 0;
        } else {
          consecutiveDupes++;
          if (consecutiveDupes > 3500) {
            poolExhausted = true;
            break;
          }
        }
      }
      if (poolExhausted) break;
      if (onProgress) {
        onProgress(Math.min(99, Math.round((lines.length / target) * 100)));
        await new Promise((r) => setTimeout(r, 0));
      }
    }
    if (lines.length < target) {
      poolExhausted = true;
    }

    if (shouldRecord && lines.length > 0) {
      void sevenDayStore.recordBatch(
        lines.map((value) => ({ category: 'ua' as const, value }))
      );
    }

    const browserCodes = new Uint8Array(browserArr);
    const deviceCodes = new Uint8Array(deviceArr);
    if (onProgress) onProgress(100);

    return {
      lines,
      browserCodes,
      deviceCodes,
      uniqueCount: seen.size,
      requestedCount: target,
      durationMs: Math.round(performance.now() - start),
      poolCapacity,
      poolExhausted,
    };
  }

  // Organic Weighted Traffic mode: builds a diverse deduplicated memory pool first (up to min(target, 150k))
  // or direct weighted sampling so even 5,00,000+ rows finish instantaneously with tiny RAM footprint!
  const uniqueSet = new Set<string>();
  const browserCodes = new Uint8Array(target);
  const deviceCodes = new Uint8Array(target);

  for (let i = 0; i < target; i += CHUNK_SIZE) {
    const end = Math.min(i + CHUNK_SIZE, target);
    for (let j = i; j < end; j++) {
      let pair = pickWeighted(pairs, rng);
      let ua = buildUserAgent(pair.browser, pair.device, pools, rng);
      if (useSevenDay) {
        let guard = 0;
        while (sevenDayStore.has('ua', ua) && guard < 6) {
          guard++;
          pair = pickWeighted(pairs, rng);
          ua = buildUserAgent(pair.browser, pair.device, pools, rng);
        }
      }
      lines.push(ua);
      browserCodes[j] = BROWSER_INDEX_MAP[pair.browser];
      deviceCodes[j] = DEVICE_INDEX_MAP[pair.device];
      if (uniqueSet.size < 200_000) {
        uniqueSet.add(ua);
      }
    }
    if (onProgress) {
      onProgress(Math.min(99, Math.round((end / target) * 100)));
      await new Promise((r) => setTimeout(r, 0));
    }
  }

  if (shouldRecord && uniqueSet.size > 0) {
    void sevenDayStore.recordBatch(
      Array.from(uniqueSet, (value) => ({ category: 'ua' as const, value }))
    );
  }

  if (onProgress) onProgress(100);
  return {
    lines,
    browserCodes,
    deviceCodes,
    uniqueCount: uniqueSet.size,
    requestedCount: target,
    durationMs: Math.round(performance.now() - start),
    poolCapacity,
    poolExhausted: false,
  };
}

export interface ValidationCheck {
  id: string;
  label: string;
  passed: boolean;
  detail: string;
}

export interface ValidationReport {
  isValid: boolean;
  score: number;
  detectedBrowser: string;
  detectedOs: string;
  detectedEngine: string;
  checks: ValidationCheck[];
}

export function validateUserAgent(uaRaw: string): ValidationReport {
  const ua = uaRaw.trim();
  const checks: ValidationCheck[] = [];

  if (!ua) {
    return {
      isValid: false,
      score: 0,
      detectedBrowser: 'Unknown',
      detectedOs: 'Unknown',
      detectedEngine: 'Unknown',
      checks: [{ id: 'empty', label: 'Non-empty string', passed: false, detail: 'No User-Agent string provided.' }],
    };
  }

  // 1. Prefix check
  const isNativeYt = /^com\.google\.(android|ios)\.youtube\//.test(ua);
  const hasMozillaPrefix = ua.startsWith('Mozilla/5.0 (');
  checks.push({
    id: 'prefix',
    label: 'Root Product Token',
    passed: hasMozillaPrefix || isNativeYt,
    detail: hasMozillaPrefix
      ? 'Starts with standard Mozilla/5.0 product token.'
      : isNativeYt
      ? 'Matches official Google YouTube native Cronet/iOS app prefix.'
      : 'Invalid or non-standard root token (expected Mozilla/5.0 or official native prefix).',
  });

  // 2. Automation / Bot Keyword Leak
  const botMatch = ua.match(/(HeadlessChrome|PhantomJS|Selenium|Playwright|Puppeteer|python-requests|curl\/|Wget|Go-http-client|bot\b|crawler|spider|scrapy)/i);
  checks.push({
    id: 'automation',
    label: 'Zero Automation / Headless Leak',
    passed: !botMatch,
    detail: botMatch
      ? `Detected bot/automation signature "${botMatch[0]}".`
      : 'No headless browser, scraper, or CLI client tokens detected.',
  });

  // 3. Windows NT Version Check
  const winMatch = ua.match(/Windows NT (\d+\.\d+)/);
  let winOk = true;
  let winDetail = 'Not a Windows User-Agent.';
  if (winMatch) {
    const nt = winMatch[1];
    winOk = nt === '10.0';
    winDetail = winOk
      ? 'Uses Windows NT 10.0 (correct frozen token for Windows 10 and Windows 11).'
      : `Invalid Windows NT ${nt} detected (Windows 11 never reports NT 11.0 in real browsers).`;
  }
  checks.push({ id: 'win_nt', label: 'Windows NT Token Integrity', passed: winOk, detail: winDetail });

  // 4. macOS Frozen Token Check
  const macMatch = ua.match(/Macintosh; Intel Mac OS X (\d+[._]\d+(?:[._]\d+)?)/);
  let macOk = true;
  let macDetail = 'Not a macOS User-Agent.';
  if (macMatch) {
    const ver = macMatch[1];
    const isFirefox = ua.includes('Firefox/');
    macOk = isFirefox ? ver === '10.15' : ver === '10_15_7';
    macDetail = macOk
      ? `Matches frozen macOS platform token (${ver}).`
      : `Non-standard macOS version "${ver}" — modern browsers freeze at 10_15_7 (or 10.15 for Firefox).`;
  }
  checks.push({ id: 'macos_frozen', label: 'macOS Platform Freeze Compliance', passed: macOk, detail: macDetail });

  // 5. iOS WebKit Engine Lock
  const isIphone = ua.includes('iPhone') || ua.includes('iPad');
  let iosEngineOk = true;
  let iosEngineDetail = 'Not an iOS User-Agent.';
  if (isIphone && !isNativeYt) {
    const hasWebKit605 = ua.includes('AppleWebKit/605.1.15');
    const hasFakeBlink = ua.includes('AppleWebKit/537.36') || /\bChrome\/\d+/.test(ua);
    iosEngineOk = hasWebKit605 && !hasFakeBlink;
    iosEngineDetail = iosEngineOk
      ? 'Uses AppleWebKit/605.1.15 (enforced across all iOS Safari, CriOS, FxiOS, and In-App WebViews).'
      : 'Impossible iOS engine mismatch: iOS browsers cannot use Blink AppleWebKit/537.36 or desktop Chrome/ tokens.';
  }
  checks.push({ id: 'ios_webkit', label: 'iOS WebKit Engine Lock', passed: iosEngineOk, detail: iosEngineDetail });

  // 6. Chrome / CriOS / Edge Branch & UA-Reduction Coherence
  const chromeMatch = ua.match(/Chrome\/(\d+)\.(\d+)\.(\d+)\.(\d+)/);
  const criosMatch = ua.match(/CriOS\/(\d+)\.(\d+)\.(\d+)\.(\d+)/);
  const edgMatch = ua.match(/EdgA?\/(\d+)\.(\d+)\.(\d+)\.(\d+)/);
  const edgiosMatch = ua.match(/EdgiOS\/(\d+)\.(\d+)\.(\d+)/);
  let chromeOk = true;
  let chromeDetail = 'No Chromium version token present.';

  if (chromeMatch) {
    const major = Number(chromeMatch[1]);
    const minor = Number(chromeMatch[2]);
    const branch = Number(chromeMatch[3]);
    const patch = Number(chromeMatch[4]);
    const isDesktop = ua.includes('Windows NT') || ua.includes('Macintosh') || ua.includes('X11; Linux');
    const isWv = ua.includes('; wv)') || ua.includes('FB_IAB') || ua.includes('FBAN') || ua.includes('Instagram') || ua.includes('BytedanceWebview');

    const knownRelease = CHROMIUM_RELEASES.find((r) => r.major === major);

    if (minor !== 0) {
      chromeOk = false;
      chromeDetail = `Chrome minor version is ${minor}; Chromium always uses 0.`;
    } else if (isDesktop && major >= 110 && branch !== 0 && !ua.includes('Edg/')) {
      chromeOk = false;
      chromeDetail = `Desktop Chrome ${major} must use UA-reduced 0.0.0; found non-zero branch .${branch}.`;
    } else if (isWv && knownRelease && branch !== knownRelease.branch) {
      chromeOk = false;
      chromeDetail = `Chrome/${major} WebView branch mismatch: expected official .${knownRelease.branch}.x, found .${branch}.`;
    } else if (isWv && knownRelease && (patch > knownRelease.maxPatch || (major >= 153 && !knownRelease.androidPatches.includes(patch)))) {
      chromeOk = false;
      chromeDetail = `Chrome/${major}.0.${branch}.${patch} is not a verified Chrome for Android build (official: .${knownRelease.androidPatches.join('/.')}).`;
    } else if (branch !== 0 && knownRelease && branch !== knownRelease.branch) {
      chromeOk = false;
      chromeDetail = `Chrome/${major} uses official branch .${knownRelease.branch}, not .${branch}.`;
    } else if (branch !== 0 && knownRelease && (patch > knownRelease.maxPatch || (major >= 153 && !knownRelease.androidPatches.includes(patch)))) {
      chromeOk = false;
      chromeDetail = `Chrome/${major}.0.${branch}.${patch} is not a verified Chrome for Android build (official: .${knownRelease.androidPatches.join('/.')}).`;
    } else {
      chromeDetail = branch === 0
        ? `Valid UA-Reduced Chrome/${major}.0.0.0 token.`
        : `Verified Chrome/${major}.0.${branch}.${patch} matches official Chrome for Android release.`;
    }
  } else if (criosMatch) {
    const major = Number(criosMatch[1]);
    const minor = Number(criosMatch[2]);
    const branch = Number(criosMatch[3]);
    const patch = Number(criosMatch[4]);
    const knownRelease = CHROMIUM_RELEASES.find((r) => r.major === major);

    if (minor !== 0) {
      chromeOk = false;
      chromeDetail = `CriOS minor version is ${minor}; iOS Chrome always uses 0.`;
    } else if (knownRelease && branch !== knownRelease.branch) {
      chromeOk = false;
      chromeDetail = `CriOS/${major} build mismatch: official Chromium branch is .${knownRelease.branch}, found .${branch}.`;
    } else if (knownRelease && patch > knownRelease.maxPatch) {
      chromeOk = false;
      chromeDetail = `CriOS/${major}.0.${branch}.${patch} exceeds verified published patch ceiling (.${knownRelease.maxPatch}).`;
    } else if (knownRelease && knownRelease.iosPatches.length > 0 && !knownRelease.iosPatches.includes(patch)) {
      chromeOk = false;
      chromeDetail = `CriOS/${major}.0.${branch}.${patch} is not a verified Chrome for iOS build (official iOS: .${knownRelease.iosPatches.join('/.')}).`;
    } else {
      chromeDetail = knownRelease
        ? `Verified CriOS/${major}.0.${branch}.${patch} matches official Chrome for iOS release.`
        : `Valid CriOS/${major}.0.${branch}.${patch} token.`;
    }
  }

  if (chromeOk && edgMatch) {
    const major = Number(edgMatch[1]);
    const minor = Number(edgMatch[2]);
    const branch = Number(edgMatch[3]);
    const patch = Number(edgMatch[4]);
    const isAndroidEdge = ua.includes('EdgA/');
    const knownRelease = CHROMIUM_RELEASES.find((r) => r.major === major);
    if (minor !== 0) {
      chromeOk = false;
      chromeDetail = `Edge minor version is ${minor}; Edge Desktop/Android always uses 0.`;
    } else if (knownRelease && branch !== knownRelease.edgeBranch) {
      chromeOk = false;
      chromeDetail = `Edge/${major} build mismatch: official Edge branch is .${knownRelease.edgeBranch}, found .${branch}.`;
    } else if (knownRelease && patch > knownRelease.maxEdgePatch) {
      chromeOk = false;
      chromeDetail = `Edge/${major}.0.${branch}.${patch} exceeds verified Edge release patch (.${knownRelease.maxEdgePatch}).`;
    } else if (isAndroidEdge && knownRelease && knownRelease.edgeAndroidPatches.length > 0 && !knownRelease.edgeAndroidPatches.includes(patch)) {
      chromeOk = false;
      chromeDetail = `EdgA/${major}.0.${branch}.${patch} is not a verified Edge Mobile build (Android: .${knownRelease.edgeAndroidPatches.join('/.')}).`;
    } else if (!isAndroidEdge && knownRelease && knownRelease.edgeDesktopPatches.length > 0 && !knownRelease.edgeDesktopPatches.includes(patch) && major >= 154) {
      chromeOk = false;
      chromeDetail = `Edg/${major}.0.${branch}.${patch} is not a verified Edge Desktop build (Desktop: .${knownRelease.edgeDesktopPatches.join('/.')}).`;
    } else if (knownRelease) {
      chromeDetail = `Verified Edge ${major}.0.${branch}.${patch} matches official Microsoft Edge release.`;
    }
  } else if (chromeOk && edgiosMatch) {
    const major = Number(edgiosMatch[1]);
    const branch = Number(edgiosMatch[2]);
    const patch = Number(edgiosMatch[3]);
    const knownRelease = CHROMIUM_RELEASES.find((r) => r.major === major);
    if (knownRelease && branch !== knownRelease.edgeBranch) {
      chromeOk = false;
      chromeDetail = `EdgiOS/${major} build mismatch: official Edge branch is .${knownRelease.edgeBranch}, found .${branch}.`;
    } else if (knownRelease && patch > knownRelease.maxEdgePatch) {
      chromeOk = false;
      chromeDetail = `EdgiOS/${major}.${branch}.${patch} exceeds verified Edge release patch (.${knownRelease.maxEdgePatch}).`;
    } else if (knownRelease && knownRelease.edgeIosPatches.length > 0 && !knownRelease.edgeIosPatches.includes(patch)) {
      chromeOk = false;
      chromeDetail = `EdgiOS/${major}.${branch}.${patch} is not a verified Edge for iOS build (iOS: .${knownRelease.edgeIosPatches.join('/.')}).`;
    } else if (knownRelease) {
      chromeDetail = `Verified EdgiOS/${major}.${branch}.${patch} matches official Microsoft Edge release.`;
    }
  }
  checks.push({ id: 'chrome_branch', label: 'Chromium / Edge Official Branch', passed: chromeOk, detail: chromeDetail });

  // 7. Firefox Gecko Coherence
  const ffMatch = ua.match(/Firefox\/(\d+\.\d+)/);
  let ffOk = true;
  let ffDetail = 'Not a Firefox User-Agent.';
  if (ffMatch) {
    const ffVer = ffMatch[1];
    const rvMatch = ua.match(/rv:(\d+\.\d+)/);
    const isAndroidFf = ua.includes('Android');
    const geckoMatch = ua.match(/Gecko\/(\S+)/);
    if (!rvMatch || rvMatch[1] !== ffVer) {
      ffOk = false;
      ffDetail = `Firefox/${ffVer} does not match rv:${rvMatch?.[1] ?? 'missing'}.`;
    } else if (!isAndroidFf && geckoMatch?.[1] !== '20100101') {
      ffOk = false;
      ffDetail = `Desktop Firefox must use frozen Gecko/20100101 token.`;
    } else if (isAndroidFf && geckoMatch?.[1] !== ffVer) {
      ffOk = false;
      ffDetail = `Android Firefox must pair Gecko/${ffVer} with Firefox/${ffVer}.`;
    } else {
      ffDetail = `Coherent Firefox/${ffVer} and rv:${ffVer} Gecko pairing.`;
    }
  }
  checks.push({ id: 'firefox_gecko', label: 'Firefox Gecko & rv Coherence', passed: ffOk, detail: ffDetail });

  // 8. Android SDK / Version / Build & Device Coherence Check
  const igAndroidMatch = ua.match(/Instagram \S+ Android \((\d+)\/(\d+)/);
  const androidBuildMatch = ua.match(/Android (\d+)(?:\.\d+)*;\s*(?:[a-z]{2}[_-][A-Z]{2};\s*)?([^;)]+?)(?:;\s*|\s+)Build\/([A-Za-z0-9._-]+)/);
  const standaloneBuild = ua.match(/\bBuild\/([A-Za-z0-9._-]+)/)?.[1];
  let sdkOk = true;
  let sdkDetail = 'No Android SDK/Build pairing to verify.';

  if (igAndroidMatch) {
    const sdk = Number(igAndroidMatch[1]);
    const ver = Number(igAndroidMatch[2]);
    const expectedSdk: Record<number, number> = { 12: 32, 13: 33, 14: 34, 15: 35, 16: 36, 17: 37 };
    sdkOk = expectedSdk[ver] === sdk || (ver === 12 && sdk === 31);
    sdkDetail = sdkOk
      ? `Android ${ver} correctly maps to API SDK ${sdk}.`
      : `SDK mismatch: Android ${ver} cannot report SDK ${sdk}.`;
  }

  if (sdkOk && androidBuildMatch) {
    const androidVer = Number(androidBuildMatch[1]);
    const modelName = androidBuildMatch[2].trim();
    const buildId = androidBuildMatch[3];
    const matchedDevice = ANDROID_DEVICES.find((d) => d.model === modelName);
    const isKnownAospPrefix = /^(TP|TQ|UP|UQ|UD|AD|AP|BP|BD|CP|CD|AQ|UK|TK|V1|U3)/i.test(buildId);
    const isPixelDevice = /^Pixel\b/i.test(modelName) || matchedDevice?.oem === 'google';
    const isPixel11 = /^Pixel 11\b/i.test(modelName);
    const isPixel10 = /^Pixel 10\b/i.test(modelName);
    const isPixel9 = /^Pixel 9\b/i.test(modelName);
    const isPixel8a = /^Pixel 8a\b/i.test(modelName);
    const isLegacyPixel = isPixelDevice && !isPixel11;

    const UNVERIFIED_ANDROID17_BUILDS = new Set([
      'CP2A.261005.008',
      'CP1A.260805.012',
    ]);

    const PIXEL_EXCLUSIVE_BUILDS = new Set([
      'BP1A.250505.005',
      'BP1A.250305.019',
      'AP3A.241105.007',
      'AP4A.241205.013',
      'AP4A.250205.002',
      'BP3A.250905.014',
      'BP3A.251105.015',
      'BP2A.250805.005',
      'BP4A.260105.011',
      'UP1A.231105.003',
      'UQ1A.240105.004',
      'UQ1A.240205.004',
      'AP1A.240405.002',
      'AP2A.240805.005',
      'TQ1A.230205.002',
      'TQ2A.230505.002',
      'TQ3A.230901.001',
    ]);

    const buildPrefixRules: Record<number, RegExp> = {
      17: /^(CP\d[A-Z]|CD1A)/i,
      16: /^(BP[2-4][A-Z]|BD3A)/i,
      15: /^(AP[34][A-Z]|BP1[A-Z]|AQ3A|V1UM)/i,
      14: /^(U[PQD]\d[A-Z]|A[PD][12][A-Z]|UKQ1|U3UM)/i,
      13: /^(T[PQ]\d[A-Z]|TKQ1)/i,
    };

    if (matchedDevice && (androidVer < matchedDevice.minAndroid || androidVer > matchedDevice.maxAndroid)) {
      sdkOk = false;
      sdkDetail = `${matchedDevice.model} (${matchedDevice.marketing}) launched for Android ${matchedDevice.minAndroid}–${matchedDevice.maxAndroid}, incompatible with Android ${androidVer}.`;
    } else if (UNVERIFIED_ANDROID17_BUILDS.has(buildId)) {
      sdkOk = false;
      sdkDetail = `Unverified/invalid Android 17 Build/${buildId}. Official Pixel builds use CP4A.261105.040.D1 (Pixel 11) / .A1 (Pixel 6–10), CD1A.261005.003 / CP3A.261005.005 (Oct), or CP2A.260805.005 (Aug).`;
    } else if (isPixel11 && (androidVer < 17 || !/^(CP4A\.261105\.040\.(D1|B2)|CD1A\.)/i.test(buildId))) {
      sdkOk = false;
      sdkDetail = `Pixel 11 series requires Android 17 Pixel 11 builds (CP4A.261105.040.D1/.B2 or CD1A.*), not Build/${buildId} (.A1 is for Pixel 6a–10).`;
    } else if (isLegacyPixel && (/^(CP4A\.261105\.040\.(D1|B2)|CD1A\.)/i.test(buildId))) {
      sdkOk = false;
      sdkDetail = `Build/${buildId} is exclusive to the Pixel 11 series, incompatible with ${modelName} (use CP4A.261105.040.A1 or CP3A/CP2A.260805.005).`;
    } else if (isPixel10 && androidVer === 16 && /^BP2A\.250605/i.test(buildId)) {
      sdkOk = false;
      sdkDetail = `${modelName} launched in Aug 2025 on Android 16 (BD3A/BP3A/BP4A builds), incompatible with June 2025 Build/${buildId}.`;
    } else if (isPixel9 && androidVer === 14 && !/^AD1A\./i.test(buildId)) {
      sdkOk = false;
      sdkDetail = `${modelName} launched in Aug 2024 on Android 14 AD1A builds (e.g. AD1A.240905.004), incompatible with earlier Android 14 Build/${buildId}.`;
    } else if (isPixel8a && androidVer === 14 && !/^(UD2A|AP2A)\./i.test(buildId)) {
      sdkOk = false;
      sdkDetail = `${modelName} launched in May 2024 on Android 14 UD2A/AP2A builds, incompatible with earlier Build/${buildId}.`;
    } else if (!isPixelDevice && (PIXEL_EXCLUSIVE_BUILDS.has(buildId) || /^(C[PD][1-4]A|AD1A|UD2A|BD3A)\./i.test(buildId))) {
      sdkOk = false;
      sdkDetail = `Pixel-exclusive AOSP Build/${buildId} is invalid/suspicious on non-Pixel hardware (${modelName}).`;
    } else if (isKnownAospPrefix && buildPrefixRules[androidVer] && !buildPrefixRules[androidVer].test(buildId)) {
      sdkOk = false;
      sdkDetail = `Android ${androidVer} build mismatch: Build/${buildId} belongs to a different Android release family.`;
    } else if (!igAndroidMatch) {
      sdkDetail = `Coherent Android ${androidVer} OEM device (${modelName}) and Build/${buildId}.`;
    }
  } else if (sdkOk && /Pixel 11/i.test(ua) && standaloneBuild && !/^(CP4A\.261105\.040\.(D1|B2)|CD1A\.)/i.test(standaloneBuild)) {
    sdkOk = false;
    sdkDetail = `Pixel 11 series requires Android 17 Pixel 11 build IDs (CP4A.261105.040.D1/.B2 or CD1A.*), not Build/${standaloneBuild}.`;
  }
  checks.push({ id: 'android_sdk', label: 'Android OS, SDK & OEM Build Coherence', passed: sdkOk, detail: sdkDetail });

  // 9. Facebook / Instagram / iPhone Hardware Model & Official App/iOS Build Integrity
  let iabOk = true;
  let iabDetail = 'Standard web browser User-Agent.';
  const embeddedIphoneId = ua.match(/\b(iPhone\d+,\d+)\b/)?.[1];
  const matchedIphoneModel = embeddedIphoneId
    ? IPHONE_MODELS.find((m) => m.id === embeddedIphoneId)
    : undefined;
  const mobileBuild = ua.match(/Mobile\/(2[234][A-Z]\d+)/)?.[1];
  const fbavMatch = ua.match(/FBAV\/(\d+)\./);
  const igVerMatch = ua.match(/Instagram (\d+)\./);
  const UNVERIFIED_IOS_BUILDS = new Set([
    '24A348',
    '24A352',
    '24B82',
    '24B91',
    '24C64',
    '24C71',
    '23D71',
    '23D80',
    '23E242',
    '23E251',
    '23C54',
    '23C62',
    '23B82',
    '23A355',
    '22G86',
    '22E240',
    '22D63',
  ]);
  const fbbvMatch = ua.match(/FBBV\/(\d+)/);
  const fbBuildOwner = fbbvMatch
    ? FACEBOOK_VERSIONS.find((f) => f.build === fbbvMatch[1])
    : undefined;
  const fbavFullPrefix = fbavMatch?.[1];

  if (embeddedIphoneId && (!matchedIphoneModel || embeddedIphoneId.startsWith('iPhone19,'))) {
    iabOk = false;
    iabDetail = `Blocked / Fraud Apple device ID "${embeddedIphoneId}" (iPhone19,* and unrecognized IDs are rejected; valid released range is iPhone14,7–iPhone18,5).`;
  } else if (mobileBuild && UNVERIFIED_IOS_BUILDS.has(mobileBuild)) {
    iabOk = false;
    iabDetail = `Unverified or mismatched Apple iOS build "${mobileBuild}" (rejected by official Apple release check).`;
  } else if (fbavMatch && Number(fbavMatch[1]) > 588) {
    iabOk = false;
    iabDetail = `Unreleased Facebook app version FBAV/${fbavMatch[1]}.x (latest released App Store version is 588.0.0).`;
  } else if (fbBuildOwner && fbavFullPrefix && !fbBuildOwner.ver.startsWith(`${fbavFullPrefix}.`)) {
    iabOk = false;
    iabDetail = `Facebook FBAV/FBBV mismatch: FBBV/${fbbvMatch?.[1]} belongs to ${fbBuildOwner.ver}, not FBAV/${fbavFullPrefix}.x.`;
  } else if (igVerMatch && Number(igVerMatch[1]) > 456) {
    iabOk = false;
    iabDetail = `Unreleased Instagram app version ${igVerMatch[1]}.x (latest released App Store version is 456.0.0).`;
  } else if (ua.includes('FBAN/FBIOS')) {
    const hasIphone = ua.includes('iPhone') && ua.includes('FBSN/iOS');
    const fbsvFull = ua.match(/FBSV\/(\d+(?:\.\d+)*)/)?.[1];
    const fbsvMajor = fbsvFull ? Number(fbsvFull.split('.')[0]) : undefined;
    const matchedIos = fbsvFull ? IOS_RELEASES.find((r) => r.osDot === fbsvFull) : undefined;

    if (!hasIphone) {
      iabOk = false;
      iabDetail = 'FBAN/FBIOS token requires iPhone + FBSN/iOS.';
    } else if (matchedIphoneModel && fbsvMajor && fbsvMajor < matchedIphoneModel.minIosMajor) {
      iabOk = false;
      iabDetail = `${embeddedIphoneId} (${matchedIphoneModel.name}) did not exist on iOS ${fbsvFull}.`;
    } else if (matchedIos && mobileBuild && !matchedIos.buildIds.includes(mobileBuild)) {
      iabOk = false;
      iabDetail = `iOS ${fbsvFull} build mismatch: expected ${matchedIos.buildIds.join('/')}, found ${mobileBuild}.`;
    } else {
      iabDetail = embeddedIphoneId
        ? `Verified Facebook iOS signature (${embeddedIphoneId} on iOS ${fbsvFull ?? '?'}, build ${mobileBuild ?? '15E148'}).`
        : 'Valid Facebook iOS In-App Browser signature.';
    }
  } else if (ua.includes('FBAN/FB4A') || ua.includes('FB_IAB/FB4A')) {
    iabOk = ua.includes('Android') && ua.includes('; wv)');
    iabDetail = iabOk
      ? 'Valid Facebook Android WebView (wv) signature.'
      : 'FB4A signature missing Android WebView (; wv) marker.';
  } else if (ua.includes('Instagram')) {
    iabOk = (ua.includes('Android') && ua.includes('; wv)')) || (ua.includes('iPhone') && ua.includes('Mobile/'));
    iabDetail = iabOk ? 'Valid Instagram In-App signature.' : 'Malformed Instagram In-App signature.';
  }
  checks.push({ id: 'iab_sig', label: 'In-App & Hardware Model Integrity', passed: iabOk, detail: iabDetail });

  // 10. Structural Whitespace / Character Sanity
  const hasControlChars = /[\r\n\t\x00-\x1f\x7f]/.test(ua) || ua.length < 30 || ua.length > 1024;
  checks.push({
    id: 'sanity',
    label: 'HTTP Header Character Hygiene',
    passed: !hasControlChars,
    detail: hasControlChars
      ? `Invalid length (${ua.length} bytes) or contains control/newline characters.`
      : `Clean single-line header value (${ua.length} bytes).`,
  });

  const passedCount = checks.filter((c) => c.passed).length;
  const isValid = passedCount === checks.length;
  const score = Math.round((passedCount / checks.length) * 100);

  let detectedBrowser = 'Unknown';
  if (ua.includes('FBAN/FBIOS') || ua.includes('FB_IAB/FB4A') || ua.includes('FBAN/FB4A')) detectedBrowser = 'Facebook App (IAB)';
  else if (ua.includes('Instagram')) detectedBrowser = 'Instagram App (IAB)';
  else if (ua.includes('BytedanceWebview') || ua.includes('Musical_ly')) detectedBrowser = 'TikTok App (IAB)';
  else if (isNativeYt) detectedBrowser = 'YouTube App';
  else if (ua.includes('; wv)')) detectedBrowser = 'Android System WebView';
  else if (ua.includes('SamsungBrowser/')) detectedBrowser = 'Samsung Internet';
  else if (ua.includes('Edg/') || ua.includes('EdgA/') || ua.includes('EdgiOS/')) detectedBrowser = 'Microsoft Edge';
  else if (ua.includes('Firefox/') || ua.includes('FxiOS/')) detectedBrowser = 'Mozilla Firefox';
  else if (ua.includes('CriOS/') || ua.includes('Chrome/')) detectedBrowser = 'Google Chrome';
  else if (ua.includes('Safari/')) detectedBrowser = 'Apple Safari';

  let detectedOs = 'Unknown';
  if (ua.includes('Windows NT 10.0')) detectedOs = 'Windows 10/11';
  else if (ua.includes('iPhone')) detectedOs = 'iPhone (iOS)';
  else if (ua.includes('Android')) detectedOs = 'Android';
  else if (ua.includes('Macintosh')) detectedOs = 'macOS';
  else if (ua.includes('Linux')) detectedOs = 'Linux';

  let detectedEngine = 'Unknown';
  if (ua.includes('AppleWebKit/537.36')) detectedEngine = 'Blink';
  else if (ua.includes('AppleWebKit/605.1.15')) detectedEngine = 'WebKit';
  else if (ua.includes('Gecko/')) detectedEngine = 'Gecko';
  else if (ua.includes('Cronet/')) detectedEngine = 'Cronet';

  return {
    isValid,
    score,
    detectedBrowser,
    detectedOs,
    detectedEngine,
    checks,
  };
}
