import { toBlob } from "html-to-image";

export const COMPOSITE_PREVIEW_EXPORT_ERROR = "Composite preview export failed.";

export type MockupDomCaptureResult =
  | { blob: Blob; error: null }
  | { blob: null; error: string };

/** Captures a visible mockup DOM node as PNG (WYSIWYG export of the customer preview). */
export async function captureMockupStageAsPng(
  element: HTMLElement,
): Promise<MockupDomCaptureResult> {
  try {
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });

    const blob = await toBlob(element, {
      cacheBust: true,
      pixelRatio: 2,
      type: "image/png",
      skipFonts: false,
      includeQueryParams: true,
    });

    if (!blob) {
      return { blob: null, error: COMPOSITE_PREVIEW_EXPORT_ERROR };
    }

    return { blob, error: null };
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("[mockup-dom-capture]", error);
    }

    return {
      blob: null,
      error: COMPOSITE_PREVIEW_EXPORT_ERROR,
    };
  }
}
