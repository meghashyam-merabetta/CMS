import { NextRequest, NextResponse } from "next/server";

const API_TARGET = (process.env.API_PROXY_TARGET || "http://16.4.61.3:3000").replace(/\/+$/, "");
const PROXY_ORIGIN = process.env.API_PROXY_ORIGIN || "http://localhost:5173";

async function handleProxy(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const incomingOrigin = request.headers.get("origin");

  // Handle CORS preflight cleanly
  if (request.method === "OPTIONS") {
    const corsHeaders = new Headers({
      "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, Cookie, admin_auth, X-App-Client",
      "Access-Control-Allow-Credentials": "true",
    });
    if (incomingOrigin) {
      corsHeaders.set("Access-Control-Allow-Origin", incomingOrigin);
    } else {
      corsHeaders.set("Access-Control-Allow-Origin", "*");
    }
    return new NextResponse(null, { status: 200, headers: corsHeaders });
  }

  const { path } = await context.params;
  const isTrailingSlashRoute =
    path.length === 2 &&
    path[0] === "admin" &&
    (path[1] === "products" || path[1] === "categories" || path[1] === "management");
  const endpoint = `/api/${path.join("/")}${isTrailingSlashRoute ? "/" : ""}`;
  const search = request.nextUrl.search || "";
  const targetUrl = `${API_TARGET}${endpoint}${search}`;

  const headers = new Headers();
  request.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    // Do not forward client host, origin, or content-length (fetch manages content-length)
    if (lower !== "host" && lower !== "origin" && lower !== "content-length") {
      headers.set(key, value);
    }
  });

  let adminAuthToken =
    request.cookies.get("admin_auth")?.value ||
    request.headers.get("admin_auth");

  if (!adminAuthToken) {
    const authHeader = request.headers.get("authorization");
    if (authHeader) {
      const extracted = authHeader.replace(/^Bearer\s+/i, "").trim();
      if (extracted) {
        adminAuthToken = extracted;
      }
    }
  }

  if (adminAuthToken) {
    headers.set("authorization", `Bearer ${adminAuthToken}`);
    headers.set("admin_auth", adminAuthToken);

    const existingCookie = headers.get("cookie") || "";
    if (!existingCookie.includes("admin_auth=")) {
      headers.set(
        "cookie",
        existingCookie
          ? `${existingCookie}; admin_auth=${adminAuthToken}`
          : `admin_auth=${adminAuthToken}`
      );
    }
  }

  headers.set("origin", PROXY_ORIGIN);

  const method = request.method;
  let body: BodyInit | undefined = undefined;

  if (method !== "GET" && method !== "HEAD") {
    const rawBody = await request.arrayBuffer();
    if (rawBody.byteLength > 0) {
      body = rawBody;
    } else if (method === "POST" || method === "PUT" || method === "PATCH" || method === "DELETE") {
      // Backend csrfGuard requires application/json body for mutating operations
      body = Buffer.from("{}");
    }
    if ((body !== undefined || method === "POST" || method === "PUT" || method === "PATCH" || method === "DELETE") && !headers.has("content-type")) {
      headers.set("content-type", "application/json");
    }
  }

  try {
    const backendResponse = await fetch(targetUrl, {
      method,
      headers,
      body,
      redirect: "manual",
    });

    const responseHeaders = new Headers();

    const setCookies =
      typeof backendResponse.headers.getSetCookie === "function"
        ? backendResponse.headers.getSetCookie()
        : [];

    if (setCookies && setCookies.length > 0) {
      for (const cookie of setCookies) {
        responseHeaders.append("set-cookie", cookie);
      }
    } else {
      const rawCookie = backendResponse.headers.get("set-cookie");
      if (rawCookie) {
        responseHeaders.append("set-cookie", rawCookie);
      }
    }

    // Forward all non-set-cookie and non-content-length headers
    backendResponse.headers.forEach((value, key) => {
      const lower = key.toLowerCase();
      if (lower !== "set-cookie" && lower !== "content-length") {
        responseHeaders.set(key, value);
      }
    });

    // Ensure permissive CORS headers on the proxy response for the frontend
    if (incomingOrigin) {
      responseHeaders.set("Access-Control-Allow-Origin", incomingOrigin);
      responseHeaders.set("Access-Control-Allow-Credentials", "true");
    }

    // 204 No Content and 304 Not Modified responses must have a null body in Fetch API
    const responseBody =
      backendResponse.status === 204 || backendResponse.status === 304
        ? null
        : backendResponse.body;

    return new NextResponse(responseBody, {
      status: backendResponse.status,
      statusText: backendResponse.statusText,
      headers: responseHeaders,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Proxy failed connecting to backend", details: err?.message },
      { status: 502 }
    );
  }
}

export const GET = handleProxy;
export const POST = handleProxy;
export const PUT = handleProxy;
export const PATCH = handleProxy;
export const DELETE = handleProxy;
export const HEAD = handleProxy;
export const OPTIONS = handleProxy;

