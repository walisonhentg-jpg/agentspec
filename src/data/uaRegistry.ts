export type BrowserType =
  | 'chrome'
  | 'safari'
  | 'firefox'
  | 'edge'
  | 'samsung'
  | 'facebook'
  | 'instagram'
  | 'youtube'
  | 'android_webview'
  | 'tiktok';

export type DeviceType = 'android' | 'iphone' | 'windows' | 'macos' | 'linux';

export type FreshnessWindow = 'latest' | 'recent' | 'all';

export type LocalePreset = 'global' | 'us' | 'south_asia' | 'europe' | 'latam';

export interface BrowserMeta {
  id: BrowserType;
  label: string;
  shortLabel: string;
  supportedDevices: DeviceType[];
  weight: number;
}

export interface DeviceMeta {
  id: DeviceType;
  label: string;
  category: 'Mobile' | 'Desktop';
  weight: number;
}

export const BROWSER_LIST: BrowserMeta[] = [
  { id: 'chrome', label: 'Google Chrome (132–158)', shortLabel: 'Chrome', supportedDevices: ['android', 'iphone', 'windows', 'macos', 'linux'], weight: 40 },
  { id: 'safari', label: 'Apple Safari (18.3–27.2)', shortLabel: 'Safari', supportedDevices: ['iphone', 'macos'], weight: 19 },
  { id: 'facebook', label: 'Facebook App (2025–2026)', shortLabel: 'Facebook', supportedDevices: ['android', 'iphone'], weight: 11 },
  { id: 'instagram', label: 'Instagram App (2025–2026)', shortLabel: 'Instagram', supportedDevices: ['android', 'iphone'], weight: 9 },
  { id: 'youtube', label: 'YouTube App (2025–2026)', shortLabel: 'YouTube', supportedDevices: ['android', 'iphone'], weight: 5 },
  { id: 'android_webview', label: 'Android System WebView (2025–2026)', shortLabel: 'WebView', supportedDevices: ['android'], weight: 4 },
  { id: 'edge', label: 'Microsoft Edge (132–157)', shortLabel: 'Edge', supportedDevices: ['windows', 'macos', 'android', 'iphone'], weight: 5 },
  { id: 'firefox', label: 'Mozilla Firefox (138–160)', shortLabel: 'Firefox', supportedDevices: ['windows', 'macos', 'linux', 'android', 'iphone'], weight: 3 },
  { id: 'samsung', label: 'Samsung Internet (27–31)', shortLabel: 'Samsung', supportedDevices: ['android'], weight: 2 },
  { id: 'tiktok', label: 'TikTok App (2025–2026)', shortLabel: 'TikTok', supportedDevices: ['android', 'iphone'], weight: 2 },
];

export const DEVICE_LIST: DeviceMeta[] = [
  { id: 'android', label: 'Android', category: 'Mobile', weight: 48 },
  { id: 'iphone', label: 'iPhone (iOS)', category: 'Mobile', weight: 26 },
  { id: 'windows', label: 'Windows 10/11', category: 'Desktop', weight: 18 },
  { id: 'macos', label: 'macOS', category: 'Desktop', weight: 6 },
  { id: 'linux', label: 'Linux Desktop', category: 'Desktop', weight: 2 },
];

export interface ChromiumRelease {
  major: number;
  branch: number;
  androidPatches: number[];
  iosPatches: number[];
  minPatch: number;
  maxPatch: number;
  edgeBranch: number;
  edgeDesktopPatches: number[];
  edgeAndroidPatches: number[];
  edgeIosPatches: number[];
  maxEdgePatch: number;
  tier: FreshnessWindow;
  weight: number;
}

