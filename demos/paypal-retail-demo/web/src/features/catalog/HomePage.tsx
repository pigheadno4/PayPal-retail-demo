import type { ComponentProps } from "react";

import { Calendar, CalendarDayButton } from "@/components/ui/calendar";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

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
  readonly loading?: boolean;
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

const homeTrustItems = [
  {
    title: "PayPal checkout",
    body: "PayPal, Pay Later, and card surfaces render where eligible.",
  },
  {
    title: "Delivery and pickup",
    body: "Choose fulfillment during checkout.",
  },
  {
    title: "Order recovery",
    body: "Resume pending orders and review completed orders.",
  },
  {
    title: "Generated demo catalog",
    body: "Local POP MART-profile assets keep the demo self-contained.",
  },
] as const;

export function HomePage({ data }: HomePageProps) {
  const calendarDaysByIsoDate = new Map(
    data.calendar.days.map((day) => [day.isoDate, day]),
  );
  const selectedCalendarDate = parseCalendarDate(
    data.calendar.days.find((day) => day.selected)?.isoDate,
  );
  const calendarReleaseDates = data.calendar.days
    .filter((day) => day.hasRelease)
    .map((day) => parseCalendarDate(day.isoDate))
    .filter((date): date is Date => Boolean(date));
  const releaseCalendarMonth = parseCalendarMonthLabel(
    data.calendar.monthLabel,
  );

  return (
    <div className="homepage" data-loading={data.loading ? "true" : undefined}>
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
        <a
          className="homepage-hero__visual-link"
          href={data.hero.primaryCta.href}
          aria-label={data.hero.primaryCta.label}
        >
          <img
            className="homepage-hero__image"
            src={data.hero.imagePath}
            alt={data.hero.imageAlt}
            loading="eager"
          />
        </a>
      </section>

      <section className="homepage-trust-strip" aria-label="Storefront trust">
        {homeTrustItems.map((item) => (
          <Card className="homepage-trust-card" key={item.title} size="sm">
            <CardHeader className="homepage-trust-card__header">
              <CardTitle className="homepage-trust-card__title">
                {item.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="homepage-trust-card__content">
              <p>{item.body}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <div className="homepage-drop-board">
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
            <Calendar
              aria-label={data.calendar.monthLabel}
              buttonVariant="ghost"
              captionLayout="label"
              className="release-calendar"
              components={{
                DayButton: (props) => (
                  <ReleaseCalendarDayButton
                    {...props}
                    calendarDaysByIsoDate={calendarDaysByIsoDate}
                  />
                ),
              }}
              defaultMonth={releaseCalendarMonth}
              mode="single"
              modifiers={{ release: calendarReleaseDates }}
              selected={selectedCalendarDate}
              showOutsideDays={false}
            />
          </div>
          <Card className="release-calendar__details" role="complementary">
            <CardHeader className="release-calendar__details-header">
              <CardTitle className="release-calendar__details-title">
                <h2>Selected releases</h2>
              </CardTitle>
            </CardHeader>
            <CardContent className="release-calendar__details-content">
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
            </CardContent>
          </Card>
        </section>

        <section className="homepage-section" aria-labelledby="hot-sales-title">
          <SectionHeader
            title="Hot sales"
            id="hot-sales-title"
            href="/products"
          />
          <div className="product-card-grid">
            {data.hotSales.map((product) => (
              <Card className="product-card" key={product.slug} size="sm">
                <a className="product-card__link" href={product.href}>
                  <CardContent className="product-card__media">
                    <span className="product-card__tag">{product.eyebrow}</span>
                    <img
                      src={product.imagePath}
                      alt={product.imageAlt}
                      loading="lazy"
                    />
                  </CardContent>
                  <CardHeader className="product-card__header">
                    <CardTitle className="product-card__name">
                      {product.name}
                    </CardTitle>
                    <CardDescription className="product-card__meta">
                      {product.statusLabel}
                    </CardDescription>
                  </CardHeader>
                  <CardFooter className="product-card__footer">
                    <span className="product-card__price">
                      {product.priceLabel}
                    </span>
                  </CardFooter>
                </a>
              </Card>
            ))}
          </div>
        </section>
      </div>

      <section className="homepage-section" aria-labelledby="categories-title">
        <SectionHeader
          title="Shop by category"
          id="categories-title"
          href="/products"
        />
        <div className="category-strip">
          {data.categories.map((category) => (
            <Card className="category-pill" key={category.slug} size="sm">
              <a className="category-pill__link" href={category.href}>
                <CardContent className="category-pill__media">
                  <img
                    src={category.imagePath}
                    alt={category.imageAlt}
                    loading="lazy"
                  />
                </CardContent>
                <CardHeader className="category-pill__copy">
                  <CardTitle className="category-pill__title">
                    {category.name}
                  </CardTitle>
                  <CardDescription className="category-pill__description">
                    {category.description}
                  </CardDescription>
                </CardHeader>
              </a>
            </Card>
          ))}
        </div>
      </section>

      <section className="homepage-promo-grid" aria-label="Promotions">
        {data.promoCards.map((promo) => (
          <Card className="homepage-promo" key={promo.title}>
            <a
              className="homepage-promo__link"
              href={promo.href ?? "/products"}
            >
              <CardHeader className="homepage-promo__header">
                <CardTitle className="homepage-promo__title">
                  <h2>{promo.title}</h2>
                </CardTitle>
                <CardDescription className="homepage-promo__body">
                  <p>{promo.body}</p>
                </CardDescription>
              </CardHeader>
            </a>
          </Card>
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
            <Card className="series-card" key={series.name} size="sm">
              <a className="series-card__link" href={series.href}>
                <CardContent className="series-card__media">
                  <img
                    src={series.imagePath}
                    alt={series.imageAlt}
                    loading="lazy"
                  />
                </CardContent>
                <CardHeader className="series-card__header">
                  <CardTitle className="series-card__title">
                    {series.name}
                  </CardTitle>
                </CardHeader>
              </a>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}

function ReleaseCalendarDayButton({
  calendarDaysByIsoDate,
  day,
  modifiers,
  ...props
}: ComponentProps<typeof CalendarDayButton> & {
  readonly calendarDaysByIsoDate: ReadonlyMap<string, HomePageCalendarDay>;
}) {
  const isoDate = formatCalendarIsoDate(day.date);
  const releaseDay = calendarDaysByIsoDate.get(isoDate);
  const releaseLabel = releaseDay
    ? `${formatCalendarDate(releaseDay.isoDate)}, ${releaseDay.releaseLabel}`
    : props["aria-label"];

  return (
    <CalendarDayButton
      {...props}
      day={day}
      modifiers={modifiers}
      aria-label={releaseLabel}
      aria-pressed={releaseDay?.selected ?? false}
      className="release-calendar__day"
      data-release-marker={releaseDay?.hasRelease ? "outlined" : "none"}
      data-selected={releaseDay?.selected ? "true" : "false"}
    >
      <span>{releaseDay?.dayNumber ?? day.date.getDate()}</span>
      {releaseDay?.hasRelease ? <small>{releaseDay.releaseLabel}</small> : null}
    </CalendarDayButton>
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

function parseCalendarDate(isoDate: string | undefined): Date | undefined {
  if (!isoDate) {
    return undefined;
  }

  const [year, month, day] = isoDate.split("-").map((part) => Number(part));

  if (!year || !month || !day) {
    return undefined;
  }

  return new Date(year, month - 1, day);
}

function parseCalendarMonthLabel(monthLabel: string): Date {
  const [monthName, yearLabel] = monthLabel.split(" ");
  const monthIndex = new Date(`${monthName ?? "January"} 1, 2000`).getMonth();
  const year = Number(yearLabel);

  if (!Number.isFinite(monthIndex) || !Number.isFinite(year)) {
    return new Date();
  }

  return new Date(year, monthIndex, 1);
}

function formatCalendarIsoDate(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
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
    title: "Blind-box drops, ready to collect",
    subtitle:
      "Fresh collectible drops with delivery, pickup, and flexible PayPal checkout.",
    imagePath: "/assets/popmart/products/blind-boxes-2-1.png",
    imageAlt: "Molly Blind Boxes 2 artist collectible on a pastel display",
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
      slug: "blind-boxes-2",
      name: "Molly Blind Boxes 2",
      eyebrow: "Hot sale",
      imagePath: "/assets/popmart/products/blind-boxes-2-1.png",
      imageAlt: "Molly Blind Boxes 2 collectible",
      priceLabel: "$14.99",
      statusLabel: "Released",
      href: "/products/blind-boxes-2",
    },
    {
      slug: "vinyl-figures-7",
      name: "Pucky Vinyl Figures 2",
      eyebrow: "Coming soon",
      imagePath: "/assets/popmart/products/vinyl-figures-7-1.png",
      imageAlt: "Pucky Vinyl Figures 2 collectible",
      priceLabel: "$22.99",
      statusLabel: "Not released",
      href: "/products/vinyl-figures-7",
    },
    {
      slug: "plush-12",
      name: "Molly Plush 2",
      eyebrow: "Top rated",
      imagePath: "/assets/popmart/products/plush-12-1.png",
      imageAlt: "Molly Plush 2 collectible",
      priceLabel: "$19.99",
      statusLabel: "Released",
      href: "/products/plush-12",
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
        slug: "blind-boxes-2",
        name: "Molly Blind Boxes 2",
        statusLabel: "Release date",
        href: "/products/blind-boxes-2",
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
      name: "Blind-box favorites",
      imagePath: "/assets/popmart/products/blind-boxes-3-1.png",
      imageAlt: "Blind-box collectibles display",
      href: "/products?category=blind-boxes",
    },
    {
      name: "Soft plush shelf",
      imagePath: "/assets/popmart/products/plush-13-1.png",
      imageAlt: "Plush collectibles display",
      href: "/products?category=plush",
    },
    {
      name: "Accessory charms",
      imagePath: "/assets/popmart/products/accessories-23-1.png",
      imageAlt: "Accessory collectibles display",
      href: "/products?category=accessories",
    },
  ],
};
