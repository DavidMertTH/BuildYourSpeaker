import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const cssPath = path.join(root, "src", "styles.css");
const css = fs.readFileSync(cssPath, "utf8");
const lines = css.split(/\r?\n/);

const allowedOddSpacingSelectors = [
  /\.golden-layout-host \.lm_tab/,
  /\.golden-layout-host \.lm_header \.lm_tab \.lm_close_tab/,
  /::after/,
  /::before/,
  /svg/,
  /path/,
];

const issues = [];
const warnings = [];

function selectorBefore(lineIndex) {
  for (let index = lineIndex; index >= 0; index -= 1) {
    const line = lines[index].trim();
    if (!line || line.startsWith("@") || line.includes("{") === false) continue;
    return line.replace(/\s*\{\s*$/, "");
  }
  return "";
}

function report(lineIndex, message) {
  issues.push(`${path.relative(root, cssPath)}:${lineIndex + 1} ${message}`);
}

function warn(lineIndex, message) {
  warnings.push(`${path.relative(root, cssPath)}:${lineIndex + 1} ${message}`);
}

lines.forEach((line, index) => {
  if (/border-radius:\s*(999px|50%)/.test(line)) {
    report(index, "Avoid pill/round border-radius values; use radius tokens or document a physical indicator exception.");
  }

  const spacingMatch = line.match(/\b(gap|min-height):\s*([^;]+);/);
  if (!spacingMatch) return;

  const selector = selectorBefore(index);
  if (allowedOddSpacingSelectors.some((pattern) => pattern.test(selector))) return;

  const values = spacingMatch[2].match(/-?\d+px/g) || [];
  values.forEach((value) => {
    const number = Math.abs(Number.parseInt(value, 10));
    if ([1, 3, 5, 7, 9, 11, 27, 29, 31].includes(number)) {
      warn(index, `Review ${spacingMatch[1]} value ${value}; prefer the spacing/control-height scale unless this is pixel alignment.`);
    }
  });
});

if (issues.length) {
  console.error(`Style audit found ${issues.length} issue${issues.length === 1 ? "" : "s"}:`);
  issues.forEach((issue) => console.error(`- ${issue}`));
  process.exit(1);
}

if (warnings.length) {
  console.warn(`Style audit passed with ${warnings.length} spacing warning${warnings.length === 1 ? "" : "s"}:`);
  warnings.slice(0, 40).forEach((warning) => console.warn(`- ${warning}`));
  if (warnings.length > 40) console.warn(`- ... ${warnings.length - 40} more spacing warnings`);
} else {
  console.log("Style audit passed.");
}
