import { useState, type FormEvent } from "react";

import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export interface AccountAddressMutationInput {
  readonly label: string | null;
  readonly recipient_name: string;
  readonly phone: string | null;
  readonly address_line1: string;
  readonly address_line2: string | null;
  readonly city: string;
  readonly state: string | null;
  readonly postal_code: string;
  readonly country_code: string;
  readonly is_default_shipping: boolean;
  readonly is_default_billing: boolean;
}

export interface AccountAddressView extends AccountAddressMutationInput {
  readonly id: string;
}

export type AccountSavedPaymentMethodType = "card" | "paypal_wallet";
export type AccountSavedPaymentStatus =
  | "active"
  | "deleted"
  | "disabled"
  | "pending";

export interface AccountSavedPaymentMethodView {
  readonly id: string;
  readonly methodType: AccountSavedPaymentMethodType;
  readonly status: AccountSavedPaymentStatus;
  readonly brand: string | null;
  readonly expiryMonth: number | null;
  readonly expiryYear: number | null;
  readonly label: string | null;
  readonly last4: string | null;
}

export type AccountOrderFulfillmentMode = "delivery" | "pickup";
export type AccountOrderStatus =
  | "cancelled"
  | "delivered"
  | "paid"
  | "pending"
  | "picked_up"
  | "preparing_pickup"
  | "processing"
  | "ready_for_pickup"
  | "shipped";

export interface AccountOrderItemView {
  readonly id: string;
  readonly imageAlt: string;
  readonly imagePath: string;
  readonly lineTotalLabel: string;
  readonly name: string;
  readonly quantity: number;
  readonly review: AccountOrderItemReviewView | null;
  readonly reviewEligible: boolean;
  readonly reviewSubmitted: boolean;
}

export interface AccountOrderItemReviewView {
  readonly rating: number;
  readonly title: string | null;
  readonly body: string | null;
}

export interface AccountReviewInput {
  readonly rating: number;
  readonly title: string | null;
  readonly body: string;
}

export interface AccountOrderTimelineStepView {
  readonly description: string;
  readonly label: string;
  readonly occurredAtLabel?: string | null;
  readonly status: "complete" | "current" | "pending";
}

export interface AccountOrderFulfillmentAddressView {
  readonly addressType: "billing" | "pickup_store" | "shipping";
  readonly city: string;
  readonly countryCode: string;
  readonly postalCode: string;
  readonly recipientName: string;
  readonly state: string | null;
}

export interface AccountOrderTotalLineView {
  readonly label: string;
  readonly value: string;
}

export interface AccountOrderView {
  readonly orderNumber: string;
  readonly placedDateLabel: string;
  readonly fulfillmentMode: AccountOrderFulfillmentMode;
  readonly status: AccountOrderStatus;
  readonly fulfillmentLabel: string;
  readonly paymentStatusLabel: string;
  readonly totalLabel: string;
  readonly note: string;
  readonly fulfillmentAddresses: readonly AccountOrderFulfillmentAddressView[];
  readonly items: readonly AccountOrderItemView[];
  readonly timeline: readonly AccountOrderTimelineStepView[];
  readonly totals: readonly AccountOrderTotalLineView[];
}

export interface GuestOrderLookupInput {
  readonly email: string;
  readonly orderNumber: string;
}

export interface GuestOrderAddressView {
  readonly addressType: string;
  readonly city: string;
  readonly countryCode: string;
  readonly postalCode: string | null;
  readonly recipientName: string;
  readonly state: string | null;
}

export interface GuestOrderItemView {
  readonly imageAlt: string;
  readonly imagePath: string;
  readonly lineTotalLabel: string;
  readonly name: string;
  readonly quantity: number;
}

export interface GuestOrderView {
  readonly orderNumber: string;
  readonly fulfillmentMode: AccountOrderFulfillmentMode;
  readonly status: AccountOrderStatus;
  readonly paymentStatusLabel: string;
  readonly totalLabel: string;
  readonly note: string;
  readonly addresses: readonly GuestOrderAddressView[];
  readonly items: readonly GuestOrderItemView[];
  readonly totals: readonly AccountOrderTotalLineView[];
}

export interface GuestOrderLookupPageProps {
  readonly lookupError?: string | null;
  readonly lookupStatus: "error" | "idle" | "loading" | "ready";
  readonly order: GuestOrderView | null;
  readonly onLookup: (input: GuestOrderLookupInput) => Promise<void> | void;
}

export interface AccountPageProps {
  readonly addresses: readonly AccountAddressView[];
  readonly addressesStatus: "error" | "idle" | "loading" | "ready";
  readonly email: string | null;
  readonly orders?: readonly AccountOrderView[];
  readonly ordersLastUpdatedAt?: string | null;
  readonly ordersStatus?: "empty" | "error" | "loading" | "ready";
  readonly savedPayments: readonly AccountSavedPaymentMethodView[];
  readonly savedPaymentsStatus: "error" | "idle" | "loading" | "ready";
  readonly selectedOrderNumber?: string | null;
  readonly section: "orders" | "settings";
  readonly onCreateAddress?: (
    address: AccountAddressMutationInput,
  ) => Promise<void> | void;
  readonly onDeleteAddress?: (addressId: string) => Promise<void> | void;
  readonly onDeleteReview?: (
    orderNumber: string,
    itemId: string,
  ) => Promise<void> | void;
  readonly onDeleteSavedPayment?: (
    savedPaymentId: string,
  ) => Promise<void> | void;
  readonly onMakeDefaultAddress?: (addressId: string) => Promise<void> | void;
  readonly onRefreshOrders?: () => Promise<void> | void;
  readonly onUpdateAddress?: (
    addressId: string,
    address: AccountAddressMutationInput,
  ) => Promise<void> | void;
  readonly onSubmitReview?: (
    orderNumber: string,
    itemId: string,
    review: AccountReviewInput,
  ) => Promise<void> | void;
  readonly onUpdateReview?: (
    orderNumber: string,
    itemId: string,
    review: AccountReviewInput,
  ) => Promise<void> | void;
}

