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
  readonly payLaterPromo: CategoryPagePromo;
  readonly products: readonly CategoryPageProduct[];
}

export interface CategoryPageProps {
  readonly data: CategoryPageData;
}

export function CategoryPage({ data }: CategoryPageProps) {
  const appliedFilterLabel =
    data.appliedFilterCount === 1
      ? "1 filter applied"
      : `${data.appliedFilterCount} filters applied`;

  return (
    <div className="catalog-page">
      <header className="catalog-hero">
        <p className="homepage-eyebrow">Shop</p>
        <div>
          <h1>{data.title}</h1>
          <p>{data.subtitle}</p>
        </div>
        <span>{data.resultCountLabel}</span>
      </header>

      <div className="catalog-layout">
        <aside className="catalog-filters" aria-label="Product filters">
          <div className="catalog-filter-summary">
            <strong>{appliedFilterLabel}</strong>
            <a href={data.resetHref}>Reset filters</a>
          </div>

          <FilterOptionGroup
            group={{
              label: data.categorySwitcher.label,
              options: data.categorySwitcher.options,
            }}
          />

          {data.filters.map((group) => (
            <FilterOptionGroup group={group} key={group.label} />
          ))}
        </aside>

        <div className="catalog-results">
          <section
            className="catalog-paylater"
            aria-labelledby="catalog-paylater-title"
          >
            <p className="homepage-eyebrow">Flexible checkout</p>
            <h2 id="catalog-paylater-title">{data.payLaterPromo.title}</h2>
            <p>{data.payLaterPromo.body}</p>
          </section>

          <section className="catalog-product-section" aria-label="Products">
            {data.products.map((product) => (
              <a
                className="catalog-product-card"
                href={product.href}
                key={product.slug}
              >
                <img src={product.imagePath} alt={product.imageAlt} />
                <span className="catalog-product-card__category">
                  {product.categoryName}
                </span>
                <strong>{product.name}</strong>
                <span className="catalog-product-card__status">
                  {product.statusLabel}
                </span>
                <span className="catalog-product-card__pickup">
                  {product.pickupLabel}
                </span>
                <span className="catalog-product-card__price">
                  <span>{product.priceLabel}</span>
                  {product.regularPriceLabel === product.priceLabel ? null : (
                    <s>{product.regularPriceLabel}</s>
                  )}
                </span>
              </a>
            ))}
          </section>
        </div>
      </div>
    </div>
  );
}

function FilterOptionGroup({
  group,
}: {
  readonly group: CategoryPageSwitcher | CategoryPageFilterGroup;
}) {
  const disabledReason =
    "disabledReason" in group ? group.disabledReason : undefined;

  return (
    <section
      className="filter-group"
      aria-disabled={disabledReason ? true : undefined}
      aria-labelledby={filterGroupId(group.label)}
    >
      <h2 id={filterGroupId(group.label)}>{group.label}</h2>
      {disabledReason ? (
        <p className="filter-group__hint">{disabledReason}</p>
      ) : null}
      <div className="filter-options">
        {group.options.map((option) => (
          <a
            className="filter-option"
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

function filterGroupId(label: string): string {
  return `filter-${label.toLowerCase().replaceAll(/\s+/g, "-")}`;
}

export const defaultCategoryPageData: CategoryPageData = {
  title: "All products",
  subtitle: "Filter collectible drops by series, status, and availability.",
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
        countLabel: "9",
      },
      {
        label: "Plush",
        href: "/products?category=plush",
        active: false,
        countLabel: "6",
      },
      {
        label: "Accessories",
        href: "/products?category=accessories",
        active: false,
        countLabel: "4",
      },
      {
        label: "Figures",
        href: "/products?category=figures",
        active: false,
        countLabel: "3",
      },
      {
        label: "Bags",
        href: "/products?category=bags",
        active: false,
        countLabel: "3",
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
      label: "Series",
      options: [
        {
          label: "THE MONSTERS",
          href: "/products?series=the-monsters",
          active: false,
          countLabel: "8",
        },
        {
          label: "Skullpanda",
          href: "/products?series=skullpanda",
          active: false,
          countLabel: "7",
        },
        {
          label: "Hirono",
          href: "/products?series=hirono",
          active: false,
          countLabel: "5",
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
  payLaterPromo: {
    title: "Pay Later with PayPal",
    body: "Flexible payment options may be available at checkout.",
  },
  products: [
    {
      slug: "labubu-have-a-seat",
      name: "Labubu Have a Seat",
      categoryName: "Blind Boxes",
      imagePath: "/assets/popmart/products/labubu-have-a-seat-1.svg",
      imageAlt: "Labubu Have a Seat collectible",
      priceLabel: "$13.99",
      regularPriceLabel: "$13.99",
      statusLabel: "Released",
      pickupLabel: "Pickup eligible",
      href: "/products/labubu-have-a-seat",
    },
    {
      slug: "skullpanda-future-drop",
      name: "Skullpanda Future Drop",
      categoryName: "Figures",
      imagePath: "/assets/popmart/products/skullpanda-future-drop-1.svg",
      imageAlt: "Skullpanda Future Drop collectible",
      priceLabel: "$15.99",
      regularPriceLabel: "$17.99",
      statusLabel: "Not released",
      pickupLabel: "Pickup soon",
      href: "/products/skullpanda-future-drop",
    },
    {
      slug: "hirono-little-mischief",
      name: "Hirono Little Mischief",
      categoryName: "Plush",
      imagePath: "/assets/popmart/products/hirono-little-mischief-1.svg",
      imageAlt: "Hirono Little Mischief collectible",
      priceLabel: "$12.99",
      regularPriceLabel: "$12.99",
      statusLabel: "Released",
      pickupLabel: "Delivery only",
      href: "/products/hirono-little-mischief",
    },
  ],
};
