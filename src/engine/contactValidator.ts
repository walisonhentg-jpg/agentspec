export interface ContactRuleCheck {
  id: string;
  label: string;
  passed: boolean;
  detail: string;
}

export interface PhoneValidationResult {
  isValid: boolean;
  normalizedE164: string | null;
  country: string;
  dialCode: string;
  numberType: string;
  checks: ContactRuleCheck[];
}

export interface GmailValidationResult {
  isValid: boolean;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  patternFlag: string | null;
  normalizedEmail: string;
  localPart: string;
  domain: string;
  checks: ContactRuleCheck[];
}

export interface AddressValidationResult {
  isValid: boolean;
  verdict: 'REAL_FORMAT' | 'SUSPICIOUS' | 'INVALID_OR_FRAUD';
  countryCode: string;
  countryName: string;
  addressType: 'RESIDENTIAL_OR_COMMERCIAL' | 'PO_BOX_OR_PMB' | 'UNKNOWN';
  streetLine: string;
  city: string;
  stateOrRegion: string;
  postalCode: string;
  normalizedAddress: string;
  checks: ContactRuleCheck[];
}

// Pure-TypeScript SHA-256 hex digest so Gravatar profile pic lookup works on http://, https://, and Electron file://
export function sha256Hex(asciiInput: string): string {
  const bytes = new TextEncoder().encode(asciiInput);
  const K = new Uint32Array([
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ]);
  const H = new Uint32Array([
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ]);

  const bitLen = bytes.length * 8;
  const totalLen = Math.ceil((bytes.length + 9) / 64) * 64;
  const padded = new Uint8Array(totalLen);
  padded.set(bytes);
  padded[bytes.length] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(totalLen - 8, Math.floor(bitLen / 0x100000000), false);
  view.setUint32(totalLen - 4, bitLen >>> 0, false);

  const w = new Uint32Array(64);
  const rotr = (x: number, n: number) => (x >>> n) | (x << (32 - n));

  for (let offset = 0; offset < totalLen; offset += 64) {
    for (let i = 0; i < 16; i++) {
      w[i] = view.getUint32(offset + i * 4, false);
    }
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }

    let a = H[0], b = H[1], c = H[2], d = H[3];
    let e = H[4], f = H[5], g = H[6], h = H[7];

    for (let i = 0; i < 64; i++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + K[i] + w[i]) >>> 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) >>> 0;
      h = g; g = f; f = e; e = (d + temp1) >>> 0;
      d = c; c = b; b = a; a = (temp1 + temp2) >>> 0;
    }

    H[0] = (H[0] + a) >>> 0; H[1] = (H[1] + b) >>> 0;
    H[2] = (H[2] + c) >>> 0; H[3] = (H[3] + d) >>> 0;
    H[4] = (H[4] + e) >>> 0; H[5] = (H[5] + f) >>> 0;
    H[6] = (H[6] + g) >>> 0; H[7] = (H[7] + h) >>> 0;
  }

  return Array.from(H)
    .map((x) => x.toString(16).padStart(8, '0'))
    .join('');
}

export function getGravatarUrl(email: string, size = 160): { url: string; sha256: string } {
  const canonical = email.trim().toLowerCase();
  const sha256 = sha256Hex(canonical);
  return {
    sha256,
    url: `https://www.gravatar.com/avatar/${sha256}?d=404&s=${size}`,
  };
}

export function probeEmailAvatar(email: string, size = 160): Promise<{
  hasPic: boolean;
  url: string | null;
  sha256: string;
}> {
  const { url, sha256 } = getGravatarUrl(email, size);
  return new Promise((resolve) => {
    const img = new Image();
    let settled = false;
    const finish = (hasPic: boolean) => {
      if (settled) return;
      settled = true;
      resolve({ hasPic, url: hasPic ? url : null, sha256 });
    };
    const timer = setTimeout(() => finish(false), 5000);
    img.onload = () => {
      clearTimeout(timer);
      finish(img.naturalWidth > 0);
    };
    img.onerror = () => {
      clearTimeout(timer);
      finish(false);
    };
    img.src = url;
  });
}

interface CountryPhoneRule {
  dial: string;
  country: string;
  minDigits: number;
  maxDigits: number;
  mobilePrefixRegex: RegExp;
  note: string;
}

