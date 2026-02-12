export function formatRsFromPaise(paise) {
  const n = Number(paise || 0) / 100;
  const rounded = Math.round(n);
  return rounded.toLocaleString("en-IN");
}

export function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

