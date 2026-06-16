import { useState, type FormEvent } from "react";

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
  readonly reviewEligible: boolean;
  readonly reviewSubmitted: boolean;
}

export interface AccountOrderTimelineStepView {
  readonly description: string;
  readonly label: string;
  readonly status: "complete" | "current" | "pending";
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
  readonly items: readonly AccountOrderItemView[];
  readonly timeline: readonly AccountOrderTimelineStepView[];
  readonly totals: readonly AccountOrderTotalLineView[];
}

export interface AccountPageProps {
  readonly addresses: readonly AccountAddressView[];
  readonly addressesStatus: "error" | "idle" | "loading" | "ready";
  readonly email: string | null;
  readonly orders?: readonly AccountOrderView[];
  readonly ordersStatus?: "empty" | "error" | "loading" | "ready";
  readonly savedPayments: readonly AccountSavedPaymentMethodView[];
  readonly savedPaymentsStatus: "error" | "idle" | "loading" | "ready";
  readonly selectedOrderNumber?: string | null;
  readonly section: "orders" | "settings";
  readonly onCreateAddress?: (
    address: AccountAddressMutationInput,
  ) => Promise<void> | void;
  readonly onDeleteAddress?: (addressId: string) => Promise<void> | void;
  readonly onDeleteSavedPayment?: (
    savedPaymentId: string,
  ) => Promise<void> | void;
  readonly onMakeDefaultAddress?: (addressId: string) => Promise<void> | void;
  readonly onUpdateAddress?: (
    addressId: string,
    address: AccountAddressMutationInput,
  ) => Promise<void> | void;
}

export function AccountPage({
  addresses,
  addressesStatus,
  email,
  orders = [],
  ordersStatus = "ready",
  savedPayments,
  savedPaymentsStatus,
  selectedOrderNumber = null,
  section,
  onCreateAddress,
  onDeleteAddress,
  onDeleteSavedPayment,
  onMakeDefaultAddress,
  onUpdateAddress,
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
          orders={orders}
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
        <div>
          <span>Saved addresses</span>
          <strong>{addresses.length}</strong>
        </div>
        <div>
          <span>Payment methods</span>
          <strong>{visibleSavedPayments.length}</strong>
        </div>
        <div>
          <span>Default checkout</span>
          <strong>
            {addresses.some((address) => address.is_default_shipping)
              ? "Ready"
              : "Needs address"}
          </strong>
        </div>
      </div>
      <div className="account-page__grid">
        <section
          className="account-page__panel account-page__panel--profile"
          aria-labelledby="profile-title"
        >
          <div className="account-page__panel-kicker">Profile</div>
          <h2 id="profile-title">Collector profile</h2>
          <dl className="account-page__definition-list">
            <div>
              <dt>Email</dt>
              <dd>{email ?? "Signed-in buyer"}</dd>
            </div>
          </dl>
          <p className="account-page__panel-note">
            This account keeps saved checkout details and completed-order review
            access together.
          </p>
        </section>
        <section
          className="account-page__panel"
          aria-labelledby="addresses-title"
        >
          <div className="account-page__panel-header">
            <h2 id="addresses-title">Address book</h2>
            <button
              type="button"
              className="button button--secondary"
              onClick={() => {
                setAddressForm({ mode: "add" });
              }}
            >
              Add address
            </button>
          </div>
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
                  <li key={address.id} className="account-page__address-card">
                    <div className="account-page__address-copy">
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
                    </div>
                    <div className="account-page__address-actions">
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
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </section>
        <section
          className="account-page__panel"
          aria-labelledby="saved-payments-title"
        >
          <div className="account-page__panel-kicker">Payments</div>
          <h2 id="saved-payments-title">Saved payments</h2>
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
                  <li
                    key={savedPayment.id}
                    className="account-page__saved-payment-card"
                  >
                    <div>
                      <strong>{label}</strong>
                      <span>{formatSavedPaymentMeta(savedPayment)}</span>
                      <span className="account-page__status-chip">
                        {formatStatusLabel(savedPayment.status)}
                      </span>
                    </div>
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
                  </li>
                );
              })}
            </ul>
          ) : null}
        </section>
      </div>
    </section>
  );
}

