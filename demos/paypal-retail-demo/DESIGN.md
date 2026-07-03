# PayPal Retail Demo Design

## UX Goal

Create a customer-ready collectible retail demo that feels like a real POP MART storefront while proving a broad PayPal payment story. PayPal should be visible through official payment surfaces and Pay Later messages, not through heavy homepage co-branding.

## Main Screens

- Homepage
- Category/catalog page
- Product detail page
- Cart
- Minicart
- Checkout with Delivery and Pickup tabs
- Express Review and Confirm
- Order confirmation
- Account settings
- Account order history and order detail
- Guest order lookup
- Admin Portal at `/admin`

## Profiles And Assets

### POP MART Profile

- Default active profile.
- Buyer storefront should look like a POP MART storefront.
- No visible "POP MART x PayPal Demo" label in buyer header/hero.
- User supplies POP MART image files.
- Local assets live under `web/public/assets/popmart/`.
- Requires 25 products, 5 categories, and 3-4 real images per product.
- No product gallery placeholders.
- Visual contract: playful premium collectible retail. The POP MART profile should feel lively, cute, surprising, and collectible, while still being polished enough for a customer sales demo.
- Storefront foundation: warm light surfaces, image-led product grids, compact category navigation, strong product photography, and tactile product cards.
- Mood keywords: blind-box reveal, toy shelf, collector drop, playful premium, cute designer collectible, limited release.
- Do not apply the generic profile's vintage blue/amber/cream direction to the POP MART buyer storefront.

### Generic Profile

- Brand: MochiToy Studio.
- Storefront visual system: vintage blue, amber, cream direction.
- Product style: fictional cute designer-toy collectibles.
- Local assets live under `web/public/assets/generic/`.
- Requires 25 products, 5 categories, and 3-4 generated/original images per product.

### Branding

PayPal appears only in:

- official buttons
- Pay Later messages
- payment method rows
- checkout actions
- cart/minicart payment surfaces
- Admin Portal technical details

No PayPal-heavy hero, header, nav, or promotional co-branding.

## UI/UX Implementation Guide

This section is the frontend source of truth. Frontend work must follow these rules before a milestone or slice can be marked complete.

### Design Authority

- `DESIGN.md` owns buyer and Admin UI/UX decisions.
- `IMPLEMENTATION_TASKS.md` owns sequencing, but cannot override the visual or interaction contracts here.
- `tracking/test-cases.md` must include a UX acceptance row for every customer-facing page or meaningful component slice.
- If implementation discovers a design gap, update this file first, then update tasks/tests.
- Do not treat a rendered component as complete unless it matches the page contract, state contract, and visual language here.

### Chosen POP MART Direction

Use `ui-ux-pro-max` as a reference, but do not copy every generated recommendation blindly. For this demo:

- Adopt: e-commerce-clean typography, vibrant/block retail hierarchy, bento-like product modules, tactile toy-like cards, sticker badges, and restrained micro-interactions.
- Avoid: Liquid Glass as a primary system, heavy blur, iridescent gradients, low-contrast translucent panels, large decorative orbs, and generic red/white ecommerce shells.
- Preserve: PayPal official button/message containers exactly enough that SDK-rendered surfaces stay readable, stable, and undistorted.

### shadcn Component Foundation

Before continuing broad page polish, migrate the frontend toward a shadcn-based component foundation. The goal is not to replace each page with a generic shadcn page template; the goal is to replace repeated primitive UI with accessible, consistent source-owned components while preserving POP MART-specific ecommerce composition.

Use shadcn primitives for:

- buttons and icon buttons
- cards and page panels
- account/profile avatars
- badges/status chips
- separators
- skeletons and loading placeholders
- sheet/drawer surfaces, especially minicart and mobile filters
- dialogs, including auth and save-order/account prompts
- tabs, including PDP detail tabs and account subviews
- calendars for release-date merchandising
- accordions/collapsibles for checkout steps, mobile filters, and dense mobile sections
- scroll areas for drawers/sheets where content can exceed the viewport
- form fields, labels, descriptions, validation, checkboxes, selects, and submit feedback

Keep custom page composition for Home merchandising, Category product grids, PDP gallery/purchase rail, Cart hierarchy, Checkout flow, Express Review/order confirmation, and Account/order layouts. Do not import or copy generic shadcn page blocks unless a block exactly matches the documented ecommerce behavior and can be adapted without fake capabilities.

PayPal rule: official PayPal buttons, Pay Later buttons, PayPal messages, and SDK-provided custom elements must remain SDK-rendered. shadcn components may wrap or position those surfaces, but must not replace them, restyle them into non-official buttons, hide required messaging, or add unsupported PayPal behavior.

shadcn migration order:

1. Initialize/adopt shadcn/Tailwind-compatible project foundation and aliases.
2. Add only the primitive components needed for near-term M16 work: `Button`, `Card`, `Avatar`, `Badge`, `Separator`, `Skeleton`, `Sheet`, `Dialog`, `Tabs`, `Calendar`, `Accordion`/`Collapsible`, `ScrollArea`, and form field primitives.
3. Create thin demo-local wrappers only where needed to preserve POP MART tokens and current route behavior.
4. Migrate shared primitives before page-specific polish: shell actions, cards/panels, empty states, loading states, modals/drawers, tabs, and forms.
5. Continue page polish after the shared primitives are stable, verified, and documented.

Foundation status: completed on 2026-06-21 with official shadcn CLI initialization for Vite, Tailwind v4 integration, `@/*` aliases into `web/src`, `components.json`, `web/src/lib/utils.ts`, and the near-term primitive files under `web/src/components/ui/`. `Avatar` and `Calendar` are also available for the buyer shell account entry and release-date merchandising. Remaining work is migration, not foundation setup: existing shared shell/action/card/dialog/sheet/tab/form surfaces should adopt these primitives before page-specific polish continues.

Migration progress: shared cart/minicart actions and payment frames, PDP detail tabs, checkout fulfillment tabs, Category mobile filters, auth/save-order dialogs, cart/minicart presentation, Express Review/order confirmation card/button/status surfaces, buyer-shell account/avatar and Lucide action icons, icon-only close controls, Home release calendar, Home merchandising cards, Category/PLP product cards, PDP story/lineup/review/trust/recommendation cards, Checkout step/store/summary panels, Account overview/profile/address/payment/order/status panels, and Checkout/Account form fields now compose through shadcn/Lucide primitives. Further shadcn work should continue with behavior-specific accordions, summaries, and page polish; do not bulk-replace page-specific product anchors, forms, or behavioral rows without preserving their current route/action contracts.

### Reference-Level Polish Target

The user-approved quality target is the provided Sakura Figure Shop home/PDP reference level, adapted to POP MART rather than copied literally. The goal is premium figure-shop completeness: dense but organized retail modules, strong image-led merchandising, deep header/navigation structure, trust/support strips, release/pre-order context only when backed by real data, and refined product detail hierarchy.

Apply these reference cues:

- Home should feel like a complete figure retailer, not a sparse landing page: utility strip, full search/header actions, primary nav, cinematic collection/drop hero, trust strip, release calendar, product/pre-order shelf, category shelf, promo banners, popular series/collection rail, and deep footer.
- PDP should feel like a premium product inspection page: breadcrumb, large gallery with thumbnail rail, status/vendor/rating row, clear price/Pay Later/CTA hierarchy, PayPal express frame, trust strip, and tabbed description/specs/reviews/shipping details. Do not add a duplicate purchase-status card when status is already represented in the summary row and product facts.
- Checkout, order confirmation, cart, category, and account/signup should match the same reference polish level: balanced retail card systems, deep navy shell, warm cream surfaces, gold/coral primary actions, product imagery, concise trust badges, and spacious form/table hierarchy.
- Detailed PDP should match the richer reference level: vertical thumbnail rail on desktop, large stable gallery image, breadcrumb, badge/title/brand/review hierarchy, truthful chips, concise description, dense product fact grid, right-side purchase/preorder rail, quantity/action controls where implemented, trust grid, detail tabs, review summary, and recommendation rails only when backed by real data.
- Use a premium navy/ink foundation and warm gold/cream accent logic where it improves perceived quality, while preserving POP MART coral/pink/yellow accents for active CTAs, drops, and collectible badges.
- Decorative motifs should be subtle and retail-specific. Use borders, corner accents, sticker labels, and image masks before adding illustrative decoration. Do not add floating orbs, heavy blur, or page-wide gradients.
- The implementation should match the reference density and polish, not its brand names, anime IP, cherry blossom identity, or exact product art.

#### Homepage Reference Polish V2

Use the latest Sakura Figure Shop homepage reference as the composition benchmark, adapted to POP MART's current data and shadcn foundation.

- First viewport: Home must open with an image-led hero, overlaid high-contrast eyebrow/title/subtitle, compact CTAs, and a clickable hero image. The hero should feel like the featured drop, not a text card beside media.
- Header relationship: desktop can keep full discovery depth, but the homepage hero must remain the first strong visual signal after the header. Mobile should protect the first viewport by keeping utility/trust/payment-support modules below release/product merchandising.
- Trust strip: render concise capability cards with Lucide/shadcn icon treatment. Trust copy must stay capability-backed: demo-authentic generated catalog, delivery/pickup choice, secure PayPal checkout surfaces, and order support/recovery.
- Release/product zone: pair the shadcn `Calendar` with a product shelf in a dense retail board. Calendar cells must remain contained under sticky headers, and product cards should expose sticker badges, image-led media, price, status, and a small action chip without fake preorder economics.
- Category shelf: use shadcn `Card` composition with product imagery, short descriptions, and a visual arrow affordance. Desktop should show a dense row/grid; mobile should avoid spending the whole viewport on category modules.
- Promo/event cards: use image-backed bento cards with badge, title/body, and short CTA. They may reuse existing product imagery, but must not imply unsupported discounts, loyalty terms, shipping guarantees, or fake campaigns.
- Popular series: render a compact image-led rail/card grid with short badges and full-card links. It should feel like a collector navigation surface, not a sparse text list.
- Responsive rules: at 320-414px, Home merchandising modules may become local horizontal rails to preserve vertical rhythm, but the page itself must not create horizontal scroll.

#### Homepage Reference Polish V3

V3 resolves the remaining reference-fidelity gaps found after hosted GUI review: the header discovery control must become real search, and the POP MART storefront typography must feel lighter, more premium, and less blocky.

- Header search: the desktop discovery bar must be a real shadcn-backed search form, not an anchor styled like a search input. Clicking the field focuses it and keeps the buyer on the current route. Submitting a non-empty query routes to `/products?q=<encoded keyword>` through the app's buyer navigation. Empty submissions route to `/products`.
- Search behavior: category/catalog loading must pass `q` through the live catalog request when present. Fallback catalog data must filter by product name, category, status, and price copy so Vite-only/API-down QA still behaves like search. Unsupported suggestions/autocomplete may be deferred, but the visible search field cannot be inert.
- Mobile search: mobile may keep the compact header, but search must remain typeable. Prefer a compact second-row form or a Sheet/Dialog search surface over a fake pill that redirects immediately.
- Search affordance: the search icon is a submit button with an accessible name. The placeholder should be buyer-facing, for example `Search figures, series, characters...`.
- Typography: reduce the storefront weight scale before adding more decorative styling. Body/UI copy should sit around 400-600, product/card titles around 650-750, and nav/buttons/badges around 700-800. Avoid 900/950 except for rare hero accents.
- Hero type: reduce oversized mobile/desktop hero title scale and use a slightly more open line height so the first viewport feels polished rather than heavy. Keep letter spacing at `0`.
- Font direction: keep the current Rubik/Nunito stack if the slice must stay dependency-free, but apply lighter weights. If a later asset/font pass is allowed, `Fredoka + Nunito` or `Varela Round + Nunito Sans` are preferred for a playful collectible retail tone.

#### Homepage Reference Polish V4

V4 is the homepage refinement contract created from the V2/V3 lessons. V2 established the reference module structure and V3 closed the fake-search plus heavy-type regressions. V4 should not reopen those completed gates; it should make the homepage feel closer to the Sakura reference level by tightening visual mass, release-calendar interaction, footer commerce depth, and mobile browsing rhythm before any runtime implementation is marked complete.

