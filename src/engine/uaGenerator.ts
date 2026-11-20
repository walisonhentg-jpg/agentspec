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
    const fbrv = String(Number(fb.build) + randInt(100000, 999999, rng));
    return `Mozilla/5.0 (iPhone; CPU iPhone OS ${ios.osUnderscore} like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/${buildId} [FBAN/FBIOS;FBAV/${fb.ver};FBBV/${fb.build};FBDV/${iphone.id};FBMD/iPhone;FBSN/iOS;FBSV/${ios.osDot};FBSS/${iphone.scale};FBID/phone;FBLC/${locale};FBOP/5;FBRV/${fbrv}]`;
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

function shuffleInPlace<T>(arr: T[], rng: () => number): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr;
}

function getCompatibleAndroidDevicesAndBuilds(osVer: number): Array<{ deviceModel: AndroidDeviceModel; buildId: string }> {
  const out: Array<{ deviceModel: AndroidDeviceModel; buildId: string }> = [];
  for (const d of ANDROID_DEVICES) {
    if (osVer < d.minAndroid || osVer > d.maxAndroid) continue;
    const builds = d.androidBuilds?.[osVer] ?? OEM_ANDROID_BUILDS[d.oem]?.[osVer];
    if (!builds || builds.length === 0) continue;
    for (const buildId of builds) {
      out.push({ deviceModel: d, buildId });
    }
  }
  return out;
}

function buildFinitePairQueue(
  browser: BrowserType,
  device: DeviceType,
  pools: {
    chromes: ChromiumRelease[];
    firefoxes: typeof FIREFOX_RELEASES;
    iosList: IosRelease[];
    androidOs: AndroidOsSpec[];
    yts: typeof YOUTUBE_VERSIONS;
    sbs: typeof SAMSUNG_BROWSER_PAIRS;
    locales: string[];
  },
  useSevenDay: boolean,
  rng: () => number
): string[] | null {
  const set = new Set<string>();
  const addIfFresh = (ua: string) => {
    if (useSevenDay && sevenDayStore.has('ua', ua)) return;
    set.add(ua);
  };

  if (browser === 'chrome') {
    if (device === 'windows') {
      for (const ch of pools.chromes) {
        addIfFresh(`Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${ch.major}.0.0.0 Safari/537.36`);
      }
      return shuffleInPlace(Array.from(set), rng);
    }
    if (device === 'macos') {
      for (const ch of pools.chromes) {
        addIfFresh(`Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${ch.major}.0.0.0 Safari/537.36`);
      }
      return shuffleInPlace(Array.from(set), rng);
    }
    if (device === 'linux') {
      for (const ch of pools.chromes) {
        addIfFresh(`Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${ch.major}.0.0.0 Safari/537.36`);
      }
      return shuffleInPlace(Array.from(set), rng);
    }
    if (device === 'android') {
      for (const ch of pools.chromes) {
        addIfFresh(`Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${ch.major}.0.0.0 Mobile Safari/537.36`);
      }
      return shuffleInPlace(Array.from(set), rng);
    }
    if (device === 'iphone') {
      const eligible = pools.chromes.filter((c) => c.iosPatches.length > 0);
      const chPool = eligible.length > 0 ? eligible : CHROMIUM_RELEASES.filter((c) => c.iosPatches.length > 0);
      for (const ios of pools.iosList) {
        for (const ch of chPool) {
          for (const patch of ch.iosPatches) {
            addIfFresh(`Mozilla/5.0 (iPhone; CPU iPhone OS ${ios.safariWebOsUnderscore} like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/${ch.major}.0.${ch.branch}.${patch} Mobile/15E148 Safari/604.1`);
          }
        }
      }
      return shuffleInPlace(Array.from(set), rng);
    }
  }

  if (browser === 'safari') {
    if (device === 'macos') {
      for (const ios of pools.iosList) {
        addIfFresh(`Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/${ios.safariVersion} Safari/605.1.15`);
      }
      return shuffleInPlace(Array.from(set), rng);
    }
    if (device === 'iphone') {
      for (const ios of pools.iosList) {
        addIfFresh(`Mozilla/5.0 (iPhone; CPU iPhone OS ${ios.safariWebOsUnderscore} like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/${ios.safariVersion} Mobile/15E148 Safari/604.1`);
      }
      return shuffleInPlace(Array.from(set), rng);
    }
  }

  if (browser === 'firefox') {
    if (device === 'windows') {
      for (const ff of pools.firefoxes) {
        addIfFresh(`Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:${ff.version}) Gecko/20100101 Firefox/${ff.version}`);
      }
      return shuffleInPlace(Array.from(set), rng);
    }
    if (device === 'macos') {
      for (const ff of pools.firefoxes) {
        addIfFresh(`Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:${ff.version}) Gecko/20100101 Firefox/${ff.version}`);
      }
      return shuffleInPlace(Array.from(set), rng);
    }
    if (device === 'linux') {
      for (const ff of pools.firefoxes) {
        addIfFresh(`Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:${ff.version}) Gecko/20100101 Firefox/${ff.version}`);
      }
      return shuffleInPlace(Array.from(set), rng);
    }
    if (device === 'android') {
      for (const ff of pools.firefoxes) {
        for (const os of pools.androidOs) {
          addIfFresh(`Mozilla/5.0 (Android ${os.version}; Mobile; rv:${ff.version}) Gecko/${ff.version} Firefox/${ff.version}`);
        }
      }
      return shuffleInPlace(Array.from(set), rng);
    }
    if (device === 'iphone') {
      for (const ff of pools.firefoxes) {
        for (const ios of pools.iosList) {
          addIfFresh(`Mozilla/5.0 (iPhone; CPU iPhone OS ${ios.safariWebOsUnderscore} like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/${ff.version} Mobile/15E148 Safari/605.1.15`);
        }
      }
      return shuffleInPlace(Array.from(set), rng);
    }
  }

  if (browser === 'edge') {
    if (device === 'windows' || device === 'macos') {
      const eligible = pools.chromes.filter((c) => c.edgeDesktopPatches.length > 0);
      const chPool = eligible.length > 0 ? eligible : CHROMIUM_RELEASES.filter((c) => c.edgeDesktopPatches.length > 0);
      for (const ch of chPool) {
        for (const patch of ch.edgeDesktopPatches) {
          if (device === 'windows') {
            addIfFresh(`Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${ch.major}.0.0.0 Safari/537.36 Edg/${ch.major}.0.${ch.edgeBranch}.${patch}`);
          } else {
            addIfFresh(`Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${ch.major}.0.0.0 Safari/537.36 Edg/${ch.major}.0.${ch.edgeBranch}.${patch}`);
          }
        }
      }
      return shuffleInPlace(Array.from(set), rng);
    }
    if (device === 'android') {
      const eligible = pools.chromes.filter((c) => c.edgeAndroidPatches.length > 0);
      const chPool = eligible.length > 0 ? eligible : CHROMIUM_RELEASES.filter((c) => c.edgeAndroidPatches.length > 0);
      for (const ch of chPool) {
        for (const patch of ch.edgeAndroidPatches) {
          addIfFresh(`Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${ch.major}.0.0.0 Mobile Safari/537.36 EdgA/${ch.major}.0.${ch.edgeBranch}.${patch}`);
        }
      }
      return shuffleInPlace(Array.from(set), rng);
    }
    if (device === 'iphone') {
      const eligible = pools.chromes.filter((c) => c.edgeIosPatches.length > 0);
      const chPool = eligible.length > 0 ? eligible : CHROMIUM_RELEASES.filter((c) => c.edgeIosPatches.length > 0);
      for (const ios of pools.iosList) {
        for (const ch of chPool) {
          for (const patch of ch.edgeIosPatches) {
            addIfFresh(`Mozilla/5.0 (iPhone; CPU iPhone OS ${ios.safariWebOsUnderscore} like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 EdgiOS/${ch.major}.${ch.edgeBranch}.${patch} Mobile/15E148 Safari/605.1.15`);
          }
        }
      }
      return shuffleInPlace(Array.from(set), rng);
    }
  }

  if (browser === 'samsung') {
    for (const sb of pools.sbs) {
      addIfFresh(`Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/${sb.sbVer} Chrome/${sb.chromeVer} Mobile Safari/537.36`);
    }
    return shuffleInPlace(Array.from(set), rng);
  }

  if (browser === 'android_webview') {
    const chEligible = pools.chromes.filter((c) => c.androidPatches.length > 0);
    const chPool = chEligible.length > 0 ? chEligible : pools.chromes;
    let totalPatches = 0;
    for (const ch of chPool) totalPatches += Math.max(1, ch.androidPatches.length);
    let totalDevices = 0;
    for (const os of pools.androidOs) {
      totalDevices += getCompatibleAndroidDevicesAndBuilds(Number(os.version)).length;
    }
    if (totalDevices * totalPatches <= 20_000) {
      for (const os of pools.androidOs) {
        const combos = getCompatibleAndroidDevicesAndBuilds(Number(os.version));
        for (const { deviceModel, buildId } of combos) {
          for (const ch of chPool) {
            const patches = ch.androidPatches.length > 0 ? ch.androidPatches : [ch.maxPatch];
            for (const patch of patches) {
              addIfFresh(`Mozilla/5.0 (Linux; Android ${os.version}; ${deviceModel.model} Build/${buildId}; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/${ch.major}.0.${ch.branch}.${patch} Mobile Safari/537.36`);
            }
          }
        }
      }
      return shuffleInPlace(Array.from(set), rng);
    }
  }

  if (browser === 'youtube' && device === 'iphone') {
    let totalIosBuilds = 0;
    for (const ios of pools.iosList) totalIosBuilds += IPHONE_MODELS.filter((m) => m.minIosMajor <= ios.major).length;
    if (totalIosBuilds * pools.yts.length * pools.locales.length <= 20_000) {
      for (const ios of pools.iosList) {
        const models = IPHONE_MODELS.filter((m) => m.minIosMajor <= ios.major);
        for (const iphone of models) {
          for (const yt of pools.yts) {
            for (const locale of pools.locales) {
              addIfFresh(`com.google.ios.youtube/${yt.ver} (${iphone.id}; U; CPU iOS ${ios.osUnderscore} like Mac OS X; ${locale})`);
            }
          }
        }
      }
      return shuffleInPlace(Array.from(set), rng);
    }
  }

  return null;
}

