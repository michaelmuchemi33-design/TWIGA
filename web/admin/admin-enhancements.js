import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
const SUPABASE_URL="https://ztyxxikkposfpxsutnfr.supabase.co";
const ANON="sb_publishable_Zex31DUxW6bX3LP6Wlos2Q_pMiZ_JeT";
const sb=createClient(SUPABASE_URL,ANON,{auth:{persistSession:true,autoRefreshToken:false,detectSessionInUrl:true}});
const api="https://ztyxxikkposfpxsutnfr.supabase.co/functions/v1/twiga-platform-admin";
const style=document.createElement("style");
style.textContent=`
#twiga-admin-tools{position:fixed;right:22px;bottom:22px;z-index:99999;display:flex;gap:10px;font:600 13px Inter,system-ui,sans-serif}
#twiga-admin-tools button{cursor:pointer;border:0;border-radius:12px;padding:12px 15px;background:#f47721;color:#111;font-weight:800;box-shadow:0 8px 28px #0004}
#twiga-admin-tools button.secondary{background:#171717;color:#fff;border:1px solid #3a3a3a}
#twiga-admin-modal{position:fixed;inset:0;z-index:100000;background:#0009;display:grid;place-items:center;padding:18px;font:14px Inter,system-ui,sans-serif}
#twiga-admin-modal .panel{width:min(900px,96vw);max-height:88vh;overflow:auto;background:#fff;color:#171717;border-radius:18px;box-shadow:0 24px 80px #0007}
#twiga-admin-modal .head{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:18px 20px;background:#141414;color:#fff;border-radius:18px 18px 0 0}
#twiga-admin-modal .body{padding:18px 20px}
#twiga-admin-modal input,#twiga-admin-modal select,#twiga-admin-modal textarea{width:100%;border:1px solid #d4d4d4;border-radius:10px;padding:10px 12px;background:#fff;color:#171717;font:inherit}
#twiga-admin-modal label{display:block;font-size:12px;font-weight:700;margin:10px 0 5px;color:#333}
#twiga-admin-modal .grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
#twiga-admin-modal .ticket{width:100%;text-align:left;background:#fff!important;color:#171717!important;border:1px solid #e5e5e5!important;box-shadow:none!important;margin:6px 0}
#twiga-admin-modal .ticket small{display:block;color:#666;font-weight:500;margin-top:4px}
#twiga-admin-modal .action{background:#f47721;color:#111;border:0;border-radius:10px;padding:10px 14px;font-weight:800}
#twiga-admin-modal .quiet{background:#eee;color:#222;border:0;border-radius:10px;padding:10px 14px;font-weight:700}
#twiga-admin-modal .bubble{padding:12px;border-radius:12px;margin:8px 0;max-width:85%;white-space:pre-wrap;line-height:1.5}
#twiga-admin-modal .bubble.admin{background:#fff0e6;margin-left:auto}
#twiga-admin-modal .bubble.customer{background:#f2f2f2}
#twiga-admin-modal .muted{color:#666;font-size:12px}
#twiga-admin-modal .error{color:#b42318;background:#fff0ef;padding:10px;border-radius:9px;margin:10px 0}
@media(max-width:600px){#twiga-admin-tools{right:10px;bottom:10px;flex-direction:column}#twiga-admin-modal .grid{grid-template-columns:1fr}#twiga-admin-modal .body{padding:14px}}
`;
document.head.appendChild(style);
const tools=document.createElement("div");tools.id="twiga-admin-tools";
tools.innerHTML='<button id="twiga-open-support">Support inbox</button><button class="secondary" id="twiga-open-cash">Record cash payment</button>';
document.body.appendChild(tools);
let modal=null,clients=[],tickets=[],selected=null;
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const money=n=>new Intl.NumberFormat("en-KE",{style:"currency",currency:"KES",maximumFractionDigits:0}).format(Number(n||0));
const fmt=d=>d?new Date(d).toLocaleString("en-KE",{dateStyle:"medium",timeStyle:"short"}):"—";
async function call(action,payload={}) {
 const {data:{session}}=await sb.auth.getSession();
 if(!session?.access_token) throw new Error("Sign in to the TWIGA admin dashboard first, then reopen this panel.");
 const response=await fetch(api,{method:"POST",headers:{"apikey":ANON,"Authorization":"Bearer "+session.access_token,"Content-Type":"application/json"},body:JSON.stringify({action,...payload})});
 const data=await response.json().catch(()=>({}));
 if(!response.ok||data.error) throw new Error(data.error||("Admin request failed ("+response.status+")."));
 return data;
}
function show(title,body) {
 if(modal)modal.remove();
 modal=document.createElement("div");modal.id="twiga-admin-modal";
 modal.innerHTML='<section class="panel"><header class="head"><strong>'+esc(title)+'</strong><button id="twiga-close" class="quiet">Close</button></header><div class="body">'+body+'</div></section>';
 document.body.appendChild(modal);
 modal.querySelector("#twiga-close").onclick=()=>modal.remove();
 modal.addEventListener("click",e=>{if(e.target===modal)modal.remove()});
 return modal;
}
function errorBox(e){const el=modal?.querySelector("#twiga-error");if(el)el.textContent=e?.message||String(e)}
async function openSupport(){
 const m=show("Customer support inbox",'<p class="muted">Loading customer requests…</p><div id="twiga-error" class="error"></div><div id="twiga-tickets"></div>');
 try{
  const data=await call("overview");tickets=data.tickets||[];
  const list=m.querySelector("#twiga-tickets");
  list.innerHTML=tickets.length?tickets.map(t=>'<button class="ticket" data-id="'+esc(t.id)+'"><strong>'+esc(t.subject)+'</strong><small>'+esc(t.businesses?.name||"Website / unassigned")+' · '+esc(t.contact||"No contact")+' · '+esc(t.status)+' · '+esc(fmt(t.created_at))+'</small><small>'+esc(t.message)+'</small></button>').join(""):'<p class="muted">No customer support requests yet.</p>';
  list.querySelectorAll("[data-id]").forEach(b=>b.onclick=()=>openTicket(b.dataset.id));
 }catch(e){errorBox(e)}
}
async function openTicket(id){
 try{
  const data=await call("ticket_messages",{ticketId:id});selected=data.ticket;
  const m=show("Support · "+(selected.subject||"Customer request"),'<p class="muted">From: '+esc(data.ticket.customerEmail||data.ticket.contact||"Unknown")+' · Business: '+esc(data.ticket.businesses?.name||"Unassigned")+' · Channel: '+esc(data.ticket.channel||"app")+'</p><div class="grid"><div><label>Ticket status</label><select id="twiga-ticket-status"><option value="open">Open</option><option value="in_progress">In progress</option><option value="resolved">Resolved</option></select></div><div style="display:flex;align-items:end"><button class="quiet" id="twiga-back">← All tickets</button></div></div><div id="twiga-thread" style="margin-top:14px;max-height:48vh;overflow:auto"></div><label for="twiga-reply">Reply to customer</label><textarea id="twiga-reply" rows="3" placeholder="Write your reply…"></textarea><div style="display:flex;justify-content:flex-end;margin-top:10px"><button class="action" id="twiga-send">Send reply</button></div><div id="twiga-error" class="error"></div>');
  const status=m.querySelector("#twiga-ticket-status");status.value=selected.status;
  const thread=m.querySelector("#twiga-thread");
  const messages=data.messages?.length?data.messages:[{sender_role:"customer",message:selected.message,created_at:selected.created_at}];
  thread.innerHTML=messages.map(x=>'<div class="bubble '+(x.sender_role==="admin"?"admin":"customer")+'"><b>'+(x.sender_role==="admin"?"TWIGA Support":"Customer")+'</b><div>'+esc(x.message)+'</div><small class="muted">'+esc(fmt(x.created_at))+'</small></div>').join("");
  m.querySelector("#twiga-back").onclick=openSupport;
  status.onchange=async()=>{try{await call("update_ticket",{ticketId:id,status:status.value})}catch(e){errorBox(e)}};
  m.querySelector("#twiga-send").onclick=async()=>{const input=m.querySelector("#twiga-reply");if(!input.value.trim())return;const btn=m.querySelector("#twiga-send");btn.disabled=true;try{await call("reply_ticket",{ticketId:id,message:input.value.trim()});await openTicket(id)}catch(e){errorBox(e);btn.disabled=false}};
 }catch(e){errorBox(e)}
}
async function openCash(){
 const m=show("Record cash payment & activate account",'<p class="muted">Recording cash activates the business for exactly 30 days from the time you save the payment.</p><div id="twiga-error" class="error"></div><label>Customer business</label><select id="twiga-cash-business"><option>Loading customers…</option></select><div class="grid"><div><label>Cash received (KES)</label><input id="twiga-cash-amount" type="number" min="375" step="375" placeholder="Amount received"></div><div><label>Receipt / reference (optional)</label><input id="twiga-cash-ref" maxlength="100" placeholder="Receipt number"></div></div><label>Admin notes (optional)</label><textarea id="twiga-cash-notes" rows="2" maxlength="1000" placeholder="Cash received in person…"></textarea><div style="display:flex;justify-content:flex-end;margin-top:12px"><button class="action" id="twiga-cash-save">Record cash & activate</button></div>');
 try{
  const data=await call("overview");clients=data.clients||[];
  const select=m.querySelector("#twiga-cash-business");
  select.innerHTML=clients.map(c=>'<option value="'+esc(c.id)+'">'+esc(c.name)+' · '+esc(c.ownerEmail||"No owner email")+' · '+esc(c.status)+'</option>').join("");
  const updateAmount=()=>{const c=clients.find(x=>x.id===select.value);m.querySelector("#twiga-cash-amount").value=c?.subscriptionAmount?String(c.subscriptionAmount):""};
  select.onchange=updateAmount;updateAmount();
  m.querySelector("#twiga-cash-save").onclick=async()=>{
   const amount=Number(m.querySelector("#twiga-cash-amount").value);
   if(!select.value) return errorBox(new Error("Choose a business."));
   if(!Number.isFinite(amount)||amount<375||amount%375!==0) return errorBox(new Error("Enter the amount received in KSh 375 increments."));
   const btn=m.querySelector("#twiga-cash-save");btn.disabled=true;
   try{
    const saved=await call("record_payment",{businessId:select.value,amount,method:"cash",reference:m.querySelector("#twiga-cash-ref").value,notes:m.querySelector("#twiga-cash-notes").value});
    const end=saved.periodEnd?new Date(saved.periodEnd).toLocaleString("en-KE",{dateStyle:"medium",timeStyle:"short"}):"30 days from payment time";
    m.querySelector(".body").innerHTML='<div style="padding:22px 4px"><h2 style="font-size:22px;font-weight:800;color:#166534">Cash payment recorded</h2><p style="margin-top:10px">The account is active. Its 30-day period ends <b>'+esc(end)+'</b>.</p><p class="muted" style="margin-top:6px">The payment and admin action have been added to the audit history.</p></div>';
   }catch(e){errorBox(e);btn.disabled=false}
  };
 }catch(e){errorBox(e)}
}
document.getElementById("twiga-open-support").onclick=()=>void openSupport();
document.getElementById("twiga-open-cash").onclick=()=>void openCash();

