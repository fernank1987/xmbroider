import Link from "next/link";
import type { SiteContent } from "@/lib/siteContent";

type FooterProps = {
  content: Pick<
    SiteContent,
    "brand" | "serviceAreas" | "footer"
  >;
};

export default function Footer({ content }: FooterProps) {
  const { brand, serviceAreas, footer } = content;

  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2 lg:col-span-1">
            <p className="text-lg font-bold text-foreground">{brand.name}</p>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              {footer.description}
            </p>
          </div>

          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground">
              Services
            </h2>
            <ul className="mt-4 space-y-2">
              {footer.serviceListTitles.map((service) => (
                <li key={service}>
                  <span className="text-sm text-muted">{service}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground">
              Service Area
            </h2>
            <ul className="mt-4 space-y-2">
              {serviceAreas.map((area) => (
                <li key={area}>
                  <span className="text-sm text-muted">{area}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground">
              Contact
            </h2>
            <ul className="mt-4 space-y-2 text-sm text-muted">
              <li>
                <span className="text-foreground">Phone:</span>{" "}
                <span>{brand.phone}</span>
              </li>
              <li>
                <span className="text-foreground">Email:</span>{" "}
                <span>{brand.email}</span>
              </li>
              <li>
                <span className="text-foreground">Location:</span>{" "}
                <span>{brand.location}</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-border pt-8 sm:flex-row">
          <p className="text-sm text-muted">
            &copy; {new Date().getFullYear()} {brand.name}. All rights reserved.
          </p>
          <div className="flex gap-4 text-sm">
            {footer.links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={
                  link.href === "#quote"
                    ? "font-medium text-accent hover:text-accent-hover"
                    : "font-medium text-muted hover:text-foreground"
                }
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