// Chrome 132 - 158 & Edge 132 - 157 (strictly platform-separated verified releases through Nov 19, 2026)
export const CHROMIUM_RELEASES: ChromiumRelease[] = [
  { major: 158, branch: 8127, androidPatches: [22, 42], iosPatches: [13, 32, 35], minPatch: 13, maxPatch: 42, edgeBranch: 4370, edgeDesktopPatches: [], edgeAndroidPatches: [], edgeIosPatches: [], maxEdgePatch: 18, tier: 'latest', weight: 10 },
  { major: 157, branch: 8103, androidPatches: [38, 46, 50, 78], iosPatches: [37], minPatch: 37, maxPatch: 78, edgeBranch: 4341, edgeDesktopPatches: [42, 60], edgeAndroidPatches: [53], edgeIosPatches: [57], maxEdgePatch: 60, tier: 'latest', weight: 12 },
  { major: 156, branch: 8078, androidPatches: [79], iosPatches: [54], minPatch: 54, maxPatch: 79, edgeBranch: 4314, edgeDesktopPatches: [42, 84], edgeAndroidPatches: [56], edgeIosPatches: [56], maxEdgePatch: 84, tier: 'latest', weight: 11 },
  { major: 155, branch: 8059, androidPatches: [39, 84], iosPatches: [], minPatch: 39, maxPatch: 84, edgeBranch: 4283, edgeDesktopPatches: [45], edgeAndroidPatches: [48, 61], edgeIosPatches: [48, 61], maxEdgePatch: 61, tier: 'latest', weight: 10 },
  { major: 154, branch: 8037, androidPatches: [92], iosPatches: [55], minPatch: 55, maxPatch: 92, edgeBranch: 4258, edgeDesktopPatches: [37], edgeAndroidPatches: [37], edgeIosPatches: [37], maxEdgePatch: 37, tier: 'latest', weight: 9 },
  { major: 153, branch: 8010, androidPatches: [18, 52], iosPatches: [], minPatch: 18, maxPatch: 52, edgeBranch: 4234, edgeDesktopPatches: [32, 48], edgeAndroidPatches: [], edgeIosPatches: [], maxEdgePatch: 48, tier: 'latest', weight: 7 },
  { major: 152, branch: 7977, androidPatches: [65], iosPatches: [], minPatch: 64, maxPatch: 65, edgeBranch: 4191, edgeDesktopPatches: [53], edgeAndroidPatches: [], edgeIosPatches: [], maxEdgePatch: 53, tier: 'recent', weight: 5 },
  { major: 151, branch: 7922, androidPatches: [42], iosPatches: [10], minPatch: 10, maxPatch: 42, edgeBranch: 4129, edgeDesktopPatches: [59], edgeAndroidPatches: [], edgeIosPatches: [], maxEdgePatch: 59, tier: 'recent', weight: 5 },
  { major: 150, branch: 7871, androidPatches: [46, 47], iosPatches: [], minPatch: 46, maxPatch: 47, edgeBranch: 4078, edgeDesktopPatches: [48, 65], edgeAndroidPatches: [48], edgeIosPatches: [48], maxEdgePatch: 65, tier: 'recent', weight: 4 },
  { major: 149, branch: 7827, androidPatches: [155, 200], iosPatches: [201], minPatch: 155, maxPatch: 201, edgeBranch: 4022, edgeDesktopPatches: [52], edgeAndroidPatches: [], edgeIosPatches: [], maxEdgePatch: 52, tier: 'recent', weight: 4 },
  { major: 148, branch: 7778, androidPatches: [96, 178], iosPatches: [97], minPatch: 96, maxPatch: 178, edgeBranch: 3967, edgeDesktopPatches: [54], edgeAndroidPatches: [], edgeIosPatches: [], maxEdgePatch: 54, tier: 'recent', weight: 3 },
  { major: 147, branch: 7727, androidPatches: [101, 117], iosPatches: [102], minPatch: 101, maxPatch: 117, edgeBranch: 3912, edgeDesktopPatches: [60], edgeAndroidPatches: [], edgeIosPatches: [], maxEdgePatch: 60, tier: 'recent', weight: 3 },
  { major: 146, branch: 7680, androidPatches: [71, 165], iosPatches: [72], minPatch: 71, maxPatch: 165, edgeBranch: 3856, edgeDesktopPatches: [59], edgeAndroidPatches: [], edgeIosPatches: [], maxEdgePatch: 59, tier: 'recent', weight: 3 },
  { major: 145, branch: 7632, androidPatches: [45, 117], iosPatches: [116], minPatch: 45, maxPatch: 117, edgeBranch: 3800, edgeDesktopPatches: [58, 97], edgeAndroidPatches: [], edgeIosPatches: [], maxEdgePatch: 97, tier: 'recent', weight: 2 },
  { major: 144, branch: 7559, androidPatches: [133], iosPatches: [], minPatch: 133, maxPatch: 133, edgeBranch: 3719, edgeDesktopPatches: [82], edgeAndroidPatches: [], edgeIosPatches: [], maxEdgePatch: 82, tier: 'all', weight: 2 },
  { major: 143, branch: 7499, androidPatches: [192], iosPatches: [], minPatch: 192, maxPatch: 192, edgeBranch: 3650, edgeDesktopPatches: [66], edgeAndroidPatches: [], edgeIosPatches: [], maxEdgePatch: 66, tier: 'all', weight: 2 },
  { major: 142, branch: 7444, androidPatches: [175], iosPatches: [], minPatch: 175, maxPatch: 175, edgeBranch: 3595, edgeDesktopPatches: [53], edgeAndroidPatches: [], edgeIosPatches: [], maxEdgePatch: 53, tier: 'all', weight: 1 },
  { major: 141, branch: 7390, androidPatches: [122], iosPatches: [], minPatch: 122, maxPatch: 122, edgeBranch: 3537, edgeDesktopPatches: [57], edgeAndroidPatches: [], edgeIosPatches: [], maxEdgePatch: 57, tier: 'all', weight: 1 },
  { major: 140, branch: 7339, androidPatches: [207], iosPatches: [], minPatch: 207, maxPatch: 207, edgeBranch: 3485, edgeDesktopPatches: [54], edgeAndroidPatches: [], edgeIosPatches: [], maxEdgePatch: 54, tier: 'all', weight: 1 },
  { major: 139, branch: 7258, androidPatches: [127, 128], iosPatches: [], minPatch: 127, maxPatch: 128, edgeBranch: 3405, edgeDesktopPatches: [86], edgeAndroidPatches: [], edgeIosPatches: [], maxEdgePatch: 86, tier: 'all', weight: 1 },
  { major: 138, branch: 7204, androidPatches: [92, 97], iosPatches: [96], minPatch: 92, maxPatch: 97, edgeBranch: 3351, edgeDesktopPatches: [55], edgeAndroidPatches: [], edgeIosPatches: [], maxEdgePatch: 55, tier: 'all', weight: 1 },
  { major: 137, branch: 7151, androidPatches: [55, 56], iosPatches: [], minPatch: 55, maxPatch: 56, edgeBranch: 3296, edgeDesktopPatches: [52], edgeAndroidPatches: [], edgeIosPatches: [], maxEdgePatch: 52, tier: 'all', weight: 1 },
  { major: 136, branch: 7103, androidPatches: [48, 59], iosPatches: [49], minPatch: 48, maxPatch: 59, edgeBranch: 3240, edgeDesktopPatches: [50], edgeAndroidPatches: [], edgeIosPatches: [], maxEdgePatch: 50, tier: 'all', weight: 1 },
  { major: 135, branch: 7049, androidPatches: [84, 85], iosPatches: [], minPatch: 84, maxPatch: 85, edgeBranch: 3179, edgeDesktopPatches: [54], edgeAndroidPatches: [], edgeIosPatches: [], maxEdgePatch: 54, tier: 'all', weight: 1 },
  { major: 134, branch: 6998, androidPatches: [117, 118], iosPatches: [], minPatch: 117, maxPatch: 118, edgeBranch: 3124, edgeDesktopPatches: [51], edgeAndroidPatches: [], edgeIosPatches: [], maxEdgePatch: 51, tier: 'all', weight: 1 },
  { major: 133, branch: 6943, androidPatches: [126, 142], iosPatches: [141], minPatch: 126, maxPatch: 142, edgeBranch: 3065, edgeDesktopPatches: [51], edgeAndroidPatches: [], edgeIosPatches: [], maxEdgePatch: 51, tier: 'all', weight: 1 },
  { major: 132, branch: 6834, androidPatches: [83, 84], iosPatches: [], minPatch: 83, maxPatch: 84, edgeBranch: 2957, edgeDesktopPatches: [57, 89], edgeAndroidPatches: [], edgeIosPatches: [], maxEdgePatch: 89, tier: 'all', weight: 1 },
];