export function GuestOrderLookupPage({
  lookupError = null,
  lookupStatus,
  order,
  onLookup,
}: GuestOrderLookupPageProps) {
  const [orderNumber, setOrderNumber] = useState("");
  const [email, setEmail] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onLookup({
      email: email.trim(),
      orderNumber: orderNumber.trim().toUpperCase(),
    });
  }

  return (
    <section className="route-stage route-stage--account account-page">
      <header className="account-page__hero">
        <div>
          <p className="route-stage__eyebrow">Guest orders</p>
          <h1>Guest order lookup</h1>
          <p>
            Find a checkout placed without signing in using the order number and
            email from the receipt.
          </p>
        </div>
        <nav className="account-page__nav" aria-label="Guest order links">
          <a href="/products">Browse products</a>
          <a href="/account/orders">Account orders</a>
        </nav>
      </header>
      <div className="account-page__grid account-page__grid--lookup">
        <Card
          className="account-page__panel account-page__panel--feature"
          aria-labelledby="guest-order-form-title"
          role="region"
        >
          <CardHeader>
            <p className="account-page__panel-kicker">Receipt lookup</p>
            <CardTitle>
              <h2 id="guest-order-form-title">Find your order</h2>
            </CardTitle>
            <CardDescription className="account-page__panel-note">
              We use the same generic response when an order cannot be matched.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className="account-page__lookup-form"
              onSubmit={(event) => {
                void handleSubmit(event);
              }}
            >
              <FieldGroup className="account-page__form-fields">
                <Field>
                  <FieldLabel
                    className="account-page__field-label--required"
                    htmlFor="guest-order-number"
                  >
                    Order number
                  </FieldLabel>
                  <Input
                    id="guest-order-number"
                    autoCapitalize="characters"
                    autoComplete="off"
                    inputMode="text"
                    placeholder="DO-20260526-000003"
                    required
                    value={orderNumber}
                    onChange={(event) => {
                      setOrderNumber(event.target.value);
                    }}
                  />
                </Field>
                <Field>
                  <FieldLabel
                    className="account-page__field-label--required"
                    htmlFor="guest-order-email"
                  >
                    Email used at checkout
                  </FieldLabel>
                  <Input
                    id="guest-order-email"
                    autoComplete="email"
                    inputMode="email"
                    placeholder="collector@example.com"
                    required
                    type="email"
                    value={email}
                    onChange={(event) => {
                      setEmail(event.target.value);
                    }}
                  />
                </Field>
              </FieldGroup>
              <Button
                type="submit"
                className="account-page__submit-button"
                disabled={lookupStatus === "loading"}
              >
                {lookupStatus === "loading"
                  ? "Looking up..."
                  : "Find guest order"}
              </Button>
            </form>
            {lookupStatus === "error" ? (
              <StatusCard
                tone="error"
                title="Guest order could not be found."
                body={
                  lookupError ??
                  "Check the order number and email from your receipt, then try again."
                }
              />
            ) : null}
          </CardContent>
        </Card>
        <Card
          className="account-page__panel"
          aria-labelledby="guest-order-result-title"
          role="region"
        >
          <CardHeader>
            <p className="account-page__panel-kicker">Order detail</p>
            <CardTitle>
              <h2 id="guest-order-result-title">Read-only order detail</h2>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lookupStatus === "ready" && order ? (
              <GuestOrderResult order={order} />
            ) : (
              <StatusCard
                tone="empty"
                title="No guest order loaded yet."
                body="Matched orders appear here without exposing internal payment or database IDs."
              />
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

export function AccountPage({
  addresses,
  addressesStatus,
  email,
  orders = [],
  ordersLastUpdatedAt = null,
  ordersStatus = "ready",
  savedPayments,
  savedPaymentsStatus,
  selectedOrderNumber = null,
  section,
  onCreateAddress,
  onDeleteAddress,
  onDeleteReview,
  onDeleteSavedPayment,
  onMakeDefaultAddress,
  onRefreshOrders,
  onSubmitReview,
  onUpdateAddress,
  onUpdateReview,
}: AccountPageProps) {
  const [addressForm, setAddressForm] = useState<AddressFormState>(null);
  const [confirmingAddressId, setConfirmingAddressId] = useState<string | null>(
    null,
  );
  const [confirmingSavedPaymentId, setConfirmingSavedPaymentId] = useState<
    string | null
  >(null);

  if (section === "orders") {
    return (
      <section className="route-stage route-stage--account account-page">
        <AccountHubHeader section={section} />
        <OrderHistoryView
          onDeleteReview={onDeleteReview}
          onRefreshOrders={onRefreshOrders}
          onSubmitReview={onSubmitReview}
          onUpdateReview={onUpdateReview}
          orders={orders}
          ordersLastUpdatedAt={ordersLastUpdatedAt}
          selectedOrderNumber={selectedOrderNumber}
          status={ordersStatus}
        />
      </section>
    );
  }

  const visibleSavedPayments = savedPayments.filter(
    (savedPayment) => savedPayment.status !== "deleted",
  );
  const addressFormInput =
    addressForm?.mode === "edit"
      ? addressToFormInput(addressForm.address)
      : emptyAddressFormInput();

  return (
    <section className="route-stage route-stage--account account-page">
      <AccountHubHeader section={section} />
      <div className="account-page__summary" aria-label="Account overview">
        <Card size="sm">
          <CardContent>
            <span>Saved addresses</span>
            <strong>{addresses.length}</strong>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent>
            <span>Payment methods</span>
            <strong>{visibleSavedPayments.length}</strong>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent>
            <span>Default checkout</span>
            <strong>
              {addresses.some((address) => address.is_default_shipping)
                ? "Ready"
                : "Needs address"}
            </strong>
          </CardContent>
        </Card>
      </div>
      <div className="account-page__grid">
        <Card
          className="account-page__panel account-page__panel--profile"
          aria-labelledby="profile-title"
          role="region"
        >
          <CardHeader>
            <p className="account-page__panel-kicker">Profile</p>
            <CardTitle>
              <h2 id="profile-title">Collector profile</h2>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="account-page__definition-list">
              <div>
                <dt>Email</dt>
                <dd>{email ?? "Signed-in buyer"}</dd>
              </div>
            </dl>
          </CardContent>
          <CardFooter>
            This account keeps saved checkout details and completed-order review
            access together.
          </CardFooter>
        </Card>
        <Card
          className="account-page__panel"
          aria-labelledby="addresses-title"
          role="region"
        >
          <CardHeader className="account-page__panel-header">
            <CardTitle>
              <h2 id="addresses-title">Address book</h2>
            </CardTitle>
            <CardAction>
              <button
                type="button"
                className="button button--secondary"
                onClick={() => {
                  setAddressForm({ mode: "add" });
                }}
              >
                Add address
              </button>
            </CardAction>
          </CardHeader>
          <CardContent>
            {addressesStatus === "loading" ? (
              <StatusCard
                tone="loading"
                title="Finding your saved addresses..."
                body="We keep this section stable while your address book loads."
              />
            ) : null}
            {addressesStatus === "error" ? (
              <StatusCard
                tone="error"
                title="Addresses could not be loaded."
                body="Try refreshing this page before checkout."
              />
            ) : null}
            {addressesStatus === "ready" && addresses.length === 0 ? (
              <StatusCard
                tone="empty"
                title="No saved addresses yet."
                body="Add a shipping or billing address to make checkout faster."
              />
            ) : null}
            {addressForm ? (
              <AddressForm
                initialValue={addressFormInput}
                submitLabel={
                  addressForm.mode === "edit" ? "Save changes" : "Save address"
                }
                onCancel={() => {
                  setAddressForm(null);
                }}
                onSubmit={async (address) => {
                  if (addressForm.mode === "edit") {
                    await onUpdateAddress?.(addressForm.address.id, address);
                  } else {
                    await onCreateAddress?.(address);
                  }
                  setAddressForm(null);
                }}
              />
            ) : null}
            {addresses.length > 0 ? (
              <ul className="account-page__addresses">
                {addresses.map((address) => {
                  const label = formatAddressLabel(address);
                  const deleteBlocked =
                    address.is_default_shipping || address.is_default_billing;
                  const reasonId = `address-${address.id}-delete-reason`;
                  const isConfirmingDelete = confirmingAddressId === address.id;

                  return (
                    <li key={address.id}>
                      <Card className="account-page__address-card">
                        <CardContent className="account-page__address-copy">
                          <strong>{label}</strong>
                          <span>{address.recipient_name}</span>
                          <span>{address.address_line1}</span>
                          {address.address_line2 ? (
                            <span>{address.address_line2}</span>
                          ) : null}
                          <span>{formatAddressCityLine(address)}</span>
                          <div className="account-page__badges">
                            {address.is_default_shipping ? (
                              <span>Default shipping</span>
                            ) : null}
                            {address.is_default_billing ? (
                              <span>Default billing</span>
                            ) : null}
                          </div>
                          {deleteBlocked ? (
                            <p
                              className="account-page__disabled-reason"
                              id={reasonId}
                            >
                              Cannot delete until another default is set.
                            </p>
                          ) : null}
                        </CardContent>
                        <CardFooter className="account-page__address-actions">
                          {!address.is_default_shipping ||
                          !address.is_default_billing ? (
                            <button
                              type="button"
                              className="link-button"
                              aria-label={`Make default address ${label}`}
                              onClick={() => {
                                void onMakeDefaultAddress?.(address.id);
                              }}
                            >
                              Make default
                            </button>
                          ) : null}
                          <button
                            type="button"
                            className="link-button"
                            aria-label={`Edit address ${label}`}
                            onClick={() => {
                              setAddressForm({
                                mode: "edit",
                                address,
                              });
                            }}
                          >
                            Edit
                          </button>
                          {isConfirmingDelete ? (
                            <div
                              className="account-page__confirm"
                              role="group"
                              aria-label={`Confirm delete address ${label}`}
                            >
                              <span>Delete this address?</span>
                              <button
                                type="button"
                                className="link-button"
                                aria-label={`Confirm delete address ${label}`}
                                onClick={() => {
                                  setConfirmingAddressId(null);
                                  void onDeleteAddress?.(address.id);
                                }}
                              >
                                Confirm
                              </button>
                              <button
                                type="button"
                                className="link-button"
                                onClick={() => {
                                  setConfirmingAddressId(null);
                                }}
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              className="link-button"
                              aria-describedby={
                                deleteBlocked ? reasonId : undefined
                              }
                              aria-label={`Delete address ${label}`}
                              disabled={deleteBlocked}
                              onClick={() => {
                                setConfirmingAddressId(address.id);
                              }}
                            >
                              Delete
                            </button>
                          )}
                        </CardFooter>
                      </Card>
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </CardContent>
        </Card>
        <Card
          className="account-page__panel"
          aria-labelledby="saved-payments-title"
          role="region"
        >
          <CardHeader>
            <p className="account-page__panel-kicker">Payments</p>
            <CardTitle>
              <h2 id="saved-payments-title">Saved payments</h2>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {savedPaymentsStatus === "loading" ? (
              <StatusCard
                tone="loading"
                title="Checking saved payments..."
                body="Payment methods will appear here after the account sync finishes."
              />
            ) : null}
            {savedPaymentsStatus === "error" ? (
              <StatusCard
                tone="error"
                title="Saved payments could not be loaded."
                body="Try refreshing this page before checkout."
              />
            ) : null}
            {savedPaymentsStatus === "ready" &&
            visibleSavedPayments.length === 0 ? (
              <StatusCard
                tone="empty"
                title="No saved payments yet."
                body="Logged-in buyers can save eligible PayPal or card methods during checkout."
              />
            ) : null}
            {visibleSavedPayments.length > 0 ? (
              <ul className="account-page__saved-payments">
                {visibleSavedPayments.map((savedPayment) => {
                  const label = formatSavedPaymentLabel(savedPayment);
                  const isConfirmingDelete =
                    confirmingSavedPaymentId === savedPayment.id;

                  return (
                    <li key={savedPayment.id}>
                      <Card className="account-page__saved-payment-card">
                        <CardContent>
                          <strong>{label}</strong>
                          <span>{formatSavedPaymentMeta(savedPayment)}</span>
                          <span className="account-page__status-chip">
                            {formatStatusLabel(savedPayment.status)}
                          </span>
                        </CardContent>
                        <CardFooter>
                          {isConfirmingDelete ? (
                            <div
                              className="account-page__confirm"
                              role="group"
                              aria-label={`Confirm delete saved payment ${label}`}
                            >
                              <span>Remove this saved payment?</span>
                              <button
                                type="button"
                                className="link-button"
                                aria-label={`Confirm delete saved payment ${label}`}
                                onClick={() => {
                                  setConfirmingSavedPaymentId(null);
                                  void onDeleteSavedPayment?.(savedPayment.id);
                                }}
                              >
                                Confirm
                              </button>
                              <button
                                type="button"
                                className="link-button"
                                onClick={() => {
                                  setConfirmingSavedPaymentId(null);
                                }}
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              className="link-button"
                              aria-label={`Delete saved payment ${label}`}
                              onClick={() => {
                                setConfirmingSavedPaymentId(savedPayment.id);
                              }}
                            >
                              Delete
                            </button>
                          )}
                        </CardFooter>
                      </Card>
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

export type AccountOrderFilter = "all" | "in_progress" | "completed";

export function matchesAccountOrderFilter(
  order: AccountOrderView,
  filter: AccountOrderFilter,
): boolean {
  if (filter === "all") return true;
  const completed =
    order.status === "delivered" || order.status === "picked_up";
  return filter === "completed"
    ? completed
    : !completed && order.status !== "cancelled";
}

function GuestOrderResult({ order }: { readonly order: GuestOrderView }) {
  const firstAddress = order.addresses[0] ?? null;

  return (
    <Card className="account-page__guest-result">
      <CardHeader className="account-page__section-heading">
        <div>
          <p className="account-page__order-number">{order.orderNumber}</p>
          <CardTitle>
            <h3>{formatFulfillmentModeLabel(order.fulfillmentMode)} order</h3>
          </CardTitle>
        </div>
        <CardAction>
          <span
            className={`account-page__status-chip account-page__status-chip--${getOrderStatusTone(
              order.status,
            )}`}
          >
            {formatOrderStatusLabel(order.status)}
          </span>
        </CardAction>
      </CardHeader>
      <CardContent>
        <dl className="account-page__definition-list account-page__definition-list--inline">
          <div>
            <dt>Payment</dt>
            <dd>{order.paymentStatusLabel}</dd>
          </div>
          <div>
            <dt>Total</dt>
            <dd>{order.totalLabel}</dd>
          </div>
        </dl>
        {firstAddress ? (
          <div className="account-page__guest-address">
            <strong>{firstAddress.recipientName}</strong>
            <span>{formatGuestAddress(firstAddress)}</span>
          </div>
        ) : null}
        <p className="account-page__panel-note">{order.note}</p>
        <ul className="account-page__detail-items">
          {order.items.map((item) => (
            <li key={`${order.orderNumber}-${item.name}`}>
              <img
                alt={item.imageAlt}
                height="64"
                src={item.imagePath}
                width="64"
              />
              <div>
                <strong>{item.name}</strong>
                <span>
                  Qty {item.quantity} · {item.lineTotalLabel}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
      <CardFooter>
        <dl className="account-page__totals">
          {order.totals.map((line) => (
            <div key={line.label}>
              <dt>{line.label}</dt>
              <dd>{line.value}</dd>
            </div>
          ))}
        </dl>
      </CardFooter>
    </Card>
  );
}

function OrderHistoryView({
  onDeleteReview,
  onRefreshOrders,
  onSubmitReview,
  onUpdateReview,
  orders,
  ordersLastUpdatedAt,
  selectedOrderNumber,
  status,
}: {
  readonly onDeleteReview: AccountPageProps["onDeleteReview"];
  readonly onRefreshOrders: AccountPageProps["onRefreshOrders"];
  readonly onSubmitReview: AccountPageProps["onSubmitReview"];
  readonly onUpdateReview: AccountPageProps["onUpdateReview"];
  readonly orders: readonly AccountOrderView[];
  readonly ordersLastUpdatedAt: string | null;
  readonly selectedOrderNumber: string | null;
  readonly status: NonNullable<AccountPageProps["ordersStatus"]>;
}) {
  const [filter, setFilter] = useState<AccountOrderFilter>("all");
  const [refreshStatus, setRefreshStatus] = useState<
    "error" | "idle" | "loading"
  >("idle");
  const isInitialLoading = status === "loading" && orders.length === 0;
  const isRefreshing = refreshStatus === "loading";

  async function handleRefreshOrders() {
    if (!onRefreshOrders || isRefreshing) {
      return;
    }

    setRefreshStatus("loading");
    try {
      await onRefreshOrders();
      setRefreshStatus("idle");
    } catch {
      setRefreshStatus("error");
    }
  }

  const refreshToolbar = (
    <div className="account-page__orders-refresh">
      <div className="account-page__orders-refresh-copy" aria-live="polite">
        {ordersLastUpdatedAt ? (
          <time dateTime={ordersLastUpdatedAt}>
            Last updated at {formatAccountLastUpdatedTime(ordersLastUpdatedAt)}
          </time>
        ) : (
          <span>
            {isInitialLoading
              ? "Loading the latest order activity..."
              : "Order activity has not been refreshed yet."}
          </span>
        )}
        {refreshStatus === "error" && status !== "error" ? (
          <p role="alert" aria-live="assertive">
            <strong>Orders could not be refreshed.</strong> Your last successful
            order view is still shown.
          </p>
        ) : null}
      </div>
      {onRefreshOrders ? (
        <Button
          type="button"
          variant="outline"
          disabled={isInitialLoading || isRefreshing}
          onClick={() => {
            void handleRefreshOrders();
          }}
        >
          {isInitialLoading
            ? "Loading orders..."
            : isRefreshing
              ? "Refreshing orders..."
              : refreshStatus === "error" || status === "error"
                ? "Retry"
                : "Refresh orders"}
        </Button>
      ) : null}
    </div>
  );

  if (status === "loading") {
    return (
      <div className="account-page__orders-shell">
        {refreshToolbar}
        <StatusCard
          tone="loading"
          title="Loading your orders..."
          body="We are gathering your latest pending and completed order activity."
        />
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="account-page__orders-shell">
        {refreshToolbar}
        <StatusCard
          tone="error"
          title="Order history could not be loaded."
          body="Retry the secure account request before resuming payment or leaving reviews."
        />
      </div>
    );
  }

  if (status === "empty" || orders.length === 0) {
    return (
      <div className="account-page__orders-shell">
        {refreshToolbar}
        <Card
          className="account-page__panel account-page__panel--feature"
          aria-labelledby="order-history-title"
          role="region"
        >
          <CardHeader>
            <CardTitle>
              <h2 id="order-history-title">Order history</h2>
            </CardTitle>
            <CardDescription className="account-page__panel-note">
              No account orders yet. Browse products or use guest order lookup
              if you checked out without signing in.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <a className="button button--secondary" href="/products">
              Browse products
            </a>
          </CardFooter>
        </Card>
      </div>
    );
  }

  const selectedOrder =
    selectedOrderNumber === null
      ? null
      : orders.find((order) => order.orderNumber === selectedOrderNumber);

  if (selectedOrderNumber !== null && !selectedOrder) {
    return (
      <div className="account-page__orders-shell">
        {refreshToolbar}
        <Card
          className="account-page__panel account-page__panel--feature"
          aria-labelledby="order-history-title"
          role="region"
        >
          <CardHeader>
            <CardTitle>
              <h2 id="order-history-title">Order not found</h2>
            </CardTitle>
            <CardDescription className="account-page__panel-note">
              This account order was not found. Return to order history or use
              guest lookup if the order was placed without signing in.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <a className="button button--secondary" href="/account/orders">
              Back to orders
            </a>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (selectedOrder) {
    return (
      <div className="account-page__orders-shell">
        {refreshToolbar}
        <OrderDetailView
          onDeleteReview={onDeleteReview}
          onSubmitReview={onSubmitReview}
          onUpdateReview={onUpdateReview}
          order={selectedOrder}
        />
      </div>
    );
  }

  const filterOptions: readonly {
    readonly label: string;
    readonly value: AccountOrderFilter;
  }[] = [
    { label: "All", value: "all" },
    { label: "In progress", value: "in_progress" },
    { label: "Completed", value: "completed" },
  ];
  const filterCounts = Object.fromEntries(
    filterOptions.map((option) => [
      option.value,
      orders.filter((order) => matchesAccountOrderFilter(order, option.value))
        .length,
    ]),
  ) as Record<AccountOrderFilter, number>;
  const filteredOrders = orders.filter((order) =>
    matchesAccountOrderFilter(order, filter),
  );
  const activeFilterLabel =
    filterOptions.find((option) => option.value === filter)?.label ?? "All";

  return (
    <section className="account-page__orders" aria-labelledby="orders-title">
      {refreshToolbar}
      <div className="account-page__section-heading">
        <div>
          <p className="account-page__panel-kicker">Order activity</p>
          <h2 id="orders-title">Order history</h2>
        </div>
        <span>
          {filteredOrders.length}{" "}
          {filteredOrders.length === 1 ? "order" : "orders"}
        </span>
      </div>
      <div className="account-page__order-filters">
        <div role="group" aria-label="Filter orders">
          {filterOptions.map((option) => (
            <Button
              key={option.value}
              type="button"
              variant={filter === option.value ? "default" : "outline"}
              aria-label={`${option.label} ${filterCounts[option.value]}`}
              aria-pressed={filter === option.value}
              onClick={() => {
                setFilter(option.value);
              }}
            >
              <span>{option.label}</span>
              <strong>{filterCounts[option.value]}</strong>
            </Button>
          ))}
        </div>
        <p aria-live="polite">Showing {activeFilterLabel} orders</p>
      </div>
      {filteredOrders.length > 0 ? (
        <ul className="account-page__order-list">
          {filteredOrders.map((order) => (
            <li key={order.orderNumber}>
              <OrderHistoryCard order={order} />
            </li>
          ))}
        </ul>
      ) : (
        <StatusCard
          tone="empty"
          title={`No ${activeFilterLabel.toLowerCase()} orders.`}
          body="Choose another order filter to see more account activity."
        />
      )}
    </section>
  );
}

function OrderDetailView({
  onDeleteReview,
  onSubmitReview,
  onUpdateReview,
  order,
}: {
  readonly onDeleteReview: AccountPageProps["onDeleteReview"];
  readonly onSubmitReview: AccountPageProps["onSubmitReview"];
  readonly onUpdateReview: AccountPageProps["onUpdateReview"];
  readonly order: AccountOrderView;
}) {
  const [reviewFormState, setReviewFormState] = useState<ReviewFormState>(null);
  const currentStage =
    order.timeline.find((step) => step.status === "current") ??
    [...order.timeline].reverse().find((step) => step.status === "complete") ??
    order.timeline[0];
  const fulfillmentDetailLabel = `${formatFulfillmentModeLabel(
    order.fulfillmentMode,
  )} detail`;
  const fulfillmentAddress = order.fulfillmentAddresses.find(
    (address) =>
      address.addressType ===
      (order.fulfillmentMode === "pickup" ? "pickup_store" : "shipping"),
  );

  return (
    <section
      className="account-page__order-detail"
      aria-labelledby="order-detail-title"
    >
      <a className="link-button" href="/account/orders">
        Back to order history
      </a>
      <div className="account-page__section-heading">
        <div>
          <p className="account-page__panel-kicker">Order detail</p>
          <h2 id="order-detail-title">{order.orderNumber}</h2>
        </div>
        <span
          className={`account-page__status-chip account-page__status-chip--${getOrderStatusTone(
            order.status,
          )}`}
        >
          {formatOrderStatusLabel(order.status)}
        </span>
      </div>
      <Card
        className="account-page__panel account-page__current-stage"
        aria-label="Current stage"
        role="region"
      >
        <CardHeader>
          <p className="account-page__panel-kicker">Current stage</p>
          <CardTitle>
            <h3 id="order-current-stage-title">
              {currentStage?.label ?? formatOrderStatusLabel(order.status)}
            </h3>
          </CardTitle>
          <CardDescription className="account-page__panel-note">
            {currentStage?.description ?? order.note}
          </CardDescription>
        </CardHeader>
        {currentStage?.occurredAtLabel ? (
          <CardFooter>
            <span className="account-page__current-stage-time">
              {currentStage.occurredAtLabel}
            </span>
          </CardFooter>
        ) : null}
      </Card>
      <div className="account-page__order-detail-grid">
        <Card
          className="account-page__panel"
          aria-labelledby="order-fulfillment-title"
          role="region"
        >
          <CardHeader>
            <CardTitle>
              <h3 id="order-fulfillment-title">{fulfillmentDetailLabel}</h3>
            </CardTitle>
            <CardDescription className="account-page__panel-note">
              <strong>{order.fulfillmentLabel}</strong>
              <span>{order.note}</span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="account-page__definition-list">
              {fulfillmentAddress ? (
                <div>
                  <dt>
                    {order.fulfillmentMode === "pickup"
                      ? "Pickup store"
                      : "Shipping to"}
                  </dt>
                  <dd>
                    <strong>{fulfillmentAddress.recipientName}</strong>
                    <br />
                    <span>
                      {formatOrderFulfillmentLocality(fulfillmentAddress)}
                    </span>
                  </dd>
                </div>
              ) : null}
              <div>
                <dt>Placed</dt>
                <dd>{formatOrderDetailDate(order.placedDateLabel)}</dd>
              </div>
              <div>
                <dt>Payment</dt>
                <dd>{order.paymentStatusLabel}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>
        <Card
          className="account-page__panel"
          aria-label="Order timeline"
          role="region"
        >
          <CardHeader>
            <CardTitle>
              <h3 id="order-timeline-title">Timeline</h3>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="account-page__timeline">
              {order.timeline.map((step) => (
                <li
                  key={step.label}
                  className={`account-page__timeline-step account-page__timeline-step--${step.status}`}
                >
                  <strong>{step.label}</strong>
                  <span>{formatTimelineStateLabel(step.status)}</span>
                  <span>{step.description}</span>
                  {step.occurredAtLabel ? (
                    <time>{step.occurredAtLabel}</time>
                  ) : null}
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      </div>
      <Card
        className="account-page__panel"
        id="review-items"
        aria-labelledby="order-items-title"
        role="region"
      >
        <CardHeader className="account-page__panel-header">
          <CardTitle>
            <h3 id="order-items-title">Items in this order</h3>
          </CardTitle>
          <CardAction>
            <span className="account-page__status-chip">
              {order.items.length} items
            </span>
          </CardAction>
        </CardHeader>
        <CardContent>
          <ul className="account-page__detail-items">
            {order.items.map((item) => {
              const activeForm =
                reviewFormState?.itemId === item.id ? reviewFormState : null;

              return (
                <li key={item.id}>
                  <img
                    alt={item.imageAlt}
                    height="64"
                    src={item.imagePath}
                    width="64"
                  />
                  <div>
                    <strong>{item.name}</strong>
                    <span>
                      Qty {item.quantity} · {item.lineTotalLabel}
                    </span>
                  </div>
                  {item.reviewEligible && !item.reviewSubmitted ? (
                    <div className="account-page__review-actions">
                      <button
                        type="button"
                        className="button button--secondary"
                        aria-label={`Review item ${item.name}`}
                        onClick={() => {
                          setReviewFormState({
                            itemId: item.id,
                            mode: "submit",
                          });
                        }}
                      >
                        Review item
                      </button>
                    </div>
                  ) : null}
                  {item.reviewSubmitted ? (
                    <div className="account-page__review-summary">
                      <span className="account-page__status-chip">
                        Already reviewed
                      </span>
                      {item.review ? (
                        <div>
                          <strong>
                            {item.review.title ?? "Collector review"}
                          </strong>
                          <span>{item.review.rating} out of 5</span>
                          {item.review.body ? <p>{item.review.body}</p> : null}
                        </div>
                      ) : null}
                      <div className="account-page__review-actions">
                        <button
                          type="button"
                          className="link-button"
                          aria-label={`Edit review ${item.name}`}
                          onClick={() => {
                            setReviewFormState({
                              itemId: item.id,
                              mode: "edit",
                            });
                          }}
                        >
                          Edit review
                        </button>
                        <button
                          type="button"
                          className="link-button"
                          aria-label={`Delete review ${item.name}`}
                          onClick={() => {
                            void onDeleteReview?.(order.orderNumber, item.id);
                          }}
                        >
                          Delete review
                        </button>
                      </div>
                    </div>
                  ) : null}
                  {activeForm ? (
                    <ReviewForm
                      initialValue={reviewToFormInput(item.review)}
                      submitLabel={
                        activeForm.mode === "edit"
                          ? "Save review"
                          : "Submit review"
                      }
                      onCancel={() => {
                        setReviewFormState(null);
                      }}
                      onSubmit={async (review) => {
                        if (activeForm.mode === "edit") {
                          await onUpdateReview?.(
                            order.orderNumber,
                            item.id,
                            review,
                          );
                        } else {
                          await onSubmitReview?.(
                            order.orderNumber,
                            item.id,
                            review,
                          );
                        }
                        setReviewFormState(null);
                      }}
                    />
                  ) : null}
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>
      <Card
        className="account-page__panel"
        aria-labelledby="totals-title"
        role="region"
      >
        <CardHeader>
          <CardTitle>
            <h3 id="totals-title">Totals</h3>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="account-page__totals">
            {order.totals.map((line) => (
              <div key={line.label}>
                <dt>{line.label}</dt>
                <dd>{line.value}</dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>
    </section>
  );
}

function OrderHistoryCard({ order }: { readonly order: AccountOrderView }) {
  const canReview = order.items.some(
    (item) => item.reviewEligible && !item.reviewSubmitted,
  );
  const statusLabel = formatOrderStatusLabel(order.status);
  const detailHref = `/account/orders/${encodeURIComponent(order.orderNumber)}`;

  return (
    <Card className="account-page__order-card">
      <CardHeader className="account-page__order-card-main">
        <div>
          <p className="account-page__order-number">{order.orderNumber}</p>
          <CardTitle>
            <h3>{order.fulfillmentLabel}</h3>
          </CardTitle>
          <CardDescription>{order.note}</CardDescription>
        </div>
        <CardAction>
          <span
            className={`account-page__status-chip account-page__status-chip--${getOrderStatusTone(
              order.status,
            )}`}
          >
            {statusLabel}
          </span>
        </CardAction>
      </CardHeader>
      <CardContent>
        <div className="account-page__order-meta" aria-label="Order summary">
          <span>{order.placedDateLabel}</span>
          <span>{formatFulfillmentModeLabel(order.fulfillmentMode)}</span>
          <span>{order.paymentStatusLabel}</span>
          <strong>{order.totalLabel}</strong>
        </div>
      </CardContent>
      <CardFooter className="account-page__order-footer">
        <div className="account-page__order-thumbnails" aria-label="Items">
          {order.items.slice(0, 4).map((item) => (
            <img
              key={item.id}
              alt={item.imageAlt}
              height="56"
              src={item.imagePath}
              width="56"
            />
          ))}
        </div>
        <div className="account-page__order-actions">
          {order.status === "pending" ? (
            <div className="account-page__deferred-action">
              <button
                type="button"
                className="button"
                disabled
                aria-describedby={`${order.orderNumber}-resume-note`}
              >
                Resume payment
              </button>
              <span id={`${order.orderNumber}-resume-note`}>
                Resume revalidation is the next payment-recovery slice.
              </span>
            </div>
          ) : (
            <a className="button button--secondary" href={detailHref}>
              View details
            </a>
          )}
          {canReview ? (
            <a className="link-button" href={`${detailHref}#review-items`}>
              Review items
            </a>
          ) : null}
        </div>
      </CardFooter>
    </Card>
  );
}

function AccountHubHeader({
  section,
}: {
  readonly section: AccountPageProps["section"];
}) {
  const settingsPrefix = section === "settings" ? "" : "/account";

  return (
    <header className="account-page__hero">
      <div>
        <p className="route-stage__eyebrow">Account</p>
        <h1>{section === "orders" ? "Orders" : "Account settings"}</h1>
        <p>
          Manage saved checkout details, payment methods, and order activity for
          collector drop days.
        </p>
      </div>
      <nav className="account-page__nav" aria-label="Account sections">
        <a
          href="/account/orders"
          aria-current={section === "orders" ? "page" : undefined}
        >
          Orders
        </a>
        <a href={`${settingsPrefix}#addresses-title`}>Addresses</a>
        <a href={`${settingsPrefix}#saved-payments-title`}>Payments</a>
        <a href={`${settingsPrefix}#profile-title`}>Profile</a>
        <span aria-disabled="true">Reviews soon</span>
      </nav>
    </header>
  );
}

function StatusCard({
  body,
  title,
  tone,
}: {
  readonly body: string;
  readonly title: string;
  readonly tone: "empty" | "error" | "loading";
}) {
  return (
    <Card
      className={`account-page__status account-page__status--${tone}`}
      role={
        tone === "error" ? "alert" : tone === "loading" ? "status" : undefined
      }
      aria-live={
        tone === "error"
          ? "assertive"
          : tone === "loading"
            ? "polite"
            : undefined
      }
    >
      <CardHeader>
        <CardTitle>
          <strong>{title}</strong>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p>{body}</p>
      </CardContent>
    </Card>
  );
}

type AddressFormState =
  | {
      readonly mode: "add";
    }
  | {
      readonly address: AccountAddressView;
      readonly mode: "edit";
    }
  | null;

type ReviewFormState = {
  readonly itemId: string;
  readonly mode: "edit" | "submit";
} | null;

function ReviewForm({
  initialValue,
  onCancel,
  onSubmit,
  submitLabel,
}: {
  readonly initialValue: AccountReviewInput;
  readonly onCancel: () => void;
  readonly onSubmit: (review: AccountReviewInput) => Promise<void> | void;
  readonly submitLabel: string;
}) {
  const [value, setValue] = useState(initialValue);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSubmit(normalizeReviewFormInput(value));
  }

  return (
    <form
      className="account-page__review-form"
      onSubmit={(event) => {
        void handleSubmit(event);
      }}
    >
      <FieldGroup className="account-page__review-fields">
        <Field>
          <FieldLabel htmlFor="account-review-rating">Rating</FieldLabel>
          <select
            id="account-review-rating"
            className="account-page__select"
            required
            value={String(value.rating)}
            onChange={(event) => {
              setValue((currentValue) => ({
                ...currentValue,
                rating: Number(event.target.value),
              }));
            }}
          >
            <option value="5">5 - Loved it</option>
            <option value="4">4 - Really liked it</option>
            <option value="3">3 - Good</option>
            <option value="2">2 - Not quite right</option>
            <option value="1">1 - Needs help</option>
          </select>
        </Field>
        <Field>
          <FieldLabel htmlFor="account-review-title">Review title</FieldLabel>
          <Input
            id="account-review-title"
            autoComplete="off"
            value={value.title ?? ""}
            onChange={(event) => {
              setValue((currentValue) => ({
                ...currentValue,
                title: event.target.value,
              }));
            }}
          />
        </Field>
        <Field className="account-page__review-body-field">
          <FieldLabel
            className="account-page__field-label--required"
            htmlFor="account-review-body"
          >
            Review body
          </FieldLabel>
          <Textarea
            id="account-review-body"
            required
            rows={3}
            value={value.body}
            onChange={(event) => {
              setValue((currentValue) => ({
                ...currentValue,
                body: event.target.value,
              }));
            }}
          />
          <FieldDescription>
            Share what changed after unboxing or display.
          </FieldDescription>
        </Field>
      </FieldGroup>
      <div className="account-page__form-actions">
        <Button type="submit" className="account-page__submit-button">
          {submitLabel}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function reviewToFormInput(
  review: AccountOrderItemReviewView | null,
): AccountReviewInput {
  return {
    rating: review?.rating ?? 5,
    title: review?.title ?? "",
    body: review?.body ?? "",
  };
}

function normalizeReviewFormInput(
  review: AccountReviewInput,
): AccountReviewInput {
  return {
    rating: review.rating,
    title: review.title?.trim() || null,
    body: review.body.trim(),
  };
}

function AddressForm({
  initialValue,
  submitLabel,
  onCancel,
  onSubmit,
}: {
  readonly initialValue: AccountAddressMutationInput;
  readonly submitLabel: string;
  readonly onCancel: () => void;
  readonly onSubmit: (
    address: AccountAddressMutationInput,
  ) => Promise<void> | void;
}) {
  const [value, setValue] = useState(initialValue);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSubmit(normalizeAddressFormInput(value));
  }

  function updateValue(
    key: keyof AccountAddressMutationInput,
    nextValue: string,
  ) {
    setValue((currentValue) => ({
      ...currentValue,
      [key]: nextValue,
    }));
  }

  return (
    <form
      className="account-page__address-form"
      onSubmit={(event) => {
        void handleSubmit(event);
      }}
    >
      <FieldGroup className="account-page__address-fields">
        <Field>
          <FieldLabel htmlFor="account-address-label">Address label</FieldLabel>
          <Input
            id="account-address-label"
            autoComplete="off"
            placeholder="Home, office, pickup helper..."
            value={value.label ?? ""}
            onChange={(event) => {
              updateValue("label", event.target.value);
            }}
          />
        </Field>
        <Field>
          <FieldLabel
            className="account-page__field-label--required"
            htmlFor="account-address-recipient"
          >
            Recipient name
          </FieldLabel>
          <Input
            id="account-address-recipient"
            autoComplete="name"
            required
            value={value.recipient_name}
            onChange={(event) => {
              updateValue("recipient_name", event.target.value);
            }}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="account-address-phone">Phone</FieldLabel>
          <Input
            id="account-address-phone"
            autoComplete="tel"
            inputMode="tel"
            type="tel"
            value={value.phone ?? ""}
            onChange={(event) => {
              updateValue("phone", event.target.value);
            }}
          />
        </Field>
        <Field>
          <FieldLabel
            className="account-page__field-label--required"
            htmlFor="account-address-line-1"
          >
            Street address
          </FieldLabel>
          <Input
            id="account-address-line-1"
            autoComplete="address-line1"
            required
            value={value.address_line1}
            onChange={(event) => {
              updateValue("address_line1", event.target.value);
            }}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="account-address-line-2">
            Apt, suite, etc.
          </FieldLabel>
          <Input
            id="account-address-line-2"
            autoComplete="address-line2"
            value={value.address_line2 ?? ""}
            onChange={(event) => {
              updateValue("address_line2", event.target.value);
            }}
          />
        </Field>
        <Field>
          <FieldLabel
            className="account-page__field-label--required"
            htmlFor="account-address-city"
          >
            City
          </FieldLabel>
          <Input
            id="account-address-city"
            autoComplete="address-level2"
            required
            value={value.city}
            onChange={(event) => {
              updateValue("city", event.target.value);
            }}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="account-address-state">State</FieldLabel>
          <Input
            id="account-address-state"
            autoComplete="address-level1"
            value={value.state ?? ""}
            onChange={(event) => {
              updateValue("state", event.target.value);
            }}
          />
        </Field>
        <Field>
          <FieldLabel
            className="account-page__field-label--required"
            htmlFor="account-address-postal-code"
          >
            ZIP/postal code
          </FieldLabel>
          <Input
            id="account-address-postal-code"
            autoComplete="postal-code"
            inputMode="text"
            required
            value={value.postal_code}
            onChange={(event) => {
              updateValue("postal_code", event.target.value);
            }}
          />
        </Field>
        <Field>
          <FieldLabel
            className="account-page__field-label--required"
            htmlFor="account-address-country-code"
          >
            Country code
          </FieldLabel>
          <Input
            id="account-address-country-code"
            autoCapitalize="characters"
            autoComplete="country"
            inputMode="text"
            maxLength={2}
            required
            value={value.country_code}
            onChange={(event) => {
              updateValue("country_code", event.target.value);
            }}
          />
          <FieldDescription>Use the 2-letter country code.</FieldDescription>
        </Field>
      </FieldGroup>
      <div className="account-page__form-actions">
        <Button type="submit" className="account-page__submit-button">
          {submitLabel}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function emptyAddressFormInput(): AccountAddressMutationInput {
  return {
    label: "",
    recipient_name: "",
    phone: "",
    address_line1: "",
    address_line2: "",
    city: "",
    state: "",
    postal_code: "",
    country_code: "US",
    is_default_shipping: false,
    is_default_billing: false,
  };
}

function addressToFormInput(
  address: AccountAddressView,
): AccountAddressMutationInput {
  return {
    label: address.label,
    recipient_name: address.recipient_name,
    phone: address.phone,
    address_line1: address.address_line1,
    address_line2: address.address_line2,
    city: address.city,
    state: address.state,
    postal_code: address.postal_code,
    country_code: address.country_code,
    is_default_shipping: address.is_default_shipping,
    is_default_billing: address.is_default_billing,
  };
}

function normalizeAddressFormInput(
  value: AccountAddressMutationInput,
): AccountAddressMutationInput {
  return {
    label: normalizeOptionalString(value.label),
    recipient_name: value.recipient_name.trim(),
    phone: normalizeOptionalString(value.phone),
    address_line1: value.address_line1.trim(),
    address_line2: normalizeOptionalString(value.address_line2),
    city: value.city.trim(),
    state: normalizeOptionalString(value.state),
    postal_code: value.postal_code.trim(),
    country_code: value.country_code.trim().toUpperCase(),
    is_default_shipping: value.is_default_shipping,
    is_default_billing: value.is_default_billing,
  };
}

function normalizeOptionalString(value: string | null): string | null {
  const trimmedValue = value?.trim() ?? "";
  return trimmedValue ? trimmedValue : null;
}

function formatAddressLabel(address: AccountAddressView): string {
  return address.label?.trim() || address.address_line1;
}

function formatAddressCityLine(address: AccountAddressView): string {
  return [
    address.city,
    address.state,
    address.postal_code,
    address.country_code,
  ]
    .filter(Boolean)
    .join(", ");
}

function formatGuestAddress(address: GuestOrderAddressView): string {
  return [address.city, address.state, address.postalCode, address.countryCode]
    .filter(Boolean)
    .join(", ");
}

function formatOrderFulfillmentLocality(
  address: AccountOrderFulfillmentAddressView,
): string {
  const region = [address.state, address.postalCode].filter(Boolean).join(" ");
  const domesticLocality = [address.city, region].filter(Boolean).join(", ");

  return address.countryCode.toUpperCase() === "US"
    ? domesticLocality
    : [domesticLocality, address.countryCode].filter(Boolean).join(", ");
}

function formatTimelineStateLabel(
  status: AccountOrderTimelineStepView["status"],
): string {
  if (status === "complete") {
    return "Completed";
  }
  if (status === "current") {
    return "Current stage";
  }
  return "Upcoming";
}

function formatSavedPaymentLabel(
  savedPayment: AccountSavedPaymentMethodView,
): string {
  if (savedPayment.label?.trim()) {
    return savedPayment.label;
  }

  if (savedPayment.methodType === "card") {
    const brand = savedPayment.brand?.trim() || "Card";
    return savedPayment.last4
      ? `${brand} ending in ${savedPayment.last4}`
      : brand;
  }

  return "PayPal wallet";
}

function formatSavedPaymentMeta(
  savedPayment: AccountSavedPaymentMethodView,
): string {
  if (
    savedPayment.methodType === "card" &&
    savedPayment.expiryMonth &&
    savedPayment.expiryYear
  ) {
    return `Expires ${String(savedPayment.expiryMonth).padStart(2, "0")}/${savedPayment.expiryYear}`;
  }

  return savedPayment.status === "active"
    ? "Ready for future checkout"
    : savedPayment.status;
}

function formatStatusLabel(status: AccountSavedPaymentStatus): string {
  return status
    .split("_")
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function formatOrderStatusLabel(status: AccountOrderStatus): string {
  switch (status) {
    case "pending":
      return "Pending payment";
    case "picked_up":
      return "Picked up";
    case "ready_for_pickup":
      return "Ready for pickup";
    default:
      return status
        .split("_")
        .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
        .join(" ");
  }
}

function formatFulfillmentModeLabel(
  fulfillmentMode: AccountOrderFulfillmentMode,
): string {
  return fulfillmentMode === "pickup" ? "Pickup" : "Delivery";
}

function getOrderStatusTone(
  status: AccountOrderStatus,
): "cancelled" | "done" | "pending" {
  if (status === "cancelled") {
    return "cancelled";
  }

  return status === "delivered" || status === "picked_up" ? "done" : "pending";
}

function formatOrderDetailDate(placedDateLabel: string): string {
  return placedDateLabel.replace(/^Placed\s+/i, "");
}

function formatAccountLastUpdatedTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}