Use these global principles:

- Deep navy is an accent, not the dominant frame. Prefer warm white, cream, blush, and light retail surfaces for the utility/header/footer bands, then reserve navy for one slim nav strip, footer base, headings, and selected states.
- POP MART red, pink, yellow, mint, and sky accents should carry badges, active states, release markers, and small CTAs. Avoid large uninterrupted black/navy blocks around playful product content.
- Mobile is the default reading order. At 320-414px, the buyer should see hero/product discovery quickly; a full month calendar cannot consume the browsing flow by default.
- Typography should stay lighter than the pre-V3 state: body/UI 400-600, card titles 650-750, nav/buttons/badges 700-800, and 900+ only for rare hero emphasis.
- Preserve PayPal official surfaces. Do not restyle PayPal SDK-rendered buttons/messages, wrap official Pay Later messages in decorative boxes, or add unsupported PayPal claims.
- Every commercial claim must be demo-backed. Do not add fake ratings, fake loyalty terms, fake preorder deposits, unsupported shipping guarantees, or unsupported authenticity claims to match the reference image.

Module-level V4 plan:

- Utility bar: compress to a lighter 28-32px band. Desktop keeps short shipping language on the left and language/help/track affordances on the right. Mobile keeps a short shipping phrase plus a track-order icon/link without adding a second dark header row.
- Header search/actions: keep the V3 real search form. Desktop should move toward a light retail header with the POP mark, real search, account/avatar, wishlist, and cart icons. Mobile should keep logo/search/account/cart/menu compact and must never turn the search field back into a route-only anchor.
- Nav/menu: use one slim nav system. Desktop can keep a navy strip with red/gold active underline and a compact sale badge, or move to a light nav with navy text if the page still feels too heavy. Mobile primary categories and support links stay in the shadcn `Sheet` menu.
- Hero: keep the image-led hero and clickable feature-drop target, but reduce heavy surrounding chrome. The first viewport should show the hero image, overlaid title/subtitle, compact CTA pair, and a hint of the next merchandising section.
- Trust strip: keep four icon trust cards, but make them premium and compact. Buyer-facing copy should describe implemented capabilities: generated collectible catalog, delivery/pickup choice, secure PayPal checkout surfaces, and order support/recovery.
- Release calendar: make it a discovery tool, not a static wall. Desktop keeps calendar left and product shelf right; clicking a date updates selected state, event details, and the adjacent product shelf. Replace large explanatory blocks with compact event chips/cards. Add `This week`, `Upcoming`, and `Calendar` views if the interaction needs clearer modes.
- Mobile release calendar: default to a compact agenda or horizontal date-chip rail for the next 7-14 days, with matching product cards immediately below. The full month calendar should open through a shadcn `Sheet`, `Dialog`, `Accordion`, or `Collapsible`, not render as a 900-1000px inline table on first pass.
- Calendar accessibility: selected-date changes should update visible text and an `aria-live` announcement. Date cells/chips need 44px touch targets and labels that include release status, not color alone.
- Product shelf/cards: use dense shadcn `Card` composition with stable media, status `Badge`, category/series copy, price, release state, wishlist icon state, and a primary CTA. Cards shown from selected calendar dates should explain why they are shown.
- Category rail: desktop may use a six-column capsule row. Mobile uses `ScrollArea` or a clipped-safe horizontal rail with readable labels and no page-level horizontal scroll.
- Promo banners: use three image-led cards for New arrivals, Limited drops, and Pickup nearby. Each card needs one image focus, title, short copy, and small CTA. Avoid text-heavy boxes and blank image space.
- Popular series: keep a cover-art rail focused on series names. Do not overload this module with prices or unsupported product economics.
- Pay Later: keep the official amount-free message after merchandising modules. The message renders directly, with a buyer-safe timeout fallback that does not produce layout jump or blank chrome.
- Footer: split the current dark mass into a light newsletter/collector-updates band plus a shorter navy footer base. Include Shop, Help, About, social links, track order, and payment/help links with readable contrast. Mobile footer should stack compactly and avoid becoming the largest homepage module.
- Loading states: integrate shadcn `Skeleton` for non-image loading surfaces and lightweight image placeholders/LQIP where assets exist. Loading placeholders must not look like final product imagery or cause old mock-image flashes.
- Responsive QA: verify 1440, 1280, 1024, 768, 390, and 320 widths with no horizontal overflow, no sticky header/calendar overlap, and no clipped tabs/rails/action text.

V4 non-goals:

- Do not replace the homepage with a generic shadcn marketing template.
- Do not add unsupported autocomplete, personalized recommendations, preorder financial terms, loyalty rewards, or ratings just because they appear in the reference image.
- Do not change Category, PDP, Cart, Minicart, Checkout, Account, or Admin flows except where shared shell/footer tokens require harmless alignment.
- Do not regenerate high-risk product images as part of V4. Product-media quality remains a separate later workflow.
- Do not claim V4 complete without GUI evidence and tracking updates across `IMPLEMENTATION_TASKS.md`, `tracking/todos.md`, `tracking/test-cases.md`, and `tracking/progress.md`.

#### Category + PDP Reference Polish V5

V5 is the next non-homepage polish slice after Homepage Reference Polish V4. It exists because Category and PDP already have a working reference-level foundation, but the latest live review still found visual/UX gaps against the Sakura reference target: Category filters and Pay Later placement feel less integrated than the page system, coming-soon products do not read clearly enough at card level, PDP tabs/reviews are still too hard to discover on mobile, and unreleased PDPs still need cleaner purchase gating.

Implementation handoff: `docs/superpowers/plans/2026-06-29-category-pdp-reference-polish-v5.md`.

Global V5 principles:

- Keep the Sakura reference as a density and polish benchmark, not as a brand-copy target. POP MART red, pink, yellow, mint, sky, warm white, and restrained navy remain the page language.
- Use shadcn primitives for behavior and structure where helpful: `Sheet` or `Popover` for filters, `Badge` for product states, `Card` for product/support modules, `Tabs`, `ScrollArea`, `Accordion`, or `Collapsible` for PDP details, and `Skeleton` for pending states.
- Official PayPal surfaces remain official. Category may use a page-token wrapper around the Pay Later area, but the `paypal-message` element itself must not be restyled, clipped, transformed, or replaced with a fake message.
- Do not invent commerce facts to match the sample. Ratings/review counts must derive from real seeded/submitted reviews. Preorder economics, loyalty/rewards, authenticity, and shipping guarantees render only when implemented and demo-safe.
- Mobile is the default proof point. Category and PDP must be verified at `320`, `390`, `768`, `1024`, `1280`, and `1440` widths before V5 closes.
- V5 must use a review gate after Category implementation and another after PDP implementation so partial completion cannot be marked as finished.

V5 missing-prevention rules from the latest review:

- Category Pay Later must no longer feel like a raw line of payment text. Put it in a compact merchant-owned retail surface, center the official message, and preserve stable loading/fallback states. The PayPal-rendered message remains untouched.
- Category controls must not remain one large mixed filter list. The expected hierarchy is page context/result count, quick category chips, sort, `All filters`, active filter chips/reset, then product grid.
- Category mobile must show products quickly. A full filter sidebar above the grid fails V5 even if the controls technically work.
- Coming-soon cards need both visual and textual distinction. Use a top-right text badge, muted media, and no cart/payment-start affordance.
- Unreleased PDP is a separate state, not a disabled version of the released purchase rail. It hides Add to cart, PayPal, Pay Later, express frames, review summary, and sticky mobile purchase actions.
- Released PDP keeps price, official Pay Later, purchase options, Add to cart, secured PayPal frame, and compact support/trust information in a tight purchase rail.
- PDP support cards must not create a tall empty right column. Merge or compress `PayPal checkout`, `Delivery choices`, `Order recovery`, and `Demo policies` into chips, a compact band, or an accordion.
- PDP reviews must be real-data-only and discoverable: rating/review summary near title when data exists, plus a lower review preview/summary for released products.
- PDP details on mobile cannot hide right-side tabs behind clipped overflow. Use accordion/collapsible details or a visibly scrollable constrained rail with no internal vertical scrollbar.
- Mobile sticky Add to cart is allowed only for released products and only when the main CTA is out of view. It mirrors selected option, quantity/pack, and price; it never contains PayPal/Pay Later/payment actions.

Focused hosted Render V5 preaudit findings from 2026-06-29:

- Category currently mounts a ready Pay Later message, but it still reads as a small raw line above the grid rather than an integrated retail module.
- Category desktop still uses a large left filter column as the dominant control pattern; this conflicts with the V5 grid-first filter/sort direction.
- Coming-soon/not-released Category cards show lower-card status text, but they do not yet have a strong top-right unavailable badge or muted/desaturated image treatment.
- Released PDP desktop keeps the purchase rail functional, but the four support modules under the secured PayPal frame still add visual weight and leave the gallery side feeling empty below the main image.
- Released PDP mobile tab clicks work and Customer reviews content exists, but the tab rail can sit scrolled with left/right triggers offscreen; V5 should improve discoverability with a clearer rail affordance or mobile accordion.
- Released PDP mobile did not expose a sticky Add to cart candidate after the main CTA scrolled away in the focused preaudit.
- Unreleased PDP still exposes disabled Add to cart plus disabled PayPal/Pay Later frame DOM; V5 requires hiding the entire purchase/payment frame and showing only coming-soon/not-released action context.

Current V5 implementation status:

- 2026-06-29 Category runtime slice: the Category Pay Later area now uses a merchant-owned shadcn `Card` wrapper with compact token-aligned chrome and a dedicated official-message slot, without targeting PayPal-rendered internals.
- 2026-06-29 Category runtime slice: not-released product cards now expose a top-right `Coming soon` text badge, muted/desaturated media, explicit non-purchasable state, and preserved PDP navigation. Browser evidence and the broader filter-toolbar/final V5 matrix remain open.
- 2026-06-29 Category runtime slice: the dominant desktop filter sidebar is replaced by a grid-first toolbar with result context, quick category chips, sort, `All filters`, active chips/reset, and shadcn Sheet-based secondary filters. Route-state/browser evidence and final responsive GUI proof remain open.
- 2026-06-30 PDP runtime slice: unreleased PDPs now branch away from the released purchase rail and render a shadcn-backed `product-release-preview` card with disabled `Coming soon` action and release context. Add to cart, PayPal frame/buttons, Pay Later message/button, payment/trust support cards, review summary/cards/social-proof cards, enabled notify/email capture, and sticky purchase candidates are absent for `purchasable=false`; focused component/App/style tests cover this, including the social-proof leak regression found during PDP review. Merchant chrome stays on wrapper classes, while official PayPal SDK custom elements keep direct layout sizing safeguards so buttons/messages fill the secured frame without decorative restyling. Local Vite fallback browser proof passed `/products/vinyl-figures-7?qa=pdp-v5-unreleased-gating` at 1440/390/320 with no horizontal overflow; hosted `/products/blind-boxes-1` proof remains part of the final V5 matrix.
- 2026-06-30 PDP runtime slice: released PDP purchase density now keeps the order price, official Pay Later, purchase options, Add to cart, secured PayPal frame, and a compact support band. The current runtime support modules `PayPal checkout`, `Delivery express`, `Pay Later`, and `Order recovery` are merged into `product-support-band`; the old 2x2 trust grid is removed. Released PDPs with real review data show a score/count summary near the title plus a lower review summary card before real review cards; supplemental social proof renders only when real reviews exist and uses separate `data-social-proof-card` instrumentation. No fake rating renders when reviews are absent, and unreleased products keep reviews hidden. The detail tab rail uses constrained horizontal scrolling with edge affordance, 44px triggers, hidden vertical overflow, inactive panel hiding, keyboard/click activation, and `justify-content: flex-start` so mobile/tablet tabs do not start clipped. Local browser proof for `/products/blind-boxes-2?qa=pdp-v5-task6-tab-start` passed at 1440/1280/768/390/320 with no page-level horizontal overflow; evidence is in `/private/tmp/paypal-retail-pdp-v5-task6-20260630/`. Exact hosted console-message capture remains open for the final V5 matrix.
- 2026-06-30 PDP runtime slice: released mobile PDPs now render a sticky Add to cart shadcn `Card` only when the main Add to cart action is out of view. The sticky bar mirrors the selected purchase option, quantity/pack count, current selected price, and CTA copy, reuses the same add-to-cart handler, reserves bottom safe-area padding, stacks at 420px and below, and never renders PayPal, Pay Later, card, wallet, or express-payment actions. Unreleased PDPs do not initialize or render sticky purchase actions. Evidence is in `/private/tmp/paypal-retail-pdp-v5-sticky-20260630/`.
- 2026-07-01 V5 final local close: Category/PDP final evidence now covers `/products`, `/products?category=blind-boxes`, `/products?q=molly`, `/products/blind-boxes-2`, and `/products/blind-boxes-1` at 1440, 1280, 1024, 768, 390, and 320 widths under `/Users/tengtao/Development/demo-projects/.playwright-mcp/paypal-retail-category-pdp-v5-final-20260701/`. Local hard blockers are cleared: no page-level horizontal overflow, no unreleased purchase/payment/review/sticky leak, mobile Category filters use the Sheet pattern, and mobile PDP tabs scroll/activate without a vertical scrollbar.
- 2026-07-01 PDP review data contract: the primary released POP MART PDP (`blind-boxes-2`) now has a real seeded review, the linked seed is idempotent after mutable demo cart activity, the catalog PDP API returns review IDs, and frontend review cards use defensive stable keys. A focused 390px browser check activates `Customer reviews`, shows the real `Pickup was smooth` review, reports no React/browser errors, and leaves only local PayPal sandbox Pay Later timeout warnings with fallback available. Hosted Render V5 smoke should verify official Pay Later presentment after deploy.