interface ActivePairSlot {
  browser: BrowserType;
  device: DeviceType;
  weight: number;
  finiteQueue: string[] | null;
  misses: number;
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

  const useSevenDay = config.sevenDayGuard !== false;
  if (useSevenDay) {
    await sevenDayStore.init();
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

  // Build pair slots: finite pairs get an exact shuffled queue of unissued UAs;
  // exhausted pairs are excluded immediately so zero duplicate spins occur.
  const activePairs: ActivePairSlot[] = [];
  for (const p of pairs) {
    const queue = buildFinitePairQueue(p.browser, p.device, pools, useSevenDay, rng);
    if (queue !== null && queue.length === 0) {
      continue;
    }
    const effectiveWeight =
      config.trafficMode === 'unique'
        ? Math.max(1, Math.round(Math.sqrt(p.weight) * 4))
        : p.weight;
    activePairs.push({
      browser: p.browser,
      device: p.device,
      weight: effectiveWeight,
      finiteQueue: queue,
      misses: 0,
    });
  }

  const lines: string[] = [];
  const browserArr: number[] = [];
  const deviceArr: number[] = [];
  const seen = new Set<string>();

  const CHUNK_SIZE = 15_000;
  const MAX_PAIR_MISSES = 180;
  let poolExhausted = activePairs.length === 0;

  while (lines.length < target && activePairs.length > 0) {
    let chunkOps = 0;
    while (lines.length < target && activePairs.length > 0 && chunkOps < CHUNK_SIZE) {
      chunkOps++;
      const slotIdx = (() => {
        let total = 0;
        for (let i = 0; i < activePairs.length; i++) total += activePairs[i].weight;
        let r = rng() * total;
        for (let i = 0; i < activePairs.length; i++) {
          r -= activePairs[i].weight;
          if (r <= 0) return i;
        }
        return activePairs.length - 1;
      })();

      const slot = activePairs[slotIdx];

      if (slot.finiteQueue !== null) {
        const ua = slot.finiteQueue.pop();
        if (slot.finiteQueue.length === 0) {
          activePairs.splice(slotIdx, 1);
        }
        if (ua && !seen.has(ua) && !(useSevenDay && sevenDayStore.has('ua', ua))) {
          seen.add(ua);
          lines.push(ua);
          browserArr.push(BROWSER_INDEX_MAP[slot.browser]);
          deviceArr.push(DEVICE_INDEX_MAP[slot.device]);
        }
        continue;
      }

      const ua = buildUserAgent(slot.browser, slot.device, pools, rng);
      if (!seen.has(ua) && !(useSevenDay && sevenDayStore.has('ua', ua))) {
        seen.add(ua);
        lines.push(ua);
        browserArr.push(BROWSER_INDEX_MAP[slot.browser]);
        deviceArr.push(DEVICE_INDEX_MAP[slot.device]);
        slot.misses = 0;
      } else {
        slot.misses++;
        if (slot.misses >= MAX_PAIR_MISSES) {
          activePairs.splice(slotIdx, 1);
        }
      }
    }

    if (onProgress) {
      onProgress(Math.min(99, Math.round((lines.length / target) * 100)));
      await new Promise((r) => setTimeout(r, 0));
    }
  }

  if (lines.length < target) {
    poolExhausted = true;
  }

  const shouldRecord = useSevenDay && !config.skipHistoryRecord;
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

export type DeviceVisualType =
  | 'iphone'
  | 'android_samsung'
  | 'android_pixel'
  | 'android_other'
  | 'windows'
  | 'mac'
  | 'linux'
  | 'bot'
  | 'unknown';

export interface ValidationCheck {
  id: string;
  label: string;
  passed: boolean;
  detail: string;
}

export interface ValidationReport {
  isValid: boolean;
  verdict: 'REAL' | 'SUSPICIOUS' | 'FRAUD_OR_BOT';
  score: number;
  riskScore: number;
  isBot: boolean;
  botCategory: string | null;
  detectedBrowser: string;
  detectedBrowserVersion: string;
  detectedOs: string;
  detectedEngine: string;
  deviceType: string;
  deviceBrand: string;
  deviceModel: string;
  hardwareId: string;
  osBuild: string;
  screenSpec: string;
  chipsetSpec: string;
  localeDetected: string;
  carrierDetected: string;
  deviceVisualType: DeviceVisualType;
  checks: ValidationCheck[];
}

const BOT_SIGNATURE_PATTERNS: Array<{ regex: RegExp; category: string }> = [
  {
    regex: /(HeadlessChrome|PhantomJS|Selenium|WebDriver|Playwright|Puppeteer|Cypress|Nightmare|CasperJS|Zombie\.js|HtmlUnit|Splash)/i,
    category: 'Headless / Browser Automation',
  },
  {
    regex: /(python-requests|python-urllib|aiohttp|httpx|urllib3?|curl\/|Wget\/|Go-http-client|Java\/\d|Apache-HttpClient|okhttp\/|PostmanRuntime|Insomnia\/|Scrapy|axios\/|node-fetch|undici|libwww-perl|CFNetwork\/)/i,
    category: 'HTTP Library / CLI Scraper',
  },
  {
    regex: /(GPTBot|ChatGPT-User|ClaudeBot|Anthropic|CCBot|PerplexityBot|Bytespider|PetalBot|SemrushBot|AhrefsBot|MJ12bot|DotBot|DataForSeoBot|Amazonbot)/i,
    category: 'AI / SEO Scraper Bot',
  },
  {
    regex: /(Googlebot|Bingbot|Slurp|DuckDuckBot|Baiduspider|YandexBot|Applebot|facebookexternalhit|Facebot|Twitterbot|LinkedInBot|TelegramBot|Discordbot|Slackbot|\bWhatsApp\/|\bcrawler\b|\bspider\b|\bbot\b|httrack|nikto|sqlmap|\bnmap\b|masscan|zgrab|censys|shodan)/i,
    category: 'Crawler / Scanner / Bot Signature',
  },
];

export function validateUserAgent(uaRaw: string): ValidationReport {
  const ua = uaRaw.trim();
  const checks: ValidationCheck[] = [];

  if (!ua) {
    return {
      isValid: false,
      verdict: 'FRAUD_OR_BOT',
      score: 0,
      riskScore: 100,
      isBot: false,
      botCategory: null,
      detectedBrowser: 'Unknown',
      detectedBrowserVersion: '—',
      detectedOs: 'Unknown',
      detectedEngine: 'Unknown',
      deviceType: 'Unknown',
      deviceBrand: 'Unknown',
      deviceModel: 'Unknown',
      hardwareId: '—',
      osBuild: '—',
      screenSpec: '—',
      chipsetSpec: '—',
      localeDetected: '—',
      carrierDetected: '—',
      deviceVisualType: 'unknown',
      checks: [{ id: 'empty', label: 'Non-empty string', passed: false, detail: 'No User-Agent string provided.' }],
    };
  }

  // 1. Root Product Token & Parenthesis Balance
  const isNativeYt = /^com\.google\.(android|ios)\.youtube\//.test(ua);
  const hasMozillaPrefix = ua.startsWith('Mozilla/5.0 (');
  const openParens = (ua.match(/\(/g) ?? []).length;
  const closeParens = (ua.match(/\)/g) ?? []).length;
  const parensBalanced = openParens > 0 && openParens === closeParens;
  const hasHeaderPrefix = /^user-agent\s*:/i.test(ua);
  const prefixOk = (hasMozillaPrefix || isNativeYt) && parensBalanced && !hasHeaderPrefix;

  checks.push({
    id: 'prefix',
    label: 'Root Product Token & Syntax Structure',
    passed: prefixOk,
    detail: hasHeaderPrefix
      ? 'Remove the "User-Agent:" label prefix — paste only the raw User-Agent value.'
      : !parensBalanced
      ? `Malformed parenthesis count (${openParens} "(" vs ${closeParens} ")").`
      : hasMozillaPrefix
      ? 'Starts with valid Mozilla/5.0 (...) product token with balanced brackets.'
      : isNativeYt
      ? 'Matches official Google YouTube native Cronet/iOS app prefix.'
      : 'Invalid or spoofed root token (expected Mozilla/5.0 (...) or official YouTube native prefix).',
  });

  // 2. Deep Bot, Headless Automation & Scraper Detection
  let botHit: string | null = null;
  let botCategory: string | null = null;
  for (const pat of BOT_SIGNATURE_PATTERNS) {
    const m = ua.match(pat.regex);
    if (m) {
      botHit = m[0];
      botCategory = pat.category;
      break;
    }
  }
  const hasElectronSpoof = /\bElectron\/\d/i.test(ua);
  if (!botHit && hasElectronSpoof) {
    botHit = 'Electron';
    botCategory = 'Desktop Wrapper / Automation';
  }
  const isBot = Boolean(botHit);
  checks.push({
    id: 'automation',
    label: 'Anti-Bot, Headless & Scraper Trap',
    passed: !isBot,
    detail: isBot
      ? `FRAUD / BOT DETECTED (${botCategory}): signature "${botHit}" flagged.`
      : 'Zero headless browsers, WebDriver/Puppeteer flags, crawlers, or HTTP client libraries detected.',
  });

  // 3. Cross-OS & Architecture Contradiction Check
  const hasIphone = /\biPhone\b/.test(ua);
  const hasIpad = /\biPad\b/.test(ua);
  const isIosToken = hasIphone || hasIpad;
  const hasAndroid = /\bAndroid\b/.test(ua);
  const hasWin = /\bWindows NT\b/.test(ua);
  const hasMac = /\bMacintosh\b/.test(ua);
  const hasLinuxX11 = /\bX11;/.test(ua) || /\bLinux x86_64\b/.test(ua);
  const hasMobileToken = /\bMobile\b/.test(ua);
  const hasWow64AndWin64 = /\bWOW64\b/.test(ua) && /\bWin64\b/.test(ua);
  const osFamilyCount =
    (isIosToken ? 1 : 0) +
    (hasAndroid ? 1 : 0) +
    (hasWin ? 1 : 0) +
    (hasMac && !isIosToken ? 1 : 0) +
    (hasLinuxX11 ? 1 : 0);

  let crossOsOk = true;
  let crossOsDetail = 'Single coherent OS & CPU architecture family.';
  if (osFamilyCount > 1) {
    crossOsOk = false;
    crossOsDetail = 'FRAUD: Conflicting multi-OS tokens detected in the same User-Agent (e.g. Android + iPhone or Windows + Linux).';
  } else if (hasWow64AndWin64) {
    crossOsOk = false;
    crossOsDetail = 'FRAUD: Contradictory Windows CPU architecture ("WOW64" and "Win64" cannot coexist).';
  } else if ((hasWin || hasMac || hasLinuxX11) && hasMobileToken && !isIosToken) {
    crossOsOk = false;
    crossOsDetail = 'FRAUD: Desktop OS token cannot carry a "Mobile" browser flag.';
  } else if (hasAndroid && !hasMobileToken && !isNativeYt) {
    crossOsOk = false;
    crossOsDetail = 'Anomaly: Android phone User-Agent missing required "Mobile" token.';
  }
  checks.push({
    id: 'cross_os',
    label: 'Cross-OS & CPU Architecture Coherence',
    passed: crossOsOk,
    detail: crossOsDetail,
  });

  // 4. Windows NT & Desktop Token Check
  const winMatch = ua.match(/Windows NT (\d+\.\d+)/);
  let winOk = true;
  let winDetail = 'Not a Windows User-Agent.';
  if (winMatch) {
    const nt = winMatch[1];
    const hasWinArch = /;\s*(Win64; x64|WOW64)\b/.test(ua);
    if (nt !== '10.0') {
      winOk = false;
      winDetail = `FRAUD: Invalid Windows NT ${nt} (Windows 10 & 11 always freeze at Windows NT 10.0).`;
    } else if (!hasWinArch) {
      winOk = false;
      winDetail = 'Suspicious Windows UA missing standard Win64; x64 (or WOW64) architecture token.';
    } else {
      winDetail = 'Uses Windows NT 10.0; Win64; x64 (authentic frozen token for Windows 10/11).';
    }
  }
  checks.push({ id: 'win_nt', label: 'Windows NT & Architecture Lock', passed: winOk, detail: winDetail });

  // 5. macOS Frozen Token Check
  const macMatch = ua.match(/Macintosh; ([^)]+)/);
  let macOk = true;
  let macDetail = 'Not a macOS User-Agent.';
  if (macMatch && !isIosToken) {
    const macPart = macMatch[1];
    const macVerMatch = macPart.match(/Intel Mac OS X (\d+[._]\d+(?:[._]\d+)?)/);
    const hasArmLeak = /\b(arm64|aarch64|Apple M\d)\b/i.test(macPart);
    const isFirefox = ua.includes('Firefox/');
    if (hasArmLeak) {
      macOk = false;
      macDetail = 'FRAUD: Real macOS browsers never expose arm64/Apple Silicon chip strings — frozen at Intel Mac OS X.';
    } else if (!macVerMatch) {
      macOk = false;
      macDetail = `Invalid macOS platform string "${macPart}".`;
    } else {
      const ver = macVerMatch[1];
      macOk = isFirefox ? ver === '10.15' : ver === '10_15_7';
      macDetail = macOk
        ? `Matches frozen macOS platform token (${ver}).`
        : `FRAUD / Spoofed macOS version "${ver}" — real browsers freeze at 10_15_7 (or 10.15 for Firefox).`;
    }
  }
  checks.push({ id: 'macos_frozen', label: 'macOS Platform Freeze Lock', passed: macOk, detail: macDetail });

  // 6. iOS WebKit Engine & Safari Version Ceiling Lock
  let iosEngineOk = true;
  let iosEngineDetail = 'Not an iOS User-Agent.';
  const safariVerMatch = ua.match(/\bVersion\/(\d+(?:\.\d+)?)/);
  if (isIosToken && !isNativeYt) {
    const hasWebKit605 = ua.includes('AppleWebKit/605.1.15');
    const hasFakeBlink =
      ua.includes('AppleWebKit/537.36') ||
      /\bChrome\/\d+/.test(ua) ||
      /\bEdgA?\//.test(ua) ||
      /\bFirefox\//.test(ua) ||
      /\bSamsungBrowser\//.test(ua);
    const iosVerCheck = ua.match(/CPU (?:iPhone )?OS (\d+)[_.](\d+)/);
    const iosMajorNum = iosVerCheck ? Number(iosVerCheck[1]) : 0;

    if (!hasWebKit605 || hasFakeBlink) {
      iosEngineOk = false;
      iosEngineDetail = 'FRAUD: Impossible iOS engine — Apple enforces AppleWebKit/605.1.15; Blink/Chrome/Firefox/Edge Android tokens cannot run on iPhone.';
    } else if (iosMajorNum > 27 || (iosMajorNum > 0 && iosMajorNum < 12)) {
      iosEngineOk = false;
      iosEngineDetail = `FRAUD / Out-of-range iOS version ${iosMajorNum} (supported current ecosystem: iOS 12–27).`;
    } else if (safariVerMatch && !ua.includes('EdgiOS/') && Number(safariVerMatch[1]) > 27.2) {
      iosEngineOk = false;
      iosEngineDetail = `FRAUD / Unreleased Safari Version/${safariVerMatch[1]} (latest stable is 27.2).`;
    } else {
      iosEngineDetail = 'Uses AppleWebKit/605.1.15 with valid iOS WebKit constraints.';
    }
  } else if (!isIosToken && ua.includes('Macintosh') && safariVerMatch && Number(safariVerMatch[1]) > 27.2) {
    iosEngineOk = false;
    iosEngineDetail = `FRAUD / Unreleased macOS Safari Version/${safariVerMatch[1]} (latest stable is 27.2).`;
  }
  checks.push({ id: 'ios_webkit', label: 'iOS / Safari WebKit Engine Lock', passed: iosEngineOk, detail: iosEngineDetail });

  // 7. Chrome / CriOS / Edge / Samsung Branch, Ceiling & UA-Reduction Coherence
  const chromeMatch = ua.match(/Chrome\/(\d+)\.(\d+)\.(\d+)\.(\d+)/);
  const criosMatch = ua.match(/CriOS\/(\d+)\.(\d+)\.(\d+)\.(\d+)/);
  const edgMatch = ua.match(/EdgA?\/(\d+)\.(\d+)\.(\d+)\.(\d+)/);
  const edgiosMatch = ua.match(/EdgiOS\/(\d+)\.(\d+)\.(\d+)/);
  const sbMatch = ua.match(/SamsungBrowser\/(\d+(?:\.\d+)?)/);
  let chromeOk = true;
  let chromeDetail = 'No Chromium/Edge/Samsung version token present.';

  if (chromeMatch) {
    const major = Number(chromeMatch[1]);
    const minor = Number(chromeMatch[2]);
    const branch = Number(chromeMatch[3]);
    const patch = Number(chromeMatch[4]);
    const isDesktop = hasWin || (hasMac && !isIosToken) || hasLinuxX11;
    const isReducedAndroid = /Linux;\s*Android 10;\s*K\)/.test(ua);
    const isWv =
      ua.includes('; wv)') ||
      ua.includes('FB_IAB') ||
      ua.includes('FBAN') ||
      ua.includes('Instagram') ||
      ua.includes('BytedanceWebview');
    const knownRelease = CHROMIUM_RELEASES.find((r) => r.major === major);

    const safariTrailer = ua.match(/\bSafari\/(\d+\.\d+)/)?.[1];
    if (major > 158) {
      chromeOk = false;
      chromeDetail = `FRAUD / Unreleased future Chrome/${major} (latest verified stable is Chrome 158).`;
    } else if (major < 100 && !isNativeYt) {
      chromeOk = false;
      chromeDetail = `Obsolete/Suspicious Chrome/${major} build (bots commonly replay legacy Chrome < 100).`;
    } else if (minor !== 0) {
      chromeOk = false;
      chromeDetail = `FRAUD: Chrome minor version is ${minor}; Chromium always uses 0.`;
    } else if (safariTrailer !== '537.36') {
      chromeOk = false;
      chromeDetail = `FRAUD: Chromium/Blink Chrome/${major} must carry Safari/537.36 trailer (found ${safariTrailer ? `Safari/${safariTrailer}` : 'missing'}).`;
    } else if ((isDesktop || isReducedAndroid) && major >= 110 && branch !== 0 && !ua.includes('Edg/') && !ua.includes('EdgA/') && !ua.includes('SamsungBrowser/')) {
      chromeOk = false;
      chromeDetail = `FRAUD: UA-Reduced Chrome ${major} must use .0.0.0 — found spoofed branch .${branch}.${patch}.`;
    } else if (isWv && branch === 0 && patch === 0) {
      chromeOk = false;
      chromeDetail = `FRAUD: Android WebView (; wv) never uses reduced 0.0.0 — it always exposes exact Chromium branch & patch.`;
    } else if (isWv && knownRelease && branch !== knownRelease.branch) {
      chromeOk = false;
      chromeDetail = `FRAUD: Chrome/${major} WebView branch mismatch (official is .${knownRelease.branch}.x, found .${branch}).`;
    } else if (isWv && knownRelease && (patch > knownRelease.maxPatch || (major >= 153 && !knownRelease.androidPatches.includes(patch)))) {
      chromeOk = false;
      chromeDetail = `FRAUD: Chrome/${major}.0.${branch}.${patch} is not a real Chrome for Android release (official: .${knownRelease.androidPatches.join('/.')}).`;
    } else if (branch !== 0 && knownRelease && branch !== knownRelease.branch) {
      chromeOk = false;
      chromeDetail = `FRAUD: Chrome/${major} uses official branch .${knownRelease.branch}, not .${branch}.`;
    } else if (branch !== 0 && knownRelease && (patch > knownRelease.maxPatch || (major >= 153 && !knownRelease.androidPatches.includes(patch)))) {
      chromeOk = false;
      chromeDetail = `FRAUD: Chrome/${major}.0.${branch}.${patch} is not a verified Chrome for Android build.`;
    } else {
      chromeDetail =
        branch === 0
          ? `Valid UA-Reduced Chrome/${major}.0.0.0 token.`
          : `Verified Chrome/${major}.0.${branch}.${patch} matches official Chromium milestone.`;
    }
  } else if (criosMatch) {
    const major = Number(criosMatch[1]);
    const minor = Number(criosMatch[2]);
    const branch = Number(criosMatch[3]);
    const patch = Number(criosMatch[4]);
    const knownRelease = CHROMIUM_RELEASES.find((r) => r.major === major);

    if (major > 158) {
      chromeOk = false;
      chromeDetail = `FRAUD / Unreleased CriOS/${major} (latest stable is 158).`;
    } else if (minor !== 0) {
      chromeOk = false;
      chromeDetail = `FRAUD: CriOS minor version is ${minor}; iOS Chrome always uses 0.`;
    } else if (knownRelease && branch !== knownRelease.branch) {
      chromeOk = false;
      chromeDetail = `FRAUD: CriOS/${major} build mismatch (official branch .${knownRelease.branch}, found .${branch}).`;
    } else if (knownRelease && patch > knownRelease.maxPatch) {
      chromeOk = false;
      chromeDetail = `FRAUD: CriOS/${major}.0.${branch}.${patch} exceeds verified patch ceiling (.${knownRelease.maxPatch}).`;
    } else if (knownRelease && knownRelease.iosPatches.length > 0 && !knownRelease.iosPatches.includes(patch)) {
      chromeOk = false;
      chromeDetail = `FRAUD: CriOS/${major}.0.${branch}.${patch} is not a verified Chrome for iOS build.`;
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
    if (major > 157) {
      chromeOk = false;
      chromeDetail = `FRAUD / Unreleased Edge/${major} (latest stable is 157).`;
    } else if (minor !== 0) {
      chromeOk = false;
      chromeDetail = `FRAUD: Edge minor version is ${minor}; Edge Desktop/Android always uses 0.`;
    } else if (knownRelease && branch !== knownRelease.edgeBranch) {
      chromeOk = false;
      chromeDetail = `FRAUD: Edge/${major} branch mismatch (official .${knownRelease.edgeBranch}, found .${branch}).`;
    } else if (knownRelease && patch > knownRelease.maxEdgePatch) {
      chromeOk = false;
      chromeDetail = `FRAUD: Edge/${major}.0.${branch}.${patch} exceeds published Edge patch ceiling (.${knownRelease.maxEdgePatch}).`;
    } else if (isAndroidEdge && knownRelease && knownRelease.edgeAndroidPatches.length > 0 && !knownRelease.edgeAndroidPatches.includes(patch)) {
      chromeOk = false;
      chromeDetail = `FRAUD: EdgA/${major}.0.${branch}.${patch} is not a verified Edge Android build.`;
    } else if (!isAndroidEdge && knownRelease && knownRelease.edgeDesktopPatches.length > 0 && !knownRelease.edgeDesktopPatches.includes(patch) && major >= 154) {
      chromeOk = false;
      chromeDetail = `FRAUD: Edg/${major}.0.${branch}.${patch} is not a verified Edge Desktop build.`;
    } else if (knownRelease) {
      chromeDetail = `Verified Edge ${major}.0.${branch}.${patch} matches official Microsoft Edge release.`;
    }
  } else if (chromeOk && edgiosMatch) {
    const major = Number(edgiosMatch[1]);
    const branch = Number(edgiosMatch[2]);
    const patch = Number(edgiosMatch[3]);
    const knownRelease = CHROMIUM_RELEASES.find((r) => r.major === major);
    if (major > 157) {
      chromeOk = false;
      chromeDetail = `FRAUD / Unreleased EdgiOS/${major} (latest stable is 157).`;
    } else if (knownRelease && branch !== knownRelease.edgeBranch) {
      chromeOk = false;
      chromeDetail = `FRAUD: EdgiOS/${major} branch mismatch (official .${knownRelease.edgeBranch}, found .${branch}).`;
    } else if (knownRelease && patch > knownRelease.maxEdgePatch) {
      chromeOk = false;
      chromeDetail = `FRAUD: EdgiOS/${major}.${branch}.${patch} exceeds verified Edge release patch.`;
    } else if (knownRelease && knownRelease.edgeIosPatches.length > 0 && !knownRelease.edgeIosPatches.includes(patch)) {
      chromeOk = false;
      chromeDetail = `FRAUD: EdgiOS/${major}.${branch}.${patch} is not a verified Edge for iOS build.`;
    } else if (knownRelease) {
      chromeDetail = `Verified EdgiOS/${major}.${branch}.${patch} matches official Microsoft Edge release.`;
    }
  }

  if (chromeOk && sbMatch) {
    const sbMajor = Math.floor(Number(sbMatch[1]));
    if (sbMajor > 31) {
      chromeOk = false;
      chromeDetail = `FRAUD / Unreleased SamsungBrowser/${sbMatch[1]} (latest stable is 31.0).`;
    } else if (!hasAndroid) {
      chromeOk = false;
      chromeDetail = 'FRAUD: SamsungBrowser only runs on Android.';
    }
  }
  checks.push({ id: 'chrome_branch', label: 'Chromium / Edge / Samsung Release Lock', passed: chromeOk, detail: chromeDetail });

  // 8. Firefox Gecko Coherence & Ceiling
  const ffMatch = ua.match(/Firefox\/(\d+\.\d+)/);
  const fxIosMatch = ua.match(/FxiOS\/(\d+\.\d+)/);
  let ffOk = true;
  let ffDetail = 'Not a Firefox User-Agent.';
  if (ffMatch) {
    const ffVer = ffMatch[1];
    const ffMajor = Math.floor(Number(ffVer));
    const rvMatch = ua.match(/rv:(\d+\.\d+)/);
    const geckoMatch = ua.match(/Gecko\/(\S+)/);
    if (ffMajor > 160) {
      ffOk = false;
      ffDetail = `FRAUD / Unreleased Firefox/${ffVer} (latest stable is 160.0).`;
    } else if (!rvMatch || rvMatch[1] !== ffVer) {
      ffOk = false;
      ffDetail = `FRAUD: Firefox/${ffVer} does not match rv:${rvMatch?.[1] ?? 'missing'}.`;
    } else if (!hasAndroid && geckoMatch?.[1] !== '20100101') {
      ffOk = false;
      ffDetail = 'FRAUD: Desktop Firefox must use frozen Gecko/20100101 token.';
    } else if (hasAndroid && geckoMatch?.[1] !== ffVer) {
      ffOk = false;
      ffDetail = `FRAUD: Android Firefox must pair Gecko/${ffVer} with Firefox/${ffVer}.`;
    } else {
      ffDetail = `Coherent Firefox/${ffVer} and rv:${ffVer} Gecko pairing.`;
    }
  } else if (fxIosMatch && Math.floor(Number(fxIosMatch[1])) > 160) {
    ffOk = false;
    ffDetail = `FRAUD / Unreleased FxiOS/${fxIosMatch[1]} (latest stable is 160.0).`;
  }
  checks.push({ id: 'firefox_gecko', label: 'Firefox Gecko & rv Coherence', passed: ffOk, detail: ffDetail });

  // 9. Android OS, SDK, Build & Full Hardware Registry Cross-Check
  const igAndroidMatch = ua.match(/Instagram (\S+) Android \((\d+)\/(\d+);\s*(\d+)dpi;\s*(\d+x\d+);\s*([^;]+);\s*([^;]+);\s*([^;]+);\s*([^;]+);/i);
  const androidBuildMatch = ua.match(/Android (\d+)(?:\.\d+)*;\s*(?:[a-z]{2}[_-][A-Z]{2};\s*)?([^;)]+?)(?:;\s*|\s+)Build\/([A-Za-z0-9._-]+)/);
  const standaloneBuild = ua.match(/\bBuild\/([A-Za-z0-9._-]+)/)?.[1];
  const rawAndroidVer = ua.match(/\bAndroid (\d+)/)?.[1];
  let sdkOk = true;
  let sdkDetail = 'No Android SDK/Build pairing to verify.';

  if (rawAndroidVer && Number(rawAndroidVer) > 17) {
    sdkOk = false;
    sdkDetail = `FRAUD / Unreleased Android ${rawAndroidVer} (maximum released Android version is 17).`;
  }

  if (sdkOk && igAndroidMatch) {
    const sdk = Number(igAndroidMatch[2]);
    const ver = Number(igAndroidMatch[3]);
    const igDpi = Number(igAndroidMatch[4]);
    const igRes = igAndroidMatch[5];
    const igBrand = igAndroidMatch[6].trim();
    const igModel = igAndroidMatch[7].trim();
    const igBoard = igAndroidMatch[8].trim();
    const igChipset = igAndroidMatch[9].trim();

    const expectedSdk: Record<number, number> = { 12: 32, 13: 33, 14: 34, 15: 35, 16: 36, 17: 37 };
    const matchedIgDev = ANDROID_DEVICES.find((d) => d.model === igModel);

    if (expectedSdk[ver] !== sdk && !(ver === 12 && sdk === 31)) {
      sdkOk = false;
      sdkDetail = `FRAUD: SDK mismatch — Android ${ver} cannot report SDK ${sdk}.`;
    } else if (matchedIgDev) {
      if (matchedIgDev.dpi !== igDpi || matchedIgDev.res !== igRes || matchedIgDev.board !== igBoard || matchedIgDev.chipset !== igChipset || matchedIgDev.brand.toLowerCase() !== igBrand.toLowerCase()) {
        sdkOk = false;
        sdkDetail = `FRAUD / Spoofed Hardware Metadata: ${igModel} requires (${matchedIgDev.dpi}dpi; ${matchedIgDev.res}; ${matchedIgDev.brand}; ${matchedIgDev.board}; ${matchedIgDev.chipset}), found (${igDpi}dpi; ${igRes}; ${igBrand}; ${igBoard}; ${igChipset}).`;
      }
    }
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

    const UNVERIFIED_ANDROID17_BUILDS = new Set(['CP2A.261005.008', 'CP1A.260805.012']);
    const PIXEL_EXCLUSIVE_BUILDS = new Set([
      'BP1A.250505.005', 'BP1A.250305.019', 'AP3A.241105.007', 'AP4A.241205.013',
      'AP4A.250205.002', 'BP3A.250905.014', 'BP3A.251105.015', 'BP2A.250805.005',
      'BP4A.260105.011', 'UP1A.231105.003', 'UQ1A.240105.004', 'UQ1A.240205.004',
      'AP1A.240405.002', 'AP2A.240805.005', 'TQ1A.230205.002', 'TQ2A.230505.002',
      'TQ3A.230901.001',
    ]);
    const buildPrefixRules: Record<number, RegExp> = {
      17: /^(CP\d[A-Z]|CD1A)/i,
      16: /^(BP[2-4][A-Z]|BD3A)/i,
      15: /^(AP[34][A-Z]|BP1[A-Z]|AQ3A|V1UM)/i,
      14: /^(U[PQD]\d[A-Z]|A[PD][12][A-Z]|UKQ1|U3UM)/i,
      13: /^(T[PQ]\d[A-Z]|TKQ1)/i,
    };

    const isValidAospBuildShape = /^(?:[A-Z]{2,3}\d[A-Z0-9]?|V\d[A-Z0-9]+|U\d[A-Z0-9]+)\.[A-Z0-9._-]+$/i.test(buildId);
    const isMotorolaBuild = /^(V1UM|U3UM)/i.test(buildId);
    const isXiaomiBuild = /^(AQ3A|UKQ1|TKQ1)/i.test(buildId);

    if (!isValidAospBuildShape) {
      sdkOk = false;
      sdkDetail = `FRAUD: Malformed or fake Android Build/${buildId} (does not match AOSP/OEM build format).`;
    } else if (matchedDevice && (androidVer < matchedDevice.minAndroid || androidVer > matchedDevice.maxAndroid)) {
      sdkOk = false;
      sdkDetail = `FRAUD: ${matchedDevice.model} (${matchedDevice.marketing}) launched for Android ${matchedDevice.minAndroid}–${matchedDevice.maxAndroid}, impossible on Android ${androidVer}.`;
    } else if (UNVERIFIED_ANDROID17_BUILDS.has(buildId)) {
      sdkOk = false;
      sdkDetail = `FRAUD: Unverified Android 17 Build/${buildId}.`;
    } else if (isPixel11 && (androidVer < 17 || !/^(CP4A\.261105\.040\.(D1|B2)|CD1A\.)/i.test(buildId))) {
      sdkOk = false;
      sdkDetail = `FRAUD: Pixel 11 requires Android 17 Pixel 11 builds (CP4A.261105.040.D1/.B2 or CD1A.*), not Build/${buildId}.`;
    } else if (isLegacyPixel && (/^(CP4A\.261105\.040\.(D1|B2)|CD1A\.)/i.test(buildId))) {
      sdkOk = false;
      sdkDetail = `FRAUD: Build/${buildId} is Pixel 11 exclusive, incompatible with ${modelName}.`;
    } else if (isPixel10 && androidVer === 16 && /^BP2A\.250605/i.test(buildId)) {
      sdkOk = false;
      sdkDetail = `FRAUD: ${modelName} launched Aug 2025 (BD3A/BP3A/BP4A), incompatible with June 2025 Build/${buildId}.`;
    } else if (isPixel9 && androidVer === 14 && !/^AD1A\./i.test(buildId)) {
      sdkOk = false;
      sdkDetail = `FRAUD: ${modelName} launched Aug 2024 on AD1A builds, incompatible with Build/${buildId}.`;
    } else if (isPixel8a && androidVer === 14 && !/^(UD2A|AP2A)\./i.test(buildId)) {
      sdkOk = false;
      sdkDetail = `FRAUD: ${modelName} launched May 2024 on UD2A/AP2A builds, incompatible with Build/${buildId}.`;
    } else if (!isPixelDevice && (PIXEL_EXCLUSIVE_BUILDS.has(buildId) || /^(C[PD][1-4]A|AD1A|UD2A|BD3A)\./i.test(buildId))) {
      sdkOk = false;
      sdkDetail = `FRAUD: Pixel-exclusive Build/${buildId} spoofed onto non-Pixel hardware (${modelName}).`;
    } else if (matchedDevice && matchedDevice.oem !== 'motorola' && isMotorolaBuild) {
      sdkOk = false;
      sdkDetail = `FRAUD: Motorola-only Build/${buildId} spoofed onto ${matchedDevice.marketing}.`;
    } else if (matchedDevice && matchedDevice.oem === 'samsung' && isXiaomiBuild) {
      sdkOk = false;
      sdkDetail = `FRAUD: Xiaomi/HyperOS Build/${buildId} spoofed onto Samsung ${matchedDevice.model}.`;
    } else if (isKnownAospPrefix && buildPrefixRules[androidVer] && !buildPrefixRules[androidVer].test(buildId)) {
      sdkOk = false;
      sdkDetail = `FRAUD: Android ${androidVer} build mismatch — Build/${buildId} belongs to a different Android version.`;
    } else {
      sdkDetail = `Coherent Android ${androidVer} OEM device (${modelName}) and Build/${buildId}.`;
    }
  } else if (sdkOk && hasAndroid && !isNativeYt && !ffMatch && !/Linux;\s*Android 10;\s*K\)/.test(ua)) {
    sdkOk = false;
    sdkDetail = 'FRAUD / Anomaly: Non-reduced Android UA missing required Build/... OEM firmware tag.';
  } else if (sdkOk && /Pixel 11/i.test(ua) && standaloneBuild && !/^(CP4A\.261105\.040\.(D1|B2)|CD1A\.)/i.test(standaloneBuild)) {
    sdkOk = false;
    sdkDetail = `FRAUD: Pixel 11 requires Android 17 Pixel 11 build IDs, not Build/${standaloneBuild}.`;
  }
  checks.push({ id: 'android_sdk', label: 'Android OS, SDK & OEM Hardware Coherence', passed: sdkOk, detail: sdkDetail });