const COUNTRY_RULES: CountryPhoneRule[] = [
  { dial: '1', country: 'United States / NANP', minDigits: 10, maxDigits: 10, mobilePrefixRegex: /^[2-9]\d{2}[2-9]\d{6}$/, note: 'NANP 10-digit geographic/mobile number' },
  { dial: '44', country: 'United Kingdom', minDigits: 10, maxDigits: 10, mobilePrefixRegex: /^7[1-9]\d{8}$/, note: 'UK mobile (+44 7xxx xxxxxx)' },
  { dial: '49', country: 'Germany', minDigits: 10, maxDigits: 11, mobilePrefixRegex: /^1(?:5\d|6[023]|7\d)\d{7,8}$/, note: 'German mobile (+49 15x/16x/17x)' },
  { dial: '33', country: 'France', minDigits: 9, maxDigits: 9, mobilePrefixRegex: /^[67]\d{8}$/, note: 'French mobile (+33 6/7)' },
  { dial: '34', country: 'Spain', minDigits: 9, maxDigits: 9, mobilePrefixRegex: /^[67]\d{8}$/, note: 'Spanish mobile (+34 6/7)' },
  { dial: '39', country: 'Italy', minDigits: 9, maxDigits: 10, mobilePrefixRegex: /^3\d{8,9}$/, note: 'Italian mobile (+39 3xx)' },
  { dial: '31', country: 'Netherlands', minDigits: 9, maxDigits: 9, mobilePrefixRegex: /^6\d{8}$/, note: 'Dutch mobile (+31 6)' },
  { dial: '48', country: 'Poland', minDigits: 9, maxDigits: 9, mobilePrefixRegex: /^(?:45|50|51|53|57|60|66|69|72|73|78|79|88)\d{7}$/, note: 'Polish mobile (+48)' },
  { dial: '46', country: 'Sweden', minDigits: 9, maxDigits: 9, mobilePrefixRegex: /^7[02369]\d{7}$/, note: 'Swedish mobile (+46 7x)' },
  { dial: '353', country: 'Ireland', minDigits: 9, maxDigits: 9, mobilePrefixRegex: /^8[356789]\d{7}$/, note: 'Irish mobile (+353 8x)' },
];

