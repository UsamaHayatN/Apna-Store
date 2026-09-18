/**
 * Variant Utilities (Isomorphic: Safe for both Client and Server)
 */

/**
 * Builds a deterministic, alphabetical combination string
 * e.g. { size: "41", color: "black" } => "color:black|size:41"
 */
export function buildCombinationHash(attributes: Record<string, string>): string {
  const keys = Object.keys(attributes).sort((a, b) => a.localeCompare(b));
  return keys
    .map((k) => `${k.toLowerCase().trim()}:${String(attributes[k]).toLowerCase().trim()}`)
    .join("|");
}

/**
 * Normalizes SKU to uppercase, trimmed, hyphen-separated string
 */
export function normalizeSku(sku: string): string {
  return sku.trim().toUpperCase().replace(/\s+/g, "-");
}

/**
 * Helper to get effective price: variant priceOverride if set, otherwise product basePrice
 */
export function getEffectiveVariantPrice(
  priceOverride: number | null | undefined,
  productBasePrice: number
): number {
  if (priceOverride !== null && priceOverride !== undefined && !isNaN(Number(priceOverride))) {
    return Number(priceOverride);
  }
  return productBasePrice;
}