Category V5 plan:

- Pay Later integration: center and align the official amount-free Pay Later message in a restrained retail section that matches page tokens. The wrapper can provide spacing and context, but the PayPal-rendered message remains untouched. Inspection standard: one `paypal-message` renders when provider content is ready, no duplicate fallback copy appears, and the section does not push mobile products below a long non-product first pass.
- Filter/sort simplification: move primary category/filter/sort controls above the product grid and reduce the left-sidebar dominance. Desktop can keep a compact sidebar or secondary filter area, but active filters must be visible as chips near the grid. Mobile uses one shadcn `Sheet` or equivalent filter entry plus active chips in a contained horizontal `ScrollArea`. Inspection standard: controls are 44px+ touch targets, selected states are text/ARIA-visible, `q`/category/sort/filter route state survives reload/back/forward, and no horizontal page overflow appears at `320px`.
- Product card states: coming-soon/unreleased cards show a top-right text badge, muted/desaturated media, and no cart/payment-start affordance. Sale cards keep a short `Sale` badge plus current/regular price. Inspection standard: sale and coming-soon badges do not overlap, card heights remain stable, and coming-soon state is understandable without color.
- Mobile browsing rhythm: product cards must appear in the first meaningful mobile browsing pass after the header/page intro controls. Inspection standard: the filter UI does not become a full sidebar above the product list at `320-414px`, and active filters/reset remain reachable after applying changes.
- Loading and fallback: category pending/loading states use shadcn `Skeleton` for non-image structure and stable image boxes for lazy product media. API-down fallback keeps generated product slugs/images aligned with PDP fallback records.

PDP V5 plan:

- Coming-soon gating: unreleased PDPs hide Add to cart, PayPal, Pay Later, and delivery express frames. They render a disabled `Coming soon` or `Not released` action with concise release context, while keeping product inspection content available. Inspection standard: no official payment frame, Pay Later message, or express button renders for `is_purchasable=false`; reviews and social-proof cards remain hidden for unreleased products even if upstream review-like data is present.
- Purchase rail/support density: replace or compress the four large support cards under the purchase panel into a smaller trust/support band, accordion, or chip group so the right rail does not create a large blank gap under the gallery. Inspection standard: desktop gallery/purchase area feels balanced; Pay Later stays directly under price for purchasable products; support copy remains implemented/demo-safe.
- Review discoverability: released PDPs with real review data show rating/review summary near the title and a review preview/summary in the lower detail area. Inspection standard: review score/count derive from real data; no fake star rating appears when data is absent; customer reviews are discoverable without hunting through an apparently empty tab.
- Detail navigation: desktop keeps refined shadcn/Radix tab semantics with a clear active state. Mobile should either use an accordion/collapsible detail stack or a visibly scrollable tab rail constrained to the card width. Inspection standard: no vertical scrollbar artifact, no clipped inaccessible right-side tab, 44px+ triggers, keyboard/click activation works, inactive panels do not remain exposed to assistive tech.
- Sticky mobile purchase bar: for released products, when the main Add to cart action scrolls out of view, a sticky bottom purchase bar may show selected option, quantity/pack, price, and Add to cart using the same handler as the main CTA. Inspection standard: the sticky bar appears only when useful, does not cover PayPal messages/tabs/footer content, respects safe-area padding, and never appears as a payment action for unreleased products.

V5 inspection standards before completion:

- Category and PDP screenshots/metrics exist for `1440`, `1280`, `1024`, `768`, `390`, and `320` widths.
- Category verifies Pay Later placement, filter/sort behavior, active chip visibility, sale badges, coming-soon visual state, and product-card first-pass visibility.
- PDP verifies released and unreleased product states separately, tab/detail navigation, reviews, support-card density, Pay Later placement, sticky mobile purchase behavior, and payment gating.
- Focused tests cover changed Category/PDP behavior, plus app/cart/payment integration where handlers or payment placement are touched.
- `npm run typecheck`, `npm run lint`, `npm run format:check`, and `git diff --check` pass before V5 is marked complete.
- `IMPLEMENTATION_TASKS.md`, `tracking/todos.md`, `tracking/test-cases.md`, and `tracking/progress.md` are updated in the same slice as the implementation evidence.

#### Category + PDP Refinement V6

V6 is the approved follow-up polish direction from the 2026-07-02 visual companion review. It narrows the remaining Category/PDP polish to reducing above-the-grid mass, protecting mobile product imagery, and moving PDP support context out of the purchase rail.

Selected visual direction:

- Category uses the approved `A+B` direction: remove the large `All products` title/subtitle/result-count hero block from the primary browsing area, keep only compact utility context, and let the product grid become the first dominant visual signal.
- Category Pay Later uses the quiet divider/strip treatment from direction `A`: a compact merchant-owned area with top/bottom border, centered official PayPal message slot, and no large explanatory card copy. The PayPal-rendered message remains untouched.
- Category desktop keeps one compact control row: quick category chips, sort state, `All filters`, active filter chips, and reset when applicable. Do not reintroduce a large mixed filter panel above the grid.
- Category mobile follows direction `B`: product cards must appear immediately after the compact chips/Pay Later strip. The top `All products` and verbose `25 products` copy should not consume first-viewport height.
- Category mobile uses a floating circular filter action at the lower right with a real Lucide-style filter icon such as `SlidersHorizontal` or `ListFilter`, an accessible label, 44px minimum target size, and enough bottom/right offset for safe-area padding. Tapping opens the existing shadcn `Sheet` filter surface.
- Category mobile still needs visible selected state and route/back-forward preservation for category, sort, and filter changes. The floating action is only the entry point, not a replacement for stateful filtering.

PDP uses the approved `A` structure with simpler `B`-style wording:

- Released PDP purchase rail should stay focused on price, amount-aware Pay Later, purchase option/quantity controls, Add to cart, and official PayPal/Pay Later buttons. Do not put the four support tiles back under the secured PayPal frame.
- Move the four support modules into the lower PDP content between `Collector details` and `Series lineup`. They render as flat/tiled support cards, not as a large nested panel.
- Support tile labels use simple buyer-facing words: `PayPal checkout`, `Delivery express`, `Pay Later`, and `Order recovery`.
- Support tile body copy stays short and demo-safe:
  - `PayPal checkout`: `Official surfaces when eligible.`
  - `Delivery express`: `Start delivery checkout here.`
  - `Pay Later`: `Shown for eligible products.`
  - `Order recovery`: `Track or recover after checkout.`
- The lower tile row should feel like a bridge between collector story and series lineup. It should not interrupt product inspection or create a second purchase panel.
- Keep PDP tab labels concise. Prefer `Reviews (1)` over long review labels when space is tight, while ensuring the full accessible name still communicates `Customer reviews`.
- Rating/review treatments stay real-data-only. Use compact SVG/icon star rows plus count visually if implemented with accessible labels, and do not render review UI for unreleased or no-review products.

V6 implementation acceptance:

- At `320` and `390` widths, Category first viewport shows product imagery without requiring the buyer to scroll past a large page title, result-count block, or filter panel.
- Category mobile filter entry is a circular icon button with a real icon, visible focus state, `aria-label`, and no overlap with product-card CTAs or the mobile sticky PDP purchase bar.
- Category Pay Later wrapper is compact, centered, stable during SDK timeout/fallback, and does not duplicate unsupported marketing copy.
- PDP released purchase rail has no support tile grid below the PayPal frame. Support tiles appear only in the lower details area between collector copy and lineup.
- PDP support tile wording matches the approved simple labels/copy above.
- PDP mobile keeps details/tabs reachable without horizontal page overflow; support tiles stack cleanly before the series lineup.

V6 implementation plan and inspection standards live in `docs/superpowers/plans/2026-07-02-category-pdp-refinement-v6.md`. That plan captures the `ui-ux-pro-max` sub-agent review, the tests that must change from V5 assumptions, and the six-width GUI matrix required before closure.

Additional V6 inspection details:

- Category first-viewport proof must measure at least one product media box intersecting the initial `320` and `390` mobile viewport after data settles.
- The mobile filter action must be a real shadcn/Lucide-backed control, not a decorative mockup circle, and it must keep focus return through the existing filter `Sheet`.
- Do not copy the mockup's simplified hidden tab overflow if it would undo the existing PDP tab accessibility fixes.
- PDP visual star summaries may use compact SVG/icon star rows only when backed by real `reviews[]` data and paired with a full accessible label.
- Footer payment marks are part of the same polish follow-up: use verified local SVG/logo assets for PayPal, Visa, Mastercard, and only already-supported checkout options, with conservative eligibility wording and no unsupported payment claims.

#### M16 Reference Polish Implementation Guidance

Use `docs/superpowers/plans/2026-06-18-popmart-reference-polish.md` as the execution guide for this polish slice. The plan owns file-level steps, tests, and visual QA gates; this section owns the visual contract.

Reference design-system takeaways from `sakura_figure_shop_design.md`, adapted to POP MART:

- Tone: premium, calm, collector-focused, organized, warm, and refined. Avoid chaotic anime-store clutter and avoid a childish toy-app feel.
- Color: use deep navy/ink for shell and hierarchy, warm gold for primary actions/prices/active states, cream-white for content-heavy backgrounds, and soft blush/pink only as restrained support. Keep POP MART coral/yellow/pink accents as secondary brand energy, not page-wide noise.
- Typography: premium serif display can be introduced for hero/page titles if it is locally safe and does not create loading/layout issues; product metadata, tables, payment rows, and forms stay clean sans-serif.
- Layout: reference-level desktop pages may use 1280-1440px content width when ecommerce density requires it. Keep existing pages stable if a wider shell would break route-specific layouts.
- Cards: use white cards with warm borders, subtle navy-tinted shadow, 14-16px product-card radii, and 16-20px large page-panel radii only when the panel is genuinely page-scale. Do not nest cards inside cards.
- Images: product cards use stable 4:5 or square media containers; PDP main media uses 1:1 or 4:5; cart/minicart thumbnails stay square. Image containers must prevent layout jump and preserve product art.
- Badges: use at most one or two short status badges per card; every status must include text, not color alone.
- Responsive: desktop supports full header and two-column PDP/cart/checkout; tablet reduces grids; mobile stacks PDP, collapses filters, and turns cart rows into vertical cards.

Implementation must keep these accuracy constraints:

- Do not add fake search. A visible keyword search box is allowed only when it is a real input/form and route query handling supports catalog keyword search through `/products?q=...`. Until then, discovery should use supported nav, category, sort, and filter controls.
- Do not fake pre-order financial terms. Deposit, remaining balance, or estimated release can render only if those fields exist in product data. Otherwise render a release-state facts panel from existing status/detail rows.
- Do not fake ratings. PDP rating summary must derive from real review data or be omitted.
- Do not make broad authenticity, shipping-speed, customer-support, or PSP claims unless they are implemented demo capabilities or PSP-confirmed behavior.
- Do not fake social sign-up. Google/Facebook/Apple buttons may render only if implemented, disabled, or clearly unavailable in demo copy.
- Trust strips may use implemented capabilities: PayPal checkout, Pay Later where eligible, Delivery/Pickup choice during checkout, order recovery, account order history, and generated local demo catalog assets.
- Product imagery remains the hero. Header/footer depth, trust modules, tabs, and badges should support merchandising density without crowding PayPal official surfaces.

Implementation should proceed in this order:

1. Global buyer shell: utility strip, deeper header/nav/actions, supported discovery links, and production-ready footer.
2. Home: cinematic hero, trust strip, release/calendar plus product shelf, category shelf, promo/event cards, series rail.
3. PDP: breadcrumb, large gallery, status/vendor/review row, price-linked Pay Later message, primary CTA, secured PayPal express frame, trust strip, detail tabs.
4. Category: compact filter/sort controls, visible applied filters, dense product cards, mobile filter compression.
5. Cart, minicart, checkout: item-table/card hierarchy, summary cards, PayPal/Pay Later placement, drawer density, payment pending-state clarity, mobile reachability.
6. Order confirmation and account/signup: success hierarchy, order detail grid, next actions, split account form layout, benefits list, and terms/social-auth safety.
7. Responsive visual QA at 375px, 768px, 1024px, and 1440px before closing M16 visual polish.

Generated concept mockup translation:

- Home mockup reinforces the required first-screen rhythm: deep retail shell, image-led drop hero, trust strip, release/product modules visible immediately below, and footer depth. Do not ship a sparse hero-only homepage.
- Category mockup reinforces the PLP target: compact filters/sidebar on desktop, visible applied state, 4-column product grid where width allows, and image-led cards with short badges.
- PDP mockup reinforces the highest-priority commerce target: vertical desktop gallery rail, stable main image, dense facts, right purchase rail, trust grid, tabs, and real-data-only review/recommendation rails.
- Cart mockup reinforces that cart is a full management page: item rows/table on the left, summary/trust/payment on the right, and optional promo/progress banner only when supported.
- Minicart mockup reinforces drawer separation: overlay, narrow right panel, small item rows, sticky action area, primary checkout, secondary view cart, compact Pay Later/PayPal surfaces, and pickup as text hint only.
- Checkout mockup reinforces left-step/right-summary structure with secure checkout labeling, item thumbnails in summary, supported payment rows only, and bottom trust strip.
- Order-confirmation mockup reinforces captured-state hierarchy: success icon, thank-you headline, order number, next-step details, View Order, Continue Shopping, and guest save-order prompt.
- Account/sign-up mockup reinforces split art/benefits/form composition, visible labels, terms acceptance, and disabled/unavailable social auth unless OAuth is actually wired.

Mobile-friendly rules from `ui-ux-pro-max`:

- Treat mobile as the default layout and progressively enhance for tablet/desktop. Do not rely on desktop-first CSS that needs many max-width overrides.
- Test at 320px, 375px, 414px, 768px, 1024px, and 1440px. A slice is not closed if only one mobile width was checked.
- No horizontal page scroll is allowed. Use `max-width: 100%`, responsive grids, wrapped nav/action rows, and vertical card layouts for cart/checkout tables.
- Touch targets must be at least 44px by 44px for mobile interaction, especially quantity steppers, thumbnail buttons, filter controls, tabs, close buttons, breadcrumbs, footer links, and payment actions. Native radio/checkbox glyphs may stay visually compact only when their enclosing label/card is the actual 44px+ tap target.
- Category filters collapse into a drawer, sheet, accordion, or compact filter summary before products are pushed below the first mobile browsing pass.
- PDP mobile stacks gallery, key title/price/status, and primary purchase action before long descriptions, reviews, recommendations, or secondary rails.
- Cart mobile turns item rows into vertical cards and keeps the primary checkout path reachable without a sticky element covering content.
- Minicart mobile can become a full-height drawer or bottom sheet, but the primary Checkout action must remain visible and the item list must scroll independently from the action area.
- Checkout mobile keeps the active step and compact order/payment context reachable while long forms are active. Sticky payment bars must reserve bottom padding and never cover form fields.
- Account/sign-up mobile stacks art/benefits below or above the form without forcing a two-column layout. Form labels, terms checkbox, password controls, and submit feedback must remain visible.
- Forms must use explicit labels, correct `type`, `inputmode`, and `autocomplete`, visible required indicators, validation on blur where useful, and loading/success/error feedback after submit.
- Use controlled React form components and debounced/deferred handling for any future real search/filter text input.

### POP MART Design Tokens

Use these tokens as the starting point for CSS variables. Add new tokens only when a real component need is not covered.

Colors:

- `--pm-coral-red: #f42434` for primary retail CTAs, active nav, urgent drops.
- `--pm-candy-pink: #ff8ab3` for surprise/reveal accents and soft feature backgrounds.
- `--pm-lemon: #ffd75a` for new-drop markers, calendar highlights, and cheerful badges.
- `--pm-mint: #4ecf9a` for pickup availability, success, and ready states.
- `--pm-sky: #82cfff` for informational panels and payment-support surfaces.
- `--pm-lavender: #bda7ff` for account/order secondary accents.
- `--pm-warm-white: #fff8f3` for page background.
- `--pm-card: #ffffff` for primary cards and forms.
- `--pm-ink: #161616` for body text.
- `--pm-muted: #67615f` for secondary text.
- `--pm-border: #eadfda` for card borders and separators.
- `--pm-error: #a6111f` for destructive/error states.

Typography:

- Preferred web fonts: Rubik for headings, Nunito Sans for body/UI.
- Fallback: system sans-serif with the same weight scale.
- Headings should feel round and confident; avoid thin SaaS typography.
- Do not use viewport-width font sizing. Use fixed/rem/clamp ranges with clear min/max.
- Letter spacing should be `0` by default. Use uppercase labels sparingly.

Geometry and spacing:

- Page max width: 1200px for storefront/account pages unless a page contract says otherwise.
- Compact panels: 8px radius.
- Product/category/order/account cards: 12-14px radius.
- Tactile hero/category modules: 16px radius maximum.
- Official payment containers: use stable dimensions and do not add decorative deformation.
- Section spacing: 40-56px desktop, 28-36px mobile.
- Card gap: 12-20px depending on density.

Shadows and borders:

- Use soft retail depth: `0 10px 28px rgba(22, 22, 22, 0.08)` for elevated cards.
- Use subtle inset or border highlights for selected cards.
- Avoid dark heavy shadows, glass blur, and shadow-only affordances.

Motion:

- Hover/focus transitions: 150-300ms.
- Active button press may use color/brightness or slight inset shadow; avoid layout-shifting scale by default.
- Use `prefers-reduced-motion` to remove non-essential animation.
- Loading states for waits over 300ms must show skeleton, spinner, or disabled button label.

### Component Contracts

Buttons:

- Primary retail actions use coral red fill with high-contrast text.
- Secondary actions use white fill, coral border/text, and clear hover/focus states.
- Destructive actions are text or outline actions unless inside a confirmation dialog.
- Disabled buttons must show disabled styling and a reason when the action is important.
- Async submit buttons must disable during submission and change label or show spinner.

Badges and status chips:

- Use sticker-like chips for retail status: `New drop`, `Limited`, `Hot`, `Low stock`, `Ready for pickup`, `Pending payment`, `Delivered`, `Review available`.
- Chips must include text; color alone is never enough.
- Use one dominant chip per card plus secondary chips only when needed.

Cards:

- Product cards emphasize image, title, current/regular price, release status, and primary action.
- Account/order cards emphasize buyer task and status, not raw database structure.
- Store cards use a ticket style with address, phone, distance, available count, unavailable count, and partial-inventory callout.
- Cards that are clickable need pointer cursor, visible hover/focus, and accessible names.

Forms:

- Use visible labels for every input.
- Do not rely only on browser-native validation tooltips for demo-critical forms.
- Field errors must render inline and be announced with `role="alert"` or `aria-live`.
- Required fields should be marked with text or helper copy, not color alone.
- Account and checkout forms should preserve entered values on recoverable errors.

Loading, empty, and error states:

- Loading: use skeleton blocks or a compact spinner plus plain-language copy.
- Empty: explain what is missing and offer the next action when one exists.
- Error: show what failed, whether retry is possible, and avoid exposing secrets or raw stack traces.
- API-backed UI must cover loading, success, empty, and failure states in tests or manual evidence.

Official payment surfaces:

- Use official PayPal SDK-rendered buttons/messages where promised.
- Reserve stable layout space before SDK hydration.
- Do not restyle official buttons in a way that distorts brand shape, color, label, or eligibility behavior.
- For local sales-demo reliability, PayPal and Pay Later one-time buyer actions use SDK `presentationMode="modal"` instead of popup-dependent auto presentation.
- For Pay Later, use brief non-amount marketing copy on homepage/category and amount-aware messages on PDP/cart/minicart/checkout.
- Checkout selected Pay Later actions must keep the official message directly under the Pay Later button by explicitly fetching/applying PayPal message content; if PayPal presentment content fails, show concise buyer-safe fallback copy instead of leaving a blank message slot.

### Page-Level Contracts

Homepage:

- First viewport must feel like a collectible drop, not a generic marketplace.
- Hero is image-led with direct product/drop context.
- Hot sales, categories, release calendar, promo cards, and popular series must use distinct but restrained accent identities.
- Pay Later homepage copy is brief and non-amount-specific.

Category:

- Filter controls must be scan-friendly and show active counts.
- Product grid must preserve image dominance.
- Empty filtered state needs a reset action.
- Pickup availability filters stay disabled with a hint until a location context exists.

Product detail:

- PDP should feel like inspecting a collectible: large gallery, thumbnail rail, concise story/details, status badge, price, and action hierarchy.
- Unreleased products remain viewable but all checkout/payment actions are blocked or hidden with clear reason.
- PDP has no pickup hint.

Cart and minicart:

- Keep the payment/action area compact. Do not add competing pickup buttons.
- Pickup is communicated as text hint only: buyer chooses Pickup during checkout.
- Quantity controls must be obvious, stable, and connected to server-backed cart state.
- PayPal/Pay Later express actions are delivery-only and must be official SDK surfaces.
- Cart page visual accents live on merchant-owned hero, item-card, and order-summary surfaces only: warm panel gradients, thin rails, focus-within outlines, and summary chips are allowed; PayPal frame/button/message surfaces must not inherit decorative gradients or brand rails.
- Minicart opens as a true right-side drawer, not a floating card over active content: use a distinct shadcn Sheet overlay, visible panel edge/elevation, and one restrained brand accent rail while leaving PayPal-rendered buttons/messages visually undistorted.

Checkout:

- Use playful accents only for orientation: step badges, selected summaries, store tickets, promo/status callouts.
- Payment method rows and official PayPal surfaces must remain calm, stable, and readable.
- Checkout accents stay on merchant-owned hero, step cards, order summary, and trust strip through thin rails, warm summary panels, and text-backed state badges. Do not decorate `checkout-summary__slot` or any provider-rendered payment action/message.
- Only one accordion section is expanded at a time.
- Every collapsed saved section needs a concise buyer-readable summary and Edit action.
- Order Summary must update immediately for buyer-selected options when possible, then reconcile with backend totals.

Account settings:

- Account must feel like a buyer account hub, not an admin panel.
- Provide account-level navigation for `Orders`, `Addresses`, `Payments`, `Profile`, and later `Reviews`.
- Address cards should show label, recipient, formatted address, default badges, and actions with disabled reasons.
- Add/edit address should use a polished form panel or modal with inline validation, not browser tooltip-only validation.
- Saved payment rows should show payment type, status, and delete action with confirmation when destructive.

Order history and order detail:

