const OPTIONAL_SUFFIXES = [
  / county$/i,
  / parish$/i,
  / borough$/i,
  / census area$/i,
  / municipality$/i,
  / planning region$/i,
];

function baseNormalize(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

export function countyNameVariants(value: string): string[] {
  const normalized = baseNormalize(value);
  const variants = new Set<string>([normalized]);
  for (const suffix of OPTIONAL_SUFFIXES) {
    if (suffix.test(normalized)) {
      variants.add(normalized.replace(suffix, ""));
    }
  }
  return [...variants].filter(Boolean);
}

export function countyNamesMatch(left: string, right: string): boolean {
  const leftVariants = countyNameVariants(left);
  const rightVariants = new Set(countyNameVariants(right));
  return leftVariants.some((variant) => rightVariants.has(variant));
}