function OrderHistoryView({
  orders,
  selectedOrderNumber,
  status,
}: {
  readonly orders: readonly AccountOrderView[];
  readonly selectedOrderNumber: string | null;
  readonly status: NonNullable<AccountPageProps["ordersStatus"]>;
}) {
  if (status === "loading") {
    return (
      <StatusCard
        tone="loading"
        title="Loading your orders..."
        body="We are gathering your latest pending and completed order activity."
      />
    );
  }

  if (status === "error") {
    return (
      <StatusCard
        tone="error"
        title="Order history could not be loaded."
        body="Refresh the page before resuming payment or leaving reviews."
      />
    );
  }

  if (status === "empty" || orders.length === 0) {
    return (
      <section
        className="account-page__panel account-page__panel--feature"
        aria-labelledby="order-history-title"
      >
        <h2 id="order-history-title">Order history</h2>
        <p className="account-page__panel-note">
          No account orders yet. Browse products or use guest order lookup if
          you checked out without signing in.
        </p>
        <a className="button button--secondary" href="/products">
          Browse products
        </a>
      </section>
    );
  }

  const selectedOrder =
    selectedOrderNumber === null
      ? null
      : orders.find((order) => order.orderNumber === selectedOrderNumber);

  if (selectedOrderNumber !== null && !selectedOrder) {
    return (
      <section
        className="account-page__panel account-page__panel--feature"
        aria-labelledby="order-history-title"
      >
        <h2 id="order-history-title">Order not found</h2>
        <p className="account-page__panel-note">
          This account order was not found. Return to order history or use guest
          lookup if the order was placed without signing in.
        </p>
        <a className="button button--secondary" href="/account/orders">
          Back to orders
        </a>
      </section>
    );
  }

  if (selectedOrder) {
    return <OrderDetailView order={selectedOrder} />;
  }

  return (
    <section className="account-page__orders" aria-labelledby="orders-title">
      <div className="account-page__section-heading">
        <div>
          <p className="account-page__panel-kicker">Order activity</p>
          <h2 id="orders-title">Order history</h2>
        </div>
        <span>{orders.length} orders</span>
      </div>
      <ul className="account-page__order-list">
        {orders.map((order) => (
          <li key={order.orderNumber}>
            <OrderHistoryCard order={order} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function OrderDetailView({ order }: { readonly order: AccountOrderView }) {
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
      <div className="account-page__order-detail-grid">
        <section
          className="account-page__panel"
          aria-labelledby="order-fulfillment-title"
        >
          <p className="account-page__panel-kicker">
            {formatFulfillmentModeLabel(order.fulfillmentMode)}
          </p>
          <h3 id="order-fulfillment-title">{order.fulfillmentLabel}</h3>
          <p className="account-page__panel-note">{order.note}</p>
          <dl className="account-page__definition-list">
            <div>
              <dt>Placed</dt>
              <dd>{formatOrderDetailDate(order.placedDateLabel)}</dd>
            </div>
            <div>
              <dt>Payment</dt>
              <dd>{order.paymentStatusLabel}</dd>
            </div>
          </dl>
        </section>
        <section
          className="account-page__panel"
          aria-labelledby="order-timeline-title"
        >
          <h3 id="order-timeline-title">Timeline</h3>
          <ol className="account-page__timeline">
            {order.timeline.map((step) => (
              <li
                key={step.label}
                className={`account-page__timeline-step account-page__timeline-step--${step.status}`}
              >
                <strong>{step.label}</strong>
                <span>{step.description}</span>
              </li>
            ))}
          </ol>
        </section>
      </div>
      <section
        className="account-page__panel"
        id="review-items"
        aria-labelledby="order-items-title"
      >
        <div className="account-page__panel-header">
          <h3 id="order-items-title">Items in this order</h3>
          <span className="account-page__status-chip">
            {order.items.length} items
          </span>
        </div>
        <ul className="account-page__detail-items">
          {order.items.map((item) => (
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
                <div className="account-page__deferred-action">
                  <button
                    type="button"
                    className="button button--secondary"
                    disabled
                    aria-describedby={`${item.id}-review-note`}
                  >
                    Review item
                  </button>
                  <span id={`${item.id}-review-note`}>
                    Review form is handled in the review slice.
                  </span>
                </div>
              ) : null}
              {item.reviewSubmitted ? (
                <span className="account-page__status-chip">
                  Already reviewed
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      </section>
      <section className="account-page__panel" aria-labelledby="totals-title">
        <h3 id="totals-title">Totals</h3>
        <dl className="account-page__totals">
          {order.totals.map((line) => (
            <div key={line.label}>
              <dt>{line.label}</dt>
              <dd>{line.value}</dd>
            </div>
          ))}
        </dl>
      </section>
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
    <article className="account-page__order-card">
      <div className="account-page__order-card-main">
        <div>
          <p className="account-page__order-number">{order.orderNumber}</p>
          <h3>{order.fulfillmentLabel}</h3>
          <p>{order.note}</p>
        </div>
        <span
          className={`account-page__status-chip account-page__status-chip--${getOrderStatusTone(
            order.status,
          )}`}
        >
          {statusLabel}
        </span>
      </div>
      <div className="account-page__order-meta" aria-label="Order summary">
        <span>{order.placedDateLabel}</span>
        <span>{formatFulfillmentModeLabel(order.fulfillmentMode)}</span>
        <span>{order.paymentStatusLabel}</span>
        <strong>{order.totalLabel}</strong>
      </div>
      <div className="account-page__order-footer">
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
      </div>
    </article>
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
    <div className={`account-page__status account-page__status--${tone}`}>
      <strong>{title}</strong>
      <p>{body}</p>
    </div>
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
      <label>
        Address label
        <input
          value={value.label ?? ""}
          onChange={(event) => {
            updateValue("label", event.target.value);
          }}
        />
      </label>
      <label>
        Recipient name
        <input
          required
          value={value.recipient_name}
          onChange={(event) => {
            updateValue("recipient_name", event.target.value);
          }}
        />
      </label>
      <label>
        Phone
        <input
          value={value.phone ?? ""}
          onChange={(event) => {
            updateValue("phone", event.target.value);
          }}
        />
      </label>
      <label>
        Street address
        <input
          required
          value={value.address_line1}
          onChange={(event) => {
            updateValue("address_line1", event.target.value);
          }}
        />
      </label>
      <label>
        Apt, suite, etc.
        <input
          value={value.address_line2 ?? ""}
          onChange={(event) => {
            updateValue("address_line2", event.target.value);
          }}
        />
      </label>
      <label>
        City
        <input
          required
          value={value.city}
          onChange={(event) => {
            updateValue("city", event.target.value);
          }}
        />
      </label>
      <label>
        State
        <input
          value={value.state ?? ""}
          onChange={(event) => {
            updateValue("state", event.target.value);
          }}
        />
      </label>
      <label>
        ZIP/postal code
        <input
          required
          value={value.postal_code}
          onChange={(event) => {
            updateValue("postal_code", event.target.value);
          }}
        />
      </label>
      <label>
        Country code
        <input
          required
          maxLength={2}
          value={value.country_code}
          onChange={(event) => {
            updateValue("country_code", event.target.value);
          }}
        />
      </label>
      <div className="account-page__form-actions">
        <button type="submit">{submitLabel}</button>
        <button
          type="button"
          className="button button--secondary"
          onClick={onCancel}
        >
          Cancel
        </button>
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

function getOrderStatusTone(status: AccountOrderStatus): "done" | "pending" {
  return status === "pending" ? "pending" : "done";
}

function formatOrderDetailDate(placedDateLabel: string): string {
  return placedDateLabel.replace(/^Placed\s+/i, "");
}
