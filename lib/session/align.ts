/** Case-insensitive company name comparison for session/profile alignment. */
export function companyNamesMatch(
  a: string | null | undefined,
  b: string | null | undefined,
): boolean {
  return (a?.trim().toLowerCase() ?? "") === (b?.trim().toLowerCase() ?? "");
}

export function contextsEqual(
  a: { whoWeAre: string; culture: string; profilesWeHire: string; tone: string } | null | undefined,
  b: { whoWeAre: string; culture: string; profilesWeHire: string; tone: string } | null | undefined,
): boolean {
  if (!a || !b) return false;
  return JSON.stringify(a) === JSON.stringify(b);
}
