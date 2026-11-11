const GITHUB_RELEASE_API =
  "https://api.github.com/repos/michaelmuchemi33-design/twiga-android-app/releases/tags/latest-apk";
const APK_ASSET_NAME = "twiga.apk";
const VERSION_ASSET_NAME = "version.json";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=3600");
  res.setHeader("X-Content-Type-Options", "nosniff");

  if (req.method !== "GET" && req.method !== "HEAD") {
    res.setHeader("Allow", "GET, HEAD");
    return res.status(405).json({ available: false, error: "Method not allowed." });
  }

  try {
    const response = await fetch(GITHUB_RELEASE_API, {
      headers: {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "TWIGA-public-website"
      },
      signal: AbortSignal.timeout(8000)
    });

    if (!response.ok) {
      return res.status(response.status === 404 ? 503 : 502).json({
        available: false,
        error: "The latest TWIGA Android build is not available yet."
      });
    }

    const release = await response.json();
    const apk = (release.assets || []).find(asset => asset.name === APK_ASSET_NAME);
    if (!apk?.browser_download_url || !Number.isFinite(apk.size) || apk.size <= 0) {
      return res.status(503).json({
        available: false,
        error: "The latest TWIGA Android APK is being published."
      });
    }

    const downloadUrl = new URL(apk.browser_download_url);
    if (downloadUrl.hostname !== "github.com" ||
        !downloadUrl.pathname.includes("/releases/download/latest-apk/")) {
      return res.status(502).json({ available: false, error: "The download address could not be verified." });
    }

    let metadata = {};
    const metadataAsset = (release.assets || []).find(asset => asset.name === VERSION_ASSET_NAME);
    if (metadataAsset?.browser_download_url) {
      try {
        const metadataResponse = await fetch(metadataAsset.browser_download_url, {
          headers: { "User-Agent": "TWIGA-public-website" },
          signal: AbortSignal.timeout(5000)
        });
        if (metadataResponse.ok) metadata = await metadataResponse.json();
      } catch {
        // The APK remains downloadable even if optional version metadata is temporarily unavailable.
      }
    }

    const payload = {
      available: true,
      appId: "com.unity.receptionist",
      versionName: String(metadata.versionName || metadata.appVersionName || "TWIGA"),
      // Legacy release manifests store the monotonically increasing CI build number.
      versionCode: Number(metadata.versionCode ?? metadata.build) || null,
      sizeBytes: apk.size,
      sha256: typeof metadata.sha256 === "string" ? metadata.sha256 : (typeof apk.digest === "string" && apk.digest.startsWith("sha256:") ? apk.digest.slice(7) : null),
      minimumAndroidVersion: String(metadata.minimumAndroidVersion || "7.0"),
      updatedAt: metadata.builtAt || apk.updated_at || release.published_at || null,
      downloadUrl: downloadUrl.href
    };

    res.setHeader("ETag", '"' + (payload.sha256 || String(apk.updated_at || apk.id)) + '"');
    if (req.method === "HEAD") return res.status(200).end();
    return res.status(200).json(payload);
  } catch (error) {
    console.error("TWIGA latest APK lookup failed:", error?.message || "unknown error");
    return res.status(502).json({
      available: false,
      error: "We could not check the latest app release right now."
    });
  }
}