const skButton=document.createElement("button");skButton.className="secondary";skButton.id="twiga-open-sautikit";skButton.textContent="Connect SautiKit";tools.appendChild(skButton);
style.textContent += "#twiga-admin-tools{flex-direction:column;align-items:flex-end}";
async function openSautiKit(){
 const m=show("Connect TWIGA to SautiKit",'<p class="muted">Use a newly rotated API key from the SautiKit workspace that owns the TWIGA phone number. Do not reuse a key pasted into chat.</p><label for="twiga-sautikit-key">SautiKit API key</label><input id="twiga-sautikit-key" type="password" autocomplete="off" spellcheck="false" placeholder="Paste the rotated SautiKit key"><div style="display:flex;justify-content:flex-end;margin-top:12px"><button class="action" id="twiga-sautikit-connect">Verify & securely connect</button></div><div id="twiga-sautikit-result" style="margin-top:14px"></div><div id="twiga-error" class="error"></div>');
 m.querySelector("#twiga-sautikit-connect").onclick=async()=>{
  const input=m.querySelector("#twiga-sautikit-key"),key=input.value.trim(),button=m.querySelector("#twiga-sautikit-connect"),result=m.querySelector("#twiga-sautikit-result");
  if(key.length<20){errorBox(new Error("Paste a valid rotated SautiKit API key."));return}
  button.disabled=true;button.textContent="Verifying…";
  try{
   const {data:{session}}=await sb.auth.getSession();if(!session?.access_token)throw new Error("Sign in to the TWIGA admin dashboard first.");
   const response=await fetch(SUPABASE_URL+"/functions/v1/twiga-sautikit",{method:"POST",headers:{"apikey":ANON,"Authorization":"Bearer "+session.access_token,"Content-Type":"application/json"},body:JSON.stringify({action:"connect",apiKey:key})});
   const data=await response.json().catch(()=>({}));input.value="";
   if(!response.ok||data.error)throw new Error(data.error||("SautiKit connection failed ("+response.status+")."));
   const matches=Array.isArray(data.matchedLines)?data.matchedLines:[];
   result.innerHTML='<div style="border:1px solid #d1fae5;background:#ecfdf5;border-radius:12px;padding:14px;color:#064e3b"><b>API key verified and saved in encrypted TWIGA Vault.</b><p style="margin-top:8px">Workspace: <code>'+esc(data.workspaceId||"Not provided by SautiKit")+'</code></p><p>Voice models: <b>'+esc(data.modelCount??(data.models||[]).length)+'</b> · Numbers: <b>'+esc(data.numberCount??"Not checked")+'</b> · Agents: <b>'+esc(data.agentCount??"Not checked")+'</b></p><p style="margin-top:8px">'+esc(data.message||"Connection saved.")+'</p>'+(matches.length?'<p style="margin-top:8px">Matched TWIGA line(s): '+matches.map(x=>esc(x.lineNumber)).join(", ")+'</p>':'')+(data.numberCheckError?'<p style="margin-top:8px;color:#9a3412">Number lookup: '+esc(data.numberCheckError)+'</p>':'')+(data.agentCheckError?'<p style="margin-top:8px;color:#9a3412">Agent lookup: '+esc(data.agentCheckError)+'</p>':'')+'</div>';
  }catch(e){input.value="";errorBox(e)}
  finally{button.disabled=false;button.textContent="Verify & securely connect"}
 };
}
skButton.onclick=()=>void openSautiKit();

