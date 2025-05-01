/**
 * Normalizes a string answer for comparison.
 * - Converts to lowercase.
 * - Removes common punctuation (.,!?-').
 * - Trims leading/trailing whitespace.
 * - Replaces multiple spaces with a single space.
 * - Removes diacritics (accents).
 */
export function normalizeAnswer(answer: string): string {
  if (!answer) {
    return '';
  }

  return answer
    .toLowerCase() // Convert to lowercase
    .normalize('NFD') // Decompose accented characters
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics (accents)
    .replace(/[.,!?'"-]/g, '') // Remove common punctuation
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .trim(); // Remove leading/trailing whitespace
}
