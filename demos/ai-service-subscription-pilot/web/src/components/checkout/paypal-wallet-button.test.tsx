import { afterEach, describe, expect, it, vi } from "vitest";
import type { ReactElement } from "react";
import type { PayPalButtonsComponentOptions } from "@paypal/paypal-js";

const hooks = vi.hoisted(() => ({ current: null as null | {
  states: unknown[]; refs: { current: unknown }[]; effects: { deps: unknown[] | undefined; cleanup?: () => void }[];
  stateIndex: number; refIndex: number; effectIndex: number; pending: (() => void)[];
} }));
const sdk = vi.hoisted(() => ({ isResolved: false, isRejected: false }));
vi.mock("react", async (original) => {
  const actual = await original<typeof import("react")>();
  return { ...actual,
    useState: (initial: unknown) => {
      const h = hooks.current!; const i = h.stateIndex++;
      if (!(i in h.states)) h.states[i] = typeof initial === "function" ? initial() : initial;
      return [h.states[i], (value: unknown) => { h.states[i] = typeof value === "function" ? value(h.states[i]) : value; }];
    },
    useRef: (initial: unknown) => {
      const h = hooks.current!; const i = h.refIndex++;
      return h.refs[i] ??= { current: initial };
    },
    useEffect: (effect: () => void | (() => void), deps?: unknown[]) => {
      const h = hooks.current!; const i = h.effectIndex++;
      const previous = h.effects[i];
      if (!previous || !deps || deps.some((value, index) => value !== previous.deps?.[index])) {
        h.pending.push(() => { previous?.cleanup?.(); h.effects[i] = { deps, cleanup: effect() || undefined }; });
      }
    },
  };
});
vi.mock("@paypal/react-paypal-js", () => ({
  PayPalScriptProvider: () => null, destroySDKScript: () => {},
  usePayPalScriptReducer: () => [{ ...sdk, options: {} }],
}));

import {
  buildPayPalScriptOptions,
  classifyCaptureError,
  classifyCaptureStatus,
  classifyCreateOrderError,
  classifyCreateOrderResponse,
  renderPayPalControl,
  PayPalWalletButton,
} from "./paypal-wallet-button.js";
import { ApiRequestError, demoApi } from "../../lib/api.js";

function componentHarness() {
  const h = { states: [] as unknown[], refs: [] as { current: unknown }[],
    effects: [] as { deps: unknown[] | undefined; cleanup?: () => void }[],
    stateIndex: 0, refIndex: 0, effectIndex: 0, pending: [] as (() => void)[] };
  return {
    render(element: ReactElement) {
      h.stateIndex = h.refIndex = h.effectIndex = 0;
      hooks.current = h;
      const result = (element.type as (props: unknown) => ReactElement)(element.props);
      hooks.current = null;
      return result;
    },
    flush() { h.pending.splice(0).forEach((effect) => effect()); },
    attach() { h.refs[0].current = {} as HTMLElement; },
    cleanup() { h.effects.forEach((effect) => effect.cleanup?.()); },
    replay(element: ReactElement) { this.cleanup(); h.effects = []; this.render(element); this.flush(); },
  };
}

function descendants(element: ReactElement): ReactElement[] {
  const children = (element.props as { children?: ReactElement | ReactElement[] }).children;
  return [element, ...[children].flat(Infinity).filter((child): child is ReactElement => !!child && typeof child === "object" && "type" in child).flatMap(descendants)];
}

function statusText(element: ReactElement) {
  return (descendants(element).find((child) => (child.props as { role?: string }).role === "status")?.props as { children: string }).children;
}

function deferred<T>() {
  let resolve!: (value: T) => void; let reject!: (error: unknown) => void;
  const promise = new Promise<T>((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
}
const flushPromises = async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); };
const props = {
  intentId: "synthetic-intent", quoteId: "synthetic-quote", accessToken: "synthetic-secret",
  nonce: "synthetic-nonce", operationId: "synthetic-operation", clientMetadataId: "synthetic-client",
  expiresAt: "2099-01-01T00:00:00Z", onOperationResolved: vi.fn(), onVerifying: vi.fn(),
  onComplete: vi.fn(), onPending: vi.fn(), onCancel: vi.fn(), onFailure: vi.fn(),
};

