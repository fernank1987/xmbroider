/** Helpers for product spec form fields in admin. */

export function parseCommaSeparatedList(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function formatCommaSeparatedList(items: string[] | null | undefined): string {
  return items?.join(", ") ?? "";
}

export function parseFeaturesTextarea(value: string): string[] {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export function formatFeaturesTextarea(items: string[] | null | undefined): string {
  return items?.join("\n") ?? "";
}

export function normalizeOptionalHex(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export const ST550_SPEC_DEFAULTS = {
  material: "100% polyester interlock",
  fabricWeight: "3.8 oz",
  fit: "Adult unisex",
  decorationMethods: ["Embroidery", "DTF Heat Press"],
  features: [
    "PosiCharge technology",
    "Flat knit collar",
    "Removable tag",
    "Taped neck",
    "3-button placket with dyed-to-match buttons",
    "Set-in open hem sleeves",
  ],
  careInstructions: "",
} as const;

export function isSt550StyleCode(styleCode: string | null | undefined): boolean {
  return styleCode?.trim().toUpperCase() === "ST550";
}
