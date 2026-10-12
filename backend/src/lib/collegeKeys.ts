/** "Sardar Patel Institute of Technology", "sardar patel institute of
 * technology." and "SardarPatel Institute-of-Technology" are the same
 * college: case, accents, spaces and punctuation don't count. Letters of any
 * script are kept, so names in Hindi etc. still compare properly. */
export function collegeNameKey(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^\p{L}\p{N}]/gu, "");
}

/** "https://www.SPIT.ac.in/about" -> "spit.ac.in". Null if it doesn't look
 * like a domain at all. */
export function collegeDomainKey(domain: string | null | undefined): string | null {
  if (!domain) return null;
  const host = domain
    .trim()
    .toLowerCase()
    .replace(/^[a-z]+:\/\//, "")
    .replace(/^www\./, "")
    .split(/[/?#:]/)[0];
  return /^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(host) ? host : null;
}
