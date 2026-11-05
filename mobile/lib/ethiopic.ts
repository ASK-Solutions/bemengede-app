/** Gregorian → Ethiopian calendar (used to show ኅዳር 3 next to 12 Nov, as in the prototype). */
const MONTHS = ['መስከረም', 'ጥቅምት', 'ኅዳር', 'ታኅሣሥ', 'ጥር', 'የካቲት', 'መጋቢት', 'ሚያዝያ', 'ግንቦት', 'ሰኔ', 'ሐምሌ', 'ነሐሴ', 'ጳጉሜ'];

function jdn(y: number, m: number, d: number) {
  const a = Math.floor((14 - m) / 12), Y = y + 4800 - a, M = m + 12 * a - 3;
  return d + Math.floor((153 * M + 2) / 5) + 365 * Y + Math.floor(Y / 4) - Math.floor(Y / 100) + Math.floor(Y / 400) - 32045;
}

export function toEthiopian(date: Date) {
  // Use the Addis Ababa calendar day, not the device's.
  const [y, m, d] = date.toLocaleDateString('en-CA', { timeZone: 'Africa/Addis_Ababa' }).split('-').map(Number);
  const j = jdn(y, m, d);
  const r = (j - 1723856) % 1461;
  const n = (r % 365) + 365 * Math.floor(r / 1460);
  return {
    year: 4 * Math.floor((j - 1723856) / 1461) + Math.floor(r / 365) - Math.floor(r / 1460),
    month: Math.floor(n / 30) + 1,
    day: (n % 30) + 1,
  };
}

export const ethiopicLabel = (date: Date) => {
  const e = toEthiopian(date);
  return `${MONTHS[e.month - 1]} ${e.day}`;
};