- Order history uses retail cards, not a dense table.
- Each order card shows order number, date, fulfillment mode, status chip, total, thumbnail strip, and primary CTA.
- Pending orders show `Resume payment` as the primary CTA.
- Completed orders show `View details` and later `Review items` where eligible.
- Order detail shows a buyer-facing timeline: placed, payment, processing, shipped/delivered or pickup ready/completed.
- Do not show technical PayPal IDs, payment-session IDs, or internal database IDs in buyer order detail.

Guest order lookup:

- Lookup form asks for order number and email.
- Empty, invalid, not-found, and found states must be explicit.
- Guest order detail is read-only and should encourage account creation after successful lookup.

Admin Portal:

- Admin can be denser and more utilitarian than buyer UI.
- Admin still needs readable tables, filters, loading states, and sanitized debug views.
- Do not let Admin visual style leak into buyer account screens.

### Detailed Page Implementation Specs

These specs turn the page contracts above into implementation guidance. When a page is touched, use the matching section as the UI checklist.

Global app shell:

- Header uses a production retail layout: compact utility strip, logo/brand, supported discovery links, primary nav, account/wishlist/cart actions, and live cart count.
- Header should not expose admin or demo labels in buyer mode.
- Header may visually reserve room for richer discovery, but must not render an inert keyword search input. Add real search only with API and route support.
- Cart button shows a live count from the active server-backed cart.
- Active route state is visible through coral underline/fill, not only text weight.
- Mobile header may collapse nav, but cart and account entry remain reachable in one tap.
- Mobile header must stay compact: show a simplified POP logo mark, a supported browse/discovery entry, icon-only account, wishlist, cart, and menu controls with accessible names, then move product categories and utility links into a hamburger drawer. Do not render the desktop product-nav grid in the mobile header.
- Mobile header controls must keep at least 44px touch targets, 8px minimum gaps, no horizontal overflow at 320px, and `aria-expanded`/`aria-controls` on the menu button.
- Footer is part of the production-quality buyer shell: newsletter/account prompt, shop/help/about links, order/account recovery links, and restrained social/action area.
- Footer copy must not duplicate unsupported trust claims or PayPal claims.
- Global status messages use a polite live region or toast area and should read like buyer support copy, not logs.

Homepage:

- First viewport includes a collectible drop hero with real product/collection imagery, short launch copy, and one primary shopping action.
- Hero should hint at the next section on desktop and mobile so the page feels browsable, not like a static landing page.
- Mobile hero must be image-led: the hero image fills the card, the hero title/subtitle and compact CTAs sit over contrast-safe overlay text, and the hero image itself links to the featured drop route. Keep the buttons small enough that the toy image remains the primary first-view signal.
- Desktop can keep the trust strip high, but mobile must move the utility/trust strip below higher-value shopping content such as release calendar and product shelves. The first mobile viewport should prioritize toy imagery, release activity, or product discovery rather than utility cards.
- Home module order for this polish slice is hero, trust strip, release/calendar plus product shelf, category shelf, promo/event cards, popular series rail, then footer in DOM/desktop reading order. Mobile visual order may move release/calendar before the trust strip to protect first-view merchandising.
- Hot sales or product shelves use product cards with image, title, current/regular price when available, release status, and one dominant action.
- Category shelf uses tactile category modules with image, short category label, and item count or short description.
- Release calendar uses outlined circles for release dates, selected-date details, PDP links, and a text legend.
- Promo banners should behave like event/collection cards: clear title, short copy, optional CTA link, strong product image or accent, and stable height.
- Brief Pay Later message is amount-free and should not compete with merchandise modules.
- Loading state uses shadcn-style skeleton hero/cards for non-image surfaces; image surfaces should use eager hero loading, lazy non-hero loading, and a future low-resolution placeholder/high-resolution replacement path when final image derivatives exist. Empty curated sections show fallback curated copy and keep layout stable.

Category page:

- Top area shows current category/all-products context, category switcher with `All options`, sort control, and applied-filter count.
- Filter controls use chips or a compact drawer; selected filters remain visible after apply.
- Mobile sort/filter controls must compress without clipping at 320-375px. Prefer one current-sort control plus a shadcn Sheet or select-style control over a crowded horizontal strip; sheet options should read as clear 44px tap rows or selected chips.
- Product grid keeps consistent image ratio and stable card height for sale/current price, release status, and unavailable states.
- Discounted product cards must show a short text `Sale` badge in the top-right corner in addition to the current/regular price pair.
- Mobile category must show products in the first browsing pass. Do not render a long full filter sidebar above the grid at 375px.
- Pickup availability filter stays disabled until location context exists and includes a concise reason.
- Disabled product-card actions such as wishlist must either show a buyer-readable disabled reason/tooltip or be hidden until implemented; do not leave inert icon controls unexplained.
- Empty filtered state shows the applied filters, a reset action, and a link back to all products.
- API-down fallback mode must use the same generated slug/image set as PDP fallback data so product cards remain navigable and old fixture media never returns during Vite-only QA.
- Pay Later copy is brief and amount-free. Render official PayPal Pay Later messages directly in the page flow without a decorative outer card or nested wrapper chrome; the PayPal message itself is the visual artifact.

Product detail page:

- Desktop layout is breadcrumb, gallery left, purchase panel right, then details/reviews below; mobile places gallery first, then purchase panel and purchase actions before long descriptions.
- Gallery includes one large image, 3-4 thumbnails, keyboard-selectable thumbnails, and image alt text based on product/series. Desktop should prefer a vertical thumbnail rail beside the main image when space allows; mobile can keep thumbnails below.
- Gallery controls such as previous/next, zoom/enlarge, or 360-degree labels render only when implemented and accessible. Do not show inactive decorative controls.
- Product summary order is series eyebrow, title, a real status/vendor/review row, then truthful series/category chips. API-loaded vendor copy comes from the active storefront profile display name; fallback POP MART PDPs use the same profile-level vendor label rather than inventing product manufacturers. Purchase panel order is current/regular price, official Pay Later message directly under the price, supported purchase options, demo-safe scarcity where available, add-to-cart, secured PayPal express frame, and trust strip. A separate purchase-status/release-facts card should stay omitted until real product fields require it.
- Mobile PDP must keep the collectible gallery image-led, but the purchase rail should be density-aware: cap the gallery height, shrink thumbnail and purchase-option chrome, and keep the primary action reachable before lower story/review/recommendation content. If later polish needs the primary CTA visible in the first viewport without shrinking media further, use a reserved sticky purchase bar that does not cover PayPal messages, detail tabs, footer controls, or form content.
- Blind-box PDPs must present the price as the single-box price, then offer wired purchase options for `Random 1PC` and `Whole Box - 12PC no duplicates` when the cart can accept the selected quantity. Whole-box pricing can show a demo bundle saving only when the option updates the rendered amount, Pay Later amount, add-to-cart selection, and cart quantity together.
- Purchase panels can show scarcity/viewing prompts only as demo merchandising signals or real inventory/viewer data. Do not imply live stock telemetry unless implemented.
- If review data is absent, omit rating score rather than inventing one.
- If preorder economics data is absent, do not derive fake deposit or remaining balance from price and do not add redundant status panels to fill space.
- Right-side purchase rail should include price, quantity/action controls where supported, official Pay Later and delivery express surfaces where eligible, and trust grid. Quantity controls must be wired to real add-to-cart behavior before becoming editable.
- PayPal and Pay Later express buttons should sit inside an unclosed rounded frame labeled `Secured by PayPal`. If Pay Later is not eligible, the PayPal button fills the frame; if eligible, the frame uses available width to choose a two-column or stacked layout, with mobile stacking the two actions.
- Tabbed detail area should use semantic tabs for description/collector details, product facts, gallery, reviews, shipping/returns, and Q&A if useful. On mobile, shadcn/Radix tab roots and tab lists must be constrained to the content-card width, hide vertical overflow and native scrollbars, and allow horizontal tab scrolling inside the rail instead of clipping max-content tabs under the page. Empty states must not pretend to contain real buyer content.
- Collector details for blind-box products should include a concise story, a series-lineup panel, secret odds when they are demo-supported or data-backed, and icon-style spec highlights such as material/height/age/box type. Media goals such as front view, size comparison, package exterior, hidden silhouette, and material video stay in tracking/design until real assets exist; the PDP must not render text-only media placeholder cards that consume mobile viewport space.
- Lower commerce rails such as customer-review histogram, You may also like, and Recently viewed render only when backed by real review/catalog/recently-viewed data or existing demo state. Omit them rather than hardcoding unrelated fake products.
- PDP does not show pickup hint or store selection.
- Future/unreleased PDP shows status and release date, blocks add-to-cart and express actions with clear reason, and hides reviews.
- Reviews render only for released products and stay below the purchase decision area.

Cart page:

- Cart should match the reference table/card hybrid: breadcrumb, title with live item count, item rows with image/title/status/detail, price, quantity stepper, line total, remove action, and save-for-later only if implemented.
- Cart items use row cards: image, title, variant/status, quantity stepper, current/regular line price, remove action, and inline item error when needed.
- Quantity steppers must keep at least 44px touch targets and enough spacing at 320px mobile width.
- Quantity changes are optimistic only while the server request is in flight; failed updates roll back or preserve input with retry copy.
- Order summary shows merchandise subtotal, promo, tax, shipping placeholder or selected shipping, and total. It should read as a complete checkout summary, not a thin subtotal-only sidebar.
- Cart summary can include a free-shipping/progress banner only when backed by a real threshold or clearly demo-owned promo data.
- Summary card may include official PayPal delivery express checkout beneath the primary checkout action, preserving official button styling.
- Official PayPal and Pay Later delivery express actions sit inside the shared unclosed rounded frame labeled `Secured by PayPal`; the frame uses available width to choose two columns when both buttons fit and stacks on narrow cart/minicart widths.
- Trust badges should sit below the summary and use implemented capabilities only.
- Mobile cart keeps the primary checkout action reachable in the first cart-summary pass; if item rows push the summary down, use a compact summary/sticky action that does not cover content.
- Pay Later amount message uses current cart amount and updates when quantity changes.
- Official Pay Later messages render directly below the relevant amount/summary row without an additional decorative box around the PayPal message.
- Express PayPal/Pay Later buttons are official delivery-only SDK surfaces.
- Express loading or unavailable states must be labeled by payment method or visually consolidated so two pending SDK surfaces do not read as duplicated broken copy.
- Pickup appears only as a text hint: `Prefer pickup? Choose store pickup during checkout.`
- Empty cart suppresses checkout, Pay Later message, PayPal express, and Pay Later express controls; show one return-to-shopping action instead of `$0.00` payment prompts.

Minicart:

- Drawer is anchored inside the viewport on desktop and mobile; open drawer should not mount offscreen.
- Open drawer needs enough backdrop, panel edge, or elevation to separate it from underlying cart content and prevent background actions from visually competing with drawer actions.
- Each item row includes thumbnail, title, quantity stepper, line amount, and remove/decrement behavior.
- Action area contains View cart, Checkout, official PayPal delivery express, official Pay Later delivery express, amount-aware Pay Later message, and pickup hint.
- Official Pay Later messages render as direct PayPal message surfaces, not as boxed cards inside the drawer.
- Official PayPal and Pay Later delivery express actions use the same `Secured by PayPal` frame as PDP/cart, with minicart stacking when the drawer width is narrow.
- Keep button density under control: no pickup button and no duplicate checkout action labels.
- Mobile minicart should prioritize item confirmation, one primary Checkout action, secondary View cart, then compact delivery express surfaces; repeated loading copy should collapse into one clear pending state when SDK readiness is not available.
- On XS/S mobile drawers, item rows and the checkout/payment panel must scroll independently. Keep the item list large enough to confirm multiple items, and cap the checkout/payment panel height so Pay Later/PayPal/pickup copy stays reachable without crowding the item confirmation area.
- Empty state shows a friendly message and one return-to-shopping action, with checkout and payment controls hidden.

Checkout Delivery:

