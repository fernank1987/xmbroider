const LOG_PREFIX = "[mockup-capture-images]";

function log(message: string, details?: Record<string, unknown>): void {
  if (process.env.NODE_ENV !== "development") {
    return;
  }
  if (details) {
    console.log(LOG_PREFIX, message, details);
  } else {
    console.log(LOG_PREFIX, message);
  }
}

export function flushAnimationFrames(count = 2): Promise<void> {
  return new Promise((resolve) => {
    let remaining = count;
    const step = () => {
      remaining -= 1;
      if (remaining <= 0) {
        resolve();
        return;
      }
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
}

function waitForImageElement(img: HTMLImageElement, timeoutMs: number): Promise<void> {
  if (img.complete && img.naturalWidth > 0) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      reject(new Error(`Image load timeout (${img.alt || "preview image"}).`));
    }, timeoutMs);

    const cleanup = () => {
      window.clearTimeout(timer);
      img.removeEventListener("load", onLoad);
      img.removeEventListener("error", onError);
    };

    const onLoad = () => {
      cleanup();
      if (img.naturalWidth > 0) {
        resolve();
        return;
      }
      reject(new Error(`Image loaded with zero size (${img.alt || "preview image"}).`));
    };

    const onError = () => {
      cleanup();
      reject(new Error(`Image failed to load (${img.alt || "preview image"}).`));
    };

    img.addEventListener("load", onLoad, { once: true });
    img.addEventListener("error", onError, { once: true });
  });
}

/** Waits until all images inside the capture stage are decoded. */
export async function waitForStageImages(
  element: HTMLElement,
  timeoutMs = 8000,
): Promise<void> {
  const images = Array.from(element.querySelectorAll("img"));
  log("waiting for stage images", { imageCount: images.length });
  if (images.length === 0) {
    return;
  }
  await Promise.all(images.map((img) => waitForImageElement(img, timeoutMs)));
}

async function blobUrlToDataUrl(blobUrl: string): Promise<string> {
  const response = await fetch(blobUrl);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }
      reject(new Error("Unable to read blob image."));
    };
    reader.onerror = () => reject(new Error("Unable to read blob image."));
    reader.readAsDataURL(blob);
  });
}

async function sourceUrlToDataUrl(url: string): Promise<string> {
  if (url.startsWith("data:")) {
    return url;
  }

  if (url.startsWith("blob:")) {
    return blobUrlToDataUrl(url);
  }

  const response = await fetch(
    `/api/preview-image-data?url=${encodeURIComponent(url)}`,
  );
  if (!response.ok) {
    throw new Error(`Image proxy failed (${response.status}).`);
  }

  const body = (await response.json()) as { dataUrl?: unknown };
  if (typeof body.dataUrl !== "string" || !body.dataUrl.startsWith("data:")) {
    throw new Error("Image proxy returned invalid data.");
  }

  return body.dataUrl;
}

/** Temporarily replaces image sources with data URLs so html-to-image can embed them. */
export async function inlineStageImagesForCapture(
  element: HTMLElement,
): Promise<() => void> {
  const images = Array.from(element.querySelectorAll("img"));
  const restores: Array<() => void> = [];

  log("inlining images start", { imageCount: images.length });

  for (const img of images) {
    const originalSrc = img.currentSrc || img.src;
    if (!originalSrc || originalSrc.startsWith("data:")) {
      continue;
    }

    try {
      const dataUrl = await sourceUrlToDataUrl(originalSrc);
      img.src = dataUrl;
      img.removeAttribute("srcset");
      img.crossOrigin = "anonymous";
      restores.push(() => {
        img.src = originalSrc;
      });
      log("inlined image", {
        alt: img.alt || "(image)",
        originalScheme: originalSrc.split(":")[0] ?? "unknown",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Image inline failed.";
      log("inline failed", { alt: img.alt || "(image)", message });
      throw new Error(message);
    }
  }

  return () => {
    for (const restore of restores.reverse()) {
      restore();
    }
    log("restored original image sources");
  };
}

export function getStageDimensions(element: HTMLElement): {
  width: number;
  height: number;
} {
  const rect = element.getBoundingClientRect();
  return {
    width: Math.round(rect.width),
    height: Math.round(rect.height),
  };
}

export function isStageVisible(element: HTMLElement): boolean {
  const { width, height } = getStageDimensions(element);
  return width >= 20 && height >= 20;
}

export { sourceUrlToDataUrl };