export function validatePhoneNumber(rawInput: string): PhoneValidationResult {
  const trimmed = rawInput.trim();
  const checks: ContactRuleCheck[] = [];

  if (!trimmed) {
    return {
      isValid: false,
      normalizedE164: null,
      country: 'Unknown',
      dialCode: '—',
      numberType: 'Unknown',
      checks: [{ id: 'empty', label: 'Non-empty phone input', passed: false, detail: 'Enter a phone number to check.' }],
    };
  }

  const cleaned = trimmed.replace(/[\s\-().]/g, '');
  const hasPlus = cleaned.startsWith('+');
  const digitsOnly = cleaned.replace(/^\+/, '');

  const syntaxOk = /^\d{8,15}$/.test(digitsOnly);
  checks.push({
    id: 'itu_syntax',
    label: 'ITU-T E.164 Character & Length Check',
    passed: syntaxOk,
    detail: syntaxOk
      ? `Contains ${digitsOnly.length} valid numeric digits (within 8–15 digit standard).`
      : 'Contains invalid non-numeric characters or length is outside 8–15 digits.',
  });

  if (!syntaxOk) {
    return {
      isValid: false,
      normalizedE164: null,
      country: 'Unknown',
      dialCode: '—',
      numberType: 'Invalid',
      checks,
    };
  }

  let matchedRule: CountryPhoneRule | null = null;
  let nationalDigits = digitsOnly;

  if (
    hasPlus ||
    digitsOnly.startsWith('353') ||
    digitsOnly.startsWith('44') ||
    digitsOnly.startsWith('49') ||
    digitsOnly.startsWith('33') ||
    digitsOnly.startsWith('34') ||
    digitsOnly.startsWith('39') ||
    digitsOnly.startsWith('31') ||
    digitsOnly.startsWith('48') ||
    digitsOnly.startsWith('46') ||
    (digitsOnly.startsWith('1') && digitsOnly.length === 11)
  ) {
    const sorted = [...COUNTRY_RULES].sort((a, b) => b.dial.length - a.dial.length);
    for (const r of sorted) {
      if (digitsOnly.startsWith(r.dial)) {
        const rem = digitsOnly.slice(r.dial.length);
        if (rem.length >= r.minDigits && rem.length <= r.maxDigits) {
          matchedRule = r;
          nationalDigits = rem;
          break;
        }
      }
    }
  } else if (digitsOnly.length === 10 && /^[2-9]\d{2}[2-9]\d{6}$/.test(digitsOnly)) {
    matchedRule = COUNTRY_RULES[0];
    nationalDigits = digitsOnly;
  } else if (digitsOnly.startsWith('07') && digitsOnly.length === 11) {
    matchedRule = COUNTRY_RULES[1];
    nationalDigits = digitsOnly.slice(1);
  }

  checks.push({
    id: 'country_dial',
    label: 'Country Dialing Code & Digit Count',
    passed: Boolean(matchedRule),
    detail: matchedRule
      ? `Matched +${matchedRule.dial} (${matchedRule.country}) with ${nationalDigits.length} national digits.`
      : 'Unrecognized country dialing code or incorrect national digit count.',
  });

  let prefixOk = false;
  let fictionalFree = true;
  let numberType = 'Unknown';

  if (matchedRule) {
    if (matchedRule.dial === '1') {
      const area = nationalDigits.slice(0, 3);
      const exch = nationalDigits.slice(3, 6);
      const validArea = /^[2-9]\d{2}$/.test(area) && !/^[2-9]11$/.test(area);
      const validExch = /^[2-9]\d{2}$/.test(exch) && !/^[2-9]11$/.test(exch);
      const isFictional555 = exch === '555';
      const isAllSame = /^(\d)\1{9}$/.test(nationalDigits);

      prefixOk = validArea && validExch;
      fictionalFree = !isFictional555 && !isAllSame;
      numberType = 'NANP Mobile / Geographic';

      checks.push({
        id: 'prefix_plan',
        label: 'National Numbering Plan Prefix',
        passed: prefixOk,
        detail: prefixOk
          ? `Area code (${area}) and central office exchange (${exch}) follow NANP rules.`
          : `Invalid NANP area code (${area}) or N11 service exchange (${exch}).`,
      });

      checks.push({
        id: 'non_fictional',
        label: 'Non-Reserved / Non-Fictional Range',
        passed: fictionalFree,
        detail: fictionalFree
          ? 'Not in FCC 555 fictional range or repeated-digit dummy block.'
          : isFictional555
          ? 'Detected FCC reserved fictional 555 exchange.'
          : 'Detected repeated dummy digit sequence.',
      });
    } else if (matchedRule.dial === '44') {
      prefixOk = matchedRule.mobilePrefixRegex.test(nationalDigits);
      const isOfcomDrama = /^7700900/.test(nationalDigits);
      fictionalFree = !isOfcomDrama;
      numberType = 'UK Mobile';

      checks.push({
        id: 'prefix_plan',
        label: 'Ofcom UK Mobile Prefix Check',
        passed: prefixOk,
        detail: prefixOk
          ? `Starts with valid UK mobile block (0${nationalDigits.slice(0, 4)}).`
          : 'Does not match valid UK +44 7xxx mobile numbering allocation.',
      });

      checks.push({
        id: 'non_fictional',
        label: 'Non-Reserved / Non-Drama Range',
        passed: fictionalFree,
        detail: fictionalFree
          ? 'Not inside Ofcom reserved drama range (07700 900xxx).'
          : 'Detected Ofcom reserved TV/drama range (07700 900xxx).',
      });
    } else {
      prefixOk = matchedRule.mobilePrefixRegex.test(nationalDigits);
      const isRepeated = /^(\d)\1{6,}$/.test(nationalDigits);
      fictionalFree = !isRepeated;
      numberType = matchedRule.note;

      checks.push({
        id: 'prefix_plan',
        label: 'Carrier Mobile Prefix Allocation',
        passed: prefixOk,
        detail: prefixOk
          ? `Matches active ${matchedRule.country} mobile prefix allocation.`
          : `Prefix does not match active mobile allocations for ${matchedRule.country}.`,
      });

      checks.push({
        id: 'non_fictional',
        label: 'Non-Dummy Sequence Check',
        passed: fictionalFree,
        detail: fictionalFree
          ? 'Subscriber digits pass entropy / non-dummy check.'
          : 'Detected repeated dummy digit pattern.',
      });
    }
  }

  const allPassed = checks.every((c) => c.passed);
  const normalizedE164 = matchedRule ? `+${matchedRule.dial}${nationalDigits}` : null;

  return {
    isValid: allPassed,
    normalizedE164,
    country: matchedRule?.country ?? 'Unknown',
    dialCode: matchedRule ? `+${matchedRule.dial}` : '—',
    numberType,
    checks,
  };
}

const COMMON_GMAIL_TYPOS = new Set([
  'gamil.com',
  'gmial.com',
  'gmal.com',
  'gmaill.com',
  'gnail.com',
  'gmail.con',
  'gmail.co',
  'gmail.cm',
  'gmail.om',
  'gmai.com',
  'gmaul.com',
  'gimail.com',
  'gmail.com.bd',
]);

const DISPOSABLE_EMAIL_DOMAINS = new Set([
  'mailinator.com',
  'tempmail.com',
  '10minutemail.com',
  'guerrillamail.com',
  'yopmail.com',
  'trashmail.com',
  'sharklasers.com',
  'getnada.com',
  'dispostable.com',
  'maildrop.cc',
  'mohmal.com',
  'temp-mail.org',
  'fakeinbox.com',
  'throwawaymail.com',
]);

