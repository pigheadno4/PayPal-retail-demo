import "./support/task0011-browser-network.js";
import {test,expect,type Page} from "@playwright/test";
import {resolve} from "node:path";
import {mkdirSync} from "node:fs";
import {seedRecoveryFixture,task0011Now,type RecoveryFixtureKind} from "./support/task0011-fixture.js";
import axe from "axe-core";
import {reactivationEntrySchema} from "../../shared/src/reactivation.js";
async function open(page:Page,kind:RecoveryFixtureKind,riskReady=true){
 const identity=await seedRecoveryFixture(kind);
 await page.clock.install({time:task0011Now});
 await page.addInitScript({content:axe.source});
 await page.addInitScript(token=>localStorage.setItem("sb-127-auth-token",JSON.stringify({access_token:token,refresh_token:"synthetic-nonreusable",expires_at:4102444800,expires_in:86400,token_type:"bearer",user:{id:"synthetic",aud:"authenticated",role:"authenticated"}})),identity.token);
 await page.route("https://c.paypal.com/da/r/fb.js",route=>riskReady?route.fulfill({contentType:"application/javascript",body:"void 0;"}):route.abort());
 await page.goto("/workspace");return identity;
}
test("owned expired entry, reviewed normal price, verified term, refresh and management",async({page},info)=>{
 const requests:string[]=[];page.on("request",r=>{if(new URL(r.url()).pathname.includes("/api/"))requests.push(new URL(r.url()).pathname);});
 const identity=await open(page,"confirmed");await expect(page.getByRole("heading",{name:"Welcome back. Restore your Go."})).toBeVisible();
 await expect(page.locator(".payment-method")).toHaveCount(0);
 const directory=resolve("tracking/tasks/TASK-0011/artifacts");mkdirSync(directory,{recursive:true});await page.screenshot({path:resolve(directory,`${info.project.name}-expired.png`),fullPage:true});
 expect(requests).not.toContain("/api/v1/me/activation");expect(requests.some(p=>p.endsWith("/confirm"))).toBe(false);
 await page.getByRole("button",{name:"Review recovery payment"}).click();
 const confirm=page.getByRole("button",{name:"Confirm $11.06 recovery"});await expect(confirm).toBeEnabled();
 await expect(page.getByText("Not applicable",{exact:true})).toBeVisible();
 for(const width of [375,768,1024,1440])for(const theme of ["light","dark"]){
  await page.setViewportSize({width,height:1000});await page.evaluate(theme=>{document.documentElement.dataset.theme=theme;},theme);
  if(width===768&&theme==="light")await page.evaluate(async()=>{await document.fonts.ready;window.scrollTo(0,0);await new Promise<void>(done=>requestAnimationFrame(()=>requestAnimationFrame(()=>done())));});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth)).toBe(true);
  await page.screenshot({path:resolve(directory,`${info.project.name}-review-${width}-${theme}.png`),fullPage:true,animations:"disabled"});
 }
 expect(await page.evaluate(async()=>(await (window as unknown as {axe:typeof axe}).axe.run(".reactivation-main")).violations.map(v=>({id:v.id,impact:v.impact})))).toEqual([]);
 await confirm.focus();await expect(confirm).toBeFocused();await page.keyboard.press("Enter");
 await expect(page.getByRole("heading",{name:"#Generate Answer"})).toBeVisible();
 expect(await page.evaluate(key=>sessionStorage.getItem(key),`go-recovery-${identity.arrangementId}`)).toBeNull();
 await expect(page.locator(".payment-method")).toContainText("PayPal Wallet");
 await page.screenshot({path:resolve(directory,`${info.project.name}-recovered.png`),fullPage:true});
 await page.reload();await expect(page.getByRole("heading",{name:"#Generate Answer"})).toBeVisible();
 expect(requests.filter(p=>p.endsWith("/reactivation/confirm"))).toHaveLength(1);expect(requests.some(p=>p.includes("id-token")||p.includes("/capture"))).toBe(false);
});
for(const kind of ["pending","action_required","failed","unknown"] as const)test(`persisted ${kind} gives no allowance or retry after refresh`,async({page},info)=>{
 await open(page,kind);await page.getByRole("button",{name:"Review recovery payment"}).click();await page.getByRole("button",{name:"Confirm $11.06 recovery"}).click();
 await expect(page.getByText(/No new (term or )?allowance/)).toBeVisible();await expect(page.getByRole("button",{name:/Confirm .* recovery/})).toHaveCount(0);
 await page.reload();await expect(page.getByText(/No new (term or )?allowance/)).toBeVisible();await expect(page.getByRole("button",{name:"Review recovery payment"})).toHaveCount(0);await expect(page.getByRole("heading",{name:"#Generate Answer"})).toHaveCount(0);
 const directory=resolve("tracking/tasks/TASK-0011/artifacts");mkdirSync(directory,{recursive:true});await page.screenshot({path:resolve(directory,`${info.project.name}-${kind}.png`),fullPage:true});
});
test("removed original wallet cannot begin recovery",async({page})=>{await open(page,"unavailable");await expect(page.getByRole("button",{name:"Review recovery payment"})).toBeDisabled();await expect(page.getByText("The original saved wallet is not available for payment.")).toBeVisible();});
test("failed risk preparation never enables a payment",async({page})=>{
 await open(page,"confirmed",false);await page.getByRole("button",{name:"Review recovery payment"}).click();await expect(page.getByRole("alert")).toContainText("Risk preparation could not load");await expect(page.getByRole("button",{name:"Confirm $11.06 recovery"})).toBeDisabled();
});
test("quote expiry removes confirmation and requires another explicit review",async({page})=>{
 await open(page,"confirmed");await page.getByRole("button",{name:"Review recovery payment"}).click();await expect(page.getByRole("button",{name:"Confirm $11.06 recovery"})).toBeEnabled();await page.clock.fastForward(16*60*1000);await expect(page.getByRole("button",{name:/Confirm .* recovery/})).toHaveCount(0);await expect(page.getByRole("button",{name:"Review recovery payment"})).toBeVisible();await expect(page.getByRole("alert")).toContainText("This review expired");
});
for(const scenario of ["later expiry","delayed expired confirmation"] as const)test(`${scenario} retires historical confirmed state without an automatic payment`,async({page})=>{
 const identity=await open(page,scenario==="later expiry"?"confirmed":"pending");
 await page.getByRole("button",{name:"Review recovery payment"}).click();const fundedResponse=page.waitForResponse(response=>response.url().endsWith("/reactivation/confirm"));await page.getByRole("button",{name:"Confirm $11.06 recovery"}).click();
 if(scenario==="later expiry")await expect(page.getByRole("heading",{name:"#Generate Answer"})).toBeVisible();
 else await expect(page.getByText("No new allowance has been granted. Do not pay again while this payment is being checked.")).toBeVisible();
 const key=`go-recovery-${identity.arrangementId}`;const operationId=(await(await fundedResponse).json()).operationId as string;
 if(scenario==="later expiry")await page.evaluate(({key,operationId})=>sessionStorage.setItem(key,operationId),{key,operationId});
 expect(await page.evaluate(key=>sessionStorage.getItem(key),key)).toBe(operationId);
 const expired=reactivationEntrySchema.parse({state:"expired",arrangementId:identity.arrangementId,paidThrough:"2026-11-06T13:00:00.000Z",timeZone:"America/Los_Angeles",wallet:{label:"Saved PayPal wallet",eligible:true},canReview:true,blocker:"none"});
 // Advance the external owned-entry/status boundary while leaving stored paid
 // history intact. The production browser components, not a view double, run.
 await page.clock.setSystemTime(new Date("2026-11-08T12:00:00Z"));
 await page.route("**/api/v1/me/summary",route=>route.fulfill({status:404,json:{error:{code:"not_found"}}}));
 await page.route("**/api/v1/me/reactivation",route=>route.fulfill({json:expired}));
 if(scenario==="delayed expired confirmation")await page.route(`**/api/v1/me/reactivation/operations/${operationId}`,route=>route.fulfill({json:{operationId,state:"confirmed",term:{startsAt:"2026-10-06T12:00:00.000Z",endsAt:"2026-11-06T13:00:00.000Z",timeZone:"America/Los_Angeles",includedUnits:100}}}));
 const payments:string[]=[];page.on("request",request=>{if(request.method()==="POST")payments.push(new URL(request.url()).pathname);});
 await page.reload();await expect(page.getByRole("button",{name:"Review recovery payment"})).toBeEnabled();await expect(page.getByText("New period verified",{exact:true})).toHaveCount(0);await expect(page.getByRole("heading",{name:"#Generate Answer"})).toHaveCount(0);
 expect(await page.evaluate(key=>sessionStorage.getItem(key),key)).toBeNull();expect(payments).toEqual([]);
});
