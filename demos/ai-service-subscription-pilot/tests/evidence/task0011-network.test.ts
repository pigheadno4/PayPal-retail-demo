import {spawnSync} from "node:child_process";
import {expect,it} from "vitest";
it.each([
 "await fetch('https://example.invalid/')",
 "(await import('node:dns')).lookup('example.invalid',()=>{})",
 "await (await import('node:dns')).promises.lookup('example.invalid')",
 "(await import('node:dns')).resolve4('example.invalid',()=>{})",
 "(await import('node:net')).connect({host:'203.0.113.1',port:443})",
 "new (await import('node:net')).Socket().connect([{host:'203.0.113.1',port:443}])",
])("rejects outbound request before transport: %s",attempt=>{
 const result=spawnSync(process.execPath,["--import=./tests/e2e/support/task0011-deny-network.mjs","--input-type=module","-e",`try{${attempt};process.exit(2)}catch(e){if(e.message!=='task0011_outbound_denied')throw e}`],{env:{PATH:process.env.PATH,NODE_ENV:"test"},encoding:"utf8",timeout:1000});
 expect(result.status).toBe(0);expect(result.error).toBeUndefined();
});
