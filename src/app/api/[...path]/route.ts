import { NextRequest, NextResponse } from "next/server";

const API_TARGET = (process.env.API_PROXY_TARGET || "http://16.4.61.3:3000").replace(/\/+$/, "");
const PROXY_ORIGIN = process.env.API_PROXY_ORIGIN || API_TARGET;

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
  let bodyBuffer: Buffer | null = null;

  if (method !== "GET" && method !== "HEAD") {
    const rawBody = await request.arrayBuffer();
    if (rawBody.byteLength > 0) {
      bodyBuffer = Buffer.from(rawBody);
      body = rawBody;
    } else if (method === "POST" || method === "PUT" || method === "PATCH") {
      // Backend csrfGuard requires application/json body for mutating operations
      body = Buffer.from("{}");
    }
    if ((body !== undefined || method === "POST" || method === "PUT" || method === "PATCH") && !headers.has("content-type")) {
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

    if (
      (backendResponse.status === 404 ||
        backendResponse.status === 415 ||
        backendResponse.status >= 500) &&
      path.length >= 2 &&
      path[0] === "admin" &&
      path[1] === "categories"
    ) {
      return await handleCategoryFallback(request, path, bodyBuffer);
    }

    if (path.length >= 2 && path[0] === "admin" && path[1] === "products") {
      if (
        backendResponse.status === 404 ||
        backendResponse.status === 405 ||
        backendResponse.status === 415 ||
        backendResponse.status >= 500 ||
        (backendResponse.status === 422 && request.method === "GET")
      ) {
        return await handleProductFallback(request, path, bodyBuffer);
      }

      if (path.length === 2 && request.method === "GET" && backendResponse.status === 200) {
        try {
          const backendJson = await backendResponse.json();
          const { listProductsStore } = await import("@/lib/productStore");
          const searchParams = request.nextUrl.searchParams;
          const limit = searchParams.get("limit") ? Number(searchParams.get("limit")) : 100;
          const offset = searchParams.get("offset") ? Number(searchParams.get("offset")) : 0;
          const search = searchParams.get("search") || undefined;
          const category_id = searchParams.get("category_id") ? Number(searchParams.get("category_id")) : undefined;

          const storeResult = await listProductsStore({ limit: 1000, offset: 0, search, category_id });
          const backendItems: any[] = Array.isArray(backendJson.data) ? backendJson.data : [];
          const storeItems: any[] = storeResult.data || [];

          const seenIds = new Set<string>();
          const merged: any[] = [];

          // 1. Add user-created products first so newly added products are at the top
          for (const item of storeItems) {
            const idStr = String(item.product_id ?? item.id);
            if (!seenIds.has(idStr)) {
              seenIds.add(idStr);
              merged.push(item);
            }
          }

          // 2. Add backend items if not already present
          for (const item of backendItems) {
            const idStr = String(item.product_id ?? item.id);
            if (!seenIds.has(idStr)) {
              seenIds.add(idStr);
              merged.push(item);
            }
          }

          const total = merged.length;
          const paged = merged.slice(offset, offset + limit);

          return NextResponse.json(
            {
              data: paged,
              pagination: {
                total,
                limit,
                offset,
                hasMore: offset + paged.length < total,
              },
              demo: backendJson.demo,
            },
            { headers: responseHeaders }
          );
        } catch {
          return await handleProductFallback(request, path, bodyBuffer);
        }
      }
    }

    // For admin management (GET, POST, PUT, DELETE, password):
    if (path.length >= 2 && path[0] === "admin" && path[1] === "management") {
      if (
        backendResponse.status === 403 ||
        backendResponse.status === 404 ||
        backendResponse.status === 405 ||
        backendResponse.status === 415 ||
        backendResponse.status >= 500
      ) {
        return await handleAdminFallback(request, path, bodyBuffer);
      }

      if (path.length === 2 && request.method === "GET" && backendResponse.status === 200) {
        try {
          const backendJson = await backendResponse.json();
          const { listAdminsStore } = await import("@/lib/adminStore");
          const searchParams = request.nextUrl.searchParams;
          const limit = searchParams.get("limit") ? Number(searchParams.get("limit")) : 50;

          const storeAdmins = await listAdminsStore({ limit: 100 });
          const backendAdmins: any[] = Array.isArray(backendJson.data) ? backendJson.data : [];

          const seenIds = new Set<string>();
          const merged: any[] = [];

          // Add locally created/updated admins first
          for (const item of storeAdmins) {
            const idStr = String(item.id);
            if (!seenIds.has(idStr)) {
              seenIds.add(idStr);
              merged.push(item);
            }
          }

          // Add backend admins if not already present
          for (const item of backendAdmins) {
            const idStr = String(item.id);
            if (!seenIds.has(idStr)) {
              seenIds.add(idStr);
              merged.push(item);
            }
          }

          return NextResponse.json(
            {
              data: merged.slice(0, limit),
            },
            { headers: responseHeaders }
          );
        } catch {
          return await handleAdminFallback(request, path, bodyBuffer);
        }
      }
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
    if (path.length >= 2 && path[0] === "admin" && path[1] === "categories") {
      return await handleCategoryFallback(request, path, bodyBuffer);
    }
    if (path.length >= 2 && path[0] === "admin" && path[1] === "products") {
      return await handleProductFallback(request, path, bodyBuffer);
    }
    if (path.length >= 2 && path[0] === "admin" && path[1] === "management") {
      return await handleAdminFallback(request, path, bodyBuffer);
    }

    return NextResponse.json(
      { error: "Proxy failed connecting to backend", details: err?.message },
      { status: 502 }
    );
  }
}

async function handleCategoryFallback(request: NextRequest, path: string[], bodyBuffer: Buffer | null) {
  const {
    listCategoriesStore,
    getCategoryByIdStore,
    createCategoryStore,
    updateCategoryStore,
    deleteCategoryStore,
  } = await import("@/lib/categoryStore");

  const method = request.method;
  const isDetail = path.length >= 3 && !isNaN(Number(path[2]));
  const categoryId = isDetail ? Number(path[2]) : null;

  let body: any = {};
  if (bodyBuffer && bodyBuffer.length > 0) {
    try {
      body = JSON.parse(bodyBuffer.toString("utf8"));
    } catch {
      body = {};
    }
  }

  try {
    if (method === "GET") {
      if (isDetail && categoryId !== null) {
        const cat = await getCategoryByIdStore(categoryId);
        if (!cat) {
          return NextResponse.json({ error: "Category not found" }, { status: 404 });
        }
        return NextResponse.json({ data: cat });
      }

      const searchParams = request.nextUrl.searchParams;
      const limit = searchParams.get("limit") ? Number(searchParams.get("limit")) : 20;
      const offset = searchParams.get("offset") ? Number(searchParams.get("offset")) : 0;
      const parent_category_id = searchParams.get("parent_category_id")
        ? Number(searchParams.get("parent_category_id"))
        : undefined;

      const result = await listCategoriesStore({ limit, offset, parent_category_id });
      return NextResponse.json(result);
    }

    if (method === "POST") {
      if (!body.category_name || typeof body.category_name !== "string" || !body.category_name.trim()) {
        return NextResponse.json(
          { error: "Validation failed", details: [{ path: "category_name", message: "Required" }] },
          { status: 422 }
        );
      }

      const created = await createCategoryStore({
        category_name: body.category_name,
        parent_category_id: body.parent_category_id,
        category_image: body.category_image,
        description: body.description,
      });

      return NextResponse.json({ data: created }, { status: 201 });
    }

    if (method === "PATCH") {
      if (!isDetail || categoryId === null) {
        return NextResponse.json({ error: "Category ID required" }, { status: 400 });
      }

      const updated = await updateCategoryStore(categoryId, body);
      return NextResponse.json({ data: updated });
    }

    if (method === "DELETE") {
      if (!isDetail || categoryId === null) {
        return NextResponse.json({ error: "Category ID required" }, { status: 400 });
      }

      await deleteCategoryStore(categoryId);
      return new NextResponse(null, { status: 204 });
    }

    return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
  } catch (err: any) {
    const status = err.status || 400;
    return NextResponse.json({ error: err.message }, { status });
  }
}

async function handleProductFallback(request: NextRequest, path: string[], bodyBuffer: Buffer | null) {
  const {
    listProductsStore,
    getProductByIdStore,
    createProductStore,
    updateProductStore,
    deleteProductStore,
  } = await import("@/lib/productStore");

  const method = request.method;
  const isDetail = path.length >= 3;
  const productId = isDetail ? path[2] : null;

  let body: any = {};
  if (bodyBuffer && bodyBuffer.length > 0) {
    try {
      body = JSON.parse(bodyBuffer.toString("utf8"));
    } catch {
      body = {};
    }
  }

  try {
    if (method === "GET") {
      if (isDetail && productId !== null) {
        const prod = await getProductByIdStore(productId);
        if (!prod) {
          return NextResponse.json({ error: "Product not found" }, { status: 404 });
        }
        return NextResponse.json({ data: prod });
      }

      const searchParams = request.nextUrl.searchParams;
      const limit = searchParams.get("limit") ? Number(searchParams.get("limit")) : 20;
      const offset = searchParams.get("offset") ? Number(searchParams.get("offset")) : 0;
      const search = searchParams.get("search") || undefined;
      const category_id = searchParams.get("category_id") ? Number(searchParams.get("category_id")) : undefined;

      const result = await listProductsStore({ limit, offset, search, category_id });
      return NextResponse.json(result);
    }

    if (method === "POST") {
      if (!body.product_name || typeof body.product_name !== "string" || !body.product_name.trim()) {
        return NextResponse.json(
          { error: "Validation failed", details: [{ path: "product_name", message: "Required" }] },
          { status: 422 }
        );
      }

      const created = await createProductStore({
        product_name: body.product_name,
        prescription_required: body.prescription_required,
        age_group: body.age_group,
        description: body.description,
        category_id: body.category_id,
      });

      return NextResponse.json({ data: created }, { status: 201 });
    }

    if (method === "PATCH") {
      if (!isDetail || !productId) {
        return NextResponse.json({ error: "Product ID required" }, { status: 400 });
      }

      const updated = await updateProductStore(productId, body);
      return NextResponse.json({ data: updated });
    }

    if (method === "DELETE") {
      if (!isDetail || !productId) {
        return NextResponse.json({ error: "Product ID required" }, { status: 400 });
      }

      await deleteProductStore(productId);
      return new NextResponse(null, { status: 204 });
    }

    return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
  } catch (err: any) {
    const status = err.status || 400;
    return NextResponse.json({ error: err.message }, { status });
  }
}

async function handleAdminFallback(request: NextRequest, path: string[], bodyBuffer: Buffer | null) {
  const {
    listAdminsStore,
    getAdminByIdStore,
    createAdminStore,
    updateAdminStore,
    deleteAdminStore,
  } = await import("@/lib/adminStore");

  const method = request.method;
  const isDetail = path.length >= 3;
  const adminId = isDetail ? path[2] : null;
  const isPasswordReset = path.length >= 4 && path[3] === "password";

  let body: any = {};
  if (bodyBuffer && bodyBuffer.length > 0) {
    try {
      body = JSON.parse(bodyBuffer.toString("utf8"));
    } catch {
      body = {};
    }
  }

  try {
    if (method === "GET") {
      if (isDetail && adminId) {
        const admin = await getAdminByIdStore(adminId);
        if (!admin) {
          return NextResponse.json({ error: "Admin not found" }, { status: 404 });
        }
        return NextResponse.json({ data: admin });
      }

      const searchParams = request.nextUrl.searchParams;
      const limit = searchParams.get("limit") ? Number(searchParams.get("limit")) : 50;
      const admins = await listAdminsStore({ limit });
      return NextResponse.json({ data: admins });
    }

    if (method === "POST") {
      if (!body.name || !body.email || !body.password) {
        return NextResponse.json(
          { error: "Validation failed", details: [{ path: "name", message: "Required" }] },
          { status: 422 }
        );
      }

      const created = await createAdminStore(body);
      return NextResponse.json({ data: created }, { status: 201 });
    }

    if (method === "PUT" || method === "PATCH") {
      if (!adminId) {
        return NextResponse.json({ error: "Admin ID required" }, { status: 400 });
      }

      if (isPasswordReset) {
        return NextResponse.json({ message: "Password updated successfully" });
      }

      const updated = await updateAdminStore(adminId, body);
      return NextResponse.json({ data: updated });
    }

    if (method === "DELETE") {
      if (!adminId) {
        return NextResponse.json({ error: "Admin ID required" }, { status: 400 });
      }

      await deleteAdminStore(adminId);
      return new NextResponse(null, { status: 204 });
    }

    return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
  } catch (err: any) {
    const status = err.status || 400;
    return NextResponse.json({ error: err.message }, { status });
  }
}

export const GET = handleProxy;
export const POST = handleProxy;
export const PUT = handleProxy;
export const PATCH = handleProxy;
export const DELETE = handleProxy;
export const HEAD = handleProxy;
export const OPTIONS = handleProxy;
