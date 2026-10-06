import net from "node:net";
import dns from "node:dns";
import { syncBuiltinESMExports } from "node:module";

const local = (host) => ["127.0.0.1", "::1", "localhost"].includes(host);
const connect = net.Socket.prototype.connect;
net.Socket.prototype.connect = function (...args) {
  const normalized = Array.isArray(args[0]) ? args[0] : args;
  const options = typeof normalized[0] === "object" ? normalized[0] : null;
  const host = options?.host ?? (typeof normalized[1] === "string" ? normalized[1] : "localhost");
  if ((options?.path || typeof normalized[0] === "string") || !local(host)) throw new Error("task0011_outbound_denied");
  return connect.apply(this, args);
};
const lookup = dns.lookup;
dns.lookup = function (host, ...args) {
  if (!local(host)) throw new Error("task0011_outbound_denied");
  return lookup.call(this, host, ...args);
};
const promiseLookup=dns.promises.lookup;
dns.promises.lookup=async function(host,...args){
  if(!local(host))throw new Error("task0011_outbound_denied");
  return promiseLookup.call(this,host,...args);
};
for(const name of ["resolve","resolve4","resolve6","resolveAny","resolveCaa","resolveCname","resolveMx","resolveNaptr","resolveNs","resolvePtr","resolveSoa","resolveSrv","resolveTxt","reverse"]){
  dns[name]=()=>{throw new Error("task0011_outbound_denied");};
  dns.promises[name]=async()=>{throw new Error("task0011_outbound_denied");};
}
const fetch = globalThis.fetch;
globalThis.fetch = (input, init) => {
  const url = new URL(typeof input === "string" || input instanceof URL ? input : input.url);
  if (!local(url.hostname)) throw new Error("task0011_outbound_denied");
  return fetch(input, init);
};
syncBuiltinESMExports();