- Checkout should match the reference left/right rhythm: breadcrumb and secure-checkout label, left-side step cards, right-side order summary with item thumbnails and totals, and bottom trust strip.
- Initial state expands Shipping address only.
- Shipping address form shows saved/default address when available, otherwise editable fields.
- Submit disables the button immediately, saves through backend, and collapses to a compact summary immediately so the buyer is not left staring at the full form while totals recalculate. Keep saving/recalculating state semantic and testable, but do not show visible `Saved`, `Editing`, `Saving`, or `Recalculating` chips in the card header.
- Billing starts with `same as shipping` checked after shipping is saved; buyer can uncheck to reveal separate fields.
- Billing submit follows the same immediate compact-summary/edit pattern and expands Shipping options after backend reconciliation.
- Shipping options start unsaved; cheapest eligible option is selected by default after destination is known.
- Changing a shipping option updates Order Summary immediately, then backend reconciliation is reflected after submit.
- Payment method section opens only after required delivery steps are saved.
- Official payment action appears only when Payment is active and a method radio is selected.
- Payment method icons or rows must come from supported eligibility data. Do not add fake Visa/Mastercard/Apple Pay visuals beyond implemented payment rows.
- Place Order / payment action belongs in the order-summary/payment area only when the payment section is unlocked and a method is selected.

Checkout Pickup:

- Guest initial state shows ZIP/postcode input only; no default-address checkbox, no preselected store, and no store summary.
- Guest submits ZIP/postcode, then an accessible store-list modal opens with active-market stores only.
- Logged-in buyer starts with nearest/default-address store preselected and a Change store action.
- Store list cards show name, address, phone, distance, available count, unavailable count, and full/partial inventory status.
- Selecting a partial store updates Order Summary with ready-for-pickup and not-available-at-this-store sections before payment.
- Billing follows store selection and uses the buyer default address for logged-in buyers when appropriate; guests fill billing address.
- Pickup calendar appears after billing, uses store-specific pickup dates, blocks unavailable/past dates, and rolls stale seed/demo date windows forward from the current checkout date so the buyer never sees past-only pickup choices.
- The first available pickup date is the default selected calendar value and must submit even if the buyer does not manually click the date.
- Payment method section opens only after store, billing, and pickup date are saved.

Express Review and Confirm:

- Used only for PayPal/Pay Later express started from PDP, cart, or minicart.
- Page shows final synchronized items, shipping address, selected shipping option, promo, tax, total, and amount-guard status.
- Confirm button is the only action that triggers capture.
- If amount guard fails, keep capture blocked and show buyer-safe retry/support copy plus merchant debug reference.
- Success state shows buyer-facing order number and next-step delivery message, not raw provider IDs.
- Captured state should visually shift into an order-confirmation page: success icon, `Thank you` hierarchy, buyer-safe order number, confirmation email/status note, order details grid, product recommendations only if backed by real product data, and View Order / Continue Shopping actions.
- Captured state must not keep the disabled `Confirm and pay` button as a dominant visual element.
- Confirmation copy must not expose internal database IDs, raw payment-session IDs, or raw debug fields. PayPal capture ID may remain in a clearly secondary receipt row when useful for demo evidence.

Account settings:

- Account uses buyer hub navigation: Orders, Addresses, Payments, Profile, and later Reviews.
- Profile panel shows email and lightweight account info without admin/internal IDs.
- Address cards show label, recipient, formatted address, default shipping/billing badges, Edit, Delete, and Make default actions.
- Add/edit address uses inline validation and a checked-by-default `Save to address book` behavior where relevant checkout flows later hand off to account.
- Guest lookup, address, and review forms use shadcn field primitives with visible labels, CSS-rendered required markers, mobile keyboard hints, `autocomplete`, and touch-friendly submit/cancel buttons.
- Deleting a default-only address is disabled with reason; destructive delete asks for confirmation.
- Saved payment cards show method type, display name/last digits where available, status, and delete with confirmation.
- Account/sign-up surfaces should match the reference split composition when shown outside a small modal: product/character art and buyer benefits on one side, tabbed sign-up/login form on the other.
- Benefits copy should use implemented or demo-safe capabilities only: faster checkout, order updates, wishlist/account recovery where those surfaces exist.
- Terms checkbox must be visible before account creation.
- Social auth options must be omitted, disabled, or explicitly marked unavailable unless OAuth is wired.

Order history:

- Order history uses retail cards instead of tables.
- Each card shows order number, date, fulfillment mode, status chip, total, thumbnail strip, and one primary CTA.
- Pending orders show Resume payment and explain that totals/promos may be refreshed.
- Completed orders show View details and Review items when eligible.
- Empty order history invites browsing products and, for guests, suggests guest lookup if they checked out without an account.

Order detail:

- Detail page shows timeline, fulfillment summary, item list, totals breakdown, payment status, and review eligibility.
- Delivery orders show shipping address, selected option, and delivery lifecycle.
- Pickup orders show store, pickup date/window, ready/unavailable split when applicable, and pickup lifecycle.
- Completed order item rows expose review action only once per item unless editing is supported.
- Technical IDs stay hidden from buyer detail; Admin/debug pages can expose sanitized provider references.

Guest order lookup:

- Form asks for order number and email with visible labels and inline validation.
- Not-found response is the same for wrong email and missing order number.
- Found state shows read-only order detail and account-registration encouragement.
- Loading and retry states preserve entered values.

Admin Portal:

- Admin route stays manually reachable through `/admin`; no buyer header label is needed.
- Admin surfaces orders, webhooks, inventory, and lifecycle only in v1 scope.
- Admin uses denser tables, filters, copied debug IDs, sanitized PayPal snapshots, and lifecycle actions.
- Admin does not adopt toy-like buyer styling beyond basic brand coherence.

### UX Flow Contracts

These flows must be reflected in tests and browser evidence when implemented.

Account sign-in/register:

- Entry: Sign in button, checkout account prompt, or confirmation-page registration prompt.
- Email-first modal checks whether the email exists.
- Existing email shows password sign-in; new email shows password registration.
- Successful sign-in/register restores session, merges guest cart into account cart, and keeps the buyer on the same route.
- Failure keeps the modal open, preserves email, and shows inline buyer-safe error.

Cart persistence and checkout entry:

- Guest browser stores only opaque `cart_public_id` and `cart_client_secret`.
- Refresh, route navigation, minicart open, checkout entry, and express entry all restore or refresh server cart before using totals.
- Missing or incomplete cart binding blocks checkout/payment with buyer-safe "cart is syncing" copy instead of fixture IDs.

Delivery checkout accordion:

- Shipping saved -> Billing editing -> Billing saved -> Shipping option editing -> Shipping option saved -> Payment editing.
- Edit on a saved section expands only that section and collapses others.
- Editing an upstream section marks downstream totals as recalculating or stale until backend reconciliation completes.
- Order Summary updates immediately for local choices where safe, then reconciles to backend totals.

Pickup checkout accordion:

- Guest ZIP/postcode -> store modal -> selected store summary -> billing -> pickup calendar -> payment.
- Logged-in preselected store -> optional Change store modal -> submit store -> billing -> pickup calendar -> payment.
- Partial inventory stays visible in store picker and Order Summary before payment.
- Original cart intent remains intact when unavailable pickup items are excluded from payable amount.

Payment method selection:

- Payment rows appear only in the Payment section.
- PayPal selected renders only PayPal official action under Order Summary.
- Pay Later selected renders Pay Later official action and amount-aware Pay Later message under Order Summary.
- Card selected expands card fields and pay button inside the payment section, never in mobile sticky bar.
- Wallet rows render only when runtime eligible and hide otherwise.

Pending order resume:

- Entry: Order history Pending card.
- Resume loads the order snapshot, revalidates prices, inventory, pickup dates, shipping, tax, and promos.
- Expired pickup dates require a new date before payment.
- Promo evaluation runs fresh and explains changed accepted/rejected results.
- Resume payment creates a fresh payment session when the old one is expired or invalid.

Completed order review:

- Entry: completed order card or order detail item row.
- Buyer can review only items from completed orders.
- Review form is item-scoped, preserves draft input on failure, and updates PDP review display after success.
- If editing/deleting reviews is not implemented yet, the UI must say so through absence of controls, not broken buttons.

Guest order lookup and registration:

- Guest searches with order number and email.
- Found order stays read-only.
- Confirmation and found lookup states encourage account creation.
- Registering with the same email links matching guest orders to the account after verification/login.

### Frontend Slice Acceptance Gate

Before any frontend slice is closed:

- `DESIGN.md` page/component contract has been checked and updated if needed.
- `tracking/test-cases.md` has acceptance rows for visual state, interaction state, async loading/error state, and responsive behavior.
- Component or interaction tests cover important state transitions where practical.
- Computer Use or Browser/Playwright evidence is captured for customer-facing pages.
- Screens are checked at minimum 375px mobile and 1024px desktop for the touched area.
- Official PSP surfaces are verified in browser when the slice touches PayPal, Pay Later, card, Apple Pay, Google Pay, or Venmo placement.
- Any shell-only UI remains unchecked in `IMPLEMENTATION_TASKS.md` and explicitly deferred in tracking.

## Visual System Rules

- Favor product imagery, collectible character art, and retail merchandising density over abstract decorative effects.
- Use a multi-accent POP MART profile palette instead of a one-accent red/white system: coral red for primary CTAs, candy pink for surprise/reveal accents, lemon yellow for drops/new arrivals, mint green for pickup/availability, sky blue for informational/payment-support surfaces, warm white for page background, and deep ink for body text.
- Use color as modular section identity, not page-wide noise. Homepage modules, category chips, release calendar markers, promo cards, and inventory badges can each carry a small accent; product photography must remain the hero.
- Use rounded, tactile, toy-like geometry where it improves delight: product cards, category pills, badges, and store cards can use 10-14px radii, soft shadows, and sticker-like tags. Checkout/payment controls should stay calmer and more utility-focused.
- Badges should feel like retail stickers or collectible labels: `Limited`, `Hot`, `New drop`, `Low stock`, `Ready for pickup`, and `Not available at this store` should be compact, high-contrast, and text-based.
- Prefer gentle hover/focus feedback: color shift, border highlight, soft lift, or shadow change in 150-300ms. Do not rely on hover-only behavior for touch users.
- Typography should feel rounder than a generic SaaS UI. POP MART profile should prefer Rubik for headings and Nunito Sans for body/UI if web font loading is acceptable; otherwise keep system fonts but increase heading weight, friendliness, and spacing through CSS.
- Avoid heavy glassmorphism, blurred translucent panels, large gradients, and decorative orbs; these reduce readability and do not match the POP MART storefront goal.
- Avoid making the storefront look childish, carnival-like, or overloaded. The target is collectible retail energy, not a kids app.
- Use restrained motion: hover/focus transitions around 150-300ms, with `prefers-reduced-motion` support.
- Use icon buttons where the action is familiar, with accessible labels/tooltips.
- Preserve space for async Pay Later messages and payment buttons so layout does not jump when PayPal eligibility finishes loading.
- Text contrast must meet at least 4.5:1 for normal text. Do not communicate inventory, promo, release, or error state by color alone.

### POP MART Profile Visual Language

Homepage:

- Hero should feel like a blind-box drop or collection launch, not a generic ecommerce banner.
- Header should feel like a real retailer: a compact utility strip, visible search, account/wishlist/cart actions, and active category navigation.
- The first viewport should combine a cinematic hero with a trust strip and a visible hint of release/product modules below.
- Hot sales and popular series should use vivid but controlled labels such as `Trending`, `Limited`, `Last chance`, and `New drop`.
- Category cards should feel like capsule/toy-shelf entries with strong images, short labels, and soft colored backgrounds.
- New arrivals calendar should read as a drop calendar; outlined release dates can use small sticker-like markers with text labels.
- Promo banners should feel like collectible event cards rather than plain information panels.
- Footer should feel production-ready: newsletter, key shop/help/about links, social/action area, and brand/collection credibility where appropriate.

Category and PDP:

- Product cards should show clear current/regular price, release status, sale labels, and pickup availability without turning the whole grid into a dense table.
- PDP should feel like inspecting a collectible: large gallery, thumbnails, concise story/details, status/vendor/rating row, price, trust strip, tabbed details, status badge, and strong add-to-cart/payment hierarchy.
- Pre-order or unreleased products should expose buyer-relevant economics in a structured panel when data is available: deposit, remaining balance, and estimated release. If data is unavailable, do not fake financial terms.
- Unreleased products should stay visually exciting but have unmistakable disabled purchase states and no reviews.

