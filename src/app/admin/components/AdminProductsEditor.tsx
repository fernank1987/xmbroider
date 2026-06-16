"use client";

import { useEffect, useMemo, useState } from "react";
import {
  createProduct,
  deleteProduct,
  listProducts,
  parseSizesFromForm,
  updateProduct,
  type Product,
  type ProductColor,
} from "@/lib/firebase/productRepository";
import {
  DEFAULT_APPAREL_CALIBRATION,
  calibrationBoundsToPercents,
  calibrationFromPercents,
  type PreviewCalibration,
} from "@/lib/previewCalibration";
import {
  deleteProductImage,
  uploadProductImage,
  validateQuoteArtworkFile,
} from "@/lib/firebase/storageRepository";
import {
  filterProductsByBrand,
  formatProductDisplayName,
  generateProductSlug,
  getProductBrands,
  groupProductsByBrand,
  slugifyBrand,
} from "@/lib/productSlugs";
import { siteContent } from "@/lib/siteContent";
import {
  adminBodyText,
  adminButtonDisabled,
  adminCard,
  adminGalleryThumb,
  adminInput,
  adminLabel,
  adminNotice,
  adminSectionTitle,
} from "../lib/adminStyles";

const SITE_ID = siteContent.siteId;

const BRAND_SUGGESTIONS = ["Sport-Tek", "Richardson", "Yupoong", "Team 365"];

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}

function sizesToFormValue(sizes: string[]): string {
  return sizes.join(", ");
}

function getColorCalibrationValues(color: ProductColor) {
  const calibration = color.previewCalibration ?? DEFAULT_APPAREL_CALIBRATION;
  const percents = calibrationBoundsToPercents(calibration.garmentBounds);
  return {
    xPercent: percents.xPercent,
    yPercent: percents.yPercent,
    widthPercent: percents.widthPercent,
    heightPercent: percents.heightPercent,
    physicalWidthMm: calibration.physicalWidthMm,
    hasCustom: color.previewCalibration !== null,
  };
}

