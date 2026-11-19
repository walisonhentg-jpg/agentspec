import {
  CountryCode,
  EUROPE_COUNTRIES,
  GenderFilter,
  RegionGroup,
  UK_CITIES,
  UK_FEMALE_FIRST,
  UK_LAST_NAMES,
  UK_MALE_FIRST,
  UK_STREETS,
  US_CITIES,
  US_FEMALE_FIRST,
  US_LAST_NAMES,
  US_MALE_FIRST,
  US_STREETS,
} from '../data/identityRegistry';
import { sevenDayStore } from './sevenDayStore';

export type PhoneFormat = 'international' | 'national' | 'e164';

export interface IdentityConfig {
  countries: CountryCode[];
  gender: GenderFilter;
  phoneFormat: PhoneFormat;
  sevenDayGuard?: boolean;
  skipHistoryRecord?: boolean;
  count: number;
}

export interface IdentityProfile {
  fullName: string;
  firstName: string;
  lastName: string;
  gender: 'Male' | 'Female';
  country: string;
  countryCode: CountryCode;
  regionGroup: RegionGroup;
  streetAddress: string;
  city: string;
  stateOrRegion: string;
  postalCode: string;
  fullAddress: string;
  phone: string;
  gmail: string;
}

export interface IdentityBatchResult {
  profiles: IdentityProfile[];
  durationMs: number;
  requestedCount: number;
}

export type GmailStyle = 'mixed' | 'dot_year' | 'plain_num' | 'initial_dot' | 'country_tag';
export type GmailGeneratorMode = 'real_dots' | 'real_plus' | 'synthetic';

export interface GmailOnlyConfig {
  country: CountryCode;
  gender: GenderFilter;
  style: GmailStyle;
  mode?: GmailGeneratorMode;
  baseRealGmail?: string;
  sevenDayGuard?: boolean;
  skipHistoryRecord?: boolean;
  count: number;
}

export interface GmailEntry {
  gmail: string;
  fullName: string;
  gender: 'Male' | 'Female';
  country: string;
  countryCode: CountryCode;
  deliveryNote: string;
}

export interface GmailBatchResult {
  items: GmailEntry[];
  durationMs: number;
  requestedCount: number;
  modeUsed: GmailGeneratorMode;
  poolExhausted: boolean;
}

export interface PhoneOnlyConfig {
  country: CountryCode;
  usCity?: string;
  phoneFormat: PhoneFormat;
  sevenDayGuard?: boolean;
  skipHistoryRecord?: boolean;
  count: number;
}

export interface PhoneEntry {
  phone: string;
  e164: string;
  country: string;
  countryCode: CountryCode;
  areaOrCity: string;
}

export interface PhoneBatchResult {
  items: PhoneEntry[];
  durationMs: number;
  requestedCount: number;
}

function createFastRng(seed: number) {
  let s = seed | 0 || 987654321;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return (s >>> 0) / 4294967296;
  };
}

function pick<T>(arr: T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)];
}

function randDigits(len: number, rng: () => number): string {
  let out = '';
  for (let i = 0; i < len; i++) {
    out += String(Math.floor(rng() * 10));
  }
  return out;
}

