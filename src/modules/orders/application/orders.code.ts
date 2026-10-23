export const ORDER_CODE_PREFIX = 'PED';
export const ORDER_CODE_SUFFIX_LENGTH = 8;
export const ORDER_CODE_UNIQUE_CONSTRAINT = 'order_code_unique';
export const ORDER_CODE_TIME_ZONE = 'America/Mexico_City';
export const ORDER_CODE_REGEX = /^PED-\d{8}-[0-9A-HJKMNP-TV-Z]{8}$/;

const businessDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: ORDER_CODE_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

function datePart(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes): string {
  return parts.find((part) => part.type === type)?.value ?? '';
}

/** YYYYMMDD in the business time zone, so the code's day matches the local day. */
export function businessDate(date: Date): string {
  const parts = businessDateFormatter.formatToParts(date);

  return `${datePart(parts, 'year')}${datePart(parts, 'month')}${datePart(parts, 'day')}`;
}

export function buildOrderCode(date: Date, suffix: string): string {
  return `${ORDER_CODE_PREFIX}-${businessDate(date)}-${suffix}`;
}
