export function stripTags(input: string): string {
  return input
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&#160;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function parseDollar(value: string): number {
  return parseInt(value.replace(/[\$,\s]/g, ""), 10) || 0;
}

export function tableRows(html: string): string[] {
  return [...html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)].map((m) => m[1]);
}

export function parseCells(rowHtml: string, tag: "td" | "th" | "both" = "both"): string[] {
  const pattern = tag === "td"
    ? /<td[^>]*>([\s\S]*?)<\/td>/gi
    : tag === "th"
      ? /<th[^>]*>([\s\S]*?)<\/th>/gi
      : /<(?:td|th)[^>]*>([\s\S]*?)<\/(?:td|th)>/gi;

  return [...rowHtml.matchAll(pattern)].map((m) => stripTags(m[1]));
}

export function findFirstMatch(html: string, regex: RegExp): string | null {
  const match = html.match(regex);
  return match ? match[1] ?? match[0] : null;
}
