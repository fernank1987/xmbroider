/**
 * Local site content — template-ready for a future admin dashboard.
 * This shape maps cleanly to Firestore: sites/{siteId}/content
 */

export type NavLink = {
  href: string;
  label: string;
};

export type CtaLink = {
  label: string;
  href: string;
};

export type ServiceItem = {
  id: string;
  title: string;
  description: string;
  iconKey: string;
  /** Optional — imageUrl will later come from Firebase Storage */
  imageUrl?: string;
};

export type HowItWorksStep = {
  step: string;
  title: string;
  description: string;
};

export type GalleryItem = {
  id: string;
  label: string;
  category: string;
  /** Optional — imageUrl will later come from Firebase Storage */
  imageUrl?: string;
};

export type QuoteFormOption = {
  value: string;
  label: string;
};

export type LocalSeoBodyPart = {
  text: string;
  emphasis?: boolean;
};

export type SiteBrand = {
  name: string;
  tagline: string;
  phone: string;
  email: string;
  location: string;
};

export type SiteSeo = {
  title: string;
  description: string;
};

/** Fields editable from /admin/site and stored in Firestore. */
export type EditableSiteContent = {
  brand: SiteBrand;
  hero: {
    title: string;
    subtitle: string;
  };
  seo: SiteSeo;
};

export type SiteContent = {
  siteId: string;
  brand: SiteBrand;
  serviceAreas: string[];
  seo: SiteSeo;
  navigation: NavLink[];
  headerCta: CtaLink;
  hero: {
    badge: string;
    title: string;
    subtitle: string;
    primaryCta: CtaLink;
    secondaryCta: CtaLink;
  };
  servicesSection: {
    title: string;
    description: string;
  };
  services: ServiceItem[];
  howItWorks: {
    title: string;
    description: string;
    steps: HowItWorksStep[];
  };
  localSeo: {
    title: string;
    bodyParts: LocalSeoBodyPart[];
    areaTags: string[];
  };
  previewSection: {
    badge: string;
    title: string;
    description: string;
    features: string[];
    cta: CtaLink;
    mockupTitle: string;
    mockupSubtitle: string;
  };
  gallery: {
    title: string;
    description: string;
    items: GalleryItem[];
  };
  quoteSection: {
    title: string;
    description: string;
    form: {
      submitLabel: string;
      disclaimer: string;
      serviceOptions: QuoteFormOption[];
    };
  };
  footer: {
    description: string;
    serviceListTitles: string[];
    links: CtaLink[];
  };
};

