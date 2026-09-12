/**
 * Helper function normalizing a string into a URL-safe slug
 * - Converts to lowercase
 * - Strips Vietnamese accents/diacritics
 * - Replaces whitespace and special characters with hyphens '-'
 * - Trims leading/trailing hyphens
 * Example: "Sea Animals" -> "sea-animals", "Ice cream" -> "ice-cream"
 */
export function slugify(text) {
  if (!text) return 'general';
  
  return String(text)
    .normalize('NFD') // Decompose diacritics
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritical marks
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric characters with '-'
    .replace(/^-+|-+$/g, '') // Strip leading and trailing hyphens
    || 'general';
}