Cart, minicart, and checkout:

- Cart/minicart can carry small pickup and Pay Later callouts, but should not become visually crowded with buttons.
- Checkout should inherit the playful brand through accents, step badges, and selected summaries, but payment rows and official PayPal surfaces must remain stable and readable.
- Pickup store cards can feel like store tickets: address, phone, distance, available/unavailable counts, and partial-inventory note in a compact, scannable block.
- Pickup store tickets must use a real Card-like surface, a visible availability rail, a distance/status badge, phone number, address, two-count availability grid, and explicit partial-inventory note when unavailable quantities remain in the cart. Use the same anatomy for the inline Store selection step and the selectable store-picker modal.

## Accessibility And Form Rules

- Every meaningful product, banner, and category image needs descriptive alt text.
- Form errors use `role="alert"` or `aria-live` and should move focus to the first invalid field after submit.
- Accordions move focus to the newly expanded step after successful submit.
- Use appropriate mobile keyboards: `inputmode="numeric"` for ZIP/postcode where applicable, phone, quantity, and numeric verification fields.
- Sticky header and sticky bottom payment bar must not cover page content; reserve matching top/bottom padding.
- Calendar dates, inventory status, promo results, and lifecycle states must use text or icons in addition to color.

## Homepage

Homepage includes:

- Hero
- Hot sales
- Categories
- New arrivals calendar
- Brief Pay Later promo without amount
- Promo/banner cards
- Popular series
- Footer

Hot sales and popular series use curated seed flags.

### New Arrivals Calendar

- Interactive date selection.
- Dates with release activity use an outlined/unfilled circle.
- Selected date shows related release products.
- Product cards link to PDP.
- Future release products are viewable but not purchasable.
- Include a compact legend for release status markers so outlined circles and color dots are not the only explanation.
- Keyboard users can move between dates and open the selected date's product list.
- Mobile release calendars must remain inside the viewport at 320px and 375px. If rendered through shadcn `Calendar`, constrain the month grid to seven `minmax(0, 1fr)` columns and avoid table cell minimums that create horizontal page scroll.
- Sticky headers must remain above release-calendar content in the stacking order; calendar/date cells should not visually cover the header while scrolling.
- Route and product-loading states should use shadcn `Skeleton` blocks for non-image content while image containers use the progressive/LQIP path when final derivatives exist.

Future-release PDP:

- Status: not released / coming soon.
- Add to cart blocked.
- PayPal/Pay Later blocked or hidden.
- Reviews hidden.
- Preorder payment semantics are future phase.

## Category Page

V1 has filters only, no keyword search.

Filters:

- price
- availability
- category
- release status
- pickup availability

Pickup filter:

- enabled for logged-in buyer with default address or guest with ZIP/postcode
- disabled with hint if no location context exists
- Filter drawers and chips show applied count and provide a clear reset action.

## Product Detail Page

PDP focuses on the item.

Includes:

- 3-4 image gallery
- product introduction
- product status
- current/regular price display
- amount-aware official Pay Later message when purchasable
- add to cart
- PayPal express button for delivery only
- Pay Later express button for delivery only
- reviews for released products

No pickup hint on PDP.

## Cart And Minicart

PDP/cart/minicart PayPal and Pay Later buttons are delivery express only.

Cart:

- cart items and quantities
- table/card hybrid row layout with product thumbnail, title/detail, price, quantity, total, remove action, and optional implemented save-for-later action
- full order-summary card with subtotal, shipping, tax, total, primary checkout action, official PayPal delivery express surface, and implemented trust badges
- free-shipping or promo progress only when backed by real threshold/demo promo data
- amount-aware Pay Later message
- checkout button
- secured PayPal delivery express frame containing the official PayPal button and eligible official Pay Later button, with SDK custom elements given stable 44px+ render boxes
- desktop and tablet cart summary layouts should give the secured PayPal frame enough width for PayPal and eligible Pay Later to sit side by side; mobile and narrow containers stack the official buttons
- text hint that Pickup can be selected on checkout page before payment
- empty-cart state hides checkout/payment actions and points the buyer back to products

Minicart:

- compact item summary
- quantity controls for each editable line item, with 44px minimum touch targets
- amount-aware Pay Later message
- view cart / checkout
- secured PayPal delivery express frame containing official PayPal/Pay Later buttons when the cart has items; drawer/narrow layouts stack the official buttons
- short pickup hint
- no store selector
- empty-minicart state hides checkout/payment actions and points the buyer back to products
- no pickup button

## Checkout

Checkout is one `/checkout` page with top-level tabs:

- Delivery
- Pickup

Each tab has its own accordion flow. Order Summary stays visible and reflects active tab draft totals/context.

Reference-level checkout layout:

- breadcrumb and secure-checkout label above the page title
- left column contains step cards for shipping/pickup address, shipping/pickup method/date, and payment method
- right column contains order summary with product thumbnails, quantity, item amount, promo entry when supported, subtotal, shipping, tax, total, and selected payment action
- bottom trust strip uses implemented capabilities only
- mobile keeps order context reachable while long forms are active and does not cover fields with sticky payment actions
- before the payment step is active, Order Summary does not show a payment placeholder or reserved PayPal panel. Payment controls appear only after the payment step is active and a method is selected.
- checkout form controls use the shadcn `FieldGroup`/`Field`/`FieldLabel`/`Input`/`Checkbox` pattern, visible required markers, correct `autocomplete`/`inputMode`/`type` metadata, and inline validation/status copy rather than browser-tooltip-only form state
- Runtime checkout summary itemizes active cart items when available and caps the visible list before `+N more` copy so mobile order context stays compact.
- Promo UI must not fake manual code entry or indefinite calculation. Until manual promo application is wired, checkout shows neutral `No promo applied` copy unless a real selected code or discount is returned by the backend.
- Trust-strip labels are limited to implemented demo capabilities: official provider-owned payment surfaces, recalculated totals, delivery/pickup selection, and order recovery.

Accordion interaction contract:

- Only one checkout section is expanded in the active tab at a time.
- Initial Delivery state expands Shipping address only; all later sections are collapsed previews.
- Initial Pickup guest state expands Pickup location only; all later sections are collapsed previews.
- Initial Pickup logged-in state shows the preselected store summary in Store selection and lets the buyer change it from a store picker modal.
- Pickup guest state must not show a selected store, default-address checkbox, or store summary before the buyer submits ZIP/postcode and confirms a store from the modal.
- Pickup seeded defaults must match the active market; US checkout must not show GB postcode/store defaults, and GB checkout must not show US ZIP/store defaults.
- Pickup store selection must show nearby stores only after ZIP/postcode or saved-address lookup succeeds. Inline and modal cards must expose `data-pickup-store-ticket`, `data-inventory-state`, and an accessible `Pickup inventory for {store}` label. When server cart lines are available, inventory is shown per cart item with `In stock`, `Only N available`, or `Sold out` status, plus direct per-store Select buttons in the modal so buyers do not need to scroll to a footer confirmation.
- Submitting a section immediately collapses that section into a concise summary while the backend save/recalculation runs, then expands the next actionable section after reconciliation succeeds.
- Editing a submitted section expands only that section, collapses the others, and marks downstream totals as needing recalculation where applicable.
- Collapsed submitted sections show a compact buyer-readable summary plus an icon-only pencil Edit action. Do not repeat field labels such as `Full name` or state labels such as `Saved`.
- Accordions move focus to the newly expanded step after successful submit or edit.

Checkout steps must define these UI states:

- idle
- saving
- saved/collapsed
- editing
- recalculating totals
- blocked/error
- locked after payment session starts

Before payment session:

- buyer can switch tabs
- Delivery/Pickup states are preserved separately
- Order Summary updates to active tab

After payment session/order:

- active fulfillment mode is locked
- switching requires abandoning current payment attempt

### Delivery Flow

1. Shipping address.
2. Submit shipping address.
3. Billing expands.
4. Same as shipping checked by default.
5. Buyer explicitly submits billing.
6. Shipping options expand.
7. Cheapest option selected by default.
8. Buyer submits shipping option.
9. Payment method expands.

### Pickup Flow

Logged-in buyer uses default address for ranking. Guest enters ZIP/postcode first.

Guest flow:

1. Pickup location expands with ZIP/postcode input.
2. Buyer submits ZIP/postcode.
3. Store picker modal opens with ranked pickup stores for the active market.
4. Buyer selects a store in the modal.
5. Store selection collapses to the selected store summary.
6. Billing expands.
7. Buyer explicitly submits billing.
8. Store-specific pickup calendar expands.
9. Buyer selects date and submits.
10. Payment method expands.

Logged-in buyer flow:

1. Store selection starts with the nearest store preselected from the default shipping address, even if partial inventory.
2. Buyer can click Change store.
3. Store picker modal opens with ranked pickup stores.
4. Buyer keeps the preselected store or chooses another store.
5. Buyer submits store.
6. Billing expands.
7. Buyer explicitly submits billing.
8. Store-specific pickup calendar expands.
9. Buyer selects date and submits.
10. Payment method expands.

Store picker modal:

- Opens from guest ZIP/postcode submit or logged-in Change store.
- Uses an accessible dialog with labelled title, close action, keyboard access, and focus return to the triggering control.
- Filters/ranks stores from the active market only.
- Store cards show store name, address, phone, distance, available item count, unavailable item count, and full/partial inventory status.
- Store cards are selectable controls, not static cards.
- Confirming a selected store updates Pickup Order Summary before payment.

### Partial Pickup

Order Summary has:

- Ready for pickup
- Not available at this store

Unavailable items:

- excluded from BOPIS payment amount
- remain in original cart
- do not decrement store inventory

Store cards must show available and unavailable item counts before the buyer submits the store. If a store is partial, the callout must say that unavailable items stay in the original cart.

## Payment Method UX

Payment section uses radio-first layout.

Rules:

- PayPal selected by default if eligible.
- PayPal selected: standalone official PayPal button under Order Summary on desktop/tablet, or inside the mobile sticky payment bar on mobile.
- Pay Later radio row stays compact with brand/logo labeling only; amount-aware Pay Later messaging belongs with the selected Pay Later action under Order Summary or the mobile sticky payment surface.
- Pay Later selected: standalone official Pay Later button with the official amount-aware Pay Later message directly below it under Order Summary on desktop/tablet, or inside the mobile sticky payment bar on mobile.
- Apple Pay selected: official Apple Pay button under Order Summary when eligible.
- Google Pay selected: official Google Pay button under Order Summary when eligible.
- Venmo selected: official Venmo button under Order Summary when eligible.
- Ineligible wallet rows are hidden and do not render Order Summary or sticky actions. Google Pay must stay runtime-gated until the PayPal Google Pay session and Google PaymentsClient are both available.
- Card selected: card fields expand in payment section; card pay button is inside card box.
- Order Summary reserves stable space only after a selected non-card provider action is active; before payment selection, there is no payment placeholder panel.
- Selected Pay Later action reserves stable space for PayPal message rendering and shows buyer-safe fallback copy if PayPal presentment content is unavailable or renders empty.
- Mobile: selected non-card action appears in sticky bottom payment bar.
- Mobile sticky bar shows only one selected non-card payment action at a time.
- Mobile sticky bar reserves space for the selected method label, total, button, and any required Pay Later message without overlapping content.
- Card payment never moves into the sticky bar; its pay button stays inside the card fields box.

## Cart + Checkout A+ Polish Contract

Approved direction: `A+ Compact Retail Flow`, selected on 2026-07-03 from the Superpowers visual companion mockup. The focused spec is `CART_CHECKOUT_A_PLUS_SPEC.md`.

Cart A+:

- Cart is product-first: item imagery, names, quantities, prices, fulfillment/status copy, and line amounts appear before payment education.
- The full checkout CTA is visually dominant. Delivery express PayPal/Pay Later is a secondary path below it, not a competing first action.
- Summary placeholder copy must be buyer-safe and specific, such as `Calculated after Delivery/Pickup` or `Calculated in checkout`; avoid vague `Next` labels.
- Pay Later messaging stays near the cart amount/summary context and renders as official PayPal message content or a buyer-safe fallback only.
- Mobile cart must keep item media visible in the first browsing pass before any large payment frame, Pay Later explanation, or long trust copy.
- Checkout entry from cart must restore/refresh the active server cart binding, preserve cart count/minicart contents, and initialize checkout summary from the restored cart before payment selection.

