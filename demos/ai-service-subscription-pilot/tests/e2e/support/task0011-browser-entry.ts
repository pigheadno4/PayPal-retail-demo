declare global {
  interface ImportMetaEnv {
    readonly VITE_PAYPAL_CLIENT_ID?: string;
  }
}
export {default as React} from "react";
export {createRoot} from "react-dom/client";
export {QuoteReview} from "../../../web/src/components/checkout/quote-review.js";