const xmbroiderContent: SiteContent = {
  siteId: "xmbroider",
  brand: {
    name: "XMBroider",
    tagline: "Custom Embroidery & DTF Apparel",
    phone: "(401) 000-0000",
    email: "info@xmbroider.com",
    location: "Woonsocket, Rhode Island",
  },
  serviceAreas: [
    "Woonsocket, RI",
    "Providence, RI",
    "Cumberland, RI",
    "Lincoln, RI",
    "Pawtucket, RI",
    "Smithfield, RI",
    "Rhode Island",
  ],
  seo: {
    title: "XMBroider | Custom Embroidery & DTF Apparel in Rhode Island",
    description:
      "Custom embroidery, DTF heat press printing, embroidered hats, polos, uniforms, and golf apparel in Rhode Island.",
  },
  navigation: [
    { href: "/", label: "Home" },
    { href: "#embroidery", label: "Embroidery" },
    { href: "#dtf", label: "DTF Printing" },
    { href: "#hats", label: "Hats" },
    { href: "#golf", label: "Golf Apparel" },
    { href: "#gallery", label: "Gallery" },
    { href: "#quote", label: "Request Quote" },
  ],
  headerCta: {
    label: "Get a Quote",
    href: "#quote",
  },
  hero: {
    badge: "Woonsocket, Rhode Island",
    title: "Custom Embroidery & DTF Apparel in Rhode Island",
    subtitle:
      "Professional custom embroidery and DTF heat press printing for polos, hats, business uniforms, golf apparel, and team shirts. Upload your logo, preview the placement, and request a quote — no shopping cart required.",
    primaryCta: {
      label: "Request a Quote",
      href: "#quote",
    },
    secondaryCta: {
      label: "Upload Logo Preview",
      href: "#preview",
    },
  },
  servicesSection: {
    title: "Our Services",
    description:
      "From single-logo hats to full uniform programs, XMBroider delivers quality embroidery and DTF printing across Rhode Island.",
  },
  services: [
    {
      id: "embroidery",
      title: "Custom Embroidery",
      description:
        "Professional thread embroidery for polos, jackets, bags, and uniforms. Durable, premium finishes for businesses and teams.",
      iconKey: "embroidery",
      // imageUrl will later come from Firebase Storage
    },
    {
      id: "dtf",
      title: "DTF Heat Press",
      description:
        "Full-color DTF transfers for t-shirts, hoodies, and performance wear. Vibrant prints with fast turnaround.",
      iconKey: "dtf",
      // imageUrl will later come from Firebase Storage
    },
    {
      id: "hats",
      title: "Embroidered Hats",
      description:
        "Structured caps, beanies, and trucker hats with crisp logo embroidery. Perfect for brands, events, and staff.",
      iconKey: "hats",
      // imageUrl will later come from Firebase Storage
    },
    {
      id: "uniforms",
      title: "Business Uniforms",
      description:
        "Coordinated embroidered and DTF apparel for staff, contractors, and corporate teams across Rhode Island.",
      iconKey: "uniforms",
      // imageUrl will later come from Firebase Storage
    },
    {
      id: "golf",
      title: "Golf & Team Apparel",
      description:
        "Polos, quarter-zips, and team shirts for golf outings, leagues, schools, and athletic programs.",
      iconKey: "golf",
      // imageUrl will later come from Firebase Storage
    },
    {
      id: "preview",
      title: "Logo Mockup Preview",
      description:
        "Upload your logo and preview placement on shirts, hats, polos, and hoodies before requesting a quote.",
      iconKey: "preview",
      // imageUrl will later come from Firebase Storage
    },
  ],
  howItWorks: {
    title: "How It Works",
    description:
      "A simple quote-first process designed for businesses, teams, and organizations.",
    steps: [
      {
        step: "1",
        title: "Upload your logo",
        description: "Send us your PNG or JPG logo file to get started.",
      },
      {
        step: "2",
        title: "Choose apparel",
        description:
          "Pick shirts, hats, polos, hoodies, or uniforms for your project.",
      },
      {
        step: "3",
        title: "Preview placement",
        description:
          "See your logo positioned on the garment before production.",
      },
      {
        step: "4",
        title: "Request a quote",
        description: "Submit your order details and receive a custom quote.",
      },
    ],
  },
  localSeo: {
    title: "Serving Rhode Island & Nearby Communities",
    bodyParts: [
      { text: "XMBroider is based in " },
      { text: "Woonsocket, Rhode Island", emphasis: true },
      {
        text: ", providing custom embroidery and DTF heat press apparel to businesses, golf leagues, schools, and teams throughout the state. Whether you need embroidered hats in ",
      },
      { text: "Providence", emphasis: true },
      { text: ", polos in " },
      { text: "Cumberland", emphasis: true },
      { text: ", uniforms in " },
      { text: "Lincoln", emphasis: true },
      { text: ", team shirts in " },
      { text: "Pawtucket", emphasis: true },
      { text: ", or golf apparel in " },
      { text: "Smithfield", emphasis: true },
      {
        text: ", we deliver professional results with local service you can count on.",
      },
    ],
    areaTags: [
      "Woonsocket",
      "Providence",
      "Cumberland",
      "Lincoln",
      "Pawtucket",
      "Smithfield",
      "Rhode Island",
    ],
  },
  previewSection: {
    badge: "Coming Soon",
    title: "Logo Preview Tool",
    description:
      "Upload your PNG or JPG logo and place it on a shirt, hat, polo, or hoodie. Resize the placement, preview the look, and submit everything for a custom quote — all in one flow.",
    features: [
      "Upload PNG or JPG logo files",
      "Place on shirt, hat, polo, or hoodie",
      "Resize and adjust placement",
      "Submit for a custom quote",
    ],
    cta: {
      label: "Request a Quote Instead",
      href: "#quote",
    },
    mockupTitle: "Logo preview mockup area",
    mockupSubtitle: "Interactive tool launching soon",
  },
  gallery: {
    title: "Gallery",
    description:
      "Recent embroidery and DTF projects from Rhode Island clients. Full portfolio coming soon.",
    items: [
      {
        id: "gallery-1",
        label: "Embroidered Polo",
        category: "Embroidery",
        // imageUrl will later come from Firebase Storage
      },
      {
        id: "gallery-2",
        label: "DTF Team Shirt",
        category: "DTF Printing",
        // imageUrl will later come from Firebase Storage
      },
      {
        id: "gallery-3",
        label: "Custom Hat Logo",
        category: "Hats",
        // imageUrl will later come from Firebase Storage
      },
      {
        id: "gallery-4",
        label: "Golf Outing Apparel",
        category: "Golf Apparel",
        // imageUrl will later come from Firebase Storage
      },
      {
        id: "gallery-5",
        label: "Business Uniform Set",
        category: "Uniforms",
        // imageUrl will later come from Firebase Storage
      },
      {
        id: "gallery-6",
        label: "Logo Placement Preview",
        category: "Mockup",
        // imageUrl will later come from Firebase Storage
      },
    ],
  },
  quoteSection: {
    title: "Request a Custom Quote",
    description:
      "Tell us about your project — apparel type, quantity, logo placement, and timeline. We'll respond with a personalized quote for your embroidery or DTF order.",
    form: {
      submitLabel: "Submit Quote Request",
      disclaimer:
        "Quote form backend coming soon. Contact placeholders: (401) 000-0000 · info@xmbroider.com",
      serviceOptions: [
        { value: "embroidery", label: "Custom Embroidery" },
        { value: "dtf", label: "DTF Heat Press" },
        { value: "hats", label: "Embroidered Hats" },
        { value: "uniforms", label: "Business Uniforms" },
        { value: "golf", label: "Golf & Team Apparel" },
        { value: "other", label: "Other" },
      ],
    },
  },
  footer: {
    description:
      "Custom Embroidery & DTF Apparel serving Rhode Island businesses, teams, and organizations.",
    serviceListTitles: [
      "Custom Embroidery",
      "DTF Heat Press Printing",
      "Embroidered Hats",
      "Custom Polos & Uniforms",
      "Golf & Team Apparel",
      "Logo Mockup Preview",
    ],
    links: [
      { label: "Request a Quote", href: "#quote" },
      { label: "Logo Preview", href: "#preview" },
    ],
  },
};

/** Registry for multi-site support — add new sites here or load from Firestore later */
const siteRegistry: Record<string, SiteContent> = {
  xmbroider: xmbroiderContent,
};

export function getSiteContent(siteId: string = "xmbroider"): SiteContent {
  const site = siteRegistry[siteId];
  if (!site) {
    throw new Error(`Site content not found for siteId: ${siteId}`);
  }
  return site;
}

/** Default site content for the current deployment */
export const siteContent = getSiteContent("xmbroider");

export function getFallbackEditableContent(
  siteId: string = siteContent.siteId,
): EditableSiteContent {
  const content = getSiteContent(siteId);
  return {
    brand: { ...content.brand },
    hero: {
      title: content.hero.title,
      subtitle: content.hero.subtitle,
    },
    seo: { ...content.seo },
  };
}