export interface FirefoxRelease {
  major: number;
  version: string;
  tier: FreshnessWindow;
  weight: number;
}

// Firefox 138 - 160 (through Firefox 160.0.1 released Nov 17, 2026)
export const FIREFOX_RELEASES: FirefoxRelease[] = [
  { major: 160, version: '160.0', tier: 'latest', weight: 12 },
  { major: 159, version: '159.0', tier: 'latest', weight: 12 },
  { major: 158, version: '158.0', tier: 'latest', weight: 12 },
  { major: 157, version: '157.0', tier: 'latest', weight: 10 },
  { major: 156, version: '156.0', tier: 'latest', weight: 12 },
  { major: 155, version: '155.0', tier: 'latest', weight: 10 },
  { major: 154, version: '154.0', tier: 'latest', weight: 9 },
  { major: 153, version: '153.0', tier: 'latest', weight: 7 },
  { major: 152, version: '152.0', tier: 'latest', weight: 6 },
  { major: 151, version: '151.0', tier: 'recent', weight: 6 },
  { major: 150, version: '150.0', tier: 'recent', weight: 5 },
  { major: 149, version: '149.0', tier: 'recent', weight: 4 },
  { major: 148, version: '148.0', tier: 'recent', weight: 4 },
  { major: 147, version: '147.0', tier: 'recent', weight: 3 },
  { major: 146, version: '146.0', tier: 'recent', weight: 3 },
  { major: 145, version: '145.0', tier: 'all', weight: 2 },
  { major: 144, version: '144.0', tier: 'all', weight: 2 },
  { major: 143, version: '143.0', tier: 'all', weight: 1 },
  { major: 142, version: '142.0', tier: 'all', weight: 1 },
  { major: 141, version: '141.0', tier: 'all', weight: 1 },
  { major: 140, version: '140.0', tier: 'all', weight: 1 },
  { major: 139, version: '139.0', tier: 'all', weight: 1 },
  { major: 138, version: '138.0', tier: 'all', weight: 1 },
];

export interface IosRelease {
  major: number;
  safariNumeric: number; // e.g. 18.3 .. 27.2
  osUnderscore: string;  // e.g. '18_6' or '27_1'
  osDot: string;         // e.g. '18.6' or '27.1'
  safariVersion: string; // e.g. '18.6' or '27.1'
  safariWebOsUnderscore: string;
  buildIds: string[];
  tier: FreshnessWindow;
  weight: number;
}

