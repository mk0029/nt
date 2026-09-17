interface CountryStrategy {
  code: string;
  localLength: number;
}

const STRATEGIES: Record<string, CountryStrategy> = {
  IN: { code: "91", localLength: 10 },
  US: { code: "1", localLength: 10 },
  UK: { code: "44", localLength: 10 },
  AE: { code: "971", localLength: 9 },
  SG: { code: "65", localLength: 8 },
  HK: { code: "852", localLength: 8 },
  DE: { code: "49", localLength: 10 },
};

export function normalizePhone(raw: string, countryHint = "IN"): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const hasPlus = trimmed.startsWith("+");
  let digits = trimmed.replace(/\D/g, "");
  if (!digits) return null;

  if (digits.startsWith("00")) digits = digits.slice(2);

  const strategy = STRATEGIES[countryHint];

  if (!hasPlus && strategy) {
    if (digits.startsWith("0")) digits = digits.slice(1);
    if (digits.length === strategy.localLength) {
      digits = strategy.code + digits;
    }
  }

  if (!/^\d{7,15}$/.test(digits)) return null;

  return `+${digits}`;
}

export function formatPhoneNumber(normalized: string): string {
  if (normalized.startsWith("+91") && normalized.length === 13) {
    const local = normalized.slice(3);
    return `+91 ${local.slice(0, 5)} ${local.slice(5)}`;
  }
  return normalized;
}

export function isValidPhone(raw: string, countryHint = "IN"): boolean {
  return normalizePhone(raw, countryHint) !== null;
}

/**
 * Scans pasted text for phone number candidates. Works with any format:
 * WhatsApp exports, mixed text, comma-separated, one-per-line, etc.
 * Finds all contiguous digit sequences of 7–15 characters, dedupes, and
 * validates each through normalizePhone.
 */
export function parseRawNumbers(raw: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];

  const matches = raw.match(/\d{7,15}/g) ?? [];
  for (const digits of matches) {
    if (seen.has(digits)) continue;
    seen.add(digits);
    const normalized = normalizePhone(digits);
    if (normalized) out.push(normalized);
  }
  return out;
}