const DUMMY_GMAIL_PATTERNS =
  /^(?:test(?:ing|user|account|mail)?\d*|fake(?:user|mail|account)?\d*|dummy\d*|admin\d*|noreply\d*|no-reply\d*|example\d*|sample\d*|qwerty\d*|asdf(?:gh)?\d*|zxcvb\d*|abcdef\d*|123456\d*)$/;

export function validateGmailAddress(rawInput: string): GmailValidationResult {
  const email = rawInput.trim().toLowerCase();
  const checks: ContactRuleCheck[] = [];

  if (!email) {
    return {
      isValid: false,
      riskLevel: 'HIGH',
      patternFlag: 'Empty input',
      normalizedEmail: '',
      localPart: '',
      domain: '',
      checks: [{ id: 'empty', label: 'Non-empty email input', passed: false, detail: 'Enter a Gmail address to check.' }],
    };
  }

  const parts = email.split('@');
  const hasSingleAt = parts.length === 2 && parts[0].length > 0 && parts[1].length > 0;
  const localPart = parts[0] ?? '';
  const domain = parts[1] ?? '';

  checks.push({
    id: 'at_structure',
    label: 'Email Address Structure',
    passed: hasSingleAt && !/\s/.test(email) && email.length <= 254,
    detail:
      hasSingleAt && !/\s/.test(email)
        ? 'Valid single @ separator with no whitespace.'
        : 'Missing @ separator, exceeds max length, or contains whitespace.',
  });

  const isGmailDomain = domain === 'gmail.com' || domain === 'googlemail.com';
  const isTypoDomain = COMMON_GMAIL_TYPOS.has(domain);
  const isDisposable = DISPOSABLE_EMAIL_DOMAINS.has(domain);
  const isSubdomainSpoof = domain.endsWith('.gmail.com') || domain.endsWith('.googlemail.com');

  checks.push({
    id: 'gmail_domain',
    label: 'Official Gmail Domain Check',
    passed: isGmailDomain,
    detail: isGmailDomain
      ? `Verified official domain (${domain}).`
      : isDisposable
      ? `FRAUD / TRAP: Disposable throwaway domain "${domain}" blocked.`
      : isSubdomainSpoof
      ? `FRAUD / SPOOF: Subdomain "${domain}" is not an official @gmail.com inbox.`
      : isTypoDomain
      ? `Detected common Gmail typo domain "${domain}" (did you mean gmail.com?).`
      : `Domain "${domain}" is not gmail.com.`,
  });

  const plusParts = localPart.split('+');
  const baseLocal = plusParts[0] ?? '';
  const baseNoDots = baseLocal.replace(/\./g, '');
  const hasPlusAlias = plusParts.length > 1;
  const plusTag = plusParts.slice(1).join('+');

  const lengthOk =
    baseLocal.length >= 6 &&
    baseLocal.length <= 30 &&
    localPart.length <= 64;
  checks.push({
    id: 'gmail_length',
    label: 'Google 6–30 Character Username Length',
    passed: lengthOk,
    detail: lengthOk
      ? `Base username is ${baseLocal.length} characters (within Google's 6–30 character requirement).`
      : `Base username is ${baseLocal.length} characters; Google Gmail strictly requires 6 to 30 characters.`,
  });

  const validChars =
    /^[a-z0-9.]+$/.test(baseLocal) &&
    (!hasPlusAlias || /^[a-z0-9._-]+$/.test(plusTag));
  const hasUnderscore = baseLocal.includes('_') || baseLocal.includes('-');
  checks.push({
    id: 'gmail_charset',
    label: 'Allowed Gmail Character Set (a–z, 0–9, .)',
    passed: validChars,
    detail: validChars
      ? 'Contains only Google-permitted lowercase letters, digits, and periods.'
      : hasUnderscore
      ? 'Contains illegal underscore (_) or hyphen (-) in username, which Google Gmail rejects.'
      : 'Contains unsupported special characters.',
  });

  const dotRulesOk =
    !baseLocal.startsWith('.') &&
    !baseLocal.endsWith('.') &&
    !baseLocal.includes('..');
  checks.push({
    id: 'gmail_dots',
    label: 'Google Period (Dot) Placement Rules',
    passed: dotRulesOk,
    detail: dotRulesOk
      ? 'No leading, trailing, or consecutive periods.'
      : 'Invalid period placement (cannot start/end with a dot or contain "..").',
  });

  const hasAtLeastOneLetter = /[a-z]/.test(baseNoDots);
  checks.push({
    id: 'gmail_letter',
    label: 'Google Letter-Required Rule (No All-Digit Usernames)',
    passed: hasAtLeastOneLetter,
    detail: hasAtLeastOneLetter
      ? 'Contains alphabetic letters (Google rejects pure numeric usernames).'
      : 'FRAUD / INVALID: Google Gmail prohibits all-number usernames like 1234567@gmail.com.',
  });

  const hasRepeatedChars = /(.)\1{4,}/.test(baseNoDots);
  const isDummyOrBot = DUMMY_GMAIL_PATTERNS.test(baseNoDots);
  const dotsCount = (baseLocal.match(/\./g) ?? []).length;
  const excessiveTrailingDigits = /^[a-z]{1,4}\d{7,}$/.test(baseNoDots);
  const antiFraudOk = !hasRepeatedChars && !isDummyOrBot && dotsCount <= 6;

  let patternFlag: string | null = null;
  if (isDisposable) patternFlag = 'Disposable domain';
  else if (isSubdomainSpoof) patternFlag = 'Subdomain spoof';
  else if (!hasAtLeastOneLetter) patternFlag = 'All-numeric username';
  else if (isDummyOrBot) patternFlag = 'Dummy / bot word';
  else if (hasRepeatedChars) patternFlag = '5+ repeated chars';
  else if (dotsCount > 6) patternFlag = 'Excessive dot spam';
  else if (excessiveTrailingDigits) patternFlag = 'Bot-like trailing digit entropy';

  checks.push({
    id: 'gmail_antifraud',
    label: 'Anti-Bot / Dummy / Spam Pattern Guard',
    passed: antiFraudOk,
    detail: !antiFraudOk
      ? isDummyOrBot
        ? `FRAUD / BOT: Detected dummy/keyboard-walk pattern in "${baseLocal}".`
        : hasRepeatedChars
        ? `FRAUD / BOT: Detected 5+ identical consecutive characters in "${baseLocal}".`
        : `Suspicious hyper-dot obfuscation (${dotsCount} dots in base username).`
      : excessiveTrailingDigits
      ? `Passed syntax with caution: high trailing numeric entropy (${baseNoDots}).`
      : 'Natural username structure without bot/spam signatures.',
  });

  const canonical = `${baseNoDots}@gmail.com`;
  const isValid = checks.every((c) => c.passed);
  const riskLevel: GmailValidationResult['riskLevel'] = !isValid
    ? 'HIGH'
    : excessiveTrailingDigits || hasPlusAlias
    ? 'MEDIUM'
    : 'LOW';

  return {
    isValid,
    riskLevel,
    patternFlag,
    normalizedEmail: isValid ? canonical : email,
    localPart,
    domain,
    checks,
  };
}

