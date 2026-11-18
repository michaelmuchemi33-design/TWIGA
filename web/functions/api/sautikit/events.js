function toHex(bytes){return Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,"0")).join("");}
function json(body,status=200){return new Response(JSON.stringify(body),{status,headers:{"Content-Type":"application/json","Cache-Control":"no-store"}});}
export async function onRequest({request,env}){
  if(request.method!=="POST")return json({error:"Method not allowed"},405);
  const raw=await request.arrayBuffer();
  const secret=env.SAUTIKIT_WEBHOOK_SECRET;
  const signature=request.headers.get("x-sautikit-signature");
  if(secret){
    if(!signature)return json({error:"Missing webhook signature"},401);
    const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign"]);
    const expected=toHex(await crypto.subtle.sign("HMAC",key,raw));
    const supplied=signature.replace(/^sha256=/,"").toLowerCase();
    if(expected.length!==supplied.length||expected!==supplied)return json({error:"Invalid webhook signature"},401);
  }
  let event;
  try{event=JSON.parse(new TextDecoder().decode(raw));}catch{return json({error:"Invalid JSON"},400);}
  console.log("TWIGA SautiKit event",JSON.stringify({type:event.type||event.event||"unknown",call_id:event.call_id||event.id||null}));
  return json({received:true});
}
