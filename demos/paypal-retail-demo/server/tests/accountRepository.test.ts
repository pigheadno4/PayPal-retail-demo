import { describe, expect, it } from "vitest";

import {
  createSupabaseAccountRepository,
  type AccountAddressRow,
  type AccountDataSource,
  type AccountSavedPaymentMethodRow,
  type AccountUserProfileRow,
} from "../src/repositories/accountRepository.js";

describe("Account repository", () => {
  it("blocks deleting the only default shipping and billing address", async () => {
    const dataSource = createAccountDataSource({
      addresses: [defaultAddressRow()],
    });
    const repository = createSupabaseAccountRepository({
      dataSource,
      now: "2026-06-16T00:00:00.000Z",
    });

    const result = await repository.deleteAddress({
      authUserId: "user_123",
      addressId: "address_default",
    });

    expect(result).toEqual({
      status: "blocked",
      reason:
        "Choose another default shipping and billing address before deleting this address.",
      addresses: [defaultAddressDto()],
    });
    expect(dataSource.deletedAddressIds).toEqual([]);
  });

  it("promotes an address by clearing existing shipping and billing defaults first", async () => {
    const dataSource = createAccountDataSource({
      addresses: [defaultAddressRow(), secondaryAddressRow()],
    });
    const repository = createSupabaseAccountRepository({
      dataSource,
      now: "2026-06-16T00:00:00.000Z",
    });

    const result = await repository.updateAddress({
      authUserId: "user_123",
      addressId: "address_secondary",
      patch: {
        is_default_shipping: true,
        is_default_billing: true,
      },
    });

    expect(dataSource.clearDefaultShippingCalls).toEqual(["user_123"]);
    expect(dataSource.clearDefaultBillingCalls).toEqual(["user_123"]);
    expect(dataSource.updatedAddresses).toEqual([
      {
        id: "address_secondary",
        patch: {
          is_default_shipping: true,
          is_default_billing: true,
          updated_at: "2026-06-16T00:00:00.000Z",
        },
      },
    ]);
    expect(result).toEqual([
      {
        ...defaultAddressDto(),
        is_default_shipping: false,
        is_default_billing: false,
      },
      {
        ...secondaryAddressDto(),
        is_default_shipping: true,
        is_default_billing: true,
      },
    ]);
  });

  it("does not clear defaults or update when the address is not owned by the buyer", async () => {
    const dataSource = createAccountDataSource({
      addresses: [defaultAddressRow(), secondaryAddressRow()],
    });
    const repository = createSupabaseAccountRepository({
      dataSource,
      now: "2026-06-16T00:00:00.000Z",
    });

    const result = await repository.updateAddress({
      authUserId: "user_123",
      addressId: "address_other_buyer",
      patch: {
        is_default_shipping: true,
        is_default_billing: true,
      },
    });

    expect(dataSource.clearDefaultShippingCalls).toEqual([]);
    expect(dataSource.clearDefaultBillingCalls).toEqual([]);
    expect(dataSource.updatedAddresses).toEqual([]);
    expect(result).toEqual([defaultAddressDto(), secondaryAddressDto()]);
  });
});

interface FakeAccountDataSource extends AccountDataSource {
  readonly clearDefaultBillingCalls: string[];
  readonly clearDefaultShippingCalls: string[];
  readonly deletedAddressIds: string[];
  readonly updatedAddresses: Array<{
    readonly id: string;
    readonly patch: Partial<AccountAddressRow>;
  }>;
}

