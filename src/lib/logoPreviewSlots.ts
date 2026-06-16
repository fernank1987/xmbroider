import type { Placement } from "./logoPreview";
import {
  GARMENT_PLACEMENT_PRESETS,
  getGarmentPlacementPreset,
} from "./previewCalibration";
import {
  getDefaultLogoWidthForPlacement,
  estimateLogoHeightMm,
  mmToInches,
} from "./logoSize";
import type { QuoteLogoPlacement } from "./firebase/quoteRepository";

export type PreviewLogoSlot = {
  id: "logo1" | "logo2";
  label: string;
  enabled: boolean;
  artworkFile: File | null;
  placement: Placement;
  positionX: number;
  positionY: number;
  widthMm: number;
  sizePresetLabel: string;
  aspectRatio: number | null;
};

export function createLogoSlot(
  id: PreviewLogoSlot["id"],
  placement: Placement,
  enabled = true,
): PreviewLogoSlot {
  const preset = getGarmentPlacementPreset(placement);
  const defaultSize = getDefaultLogoWidthForPlacement(placement);
  return {
    id,
    label: id === "logo1" ? "Logo 1" : "Logo 2",
    enabled,
    artworkFile: null,
    placement,
    positionX: preset.x,
    positionY: preset.y,
    widthMm: defaultSize.widthMm,
    sizePresetLabel: defaultSize.label,
    aspectRatio: null,
  };
}

export function createInitialLogoSlots(): PreviewLogoSlot[] {
  return [
    createLogoSlot("logo1", "left_chest", true),
    createLogoSlot("logo2", "right_chest", false),
  ];
}

export function applyPlacementToSlot(
  slot: PreviewLogoSlot,
  placement: Placement,
): PreviewLogoSlot {
  const preset = getGarmentPlacementPreset(placement);
  const defaultSize = getDefaultLogoWidthForPlacement(placement);
  return {
    ...slot,
    placement,
    positionX: preset.x,
    positionY: preset.y,
    widthMm: defaultSize.widthMm,
    sizePresetLabel: defaultSize.label,
  };
}

export function getEnabledLogoSlots(slots: PreviewLogoSlot[]): PreviewLogoSlot[] {
  return slots.filter((slot) => slot.enabled);
}

export function toQuoteLogoPlacement(
  slot: PreviewLogoSlot,
  artworkUrl: string,
  artworkStoragePath: string,
): QuoteLogoPlacement {
  return {
    label: slot.label,
    artworkUrl,
    artworkStoragePath,
    placement: slot.placement,
    logoWidthMm: slot.widthMm,
    logoWidthInches: mmToInches(slot.widthMm),
    estimatedLogoHeightMm: estimateLogoHeightMm(slot.widthMm, slot.aspectRatio),
    positionPercentX: slot.positionX,
    positionPercentY: slot.positionY,
    sizePresetLabel: slot.sizePresetLabel,
  };
}

export const DEFAULT_LOGO1_PLACEMENT = GARMENT_PLACEMENT_PRESETS.left_chest;