async function sautiCall(action,payload={}) {
 const {data,error}=await sb.functions.invoke("twiga-sautikit",{body:{action,...payload}});
 if(error)throw error;
 if(data?.error)throw new Error(data.error);
 return data;
}
const numberButton=document.createElement("button");numberButton.className="secondary";numberButton.id="twiga-open-numbers";numberButton.textContent="Issue phone number";tools.appendChild(numberButton);
async function openNumberAssign(){
 const m=show("Issue a SautiKit phone number",'<p class="muted">Assign an existing, active number from the connected SautiKit workspace. This does not buy a number or switch on call routing.</p><div id="twiga-error" class="error"></div><label>Customer business</label><select id="twiga-number-business"><option>Loading businesses…</option></select><label>Available SautiKit numbers</label><div id="twiga-number-list" style="display:grid;gap:8px;margin-top:8px"></div><p id="twiga-number-note" class="muted" style="margin-top:12px"></p><div style="display:flex;justify-content:flex-end;margin-top:14px"><button class="action" id="twiga-assign-number" disabled>Assign selected number</button></div>');
 try{
  const [overview,inventory]=await Promise.all([call("overview"),sautiCall("admin_list_numbers")]);
  clients=overview.clients||[];
  const select=m.querySelector("#twiga-number-business");
  select.innerHTML='<option value="">Choose a business</option>'+clients.map(c=>'<option value="'+esc(c.id)+'">'+esc(c.name)+' · '+esc(c.ownerEmail||"No owner email")+'</option>').join("");
  const list=m.querySelector("#twiga-number-list"),noteEl=m.querySelector("#twiga-number-note"),assign=m.querySelector("#twiga-assign-number");
  const numbers=inventory.numbers||[];let selectedNumber="";
  function render(){
   list.innerHTML=numbers.length?numbers.map(n=>{
    const assigned=!!n.assignedBusinessId,active=String(n.status).toLowerCase()==="active";
    const disabled=assigned||!active;
    return '<button type="button" class="ticket" data-number="'+esc(n.id)+'" '+(disabled?'disabled style="opacity:.58;cursor:not-allowed"':'')+'><strong>'+esc(n.phoneNumber||n.id)+'</strong><small>'+esc(n.country||"")+' · '+esc(n.status)+' · '+esc((n.capabilities||[]).join(", "))+'</small><small>'+(assigned?'Already assigned to '+esc(n.assignedLineNumber||"a business"):'Available to assign')+'</small></button>';
   }).join(""):'<p class="muted">No SautiKit numbers were returned. Connect the shared SautiKit key and refresh.</p>';
   list.querySelectorAll("[data-number]:not([disabled])").forEach(b=>b.onclick=()=>{selectedNumber=b.dataset.number;list.querySelectorAll("[data-number]").forEach(x=>x.style.outline=x.dataset.number===selectedNumber?'2px solid #f47721':'none');assign.disabled=!select.value;});
   assign.disabled=!selectedNumber||!select.value;
   noteEl.textContent=numbers.length&&!numbers.some(n=>!n.assignedBusinessId&&String(n.status).toLowerCase()==="active")?"There are no unassigned active numbers right now. The existing number(s) are already assigned; add or claim another number in SautiKit, then refresh. No number has been purchased.": "Only active numbers that are not assigned to another TWIGA business can be issued.";
  }
  render();
  select.onchange=()=>{assign.disabled=!selectedNumber||!select.value};
  assign.onclick=async()=>{
   if(!selectedNumber||!select.value)return;
   const number=numbers.find(n=>n.id===selectedNumber);
   if(!confirm("Assign "+(number?.phoneNumber||selectedNumber)+" to "+(clients.find(c=>c.id===select.value)?.name||"this business")+"?"))return;
   assign.disabled=true;assign.textContent="Assigning…";
   try{
    const result=await sautiCall("admin_assign_number",{businessId:select.value,numberId:selectedNumber});
    m.querySelector(".body").innerHTML='<div style="padding:22px 4px"><h2 style="font-size:22px;font-weight:800;color:#166534">Number assigned</h2><p style="margin-top:10px"><b>'+esc(result.phoneLine?.line_number||number?.phoneNumber||"")+'</b> is now assigned to '+esc(result.business?.name||"the selected business")+'.</p><p class="muted" style="margin-top:8px">Call routing stays off until the business receptionist is configured and verified.</p></div>';
   }catch(err){errorBox(err);assign.disabled=false;assign.textContent="Assign selected number"}
  };
 }catch(err){errorBox(err)}
}
numberButton.onclick=()=>void openNumberAssign();
