import { renderToStaticMarkup } from "react-dom/server";
import { expect,it } from "vitest";
import { FraudNetPreparation } from "./paypal-wallet-button.js";
it("binds recovery metadata to server-owned risk parameters without acquisition bootstrap",()=>{
 const html=renderToStaticMarkup(<FraudNetPreparation bootstrap={{sourceId:"AI_SERVICE_STUDIO_CHECKOUT",sandbox:false}} nonce="test-nonce" clientMetadataId={"a".repeat(32)} onReady={()=>{}} onFailure={()=>{}}/>);
 expect(html).toContain('"f":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"');expect(html).toContain('"sandbox":false');expect(html).toContain('"s":"AI_SERVICE_STUDIO_CHECKOUT"');expect(html).not.toContain("id-token");
});
