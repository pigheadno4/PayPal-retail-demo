export interface HomePageHero {
  readonly eyebrow: string;
  readonly title: string;
  readonly subtitle: string;
  readonly imagePath: string;
  readonly imageAlt: string;
  readonly primaryCta: HomePageLink;
  readonly secondaryCta: HomePageLink;
}

export interface HomePageLink {
  readonly href: string;
  readonly label: string;
}

export interface HomePageProductCard {
  readonly slug: string;
  readonly name: string;
  readonly eyebrow: string;
  readonly imagePath: string;
  readonly imageAlt: string;
  readonly priceLabel: string;
  readonly statusLabel: string;
  readonly href: string;
}

export interface HomePageCategoryCard {
  readonly slug: string;
  readonly name: string;
  readonly description: string;
  readonly imagePath: string;
  readonly imageAlt: string;
  readonly href: string;
}

export interface HomePageCalendarDay {
  readonly isoDate: string;
  readonly dayNumber: number;
  readonly releaseLabel: string;
  readonly hasRelease: boolean;
  readonly selected: boolean;
}

export interface HomePageCalendarProduct {
  readonly slug: string;
  readonly name: string;
  readonly statusLabel: string;
  readonly href: string;
}

export interface HomePageCalendar {
  readonly monthLabel: string;
  readonly weekdays: readonly string[];
  readonly days: readonly HomePageCalendarDay[];
  readonly selectedProducts: readonly HomePageCalendarProduct[];
}

export interface HomePagePromo {
  readonly title: string;
  readonly body: string;
  readonly href?: string;
}

export interface HomePageSeriesCard {
  readonly name: string;
  readonly imagePath: string;
  readonly imageAlt: string;
  readonly href: string;
}

export interface HomePageData {
  readonly hero: HomePageHero;
  readonly hotSales: readonly HomePageProductCard[];
  readonly categories: readonly HomePageCategoryCard[];
  readonly calendar: HomePageCalendar;
  readonly payLaterPromo: HomePagePromo;
  readonly promoCards: readonly HomePagePromo[];
  readonly popularSeries: readonly HomePageSeriesCard[];
}

export interface HomePageProps {
  readonly data: HomePageData;
}

