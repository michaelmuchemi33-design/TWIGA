function escapeXml(value){return String(value).replace(/[<>&"']/g,c=>({"<":"&lt;",">":"&gt;","&":"&amp;",'"':"&quot;","'":"&apos;"}[c]));}
export async function onRequest({request,env}){
  if(request.method!=="POST"&&request.method!=="GET")return new Response("Method not allowed",{status:405,headers:{Allow:"GET, POST"}});
  const bridgeUrl=env.TWIGA_AUDIO_BRIDGE_URL;
  if(!bridgeUrl||!/^wss:\/\//i.test(bridgeUrl))return new Response("TWIGA audio bridge is not configured.",{status:503,headers:{"Content-Type":"text/plain; charset=utf-8"}});
  const xml='<?xml version="1.0" encoding="UTF-8"?>\n<Response>\n  <Stream name="twiga-agent" url="'+escapeXml(bridgeUrl)+'" track="both_tracks" connect="true" outputSamplingRate="16000" bidirectionalSamplingRate="16000" statusEvents="stream-started stream-stopped stream-error"/>\n</Response>';
  return new Response(xml,{status:200,headers:{"Content-Type":"application/xml; charset=utf-8","Cache-Control":"no-store"}});
}