// Safari 18.3 - 27.2 (verified against Apple Developer Release Notes & IPSW firmware archive through Nov 2026)
export const IOS_RELEASES: IosRelease[] = [
  { major: 27, safariNumeric: 27.2, osUnderscore: '27_2', osDot: '27.2', safariVersion: '27.2', safariWebOsUnderscore: '18_7', buildIds: ['24B119'], tier: 'latest', weight: 22 },
  { major: 27, safariNumeric: 27.2, osUnderscore: '27_2_1', osDot: '27.2.1', safariVersion: '27.2', safariWebOsUnderscore: '18_7', buildIds: ['24B156'], tier: 'latest', weight: 10 },
  { major: 27, safariNumeric: 27.0, osUnderscore: '27_0_1', osDot: '27.0.1', safariVersion: '27.0', safariWebOsUnderscore: '18_7', buildIds: ['24A446'], tier: 'latest', weight: 12 },
  { major: 27, safariNumeric: 27.0, osUnderscore: '27_0', osDot: '27.0', safariVersion: '27.0', safariWebOsUnderscore: '18_7', buildIds: ['24A437'], tier: 'latest', weight: 8 },
  { major: 26, safariNumeric: 26.4, osUnderscore: '26_4', osDot: '26.4', safariVersion: '26.4', safariWebOsUnderscore: '18_7', buildIds: ['23E246'], tier: 'latest', weight: 10 },
  { major: 26, safariNumeric: 26.3, osUnderscore: '26_3', osDot: '26.3', safariVersion: '26.3', safariWebOsUnderscore: '18_7', buildIds: ['23D127'], tier: 'latest', weight: 8 },
  { major: 26, safariNumeric: 26.2, osUnderscore: '26_2', osDot: '26.2', safariVersion: '26.2', safariWebOsUnderscore: '18_7', buildIds: ['23C55'], tier: 'recent', weight: 8 },
  { major: 26, safariNumeric: 26.1, osUnderscore: '26_1', osDot: '26.1', safariVersion: '26.1', safariWebOsUnderscore: '18_7', buildIds: ['23B85'], tier: 'recent', weight: 7 },
  { major: 18, safariNumeric: 18.7, osUnderscore: '18_7', osDot: '18.7', safariVersion: '18.7', safariWebOsUnderscore: '18_7', buildIds: ['22H20'], tier: 'recent', weight: 7 },
  { major: 18, safariNumeric: 18.6, osUnderscore: '18_6_2', osDot: '18.6.2', safariVersion: '18.6', safariWebOsUnderscore: '18_6_2', buildIds: ['22G100'], tier: 'all', weight: 5 },
  { major: 18, safariNumeric: 18.5, osUnderscore: '18_5', osDot: '18.5', safariVersion: '18.5', safariWebOsUnderscore: '18_5', buildIds: ['22F76'], tier: 'all', weight: 4 },
  { major: 18, safariNumeric: 18.4, osUnderscore: '18_4_1', osDot: '18.4.1', safariVersion: '18.4', safariWebOsUnderscore: '18_4_1', buildIds: ['22E252'], tier: 'all', weight: 4 },
  { major: 18, safariNumeric: 18.3, osUnderscore: '18_3_2', osDot: '18.3.2', safariVersion: '18.3', safariWebOsUnderscore: '18_3_2', buildIds: ['22D82'], tier: 'all', weight: 4 },
];

export interface IphoneModel {
  id: string;
  name: string;
  scale: 2 | 3;
  pxRes: string;
  minIosMajor: number;
  weight: number;
}

export const IPHONE_MODELS: IphoneModel[] = [
  { id: 'iPhone18,2', name: 'iPhone 17 Pro Max', scale: 3, pxRes: '1320x2868', minIosMajor: 26, weight: 12 },
  { id: 'iPhone18,1', name: 'iPhone 17 Pro', scale: 3, pxRes: '1206x2622', minIosMajor: 26, weight: 11 },
  { id: 'iPhone18,3', name: 'iPhone 17', scale: 3, pxRes: '1206x2622', minIosMajor: 26, weight: 10 },
  { id: 'iPhone18,4', name: 'iPhone Air', scale: 3, pxRes: '1260x2736', minIosMajor: 26, weight: 7 },
  { id: 'iPhone18,5', name: 'iPhone 17e', scale: 3, pxRes: '1170x2532', minIosMajor: 26, weight: 6 },
  { id: 'iPhone17,2', name: 'iPhone 16 Pro Max', scale: 3, pxRes: '1320x2868', minIosMajor: 18, weight: 11 },
  { id: 'iPhone17,1', name: 'iPhone 16 Pro', scale: 3, pxRes: '1206x2622', minIosMajor: 18, weight: 10 },
  { id: 'iPhone17,3', name: 'iPhone 16', scale: 3, pxRes: '1179x2556', minIosMajor: 18, weight: 9 },
  { id: 'iPhone17,4', name: 'iPhone 16 Plus', scale: 3, pxRes: '1290x2796', minIosMajor: 18, weight: 5 },
  { id: 'iPhone17,5', name: 'iPhone 16e', scale: 3, pxRes: '1170x2532', minIosMajor: 18, weight: 5 },
  { id: 'iPhone16,2', name: 'iPhone 15 Pro Max', scale: 3, pxRes: '1290x2796', minIosMajor: 17, weight: 6 },
  { id: 'iPhone16,1', name: 'iPhone 15 Pro', scale: 3, pxRes: '1179x2556', minIosMajor: 17, weight: 5 },
  { id: 'iPhone15,4', name: 'iPhone 15', scale: 3, pxRes: '1179x2556', minIosMajor: 17, weight: 4 },
  { id: 'iPhone15,3', name: 'iPhone 14 Pro Max', scale: 3, pxRes: '1290x2796', minIosMajor: 16, weight: 1 },
  { id: 'iPhone14,7', name: 'iPhone 14', scale: 3, pxRes: '1170x2532', minIosMajor: 16, weight: 1 },
];

