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

export interface AccountPageProps {
  readonly addresses: readonly AccountAddressView[];
  readonly addressesStatus: "error" | "idle" | "loading" | "ready";
  readonly email: string | null;
  readonly savedPayments: readonly AccountSavedPaymentMethodView[];
  readonly savedPaymentsStatus: "error" | "idle" | "loading" | "ready";
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
  savedPayments,
  savedPaymentsStatus,
  section,
  onCreateAddress,
  onDeleteAddress,
  onDeleteSavedPayment,
  onMakeDefaultAddress,
  onUpdateAddress,
}: AccountPageProps) {
  const [addressForm, setAddressForm] = useState<AddressFormState>(null);

  if (section === "orders") {
    return (
      <section className="route-stage route-stage--account">
        <p className="route-stage__eyebrow">Account</p>
        <h1>Orders</h1>
        <p>Order history and resume payment actions are planned for M14.</p>
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
      <p className="route-stage__eyebrow">Account</p>
      <h1>Account settings</h1>
      <div className="account-page__grid">
        <section
          className="account-page__panel"
          aria-labelledby="profile-title"
        >
          <h2 id="profile-title">Profile</h2>
          <dl className="account-page__definition-list">
            <div>
              <dt>Email</dt>
              <dd>{email ?? "Signed-in buyer"}</dd>
            </div>
          </dl>
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
          {addressesStatus === "loading" ? <p>Loading addresses.</p> : null}
          {addressesStatus === "error" ? (
            <p>Addresses could not be loaded.</p>
          ) : null}
          {addressesStatus !== "loading" && addresses.length === 0 ? (
            <p>No saved addresses.</p>
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

                return (
                  <li key={address.id}>
                    <div className="account-page__address-copy">
                      <strong>{label}</strong>
                      <span>{address.address_line1}</span>
                      <span>{formatAddressCityLine(address)}</span>
                      <div className="account-page__badges">
                        {address.is_default_shipping ? (
                          <span>Default shipping</span>
                        ) : null}
                        {address.is_default_billing ? (
                          <span>Default billing</span>
                        ) : null}
                      </div>
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
                      <button
                        type="button"
                        className="link-button"
                        aria-label={`Delete address ${label}`}
                        disabled={deleteBlocked}
                        title={
                          deleteBlocked
                            ? "Choose another default before deleting this address."
                            : undefined
                        }
                        onClick={() => {
                          void onDeleteAddress?.(address.id);
                        }}
                      >
                        Delete
                      </button>
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
          <h2 id="saved-payments-title">Saved payments</h2>
          {savedPaymentsStatus === "loading" ? (
            <p>Loading saved payments.</p>
          ) : null}
          {savedPaymentsStatus === "error" ? (
            <p>Saved payments could not be loaded.</p>
          ) : null}
          {savedPaymentsStatus !== "loading" &&
          visibleSavedPayments.length === 0 ? (
            <p>No saved payments.</p>
          ) : null}
          {visibleSavedPayments.length > 0 ? (
            <ul className="account-page__saved-payments">
              {visibleSavedPayments.map((savedPayment) => {
                const label = formatSavedPaymentLabel(savedPayment);

                return (
                  <li key={savedPayment.id}>
                    <div>
                      <strong>{label}</strong>
                      <span>{formatSavedPaymentMeta(savedPayment)}</span>
                    </div>
                    <button
                      type="button"
                      className="link-button"
                      aria-label={`Delete saved payment ${label}`}
                      onClick={() => {
                        void onDeleteSavedPayment?.(savedPayment.id);
                      }}
                    >
                      Delete
                    </button>
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
