/**
 * Turns free-form pasted text -- a multi-line, comma/parenthesis-heavy tech
 * stack list, the kind job descriptions are often formatted with -- into
 * short, atomic skill names.
 *
 * Plain `text.split(",")` (the old behaviour) breaks on input like
 * "AWS (EC2, S3, RDS), Azure / GCP (bonus)": it doesn't know the commas
 * inside the parentheses aren't item separators, so it produces fragments
 * like "AWS (EC2" and "RDS)". This instead:
 *  - only splits on a comma or newline when it's not inside parentheses
 *  - expands "Name (a, b, c)" into "Name a", "Name b", "Name c"
 *  - drops a non-list parenthetical annotation like "(bonus)"
 *  - splits "A / B / C" into separate items, but leaves a tight compound
 *    like "CI/CD" or "OS/Web" (no spaces around the slash) alone
 */
export function parseSkillInput(raw: string): string[] {
  const items = splitTopLevel(raw.replace(/\r\n/g, "\n"), [",", "\n"]);
  const out: string[] = [];
  for (const item of items) {
    const trimmed = item.trim();
    if (!trimmed) continue;
    out.push(...expandParenGroup(trimmed));
  }
  return out.flatMap(splitSpacedSlash).map((s) => s.trim()).filter(Boolean);
}

/** Splits `text` on any character in `seps`, but never while inside ( ). */
function splitTopLevel(text: string, seps: string[]): string[] {
  const out: string[] = [];
  let depth = 0;
  let cur = "";
  for (const ch of text) {
    if (ch === "(") depth++;
    else if (ch === ")") depth = Math.max(0, depth - 1);
    if (depth === 0 && seps.includes(ch)) {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

/** "AWS (EC2, S3, RDS)" -> ["AWS EC2", "AWS S3", "AWS RDS"]. A parenthetical
 * with no comma inside is an annotation, not a list ("Azure/GCP (bonus)"),
 * so it's dropped and the outer name kept as-is. */
function expandParenGroup(item: string): string[] {
  const m = item.match(/^(.*?)\s*\(([^()]*)\)\s*(.*)$/);
  if (!m) return [item];
  const [, before, inner, after] = m;
  const trimmedBefore = before.trim();
  const trimmedAfter = after.trim();
  if (!inner.includes(",")) {
    const rest = [trimmedBefore, trimmedAfter].filter(Boolean).join(" ");
    return [rest || inner.trim()];
  }
  const subItems = inner
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return subItems.map((s) => [trimmedBefore, s, trimmedAfter].filter(Boolean).join(" "));
}

/** "Azure / GCP" -> ["Azure", "GCP"]. "CI/CD" (no spaces around the slash)
 * stays a single item, so real compound names don't get broken apart. */
function splitSpacedSlash(item: string): string[] {
  return item
    .split(/\s+\/\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}
