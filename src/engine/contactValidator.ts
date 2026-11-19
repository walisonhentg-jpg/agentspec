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
  normalizedEmail: string;
  localPart: string;
  domain: string;
  checks: ContactRuleCheck[];
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

  // Strip spaces, dashes, parentheses, dots
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

  // Match country dial code (longest prefix first)
  let matchedRule: CountryPhoneRule | null = null;
  let nationalDigits = digitsOnly;

  if (hasPlus || digitsOnly.startsWith('353') || digitsOnly.startsWith('44') || digitsOnly.startsWith('49') || digitsOnly.startsWith('33') || digitsOnly.startsWith('34') || digitsOnly.startsWith('39') || digitsOnly.startsWith('31') || digitsOnly.startsWith('48') || digitsOnly.startsWith('46') || (digitsOnly.startsWith('1') && digitsOnly.length === 11)) {
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
    // Local US 10-digit format (XXX) XXX-XXXX
    matchedRule = COUNTRY_RULES[0];
    nationalDigits = digitsOnly;
  } else if (digitsOnly.startsWith('07') && digitsOnly.length === 11) {
    // Local UK mobile 07xxx xxxxxx
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
]);

export function validateGmailAddress(rawInput: string): GmailValidationResult {
  const email = rawInput.trim().toLowerCase();
  const checks: ContactRuleCheck[] = [];

  if (!email) {
    return {
      isValid: false,
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
    passed: hasSingleAt && !/\s/.test(email),
    detail: hasSingleAt ? 'Valid single @ separator with no whitespace.' : 'Missing @ separator or contains spaces.',
  });

  const isGmailDomain = domain === 'gmail.com' || domain === 'googlemail.com';
  const isTypoDomain = COMMON_GMAIL_TYPOS.has(domain);
  checks.push({
    id: 'gmail_domain',
    label: 'Official Gmail Domain Check',
    passed: isGmailDomain,
    detail: isGmailDomain
      ? `Verified official domain (${domain}).`
      : isTypoDomain
      ? `Detected common Gmail typo domain "${domain}" (did you mean gmail.com?).`
      : `Domain "${domain}" is not gmail.com.`,
  });

  const plusParts = localPart.split('+');
  const baseLocal = plusParts[0] ?? '';
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

  const canonical = `${baseLocal.replace(/\./g, '')}@gmail.com`;
  const isValid = checks.every((c) => c.passed);

  return {
    isValid,
    normalizedEmail: isValid ? canonical : email,
    localPart,
    domain,
    checks,
  };
}
