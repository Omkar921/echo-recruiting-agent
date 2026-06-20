/** Prepare agent text for browser TTS — conversational, not read-aloud. */
export function prepareTextForSpeech(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/—/g, ", ")
    .replace(/–/g, ", ")
    .replace(/\s*[-•]\s+/g, ". ")
    .replace(/\n+/g, ". ")
    .replace(/\s{2,}/g, " ")
    .replace(/\.{2,}/g, ".")
    .trim();
}

/** Split into phrase-sized chunks so TTS pauses like a person, not one long read. */
export function chunkTextForSpeech(text: string): string[] {
  const prepared = prepareTextForSpeech(text);
  if (!prepared) return [];

  const sentences = prepared.match(/[^.!?]+[.!?]?/g) ?? [prepared];
  const chunks: string[] = [];

  for (const raw of sentences) {
    const sentence = raw.trim();
    if (!sentence) continue;

    if (sentence.length <= 72) {
      chunks.push(sentence);
      continue;
    }

    const clauses = sentence.split(/,\s+/);
    let buffer = "";
    for (const clause of clauses) {
      const next = buffer ? `${buffer}, ${clause}` : clause;
      if (next.length > 64 && buffer) {
        chunks.push(buffer.endsWith(".") ? buffer : `${buffer}.`);
        buffer = clause;
      } else {
        buffer = next;
      }
    }
    if (buffer) chunks.push(buffer.endsWith(".") ? buffer : `${buffer}.`);
  }

  return chunks.filter(Boolean);
}

/** Narrow rate jitter so consecutive phrases don't sound robotic. */
export function phraseRate(baseRate: number, index: number): number {
  const drift = index % 3 === 0 ? -0.015 : index % 3 === 1 ? 0.01 : 0;
  return Math.min(Math.max(baseRate + drift, 0.92), 1.04);
}
