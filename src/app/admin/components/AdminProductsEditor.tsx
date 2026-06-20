"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  createProduct,
  createProductColorInput,
  deleteProduct,
  listProducts,
  parseSizesFromForm,
  updateProduct,
  type Product,
  type UpdateProductInput,
} from "@/lib/firebase/productRepository";
import {
  calibrationFromFormValues,
  getCalibrationFormValues,
  getEffectiveColorCalibration,
  getFirstFrontImageColor,
  getProductDefaultCalibrationValues,
  type CalibrationFormValues,
} from "@/lib/productCalibrationAdmin";
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
  formatCommaSeparatedList,
  formatFeaturesTextarea,
  isSt550StyleCode,
  normalizeOptionalHex,
  parseCommaSeparatedList,
  parseFeaturesTextarea,
  ST550_SPEC_DEFAULTS,
} from "@/lib/productFormUtils";
import {
  adminBodyText,
  adminCard,
  adminInput,
  adminLabel,
  adminMainContent,
  adminNotice,
  adminSectionTitle,
} from "../lib/adminStyles";
import { useSaveStatus } from "../lib/useSaveStatus";
import AdminSaveButton from "./AdminSaveButton";
import ProductCalibrationEditor from "./ProductCalibrationEditor";
import ProductColorRow from "./ProductColorRow";
import ProductPricingEditor from "./ProductPricingEditor";
import SaveStatusMessage from "./SaveStatusMessage";
import type { PreviewCalibration } from "@/lib/previewCalibration";
import {
  cloneProductPricing,
  ST550_DEFAULT_PRICING,
  validateProductPricing,
  type ProductPricing,
} from "@/lib/pricing/productPricing";

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

type VisualCalibrationTarget =
  | { mode: "color"; productId: string; colorId: string }
  | { mode: "product-default"; productId: string };

function buildProductSaveUpdates(product: Product): UpdateProductInput {
  return {
    name: product.name,
    brand: product.brand,
    styleCode: product.styleCode,
    category: product.category,
    description: product.description,
    seoDescription: product.seoDescription?.trim() || null,
    material: product.material?.trim() || null,
    fabricWeight: product.fabricWeight?.trim() || null,
    fit: product.fit?.trim() || null,
    careInstructions: product.careInstructions?.trim() || null,
    decorationMethods: product.decorationMethods ?? [],
    features: product.features ?? [],
    basePriceMin: product.basePriceMin,
    basePriceMax: product.basePriceMax,
    sizes: product.sizes,
    isVisible: product.isVisible,
    defaultPreviewCalibration: product.defaultPreviewCalibration,
    colors: product.colors,
    pricing: product.pricing,
  };
}

function getExpandedColorKey(productId: string, colorId: string): string {
  return `${productId}:${colorId}`;
}

function productActionKey(productId: string, action: string): string {
  return `product:${productId}:${action}`;
}

function colorActionKey(productId: string, colorId: string, action: string): string {
  return `color:${productId}:${colorId}:${action}`;
}

