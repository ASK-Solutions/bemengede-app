// WCAG 2.1 contrast check for the colour pairs used in web/src/styles.css and mobile/lib/theme.ts.
// Run: node scripts/contrast.mjs   (exits non-zero if any pair fails)
const lum = (hex) => {
  const [r, g, b] = hex.match(/\w\w/g).map((x) => parseInt(x, 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

const pairs = [
  // [foreground, background, minimum, where]
  ['#14211D', '#FFFFFF', 4.5, 'body text on cards'],
  ['#14211D', '#F5F6F3', 4.5, 'body text on page'],
  ['#4F5A55', '#FFFFFF', 4.5, 'muted text on cards'],
  ['#4F5A55', '#F5F6F3', 4.5, 'muted text on page'],
  ['#FFFFFF', '#1E6B57', 4.5, 'primary button'],
  ['#FFFFFF', '#14493B', 4.5, 'primary button hover'],
  ['#1E6B57', '#FFFFFF', 4.5, 'links'],
  ['#CFE3DB', '#123F34', 4.5, 'mint text on hero'],
  ['#FFFFFF', '#123F34', 4.5, 'white text on hero'],
  ['#14211D', '#F2B33D', 4.5, 'text on yellow (pill, ticker, buttons)'],
  ['#F2B33D', '#123F34', 3.0, 'yellow headline accent on hero (large text)'],
  ['#A0301C', '#FFFFFF', 4.5, 'error text'],
  ['#5C3800', '#FCEBC4', 4.5, 'warning alert'],
  ['#14493B', '#E3F0EB', 4.5, 'success alert'],
  ['#6E1F10', '#F8E1DC', 4.5, 'error alert'],
  ['#3D4742', '#D9DDD8', 4.5, 'disabled button / taken seat'],
  ['#C6D1CC', '#14211D', 4.5, 'muted text on dark section'],
  ['#F2B33D', '#14211D', 4.5, 'yellow eyebrow on dark section'],
  ['#6B7570', '#FFFFFF', 3.0, 'step numbers (large, decorative)'],
  ['#8A948F', '#FFFFFF', 3.0, 'input and checkbox borders (non-text)'],
  ['#2B5BA8', '#FFFFFF', 3.0, 'focus ring'],
];

let fail = 0;
for (const [fg, bg, min, where] of pairs) {
  const r = ratio(fg, bg);
  const ok = r >= min;
  if (!ok) fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${r.toFixed(2).padStart(5)}:1  (need ${min})  ${fg} on ${bg}  ${where}`);
}
process.exit(fail ? 1 : 0);