Checkout A+:

- Keep the existing Delivery/Pickup tab architecture and separate accordion state machines.
- Add compact progress context near the active checkout panel, such as `Delivery - Billing - 2 of 4`, without adding bulky status chips.
- Order Summary must include product thumbnails, item quantities, item amounts, capped `+N more` copy for longer carts, promo state, shipping/tax state, and total.
- Before the payment section is active and a method is selected, Order Summary has no reserved PayPal panel, no official provider placeholder, and no empty payment box.
- A+ supersedes older checkout blank/payment-pending placeholder language. Do not render explanatory payment placeholder panels or reserved provider slots before payment unlock and selected method.
- Collapsed submitted sections show concise buyer-readable summaries plus one accessible icon-only edit action.
- If an upstream section is edited after payment selection, selected provider actions clear, hide, or become clearly pending until backend reconciliation completes and active totals are current.
- Compact progress context updates after submit, edit, backtracking, and fulfillment-tab switches.
- The bottom trust strip should be compact and limited to implemented capabilities: official provider-owned payment surfaces, recalculated totals, Delivery/Pickup choice, and order recovery.

Mobile A+:

- Mobile checkout keeps order context reachable during long forms through a compact summary, sticky total/action, or summary disclosure that does not cover fields.
- Sticky action uses `env(safe-area-inset-bottom)` and matching page padding so it never covers form fields, PayPal messages, footer content, or modal controls.
- Selected non-card payment shows exactly one sticky provider action on mobile.
- Sticky actions are hidden, disabled, or repositioned while open dialogs/sheets, pickup store modal controls, focused form fields, validation targets, or mobile keyboard/safe-area constraints would otherwise compete with them.
- Pay Later selected on mobile reserves stable space for both the official button and official message or buyer-safe fallback.
- Card payment remains inline in the card fields box and never moves into the sticky bar.

PayPal A+:

- Do not copy visual mockup PayPal buttons literally. Runtime uses official SDK-rendered PayPal, Pay Later, wallet, and card surfaces.
- Merchant CSS may size SDK custom elements and wrapper slots for stable layout, but must not style PayPal SDK internals, iframes, shadow DOM, or official button/message internals.
- Ineligible wallet rows are hidden and leave no stale selected action or reserved slot.
- Missing cart/draft binding blocks create-order with visible buyer-safe syncing/retry copy.
- If cart binding, checkout draft, payment eligibility, or active totals are loading, stale, missing, failed, or recalculating, selected provider actions are hidden or disabled with buyer-safe retry/sync copy and no PayPal create-order call is made.
- Pay Later amount, eligibility, official message, and fallback copy refresh after cart quantity, fulfillment, shipping, pickup store, pickup date, promo, tax, or selected-payment changes.

Guests cannot save payment methods.

Vaulting:

- Eligible logged-in PayPal selected: unchecked save checkbox under PayPal button.
- Eligible logged-in card selected: unchecked save checkbox inside card box.
- No save checkbox for Pay Later / Apple Pay / Google Pay / Venmo unless official support is confirmed.

## Express Review And Confirm

Applies only to PayPal/Pay Later express started outside full checkout from PDP/cart/minicart.

Route: `/checkout/express-review?paypal_order_id={paypalOrderId}`.

Flow:

1. Buyer clicks the official PayPal/Pay Later express button.
2. The SDK create-order callback sends the active cart public binding and backend creates a delivery PayPal order.
3. PayPal shipping/order update flow settles address, shipping, promo, tax, and amount.
4. Buyer returns to merchant Review and Confirm.
5. Page loads `GET /api/paypal/orders/express-review` and shows final synchronized item, shipping, promo, tax, total, and amount-guard snapshot.
6. Buyer confirms.
7. Backend verifies the locked amount snapshot and captures.
8. Successful capture updates the order/payment-session state, writes Admin/debug snapshots, decrements inventory, and clears only paid cart items.

Full checkout does not add a separate Review and Confirm page.

Captured-state reference layout:

- success icon/check and `Thank you` headline
- buyer-safe order number card and confirmation email/status note
- order details grid with order number, payment method/status, shipping method, estimated delivery or pickup details where available
- recommended products only if real catalog product data is available
- View Order and Continue Shopping actions
- guest Save Order prompt stays reachable and may open account creation/sign-in
- no dominant disabled Confirm and Pay button after capture

## Promo, Tax, Shipping

### Calculation Order

1. Product `current_price`.
2. Merchandise subtotal.
3. Promo discounts on merchandise subtotal only.
4. Taxable merchandise subtotal after eligible promos.
5. Estimated tax.
6. Shipping fee.
7. Final total.

Shipping fee is excluded from promo and tax calculations.

### Promo UX

- Inline in Order Summary.
- "Add promo code" collapsed behind link.
- One eligible promo set auto-applies, buyer can remove/change.
- Multiple valid sets show recommended best option and alternatives.
- Manual code shows accepted/rejected/conflict result.
- Recalculation states should use plain language such as "Checking offers for this address..." and must not block unrelated form edits.
- Buyer-facing promo explanations stay concise; Admin Portal shows detailed selected/rejected promo reasons.

Promo evaluation snapshots store matched/rejected promos, compatible sets, discount amounts, taxable effects, totals, and timestamp/version.

## Orders

- Order is created when payment session/order is created.
- Pending means payment session started but not completed.
- Cart is not an order.
- Checkout draft is not an order.

Completed payment:

- clears paid active cart items
- decrements central inventory for delivery
- decrements selected store inventory for paid BOPIS items

Pending resume:

- uses pending order snapshot, not current active cart
- revalidates item availability, prices, inventory, shipping/pickup details, pickup date, tax, and promos
- creates fresh payment session if existing one is expired/invalid

## Account And Guest

### Auth

Email-first modal:

- enter email
- existing account shows password
- new account shows password registration
- registration collects email and password only
- full-page or expanded account creation should follow the reference split layout: product/character art and buyer benefits on one side, sign-up/login form on the other
- the email-first auth modal uses shadcn `Dialog`, `Tabs`, `Field`, `Input`, `Checkbox`, and `Button` primitives for the new-account state
- desktop registration in the modal shows the product/character art plus benefits beside the form; mobile stacks form controls first and moves art/benefits below, with optional art hidden when space is tight
- benefits may mention faster checkout, order updates, wishlist/account recovery, and saved details only where implemented or clearly demo-safe
- social-auth buttons are omitted, disabled, or marked unavailable unless OAuth is wired
- account creation requires visible terms acceptance before submit
- password visibility controls are explicit and reversible; submitting registration without terms acceptance shows inline buyer-readable error copy before any auth request is made

### Guest Checkout

- Guests can complete delivery and BOPIS checkout.
- Guests cannot vault/save payment methods.
- Guest lookup uses order number + email.
- Guest order detail is read-only.
- Confirmation page encourages inline account creation.
- After registration/login with verified email, matching guest orders link to account.

### Account Settings

Sections:

- Profile info
- Address book
- Saved payment methods
- Order history
- Reviews submitted

Address book:

- shared across profiles
- one address can be default shipping and billing
- default address cannot be deleted until another default is selected
- checkout save-to-address-book checkbox checked by default

Saved payment:

- user-level, shared across profiles
- capture can create active or pending saved-payment states for authenticated save-for-future buyers
- verified vault-created webhooks promote pending saved payments to active
- delete action calls PayPal Payment Method Tokens delete when a vault ID exists
- verified vault-deleted webhooks reconcile deleted local state
- simple confirmation dialog

Order detail:

- buyer-facing with status timeline
- no technical IDs

## Reviews

- PDP shows seeded and submitted reviews.
- Reviews are product-scoped.
- Buyer submits reviews from completed order detail only.
- One active review per user/order item.
- Buyer can edit/delete reviews.
- Deleting reopens review eligibility.

## Inventory

- Central inventory for delivery.
- Store inventory for BOPIS.
- No true reservation during checkout.
- Delivery paid order decrements central inventory.
- BOPIS paid order decrements selected store inventory for paid pickup items.
- Inventory is revalidated before payment and on pending resume.

## BOPIS Payment Semantics

Pickup checkout uses a capture-at-checkout PayPal order with explicit store pickup Create Order fields. The buyer flow must not route through the authorize-at-checkout/capture-at-pickup pattern in v1.

Required Create Order semantics:

- `intent: "CAPTURE"`
- `shipping_preference: "SET_PROVIDED_ADDRESS"` under PayPal experience context
- `purchase_units[].shipping.type: "PICKUP_IN_STORE"`
- selected store address as the purchase unit shipping address
- receiver name formatted as `s2s ${storeName}`

## Admin Portal

Route: `/admin`.

Access:

- hidden from buyer UI
- manual route entry
- simple env/config passcode
- React admin shell
- backend-protected admin APIs
- admin session separate from buyer auth

Scope:

- global profile switch
- global market switch
- orders and lifecycle controls
- BOPIS store inventory and pickup date controls
- payment/order debug details
- verified webhook viewer
- runtime debug logs

Information architecture:

- Orders: list, filters, status, fulfillment mode, payment status, and order detail.
- Order detail: buyer/order summary, lifecycle timeline, total snapshots, promo evaluation lines, PayPal snapshot, inventory effect, and linked webhooks.
- Webhooks: event list, verification status, linked order/payment session, processing result, and sanitized payload viewer.
- Inventory: central inventory, store inventory, partial pickup scenarios, and pickup date capacity.
- Lifecycle: manual delivery and pickup state controls with audit notes.
- Debug: sanitized runtime logs and amount comparison snapshots.

No admin user switcher. No reset tools in v1.

Manual lifecycle:

- Delivery: paid -> processing -> shipped -> delivered
- Pickup: paid -> preparing pickup -> ready for pickup -> picked up

## Data Model Notes

Profile-scoped:

- products
- categories
- reviews through products

Market reference data shared across profiles:

- markets
- stores
- pickup dates
- tax rules
- shipping options

Profile-and-market scoped:

- product prices
- inventory
- carts
- checkout drafts
- orders
- promos
- homepage content

User-level/shared:

- auth users
- addresses
- saved payment methods

Order snapshots store addresses, item prices, fulfillment mode, inventory context, promo evaluation, tax, shipping, and totals.

## Visual QA Gates

- Check responsive screenshots at 320px, 375px, 390/414px, 768px, 1024px, 1280px, and 1440px for page-polish slices that touch mobile cart, checkout, sticky payment actions, filters, or PDP purchase surfaces.
- Required screenshot pages: homepage, category, PDP, cart, minicart, delivery checkout payment step, pickup checkout partial inventory step, express Review and Confirm, order confirmation, account order detail, and Admin order detail.
- Verify POP MART profile reads as playful premium collectible retail, not a generic white/red ecommerce shell.
- Verify the multi-accent palette is controlled and section-based: no page-wide rainbow effect, no generic blue/amber/cream inheritance, and no childish clutter.
- Verify product/category cards, badges, release calendar, promo cards, and pickup store cards use the tactile/sticker/store-ticket language defined above.
- Verify sticky header and sticky payment bar do not cover content.
- Verify all text fits inside buttons, cards, accordions, and payment rows.
- Verify PayPal buttons/messages render without causing major layout shift.
- Verify official PayPal buttons/messages remain visually stable, readable, and undistorted after the playful visual refresh.

## Open Decisions

- Exact PayPal JS SDK v6 APIs for each payment method.
- Exact PayPal vaulting support per method.
- Exact PayPal Apple Pay / Google Pay prerequisites.
- Exact Venmo sandbox support and eligibility behavior.
- Final Supabase schema naming and RLS model.

## Future Phases

- Fastlane
- preorder payment semantics
- subscriptions/recurring
- disputes/refunds
- native iOS/Android apps
- scheduled pricing
- reset/reseed tooling
- alternate authorize-at-pickup BOPIS scenario, only if explicitly requested