export interface AndroidOsSpec {
  version: string;
  sdk: number;
  buildIds: string[];
  tier: FreshnessWindow;
  weight: number;
}

export const ANDROID_OS_LIST: AndroidOsSpec[] = [
  {
    version: '17',
    sdk: 37,
    buildIds: ['CP4A.261105.040.A1', 'CP4A.261105.040.D1', 'CD1A.261005.003', 'CP3A.261005.005', 'CP3A.260905.009', 'CP2A.260805.005'],
    tier: 'latest',
    weight: 14,
  },
  {
    version: '16',
    sdk: 36,
    buildIds: ['BP2A.250605.031', 'BP2A.250805.005', 'BP3A.250905.014', 'BP3A.251105.015', 'BP4A.260105.011'],
    tier: 'latest',
    weight: 34,
  },
  {
    version: '15',
    sdk: 35,
    buildIds: ['AP3A.240905.015.A2', 'AP3A.241105.007', 'AP4A.241205.013', 'AP4A.250205.002', 'BP1A.250305.019', 'BP1A.250505.005'],
    tier: 'recent',
    weight: 30,
  },
  {
    version: '14',
    sdk: 34,
    buildIds: ['UP1A.231005.007', 'UP1A.231105.003', 'UQ1A.240105.004', 'UQ1A.240205.004', 'AP1A.240405.002', 'AP2A.240805.005'],
    tier: 'all',
    weight: 16,
  },
  {
    version: '13',
    sdk: 33,
    buildIds: ['TP1A.220624.014', 'TQ1A.230205.002', 'TQ2A.230505.002', 'TQ3A.230901.001'],
    tier: 'all',
    weight: 6,
  },
];

export const OEM_ANDROID_BUILDS: Record<string, Partial<Record<number, string[]>>> = {
  google: {
    // Pixel 6a - Pixel 10 series defaults (Pixel 11 series overrides per-device below)
    17: ['CP4A.261105.040.A1', 'CP3A.261005.005', 'CP3A.260905.009', 'CP2A.260805.005'],
    16: ['BP2A.250605.031', 'BP2A.250805.005', 'BP3A.250905.014', 'BP3A.251105.015', 'BP4A.260105.011'],
    15: ['AP3A.240905.015.A2', 'AP3A.241105.007', 'AP4A.241205.013', 'AP4A.250205.002', 'BP1A.250305.019', 'BP1A.250505.005'],
    14: ['UP1A.231005.007', 'UP1A.231105.003', 'UQ1A.240105.004', 'UQ1A.240205.004', 'AP1A.240405.002', 'AP2A.240805.005'],
    13: ['TP1A.220624.014', 'TQ1A.230205.002', 'TQ2A.230505.002', 'TQ3A.230901.001'],
  },
  samsung: {
    16: ['BP2A.250605.031.A3', 'BP4A.251205.006'],
    15: ['AP3A.240905.015.A2'],
    14: ['UP1A.231005.007'],
  },
  xiaomi: {
    15: ['AQ3A.240829.003', 'AQ3A.240912.001'],
    14: ['UKQ1.230924.001', 'UKQ1.231003.002'],
    13: ['TKQ1.221114.001'],
  },
  oneplus: {
    16: ['BP2A.250605.031.A3'],
    15: ['AP3A.240617.008'],
    14: ['UKQ1.230924.001'],
  },
  oppo: {
    16: ['BP2A.250605.031.A3'],
    15: ['AP3A.240617.008'],
    14: ['UKQ1.230924.001'],
  },
  realme: {
    15: ['AP3A.240617.008'],
    14: ['UKQ1.230924.001'],
  },
  vivo: {
    15: ['AP3A.240905.015.A2'],
    14: ['UP1A.231005.007'],
  },
  motorola: {
    15: ['V1UMS35H.10-38-1-1', 'V1UMS35H.10-67-7-2'],
    14: ['U3UMS34.69-8-3-2'],
  },
};

export interface AndroidDeviceModel {
  model: string;
  marketing: string;
  brand: string;
  oem: string;
  board: string;
  chipset: string;
  dpi: number;
  res: string;
  minAndroid: number;
  maxAndroid: number;
  samsungOnly?: boolean;
  androidBuilds?: Partial<Record<number, string[]>>;
  weight: number;
}