  // 10. iPhone Hardware, FB/IG/TikTok/YouTube Cross-Check
  let iabOk = true;
  let iabDetail = 'Standard web browser User-Agent.';
  const embeddedIphoneId = ua.match(/\b(iPhone\d+,\d+)\b/)?.[1];
  const matchedIphoneModel = embeddedIphoneId
    ? IPHONE_MODELS.find((m) => m.id === embeddedIphoneId)
    : undefined;
  const mobileBuild = ua.match(/Mobile\/(2[234][A-Z]\d+)/)?.[1];
  const fbavMatch = ua.match(/FBAV\/(\d+)\./);
  const igVerMatch = ua.match(/Instagram (\d+)\./);
  const ttVerMatch = ua.match(/(?:app_version\/|Musical_ly\/)(\d+(?:\.\d+)*)/);
  const ytVerMatch = ua.match(/com\.google\.(?:android|ios)\.youtube\/(\d+\.\d+\.\d+)/);
  const UNVERIFIED_IOS_BUILDS = new Set([
    '24A348', '24A352', '24B82', '24B91', '24C64', '24C71', '23D71', '23D80',
    '23E242', '23E251', '23C54', '23C62', '23B82', '23A355', '22G86', '22E240', '22D63',
  ]);
  const fbbvMatch = ua.match(/FBBV\/(\d+)/);
  const fbBuildOwner = fbbvMatch ? FACEBOOK_VERSIONS.find((f) => f.build === fbbvMatch[1]) : undefined;
  const fbavFullPrefix = fbavMatch?.[1];

