const TITLE_REGEX = /<title[^>]*>([\s\S]*?)<\/title>/i;

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

function decodeEntities(input: string): string {
  return input.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, body: string) => {
    if (body.startsWith("#x") || body.startsWith("#X")) {
      const code = Number.parseInt(body.slice(2), 16);
      return Number.isFinite(code) ? String.fromCodePoint(code) : match;
    }
    if (body.startsWith("#")) {
      const code = Number.parseInt(body.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : match;
    }
    return NAMED_ENTITIES[body.toLowerCase()] ?? match;
  });
}

/**
 * Extract the trimmed, entity-decoded <title> from an HTML string. Returns
 * null if there is no <title> element or its content is empty after trim.
 */
export function extractHtmlTitle(html: string): string | null {
  const match = html.match(TITLE_REGEX);
  if (!match) return null;
  const decoded = decodeEntities(match[1]).replace(/\s+/g, " ").trim();
  return decoded.length > 0 ? decoded : null;
}
