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
 * WhatsApp exports, mixed text, comma-separated, one-per-line, spaced
 * country codes ("+91 98111 22233"), dashes, etc.
 */
export function parseRawNumbers(raw: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];

  const push = (digits: string) => {
    const normalized = normalizePhone(digits);
    if (normalized && !seen.has(normalized)) {
      seen.add(normalized);
      out.push(normalized);
    }
  };

  // Split on anything that can't be part of a phone number (commas,
  // semicolons, letters, newlines, …). Spaces, +, -, and parentheses are
  // kept so "+91 98111 22233" stays one token instead of three short digit
  // runs — but a newline or tab still separates numbers.
  const tokens = raw.split(/[^0-9+()\- ]+/).filter((t) => /\d/.test(t));

  for (const token of tokens) {
    let rest = token;
    // Each "+…" group is one explicit international number: spaces, dashes
    // and parentheses inside it are just formatting, so the whole group is
    // one candidate ("+91 98111 22233").
    while (rest.includes("+")) {
      const m = rest.match(/\+\d[\d ()-]*/);
      if (!m) break;
      const index = m.index ?? 0;
      // Bare digit runs before this "+…" group were not consumed yet.
      for (const run of rest.slice(0, index).match(/\d{7,15}/g) ?? []) push(run);
      push(m[0].replace(/\D/g, ""));
      rest = rest.slice(index + m[0].length);
    }
    // Bare digits: whitespace still separates numbers (old behavior).
    for (const run of rest.match(/\d{7,15}/g) ?? []) push(run);
  }
  return out;
}