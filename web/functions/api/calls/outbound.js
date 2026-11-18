function json(body,status=200){return new Response(JSON.stringify(body),{status,headers:{"Content-Type":"application/json","Cache-Control":"no-store"}});}
function constantTimeEqual(a,b){if(a.length!==b.length)return false;let diff=0;for(let i=0;i<a.length;i++)diff|=a.charCodeAt(i)^b.charCodeAt(i);return diff===0;}
export async function onRequest({request,env}){
  if(request.method!=="POST")return json({error:"Method not allowed"},405);
  if(env.TWIGA_OUTBOUND_ENABLED!=="true")return json({error:"Outbound calling is not enabled yet."},503);
  const adminSecret=env.TWIGA_OUTBOUND_ADMIN_SECRET;
  const supplied=(request.headers.get("Authorization")||"").replace(/^Bearer\s+/i,"");
  if(!adminSecret||!supplied||!constantTimeEqual(adminSecret,supplied))return json({error:"Unauthorized"},401);
  const token=env.SAUTIKIT_API_KEY,numberId=env.SAUTIKIT_NUMBER_ID;
  if(!token||!numberId)return json({error:"SautiKit is not configured on the server."},503);
  const body=await request.json().catch(()=>({}));
  const destination=typeof body.to==="string"?body.to.replace(/[\s()-]/g,""):"";
  if(!/^\+[1-9]\d{7,14}$/.test(destination))return json({error:"Provide a valid destination number in international format, e.g. +2547XXXXXXXX."},400);
  const callback=env.TWIGA_VOICE_CALLBACK_URL;
  if(!callback)return json({error:"TWIGA_VOICE_CALLBACK_URL is not configured."},503);
  try{
    const response=await fetch("https://api.sautikit.com/v1/calls",{method:"POST",headers:{Authorization:"Bearer "+token,"Content-Type":"application/json"},body:JSON.stringify({from_number_id:numberId,to:destination,voice_callback_url:callback,metadata:{source:"twiga",business_context:String(body.business_context||"").slice(0,500)}})});
    const data=await response.json().catch(()=>({}));
    if(!response.ok){console.error("SautiKit outbound call failed",response.status);return json({error:"SautiKit could not start the call."},response.status>=500?502:response.status);}
    return json({success:true,call:data});
  }catch(error){console.error("TWIGA outbound request error",error?.message||"unknown error");return json({error:"Unable to reach SautiKit."},502);}
}