afterEach(() => { hooks.current = null; sdk.isResolved = sdk.isRejected = false; vi.restoreAllMocks(); vi.clearAllMocks(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

function setupPreparation() {
  vi.stubEnv("VITE_PAYPAL_CLIENT_ID", "synthetic-client");
  let now = 10;
  vi.spyOn(performance, "now").mockImplementation(() => now);
  const records: unknown[] = [];
  vi.spyOn(console, "info").mockImplementation((record) => { records.push(record); });
  const response = deferred<Awaited<ReturnType<typeof demoApi.paypalIdToken>>>();
  vi.spyOn(demoApi, "paypalIdToken").mockReturnValue(response.promise);
  const loader = { src: "", nonce: "", async: false, onload: null as null | (() => void), onerror: null as null | (() => void), remove: vi.fn() };
  const append = vi.fn();
  vi.stubGlobal("document", { createElement: () => loader, head: { append } });
  const wallet = componentHarness();
  const root = wallet.render({ type: PayPalWalletButton, props } as unknown as ReactElement);
  const preparation = componentHarness();
  let tree = preparation.render(root); preparation.flush();
  return {
    response, records, loader, append, preparation, setTime: (value: number) => { now = value; },
    render: () => { tree = preparation.render(root); preparation.flush(); return tree; },
    bootstrap: async () => {
      now = 20;
      response.resolve({ idToken: "synthetic-id-token", fraudNet: { sourceId: "AI_SERVICE_STUDIO_CHECKOUT", sandbox: true } });
      await flushPromises(); tree = preparation.render(root); preparation.flush();
    },
    official: () => {
      loader.onload!(); tree = preparation.render(root); preparation.flush();
      const provider = descendants(tree).find((element) => typeof element.type === "function")!;
      return (provider.props as { children: ReactElement }).children;
    },
  };
}

describe("actual preparation lifecycle measurements", () => {
  it("keeps uncertain creation pending across duplicate SDK rejection callbacks without capture", async () => {
    const run = setupPreparation(); await run.bootstrap(); const element = run.official(); let options!: PayPalButtonsComponentOptions;
    vi.stubGlobal("window", { paypal: { Buttons: (value: PayPalButtonsComponentOptions) => { options = value; return { isEligible: () => true, render: async () => {}, close: async () => {} }; } } });
    const control = componentHarness(); control.render(element); control.attach(); control.flush(); sdk.isResolved = true; control.render(element); control.flush(); await flushPromises();
    const create = vi.spyOn(demoApi, "createPayPalOrder").mockRejectedValue(new Error("private-canary"));
    const capture = vi.spyOn(demoApi, "capturePayPalOrder");
    await expect(options.createOrder!({} as Parameters<NonNullable<typeof options.createOrder>>[0], {} as Parameters<NonNullable<typeof options.createOrder>>[1])).rejects.toThrow("payment_in_progress");
    options.onError!({ message: "SDK rejection" }); options.onError!({ message: "duplicate rejection" });
    expect(props.onPending).toHaveBeenCalledWith(expect.objectContaining({ stage: "creation_unconfirmed", funding: "pending", reusableReadiness: "not_requested" }));
    expect(props.onFailure).not.toHaveBeenCalled();
    expect(create).toHaveBeenCalledOnce(); expect(capture).not.toHaveBeenCalled();
    control.cleanup(); run.preparation.cleanup();
  });
  it("attempts official Subscribe options without changing the capture/vault script boundary", async () => {
    const run = setupPreparation(); await run.bootstrap();
    const official = run.official();
    expect((official.props as { options: unknown }).options).toMatchObject({ fundingSource: "paypal", style: { label: "subscribe", shape: "rect", layout: "vertical" } });
    expect(buildPayPalScriptOptions({ clientId: "c", idToken: "t", nonce: "n" })).toMatchObject({ intent: "capture", vault: true, currency: "USD", components: "buttons", dataCspNonce: "n" });
    run.preparation.cleanup();
  });

  it("times the serial actual bootstrap, FraudNet, reducer and official render boundaries", async () => {
    const run = setupPreparation();
    expect(run.append).not.toHaveBeenCalled(); expect(run.records).toEqual([]);
    await run.bootstrap();
    expect(run.records).toEqual([{ stage: "bootstrap", durationMs: 10, outcome: "success" }]);
    expect(run.append).toHaveBeenCalledWith(run.loader);
    run.setTime(35); const element = run.official();
    const rendered = deferred<void>(); let officialOptions: unknown;
    vi.stubGlobal("window", { paypal: { Buttons: (options: unknown) => { officialOptions = options; return { isEligible: () => true, render: () => rendered.promise, close: async () => {} }; } } });
    const control = componentHarness(); control.render(element); control.attach(); control.flush();
    expect(run.records).toEqual([{ stage: "bootstrap", durationMs: 10, outcome: "success" }, { stage: "fraudnet", durationMs: 15, outcome: "success" }]);
    run.setTime(50); sdk.isResolved = true; control.render(element); control.flush();
    expect(officialOptions).toMatchObject({ style: { label: "subscribe" } });
    expect(run.records.at(-1)).toEqual({ stage: "sdk", durationMs: 15, outcome: "success" });
    expect(statusText(run.render())).not.toContain("Secure PayPal checkout ready");
    run.setTime(70); rendered.resolve(); await flushPromises();
    expect(run.records.at(-1)).toEqual({ stage: "render", durationMs: 20, outcome: "success" });
    expect(statusText(run.render())).toContain("Secure PayPal checkout ready");
    for (const record of run.records) expect(Object.keys(record as object).sort()).toEqual(["durationMs", "outcome", "stage"]);
    control.cleanup(); run.preparation.cleanup(); expect(run.records).toHaveLength(4);
  });

  it.each(["resolve", "reject"])("cancels bootstrap and suppresses late %s before a fresh attempt", async (late) => {
    const run = setupPreparation(); run.setTime(15); run.preparation.cleanup();
    if (late === "resolve") run.response.resolve({ idToken: "private-canary" } as Awaited<ReturnType<typeof demoApi.paypalIdToken>>);
    else run.response.reject(new Error("private-canary"));
    await flushPromises();
    expect(run.records).toEqual([{ stage: "bootstrap", durationMs: 5, outcome: "cancelled" }]);
    const fresh = setupPreparation(); await fresh.bootstrap();
    expect(fresh.records).toEqual([{ stage: "bootstrap", durationMs: 10, outcome: "success" }]);
    fresh.preparation.cleanup();
  });

  it.each([NaN, Infinity, -1])("discards invalid bootstrap clock arithmetic (%s)", async (invalid) => {
    const run = setupPreparation(); run.setTime(invalid); run.response.reject(new Error("private-canary")); await flushPromises();
    expect(run.records).toEqual([]); run.preparation.cleanup();
  });

  it("reports FraudNet terminal failure once and ignores duplicate events", async () => {
    const run = setupPreparation(); await run.bootstrap();
    const failed = run.loader.onerror!; run.setTime(30); failed(); run.setTime(40); failed(); run.loader.onload!();
    expect(run.records).toEqual([{ stage: "bootstrap", durationMs: 10, outcome: "success" }, { stage: "fraudnet", durationMs: 10, outcome: "failure" }]);
    run.preparation.cleanup(); expect(run.records).toHaveLength(2);
  });

  it("cancels FraudNet on invalidation without emitting late callbacks", async () => {
    const run = setupPreparation(); await run.bootstrap(); const loaded = run.loader.onload!; const failed = run.loader.onerror!;
    run.setTime(25); run.preparation.cleanup(); run.setTime(40); loaded(); failed();
    expect(run.records).toEqual([{ stage: "bootstrap", durationMs: 10, outcome: "success" }, { stage: "fraudnet", durationMs: 5, outcome: "cancelled" }]);
    expect(run.loader.remove).toHaveBeenCalledOnce();
  });

  it("starts fresh bootstrap timing only on the existing manual retry", async () => {
    const run = setupPreparation(); run.setTime(18); run.response.reject(new Error("private-canary")); await flushPromises();
    const tree = run.render();
    expect(run.records).toEqual([{ stage: "bootstrap", durationMs: 8, outcome: "failure" }]);
    expect(demoApi.paypalIdToken).toHaveBeenCalledOnce();
    const second = deferred<Awaited<ReturnType<typeof demoApi.paypalIdToken>>>(); vi.mocked(demoApi.paypalIdToken).mockReturnValue(second.promise);
    const retry = descendants(tree).find((element) => element.type === "button")!;
    run.setTime(30); (retry.props as { onClick: () => void }).onClick(); run.render();
    expect(demoApi.paypalIdToken).toHaveBeenCalledTimes(2);
    run.setTime(45); second.reject(new Error("private-canary")); await flushPromises();
    expect(run.records.at(-1)).toEqual({ stage: "bootstrap", durationMs: 15, outcome: "failure" });
    run.preparation.cleanup(); expect(run.records).toHaveLength(2);
  });

  it("suppresses late render readiness after the provider reports preparation failure", async () => {
    const run = setupPreparation(); await run.bootstrap(); const official = run.official(); const rendered = deferred<void>();
    const ready = vi.fn((official.props as { ready: () => void }).ready);
    const element = { ...official, props: { ...(official.props as object), ready } } as ReactElement;
    let options!: PayPalButtonsComponentOptions;
    vi.stubGlobal("window", { paypal: { Buttons: (value: PayPalButtonsComponentOptions) => { options = value; return { isEligible: () => true, render: () => rendered.promise, close: async () => {} }; } } });
    const control = componentHarness(); control.render(element); control.attach(); control.flush();
    sdk.isResolved = true; control.render(element); control.flush(); options.onError!({ message: "private-canary" });
    rendered.resolve(); await flushPromises();
    expect(run.records.at(-1)).toMatchObject({ stage: "render", outcome: "failure" });
    expect(ready).not.toHaveBeenCalled();
    expect(statusText(run.render())).not.toContain("Secure PayPal checkout ready");
    expect(props.onFailure).not.toHaveBeenCalled(); control.cleanup(); run.preparation.cleanup();
  });

  it("retains actual provider payment callbacks and expired/unmounted guards", async () => {
    const run = setupPreparation(); await run.bootstrap(); const element = run.official(); let options!: PayPalButtonsComponentOptions;
    vi.stubGlobal("window", { paypal: { Buttons: (value: PayPalButtonsComponentOptions) => { options = value; return { isEligible: () => true, render: async () => {}, close: async () => {} }; } } });
    const control = componentHarness(); control.render(element); control.attach(); control.flush(); sdk.isResolved = true; control.render(element); control.flush(); await flushPromises();
    const order = vi.spyOn(demoApi, "createPayPalOrder").mockResolvedValue({ status: "ready", operationId: "resolved-operation", orderId: "synthetic-order" } as Awaited<ReturnType<typeof demoApi.createPayPalOrder>>);
    const capture = vi.spyOn(demoApi, "capturePayPalOrder").mockResolvedValue({ operationId: "resolved-operation", funding: "verified", reusableReadiness: "pending", customerMessage: "sanitized" });
    const data = {} as Parameters<NonNullable<typeof options.createOrder>>[0];
    const actions = {} as Parameters<NonNullable<typeof options.createOrder>>[1];
    expect(await options.createOrder!(data, actions)).toBe("synthetic-order");
    expect(order).toHaveBeenCalledWith({ intentId: props.intentId, quoteId: props.quoteId, operationId: props.operationId, clientMetadataId: props.clientMetadataId }, props.accessToken);
    await options.onApprove!({ orderID: "synthetic-order" } as Parameters<NonNullable<typeof options.onApprove>>[0], {} as Parameters<NonNullable<typeof options.onApprove>>[1]);
    expect(capture).toHaveBeenCalledWith("synthetic-order", { intentId: props.intentId, quoteId: props.quoteId, operationId: "resolved-operation" }, props.accessToken);
    expect(props.onComplete).toHaveBeenCalledOnce(); options.onCancel!({} as Parameters<NonNullable<typeof options.onCancel>>[0], {} as Parameters<NonNullable<typeof options.onCancel>>[1]); expect(props.onCancel).toHaveBeenCalledOnce();
    expect(run.records).toHaveLength(4);
    const expired = { ...element, props: { ...(element.props as object), expiresAt: "2000-01-01T00:00:00Z" } } as ReactElement;
    control.render(expired); control.flush(); await expect(options.createOrder!(data, actions)).rejects.toThrow("review_expired");
    control.cleanup(); await options.onApprove!({ orderID: "synthetic-order" } as Parameters<NonNullable<typeof options.onApprove>>[0], {} as Parameters<NonNullable<typeof options.onApprove>>[1]);
    expect(order).toHaveBeenCalledOnce(); expect(capture).toHaveBeenCalledOnce(); run.preparation.cleanup();
  });

  it.each(["sdk", "render"])("cancels the active %s stage and suppresses its late settlement", async (stage) => {
    const run = setupPreparation(); await run.bootstrap(); run.setTime(30); const element = run.official();
    const rendered = deferred<void>();
    vi.stubGlobal("window", { paypal: { Buttons: () => ({ isEligible: () => true, render: () => rendered.promise, close: async () => {} }) } });
    const control = componentHarness(); control.render(element); control.attach(); control.flush();
    if (stage === "render") { run.setTime(40); sdk.isResolved = true; control.render(element); control.flush(); }
    run.setTime(50); control.cleanup(); rendered.resolve(); await flushPromises();
    expect(run.records.at(-1)).toEqual({ stage, durationMs: stage === "sdk" ? 20 : 10, outcome: "cancelled" });
    expect(run.records.filter((record) => (record as { stage: string }).stage === stage)).toHaveLength(1);
    run.preparation.cleanup();
  });

  it("uses fresh effect-local SDK timers during Strict Mode cleanup/replay", async () => {
    const run = setupPreparation(); await run.bootstrap(); run.setTime(30); const element = run.official();
    vi.stubGlobal("window", { paypal: { Buttons: () => ({ isEligible: () => true, render: async () => {}, close: async () => {} }) } });
    const control = componentHarness(); control.render(element); control.attach(); control.flush();
    run.setTime(35); control.replay(element); run.setTime(50); sdk.isResolved = true; control.render(element); control.flush(); await flushPromises();
    expect(run.records.filter((record) => (record as { stage: string }).stage === "sdk")).toEqual([{ stage: "sdk", durationMs: 5, outcome: "cancelled" }, { stage: "sdk", durationMs: 15, outcome: "success" }]);
    control.cleanup(); run.preparation.cleanup();
  });

  it.each(["sdk", "construction", "ineligible", "render"])("contains actual %s failure in the matching measurement stage", async (failure) => {
    const run = setupPreparation(); await run.bootstrap(); run.setTime(30); const element = run.official();
    vi.stubGlobal("window", { paypal: { Buttons: () => {
      if (failure === "construction") throw new Error("private-canary");
      return { isEligible: () => failure !== "ineligible", render: () => Promise.reject(new Error("private-canary")), close: async () => {} };
    } } });
    const control = componentHarness(); control.render(element); control.attach(); control.flush();
    run.setTime(40); sdk.isRejected = failure === "sdk"; sdk.isResolved = failure !== "sdk"; control.render(element); control.flush(); await flushPromises();
    expect(run.records.at(-1)).toEqual({ stage: failure === "sdk" ? "sdk" : "render", durationMs: failure === "sdk" ? 10 : 0, outcome: "failure" });
    expect(props.onFailure).not.toHaveBeenCalled();
    control.cleanup(); run.preparation.cleanup();
  });
});

describe("PayPalWalletButton payment boundary", () => {
  it("passes the request nonce through the supported PayPal SDK data option", () => {
    expect(buildPayPalScriptOptions({
      clientId: "paypal-client-id",
      idToken: "ID-TOKEN-REDACTED",
      nonce: "request-nonce",
    })).toMatchObject({
      clientId: "paypal-client-id",
      dataUserIdToken: "ID-TOKEN-REDACTED",
      dataCspNonce: "request-nonce",
    });
  });

  it.each([
    ["verified", "complete"],
    ["pending", "pending"],
    ["failed", "failed"],
  ] as const)("routes %s funding to %s customer state", (funding, expected) => {
    expect(classifyCaptureStatus({
      operationId: "33333333-3333-4333-8333-333333333333",
      funding,
      reusableReadiness: funding === "verified" ? "ready" : funding,
      customerMessage: "sanitized",
    })).toBe(expected);
  });

  it.each([
    [new TypeError("network interruption"), "pending"],
    [new SyntaxError("malformed response"), "pending"],
    [new ApiRequestError(503, "internal_error"), "pending"],
    [new ApiRequestError(503, "payment_not_available"), "pending"],
    [new ApiRequestError(409, "payment_not_available"), "failed"],
  ] as const)("classifies capture exception %s as %s", (error, expected) => {
    expect(classifyCaptureError(error)).toBe(expected);
  });

  it("maps unresolved creation to creation-specific unverified status", () => {
    expect(classifyCreateOrderResponse({
      status: "in_progress",
      operationId: "33333333-3333-4333-8333-333333333333",
      retryable: true,
    })).toEqual({
      kind: "pending",
      status: {
        operationId: "33333333-3333-4333-8333-333333333333",
        stage: "creation_unconfirmed",
        funding: "pending",
        reusableReadiness: "not_requested",
        customerMessage: "PayPal order creation is unconfirmed. Funding has not been verified. No access was granted.",
      },
    });
  });

  it.each([
    [new TypeError("network interruption"), "pending"],
    [new SyntaxError("malformed response"), "pending"],
    [new ApiRequestError(503, "internal_error"), "pending"],
    [new ApiRequestError(200, null), "pending"],
    [new ApiRequestError(409, "payment_not_available"), "failed"],
  ] as const)("classifies create exception %s as %s", (error, expected) => {
    expect(classifyCreateOrderError(error)).toBe(expected);
  });
});

describe("official render lifecycle", () => {
  it("does not signal ready until render fulfillment and closes on cleanup", async () => {
    let resolve!: () => void;
    const states: string[] = [];
    let closed = 0;
    const cleanup = renderPayPalControl({
      isEligible: () => true,
      render: () => new Promise<void>((done) => { resolve = done; }),
      close: async () => { closed += 1; },
    }, {} as HTMLElement, () => states.push("ready"), () => states.push("failed"));
    expect(states).toEqual([]);
    resolve();
    await Promise.resolve();
    expect(states).toEqual(["ready"]);
    cleanup();
    expect(closed).toBe(1);
  });
  it("ignores late render fulfillment after invalidation", async () => {
    let resolve!: () => void;
    const states: string[] = [];
    const cleanup = renderPayPalControl({ isEligible: () => true,
      render: () => new Promise<void>((done) => { resolve = done; }), close: async () => {},
    }, {} as HTMLElement, () => states.push("ready"), () => states.push("failed"));
    cleanup(); resolve(); await Promise.resolve();
    expect(states).toEqual([]);
  });
  it.each(["ineligible", "rejected", "throws"])("contains %s preparation failure", async (failure) => {
    const states: string[] = [];
    const cleanup = renderPayPalControl({ isEligible: () => failure !== "ineligible",
      render: () => { if (failure === "throws") throw new Error("private"); return Promise.reject(new Error("private")); },
      close: async () => {},
    }, {} as HTMLElement, () => states.push("ready"), () => states.push("failed"));
    await Promise.resolve(); await Promise.resolve();
    expect(states).toEqual(["failed"]); cleanup();
  });
});
