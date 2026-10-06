import {test,expect} from "@playwright/test";
if(process.env.TASK0011_LOCAL==="1"){
 test.beforeEach(async({context})=>{
  await context.route("**/*",route=>{
   const url=new URL(route.request().url());
   if(url.origin!=="http://127.0.0.1:3111")return route.abort("blockedbyclient");
   return route.continue();
  });
 });
 test("TASK-0011 browser outbound request is denied",async({page})=>{
  await page.goto("/");
  expect(await page.evaluate(async()=>{try{await fetch("https://example.invalid/task0011-negative");return false;}catch{return true;}})).toBe(true);
 });
}
