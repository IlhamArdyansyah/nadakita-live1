import assert from 'node:assert/strict';
import {ticketModel,renderTicket,buildTicketSvg} from '../js/live/ticket-wallet.js';
const colors={vip:'#ff329c',festa:'#d8ff52',festb:'#9bdcff',cat1:'#cbb5ff',cat2:'#f7dfb9'};
const outputs=new Set();
for(const [slug,name,night,date] of [['weeknd','The Weeknd','01','2026-11-20'],['bieber','Justin Bieber','02','2026-11-21'],['bruno','Bruno Mars','03','2026-11-22']]){
 for(const [code,accent] of Object.entries(colors)){
  const order={id:'order-'+slug,status:'confirmed_demo',shows:{slug,title:name+' — Night '+night,show_date:date,artists:{slug,name},venues:{name:'Stadion Utama GBK',city:'Jakarta'}}};
  const ticket={id:'ticket-'+slug+code,code:'NDKT-'+slug+code,attendee_name:'Person <script>',ticket_categories:{code,name:code},checkins:[]};
  const model=ticketModel(order,ticket),html=renderTicket(order,ticket),svg=buildTicketSvg(model);
  assert.equal(model.artistKey,slug);assert.equal(model.zoneKey,code);assert.equal(model.accent,accent);
  assert.match(html,new RegExp('data-ticket-artist="'+slug+'"'));assert.match(html,/data-ticket-qr/);
  assert.match(svg,/Person &lt;script&gt;/);assert.match(svg,/SIMULATION TICKET/);assert.ok(!svg.includes('<script>'));
  outputs.add(svg);
 }
}
assert.equal(outputs.size,15);
const unknown=ticketModel({shows:{title:'Another Show'}},{ticket_categories:{name:'Other Zone'}});
assert.equal(unknown.artistKey,'neutral');assert.equal(unknown.zoneKey,'neutral');
assert.equal(ticketModel({shows:{}},{checkins:{checked_at:'2026-01-01'}}).checkedIn,true);
console.log('PASS 15 unique designs, exact accents, dynamic fields, unknown metadata and object check-ins');
