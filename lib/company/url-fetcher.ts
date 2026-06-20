/** Fetch a public company page and extract readable text for Claude. */

/** Only read the first chunk — enough for hero + meta, avoids huge page errors. */
const READ_BYTES = 350_000;
const FETCH_TIMEOUT_MS = 15_000;

function normalizeUrl(input: string): string {
  let url = input.trim();
  if (!url) throw new Error("Please enter a company URL.");
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
  return url;
}

function isBlockedHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".localhost")) return true;
  if (host === "127.0.0.1" || host.startsWith("127.")) return true;
  if (host.startsWith("10.")) return true;
  if (host.startsWith("192.168.")) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(host)) return true;
  if (host === "[::1]" || host === "::1") return true;
  return false;
}

async function readPartialBody(body: ReadableStream<Uint8Array>): Promise<string> {
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  try {
    while (total < READ_BYTES) {
      const { done, value } = await reader.read();
      if (done || !value) break;

      const remaining = READ_BYTES - total;
      if (value.byteLength <= remaining) {
        chunks.push(value);
        total += value.byteLength;
      } else {
        chunks.push(value.slice(0, remaining));
        total += remaining;
        break;
      }
    }
  } finally {
    await reader.cancel().catch(() => undefined);
  }

  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return new TextDecoder("utf-8", { fatal: false }).decode(merged);
}

function extractMeta(html: string): string {
  const parts: string[] = [];

  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  if (title) parts.push(`Title: ${title.replace(/\s+/g, " ").trim()}`);

  const metaDesc = html.match(
    /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i,
  )?.[1];
  if (metaDesc) parts.push(`Description: ${metaDesc.trim()}`);

  const ogDesc = html.match(
    /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i,
  )?.[1];
  if (ogDesc) parts.push(`About: ${ogDesc.trim()}`);

  const ogTitle = html.match(
    /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i,
  )?.[1];
  if (ogTitle) parts.push(`Headline: ${ogTitle.trim()}`);

  return parts.join("\n");
}

function htmlToText(html: string): string {
  const meta = extractMeta(html);

  const body =
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/&#39;/gi, "'")
      .replace(/&quot;/gi, '"')
      .replace(/\s+/g, " ")
      .trim();

  const combined = [meta, body].filter(Boolean).join("\n\n");
  return combined.slice(0, 14_000);
}

export async function fetchCompanyPageText(rawUrl: string): Promise<{
  url: string;
  text: string;
}> {
  const url = normalizeUrl(rawUrl);
  const parsed = new URL(url);

  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("Only http and https URLs are supported.");
  }
  if (isBlockedHost(parsed.hostname)) {
    throw new Error("That URL is not allowed.");
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; EchoCompanyLookup/1.0; recruiting preview)",
        Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
      redirect: "follow",
    });

    if (!res.ok) {
      throw new Error(`Could not fetch that page (${res.status}). Try the homepage URL.`);
    }

    const contentType = res.headers.get("content-type") ?? "";
    if (
      !contentType.includes("text/html") &&
      !contentType.includes("text/plain") &&
      !contentType.includes("application/xhtml")
    ) {
      throw new Error("That URL did not return a readable web page.");
    }

    if (!res.body) {
      throw new Error("Empty response from that URL.");
    }

    const html = await readPartialBody(res.body);
    const text = htmlToText(html);

    if (text.length < 80) {
      throw new Error(
        "Could not extract enough text from that page. Try the homepage (e.g. stripe.com) or fill in manually.",
      );
    }

    return { url: parsed.origin + parsed.pathname, text };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("Request timed out. Try again or paste details manually.");
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}
