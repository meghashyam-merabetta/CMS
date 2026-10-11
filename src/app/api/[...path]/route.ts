import { NextRequest, NextResponse } from "next/server";

const API_TARGET = (process.env.API_PROXY_TARGET || "http://16.4.61.3:3000").replace(/\/+$/, "");

async function handleProxy(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const incomingOrigin = request.headers.get("origin");

  // Handle CORS preflight cleanly
  if (request.method === "OPTIONS") {
    const corsHeaders = new Headers({
      "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, Cookie",
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
  const endpoint = `/api/${path.join("/")}`;
  const search = request.nextUrl.search || "";
  const targetUrl = `${API_TARGET}${endpoint}${search}`;

  const headers = new Headers();
  request.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    // Do not forward client host or origin since backend only allows localhost:5173 / localhost:3000
    if (lower !== "host" && lower !== "origin") {
      headers.set(key, value);
    }
  });

  // Extract admin_auth from Authorization, admin_auth header, or incoming cookies
  let adminAuthToken =
    request.headers.get("admin_auth") ||
    request.cookies.get("admin_auth")?.value;

  const authHeader = request.headers.get("authorization");
  if (authHeader) {
    const extracted = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (extracted) {
      adminAuthToken = extracted;
    }
  }

  // Inject admin_auth as Authorization, admin_auth header, and admin_auth cookie for backend
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

  // Always supply the backend's allowed origin so backend CORS check succeeds
  headers.set("origin", "http://localhost:5173");

  const method = request.method;
  const body =
    method === "GET" || method === "HEAD"
      ? undefined
      : await request.arrayBuffer();

  try {
    const backendResponse = await fetch(targetUrl, {
      method,
      headers,
      body,
      redirect: "manual",
    });

    const responseHeaders = new Headers();
    backendResponse.headers.forEach((value, key) => {
      if (key.toLowerCase() === "set-cookie") {
        responseHeaders.append("set-cookie", value);
      } else {
        responseHeaders.set(key, value);
      }
    });

    // Ensure permissive CORS headers on the proxy response for the frontend
    if (incomingOrigin) {
      responseHeaders.set("Access-Control-Allow-Origin", incomingOrigin);
      responseHeaders.set("Access-Control-Allow-Credentials", "true");
    }

    return new NextResponse(backendResponse.body, {
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
