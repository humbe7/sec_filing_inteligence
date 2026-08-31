const HTML_ENTITY_MAP: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&nbsp;': ' ',
  '&#160;': ' ',
  '&apos;': "'",
};

function decodeHtmlEntities(input: string): string {
  let output = input;

  for (const [entity, value] of Object.entries(HTML_ENTITY_MAP)) {
    output = output.split(entity).join(value);
  }

  output = output.replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
  output = output.replace(/&#x([0-9a-f]+);/gi, (_, code) =>
    String.fromCharCode(parseInt(code, 16)));

  return output;
}

export function htmlToPlainText(html: string): string {
  return normalizeText(
    decodeHtmlEntities(
      html
        .replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<!--[\s\S]*?-->/g, ' ')
        .replace(/<(?:br|hr)\s*\/?>/gi, '\n')
        .replace(/<\/(?:p|div|section|article|table|tr|li|h[1-6])>/gi, '\n')
        .replace(/<li[^>]*>/gi, '\n- ')
        .replace(/<[^>]+>/g, ' '),
    ),
  );
}

export function normalizeText(text: string): string {
  return text
    .replace(/\r/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .split('\n')
    .map(line => line.trim())
    .filter((line, index, lines) => line.length > 0 || lines[index - 1] !== '')
    .join('\n')
    .trim();
}

export function splitIntoSentences(text: string): string[] {
  return normalizeText(text)
    .split(/(?<=[.!?])\s+(?=[A-Z0-9])/)
    .map(sentence => sentence.trim())
    .filter(sentence => sentence.length >= 20);
}
