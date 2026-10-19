// Shared by the SQL search and the client-side map index so both fold the
// same Latin accents. `translate` maps one character to one character, which
// is why the pairs stay single-letter.
const ACCENT_PAIRS = [
  ['á', 'a'],
  ['à', 'a'],
  ['ä', 'a'],
  ['â', 'a'],
  ['ã', 'a'],
  ['å', 'a'],
  ['ā', 'a'],
  ['ă', 'a'],
  ['ą', 'a'],
  ['ç', 'c'],
  ['ć', 'c'],
  ['č', 'c'],
  ['ď', 'd'],
  ['đ', 'd'],
  ['é', 'e'],
  ['è', 'e'],
  ['ë', 'e'],
  ['ê', 'e'],
  ['ē', 'e'],
  ['ĕ', 'e'],
  ['ė', 'e'],
  ['ę', 'e'],
  ['ě', 'e'],
  ['ğ', 'g'],
  ['í', 'i'],
  ['ì', 'i'],
  ['ï', 'i'],
  ['î', 'i'],
  ['ī', 'i'],
  ['ĭ', 'i'],
  ['į', 'i'],
  ['ł', 'l'],
  ['ñ', 'n'],
  ['ń', 'n'],
  ['ň', 'n'],
  ['ó', 'o'],
  ['ò', 'o'],
  ['ö', 'o'],
  ['ô', 'o'],
  ['õ', 'o'],
  ['ø', 'o'],
  ['ō', 'o'],
  ['ŏ', 'o'],
  ['ő', 'o'],
  ['ŕ', 'r'],
  ['ř', 'r'],
  ['ś', 's'],
  ['š', 's'],
  ['ş', 's'],
  ['ť', 't'],
  ['ţ', 't'],
  ['ú', 'u'],
  ['ù', 'u'],
  ['ü', 'u'],
  ['û', 'u'],
  ['ū', 'u'],
  ['ŭ', 'u'],
  ['ů', 'u'],
  ['ű', 'u'],
  ['ų', 'u'],
  ['ý', 'y'],
  ['ÿ', 'y'],
  ['ź', 'z'],
  ['ż', 'z'],
  ['ž', 'z'],
] as const;

export const SEARCH_ACCENTED = ACCENT_PAIRS.map(([accented]) => accented).join('');
export const SEARCH_PLAIN = ACCENT_PAIRS.map(([, plain]) => plain).join('');

const ACCENT_MAP = new Map<string, string>();
for (const [accented, plain] of ACCENT_PAIRS) {
  ACCENT_MAP.set(accented, plain);
}

const ACCENT_REGEX = new RegExp(`[${SEARCH_ACCENTED}]`, 'g');

export function normalizeWarehouseSearch(value: string): string {
  return value
    .toLowerCase()
    .replace(ACCENT_REGEX, (character) => ACCENT_MAP.get(character) ?? character);
}
