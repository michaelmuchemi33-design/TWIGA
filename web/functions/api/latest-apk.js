const GITHUB_RELEASE_API = "https://api.github.com/repos/michaelmuchemi33-design/twiga-android-app/releases/tags/latest-apk";
const APK_ASSET_NAME = "twiga.apk";
const VERSION_ASSET_NAME = "version.json";
function json(body, status, method) {
  const headers = {"Content-Type":"application/json","Cache-Control":"public, s-maxage=300, stale-while-revalidate=3600","X-Content-Type-Options":"nosniff"};
  if (method === "HEAD") return new Response(null,{status,headers});
  return new Response(JSON.stringify(body),{status,headers});
}
export async function onRequest({request}) {
  const method = request.method;
  if (method !== "GET" && method !== "HEAD") return json({available:false,error:"Method not allowed."},405,method);
  try {
    const response = await fetch(GITHUB_RELEASE_API,{headers:{Accept:"application/vnd.github+json","X-GitHub-Api-Version":"2022-11-28","User-Agent":"TWIGA-public-website"},signal:AbortSignal.timeout(8000)});
    if (!response.ok) return json({available:false,error:"The latest TWIGA Android build is not available yet."},response.status === 404 ? 503 : 502,method);
    const release = await response.json();
    const apk = (release.assets || []).find(asset => asset.name === APK_ASSET_NAME);
    if (!apk?.browser_download_url || !Number.isFinite(apk.size) || apk.size <= 0) return json({available:false,error:"The latest TWIGA Android APK is being published."},503,method);
    const downloadUrl = new URL(apk.browser_download_url);
    if (downloadUrl.hostname !== "github.com" || !downloadUrl.pathname.includes("/releases/download/latest-apk/")) {
      return json({available:false,error:"The download address could not be verified."},502,method);
    }
    let metadata = {};
    const metadataAsset = (release.assets || []).find(asset => asset.name === VERSION_ASSET_NAME);
    if (metadataAsset?.browser_download_url) {
      try {
        const metadataResponse = await fetch(metadataAsset.browser_download_url,{headers:{"User-Agent":"TWIGA-public-website"},signal:AbortSignal.timeout(5000)});
        if (metadataResponse.ok) metadata = await metadataResponse.json();
      } catch {}
    }
    const payload = {
      available:true,
      appId:"co.ke.twiga.businessassistant",
      versionName:String(metadata.versionName || metadata.appVersionName || "TWIGA"),
      versionCode:Number(metadata.versionCode ?? metadata.build) || null,
      sizeBytes:apk.size,
      sha256:typeof metadata.sha256 === "string" ? metadata.sha256 : (typeof apk.digest === "string" && apk.digest.startsWith("sha256:") ? apk.digest.slice(7) : null),
      minimumAndroidVersion:String(metadata.minimumAndroidVersion || "7.0"),
      updatedAt:metadata.builtAt || apk.updated_at || release.published_at || null,
      downloadUrl:downloadUrl.href
    };
    const etag = '"' + (payload.sha256 || String(apk.updated_at || apk.id)) + '"';
    const headers = {"Content-Type":"application/json","Cache-Control":"public, s-maxage=300, stale-while-revalidate=3600","X-Content-Type-Options":"nosniff","ETag":etag};
    return method === "HEAD" ? new Response(null,{status:200,headers}) : new Response(JSON.stringify(payload),{status:200,headers});
  } catch (error) {
    console.error("TWIGA latest APK lookup failed:",error?.message || "unknown error");
    return json({available:false,error:"We could not check the latest app release right now."},502,method);
  }
}