  const headerIosDotAny =
    ua.match(/(?:iPhone OS|CPU iOS)\s+(\d+(?:_\d+)*)/)?.[1]?.replace(/_/g, '.') ??
    ua.match(/FBSV\/(\d+(?:\.\d+)*)/)?.[1];
  const headerIosMajorAny = headerIosDotAny ? Number(headerIosDotAny.split('.')[0]) : undefined;
  const matchedIosGlobal = headerIosDotAny
    ? IOS_RELEASES.find((r) => r.osDot === headerIosDotAny)
    : undefined;

  if (embeddedIphoneId && !matchedIphoneModel) {
    iabOk = false;
    iabDetail = `FRAUD / Unsupported Apple device ID "${embeddedIphoneId}" (valid verified range: iPhone 12 [iPhone13,1] through iPhone 18 Pro Max [iPhone19,3/19,7]).`;
  } else if (mobileBuild && UNVERIFIED_IOS_BUILDS.has(mobileBuild)) {
    iabOk = false;
    iabDetail = `FRAUD: Unverified Apple iOS build "${mobileBuild}".`;
  } else if (matchedIphoneModel && headerIosMajorAny && headerIosMajorAny < matchedIphoneModel.minIosMajor) {
    iabOk = false;
    iabDetail = `FRAUD: ${embeddedIphoneId} (${matchedIphoneModel.name}) did not exist on iOS ${headerIosDotAny} (minimum iOS ${matchedIphoneModel.minIosMajor}).`;
  } else if (matchedIosGlobal && mobileBuild && !matchedIosGlobal.buildIds.includes(mobileBuild)) {
    iabOk = false;
    iabDetail = `FRAUD: iOS ${headerIosDotAny} firmware build mismatch (expected ${matchedIosGlobal.buildIds.join('/')}, found ${mobileBuild}).`;
  } else if (fbavMatch && Number(fbavMatch[1]) > 588) {
    iabOk = false;
    iabDetail = `FRAUD / Unreleased Facebook FBAV/${fbavMatch[1]}.x (max verified: 588.0.0).`;
  } else if (fbBuildOwner && fbavFullPrefix && !fbBuildOwner.ver.startsWith(`${fbavFullPrefix}.`)) {
    iabOk = false;
    iabDetail = `FRAUD: Facebook FBAV/FBBV mismatch (FBBV/${fbbvMatch?.[1]} belongs to ${fbBuildOwner.ver}).`;
  } else if (igVerMatch && Number(igVerMatch[1]) > 456) {
    iabOk = false;
    iabDetail = `FRAUD / Unreleased Instagram ${igVerMatch[1]}.x (max verified: 456.0.0).`;
  } else if (ttVerMatch && Number(ttVerMatch[1].split('.')[0]) > 48) {
    iabOk = false;
    iabDetail = `FRAUD / Unreleased TikTok ${ttVerMatch[1]} (max verified: 47.9.2).`;
  } else if (ytVerMatch && Number(ytVerMatch[1].split('.')[0]) > 22) {
    iabOk = false;
    iabDetail = `FRAUD / Unreleased YouTube ${ytVerMatch[1]} (max verified: 21.46.3).`;
  } else if (ua.includes('FBAN/FBIOS')) {
    const hasIphoneCheck = ua.includes('iPhone') && ua.includes('FBSN/iOS');
    const fbsvFull = ua.match(/FBSV\/(\d+(?:\.\d+)*)/)?.[1];
    const headerIosDot = ua.match(/iPhone OS (\d+(?:_\d+)*)/)?.[1]?.replace(/_/g, '.');

    if (!hasIphoneCheck) {
      iabOk = false;
      iabDetail = 'FRAUD: FBAN/FBIOS token requires iPhone + FBSN/iOS.';
    } else if (fbsvFull && headerIosDot && fbsvFull !== headerIosDot) {
      iabOk = false;
      iabDetail = `FRAUD: iOS version mismatch between header (${headerIosDot}) and FBSV (${fbsvFull}).`;
    } else {
      iabDetail = embeddedIphoneId
        ? `Verified Facebook iOS signature (${matchedIphoneModel?.name ?? embeddedIphoneId} on iOS ${fbsvFull ?? '?'}).`
        : 'Valid Facebook iOS In-App signature.';
    }
  } else if (ua.includes('FBAN/FB4A') || ua.includes('FB_IAB/FB4A')) {
    const fbdv = ua.match(/FBDV\/([^;]+)/)?.[1]?.trim();
    const fbsv = ua.match(/FBSV\/([^;]+)/)?.[1]?.trim();
    const hdrModel = androidBuildMatch?.[2]?.trim();
    const hdrOs = androidBuildMatch?.[1];
    if (!hasAndroid || !ua.includes('; wv)')) {
      iabOk = false;
      iabDetail = 'FRAUD: FB4A signature missing Android WebView (; wv) marker.';
    } else if (fbdv && hdrModel && fbdv !== hdrModel) {
      iabOk = false;
      iabDetail = `FRAUD: Model spoof — header reports "${hdrModel}" while FBDV reports "${fbdv}".`;
    } else if (fbsv && hdrOs && fbsv !== hdrOs) {
      iabOk = false;
      iabDetail = `FRAUD: OS spoof — header reports Android ${hdrOs} while FBSV reports ${fbsv}.`;
    } else {
      iabDetail = 'Verified Facebook Android WebView (wv) metadata consistency.';
    }
  } else if (ua.includes('Instagram')) {
    if (isIosToken && matchedIphoneModel) {
      const igScaleMatch = ua.match(/scale=(\d+)\.00;\s*(\d+x\d+)/);
      if (igScaleMatch && (Number(igScaleMatch[1]) !== matchedIphoneModel.scale || igScaleMatch[2] !== matchedIphoneModel.pxRes)) {
        iabOk = false;
        iabDetail = `FRAUD: ${matchedIphoneModel.name} display mismatch (expected scale=${matchedIphoneModel.scale}.00; ${matchedIphoneModel.pxRes}, found scale=${igScaleMatch[1]}.00; ${igScaleMatch[2]}).`;
      } else {
        iabDetail = `Verified Instagram iOS signature (${matchedIphoneModel.name}).`;
      }
    } else if ((hasAndroid && ua.includes('; wv)')) || (hasIphone && ua.includes('Mobile/'))) {
      iabDetail = 'Verified Instagram In-App signature.';
    } else {
      iabOk = false;
      iabDetail = 'FRAUD: Malformed Instagram In-App signature.';
    }
  } else if (ua.includes('Musical_ly/') && isIosToken) {
    const ttIosVer = ua.match(/\(\s*iPhone\d+,\d+;\s*iOS\s+(\d+(?:\.\d+)*)/)?.[1];
    const ttScale = ua.match(/\bScale\/(\d+)\.00/)?.[1];
    if (ttIosVer && headerIosDotAny && ttIosVer !== headerIosDotAny) {
      iabOk = false;
      iabDetail = `FRAUD: TikTok iOS version mismatch (header ${headerIosDotAny} vs iOS ${ttIosVer}).`;
    } else if (matchedIphoneModel && ttScale && Number(ttScale) !== matchedIphoneModel.scale) {
      iabOk = false;
      iabDetail = `FRAUD: ${matchedIphoneModel.name} TikTok Scale/${ttScale}.00 mismatch (expected Scale/${matchedIphoneModel.scale}.00).`;
    } else {
      iabDetail = `Verified TikTok iOS signature (${matchedIphoneModel?.name ?? 'iPhone'}).`;
    }
  }
  checks.push({ id: 'iab_sig', label: 'Hardware Model & In-App Cross-Check', passed: iabOk, detail: iabDetail });

  // Extract Browser & Engine tokens early so Rule 11 can catch bare/browserless spoofs
  let detectedBrowser = 'Unknown';
  let detectedBrowserVersion = '—';
  if (ua.includes('FBAN/FBIOS') || ua.includes('FB_IAB/FB4A') || ua.includes('FBAN/FB4A')) {
    detectedBrowser = hasIphone ? 'Facebook for iOS' : 'Facebook for Android';
    detectedBrowserVersion = ua.match(/FBAV\/([0-9.]+)/)?.[1] ?? '—';
  } else if (ua.includes('Instagram')) {
    detectedBrowser = hasIphone ? 'Instagram for iOS' : 'Instagram for Android';
    detectedBrowserVersion = ua.match(/Instagram\s+([0-9.]+)/)?.[1] ?? '—';
  } else if (ua.includes('BytedanceWebview') || ua.includes('Musical_ly')) {
    detectedBrowser = hasIphone ? 'TikTok for iOS' : 'TikTok for Android';
    detectedBrowserVersion = ttVerMatch?.[1] ?? '—';
  } else if (isNativeYt) {
    detectedBrowser = hasIphone ? 'YouTube for iOS' : 'YouTube for Android';
    detectedBrowserVersion = ytVerMatch?.[1] ?? '—';
  } else if (ua.includes('; wv)')) {
    detectedBrowser = 'Android System WebView';
    detectedBrowserVersion = chromeMatch ? `${chromeMatch[1]}.0.${chromeMatch[3]}.${chromeMatch[4]}` : '—';
  } else if (sbMatch) {
    detectedBrowser = 'Samsung Internet';
    detectedBrowserVersion = sbMatch[1];
  } else if (edgMatch) {
    detectedBrowser = ua.includes('EdgA/') ? 'Microsoft Edge (Android)' : 'Microsoft Edge';
    detectedBrowserVersion = `${edgMatch[1]}.0.${edgMatch[3]}.${edgMatch[4]}`;
  } else if (edgiosMatch) {
    detectedBrowser = 'Microsoft Edge (iOS)';
    detectedBrowserVersion = `${edgiosMatch[1]}.${edgiosMatch[2]}.${edgiosMatch[3]}`;
  } else if (ffMatch) {
    detectedBrowser = hasAndroid ? 'Firefox for Android' : 'Mozilla Firefox';
    detectedBrowserVersion = ffMatch[1];
  } else if (fxIosMatch) {
    detectedBrowser = 'Firefox for iOS';
    detectedBrowserVersion = fxIosMatch[1];
  } else if (criosMatch) {
    detectedBrowser = 'Google Chrome (iOS)';
    detectedBrowserVersion = `${criosMatch[1]}.0.${criosMatch[3]}.${criosMatch[4]}`;
  } else if (chromeMatch) {
    detectedBrowser = hasAndroid ? 'Google Chrome (Android)' : 'Google Chrome';
    detectedBrowserVersion = `${chromeMatch[1]}.0.${chromeMatch[3]}.${chromeMatch[4]}`;
  } else if (ua.includes('Safari/') && safariVerMatch) {
    detectedBrowser = hasIphone ? 'Mobile Safari' : 'Apple Safari';
    detectedBrowserVersion = safariVerMatch[1];
  } else if (isBot && botHit) {
    detectedBrowser = botHit;
  }

  let detectedEngine = 'Unknown';
  if (ua.includes('AppleWebKit/537.36')) detectedEngine = 'Blink (Chromium)';
  else if (ua.includes('AppleWebKit/605.1.15')) detectedEngine = 'WebKit (Apple)';
  else if (ua.includes('Gecko/')) detectedEngine = 'Gecko (Mozilla)';
  else if (ua.includes('Cronet/')) detectedEngine = 'Cronet (Google)';

  // 11. Structural HTTP Hygiene, Header Completeness & Anomalies
  const hasControlChars = /[\r\n\t\x00-\x1f\x7f]/.test(ua) || ua.length < 30 || ua.length > 1024;
  const hasMalformedTokens = /;;|\s{2,}/.test(ua) || (ua.includes('AppleWebKit/537.36') && !ua.includes('(KHTML, like Gecko)'));
  const missingBrowserOrEngine = detectedBrowser === 'Unknown' || (!isNativeYt && detectedEngine === 'Unknown');
  const hygieneOk = !hasControlChars && !hasMalformedTokens && !missingBrowserOrEngine;
  checks.push({
    id: 'sanity',
    label: 'HTTP Header Hygiene & Browser Completeness',
    passed: hygieneOk,
    detail: hasControlChars
      ? `Invalid length (${ua.length} bytes) or contains control/newline characters.`
      : hasMalformedTokens
      ? 'Suspicious formatting anomaly (double semicolons/spaces or missing KHTML token).'
      : missingBrowserOrEngine
      ? 'FRAUD / Truncated Header: Missing identifiable browser product or rendering engine token.'
      : `Clean single-line header (${ua.length} bytes).`,
  });

  const passedCount = checks.filter((c) => c.passed).length;
  const isValid = passedCount === checks.length;
  const score = Math.round((passedCount / checks.length) * 100);
  const riskScore = 100 - score;
  const hasExplicitFraud = checks.some((c) => !c.passed && c.detail.startsWith('FRAUD'));
  const verdict: ValidationReport['verdict'] = isValid
    ? 'REAL'
    : isBot || hasExplicitFraud || score <= 80
    ? 'FRAUD_OR_BOT'
    : 'SUSPICIOUS';

  let detectedOs = 'Unknown';
  const iosDot = ua.match(/FBSV\/([0-9.]+)/)?.[1] ?? ua.match(/(?:iPhone OS|CPU iOS)\s+(\d+(?:_\d+)*)/)?.[1]?.replace(/_/g, '.');
  if (winMatch) detectedOs = winMatch[1] === '10.0' ? 'Windows 10 / 11 (x64)' : `Windows NT ${winMatch[1]}`;
  else if (hasIphone) detectedOs = iosDot ? `iOS ${iosDot}` : 'iOS (iPhone)';
  else if (hasAndroid) detectedOs = rawAndroidVer ? `Android ${rawAndroidVer}` : 'Android';
  else if (hasMac) detectedOs = 'macOS';
  else if (hasLinuxX11) detectedOs = 'Linux x86_64';

  let deviceType = 'Unknown';
  let deviceBrand = 'Unknown';
  let deviceModel = 'Unknown';
  let hardwareId = '—';
  const rawMobileToken = ua.match(/\bMobile\/([A-Za-z0-9]+)/)?.[1];
  let osBuild =
    standaloneBuild ??
    mobileBuild ??
    (rawMobileToken === '15E148'
      ? '15E148 (iOS WebKit Frozen)'
      : rawMobileToken ?? '—');
  let screenSpec = '—';
  let chipsetSpec = '—';
  let deviceVisualType: DeviceVisualType = 'unknown';

  const matchedAndroidModel =
    (androidBuildMatch?.[2] ? ANDROID_DEVICES.find((d) => d.model === androidBuildMatch[2].trim()) : undefined) ??
    (igAndroidMatch?.[7] ? ANDROID_DEVICES.find((d) => d.model === igAndroidMatch[7].trim()) : undefined);

  if (isBot) {
    deviceType = 'Bot / Automation Client';
    deviceBrand = botCategory ?? 'Automated Bot';
    deviceModel = botHit ?? 'Headless Client';
    deviceVisualType = 'bot';
  } else if (hasIphone) {
    deviceType = 'Smartphone';
    deviceBrand = 'Apple';
    deviceVisualType = 'iphone';
    if (matchedIphoneModel) {
      deviceModel = matchedIphoneModel.name;
      hardwareId = matchedIphoneModel.id;
      screenSpec = `${matchedIphoneModel.pxRes} px · @${matchedIphoneModel.scale}x`;
    } else {
      deviceModel = 'iPhone';
      hardwareId = embeddedIphoneId ?? 'Masked by iOS WebKit Privacy';
      screenSpec = 'Super Retina OLED (@3x typical)';
    }
    chipsetSpec = 'Apple Silicon (ARM64)';
  } else if (hasAndroid) {
    deviceType = 'Smartphone';
    if (matchedAndroidModel) {
      deviceBrand = matchedAndroidModel.brand.charAt(0).toUpperCase() + matchedAndroidModel.brand.slice(1);
      deviceModel = matchedAndroidModel.marketing;
      hardwareId = matchedAndroidModel.model;
      screenSpec = `${matchedAndroidModel.res} px · ${matchedAndroidModel.dpi} dpi`;
      chipsetSpec = `${matchedAndroidModel.chipset} · board: ${matchedAndroidModel.board}`;
      deviceVisualType =
        matchedAndroidModel.oem === 'samsung'
          ? 'android_samsung'
          : matchedAndroidModel.oem === 'google'
          ? 'android_pixel'
          : 'android_other';
    } else if (/Linux;\s*Android 10;\s*K\)/.test(ua)) {
      deviceBrand = ua.includes('SamsungBrowser/') ? 'Samsung' : 'Android OEM';
      deviceModel = ua.includes('SamsungBrowser/')
        ? 'Galaxy Smartphone (UA-Reduced)'
        : 'Android Smartphone (UA-Reduced)';
      hardwareId = 'K (Chrome Privacy Reduced)';
      osBuild = 'Android 10; K (Reduced Token)';
      screenSpec = 'Client Hints Required';
      deviceVisualType = ua.includes('SamsungBrowser/') ? 'android_samsung' : 'android_other';
    } else {
      const rawModel = androidBuildMatch?.[2]?.trim() ?? 'Android Device';
      deviceModel = rawModel;
      hardwareId = rawModel;
      deviceBrand = rawModel.startsWith('SM-') ? 'Samsung' : rawModel.startsWith('Pixel') ? 'Google' : 'Android OEM';
      deviceVisualType = deviceBrand === 'Samsung' ? 'android_samsung' : deviceBrand === 'Google' ? 'android_pixel' : 'android_other';
    }
  } else if (hasWin) {
    deviceType = 'Desktop / Laptop';
    deviceBrand = 'Microsoft';
    deviceModel = 'Windows 10/11 PC';
    hardwareId = 'Win64; x64';
    osBuild = `Windows NT ${winMatch?.[1] ?? '10.0'}`;
    screenSpec = 'Desktop Viewport';
    chipsetSpec = 'x86_64';
    deviceVisualType = 'windows';
  } else if (hasMac) {
    deviceType = 'Desktop / Laptop';
    deviceBrand = 'Apple';
    deviceModel = 'Mac (macOS)';
    hardwareId = 'Macintosh; Intel Mac OS X';
    osBuild = `${ua.match(/Mac OS X ([0-9_]+)/)?.[1]?.replace(/_/g, '.') ?? '10.15.7'} (Frozen)`;
    screenSpec = 'Retina Desktop';
    chipsetSpec = 'Intel / Apple Silicon (Frozen x86_64)';
    deviceVisualType = 'mac';
  } else if (hasLinuxX11) {
    deviceType = 'Desktop / Workstation';
    deviceBrand = ua.includes('Ubuntu') ? 'Ubuntu' : 'Linux';
    deviceModel = 'Workstation (X11)';
    hardwareId = 'X11; x86_64';
    osBuild = 'X11; Linux x86_64';
    screenSpec = 'Desktop Viewport';
    chipsetSpec = 'x86_64';
    deviceVisualType = 'linux';
  }

  const localeDetected =
    ua.match(/FBLC\/([a-z]{2}_[A-Z]{2})/)?.[1] ??
    ua.match(/ByteLocale\/([a-z]{2}-[A-Z]{2})/)?.[1] ??
    ua.match(/;\s*([a-z]{2}[_-][A-Z]{2})(?:;|\))/)?.[1] ??
    '—';
  const carrierDetected = ua.match(/FBCR\/([^;]*)/)?.[1]?.trim() || '—';

  return {
    isValid,
    verdict,
    score,
    riskScore,
    isBot,
    botCategory,
    detectedBrowser,
    detectedBrowserVersion,
    detectedOs,
    detectedEngine,
    deviceType,
    deviceBrand,
    deviceModel,
    hardwareId,
    osBuild,
    screenSpec,
    chipsetSpec,
    localeDetected,
    carrierDetected,
    deviceVisualType,
    checks,
  };
}