export const ANDROID_DEVICES: AndroidDeviceModel[] = [
  // Samsung 2024 - 2026 (strictly Samsung One UI base builds)
  { model: 'SM-S948B', marketing: 'Galaxy S26 Ultra', brand: 'samsung', oem: 'samsung', board: 'canoe', chipset: 'qcom', dpi: 560, res: '1440x3120', minAndroid: 16, maxAndroid: 16, samsungOnly: true, weight: 8 },
  { model: 'SM-S941B', marketing: 'Galaxy S26', brand: 'samsung', oem: 'samsung', board: 'canoe', chipset: 'qcom', dpi: 480, res: '1080x2340', minAndroid: 16, maxAndroid: 16, samsungOnly: true, weight: 6 },
  { model: 'SM-S938B', marketing: 'Galaxy S25 Ultra', brand: 'samsung', oem: 'samsung', board: 'sun', chipset: 'qcom', dpi: 560, res: '1440x3120', minAndroid: 15, maxAndroid: 16, samsungOnly: true, weight: 9 },
  { model: 'SM-S938U', marketing: 'Galaxy S25 Ultra (US)', brand: 'samsung', oem: 'samsung', board: 'sun', chipset: 'qcom', dpi: 560, res: '1440x3120', minAndroid: 15, maxAndroid: 16, samsungOnly: true, weight: 7 },
  { model: 'SM-S931B', marketing: 'Galaxy S25', brand: 'samsung', oem: 'samsung', board: 'sun', chipset: 'qcom', dpi: 480, res: '1080x2340', minAndroid: 15, maxAndroid: 16, samsungOnly: true, weight: 6 },
  { model: 'SM-S928B', marketing: 'Galaxy S24 Ultra', brand: 'samsung', oem: 'samsung', board: 'pineapple', chipset: 'qcom', dpi: 560, res: '1440x3120', minAndroid: 14, maxAndroid: 16, samsungOnly: true, weight: 8 },
  { model: 'SM-S928U', marketing: 'Galaxy S24 Ultra (US)', brand: 'samsung', oem: 'samsung', board: 'pineapple', chipset: 'qcom', dpi: 560, res: '1440x3120', minAndroid: 14, maxAndroid: 16, samsungOnly: true, weight: 6 },
  { model: 'SM-S921B', marketing: 'Galaxy S24', brand: 'samsung', oem: 'samsung', board: 's5e9945', chipset: 'exynos2400', dpi: 480, res: '1080x2340', minAndroid: 14, maxAndroid: 16, samsungOnly: true, weight: 5 },
  { model: 'SM-A566B', marketing: 'Galaxy A56 5G', brand: 'samsung', oem: 'samsung', board: 's5e8855', chipset: 'exynos1580', dpi: 450, res: '1080x2340', minAndroid: 15, maxAndroid: 16, samsungOnly: true, weight: 7 },
  { model: 'SM-A556E', marketing: 'Galaxy A55 5G', brand: 'samsung', oem: 'samsung', board: 's5e8845', chipset: 'exynos1480', dpi: 450, res: '1080x2340', minAndroid: 14, maxAndroid: 16, samsungOnly: true, weight: 7 },
  { model: 'SM-A366B', marketing: 'Galaxy A36 5G', brand: 'samsung', oem: 'samsung', board: 'sm6475', chipset: 'qcom', dpi: 450, res: '1080x2340', minAndroid: 15, maxAndroid: 16, samsungOnly: true, weight: 6 },
  { model: 'SM-A165F', marketing: 'Galaxy A16', brand: 'samsung', oem: 'samsung', board: 'mt6789', chipset: 'mt6789', dpi: 420, res: '1080x2340', minAndroid: 14, maxAndroid: 16, samsungOnly: true, weight: 6 },

  // Google Pixel (model-locked official Pixel AOSP build numbers per launch timeline)
  { model: 'Pixel 11 Pro', marketing: 'Google Pixel 11 Pro', brand: 'Google', oem: 'google', board: 'grizzly', chipset: 'tensor_g6', dpi: 480, res: '1280x2856', minAndroid: 17, maxAndroid: 17, androidBuilds: { 17: ['CP4A.261105.040.D1', 'CP4A.261105.040.B2', 'CD1A.261005.003', 'CD1A.260905.001.B1', 'CD1A.260905.001.A1'] }, weight: 5 },
  { model: 'Pixel 10', marketing: 'Google Pixel 10', brand: 'Google', oem: 'google', board: 'frankel', chipset: 'tensor_g5', dpi: 420, res: '1080x2424', minAndroid: 16, maxAndroid: 17, androidBuilds: { 17: ['CP4A.261105.040.A1', 'CP3A.261005.005', 'CP3A.260905.009', 'CP2A.260805.005'], 16: ['BD3A.250721.001', 'BD3A.251005.003', 'BP3A.251105.015', 'BP4A.260105.004', 'BP4A.260105.011'] }, weight: 6 },
  { model: 'Pixel 9 Pro', marketing: 'Google Pixel 9 Pro', brand: 'Google', oem: 'google', board: 'caiman', chipset: 'tensor_g4', dpi: 480, res: '1280x2856', minAndroid: 14, maxAndroid: 17, androidBuilds: { 17: ['CP4A.261105.040.A1', 'CP3A.261005.005', 'CP3A.260905.009', 'CP2A.260805.005'], 14: ['AD1A.240530.030', 'AD1A.240530.047', 'AD1A.240905.004'] }, weight: 6 },
  { model: 'Pixel 9', marketing: 'Google Pixel 9', brand: 'Google', oem: 'google', board: 'tokay', chipset: 'tensor_g4', dpi: 420, res: '1080x2424', minAndroid: 14, maxAndroid: 17, androidBuilds: { 17: ['CP4A.261105.040.A1', 'CP3A.261005.005', 'CP3A.260905.009', 'CP2A.260805.005'], 14: ['AD1A.240530.030', 'AD1A.240530.047', 'AD1A.240905.004'] }, weight: 5 },
  { model: 'Pixel 8a', marketing: 'Google Pixel 8a', brand: 'Google', oem: 'google', board: 'akita', chipset: 'tensor_g3', dpi: 420, res: '1080x2400', minAndroid: 14, maxAndroid: 16, androidBuilds: { 14: ['UD2A.240505.001', 'AP2A.240805.005'] }, weight: 4 },

  // Xiaomi / Redmi / POCO (strictly HyperOS / MIUI AOSP base builds)
  { model: '24129PN74G', marketing: 'Xiaomi 15', brand: 'Xiaomi', oem: 'xiaomi', board: 'dada', chipset: 'qcom', dpi: 480, res: '1200x2670', minAndroid: 15, maxAndroid: 15, weight: 5 },
  { model: '23127PN0CG', marketing: 'Xiaomi 14', brand: 'Xiaomi', oem: 'xiaomi', board: 'houji', chipset: 'qcom', dpi: 480, res: '1200x2670', minAndroid: 14, maxAndroid: 15, weight: 4 },
  { model: '24090RA29G', marketing: 'Redmi Note 14 Pro 5G', brand: 'Redmi', oem: 'xiaomi', board: 'malachite', chipset: 'mt6878', dpi: 440, res: '1220x2712', minAndroid: 14, maxAndroid: 15, weight: 6 },
  { model: '2312DRA50G', marketing: 'Redmi Note 13 Pro 5G', brand: 'Redmi', oem: 'xiaomi', board: 'garnet', chipset: 'qcom', dpi: 440, res: '1220x2712', minAndroid: 13, maxAndroid: 15, weight: 5 },
  { model: '24117RK2CG', marketing: 'POCO F7 Pro', brand: 'POCO', oem: 'xiaomi', board: 'zorn', chipset: 'qcom', dpi: 440, res: '1440x3200', minAndroid: 15, maxAndroid: 15, weight: 5 },

  // OnePlus / OPPO / vivo / realme / Motorola (strictly OEM firmware builds)
  { model: 'CPH2653', marketing: 'OnePlus 13', brand: 'OnePlus', oem: 'oneplus', board: 'dodge', chipset: 'qcom', dpi: 560, res: '1440x3168', minAndroid: 15, maxAndroid: 16, weight: 5 },
  { model: 'CPH2581', marketing: 'OnePlus 12', brand: 'OnePlus', oem: 'oneplus', board: 'kalama', chipset: 'qcom', dpi: 560, res: '1440x3168', minAndroid: 14, maxAndroid: 15, weight: 4 },
  { model: 'CPH2663', marketing: 'OnePlus Nord 4', brand: 'OnePlus', oem: 'oneplus', board: 'pineapple', chipset: 'qcom', dpi: 450, res: '1240x2772', minAndroid: 14, maxAndroid: 15, weight: 4 },
  { model: 'CPH2689', marketing: 'OPPO Reno 13', brand: 'OPPO', oem: 'oppo', board: 'mt6897', chipset: 'mt6897', dpi: 480, res: '1256x2760', minAndroid: 15, maxAndroid: 16, weight: 4 },
  { model: 'V2405A', marketing: 'vivo X200 Pro', brand: 'vivo', oem: 'vivo', board: 'mt6991', chipset: 'mt6991', dpi: 480, res: '1260x2800', minAndroid: 15, maxAndroid: 15, weight: 4 },
  { model: 'RMX3851', marketing: 'realme GT 6', brand: 'realme', oem: 'realme', board: 'pineapple', chipset: 'qcom', dpi: 480, res: '1264x2780', minAndroid: 14, maxAndroid: 15, weight: 4 },
  { model: 'XT2403-2', marketing: 'Motorola Edge 50 Pro', brand: 'motorola', oem: 'motorola', board: 'eqe', chipset: 'qcom', dpi: 440, res: '1220x2712', minAndroid: 14, maxAndroid: 15, weight: 3 },
];

