export function chunkText(text, maxLength = 800, overlap = 100) {
  const chunks = [];
  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + maxLength, text.length);
    const chunk = text.slice(start, end);
    chunks.push(chunk);
    start += maxLength - overlap;
  }

  return chunks;
}
