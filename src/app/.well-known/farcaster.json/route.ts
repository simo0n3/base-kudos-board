import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const forwardedProto = req.headers.get("x-forwarded-proto") || "https";
  const forwardedHost =
    req.headers.get("x-forwarded-host") || req.headers.get("host") || "";
  const envOrigin = process.env.NEXT_PUBLIC_URL;
  const origin = envOrigin || `${forwardedProto}://${forwardedHost}`;
  const header = process.env.FARCASTER_HEADER;
  const payload = process.env.FARCASTER_PAYLOAD;
  const signature = process.env.FARCASTER_SIGNATURE;

  const body = {
    accountAssociation:
      header && payload && signature
        ? { header, payload, signature }
        : undefined,
    name: "Kudos Tribe",
    description: "Kudos / paid posts and communities on Base.",
    iconUrl: `${origin}/globe.svg`,
    entryUrl: `${origin}/mini`,
    noindex: true,
  };

  return Response.json(body, {
    headers: {
      "cache-control": "public, max-age=300, s-maxage=300",
    },
  });
}