export function HomePage({ data }: HomePageProps) {
  return (
    <div className="homepage">
      <section className="homepage-hero" aria-labelledby="homepage-hero-title">
        <div className="homepage-hero__copy">
          <p className="homepage-eyebrow">{data.hero.eyebrow}</p>
          <h1 id="homepage-hero-title">{data.hero.title}</h1>
          <p>{data.hero.subtitle}</p>
          <div className="homepage-hero__actions">
            <a
              className="button button--primary"
              href={data.hero.primaryCta.href}
            >
              {data.hero.primaryCta.label}
            </a>
            <a
              className="button button--secondary"
              href={data.hero.secondaryCta.href}
            >
              {data.hero.secondaryCta.label}
            </a>
          </div>
        </div>
        <img
          className="homepage-hero__image"
          src={data.hero.imagePath}
          alt={data.hero.imageAlt}
        />
      </section>

      <section className="homepage-section" aria-labelledby="hot-sales-title">
        <SectionHeader
          title="Hot sales"
          id="hot-sales-title"
          href="/products"
        />
        <div className="product-card-grid">
          {data.hotSales.map((product) => (
            <a className="product-card" href={product.href} key={product.slug}>
              <span className="product-card__tag">{product.eyebrow}</span>
              <img src={product.imagePath} alt={product.imageAlt} />
              <span className="product-card__name">{product.name}</span>
              <span className="product-card__meta">{product.statusLabel}</span>
              <span className="product-card__price">{product.priceLabel}</span>
            </a>
          ))}
        </div>
      </section>

      <section className="homepage-section" aria-labelledby="categories-title">
        <SectionHeader
          title="Shop by category"
          id="categories-title"
          href="/products"
        />
        <div className="category-strip">
          {data.categories.map((category) => (
            <a
              className="category-pill"
              href={category.href}
              key={category.slug}
            >
              <img src={category.imagePath} alt={category.imageAlt} />
              <span>
                <strong>{category.name}</strong>
                <small>{category.description}</small>
              </span>
            </a>
          ))}
        </div>
      </section>

      <section
        className="homepage-calendar"
        aria-labelledby="release-calendar-title"
      >
        <div>
          <SectionHeader
            title="New arrivals calendar"
            id="release-calendar-title"
            href="/products?sort=newest"
          />
          <div
            className="release-calendar"
            aria-label={data.calendar.monthLabel}
          >
            <div className="release-calendar__month">
              {data.calendar.monthLabel}
            </div>
            <div className="release-calendar__weekdays">
              {data.calendar.weekdays.map((weekday) => (
                <span key={weekday}>{weekday}</span>
              ))}
            </div>
            <div className="release-calendar__days">
              {data.calendar.days.map((day) => (
                <button
                  type="button"
                  className="release-calendar__day"
                  data-release-marker={day.hasRelease ? "outlined" : "none"}
                  data-selected={day.selected ? "true" : "false"}
                  aria-label={`${formatCalendarDate(day.isoDate)}, ${day.releaseLabel}`}
                  aria-pressed={day.selected}
                  key={day.isoDate}
                >
                  <span>{day.dayNumber}</span>
                  {day.hasRelease ? <small>{day.releaseLabel}</small> : null}
                </button>
              ))}
            </div>
          </div>
        </div>
        <aside className="release-calendar__details">
          <h2>Selected releases</h2>
          <ul>
            {data.calendar.selectedProducts.map((product) => (
              <li key={product.slug}>
                <a href={product.href}>{product.name}</a>
                <span>{product.statusLabel}</span>
              </li>
            ))}
          </ul>
          <dl className="release-calendar__legend">
            <div>
              <dt>Outlined date</dt>
              <dd>Release activity</dd>
            </div>
            <div>
              <dt>Release date</dt>
              <dd>Product page is viewable</dd>
            </div>
            <div>
              <dt>New arrival</dt>
              <dd>Freshly released item</dd>
            </div>
          </dl>
        </aside>
      </section>

      <section className="homepage-paylater" aria-labelledby="paylater-title">
        <p className="homepage-eyebrow">Flexible checkout</p>
        <h2 id="paylater-title">{data.payLaterPromo.title}</h2>
        <p>{data.payLaterPromo.body}</p>
      </section>

      <section className="homepage-promo-grid" aria-label="Promotions">
        {data.promoCards.map((promo) => (
          <a
            className="homepage-promo"
            href={promo.href ?? "/products"}
            key={promo.title}
          >
            <h2>{promo.title}</h2>
            <p>{promo.body}</p>
          </a>
        ))}
      </section>

      <section className="homepage-section" aria-labelledby="series-title">
        <SectionHeader
          title="Popular series"
          id="series-title"
          href="/products"
        />
        <div className="series-grid">
          {data.popularSeries.map((series) => (
            <a className="series-card" href={series.href} key={series.name}>
              <img src={series.imagePath} alt={series.imageAlt} />
              <strong>{series.name}</strong>
            </a>
          ))}
        </div>
      </section>

      <footer className="homepage-footer">
        <div>
          <h2>Stay in the loop</h2>
          <p>New drops, pickup windows, and collector events.</p>
        </div>
        <a className="button button--secondary" href="/account">
          Account updates
        </a>
      </footer>
    </div>
  );
}

function SectionHeader({
  id,
  title,
  href,
}: {
  readonly id: string;
  readonly title: string;
  readonly href: string;
}) {
  return (
    <header className="section-heading">
      <h2 id={id}>{title}</h2>
      <a href={href}>View all</a>
    </header>
  );
}

function formatCalendarDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map((part) => Number(part));
  const date = new Date(year ?? 0, (month ?? 1) - 1, day ?? 1);

  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "long",
  }).format(date);
}

