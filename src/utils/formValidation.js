/**
 * Shared form validation helpers for VoltaicOS.
 * Client-side heuristics — designed to stop keyboard-mash / gibberish input
 * and enforce sane formats. Server-side checks still apply on submit.
 */

// ─── Gibberish / nonsensical word detection ──────────────────────────────────
// Heuristics: a "word" is treated as gibberish when it:
//   • has no vowels (e.g. "bcdfghjkl")
//   • has 5+ consonants in a row (e.g. "strngths")
//   • repeats one character 3+ times in a row (e.g. "aaaaa")
//   • contains known keyboard-mash sequences (e.g. "qwer", "asdf", "zxcv")
//   • is a single very long token (> 22 chars) with no whitespace

const KEYBOARD_MASKS = /(asdf|qwer|zxcv|hjkl|ghjkl|poiuy|lkjh|mnbv|qaz|wsx|edc)/i;
const HAS_VOWEL = /[aeiou]/i;
const FIVE_CONSONANTS = /[bcdfghjklmnpqrstvwxz]{5,}/i;
const TRIPLE_REPEAT = /(.)\1{2,}/;

export function isGibberishWord(word) {
  const w = word.toLowerCase();
  if (w.length <= 2) return false; // too short to judge (e.g. "St", "Lk")
  if (!HAS_VOWEL.test(w) && w.length > 3) return true;
  if (FIVE_CONSONANTS.test(w)) return true;
  if (TRIPLE_REPEAT.test(w)) return true;
  if (KEYBOARD_MASKS.test(w)) return true;
  return false;
}

/** True when any alphabetic word in the text looks like keyboard mash. */
export function looksLikeGibberish(text) {
  if (!text) return false;
  const words = text.trim().split(/\s+/);
  return words.some((w) => /^[a-z]+$/i.test(w) && isGibberishWord(w));
}

// ─── Field validators ────────────────────────────────────────────────────────

