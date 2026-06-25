import { type ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";

export interface CategoryPageLinkOption {
  readonly label: string;
  readonly href: string;
  readonly active: boolean;
  readonly countLabel?: string;
}

export interface CategoryPageSwitcher {
  readonly label: string;
  readonly options: readonly CategoryPageLinkOption[];
}

export interface CategoryPageFilterGroup {
  readonly label: string;
  readonly disabledReason?: string;
  readonly options: readonly CategoryPageLinkOption[];
}

export interface CategoryPagePromo {
  readonly title: string;
  readonly body: string;
}

export interface CategoryPageProduct {
  readonly slug: string;
  readonly name: string;
  readonly categoryName: string;
  readonly imagePath: string;
  readonly imageAlt: string;
  readonly priceLabel: string;
  readonly regularPriceLabel: string;
  readonly statusLabel: string;
  readonly pickupLabel: string;
  readonly href: string;
}

export interface CategoryPageData {
  readonly title: string;
  readonly subtitle: string;
  readonly resultCountLabel: string;
  readonly appliedFilterCount: number;
  readonly resetHref: string;
  readonly categorySwitcher: CategoryPageSwitcher;
  readonly filters: readonly CategoryPageFilterGroup[];
  readonly sortOptions: readonly CategoryPageLinkOption[];
  readonly payLaterPromo: CategoryPagePromo;
  readonly products: readonly CategoryPageProduct[];
}

export interface CategoryPageProps {
  readonly data: CategoryPageData;
  readonly renderPayLaterPromoMessage?: (promo: CategoryPagePromo) => ReactNode;
}

export function CategoryPage({
  data,
  renderPayLaterPromoMessage,
}: CategoryPageProps) {
  const supportedFilters = data.filters
    .map(withSupportedFilterOptions)
    .filter(
      (group): group is CategoryPageFilterGroup => group.options.length > 0,
    );
  const appliedFilterLabel =
    data.appliedFilterCount === 1
      ? "1 filter applied"
      : `${data.appliedFilterCount} filters applied`;
  const appliedFilterChips = getAppliedFilterChips({
    categorySwitcher: data.categorySwitcher,
    filters: supportedFilters,
    resetHref: data.resetHref,
  });
  const sortOptions = data.sortOptions.length
    ? data.sortOptions
    : defaultCategorySortOptions;
  const activeSortOption =
    sortOptions.find((option) => option.active) ?? sortOptions[0] ?? null;

  return (
    <div className="catalog-page">
      <header className="catalog-hero">
        <p className="homepage-eyebrow">Shop</p>
        <div>
          <h1>{data.title}</h1>
        </div>
        <span>{data.resultCountLabel}</span>
      </header>

      <div className="catalog-layout">
        <aside className="catalog-filters" aria-label="Product filters">
          <CatalogFilterPanel
            appliedFilterLabel={appliedFilterLabel}
            categorySwitcher={data.categorySwitcher}
            filters={supportedFilters}
            idPrefix="filter"
            resetHref={data.resetHref}
          />
        </aside>

        <div className="catalog-results">
          <div
            className="catalog-mobile-filter-rail"
            aria-label="Mobile product filters"
          >
            <Sheet>
              <SheetTrigger asChild>
                <Button
                  aria-label={`Filters, ${appliedFilterLabel}`}
                  className="catalog-mobile-filter-trigger"
                  variant="outline"
                >
                  <span>Filter & sort</span>
                  <strong>{appliedFilterLabel}</strong>
                </Button>
              </SheetTrigger>
              <SheetContent className="catalog-mobile-filters" side="bottom">
                <SheetHeader className="catalog-mobile-filters__header">
                  <SheetTitle>Filter and sort</SheetTitle>
                  <SheetDescription>
                    {appliedFilterLabel}. Select one option to update this
                    product list.
                  </SheetDescription>
                </SheetHeader>
                <div className="catalog-mobile-filters__panel">
                  <CatalogFilterPanel
                    appliedFilterLabel={appliedFilterLabel}
                    categorySwitcher={data.categorySwitcher}
                    filters={supportedFilters}
                    idPrefix="mobile-filter"
                    resetHref={data.resetHref}
                    showSummary={false}
                    variant="sheet"
                  />
                  <section
                    className="filter-group filter-group--sheet"
                    aria-labelledby="mobile-filter-sort"
                  >
                    <h2 id="mobile-filter-sort">Sort by</h2>
                    <div className="filter-options">
                      {sortOptions.map((option) => (
                        <a
                          className="filter-option filter-option--sheet"
                          data-active={option.active ? "true" : "false"}
                          href={option.href}
                          key={option.label}
                        >
                          <span>{option.label}</span>
                          {option.active ? <small>Current</small> : null}
                        </a>
                      ))}
                    </div>
                  </section>
                </div>
              </SheetContent>
            </Sheet>
            <a className="catalog-mobile-reset" href={data.resetHref}>
              Reset
            </a>
          </div>

          <section
            className="catalog-shop-controls"
            aria-label="Catalog controls"
          >
            <div className="catalog-applied-filters">
              <span>Applied filters</span>
              <div className="catalog-applied-filters__chips">
                {appliedFilterChips.length ? (
                  appliedFilterChips.map((chip) => (
                    <Badge
                      asChild
                      className="catalog-filter-chip"
                      key={`${chip.groupLabel}-${chip.option.label}`}
                      variant="outline"
                    >
                      <a href={chip.option.href}>
                        {chip.groupLabel}: {chip.option.label}
                      </a>
                    </Badge>
                  ))
                ) : (
                  <Badge className="catalog-filter-chip" variant="secondary">
                    All options
                  </Badge>
                )}
              </div>
            </div>
            <Separator
              className="catalog-shop-controls__separator"
              orientation="vertical"
            />
            <div className="catalog-sort-control">
              <span>Sort by</span>
              <div className="catalog-sort-control__options">
                {sortOptions.map((option) => (
                  <a
                    aria-current={option.active ? "true" : undefined}
                    className={
                      option.active ? "catalog-sort-control__active-link" : ""
                    }
                    data-active={option.active ? "true" : "false"}
                    href={option.href}
                    key={option.label}
                  >
                    {option.label}
                  </a>
                ))}
              </div>
              {activeSortOption ? (
                <small>Current: {activeSortOption.label}</small>
              ) : null}
            </div>
          </section>

          <section
            className="catalog-paylater"
            aria-label={data.payLaterPromo.title}
          >
            {renderPayLaterPromoMessage ? (
              renderPayLaterPromoMessage(data.payLaterPromo)
            ) : (
              <p>{data.payLaterPromo.body}</p>
            )}
          </section>

          <section className="catalog-product-section" aria-label="Products">
            {data.products.map((product) => {
              const onSale = product.regularPriceLabel !== product.priceLabel;

              return (
                <Card
                  className="catalog-product-card"
                  data-on-sale={onSale ? "true" : undefined}
                  key={product.slug}
                  size="sm"
                >
                  <a className="catalog-product-card__link" href={product.href}>
                    <CardContent className="catalog-product-card__media">
                      {onSale ? (
                        <Badge className="catalog-product-card__sale-badge">
                          Sale
                        </Badge>
                      ) : null}
                      <img
                        src={product.imagePath}
                        alt={product.imageAlt}
                        loading="lazy"
                      />
                    </CardContent>
                    <CardHeader className="catalog-product-card__header">
                      <CardDescription className="catalog-product-card__category">
                        {product.categoryName}
                      </CardDescription>
                      <CardTitle className="catalog-product-card__title">
                        {product.name}
                      </CardTitle>
                      <div className="catalog-product-card__badges">
                        <Badge
                          className="catalog-product-card__status"
                          variant="secondary"
                        >
                          {product.statusLabel}
                        </Badge>
                        <Badge
                          className="catalog-product-card__pickup"
                          variant="outline"
                        >
                          {product.pickupLabel}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardFooter className="catalog-product-card__footer">
                      <span className="catalog-product-card__price">
                        <span>{product.priceLabel}</span>
                        {onSale ? <s>{product.regularPriceLabel}</s> : null}
                      </span>
                    </CardFooter>
                  </a>
                </Card>
              );
            })}
          </section>
        </div>
      </div>
    </div>
  );
}

function getAppliedFilterChips({
  categorySwitcher,
  filters,
  resetHref,
}: {
  readonly categorySwitcher: CategoryPageSwitcher;
  readonly filters: readonly CategoryPageFilterGroup[];
  readonly resetHref: string;
}) {
  const categoryChips = categorySwitcher.options
    .filter((option) => option.active && option.href !== resetHref)
    .map((option) => ({
      groupLabel: categorySwitcher.label,
      option,
    }));
  const filterChips = filters.flatMap((group) =>
    group.options
      .filter((option) => option.active)
      .map((option) => ({
        groupLabel: group.label,
        option,
      })),
  );

  return [...categoryChips, ...filterChips];
}

function CatalogFilterPanel({
  appliedFilterLabel,
  categorySwitcher,
  filters,
  idPrefix,
  resetHref,
  showSummary = true,
  variant = "sidebar",
}: {
  readonly appliedFilterLabel: string;
  readonly categorySwitcher: CategoryPageSwitcher;
  readonly filters: readonly CategoryPageFilterGroup[];
  readonly idPrefix: string;
  readonly resetHref: string;
  readonly showSummary?: boolean;
  readonly variant?: "sidebar" | "sheet";
}) {
  return (
    <>
      {showSummary ? (
        <div className="catalog-filter-summary">
          <strong>{appliedFilterLabel}</strong>
          <a href={resetHref}>Reset filters</a>
        </div>
      ) : null}

      <FilterOptionGroup
        group={{
          label: categorySwitcher.label,
          options: categorySwitcher.options,
        }}
        idPrefix={idPrefix}
        variant={variant}
      />

      {filters.map((group) => (
        <FilterOptionGroup
          group={group}
          idPrefix={idPrefix}
          key={group.label}
          variant={variant}
        />
      ))}
    </>
  );
}

function FilterOptionGroup({
  group,
  idPrefix,
  variant = "sidebar",
}: {
  readonly group: CategoryPageSwitcher | CategoryPageFilterGroup;
  readonly idPrefix: string;
  readonly variant?: "sidebar" | "sheet";
}) {
  const disabledReason =
    "disabledReason" in group ? group.disabledReason : undefined;
  const isSheet = variant === "sheet";

  return (
    <section
      className={isSheet ? "filter-group filter-group--sheet" : "filter-group"}
      aria-disabled={disabledReason ? true : undefined}
      aria-labelledby={filterGroupId(group.label, idPrefix)}
    >
      <h2 id={filterGroupId(group.label, idPrefix)}>{group.label}</h2>
      {disabledReason ? (
        <p className="filter-group__hint">{disabledReason}</p>
      ) : null}
      <div className="filter-options">
        {group.options.map((option) => (
          <a
            className={
              isSheet ? "filter-option filter-option--sheet" : "filter-option"
            }
            data-active={option.active ? "true" : "false"}
            href={option.href}
            key={option.label}
          >
            <span>{option.label}</span>
            {option.countLabel ? <small>{option.countLabel}</small> : null}
          </a>
        ))}
      </div>
    </section>
  );
}

const supportedCatalogFilterParams = new Set([
  "availability",
  "category",
  "pickup_available",
  "price",
  "release_status",
  "sort",
]);

const defaultCategorySortOptions: readonly CategoryPageLinkOption[] = [
  {
    label: "Featured",
    href: "/products",
    active: true,
  },
  {
    label: "Price low to high",
    href: "/products?sort=price_asc",
    active: false,
  },
  {
    label: "Price high to low",
    href: "/products?sort=price_desc",
    active: false,
  },
];

function withSupportedFilterOptions(
  group: CategoryPageFilterGroup,
): CategoryPageFilterGroup {
  return {
    ...group,
    options: group.options.filter((option) =>
      filterOptionUsesSupportedParams(option),
    ),
  };
}

function filterOptionUsesSupportedParams(option: CategoryPageLinkOption) {
  const searchStart = option.href.indexOf("?");
  if (searchStart === -1) {
    return true;
  }

  const params = new URLSearchParams(option.href.slice(searchStart + 1));
  return [...params.keys()].every((key) =>
    supportedCatalogFilterParams.has(key),
  );
}

function filterGroupId(label: string, prefix: string): string {
  return `${prefix}-${label.toLowerCase().replaceAll(/\s+/g, "-")}`;
}

export const defaultCategoryPageData: CategoryPageData = {
  title: "All products",
  subtitle: "Filter collectible drops by category, status, and availability.",
  resultCountLabel: "25 products",
  appliedFilterCount: 0,
  resetHref: "/products",
  categorySwitcher: {
    label: "Category",
    options: [
      {
        label: "All options",
        href: "/products",
        active: true,
        countLabel: "25",
      },
      {
        label: "Blind Boxes",
        href: "/products?category=blind-boxes",
        active: false,
        countLabel: "5",
      },
      {
        label: "Vinyl Figures",
        href: "/products?category=vinyl-figures",
        active: false,
        countLabel: "5",
      },
      {
        label: "Plush",
        href: "/products?category=plush",
        active: false,
        countLabel: "5",
      },
      {
        label: "Mega Collection",
        href: "/products?category=mega-collection",
        active: false,
        countLabel: "5",
      },
      {
        label: "Accessories",
        href: "/products?category=accessories",
        active: false,
        countLabel: "5",
      },
    ],
  },
  filters: [
    {
      label: "Price",
      options: [
        {
          label: "Under $20",
          href: "/products?price=under-20",
          active: false,
          countLabel: "15",
        },
        {
          label: "$20 to $50",
          href: "/products?price=20-50",
          active: false,
          countLabel: "7",
        },
        {
          label: "$50 and up",
          href: "/products?price=50-up",
          active: false,
          countLabel: "3",
        },
      ],
    },
    {
      label: "Availability",
      options: [
        {
          label: "In stock",
          href: "/products?availability=in-stock",
          active: false,
          countLabel: "18",
        },
        {
          label: "Coming soon",
          href: "/products?availability=coming-soon",
          active: false,
          countLabel: "7",
        },
      ],
    },
    {
      label: "Release status",
      options: [
        {
          label: "Released",
          href: "/products?release_status=released",
          active: false,
          countLabel: "17",
        },
        {
          label: "Not released",
          href: "/products?release_status=not-released",
          active: false,
          countLabel: "8",
        },
      ],
    },
    {
      label: "Pickup",
      disabledReason: "Add a ZIP or sign in to check pickup filters.",
      options: [
        {
          label: "Pickup eligible",
          href: "/products?pickup_available=true",
          active: false,
          countLabel: "10",
        },
      ],
    },
  ],
  sortOptions: defaultCategorySortOptions,
  payLaterPromo: {
    title: "Pay Later with PayPal",
    body: "Flexible payment options may be available at checkout.",
  },
  products: [
    {
      slug: "blind-boxes-2",
      name: "Molly Blind Boxes 2",
      categoryName: "Blind Boxes",
      imagePath: "/assets/popmart/products/blind-boxes-2-1.png",
      imageAlt: "Molly Blind Boxes 2 collectible",
      priceLabel: "$14.99",
      regularPriceLabel: "$19.69",
      statusLabel: "Released",
      pickupLabel: "Pickup eligible",
      href: "/products/blind-boxes-2",
    },
    {
      slug: "vinyl-figures-7",
      name: "Pucky Vinyl Figures 2",
      categoryName: "Vinyl Figures",
      imagePath: "/assets/popmart/products/vinyl-figures-7-1.png",
      imageAlt: "Pucky Vinyl Figures 2 collectible",
      priceLabel: "$22.99",
      regularPriceLabel: "$22.99",
      statusLabel: "Not released",
      pickupLabel: "Pickup soon",
      href: "/products/vinyl-figures-7",
    },
    {
      slug: "plush-12",
      name: "Molly Plush 2",
      categoryName: "Plush",
      imagePath: "/assets/popmart/products/plush-12-1.png",
      imageAlt: "Molly Plush 2 collectible",
      priceLabel: "$19.99",
      regularPriceLabel: "$19.99",
      statusLabel: "Released",
      pickupLabel: "Pickup eligible",
      href: "/products/plush-12",
    },
  ],
};
