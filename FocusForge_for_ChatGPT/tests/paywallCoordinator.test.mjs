import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const source = await readFile(new URL('../FocusForgeNative/src/purchases/paywallCoordinator.js', import.meta.url), 'utf8');
const { createPaywallCoordinator } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
test('competing requests present only one paywall', async () => {
 const c=createPaywallCoordinator(); let calls=0;
 const register=()=>{calls++;return new Promise(()=>{});};
 const first=c.open(register,'campaign_trigger');
 assert.equal(c.open(register,'campaign_trigger'),first);
 await Promise.resolve();assert.equal(calls,1);
 c.dismissed();assert.deepEqual(await first,{success:true,dismissed:true});
});
test('SDK error releases a pending presentation and allows retry',async()=>{
 const c=createPaywallCoordinator();const first=c.open(()=>new Promise(()=>{}),'campaign_trigger');
 await Promise.resolve();c.failed();assert.equal((await first).success,false);
 const retry=c.open(()=>new Promise(()=>{}),'campaign_trigger');assert.notEqual(first,retry);
 c.dismissed();assert.equal((await retry).success,true);
});
test('late completion cannot close a newer request',async()=>{
 const c=createPaywallCoordinator();let finishOld;
 const old=c.open(()=>new Promise(resolve=>{finishOld=resolve;}),'campaign_trigger');
 await Promise.resolve();c.dismissed();await old;
 let done=false;const current=c.open(()=>new Promise(()=>{}),'campaign_trigger').then(x=>{done=true;return x;});
 finishOld();await Promise.resolve();await Promise.resolve();await Promise.resolve();assert.equal(done,false);
 c.skipped();assert.deepEqual(await current,{success:true,skipped:true});
});
test('registration rejection reports failure without unlocking access',async()=>{
 const c=createPaywallCoordinator();assert.equal((await c.open(()=>Promise.reject(new Error('failed')),'campaign_trigger')).success,false);
 assert.equal((await c.open(()=>Promise.resolve(),'campaign_trigger')).success,true);
});