export default function AdminProductsEditor() {
  const saveStatus = useSaveStatus();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
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
  const [material, setMaterial] = useState("");
  const [fabricWeight, setFabricWeight] = useState("");
  const [fit, setFit] = useState("");
  const [careInstructions, setCareInstructions] = useState("");
  const [decorationMethods, setDecorationMethods] = useState("");
  const [features, setFeatures] = useState("");
  const [seoDescription, setSeoDescription] = useState("");

  const [colorName, setColorName] = useState("");
  const [colorHex, setColorHex] = useState("");
  const [activeColorProductId, setActiveColorProductId] = useState<string | null>(null);
  const [expandedColorKey, setExpandedColorKey] = useState<string | null>(null);
  const [brandFilter, setBrandFilter] = useState("all");
  const [visualCalibrationTarget, setVisualCalibrationTarget] =
    useState<VisualCalibrationTarget | null>(null);

  const productsRef = useRef(products);
  useEffect(() => {
    productsRef.current = products;
  }, [products]);

  const getProductFromState = (productId: string): Product | null =>
    productsRef.current.find((item) => item.id === productId) ?? null;

  const brands = useMemo(() => getProductBrands(products), [products]);
  const filteredProducts = useMemo(
    () => filterProductsByBrand(products, brandFilter),
    [products, brandFilter],
  );
  const groupedProducts = useMemo(
    () => groupProductsByBrand(filteredProducts),
    [filteredProducts],
  );

  const visualCalibrationContext = useMemo(() => {
    if (!visualCalibrationTarget) {
      return null;
    }

    const product = products.find((item) => item.id === visualCalibrationTarget.productId);
    if (!product) {
      return null;
    }

    if (visualCalibrationTarget.mode === "product-default") {
      const referenceColor = getFirstFrontImageColor(product);
      if (!referenceColor?.frontImageUrl) {
        return null;
      }
      return {
        product,
        color: referenceColor,
        mode: "product-default" as const,
        initialCalibration: product.defaultPreviewCalibration,
      };
    }

    const color = product.colors.find((item) => item.id === visualCalibrationTarget.colorId);
    if (!color?.frontImageUrl) {
      return null;
    }

    return {
      product,
      color,
      mode: "color" as const,
      initialCalibration: color.previewCalibration,
    };
  }, [products, visualCalibrationTarget]);

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

  const handleCreateProduct = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void saveStatus.runAction(
      "create:product",
      async () => {
        setStatusMessage(null);
        setErrorMessage(null);
        const min = priceMin.trim() ? Number(priceMin) : null;
        const max = priceMax.trim() ? Number(priceMax) : null;
        const created = await createProduct(SITE_ID, {
          name,
          brand,
          styleCode: styleCode.trim() || null,
          category,
          description,
          seoDescription: seoDescription.trim() || null,
          material: material.trim() || null,
          fabricWeight: fabricWeight.trim() || null,
          fit: fit.trim() || null,
          careInstructions: careInstructions.trim() || null,
          decorationMethods: parseCommaSeparatedList(decorationMethods),
          features: parseFeaturesTextarea(features),
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
        setMaterial("");
        setFabricWeight("");
        setFit("");
        setCareInstructions("");
        setDecorationMethods("");
        setFeatures("");
        setSeoDescription("");
        setStatusMessage("Product created.");
      },
      { savedMessage: "Product created" },
    );
  };

  const handleSaveProduct = (productId: string) => {
    void saveStatus.runAction(
      productActionKey(productId, "save"),
      async () => {
        const product = getProductFromState(productId);
        if (!product) {
          throw new Error("Product not found. Refresh and try again.");
        }
        const pricingError = validateProductPricing(product.pricing);
        if (pricingError) {
          throw new Error(pricingError);
        }
        setErrorMessage(null);
        const updated = await updateProduct(SITE_ID, productId, buildProductSaveUpdates(product));
        setProducts((current) =>
          current.map((item) => (item.id === updated.id ? updated : item)),
        );
        setStatusMessage("Product saved.");
      },
      { savedMessage: "Product saved" },
    );
  };

  const handleToggleVisibility = (productId: string) => {
    const product = getProductFromState(productId);
    if (!product) {
      return;
    }
    void saveStatus.runAction(
      productActionKey(productId, "visibility"),
      async () => {
        const updated = await updateProduct(SITE_ID, productId, {
          isVisible: !product.isVisible,
        });
        setProducts((current) =>
          current.map((item) => (item.id === updated.id ? updated : item)),
        );
        setStatusMessage(product.isVisible ? "Product hidden." : "Product visible.");
      },
      {
        savedMessage: product.isVisible ? "Hidden" : "Visible",
      },
    );
  };

  const handleDeleteProduct = (productId: string) => {
    if (!window.confirm("Delete this product and its images?")) {
      return;
    }
    void saveStatus.runAction(
      productActionKey(productId, "delete"),
      async () => {
        await deleteProduct(SITE_ID, productId);
        setProducts((current) => current.filter((item) => item.id !== productId));
        setStatusMessage("Product deleted.");
      },
      { savedMessage: "Deleted" },
    );
  };

  const handleAddColor = (productId: string) => {
    if (!colorName.trim()) {
      saveStatus.setLocalError(productActionKey(productId, "addColor"), "Color name is required.");
      return;
    }

    const product = getProductFromState(productId);
    if (!product) {
      return;
    }

    void saveStatus.runAction(
      productActionKey(productId, "addColor"),
      async () => {
        setErrorMessage(null);
        const newColor = createProductColorInput(colorName, colorHex);
        const updated = await updateProduct(SITE_ID, productId, {
          colors: [...product.colors, newColor],
        });
        setProducts((current) =>
          current.map((item) => (item.id === updated.id ? updated : item)),
        );
        setColorName("");
        setColorHex("");
        setActiveColorProductId(null);
        setStatusMessage("Color added.");
      },
      { savedMessage: "Color added" },
    );
  };

  const handleColorImageUpload = (
    productId: string,
    colorId: string,
    side: "front" | "back",
    file: File,
  ) => {
    const uploadKey = colorActionKey(productId, colorId, `${side}Upload`);
    const validationError = validateQuoteArtworkFile(file);
    if (validationError) {
      saveStatus.setLocalError(uploadKey, validationError);
      return;
    }

    void saveStatus.runAction(
      uploadKey,
      async () => {
        const product = getProductFromState(productId);
        if (!product) {
          throw new Error("Product not found.");
        }
        setErrorMessage(null);

        const color = product.colors.find((item) => item.id === colorId);
        if (!color) {
          throw new Error("Color not found.");
        }

        const upload = await uploadProductImage(
          SITE_ID,
          product.brandSlug,
          product.slug,
          color.name,
          side,
          file,
        );
        const colors = product.colors.map((entry) => {
          if (entry.id !== colorId) {
            return entry;
          }

          const oldPath =
            side === "front" ? entry.frontImageStoragePath : entry.backImageStoragePath;
          if (oldPath) {
            void deleteProductImage(oldPath).catch(() => undefined);
          }

          if (side === "front") {
            return {
              ...entry,
              frontImageUrl: upload.url,
              frontImageStoragePath: upload.path,
            };
          }
          return {
            ...entry,
            backImageUrl: upload.url,
            backImageStoragePath: upload.path,
          };
        });

        const updated = await updateProduct(SITE_ID, productId, { colors });
        setProducts((current) =>
          current.map((item) => (item.id === updated.id ? updated : item)),
        );
        setStatusMessage(`${side === "front" ? "Front" : "Back"} image uploaded and saved.`);
      },
      {
        savedMessage: side === "front" ? "Front uploaded" : "Back uploaded",
      },
    );
  };

  const updateColorCalibration = (
    productId: string,
    colorId: string,
    field: keyof CalibrationFormValues,
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

          const base = getEffectiveColorCalibration(product, color);
          const currentValues = getCalibrationFormValues(base);
          const nextValues = { ...currentValues, [field]: value };

          return {
            ...color,
            previewCalibration: calibrationFromFormValues(nextValues),
          };
        });

        return { ...product, colors };
      }),
    );
  };

  const updateProductDefaultCalibration = (
    productId: string,
    field: keyof CalibrationFormValues,
    value: number,
  ) => {
    setProducts((current) =>
      current.map((product) => {
        if (product.id !== productId) {
          return product;
        }

        const baseValues = getProductDefaultCalibrationValues(product);
        const nextValues = { ...baseValues, [field]: value };

        return {
          ...product,
          defaultPreviewCalibration: calibrationFromFormValues(nextValues),
        };
      }),
    );
  };

  const handleSaveProductDefaultCalibration = (productId: string) => {
    void saveStatus.runAction(
      productActionKey(productId, "defaultCalibration"),
      async () => {
        const product = getProductFromState(productId);
        if (!product) {
          throw new Error("Product not found.");
        }
        setErrorMessage(null);
        const calibration = calibrationFromFormValues(
          getProductDefaultCalibrationValues(product),
        );
        const updated = await updateProduct(SITE_ID, productId, {
          defaultPreviewCalibration: calibration,
        });
        setProducts((current) =>
          current.map((item) => (item.id === updated.id ? updated : item)),
        );
        setStatusMessage("Product default calibration saved.");
      },
      { savedMessage: "Default calibration saved" },
    );
  };

  const handleResetProductDefaultCalibration = (productId: string) => {
    void saveStatus.runAction(
      productActionKey(productId, "resetDefaultCalibration"),
      async () => {
        setErrorMessage(null);
        const updated = await updateProduct(SITE_ID, productId, {
          defaultPreviewCalibration: null,
        });
        setProducts((current) =>
          current.map((item) => (item.id === updated.id ? updated : item)),
        );
        setStatusMessage("Product default calibration reset.");
      },
      { savedMessage: "Default calibration reset" },
    );
  };

  const handleUseProductDefaultForColor = (productId: string, colorId: string) => {
    void saveStatus.runAction(
      colorActionKey(productId, colorId, "useDefault"),
      async () => {
        const product = getProductFromState(productId);
        if (!product) {
          throw new Error("Product not found.");
        }
        setErrorMessage(null);
        const colors = product.colors.map((color) =>
          color.id === colorId ? { ...color, previewCalibration: null } : color,
        );
        const updated = await updateProduct(SITE_ID, productId, { colors });
        setProducts((current) =>
          current.map((item) => (item.id === updated.id ? updated : item)),
        );
        setStatusMessage("Color now uses product default calibration.");
      },
      { savedMessage: "Using product default" },
    );
  };

  const handleCustomizeColorCalibration = (productId: string, colorId: string) => {
    setProducts((current) =>
      current.map((product) => {
        if (product.id !== productId) {
          return product;
        }

        return {
          ...product,
          colors: product.colors.map((color) => {
            if (color.id !== colorId || color.previewCalibration) {
              return color;
            }
            return {
              ...color,
              previewCalibration: getEffectiveColorCalibration(product, color),
            };
          }),
        };
      }),
    );
    saveStatus.setLocalSuccess(
      colorActionKey(productId, colorId, "customize"),
      "Custom calibration enabled — adjust fields or save product",
    );
  };

  const handleDeleteColor = (productId: string, colorId: string) => {
    if (!window.confirm("Delete this color and its images?")) {
      return;
    }

    void saveStatus.runAction(
      colorActionKey(productId, colorId, "delete"),
      async () => {
        const product = getProductFromState(productId);
        const color = product?.colors.find((item) => item.id === colorId);
        if (!product || !color) {
          throw new Error("Color not found.");
        }

        setErrorMessage(null);

        if (color.frontImageStoragePath) {
          await deleteProductImage(color.frontImageStoragePath).catch(() => undefined);
        }
        if (color.backImageStoragePath) {
          await deleteProductImage(color.backImageStoragePath).catch(() => undefined);
        }

        const colors = product.colors.filter((item) => item.id !== colorId);
        const updated = await updateProduct(SITE_ID, productId, { colors });
        setProducts((current) =>
          current.map((item) => (item.id === updated.id ? updated : item)),
        );
        if (expandedColorKey === getExpandedColorKey(productId, colorId)) {
          setExpandedColorKey(null);
        }
        setStatusMessage("Color deleted.");
      },
      { savedMessage: "Color deleted" },
    );
  };

  const handleVisualCalibrationSave = async (calibration: PreviewCalibration) => {
    if (!visualCalibrationContext) {
      return;
    }

    const { product } = visualCalibrationContext;
    const calibrationKey =
      visualCalibrationContext.mode === "product-default"
        ? productActionKey(product.id, "visualCalibration")
        : colorActionKey(product.id, visualCalibrationContext.color.id, "visualCalibration");

    await saveStatus.runAction(
      calibrationKey,
      async () => {
        setErrorMessage(null);

        if (visualCalibrationContext.mode === "product-default") {
          const updated = await updateProduct(SITE_ID, product.id, {
            defaultPreviewCalibration: calibration,
          });
          setProducts((current) =>
            current.map((item) => (item.id === updated.id ? updated : item)),
          );
          setStatusMessage("Product default calibration saved.");
        } else {
          const { color } = visualCalibrationContext;
          const colors = product.colors.map((item) =>
            item.id === color.id ? { ...item, previewCalibration: calibration } : item,
          );
          const updated = await updateProduct(SITE_ID, product.id, { colors });
          setProducts((current) =>
            current.map((item) => (item.id === updated.id ? updated : item)),
          );
          setStatusMessage(`Calibration saved for ${color.name}.`);
        }
        setVisualCalibrationTarget(null);
      },
      {
        savedMessage:
          visualCalibrationContext.mode === "product-default"
            ? "Calibration saved"
            : `Saved ${visualCalibrationContext.color.name}`,
      },
    );
  };

  const updateProductSpec = (productId: string, patch: Partial<Product>) => {
    setProducts((current) =>
      current.map((product) =>
        product.id === productId ? { ...product, ...patch } : product,
      ),
    );
  };

  const applySt550DefaultsToCreateForm = () => {
    setMaterial(ST550_SPEC_DEFAULTS.material);
    setFabricWeight(ST550_SPEC_DEFAULTS.fabricWeight);
    setFit(ST550_SPEC_DEFAULTS.fit);
    setCareInstructions(ST550_SPEC_DEFAULTS.careInstructions);
    setDecorationMethods(formatCommaSeparatedList([...ST550_SPEC_DEFAULTS.decorationMethods]));
    setFeatures(formatFeaturesTextarea([...ST550_SPEC_DEFAULTS.features]));
  };

  const applySt550DefaultsToProduct = (productId: string) => {
    updateProductSpec(productId, {
      material: ST550_SPEC_DEFAULTS.material,
      fabricWeight: ST550_SPEC_DEFAULTS.fabricWeight,
      fit: ST550_SPEC_DEFAULTS.fit,
      careInstructions: ST550_SPEC_DEFAULTS.careInstructions || null,
      decorationMethods: [...ST550_SPEC_DEFAULTS.decorationMethods],
      features: [...ST550_SPEC_DEFAULTS.features],
    });
    saveStatus.setLocalSuccess(
      productActionKey(productId, "st550"),
      "Defaults applied — remember to save",
    );
  };

  const applySt550PricingDefaults = (productId: string) => {
    setProducts((current) =>
      current.map((product) =>
        product.id === productId
          ? { ...product, pricing: cloneProductPricing(ST550_DEFAULT_PRICING) }
          : product,
      ),
    );
    saveStatus.setLocalSuccess(
      productActionKey(productId, "st550-pricing"),
      "ST550 pricing applied — remember to save",
    );
  };

  const updateProductPricing = (
    productId: string,
    pricing: ProductPricing | null,
  ) => {
    setProducts((current) =>
      current.map((product) =>
        product.id === productId ? { ...product, pricing } : product,
      ),
    );
  };

  const updateColorDetails = (
    productId: string,
    colorId: string,
    field: "name" | "hex" | "sortOrder" | "isVisible",
    value: string | number | boolean,
  ) => {
    setProducts((current) =>
      current.map((product) => {
        if (product.id !== productId) {
          return product;
        }
        return {
          ...product,
          colors: product.colors.map((color) => {
            if (color.id !== colorId) {
              return color;
            }
            if (field === "name") {
              return { ...color, name: String(value).trim() };
            }
            if (field === "hex") {
              return { ...color, hex: normalizeOptionalHex(String(value)) };
            }
            if (field === "sortOrder") {
              return { ...color, sortOrder: Number(value) };
            }
            return { ...color, isVisible: Boolean(value) };
          }),
        };
      }),
    );
  };

  const handleSaveColorDetails = (productId: string, colorId: string) => {
    const product = getProductFromState(productId);
    const color = product?.colors.find((item) => item.id === colorId);
    if (!color?.name.trim()) {
      saveStatus.setLocalError(
        colorActionKey(productId, colorId, "details"),
        "Color name is required.",
      );
      return;
    }

    void saveStatus.runAction(
      colorActionKey(productId, colorId, "details"),
      async () => {
        if (!product) {
          throw new Error("Product not found.");
        }
        setErrorMessage(null);
        const updated = await updateProduct(SITE_ID, productId, {
          colors: product.colors,
        });
        setProducts((current) =>
          current.map((item) => (item.id === updated.id ? updated : item)),
        );
        setStatusMessage(`Color details saved for ${color.name}.`);
      },
      { savedMessage: `Saved ${color.name}` },
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
        <div className="flex flex-wrap items-start gap-2">
          <AdminSaveButton
            actionKey={productActionKey(product.id, "visibility")}
            saveStatus={saveStatus}
            idleLabel={product.isVisible ? "Hide" : "Show"}
            savingLabel="Saving…"
            savedLabel={product.isVisible ? "Hidden" : "Visible"}
            variant="outline"
            size="sm"
            onClick={() => handleToggleVisibility(product.id)}
          />
          <AdminSaveButton
            actionKey={productActionKey(product.id, "save")}
            saveStatus={saveStatus}
            idleLabel="Save"
            savingLabel="Saving…"
            savedLabel="Saved"
            variant="primary"
            size="sm"
            onClick={() => handleSaveProduct(product.id)}
          />
          <AdminSaveButton
            actionKey={productActionKey(product.id, "delete")}
            saveStatus={saveStatus}
            idleLabel="Delete"
            savingLabel="Deleting…"
            savedLabel="Deleted"
            variant="danger"
            size="sm"
            onClick={() => handleDeleteProduct(product.id)}
          />
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
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 className="text-sm font-semibold text-slate-900 admin-dark:text-white">
            Product specs
          </h4>
          {isSt550StyleCode(product.styleCode) && (
            <div className="flex flex-col items-end gap-1">
              <button
                type="button"
                onClick={() => applySt550DefaultsToProduct(product.id)}
                className="text-xs font-medium text-amber-700 admin-dark:text-amber-400"
              >
                Apply ST550 defaults
              </button>
              {saveStatus.getEntry(productActionKey(product.id, "st550")).status === "saved" && (
                <SaveStatusMessage
                  status="saved"
                  message={saveStatus.getEntry(productActionKey(product.id, "st550")).message}
                />
              )}
            </div>
          )}
        </div>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <div>
            <label className={adminLabel}>Material</label>
            <input
              className={adminInput}
              value={product.material ?? ""}
              placeholder="100% polyester interlock"
              onChange={(event) =>
                updateProductSpec(product.id, {
                  material: event.target.value,
                })
              }
            />
          </div>
          <div>
            <label className={adminLabel}>Fabric weight</label>
            <input
              className={adminInput}
              value={product.fabricWeight ?? ""}
              placeholder="3.8 oz"
              onChange={(event) =>
                updateProductSpec(product.id, {
                  fabricWeight: event.target.value,
                })
              }
            />
          </div>
          <div>
            <label className={adminLabel}>Fit</label>
            <input
              className={adminInput}
              value={product.fit ?? ""}
              placeholder="Adult unisex"
              onChange={(event) =>
                updateProductSpec(product.id, { fit: event.target.value })
              }
            />
          </div>
          <div>
            <label className={adminLabel}>Decoration methods</label>
            <input
              className={adminInput}
              value={formatCommaSeparatedList(product.decorationMethods)}
              placeholder="Embroidery, DTF Heat Press"
              onChange={(event) =>
                updateProductSpec(product.id, {
                  decorationMethods: parseCommaSeparatedList(event.target.value),
                })
              }
            />
          </div>
          <div className="sm:col-span-2">
            <label className={adminLabel}>Features (one per line)</label>
            <textarea
              className={adminInput}
              rows={4}
              value={formatFeaturesTextarea(product.features)}
              onChange={(event) =>
                updateProductSpec(product.id, {
                  features: parseFeaturesTextarea(event.target.value),
                })
              }
            />
          </div>
          <div className="sm:col-span-2">
            <label className={adminLabel}>Care instructions</label>
            <textarea
              className={adminInput}
              rows={2}
              value={product.careInstructions ?? ""}
              onChange={(event) =>
                updateProductSpec(product.id, {
                  careInstructions: event.target.value,
                })
              }
            />
          </div>
          <div className="sm:col-span-2">
            <label className={adminLabel}>SEO description (optional)</label>
            <textarea
              className={adminInput}
              rows={2}
              value={product.seoDescription ?? ""}
              onChange={(event) =>
                updateProductSpec(product.id, {
                  seoDescription: event.target.value,
                })
              }
            />
          </div>
        </div>
      </div>

      <div className="border-t border-slate-200 pt-4 admin-dark:border-zinc-700">
        <h4 className="text-sm font-semibold text-slate-900 admin-dark:text-white">
          Quote estimator pricing
        </h4>
        <p className={`mt-1 text-xs ${adminBodyText}`}>
          Controls live price estimates on the preview page for this product.
        </p>
        <div className="mt-3">
          <ProductPricingEditor
            pricing={product.pricing}
            onChange={(pricing) => updateProductPricing(product.id, pricing)}
            onApplySt550Defaults={() => applySt550PricingDefaults(product.id)}
          />
          {saveStatus.getEntry(productActionKey(product.id, "st550-pricing")).status ===
            "saved" && (
            <SaveStatusMessage
              status="saved"
              message={
                saveStatus.getEntry(productActionKey(product.id, "st550-pricing")).message
              }
            />
          )}
        </div>
      </div>

      <div className="border-t border-slate-200 pt-4 admin-dark:border-zinc-700">
        <h4 className="text-sm font-semibold text-slate-900 admin-dark:text-white">
          Default preview calibration
        </h4>
        <p className={`mt-1 text-xs ${adminBodyText}`}>
          This default applies to all colors unless a color has its own custom calibration.
        </p>
        {(() => {
          const defaultValues = getProductDefaultCalibrationValues(product);
          const referenceColor = getFirstFrontImageColor(product);
          return (
            <div className="mt-3 space-y-3">
              <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-5">
                <div>
                  <label className={adminLabel}>Garment X %</label>
                  <input
                    className={adminInput}
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={defaultValues.xPercent}
                    onChange={(event) =>
                      updateProductDefaultCalibration(
                        product.id,
                        "xPercent",
                        Number(event.target.value),
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
                    value={defaultValues.yPercent}
                    onChange={(event) =>
                      updateProductDefaultCalibration(
                        product.id,
                        "yPercent",
                        Number(event.target.value),
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
                    value={defaultValues.widthPercent}
                    onChange={(event) =>
                      updateProductDefaultCalibration(
                        product.id,
                        "widthPercent",
                        Number(event.target.value),
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
                    value={defaultValues.heightPercent}
                    onChange={(event) =>
                      updateProductDefaultCalibration(
                        product.id,
                        "heightPercent",
                        Number(event.target.value),
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
                    value={defaultValues.physicalWidthMm}
                    onChange={(event) =>
                      updateProductDefaultCalibration(
                        product.id,
                        "physicalWidthMm",
                        Number(event.target.value),
                      )
                    }
                  />
                </div>
              </div>
              <div className="flex flex-wrap items-start gap-2">
                <AdminSaveButton
                  actionKey={productActionKey(product.id, "defaultCalibration")}
                  saveStatus={saveStatus}
                  idleLabel="Save product default calibration"
                  savingLabel="Saving…"
                  savedLabel="Saved"
                  variant="primary"
                  size="xs"
                  onClick={() => handleSaveProductDefaultCalibration(product.id)}
                />
                <AdminSaveButton
                  actionKey={productActionKey(product.id, "resetDefaultCalibration")}
                  saveStatus={saveStatus}
                  idleLabel="Reset product default calibration"
                  savingLabel="Resetting…"
                  savedLabel="Reset"
                  variant="outline"
                  size="xs"
                  disabled={!product.defaultPreviewCalibration}
                  onClick={() => handleResetProductDefaultCalibration(product.id)}
                />
                <button
                  type="button"
                  disabled={
                    !referenceColor?.frontImageUrl ||
                    saveStatus.isSaving(productActionKey(product.id, "defaultCalibration"))
                  }
                  onClick={() =>
                    setVisualCalibrationTarget({
                      mode: "product-default",
                      productId: product.id,
                    })
                  }
                  className="rounded-lg border border-amber-300 px-3 py-1.5 text-xs font-semibold text-amber-800 admin-dark:border-amber-500/40 admin-dark:text-amber-300"
                >
                  Calibrate visually
                </button>
              </div>
            </div>
          );
        })()}
      </div>

      <div className="border-t border-slate-200 pt-4 admin-dark:border-zinc-700">
        <h4 className="text-sm font-semibold text-slate-900 admin-dark:text-white">Colors & images</h4>
        <div className="mt-3 space-y-2">
          {product.colors.map((color) => {
            const colorKey = getExpandedColorKey(product.id, color.id);
            return (
              <ProductColorRow
                key={color.id}
                product={product}
                color={color}
                expanded={expandedColorKey === colorKey}
                saveStatus={saveStatus}
                onToggleExpand={() =>
                  setExpandedColorKey((current) =>
                    current === colorKey ? null : colorKey,
                  )
                }
                onCollapse={() => setExpandedColorKey(null)}
                onDelete={() => handleDeleteColor(product.id, color.id)}
                onUploadFront={(file) =>
                  handleColorImageUpload(product.id, color.id, "front", file)
                }
                onUploadBack={(file) =>
                  handleColorImageUpload(product.id, color.id, "back", file)
                }
                onCalibrationFieldChange={(field, value) =>
                  updateColorCalibration(product.id, color.id, field, value)
                }
                onUseProductDefault={() =>
                  handleUseProductDefaultForColor(product.id, color.id)
                }
                onCustomizeForColor={() =>
                  handleCustomizeColorCalibration(product.id, color.id)
                }
                onVisualCalibrate={() =>
                  setVisualCalibrationTarget({
                    mode: "color",
                    productId: product.id,
                    colorId: color.id,
                  })
                }
                onColorDetailsChange={(field, value) =>
                  updateColorDetails(product.id, color.id, field, value)
                }
                onSaveColorDetails={() => handleSaveColorDetails(product.id, color.id)}
              />
            );
          })}
        </div>

        {activeColorProductId === product.id ? (
          <div className="mt-4 space-y-2">
            <div className="grid gap-3 sm:grid-cols-3">
              <input className={adminInput} placeholder="Color name" value={colorName} onChange={(e) => setColorName(e.target.value)} />
              <input className={adminInput} placeholder="#hex optional" value={colorHex} onChange={(e) => setColorHex(e.target.value)} />
              <AdminSaveButton
                actionKey={productActionKey(product.id, "addColor")}
                saveStatus={saveStatus}
                idleLabel="Add color"
                savingLabel="Adding…"
                savedLabel="Color added"
                variant="primary"
                size="sm"
                onClick={() => handleAddColor(product.id)}
              />
            </div>
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
    <div className={adminMainContent}>
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
        <form id="create-product-form" className="space-y-4" onSubmit={handleCreateProduct}>
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
          <div className="border-t border-slate-200 pt-4 admin-dark:border-zinc-700">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className={adminSectionTitle}>Product specs</h3>
              {isSt550StyleCode(styleCode) && (
                <button
                  type="button"
                  onClick={applySt550DefaultsToCreateForm}
                  className="text-xs font-medium text-amber-700 admin-dark:text-amber-400"
                >
                  Apply ST550 defaults
                </button>
              )}
            </div>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <div>
                <label className={adminLabel}>Material</label>
                <input
                  className={adminInput}
                  value={material}
                  onChange={(e) => setMaterial(e.target.value)}
                  placeholder="100% polyester interlock"
                />
              </div>
              <div>
                <label className={adminLabel}>Fabric weight</label>
                <input
                  className={adminInput}
                  value={fabricWeight}
                  onChange={(e) => setFabricWeight(e.target.value)}
                  placeholder="3.8 oz"
                />
              </div>
              <div>
                <label className={adminLabel}>Fit</label>
                <input
                  className={adminInput}
                  value={fit}
                  onChange={(e) => setFit(e.target.value)}
                  placeholder="Adult unisex"
                />
              </div>
              <div>
                <label className={adminLabel}>Decoration methods</label>
                <input
                  className={adminInput}
                  value={decorationMethods}
                  onChange={(e) => setDecorationMethods(e.target.value)}
                  placeholder="Embroidery, DTF Heat Press"
                />
              </div>
              <div className="sm:col-span-2">
                <label className={adminLabel}>Features (one per line)</label>
                <textarea
                  className={adminInput}
                  rows={4}
                  value={features}
                  onChange={(e) => setFeatures(e.target.value)}
                />
              </div>
              <div className="sm:col-span-2">
                <label className={adminLabel}>Care instructions</label>
                <textarea
                  className={adminInput}
                  rows={2}
                  value={careInstructions}
                  onChange={(e) => setCareInstructions(e.target.value)}
                />
              </div>
            </div>
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
          <div className="flex flex-col items-start gap-2">
            <AdminSaveButton
              actionKey="create:product"
              saveStatus={saveStatus}
              idleLabel="Create product"
              savingLabel="Creating…"
              savedLabel="Created"
              variant="primary"
              size="md"
              onClick={() => {
                const form = document.getElementById("create-product-form") as HTMLFormElement | null;
                form?.requestSubmit();
              }}
            />
          </div>
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

      {visualCalibrationContext && (
        <ProductCalibrationEditor
          key={`${visualCalibrationContext.product.id}-${visualCalibrationContext.color.id}-${visualCalibrationContext.mode}`}
          open
          imageUrl={visualCalibrationContext.color.frontImageUrl!}
          colorName={
            visualCalibrationContext.mode === "product-default"
              ? `${visualCalibrationContext.product.name} (product default)`
              : visualCalibrationContext.color.name
          }
          productCategory={visualCalibrationContext.product.category}
          initialCalibration={visualCalibrationContext.initialCalibration}
          saveActionKey={
            visualCalibrationContext.mode === "product-default"
              ? productActionKey(visualCalibrationContext.product.id, "visualCalibration")
              : colorActionKey(
                  visualCalibrationContext.product.id,
                  visualCalibrationContext.color.id,
                  "visualCalibration",
                )
          }
          saveStatus={saveStatus}
          onSave={handleVisualCalibrationSave}
          onCancel={() => setVisualCalibrationTarget(null)}
        />
      )}
    </div>
  );
}