export interface SamsungBrowserPair {
  major: number;
  sbVer: string;
  chromeVer: string;
  tier: FreshnessWindow;
}

// Samsung Internet 27 - 31 (through 31.0.2.39 released Nov 18, 2026)
export const SAMSUNG_BROWSER_PAIRS: SamsungBrowserPair[] = [
  { major: 31, sbVer: '31.0', chromeVer: '148.0.0.0', tier: 'latest' },
  { major: 30, sbVer: '30.0', chromeVer: '143.0.0.0', tier: 'latest' },
  { major: 29, sbVer: '29.0', chromeVer: '136.0.0.0', tier: 'latest' },
  { major: 28, sbVer: '28.0', chromeVer: '130.0.0.0', tier: 'recent' },
  { major: 27, sbVer: '27.0', chromeVer: '125.0.0.0', tier: 'all' },
];

export interface AppVersionPair {
  ver: string;
  build: string;
  tier: FreshnessWindow;
}

// 2025 - Nov 2026 Facebook App (strictly released App Store / Play Store versions <= 588.0.0)
export const FACEBOOK_VERSIONS: AppVersionPair[] = [
  { ver: '588.0.0.42.55', build: '910482315', tier: 'latest' },
  { ver: '587.0.0.39.55', build: '907841220', tier: 'latest' },
  { ver: '586.0.0.52.53', build: '904210884', tier: 'latest' },
  { ver: '579.0.0.51.112', build: '889304115', tier: 'latest' },
  { ver: '571.0.0.45.99', build: '871294503', tier: 'latest' },
  { ver: '562.0.0.49.104', build: '852910442', tier: 'recent' },
  { ver: '551.0.0.46.88', build: '831490218', tier: 'recent' },
  { ver: '542.0.0.52.104', build: '812490312', tier: 'recent' },
  { ver: '535.0.0.51.109', build: '795304112', tier: 'all' },
  { ver: '521.0.0.41.93', build: '758390112', tier: 'all' },
  { ver: '508.0.0.47.81', build: '724109853', tier: 'all' },
];