function normalizeAsciiForGmail(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[łŁ]/g, 'l')
    .replace(/[’']/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

const GMAIL_STRICT_REGEX = /^[a-z0-9](?!.*\.\.)[a-z0-9.]{4,28}[a-z0-9]@gmail\.com$/;

function buildNaturalGmail(
  firstName: string,
  lastName: string,
  countryCode: string,
  rng: () => number,
  style: GmailStyle = 'mixed'
): string {
  const f = normalizeAsciiForGmail(firstName) || 'alex';
  const l = normalizeAsciiForGmail(lastName) || 'miller';
  const birthYear2 = String(74 + Math.floor(rng() * 31)).padStart(2, '0');
  const birthYear4 = String(1976 + Math.floor(rng() * 29));
  const shortNum = String(10 + Math.floor(rng() * 890));
  const cLower = countryCode.toLowerCase();

  let local = '';
  const chosenStyle =
    style !== 'mixed'
      ? style
      : (() => {
          const r = rng();
          if (r < 0.36) return 'dot_year';
          if (r < 0.72) return 'plain_num';
          return 'initial_dot';
        })();

  if (chosenStyle === 'dot_year') {
    local = rng() < 0.5 ? `${f}.${l}${birthYear2}` : `${f}.${l}${birthYear4}`;
  } else if (chosenStyle === 'plain_num') {
    const r = rng();
    if (r < 0.35) {
      local = `${f}${l}${shortNum}`;
    } else if (r < 0.70) {
      local = `${f}.${l}${shortNum}`;
    } else {
      local = `${f}${l}${birthYear2}`;
    }
  } else if (chosenStyle === 'initial_dot') {
    const r = rng();
    if (r < 0.35) {
      local = `${f[0]}.${l}${birthYear4}`;
    } else if (r < 0.70) {
      local = `${f}${l[0]}${birthYear4}`;
    } else {
      local = `${f[0]}${l}${birthYear2}`;
    }
  } else {
    local = `${f}.${l}.${cLower}${Math.floor(rng() * 90 + 10)}`;
  }

  local = local
    .replace(/[^a-z0-9.]/g, '')
    .replace(/\.{2,}/g, '.')
    .replace(/^\.+|\.+$/g, '');

  if (local.length > 30) {
    local = local.slice(0, 30).replace(/\.+$/g, '');
  }
  while (local.length < 6) {
    local += String(Math.floor(rng() * 10));
  }

  const candidate = `${local}@gmail.com`;
  if (GMAIL_STRICT_REGEX.test(candidate)) {
    return candidate;
  }
  return `${f.slice(0, 10)}${l.slice(0, 10)}${birthYear4}@gmail.com`;
}

const UK_INWARD_LETTERS = 'ABDEFGHJLNPQRSTUWXYZ';

function generateUkInwardCode(rng: () => number): string {
  const d = Math.floor(rng() * 9) + 1;
  const c1 = UK_INWARD_LETTERS[Math.floor(rng() * UK_INWARD_LETTERS.length)];
  const c2 = UK_INWARD_LETTERS[Math.floor(rng() * UK_INWARD_LETTERS.length)];
  return `${d}${c1}${c2}`;
}

function pickCountryNamePair(
  countryCode: CountryCode,
  genderPick: 'Male' | 'Female',
  rng: () => number
): { firstName: string; lastName: string; countryName: string; regionGroup: RegionGroup } {
  if (countryCode === 'US') {
    return {
      firstName: genderPick === 'Male' ? pick(US_MALE_FIRST, rng) : pick(US_FEMALE_FIRST, rng),
      lastName: pick(US_LAST_NAMES, rng),
      countryName: 'United States',
      regionGroup: 'usa',
    };
  }
  if (countryCode === 'GB') {
    return {
      firstName: genderPick === 'Male' ? pick(UK_MALE_FIRST, rng) : pick(UK_FEMALE_FIRST, rng),
      lastName: pick(UK_LAST_NAMES, rng),
      countryName: 'United Kingdom',
      regionGroup: 'uk',
    };
  }
  const eu = EUROPE_COUNTRIES.find((c) => c.code === countryCode) ?? EUROPE_COUNTRIES[0];
  return {
    firstName: genderPick === 'Male' ? pick(eu.maleFirst, rng) : pick(eu.femaleFirst, rng),
    lastName: pick(eu.lastNames, rng),
    countryName: eu.country,
    regionGroup: 'europe',
  };
}

function buildPhoneForCountry(
  countryCode: CountryCode,
  phoneFormat: PhoneFormat,
  rng: () => number,
  usCityFilter?: string
): { formatted: string; e164: string; areaOrCity: string } {
  if (countryCode === 'US') {
    const cityPool =
      usCityFilter && usCityFilter !== 'ALL'
        ? US_CITIES.filter((c) => c.city === usCityFilter)
        : US_CITIES;
    const citySpec = pick(cityPool.length > 0 ? cityPool : US_CITIES, rng);
    const area = pick(citySpec.areaCodes, rng);
    let exch = '201';
    for (let k = 0; k < 12; k++) {
      const exchFirst = 2 + Math.floor(rng() * 8);
      const exchRest = String(Math.floor(rng() * 90) + 10);
      const candidate = `${exchFirst}${exchRest}`;
      if (candidate !== '555' && !candidate.endsWith('11')) {
        exch = candidate;
        break;
      }
    }
    const lineNum = randDigits(4, rng);
    const e164 = `+1${area}${exch}${lineNum}`;
    const formatted =
      phoneFormat === 'e164'
        ? e164
        : phoneFormat === 'international'
        ? `+1 (${area}) ${exch}-${lineNum}`
        : `(${area}) ${exch}-${lineNum}`;
    return { formatted, e164, areaOrCity: `${citySpec.city}, ${citySpec.state} (${area})` };
  }

  if (countryCode === 'GB') {
    const citySpec = pick(UK_CITIES, rng);
    const ukPrefixes = ['74', '75', '77', '78', '79'];
    const pref = pick(ukPrefixes, rng);
    let part1 = `${pref}${randDigits(2, rng)}`;
    if (part1 === '7700') part1 = '7712';
    const part2 = randDigits(6, rng);
    const e164 = `+44${part1}${part2}`;
    const formatted =
      phoneFormat === 'e164'
        ? e164
        : phoneFormat === 'international'
        ? `+44 ${part1} ${part2}`
        : `0${part1} ${part2}`;
    return { formatted, e164, areaOrCity: `${citySpec.city} (UK Mobile)` };
  }

  const eu = EUROPE_COUNTRIES.find((c) => c.code === countryCode) ?? EUROPE_COUNTRIES[0];
  const mobilePref = pick(eu.mobilePrefixes, rng);
  const subscriber = randDigits(eu.phoneDigitsAfterPrefix, rng);
  const formattedSub =
    subscriber.length >= 7
      ? `${subscriber.slice(0, 3)} ${subscriber.slice(3)}`
      : subscriber;
  const e164 = `${eu.dialCode}${mobilePref}${subscriber}`;
  const formatted =
    phoneFormat === 'e164'
      ? e164
      : phoneFormat === 'international'
      ? `${eu.dialCode} ${mobilePref} ${formattedSub}`
      : `0${mobilePref} ${formattedSub}`;
  return { formatted, e164, areaOrCity: `${eu.country} Mobile` };
}

function buildSingleProfile(
  countryCode: CountryCode,
  genderPick: 'Male' | 'Female',
  phoneFormat: PhoneFormat,
  rng: () => number
): IdentityProfile {
  const { firstName, lastName, countryName, regionGroup } = pickCountryNamePair(
    countryCode,
    genderPick,
    rng
  );
  const phoneData = buildPhoneForCountry(countryCode, phoneFormat, rng);

  if (countryCode === 'US') {
    const citySpec = pick(US_CITIES, rng);
    const street = pick(US_STREETS, rng);
    const houseNum = 102 + Math.floor(rng() * 8800);
    const apt =
      rng() < 0.25
        ? `, Apt ${1 + Math.floor(rng() * 14)}${['A', 'B', 'C', 'D'][Math.floor(rng() * 4)]}`
        : '';
    const streetAddress = `${houseNum} ${street}${apt}`;
    const zip = pick(citySpec.zips, rng);

    return {
      fullName: `${firstName} ${lastName}`,
      firstName,
      lastName,
      gender: genderPick,
      country: countryName,
      countryCode,
      regionGroup,
      streetAddress,
      city: citySpec.city,
      stateOrRegion: citySpec.state,
      postalCode: zip,
      fullAddress: `${streetAddress}, ${citySpec.city}, ${citySpec.state} ${zip}, USA`,
      phone: phoneData.formatted,
      gmail: buildNaturalGmail(firstName, lastName, 'us', rng),
    };
  }

  if (countryCode === 'GB') {
    const citySpec = pick(UK_CITIES, rng);
    const street = pick(UK_STREETS, rng);
    const houseNum = 1 + Math.floor(rng() * 240);
    const streetAddress =
      rng() < 0.22
        ? `Flat ${1 + Math.floor(rng() * 12)}, ${houseNum} ${street}`
        : `${houseNum} ${street}`;
    const outward = pick(citySpec.outwardCodes, rng);
    const postalCode = `${outward} ${generateUkInwardCode(rng)}`;

    return {
      fullName: `${firstName} ${lastName}`,
      firstName,
      lastName,
      gender: genderPick,
      country: countryName,
      countryCode,
      regionGroup,
      streetAddress,
      city: citySpec.city,
      stateOrRegion: citySpec.county,
      postalCode,
      fullAddress: `${streetAddress}, ${citySpec.city}, ${postalCode}, United Kingdom`,
      phone: phoneData.formatted,
      gmail: buildNaturalGmail(firstName, lastName, 'uk', rng),
    };
  }

  const eu = EUROPE_COUNTRIES.find((c) => c.code === countryCode) ?? EUROPE_COUNTRIES[0];
  const citySpec = pick(eu.cities, rng);
  const street = pick(eu.streets, rng);
  const houseNum = 1 + Math.floor(rng() * 165);
  const streetAddress =
    eu.code === 'FR' || eu.code === 'ES' || eu.code === 'IT'
      ? `${street}, ${houseNum}`
      : `${street} ${houseNum}`;
  const postalCode = pick(citySpec.postalPrefixes, rng);

  return {
    fullName: `${firstName} ${lastName}`,
    firstName,
    lastName,
    gender: genderPick,
    country: eu.country,
    countryCode,
    regionGroup,
    streetAddress,
    city: citySpec.city,
    stateOrRegion: citySpec.region,
    postalCode,
    fullAddress: `${streetAddress}, ${postalCode} ${citySpec.city}, ${eu.country}`,
    phone: phoneData.formatted,
    gmail: buildNaturalGmail(firstName, lastName, eu.code, rng),
  };
}

export async function generateIdentitiesAsync(
  config: IdentityConfig,
  onProgress?: (pct: number) => void
): Promise<IdentityBatchResult> {
  const start = performance.now();
  const countries: CountryCode[] =
    config.countries.length > 0 ? config.countries : ['US', 'GB', 'DE', 'FR'];
  const target = Math.min(Math.max(1, config.count), 200_000);
  const rng = createFastRng((Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0);
  const useSevenDay = config.sevenDayGuard !== false;
  const shouldRecord = useSevenDay && !config.skipHistoryRecord;

  const profiles: IdentityProfile[] = [];
  const usedGmails = new Set<string>();
  const usedPhones = new Set<string>();
  const usedAddrs = new Set<string>();
  const recordEntries: Array<{ category: 'phone' | 'addr' | 'gmail'; value: string }> = [];
  const CHUNK_SIZE = 10_000;

  for (let i = 0; i < target; i += CHUNK_SIZE) {
    const end = Math.min(i + CHUNK_SIZE, target);
    for (let j = i; j < end; j++) {
      const countryCode = pick(countries, rng);
      const genderPick: 'Male' | 'Female' =
        config.gender === 'male'
          ? 'Male'
          : config.gender === 'female'
          ? 'Female'
          : rng() < 0.5
          ? 'Male'
          : 'Female';

      let profile = buildSingleProfile(countryCode, genderPick, config.phoneFormat, rng);

      // Ensure fresh Address, Phone, and Gmail (never repeating in last 7 days when guard is ON)
      let addrGuard = 0;
      while (
        (usedAddrs.has(profile.fullAddress) ||
          (useSevenDay && sevenDayStore.has('addr', profile.fullAddress))) &&
        addrGuard < 10
      ) {
        addrGuard++;
        profile = buildSingleProfile(countryCode, genderPick, config.phoneFormat, rng);
      }

      let phoneGuard = 0;
      while (
        (usedPhones.has(profile.phone) ||
          (useSevenDay && sevenDayStore.has('phone', profile.phone))) &&
        phoneGuard < 12
      ) {
        phoneGuard++;
        const nextPhone = buildPhoneForCountry(countryCode, config.phoneFormat, rng);
        profile = { ...profile, phone: nextPhone.formatted };
      }

      let gmailGuard = 0;
      while (
        (usedGmails.has(profile.gmail) ||
          (useSevenDay && sevenDayStore.has('gmail', profile.gmail))) &&
        gmailGuard < 10
      ) {
        gmailGuard++;
        const suffix = String(Math.floor(10 + rng() * 899));
        const localBase = profile.gmail
          .split('@')[0]
          .slice(0, Math.max(6, 30 - suffix.length))
          .replace(/\.+$/g, '');
        profile = {
          ...profile,
          gmail: `${localBase}${suffix}@gmail.com`,
        };
      }

      usedAddrs.add(profile.fullAddress);
      usedPhones.add(profile.phone);
      usedGmails.add(profile.gmail);
      profiles.push(profile);

      if (shouldRecord) {
        recordEntries.push(
          { category: 'addr', value: profile.fullAddress },
          { category: 'phone', value: profile.phone },
          { category: 'gmail', value: profile.gmail }
        );
      }
    }

    if (onProgress) {
      onProgress(Math.min(99, Math.round((end / target) * 100)));
      await new Promise((r) => setTimeout(r, 0));
    }
  }

  if (shouldRecord && recordEntries.length > 0) {
    void sevenDayStore.recordBatch(recordEntries);
  }

  if (onProgress) onProgress(100);
  return {
    profiles,
    durationMs: Math.round(performance.now() - start),
    requestedCount: target,
  };
}

export function parseCanonicalGmailBase(input: string): string | null {
  const cleaned = input.trim().toLowerCase();
  const [rawLocal, domain] = cleaned.split('@');
  if (!rawLocal) return null;
  if (domain && domain !== 'gmail.com' && domain !== 'googlemail.com') return null;
  const baseNoPlus = rawLocal.split('+')[0].replace(/\./g, '');
  if (!/^[a-z0-9]{6,30}$/.test(baseNoPlus)) return null;
  return baseNoPlus;
}

export function getMaxDotVariants(canonicalBase: string): number {
  const gaps = canonicalBase.length - 1;
  if (gaps <= 0) return 1;
  if (gaps >= 20) return 200_000;
  return Math.min(200_000, Math.pow(2, gaps));
}

function applyDotMask(canonicalBase: string, mask: number): string {
  let out = canonicalBase[0];
  for (let i = 1; i < canonicalBase.length; i++) {
    if ((mask & (1 << (i - 1))) !== 0) {
      out += '.';
    }
    out += canonicalBase[i];
  }
  return out;
}

export async function generateGmailsOnlyAsync(
  config: GmailOnlyConfig,
  onProgress?: (pct: number) => void
): Promise<GmailBatchResult> {
  const start = performance.now();
  const target = Math.min(Math.max(1, config.count), 200_000);
  const rng = createFastRng((Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0);
  const useSevenDay = config.sevenDayGuard !== false;
  const shouldRecord = useSevenDay && !config.skipHistoryRecord;
  const mode: GmailGeneratorMode = config.mode ?? 'synthetic';

  const countryName =
    config.country === 'US'
      ? 'United States'
      : config.country === 'GB'
      ? 'United Kingdom'
      : EUROPE_COUNTRIES.find((c) => c.code === config.country)?.country ?? 'Germany';

  const items: GmailEntry[] = [];
  const used = new Set<string>();
  const recordEntries: Array<{ category: 'gmail'; value: string }> = [];
  const CHUNK_SIZE = 15_000;
  let poolExhausted = false;

  if (mode === 'real_dots') {
    const canonicalBase = parseCanonicalGmailBase(config.baseRealGmail ?? '');
    if (!canonicalBase) {
      if (onProgress) onProgress(100);
      return {
        items: [],
        durationMs: 0,
        requestedCount: target,
        modeUsed: mode,
        poolExhausted: false,
      };
    }

    const gaps = canonicalBase.length - 1;
    const maxMasks = gaps <= 20 ? 1 << gaps : 1_048_576;
    const maxDotBudget = Math.max(0, 30 - canonicalBase.length);

    if (maxDotBudget <= 0 || gaps <= 0) {
      poolExhausted = true;
    } else if (gaps <= 17 && maxMasks <= 131_072) {
      // Exact shuffled enumeration over all valid dot bitmasks
      const masks: number[] = [];
      for (let m = 1; m < maxMasks; m++) {
        // Count set bits to verify <= 30 total characters
        let bits = 0;
        let x = m;
        while (x) {
          bits += x & 1;
          x >>>= 1;
        }
        if (bits <= maxDotBudget) {
          masks.push(m);
        }
      }
      // Fisher-Yates shuffle
      for (let k = masks.length - 1; k > 0; k--) {
        const r = Math.floor(rng() * (k + 1));
        const tmp = masks[k];
        masks[k] = masks[r];
        masks[r] = tmp;
      }

      for (let idx = 0; idx < masks.length && items.length < target; idx++) {
        const gmail = `${applyDotMask(canonicalBase, masks[idx])}@gmail.com`;
        if (useSevenDay && sevenDayStore.has('gmail', gmail)) continue;
        used.add(gmail);
        items.push({
          gmail,
          fullName: `${canonicalBase}@gmail.com`,
          gender: 'Male',
          country: countryName,
          countryCode: config.country,
          deliveryNote: 'Real Google Account (Dot-Variant)',
        });
        if (shouldRecord) {
          recordEntries.push({ category: 'gmail', value: gmail });
        }
        if (onProgress && idx % 10_000 === 0) {
          onProgress(Math.min(99, Math.round((items.length / target) * 100)));
          await new Promise((r) => setTimeout(r, 0));
        }
      }
      if (items.length < target) {
        poolExhausted = true;
      }
    } else {
      let attempts = 0;
      let consecutiveMisses = 0;
      const maxAttempts = target * 5;
      while (items.length < target && attempts < maxAttempts) {
        attempts++;
        // Pick random bitmask within maxDotBudget
        let mask = 0;
        const desiredDots = 1 + Math.floor(rng() * Math.min(gaps, maxDotBudget));
        for (let d = 0; d < desiredDots; d++) {
          mask |= 1 << Math.floor(rng() * Math.min(gaps, 30));
        }
        if (mask === 0) mask = 1;
        const local = applyDotMask(canonicalBase, mask);
        if (local.length > 30) continue;
        const gmail = `${local}@gmail.com`;
        if (used.has(gmail) || (useSevenDay && sevenDayStore.has('gmail', gmail))) {
          consecutiveMisses++;
          if (consecutiveMisses > 3000) {
            poolExhausted = true;
            break;
          }
          continue;
        }
        consecutiveMisses = 0;
        used.add(gmail);
        items.push({
          gmail,
          fullName: `${canonicalBase}@gmail.com`,
          gender: 'Male',
          country: countryName,
          countryCode: config.country,
          deliveryNote: 'Real Google Account (Dot-Variant)',
        });
        if (shouldRecord) {
          recordEntries.push({ category: 'gmail', value: gmail });
        }
        if (onProgress && items.length % CHUNK_SIZE === 0) {
          onProgress(Math.min(99, Math.round((items.length / target) * 100)));
          await new Promise((r) => setTimeout(r, 0));
        }
      }
      if (items.length < target) poolExhausted = true;
    }
  } else if (mode === 'real_plus') {
    const canonicalBase = parseCanonicalGmailBase(config.baseRealGmail ?? '');
    if (!canonicalBase) {
      if (onProgress) onProgress(100);
      return {
        items: [],
        durationMs: 0,
        requestedCount: target,
        modeUsed: mode,
        poolExhausted: false,
      };
    }

    const cTag = config.country.toLowerCase();
    for (let i = 0; i < target; i += CHUNK_SIZE) {
      const end = Math.min(i + CHUNK_SIZE, target);
      for (let j = i; j < end; j++) {
        let tag = `${cTag}${Math.floor(10000 + rng() * 89999)}`;
        let gmail = `${canonicalBase}+${tag}@gmail.com`;
        let guard = 0;
        while (
          (used.has(gmail) || (useSevenDay && sevenDayStore.has('gmail', gmail))) &&
          guard < 16
        ) {
          guard++;
          tag = `${cTag}${Math.floor(100000 + rng() * 899999)}`;
          gmail = `${canonicalBase}+${tag}@gmail.com`;
        }
        used.add(gmail);
        items.push({
          gmail,
          fullName: `${canonicalBase}@gmail.com`,
          gender: 'Male',
          country: countryName,
          countryCode: config.country,
          deliveryNote: 'Real Inbox Delivery (+Alias)',
        });
        if (shouldRecord) {
          recordEntries.push({ category: 'gmail', value: gmail });
        }
      }
      if (onProgress) {
        onProgress(Math.min(99, Math.round((end / target) * 100)));
        await new Promise((r) => setTimeout(r, 0));
      }
    }
  } else {
    for (let i = 0; i < target; i += CHUNK_SIZE) {
      const end = Math.min(i + CHUNK_SIZE, target);
      for (let j = i; j < end; j++) {
        const genderPick: 'Male' | 'Female' =
          config.gender === 'male'
            ? 'Male'
            : config.gender === 'female'
            ? 'Female'
            : rng() < 0.5
            ? 'Male'
            : 'Female';

        const { firstName, lastName, countryName: cName } = pickCountryNamePair(
          config.country,
          genderPick,
          rng
        );
        let gmail = buildNaturalGmail(firstName, lastName, config.country, rng, config.style);

        let guard = 0;
        while (
          (used.has(gmail) || (useSevenDay && sevenDayStore.has('gmail', gmail))) &&
          guard < 12
        ) {
          guard++;
          const suffix = String(Math.floor(10 + rng() * 8999));
          const localBase = gmail
            .split('@')[0]
            .slice(0, Math.max(6, 30 - suffix.length))
            .replace(/\.+$/g, '');
          gmail = `${localBase}${suffix}@gmail.com`;
        }

        used.add(gmail);
        items.push({
          gmail,
          fullName: `${firstName} ${lastName}`,
          gender: genderPick,
          country: cName,
          countryCode: config.country,
          deliveryNote: 'Synthetic Format-Only',
        });

        if (shouldRecord) {
          recordEntries.push({ category: 'gmail', value: gmail });
        }
      }

      if (onProgress) {
        onProgress(Math.min(99, Math.round((end / target) * 100)));
        await new Promise((r) => setTimeout(r, 0));
      }
    }
  }

  if (shouldRecord && recordEntries.length > 0) {
    void sevenDayStore.recordBatch(recordEntries);
  }
  if (onProgress) onProgress(100);

  return {
    items,
    durationMs: Math.round(performance.now() - start),
    requestedCount: target,
    modeUsed: mode,
    poolExhausted,
  };
}

export async function generatePhonesOnlyAsync(
  config: PhoneOnlyConfig,
  onProgress?: (pct: number) => void
): Promise<PhoneBatchResult> {
  const start = performance.now();
  const target = Math.min(Math.max(1, config.count), 200_000);
  const rng = createFastRng((Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0);
  const useSevenDay = config.sevenDayGuard !== false;
  const shouldRecord = useSevenDay && !config.skipHistoryRecord;

  const countryName =
    config.country === 'US'
      ? 'United States'
      : config.country === 'GB'
      ? 'United Kingdom'
      : EUROPE_COUNTRIES.find((c) => c.code === config.country)?.country ?? 'Germany';

  const items: PhoneEntry[] = [];
  const used = new Set<string>();
  const recordEntries: Array<{ category: 'phone'; value: string }> = [];
  const CHUNK_SIZE = 15_000;

  for (let i = 0; i < target; i += CHUNK_SIZE) {
    const end = Math.min(i + CHUNK_SIZE, target);
    for (let j = i; j < end; j++) {
      let generated = buildPhoneForCountry(
        config.country,
        config.phoneFormat,
        rng,
        config.usCity
      );
      let guard = 0;
      while (
        (used.has(generated.e164) ||
          (useSevenDay && sevenDayStore.has('phone', generated.formatted))) &&
        guard < 16
      ) {
        guard++;
        generated = buildPhoneForCountry(
          config.country,
          config.phoneFormat,
          rng,
          config.usCity
        );
      }

      used.add(generated.e164);
      items.push({
        phone: generated.formatted,
        e164: generated.e164,
        country: countryName,
        countryCode: config.country,
        areaOrCity: generated.areaOrCity,
      });

      if (shouldRecord) {
        recordEntries.push({ category: 'phone', value: generated.formatted });
      }
    }

    if (onProgress) {
      onProgress(Math.min(99, Math.round((end / target) * 100)));
      await new Promise((r) => setTimeout(r, 0));
    }
  }

  if (shouldRecord && recordEntries.length > 0) {
    void sevenDayStore.recordBatch(recordEntries);
  }
  if (onProgress) onProgress(100);

  return {
    items,
    durationMs: Math.round(performance.now() - start),
    requestedCount: target,
  };
}
