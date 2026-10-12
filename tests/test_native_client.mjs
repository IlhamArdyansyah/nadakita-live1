import assert from 'node:assert/strict';
import { createNativeClient } from '../js/live/native-client.js';

const state = new Map();
globalThis.localStorage = {
  getItem: (key) => state.get(key) || null,
  setItem: (key,val) => state.set(key,val),
  removeItem: (key) => state.delete(key),
};
const calls=[];
let loginOk=true,token='jwt-admin';
const header=(contentRange)=>({get(name){return name.toLowerCase()==='content-range'?contentRange:null;}});
globalThis.fetch=async (url,opts={})=>{
 calls.push({url,method:opts.method||'GET',headers:opts.headers||{},body:opts.body});
 let status=200,body={};
 if(url.includes('/auth/v1/token?grant_type=password')) {
   if(!loginOk) { status=400;body={message:'Invalid login credentials'}; }
   else body={access_token:token, refresh_token:'rtok', expires_in:3600, user:{id:'admin-1',email:'admin@example.com'}};
 }else if(url.includes('/auth/v1/user')) {
   if(opts.method==='PUT') body={id:'admin-1'};
   else body={id:'admin-1',email:'admin@example.com'};
 }else if(url.includes('/auth/v1/logout')) body={};
 else if(url.includes('/rest/v1/rpc/is_admin')) body=true;
 else if(url.includes('/rest/v1/rpc/admin_stats')) body={total_orders:1};
 else if(url.includes('/rest/v1/orders')) body=[{id:'order-1',status:'under_review'}];
 else if(url.includes('/rest/v1/profiles')) body={id:'admin-1',full_name:'Demo Admin'};
 else if(url.includes('/storage/v1/object/')) body={Key:'x'};
 else if(url.includes('/rest/v1/shows')) body=[{id:'show-1',slug:'weeknd'}];
 else body=[];
 return {ok: status<400,status,headers:header('0-0/1'), async text(){return JSON.stringify(body)}};
};
const client = createNativeClient('https://vmqxentoizjaiscxujwr.supabase.co','sb_publishable_TEST');
const r=await client.auth.signInWithPassword({email:'admin@example.com',password:'pass'});
assert.equal(r.error,null);assert.equal(r.data.user.email,'admin@example.com');
assert.equal(JSON.parse(state.get('sb-vmqxentoizjaiscxujwr-auth-token')).access_token,'jwt-admin');
let u=await client.auth.getUser();assert.equal(u.data.user.email,'admin@example.com');
let role=await client.rpc('is_admin');assert.equal(role.data,true);
assert.equal(calls.at(-1).headers.Authorization,'Bearer jwt-admin');
let profile=await client.from('profiles').select('*').eq('id','admin-1').maybeSingle();
assert.equal(profile.data.full_name,'Demo Admin');
let orders=await client.from('orders').select('*,shows(title),order_items(quantity)',{count:'exact'}).eq('status','under_review').order('created_at',{ascending:false}).range(0,19);
assert.equal(orders.count,1);assert.equal(orders.data[0].status,'under_review');
assert(calls.at(-1).url.includes('select=')&&calls.at(-1).url.includes('status=eq.under_review'));
await client.from('shows').select('*').order('show_date');
assert.equal(calls.at(-1).method,'GET');
await client.from('orders').update({status:'cancelled'}).eq('id','order-1');
assert.equal(calls.at(-1).method,'PATCH');
await client.storage.from('nadakita-public').upload('artists/demo.jpg',new Blob(['abc'],{type:'image/jpeg'}));
assert.equal(calls.at(-1).headers.Authorization,'Bearer jwt-admin');
assert(client.storage.from('nadakita-public').getPublicUrl('artists/demo.jpg').data.publicUrl.endsWith('artists/demo.jpg'));
await client.auth.signOut();
assert.equal(state.has('sb-vmqxentoizjaiscxujwr-auth-token'),false);
loginOk=false;const err=await client.auth.signInWithPassword({email:'wrong',password:'wrong'});
assert.equal(err.error.message,'Invalid login credentials');
assert.equal(err.error.status,400);
console.log('PASS: sign-in, session, user fetch, admin JWT, RPC, filters, count, update, storage, sign-out, auth errors');