const US_STATE_ZIP_RANGES: Record<string, Array<[number, number]>> = {
  AL: [[350, 369]], AK: [[995, 999]], AZ: [[850, 865]], AR: [[716, 729]],
  CA: [[900, 961]], CO: [[800, 816]], CT: [[60, 69]], DE: [[197, 199]],
  DC: [[200, 205]], FL: [[320, 349]], GA: [[300, 319], [398, 399]],
  HI: [[967, 968]], ID: [[832, 838]], IL: [[600, 629]], IN: [[460, 479]],
  IA: [[500, 528]], KS: [[660, 679]], KY: [[400, 427]], LA: [[700, 714]],
  ME: [[39, 49]], MD: [[206, 219]], MA: [[10, 27]], MI: [[480, 499]],
  MN: [[550, 567]], MS: [[386, 397]], MO: [[630, 658]], MT: [[590, 599]],
  NE: [[680, 693]], NV: [[889, 898]], NH: [[30, 38]], NJ: [[70, 89]],
  NM: [[870, 884]], NY: [[100, 149], [5, 5], [63, 63]], NC: [[270, 289]],
  ND: [[580, 588]], OH: [[430, 459]], OK: [[730, 749]], OR: [[970, 979]],
  PA: [[150, 196]], RI: [[28, 29]], SC: [[290, 299]], SD: [[570, 577]],
  TN: [[370, 385]], TX: [[750, 799], [733, 733], [885, 885]],
  UT: [[840, 847]], VT: [[50, 59]], VA: [[201, 201], [220, 246]],
  WA: [[980, 994]], WV: [[247, 268]], WI: [[530, 549]], WY: [[820, 831]],
};

const COUNTRY_NAME_MAP: Record<string, string> = {
  US: 'United States',
  GB: 'United Kingdom',
  DE: 'Germany',
  FR: 'France',
  ES: 'Spain',
  IT: 'Italy',
  NL: 'Netherlands',
  PL: 'Poland',
  SE: 'Sweden',
  IE: 'Ireland',
  CA: 'Canada',
  AU: 'Australia',
  BD: 'Bangladesh',
};

const ADDRESS_DUMMY_WORDS =
  /\b(?:fake|test(?:ing)?|dummy|sample|lorem|ipsum|asdf+|qwerty|zxcv+|unknown|none|n\/a|example|nobody|no\s*address|12345\s+main)\b/i;