// 2025 - Nov 2026 Instagram App (strictly released App Store / APKMirror versions <= 456.0.0)
export const INSTAGRAM_VERSIONS: AppVersionPair[] = [
  { ver: '456.0.0.53.78', build: '916204810', tier: 'latest' },
  { ver: '451.0.0.44.86', build: '906190445', tier: 'latest' },
  { ver: '443.0.0.42.94', build: '888420190', tier: 'latest' },
  { ver: '435.0.0.45.82', build: '871903412', tier: 'latest' },
  { ver: '426.0.0.40.89', build: '851290448', tier: 'recent' },
  { ver: '418.0.0.43.95', build: '832910554', tier: 'recent' },
  { ver: '410.0.0.46.88', build: '814209115', tier: 'all' },
  { ver: '399.0.0.39.96', build: '784120981', tier: 'all' },
  { ver: '388.0.0.37.91', build: '755201944', tier: 'all' },
];

export const YOUTUBE_VERSIONS: Array<{ ver: string; cronet: string; tier: FreshnessWindow }> = [
  { ver: '21.46.3', cronet: '158.0.8127.42', tier: 'latest' },
  { ver: '21.45.4', cronet: '157.0.8103.38', tier: 'latest' },
  { ver: '21.44.4', cronet: '156.0.8078.79', tier: 'latest' },
  { ver: '21.22.34', cronet: '150.0.7871.46', tier: 'recent' },
  { ver: '20.48.39', cronet: '144.0.7559.133', tier: 'recent' },
  { ver: '20.41.34', cronet: '142.0.7444.175', tier: 'all' },
];

// 2025 - Nov 2026 TikTok App (verified APKMirror & Play Store versions)
export const TIKTOK_VERSIONS: AppVersionPair[] = [
  { ver: '47.9.2', build: '2024709020', tier: 'latest' },
  { ver: '47.7.3', build: '2024707030', tier: 'latest' },
  { ver: '46.8.2', build: '2024608020', tier: 'recent' },
  { ver: '44.2.3', build: '2024402030', tier: 'all' },
  { ver: '42.1.3', build: '2024201030', tier: 'all' },
  { ver: '40.5.3', build: '2024005030', tier: 'all' },
];

export const LOCALE_POOLS: Record<LocalePreset, string[]> = {
  global: ['en_US', 'en_GB', 'en_IN', 'bn_BD', 'es_ES', 'pt_BR', 'fr_FR', 'de_DE', 'id_ID', 'vi_VN', 'ar_SA', 'ja_JP'],
  us: ['en_US', 'es_US'],
  south_asia: ['bn_BD', 'en_IN', 'en_GB', 'hi_IN', 'en_US'],
  europe: ['en_GB', 'de_DE', 'fr_FR', 'es_ES', 'it_IT', 'nl_NL'],
  latam: ['pt_BR', 'es_MX', 'es_AR', 'es_CO', 'es_ES'],
};

export const CARRIER_POOLS: Record<LocalePreset, string[]> = {
  global: ['T-Mobile', 'AT&T', 'Verizon', 'Vodafone', 'Grameenphone', 'Robi', 'Jio', 'Airtel', 'EE', 'Orange', 'Claro', ''],
  us: ['T-Mobile', 'AT&T', 'Verizon', 'MetroPCS', 'Visible', ''],
  south_asia: ['Grameenphone', 'Robi', 'Banglalink', 'Teletalk', 'Jio', 'Airtel', 'Vi India', ''],
  europe: ['Vodafone', 'EE', 'O2 - UK', 'Telekom.de', 'Orange F', 'Movistar', ''],
  latam: ['Claro', 'Vivo', 'TIM', 'Telcel', 'Movistar', ''],
};