/** Full name: letters (incl. common accents), spaces, . ' -  — at least first + last word. */
export function isValidFullName(value) {
  const v = value.trim();
  if (v.length < 3 || v.length > 60) return false;
  if (!/^[A-Za-zÀ-ÖØ-öø-ÿ][A-Za-zÀ-ÖØ-öø-ÿ\s.'-]*$/.test(v)) return false;
  if (looksLikeGibberish(v)) return false;
  const words = v.split(/\s+/).filter(Boolean);
  if (words.length < 2) return false; // expect at least first + last name
  return words.every((w) => /[A-Za-zÀ-ÖØ-öø-ÿ]/.test(w));
}

/** City: letters, spaces, . and - only. */
export function isValidCity(value) {
  const v = value.trim();
  if (v.length < 2 || v.length > 50) return false;
  if (!/^[A-Za-zÀ-ÖØ-öø-ÿ][A-Za-zÀ-ÖØ-öø-ÿ\s.-]*$/.test(v)) return false;
  return !looksLikeGibberish(v);
}

/** Street address: letters, digits, spaces and common punctuation (# / , . -). */
export function isValidAddress(value) {
  const v = value.trim();
  if (v.length < 8 || v.length > 120) return false;
  if (!/^[A-Za-zÀ-ÖØ-öø-ÿ0-9\s.,#/()-]+$/.test(v)) return false;
  if (!/[A-Za-zÀ-ÖØ-öø-ÿ]{2,}/.test(v)) return false; // must contain actual words
  // Check the alphabetic words for gibberish (digits/keywords are fine)
  const words = v.split(/\s+/).filter((w) => /^[A-Za-zÀ-ÖØ-öø-ÿ]+$/.test(w.replace(/[#/()-]/g, '')));
  return !words.some((w) => w.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ]/g, '').length > 2 && isGibberishWord(w));
}

// ─── EV Two-Wheeler / Bike & Scooter Verification (Anti-Car filter) ────────
const CAR_KEYWORDS_RE = /\b(nexon|tiago|tigor|curvv|punch\s*ev|zs\s*ev|mg\s*zs|comet|windsor|ioniq|kona|creta\s*ev|byd|atto|seal|tesla|model\s*[3ysx]|xuv\s*400|xuv400|bmw\s*i[x347]|audi\s*e-?tron|taycan|polestar|mercedes\s*eq|volvo\s*xc40|c40|kia\s*ev[69]|four\s*wheeler|4\s*wheeler|4w|car|sedan|suv|hatchback|ccs2|ccs-2|chademo)\b/i;

const TWO_WHEELER_KEYWORDS_RE = /\b(ather|ola|iqube|tvs|chetak|bajaj|vida|hero|river|indie|revolt|rv400|rv1|ultraviolette|f77|f99|tork|kratos|simple\s*one|bounce|infinity|ampere|magnus|nexus|okinawa|pure\s*ev|komaki|bgauss|matter|hop|kabira|gemopai|socket|16a|5a|3-pin|point|switch|board|universal|ac\s*charger|two\s*wheeler|2\s*wheeler|2w|bike|scooter|motorcycle)\b/i;

export const VERIFIED_2W_MODELS = [
  "Ather 450X / Apex / Rizta",
  "Ola S1 / S1 Pro / S1 Air / S1 X",
  "TVS iQube (Standard / S / ST)",
  "Bajaj Chetak (Premium / Urbane)",
  "Hero Vida V1 / V2",
  "River Indie",
  "Ultraviolette F77 / F99",
  "Revolt RV400 / RV1",
  "Simple One",
  "Ampere Magnus / Nexus",
  "Bounce Infinity E1",
  "Okinawa Okhi-90 / Praise",
  "Universal 16A/5A EV Two-Wheeler Socket",
];

/** True if the text contains any car, 4-wheeler, or car-only charger reference. */
export function containsCarReference(text) {
  if (!text) return false;
  return CAR_KEYWORDS_RE.test(String(text));
}

/** Check if the brand / charger name is valid for a 2-wheeler or household socket */
export function isTwoWheelerChargerOrSocket(text) {
  if (!text) return false;
  if (containsCarReference(text)) return false;
  return TWO_WHEELER_KEYWORDS_RE.test(String(text));
}

/** Charger brand/model: must be for an EV 2-wheeler or household socket, no cars. */
export function isValidBrand(value) {
  const v = value.trim();
  if (v.length < 2 || v.length > 60) return false;
  if (!/^[A-Za-zÀ-ÖØ-öø-ÿ0-9\s.&/()-]+$/.test(v)) return false;
  if (looksLikeGibberish(v)) return false;
  if (containsCarReference(v)) return false;
  return true;
}

/** Charger description: if provided, needs real words, enough length, and no car references. */
export function isValidDescription(value) {
  const v = value.trim();
  if (v.length < 10 || v.length > 300) return false;
  if (looksLikeGibberish(v)) return false;
  if (containsCarReference(v)) return false;
  return true;
}

/**
 * Email: pragmatic format + gibberish/fake-domain check.
 * Accepts all real providers — gmail.com, yahoo.com, ymail.com, outlook.com,
 * hotmail.com, icloud.com, rediffmail.com, company domains, etc.
 *
 * Also rejects:
 *   • keyboard-mash local parts (sdfghjkl@…, qwerty@…)
 *   • local parts with no vowels and no digits (pure consonant strings)
 *   • keyboard-mash domain labels (ghjk.com, asdf.net)
 *   • single-character domain labels (x.com is fine; x is the label before TLD
 *     and would only have 1 char — blocked)
 */
export function isValidEmail(value) {
  const v = value.trim().toLowerCase();
  if (v.length < 5 || v.length > 80) return false;
  if (!/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/.test(v)) return false;

  const [local, domain] = v.split('@');

  // ── Local part sanity ──────────────────────────────────────────────────────
  if (local.startsWith('.') || local.endsWith('.') || local.includes('..')) return false;

  // Strip dots/underscores/dashes/digits to get the alphabetic core of the local part
  const localAlpha = local.replace(/[^a-z]/g, '');
  if (localAlpha.length > 3) {
    // Reject if it has no vowels (pure consonant mash like "sdfghjkl")
    if (!/[aeiou]/.test(localAlpha)) return false;
    // Reject keyboard-mash sequences
    if (KEYBOARD_MASKS.test(localAlpha)) return false;
    // Reject 5+ consecutive consonants
    if (FIVE_CONSONANTS.test(localAlpha)) return false;
    // Reject triple-repeat characters (aaaa, bbbb)
    if (TRIPLE_REPEAT.test(localAlpha)) return false;
  }

  // ── Domain sanity ─────────────────────────────────────────────────────────
  if (domain.startsWith('-') || domain.includes('..') || domain.includes('-.') || domain.includes('.-')) return false;

  const tld = domain.slice(domain.lastIndexOf('.') + 1);
  if (!/^[a-z]{2,24}$/.test(tld)) return false;

  // Check each domain label (the parts between dots) for gibberish
  const domainWithoutTld = domain.slice(0, domain.lastIndexOf('.'));
  const domainLabels = domainWithoutTld.split('.');
  for (const label of domainLabels) {
    if (label.length < 2) return false; // e.g. "a.com" — label too short
    const labelAlpha = label.replace(/[^a-z]/g, '');
    if (labelAlpha.length > 2) {
      if (!/[aeiou]/.test(labelAlpha)) return false;   // ghjk, bcdf — no vowels
      if (KEYBOARD_MASKS.test(labelAlpha)) return false;
      if (FIVE_CONSONANTS.test(labelAlpha)) return false;
    }
  }

  return true;
}

/** Indian mobile numbers: 10 digits, must start with 6, 7, 8 or 9. */
export const INDIAN_MOBILE_RE = /^[6-9]\d{9}$/;

/** Keep digits only, max 10. */
export function normalizePhoneInput(raw) {
  return String(raw).replace(/\D/g, '').slice(0, 10);
}

/** PIN code: exactly 6 digits, first digit not 0. */
export const PINCODE_RE = /^[1-9]\d{5}$/;

export function normalizePincodeInput(raw) {
  return String(raw).replace(/\D/g, '').slice(0, 6);
}

/** Strip everything except digits/letters (for ID numbers which vary by type). */
export function normalizeIdInput(raw) {
  return String(raw).toUpperCase().replace(/[^A-Z0-9]/g, '');
}

// ─── ID number validation, per Government ID type ────────────────────────────
export const ID_RULES = {
  'Aadhaar Card':    { maxLength: 12, inputMode: 'numeric', placeholder: '12-digit Aadhaar number', pattern: /^\d{12}$/, label: '12 digits' },
  'PAN Card':        { maxLength: 10, inputMode: 'text',    placeholder: 'e.g. ABCPM1234E',          pattern: /^[A-Z]{5}\d{4}[A-Z]$/, label: 'format ABCDE1234F' },
  'Driving Licence': { maxLength: 16, inputMode: 'text',    placeholder: 'e.g. MH02 20190012345',    pattern: /^[A-Z0-9]{8,16}$/, label: '8–16 letters/digits' },
  'Passport':        { maxLength: 8,  inputMode: 'text',    placeholder: 'e.g. A1234567',            pattern: /^[A-Z]\d{7}$/, label: 'letter + 7 digits' },
  'Voter ID':        { maxLength: 10, inputMode: 'text',    placeholder: 'e.g. ABC1234567',          pattern: /^[A-Z]{3}\d{7}$/, label: '3 letters + 7 digits' },
};

export function validateIdNumber(idType, value) {
  const rule = ID_RULES[idType];
  if (!rule) return true; // no rule selected yet — handled by idType check
  const v = String(value).toUpperCase().replace(/\s/g, '');
  return rule.pattern.test(v);
}

// ─── Time helpers for the availability picker ────────────────────────────────

/** Build 12-hour, friendly time options in 30-minute steps. */
export function generateTimeOptions() {
  const options = [];
  for (let h = 0; h < 24; h += 1) {
    for (const m of [0, 30]) {
      const value = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      const period = h < 12 ? 'AM' : 'PM';
      const hour12 = h % 12 === 0 ? 12 : h % 12;
      const label = `${hour12}:${String(m).padStart(2, '0')} ${period}`;
      options.push({ value, label });
    }
  }
  return options;
}

/** "18:30" -> "6:30 PM". Falls back to input if unparseable. */
export function formatTime12h(hhmm) {
  if (!hhmm || !/^\d{2}:\d{2}$/.test(hhmm)) return hhmm || '—';
  const [h, m] = hhmm.split(':').map(Number);
  const period = h < 12 ? 'AM' : 'PM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
}

/** 0–100% position of a time on a 24h scale. */
export function timeToPercent(hhmm) {
  if (!hhmm || !/^\d{2}:\d{2}$/.test(hhmm)) return 0;
  const [h, m] = hhmm.split(':').map(Number);
  return ((h * 60 + m) / 1440) * 100;
}
