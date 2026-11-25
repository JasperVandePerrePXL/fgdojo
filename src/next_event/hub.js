// Finds the current tournament through the public hub link.
// https://start.gg/RBHubFGDojo redirects to the page of the current Fighting Game Dojo
// tournament, so the slug can be read from the redirect target without an API key.

export const HUB_URL = 'https://start.gg/RBHubFGDojo';

/**
 * @param {string} value Any text containing a start.gg tournament URL.
 * @returns {string|null} The tournament slug, or null when there is none.
 */
export function extractTournamentSlug(value) {
  const match = String(value ?? '').match(/start\.gg\/tournament\/([a-zA-Z0-9-]+)/i);
  return match ? match[1] : null;
}

/**
 * Follows the hub link and returns the slug of the tournament it points to.
 * Falls back to the page's canonical `<link>` when the final URL has no slug.
 * @returns {Promise<string|null>}
 */
export async function findSlugFromHub() {
  const response = await fetch(HUB_URL, {
    redirect: 'follow',
    headers: { 'user-agent': 'Mozilla/5.0 (compatible; fgdojo-next-event/1.0)' },
  });

  const fromUrl = extractTournamentSlug(response.url);
  if (fromUrl) return fromUrl;

  const html = await response.text();
  const canonicalTag = html.match(/<link[^>]+rel=["']canonical["'][^>]*>/i)?.[0] ?? '';
  const href = canonicalTag.match(/href=["']([^"']+)["']/i)?.[1];
  return extractTournamentSlug(href);
}