export function validateStreetAddress(rawInput: string): AddressValidationResult {
  const trimmed = rawInput.trim().replace(/\s+/g, ' ');
  const checks: ContactRuleCheck[] = [];

  if (!trimmed) {
    return {
      isValid: false,
      verdict: 'INVALID_OR_FRAUD',
      countryCode: '—',
      countryName: 'Unknown',
      addressType: 'UNKNOWN',
      streetLine: '—',
      city: '—',
      stateOrRegion: '—',
      postalCode: '—',
      normalizedAddress: '',
      checks: [{ id: 'empty', label: 'Non-empty address input', passed: false, detail: 'Enter a street address to validate.' }],
    };
  }

  // 1. Structure & Length
  const cleanChars = !/[<>={}$`\\]/.test(trimmed);
  const commaParts = trimmed.split(',').map((p) => p.trim()).filter(Boolean);
  const structureOk = trimmed.length >= 10 && trimmed.length <= 220 && cleanChars && commaParts.length >= 2;
  checks.push({
    id: 'addr_syntax',
    label: 'Address Structure & Locality Parts',
    passed: structureOk,
    detail: structureOk
      ? `Parsed ${commaParts.length} comma-separated address segments (${trimmed.length} chars).`
      : 'Address is too short, contains invalid symbols, or lacks street + city/postal separation.',
  });

  // 2. Anti-Dummy / Placeholder Fraud Guard
  const hasDummyWord = ADDRESS_DUMMY_WORDS.test(trimmed);
  const hasRepeatedDigits = /(.)\1{5,}/.test(trimmed);
  const antiDummyOk = !hasDummyWord && !hasRepeatedDigits;
  checks.push({
    id: 'addr_antifraud',
    label: 'Anti-Dummy & Placeholder Fraud Guard',
    passed: antiDummyOk,
    detail: antiDummyOk
      ? 'No dummy, test, keyboard-walk, or repeated character spoof tokens found.'
      : hasDummyWord
      ? 'FRAUD / DUMMY: Detected test/placeholder token (e.g. fake, test, 12345 main, asdf).'
      : 'FRAUD: Detected suspicious repeated-character sequence.',
  });

  // 3. P.O. Box / PMB Detection
  const isPoBox = /\b(?:P\.?\s*O\.?\s*Box|Post\s*Office\s*Box|PMB\s*\d+|Parcel\s*Locker)\b/i.test(trimmed);
  const addressType: AddressValidationResult['addressType'] = isPoBox
    ? 'PO_BOX_OR_PMB'
    : 'RESIDENTIAL_OR_COMMERCIAL';
  checks.push({
    id: 'addr_pobox',
    label: 'Physical Street vs. P.O. Box Check',
    passed: !isPoBox,
    detail: isPoBox
      ? 'WARNING: Detected P.O. Box / PMB maildrop (often rejected for KYC/banking physical address checks).'
      : 'Physical street address (not a P.O. Box or maildrop).',
  });

  // 4. Street Number & Thoroughfare Presence
  const streetLine = commaParts[0] ?? trimmed;
  const hasBuildingNumber = /\b\d+[A-Za-z]?(?:-\d+)?\b/.test(streetLine);
  const hasStreetWord =
    /\b(?:St|Street|Ave|Avenue|Rd|Road|Blvd|Boulevard|Ln|Lane|Dr|Drive|Way|Ct|Court|Pl|Place|Pkwy|Parkway|Cir|Circle|Ter|Terrace|Square|Sq|Close|Crescent|Gardens|Grove|Row|Rue|Avenue|Boulevard|Allée|Calle|Paseo|Gran\s*Vía|Via|Corso|Viale|Piazza|Straße|Strasse|Str\.|Allee|Weg|Platz|Ring|Damm|Laan|Gracht|Kade|Plein|ul\.|Aleja|Gatan|Vägen|House|Plot|Block|Sector|Flat|Apt)\b/i.test(
      streetLine
    ) || commaParts.length >= 3;
  const streetOk = hasBuildingNumber && hasStreetWord;
  checks.push({
    id: 'addr_street',
    label: 'Street Number & Thoroughfare Presence',
    passed: streetOk,
    detail: streetOk
      ? `Verified street line "${streetLine}" with civic building number.`
      : !hasBuildingNumber
      ? `Missing civic street/building number in "${streetLine}".`
      : `Street thoroughfare type missing or incomplete in "${streetLine}".`,
  });

  // Auto-detect Country & Postal Code
  let countryCode = 'INTL';
  let postalCode = '—';
  let city = commaParts[1] ?? '—';
  let stateOrRegion = commaParts.length >= 3 ? commaParts[2] : '—';

  const usStateZipMatch = trimmed.match(/\b([A-Z]{2})\s+(\d{5})(?:-(\d{4}))?\b/);
  const ukPostcodeMatch = trimmed.match(/\b([A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2})\b/i);
  const nlPostcodeMatch = trimmed.match(/\b(\d{4}\s?[A-Z]{2})\b/);
  const ieEircodeMatch = trimmed.match(/\b([AC-FHKNPRTV-Y]\d{2}\s?[0-9AC-FHKNPRTV-Y]{4})\b/i);
  const caPostcodeMatch = trimmed.match(/\b([ABCEGHJ-NPRSTVXY]\d[ABCEGHJ-NPRSTV-Z]\s?\d[ABCEGHJ-NPRSTV-Z]\d)\b/i);
  const plPostcodeMatch = trimmed.match(/\b(\d{2}-\d{3})\b/);
  const sePostcodeMatch = trimmed.match(/\b(\d{3}\s\d{2})\b/);
  const eu5Match = trimmed.match(/\b(\d{5})\b/);
  const fourDigitPostMatch = trimmed.match(/\b(\d{4})\b/);

  const upper = trimmed.toUpperCase();
  if (ukPostcodeMatch || /\b(?:UNITED KINGDOM|UK|LONDON|MANCHESTER|BIRMINGHAM|EDINBURGH|BRISTOL)\b/.test(upper)) {
    countryCode = 'GB';
    postalCode = ukPostcodeMatch?.[1].toUpperCase() ?? '—';
  } else if (usStateZipMatch || /\b(?:USA|UNITED STATES|U\.S\.A)\b/.test(upper)) {
    countryCode = 'US';
    postalCode = usStateZipMatch ? `${usStateZipMatch[2]}${usStateZipMatch[3] ? `-${usStateZipMatch[3]}` : ''}` : '—';
    if (usStateZipMatch) stateOrRegion = usStateZipMatch[1];
  } else if (nlPostcodeMatch || /\b(?:NETHERLANDS|AMSTERDAM|ROTTERDAM|UTRECHT)\b/.test(upper)) {
    countryCode = 'NL';
    postalCode = nlPostcodeMatch?.[1].toUpperCase() ?? '—';
  } else if (ieEircodeMatch || /\b(?:IRELAND|DUBLIN|CORK|GALWAY)\b/.test(upper)) {
    countryCode = 'IE';
    postalCode = ieEircodeMatch?.[1].toUpperCase() ?? '—';
  } else if (caPostcodeMatch || /\b(?:CANADA|TORONTO|VANCOUVER|MONTREAL)\b/.test(upper)) {
    countryCode = 'CA';
    postalCode = caPostcodeMatch?.[1].toUpperCase() ?? '—';
  } else if (plPostcodeMatch || /\b(?:POLAND|WARSZAWA|KRAKÓW|KRAKOW|GDAŃSK)\b/.test(upper)) {
    countryCode = 'PL';
    postalCode = plPostcodeMatch?.[1] ?? '—';
  } else if (/\b(?:GERMANY|DEUTSCHLAND|BERLIN|MÜNCHEN|MUNICH|HAMBURG|FRANKFURT|KÖLN)\b/.test(upper) || /STRAßE|STRASSE/i.test(trimmed)) {
    countryCode = 'DE';
    postalCode = eu5Match?.[1] ?? '—';
  } else if (/\b(?:FRANCE|PARIS|LYON|MARSEILLE|TOULOUSE)\b/.test(upper) || /\bRUE\b|\bAVENUE\b/i.test(streetLine)) {
    countryCode = 'FR';
    postalCode = eu5Match?.[1] ?? '—';
  } else if (/\b(?:SPAIN|ESPAÑA|MADRID|BARCELONA|VALENCIA|SEVILLA)\b/.test(upper) || /\bCALLE\b|\bPASEO\b/i.test(streetLine)) {
    countryCode = 'ES';
    postalCode = eu5Match?.[1] ?? '—';
  } else if (/\b(?:ITALY|ITALIA|ROMA|ROME|MILANO|MILAN|NAPOLI)\b/.test(upper) || /\bVIA\b|\bCORSO\b|\bPIAZZA\b/i.test(streetLine)) {
    countryCode = 'IT';
    postalCode = eu5Match?.[1] ?? '—';
  } else if (sePostcodeMatch || /\b(?:SWEDEN|SVERIGE|STOCKHOLM|GÖTEBORG|MALMÖ)\b/.test(upper)) {
    countryCode = 'SE';
    postalCode = sePostcodeMatch?.[1] ?? eu5Match?.[1] ?? '—';
  } else if (/\b(?:BANGLADESH|DHAKA|CHITTAGONG|CHATTOGRAM|SYLHET|RAJSHAHI|KHULNA)\b/.test(upper)) {
    countryCode = 'BD';
    postalCode = fourDigitPostMatch?.[1] ?? '—';
  } else if (/\b(?:AUSTRALIA|SYDNEY|MELBOURNE|BRISBANE)\b/.test(upper)) {
    countryCode = 'AU';
    postalCode = fourDigitPostMatch?.[1] ?? '—';
  } else if (eu5Match) {
    postalCode = eu5Match[1];
  }

  const countryName = COUNTRY_NAME_MAP[countryCode] ?? 'International / Unspecified';

  // 5. Country Postal Format Validation
  let postalOk = false;
  if (countryCode === 'US') postalOk = /^\d{5}(?:-\d{4})?$/.test(postalCode);
  else if (countryCode === 'GB') postalOk = /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/.test(postalCode);
  else if (countryCode === 'NL') postalOk = /^\d{4}\s?[A-Z]{2}$/.test(postalCode);
  else if (countryCode === 'IE') postalOk = /^[AC-FHKNPRTV-Y]\d{2}\s?[0-9AC-FHKNPRTV-Y]{4}$/.test(postalCode);
  else if (countryCode === 'CA') postalOk = /^[ABCEGHJ-NPRSTVXY]\d[ABCEGHJ-NPRSTV-Z]\s?\d[ABCEGHJ-NPRSTV-Z]\d$/.test(postalCode);
  else if (countryCode === 'PL') postalOk = /^\d{2}-\d{3}$/.test(postalCode);
  else if (countryCode === 'SE') postalOk = /^\d{3}\s?\d{2}$/.test(postalCode);
  else if (['DE', 'FR', 'ES', 'IT'].includes(countryCode)) postalOk = /^\d{5}$/.test(postalCode);
  else if (['BD', 'AU'].includes(countryCode)) postalOk = /^\d{4}$/.test(postalCode);
  else postalOk = postalCode !== '—';

  checks.push({
    id: 'addr_postal',
    label: 'Country & Postal Code Format',
    passed: postalOk,
    detail: postalOk
      ? `Valid ${countryName} postal code (${postalCode}).`
      : countryCode === 'INTL'
      ? 'Could not confirm a recognized country postal code format.'
      : `Missing or malformed postal code for ${countryName} (found: ${postalCode}).`,
  });

  // 6. US State <-> ZIP Prefix Cross-Check (or Regional Locality Check)
  let geoCoherenceOk = true;
  let geoCoherenceDetail = `Locality segments present for ${countryName}.`;
  if (countryCode === 'US') {
    if (!usStateZipMatch) {
      geoCoherenceOk = false;
      geoCoherenceDetail = 'US address must include valid 2-letter State code + 5-digit ZIP (e.g. NY 10004).';
    } else {
      const stateAbbr = usStateZipMatch[1];
      const zip3 = Number(usStateZipMatch[2].slice(0, 3));
      const ranges = US_STATE_ZIP_RANGES[stateAbbr];
      if (!ranges) {
        geoCoherenceOk = false;
        geoCoherenceDetail = `FRAUD: Unknown US state abbreviation "${stateAbbr}".`;
      } else {
        const inRange = ranges.some(([min, max]) => zip3 >= min && zip3 <= max);
        if (!inRange) {
          geoCoherenceOk = false;
          geoCoherenceDetail = `FRAUD / MISMATCH: ZIP ${usStateZipMatch[2]} does not belong to state ${stateAbbr} (expected prefix ${ranges.map(([a, b]) => `${String(a).padStart(3, '0')}–${String(b).padStart(3, '0')}`).join(', ')}).`;
        } else {
          geoCoherenceDetail = `USPS coherence passed: ZIP ${usStateZipMatch[2]} matches state ${stateAbbr}.`;
        }
      }
    }
  } else if (commaParts.length < 2 || city === '—') {
    geoCoherenceOk = false;
    geoCoherenceDetail = 'Missing city / locality segment.';
  }

  checks.push({
    id: 'addr_geo_coherence',
    label: countryCode === 'US' ? 'US State ↔ ZIP Prefix Coherence' : 'City & Region Completeness',
    passed: geoCoherenceOk,
    detail: geoCoherenceDetail,
  });

  const hardFailures = checks.filter((c) => c.id !== 'addr_pobox' && !c.passed).length;
  const isValid = hardFailures === 0 && !isPoBox;
  const verdict: AddressValidationResult['verdict'] =
    hardFailures > 0 ? 'INVALID_OR_FRAUD' : isPoBox ? 'SUSPICIOUS' : 'REAL_FORMAT';

  return {
    isValid,
    verdict,
    countryCode,
    countryName,
    addressType,
    streetLine,
    city,
    stateOrRegion,
    postalCode,
    normalizedAddress: trimmed,
    checks,
  };
}
