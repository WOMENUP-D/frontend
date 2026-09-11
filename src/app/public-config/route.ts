export const dynamic = "force-dynamic";

export function GET() {
  // This allowlist is the entire browser-visible configuration contract.
  return Response.json({
    apiKey: process.env.FIREBASE_WEB_API_KEY ?? "",
    authDomain: process.env.FIREBASE_WEB_AUTH_DOMAIN ?? "",
    projectId: process.env.FIREBASE_WEB_PROJECT_ID ?? "",
    appId: process.env.FIREBASE_WEB_APP_ID ?? "",
    storageBucket: process.env.FIREBASE_WEB_STORAGE_BUCKET ?? "",
    messagingSenderId: process.env.FIREBASE_WEB_SENDER_ID ?? "",
  }, { headers: { "Cache-Control": "no-store" } });
}