export const defaultHomePageData: HomePageData = {
  hero: {
    eyebrow: "New arrival",
    title: "THE MONSTERS Labubu",
    subtitle:
      "Fresh character collectibles with delivery, pickup, and flexible PayPal checkout.",
    imagePath: "/assets/popmart/homepage/labubu-hero.svg",
    imageAlt: "Labubu character blind box hero",
    primaryCta: {
      href: "/products?sort=newest",
      label: "Shop new arrivals",
    },
    secondaryCta: {
      href: "/products",
      label: "Browse all",
    },
  },
  hotSales: [
    {
      slug: "labubu-have-a-seat",
      name: "Labubu Have a Seat",
      eyebrow: "Hot sale",
      imagePath: "/assets/popmart/products/labubu-have-a-seat-1.svg",
      imageAlt: "Labubu Have a Seat collectible",
      priceLabel: "$13.99",
      statusLabel: "Released",
      href: "/products/labubu-have-a-seat",
    },
    {
      slug: "skullpanda-future-drop",
      name: "Skullpanda Future Drop",
      eyebrow: "Coming soon",
      imagePath: "/assets/popmart/products/skullpanda-future-drop-1.svg",
      imageAlt: "Skullpanda future drop collectible",
      priceLabel: "$15.99",
      statusLabel: "Not released",
      href: "/products/skullpanda-future-drop",
    },
    {
      slug: "hirono-little-mischief",
      name: "Hirono Little Mischief",
      eyebrow: "Top rated",
      imagePath: "/assets/popmart/products/hirono-little-mischief-1.svg",
      imageAlt: "Hirono Little Mischief collectible",
      priceLabel: "$12.99",
      statusLabel: "Released",
      href: "/products/hirono-little-mischief",
    },
  ],
  categories: [
    {
      slug: "blind-boxes",
      name: "Blind Boxes",
      description: "Mystery character collectibles.",
      imagePath: "/assets/popmart/categories/blind-boxes.svg",
      imageAlt: "Blind box category",
      href: "/products?category=blind-boxes",
    },
    {
      slug: "plush",
      name: "Plush",
      description: "Soft character collectibles.",
      imagePath: "/assets/popmart/categories/plush.svg",
      imageAlt: "Plush category",
      href: "/products?category=plush",
    },
    {
      slug: "accessories",
      name: "Accessories",
      description: "Pins, charms, and shelf extras.",
      imagePath: "/assets/popmart/categories/accessories.svg",
      imageAlt: "Accessories category",
      href: "/products?category=accessories",
    },
  ],
  calendar: {
    monthLabel: "June 2026",
    weekdays: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    days: [
      {
        isoDate: "2026-06-10",
        dayNumber: 10,
        releaseLabel: "New arrival",
        hasRelease: true,
        selected: false,
      },
      {
        isoDate: "2026-06-12",
        dayNumber: 12,
        releaseLabel: "Release date",
        hasRelease: true,
        selected: true,
      },
      {
        isoDate: "2026-06-18",
        dayNumber: 18,
        releaseLabel: "New arrival",
        hasRelease: true,
        selected: false,
      },
    ],
    selectedProducts: [
      {
        slug: "labubu-have-a-seat",
        name: "Labubu Have a Seat",
        statusLabel: "Release date",
        href: "/products/labubu-have-a-seat",
      },
    ],
  },
  payLaterPromo: {
    title: "Pay Later with PayPal",
    body: "Flexible payment options may be available at checkout.",
  },
  promoCards: [
    {
      title: "Limited drops",
      body: "Collector favorites returning this week.",
      href: "/products?sort=newest",
    },
    {
      title: "Pickup nearby",
      body: "Choose eligible stores during checkout.",
      href: "/checkout",
    },
    {
      title: "Member rewards",
      body: "Sign in to keep orders, reviews, and saved payments together.",
      href: "/account",
    },
  ],
  popularSeries: [
    {
      name: "THE MONSTERS",
      imagePath: "/assets/popmart/series/the-monsters.svg",
      imageAlt: "THE MONSTERS series artwork",
      href: "/products?series=the-monsters",
    },
    {
      name: "Skullpanda",
      imagePath: "/assets/popmart/series/skullpanda.svg",
      imageAlt: "Skullpanda series artwork",
      href: "/products?series=skullpanda",
    },
    {
      name: "Hirono",
      imagePath: "/assets/popmart/series/hirono.svg",
      imageAlt: "Hirono series artwork",
      href: "/products?series=hirono",
    },
  ],
};