export default function AdminProductsEditor() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [busyProductId, setBusyProductId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [styleCode, setStyleCode] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [sizes, setSizes] = useState("");
  const [isVisible, setIsVisible] = useState(true);

  const [colorName, setColorName] = useState("");
  const [colorHex, setColorHex] = useState("");
  const [activeColorProductId, setActiveColorProductId] = useState<string | null>(null);
  const [brandFilter, setBrandFilter] = useState("all");

  const brands = useMemo(() => getProductBrands(products), [products]);
  const filteredProducts = useMemo(
    () => filterProductsByBrand(products, brandFilter),
    [products, brandFilter],
  );
  const groupedProducts = useMemo(
    () => groupProductsByBrand(filteredProducts),
    [filteredProducts],
  );

  const createSlugPreview = useMemo(() => {
    const brandSlug = slugifyBrand(brand);
    const productSlug = generateProductSlug(styleCode, name);
    return `${brandSlug}/${productSlug}`;
  }, [brand, styleCode, name]);

  useEffect(() => {
    let cancelled = false;

    async function loadProducts() {
      setLoading(true);
      setErrorMessage(null);
      try {
        const items = await listProducts(SITE_ID);
        if (!cancelled) {
          setProducts(items);
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(getErrorMessage(error, "Could not load products."));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadProducts();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleCreateProduct = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCreating(true);
    setStatusMessage(null);
    setErrorMessage(null);

    try {
      const min = priceMin.trim() ? Number(priceMin) : null;
      const max = priceMax.trim() ? Number(priceMax) : null;
      const created = await createProduct(SITE_ID, {
        name,
        brand,
        styleCode: styleCode.trim() || null,
        category,
        description,
        basePriceMin: min,
        basePriceMax: max,
        sizes: parseSizesFromForm(sizes),
        isVisible,
      });
      setProducts((current) => [...current, created]);
      setName("");
      setBrand("");
      setStyleCode("");
      setCategory("");
      setDescription("");
      setPriceMin("");
      setPriceMax("");
      setSizes("");
      setIsVisible(true);
      setStatusMessage("Product created.");
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Unable to create product."));
    } finally {
      setCreating(false);
    }
  };

  const handleSaveProduct = async (product: Product) => {
    setBusyProductId(product.id);
    setStatusMessage(null);
    setErrorMessage(null);

    try {
      const updated = await updateProduct(SITE_ID, product.id, {
        name: product.name,
        brand: product.brand,
        styleCode: product.styleCode,
        category: product.category,
        description: product.description,
        basePriceMin: product.basePriceMin,
        basePriceMax: product.basePriceMax,
        sizes: product.sizes,
        isVisible: product.isVisible,
        colors: product.colors,
      });
      setProducts((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
      setStatusMessage("Product saved.");
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Unable to save product."));
    } finally {
      setBusyProductId(null);
    }
  };

  const handleToggleVisibility = async (product: Product) => {
    setBusyProductId(product.id);
    try {
      const updated = await updateProduct(SITE_ID, product.id, {
        isVisible: !product.isVisible,
      });
      setProducts((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Unable to update visibility."));
    } finally {
      setBusyProductId(null);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!window.confirm("Delete this product and its images?")) {
      return;
    }
    setBusyProductId(productId);
    try {
      await deleteProduct(SITE_ID, productId);
      setProducts((current) => current.filter((item) => item.id !== productId));
      setStatusMessage("Product deleted.");
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Unable to delete product."));
    } finally {
      setBusyProductId(null);
    }
  };

  const handleAddColor = async (product: Product) => {
    if (!colorName.trim()) {
      setErrorMessage("Color name is required.");
      return;
    }

    setBusyProductId(product.id);
    setErrorMessage(null);

    const newColor: ProductColor = {
      id: crypto.randomUUID().slice(0, 8),
      name: colorName.trim(),
      hex: colorHex.trim() || null,
      frontImageUrl: null,
      frontImageStoragePath: null,
      backImageUrl: null,
      backImageStoragePath: null,
      previewCalibration: null,
    };

    try {
      const updated = await updateProduct(SITE_ID, product.id, {
        colors: [...product.colors, newColor],
      });
      setProducts((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
      setColorName("");
      setColorHex("");
      setActiveColorProductId(null);
      setStatusMessage("Color added.");
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Unable to add color."));
    } finally {
      setBusyProductId(null);
    }
  };

  const handleColorImageUpload = async (
    product: Product,
    colorId: string,
    side: "front" | "back",
    file: File,
  ) => {
    const validationError = validateQuoteArtworkFile(file);
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    setBusyProductId(product.id);
    setErrorMessage(null);

    const color = product.colors.find((item) => item.id === colorId);
    if (!color) {
      setErrorMessage("Color not found.");
      setBusyProductId(null);
      return;
    }

    try {
      const upload = await uploadProductImage(
        SITE_ID,
        product.brandSlug,
        product.slug,
        color.name,
        side,
        file,
      );
      const colors = product.colors.map((color) => {
        if (color.id !== colorId) {
          return color;
        }

        const oldPath =
          side === "front" ? color.frontImageStoragePath : color.backImageStoragePath;
        if (oldPath) {
          void deleteProductImage(oldPath).catch(() => undefined);
        }

        if (side === "front") {
          return {
            ...color,
            frontImageUrl: upload.url,
            frontImageStoragePath: upload.path,
          };
        }
        return {
          ...color,
          backImageUrl: upload.url,
          backImageStoragePath: upload.path,
        };
      });

      const updated = await updateProduct(SITE_ID, product.id, { colors });
      setProducts((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
      setStatusMessage(`${side === "front" ? "Front" : "Back"} image uploaded.`);
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Unable to upload product image."));
    } finally {
      setBusyProductId(null);
    }
  };

  const updateColorCalibration = (
    productId: string,
    colorId: string,
    field: "xPercent" | "yPercent" | "widthPercent" | "heightPercent" | "physicalWidthMm",
    value: number,
  ) => {
    setProducts((current) =>
      current.map((product) => {
        if (product.id !== productId) {
          return product;
        }

        const colors = product.colors.map((color) => {
          if (color.id !== colorId) {
            return color;
          }

          const currentValues = getColorCalibrationValues(color);
          const nextValues = { ...currentValues, [field]: value };
          const previewCalibration: PreviewCalibration = calibrationFromPercents(
            nextValues.xPercent,
            nextValues.yPercent,
            nextValues.widthPercent,
            nextValues.heightPercent,
            nextValues.physicalWidthMm,
          );

          return { ...color, previewCalibration };
        });

        return { ...product, colors };
      }),
    );
  };

  const clearColorCalibration = (productId: string, colorId: string) => {
    setProducts((current) =>
      current.map((product) => {
        if (product.id !== productId) {
          return product;
        }
        return {
          ...product,
          colors: product.colors.map((color) =>
            color.id === colorId ? { ...color, previewCalibration: null } : color,
          ),
        };
      }),
    );
  };

  const updateProductField = (
    productId: string,
    field: "name" | "brand" | "styleCode" | "category" | "description" | "isVisible",
    value: string | boolean,
  ) => {
    setProducts((current) =>
      current.map((product) => {
        if (product.id !== productId) {
          return product;
        }
        if (field === "brand" && typeof value === "string") {
          return {
            ...product,
            brand: value,
            brandSlug: slugifyBrand(value),
          };
        }
        if (field === "styleCode") {
          const nextStyleCode =
            typeof value === "string" && value.trim() ? value.trim() : null;
          return {
            ...product,
            styleCode: nextStyleCode,
            slug: generateProductSlug(nextStyleCode, product.name),
          };
        }
        if (field === "name" && typeof value === "string") {
          return {
            ...product,
            name: value,
            slug: generateProductSlug(product.styleCode, value),
          };
        }
        return { ...product, [field]: value };
      }),
    );
  };

  const renderProductCard = (product: Product) => (
    <article key={product.id} className={`${adminCard} space-y-4 p-6`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-amber-700 admin-dark:text-amber-400">
            {product.brand}
          </p>
          <h3 className={adminSectionTitle}>{formatProductDisplayName(product)}</h3>
          <p className={`text-sm ${adminBodyText}`}>
            {product.category}
            {product.styleCode ? ` · ${product.styleCode}` : ""}
            {" · "}
            <code className="text-xs">{product.brandSlug}/{product.slug}</code>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busyProductId === product.id}
            onClick={() => void handleToggleVisibility(product)}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium admin-dark:border-zinc-700"
          >
            {product.isVisible ? "Hide" : "Show"}
          </button>
          <button
            type="button"
            disabled={busyProductId === product.id}
            onClick={() => void handleSaveProduct(product)}
            className="rounded-lg bg-amber-700 px-3 py-1.5 text-sm font-semibold text-white admin-dark:bg-amber-600"
          >
            Save
          </button>
          <button
            type="button"
            disabled={busyProductId === product.id}
            onClick={() => void handleDeleteProduct(product.id)}
            className="rounded-lg border border-red-300 px-3 py-1.5 text-sm font-semibold text-red-700 admin-dark:border-red-500/40 admin-dark:text-red-300"
          >
            Delete
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={adminLabel}>Brand</label>
          <input
            className={adminInput}
            value={product.brand}
            onChange={(e) => updateProductField(product.id, "brand", e.target.value)}
          />
        </div>
        <div>
          <label className={adminLabel}>Style / model</label>
          <input
            className={adminInput}
            value={product.styleCode ?? ""}
            placeholder="ST550, 112, 6606"
            onChange={(e) => updateProductField(product.id, "styleCode", e.target.value)}
          />
        </div>
        <div>
          <label className={adminLabel}>Name</label>
          <input
            className={adminInput}
            value={product.name}
            onChange={(e) => updateProductField(product.id, "name", e.target.value)}
          />
        </div>
        <div>
          <label className={adminLabel}>Category</label>
          <input
            className={adminInput}
            value={product.category}
            onChange={(e) => updateProductField(product.id, "category", e.target.value)}
          />
        </div>
        <div>
          <label className={adminLabel}>Sizes</label>
          <input
            className={adminInput}
            value={sizesToFormValue(product.sizes)}
            onChange={(e) =>
              setProducts((current) =>
                current.map((item) =>
                  item.id === product.id
                    ? { ...item, sizes: parseSizesFromForm(e.target.value) }
                    : item,
                ),
              )
            }
          />
        </div>
      </div>
      <div>
        <label className={adminLabel}>Description</label>
        <textarea
          className={adminInput}
          rows={2}
          value={product.description}
          onChange={(e) => updateProductField(product.id, "description", e.target.value)}
        />
      </div>

      <div className="border-t border-slate-200 pt-4 admin-dark:border-zinc-700">
        <h4 className="text-sm font-semibold text-slate-900 admin-dark:text-white">Colors & images</h4>
        <div className="mt-3 space-y-3">
          {product.colors.map((color) => (
            <div key={color.id} className="rounded-lg border border-slate-200 p-3 admin-dark:border-zinc-700">
              <p className="font-medium text-slate-900 admin-dark:text-white">
                {color.name}
                {color.hex ? ` · ${color.hex}` : ""}
              </p>
              <div className="mt-2 flex flex-wrap gap-3">
                {color.frontImageUrl && (
                  <div className={adminGalleryThumb}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={color.frontImageUrl} alt="" className="max-h-full max-w-full object-contain p-2" />
                  </div>
                )}
                {color.backImageUrl && (
                  <div className={adminGalleryThumb}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={color.backImageUrl} alt="" className="max-h-full max-w-full object-contain p-2" />
                  </div>
                )}
              </div>
              <div className="mt-2 flex flex-wrap gap-3">
                <label className="text-sm">
                  Front image
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    disabled={busyProductId === product.id}
                    className="mt-1 block text-xs"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void handleColorImageUpload(product, color.id, "front", file);
                      e.target.value = "";
                    }}
                  />
                </label>
                <label className="text-sm">
                  Back image
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    disabled={busyProductId === product.id}
                    className="mt-1 block text-xs"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void handleColorImageUpload(product, color.id, "back", file);
                      e.target.value = "";
                    }}
                  />
                </label>
              </div>
              <div className="mt-3 border-t border-slate-200 pt-3 admin-dark:border-zinc-700">
                <p className="text-xs text-slate-600 admin-dark:text-zinc-400">
                  Use this to mark where the real shirt/hat is inside the image. This makes mm
                  logo sizing more accurate.
                </p>
                {(() => {
                  const calibrationValues = getColorCalibrationValues(color);
                  return (
                    <div className="mt-2 grid gap-2 sm:grid-cols-3">
                      <div>
                        <label className={adminLabel}>Garment X %</label>
                        <input
                          className={adminInput}
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          value={calibrationValues.xPercent}
                          onChange={(e) =>
                            updateColorCalibration(
                              product.id,
                              color.id,
                              "xPercent",
                              Number(e.target.value),
                            )
                          }
                        />
                      </div>
                      <div>
                        <label className={adminLabel}>Garment Y %</label>
                        <input
                          className={adminInput}
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          value={calibrationValues.yPercent}
                          onChange={(e) =>
                            updateColorCalibration(
                              product.id,
                              color.id,
                              "yPercent",
                              Number(e.target.value),
                            )
                          }
                        />
                      </div>
                      <div>
                        <label className={adminLabel}>Garment Width %</label>
                        <input
                          className={adminInput}
                          type="number"
                          min="1"
                          max="100"
                          step="0.1"
                          value={calibrationValues.widthPercent}
                          onChange={(e) =>
                            updateColorCalibration(
                              product.id,
                              color.id,
                              "widthPercent",
                              Number(e.target.value),
                            )
                          }
                        />
                      </div>
                      <div>
                        <label className={adminLabel}>Garment Height %</label>
                        <input
                          className={adminInput}
                          type="number"
                          min="1"
                          max="100"
                          step="0.1"
                          value={calibrationValues.heightPercent}
                          onChange={(e) =>
                            updateColorCalibration(
                              product.id,
                              color.id,
                              "heightPercent",
                              Number(e.target.value),
                            )
                          }
                        />
                      </div>
                      <div>
                        <label className={adminLabel}>Physical width mm</label>
                        <input
                          className={adminInput}
                          type="number"
                          min="1"
                          step="1"
                          value={calibrationValues.physicalWidthMm}
                          onChange={(e) =>
                            updateColorCalibration(
                              product.id,
                              color.id,
                              "physicalWidthMm",
                              Number(e.target.value),
                            )
                          }
                        />
                      </div>
                      <div className="flex items-end">
                        <button
                          type="button"
                          className="text-xs font-medium text-amber-700 admin-dark:text-amber-400"
                          onClick={() => clearColorCalibration(product.id, color.id)}
                        >
                          Use default calibration
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          ))}
        </div>

        {activeColorProductId === product.id ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <input className={adminInput} placeholder="Color name" value={colorName} onChange={(e) => setColorName(e.target.value)} />
            <input className={adminInput} placeholder="#hex optional" value={colorHex} onChange={(e) => setColorHex(e.target.value)} />
            <button
              type="button"
              disabled={busyProductId === product.id}
              onClick={() => void handleAddColor(product)}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white admin-dark:bg-zinc-700"
            >
              Add color
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="mt-4 text-sm font-medium text-amber-700 admin-dark:text-amber-400"
            onClick={() => setActiveColorProductId(product.id)}
          >
            + Add color
          </button>
        )}
      </div>
    </article>
  );

  return (
    <div className="flex-1 space-y-6 p-6 lg:p-8">
      <div className={adminNotice}>
        Products save to Firestore at{" "}
        <code className="text-xs">sites/{SITE_ID}/products/{"{productId}"}</code>. New
        images upload to{" "}
        <code className="text-xs">
          sites/{SITE_ID}/products/{"{brandSlug}"}/{"{productSlug}"}/{"{fileName}"}
        </code>
        . Legacy image URLs under{" "}
        <code className="text-xs">sites/{SITE_ID}/products/{"{productId}"}/…</code> still work.
      </div>

      {errorMessage && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 admin-dark:border-red-500/30 admin-dark:bg-red-500/10 admin-dark:text-red-200">
          {errorMessage}
        </div>
      )}
      {statusMessage && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 admin-dark:border-emerald-500/30 admin-dark:bg-emerald-500/10 admin-dark:text-emerald-200">
          {statusMessage}
        </div>
      )}

      <section className={`${adminCard} space-y-4 p-6`}>
        <h2 className={adminSectionTitle}>Create product</h2>
        <form className="space-y-4" onSubmit={(event) => void handleCreateProduct(event)}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={adminLabel}>Brand</label>
              <input
                className={adminInput}
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                list="product-brand-suggestions"
                required
              />
              <datalist id="product-brand-suggestions">
                {BRAND_SUGGESTIONS.map((suggestion) => (
                  <option key={suggestion} value={suggestion} />
                ))}
              </datalist>
            </div>
            <div>
              <label className={adminLabel}>Style / model (optional)</label>
              <input
                className={adminInput}
                value={styleCode}
                onChange={(e) => setStyleCode(e.target.value)}
                placeholder="ST550, LST550, 112, 6606"
              />
            </div>
            <div>
              <label className={adminLabel}>Product name</label>
              <input className={adminInput} value={name} onChange={(e) => setName(e.target.value)} required placeholder="Polo, Trucker Snapback" />
            </div>
            <div>
              <label className={adminLabel}>Category</label>
              <input className={adminInput} value={category} onChange={(e) => setCategory(e.target.value)} required />
            </div>
            <div>
              <label className={adminLabel}>Sizes (comma-separated)</label>
              <input className={adminInput} value={sizes} onChange={(e) => setSizes(e.target.value)} placeholder="S, M, L, XL" />
            </div>
            <div>
              <label className={adminLabel}>Price min</label>
              <input className={adminInput} type="number" min="0" step="0.01" value={priceMin} onChange={(e) => setPriceMin(e.target.value)} />
            </div>
            <div>
              <label className={adminLabel}>Price max</label>
              <input className={adminInput} type="number" min="0" step="0.01" value={priceMax} onChange={(e) => setPriceMax(e.target.value)} />
            </div>
          </div>
          <div>
            <label className={adminLabel}>Description</label>
            <textarea className={adminInput} rows={3} value={description} onChange={(e) => setDescription(e.target.value)} required />
          </div>
          {brand.trim() && (name.trim() || styleCode.trim()) && (
            <p className={`text-sm ${adminBodyText}`}>
              Storage folder preview:{" "}
              <code className="text-xs">sites/{SITE_ID}/products/{createSlugPreview}/</code>
            </p>
          )}
          <label className="flex items-center gap-2 text-sm text-slate-700 admin-dark:text-zinc-300">
            <input type="checkbox" checked={isVisible} onChange={(e) => setIsVisible(e.target.checked)} />
            Visible on public catalog
          </label>
          <button
            type="submit"
            disabled={creating}
            className={creating ? adminButtonDisabled : "rounded-lg bg-amber-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-amber-800 admin-dark:bg-amber-600"}
          >
            {creating ? "Creating…" : "Create product"}
          </button>
        </form>
      </section>

      {loading ? (
        <div className={`${adminCard} px-8 py-10 text-center`}>
          <p className={adminBodyText}>Loading products…</p>
        </div>
      ) : products.length === 0 ? (
        <div className={`${adminCard} px-8 py-10 text-center`}>
          <p className={adminBodyText}>No products yet. Create one above.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {brands.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setBrandFilter("all")}
                className={`rounded-full border px-4 py-2 text-sm font-medium ${
                  brandFilter === "all"
                    ? "border-amber-600 bg-amber-50 text-amber-900 admin-dark:border-amber-500 admin-dark:bg-amber-500/10 admin-dark:text-amber-200"
                    : "border-slate-300 text-slate-700 admin-dark:border-zinc-700 admin-dark:text-zinc-300"
                }`}
              >
                All
              </button>
              {brands.map((brandName) => (
                <button
                  key={brandName}
                  type="button"
                  onClick={() => setBrandFilter(brandName)}
                  className={`rounded-full border px-4 py-2 text-sm font-medium ${
                    brandFilter === brandName
                      ? "border-amber-600 bg-amber-50 text-amber-900 admin-dark:border-amber-500 admin-dark:bg-amber-500/10 admin-dark:text-amber-200"
                      : "border-slate-300 text-slate-700 admin-dark:border-zinc-700 admin-dark:text-zinc-300"
                  }`}
                >
                  {brandName}
                </button>
              ))}
            </div>
          )}

          {brandFilter === "all"
            ? groupedProducts.map((group) => (
                <section key={group.brand} className="space-y-4">
                  <h2 className="text-lg font-bold text-slate-900 admin-dark:text-white">
                    {group.brand}
                  </h2>
                  <div className="space-y-4">
                    {group.products.map((product) => renderProductCard(product))}
                  </div>
                </section>
              ))
            : filteredProducts.map((product) => renderProductCard(product))}
        </div>
      )}
    </div>
  );
}