function createAccountDataSource(input: {
  readonly addresses: readonly AccountAddressRow[];
}): FakeAccountDataSource {
  let addresses = [...input.addresses];
  const clearDefaultBillingCalls: string[] = [];
  const clearDefaultShippingCalls: string[] = [];
  const deletedAddressIds: string[] = [];
  const updatedAddresses: FakeAccountDataSource["updatedAddresses"] = [];

  return {
    clearDefaultBillingCalls,
    clearDefaultShippingCalls,
    deletedAddressIds,
    updatedAddresses,
    async findUserProfileByEmail(): Promise<AccountUserProfileRow | null> {
      return null;
    },
    async listSavedPaymentMethods(): Promise<
      readonly AccountSavedPaymentMethodRow[]
    > {
      return [];
    },
    async getSavedPaymentMethodForUser(): Promise<AccountSavedPaymentMethodRow | null> {
      return null;
    },
    async updateSavedPaymentMethod(): Promise<AccountSavedPaymentMethodRow> {
      throw new Error("not used");
    },
    async listAddresses(authUserId) {
      return addresses.filter((address) => address.auth_user_id === authUserId);
    },
    async createAddress(address) {
      const row = {
        ...address,
        id: "address_created",
        created_at: "2026-06-16T00:00:00.000Z",
        updated_at: "2026-06-16T00:00:00.000Z",
      } satisfies AccountAddressRow;
      addresses = [...addresses, row];
      return row;
    },
    async getAddressForUser(input) {
      return (
        addresses.find(
          (address) =>
            address.id === input.addressId &&
            address.auth_user_id === input.authUserId,
        ) ?? null
      );
    },
    async updateAddress(id, patch) {
      updatedAddresses.push({ id, patch });
      let updatedAddress: AccountAddressRow | null = null;
      addresses = addresses.map((address) => {
        if (address.id !== id) {
          return address;
        }
        updatedAddress = {
          ...address,
          ...patch,
        };
        return updatedAddress;
      });
      if (!updatedAddress) {
        throw new Error(`Address ${id} not found`);
      }
      return updatedAddress;
    },
    async clearDefaultShipping(authUserId) {
      clearDefaultShippingCalls.push(authUserId);
      addresses = addresses.map((address) =>
        address.auth_user_id === authUserId
          ? { ...address, is_default_shipping: false }
          : address,
      );
    },
    async clearDefaultBilling(authUserId) {
      clearDefaultBillingCalls.push(authUserId);
      addresses = addresses.map((address) =>
        address.auth_user_id === authUserId
          ? { ...address, is_default_billing: false }
          : address,
      );
    },
    async deleteAddress(id) {
      deletedAddressIds.push(id);
      addresses = addresses.filter((address) => address.id !== id);
    },
  };
}

function defaultAddressRow(): AccountAddressRow {
  return {
    id: "address_default",
    auth_user_id: "user_123",
    label: "Home",
    recipient_name: "Buyer One",
    phone: "555-0101",
    address_line1: "742 N Fairfax Ave",
    address_line2: null,
    city: "Los Angeles",
    state: "CA",
    postal_code: "90046",
    country_code: "US",
    is_default_shipping: true,
    is_default_billing: true,
    created_at: "2026-06-15T00:00:00.000Z",
    updated_at: "2026-06-15T00:00:00.000Z",
  };
}

function secondaryAddressRow(): AccountAddressRow {
  return {
    ...defaultAddressRow(),
    id: "address_secondary",
    label: "Studio",
    address_line1: "1 Market St",
    city: "San Francisco",
    postal_code: "94105",
    is_default_shipping: false,
    is_default_billing: false,
  };
}

function defaultAddressDto() {
  return {
    id: "address_default",
    label: "Home",
    recipient_name: "Buyer One",
    phone: "555-0101",
    address_line1: "742 N Fairfax Ave",
    address_line2: null,
    city: "Los Angeles",
    state: "CA",
    postal_code: "90046",
    country_code: "US",
    is_default_shipping: true,
    is_default_billing: true,
  };
}

function secondaryAddressDto() {
  return {
    ...defaultAddressDto(),
    id: "address_secondary",
    label: "Studio",
    address_line1: "1 Market St",
    city: "San Francisco",
    postal_code: "94105",
    is_default_shipping: false,
    is_default_billing: false,
  };
}
