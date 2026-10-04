import http from "node:http";
import crypto from "node:crypto";

const PORT = Number(process.env.MOCK_SUPABASE_PORT || 54399);
const ORIGIN = `http://127.0.0.1:${PORT}`;
const SERVICE_KEY = "e2e-service";
const TABLES = [
  "profiles",
  "accounts",
  "transactions",
  "emis",
  "emi_payments",
  "borrowings",
  "borrowing_payments",
];

const { privateKey, publicKey } = crypto.generateKeyPairSync("ec", {
  namedCurve: "P-256",
});
const KID = "e2e-key";
const jwk = {
  ...publicKey.export({ format: "jwk" }),
  kid: KID,
  alg: "ES256",
  use: "sig",
};

let db;
let users;
let refreshTokens;
let objects;
let failures;

const reset = () => {
  db = Object.fromEntries(TABLES.map((t) => [t, []]));
  users = new Map();
  refreshTokens = new Map();
  objects = new Map();
  failures = [];
};
reset();

const b64url = (input) =>
  Buffer.from(
    typeof input === "string" ? input : JSON.stringify(input),
  ).toString("base64url");

const signJwt = (payload) => {
  const head = b64url({ alg: "ES256", typ: "JWT", kid: KID });
  const body = b64url(payload);
  const sig = crypto.sign("sha256", Buffer.from(`${head}.${body}`), {
    key: privateKey,
    dsaEncoding: "ieee-p1363",
  });
  return `${head}.${body}.${sig.toString("base64url")}`;
};

const verifyJwt = (token) => {
  try {
    const [head, body, sig] = token.split(".");
    const ok = crypto.verify(
      "sha256",
      Buffer.from(`${head}.${body}`),
      { key: publicKey, dsaEncoding: "ieee-p1363" },
      Buffer.from(sig, "base64url"),
    );
    if (!ok) return null;
    const payload = JSON.parse(Buffer.from(body, "base64url").toString());
    if (payload.exp * 1000 < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
};

const publicUser = (u) => ({
  id: u.id,
  aud: "authenticated",
  role: "authenticated",
  email: u.email,
  email_confirmed_at: u.created_at,
  user_metadata: u.user_metadata,
  app_metadata: { provider: "email", providers: ["email"] },
  created_at: u.created_at,
  updated_at: new Date().toISOString(),
});

const session = (u) => {
  const now = Math.floor(Date.now() / 1000);
  const refresh = crypto.randomUUID();
  refreshTokens.set(refresh, u.id);
  return {
    access_token: signJwt({
      sub: u.id,
      email: u.email,
      role: "authenticated",
      aud: "authenticated",
      iat: now,
      exp: now + 3600,
      session_id: crypto.randomUUID(),
      user_metadata: u.user_metadata,
      app_metadata: {},
      is_anonymous: false,
    }),
    token_type: "bearer",
    expires_in: 3600,
    expires_at: now + 3600,
    refresh_token: refresh,
    user: publicUser(u),
  };
};

const createUser = ({ email, password, data = {} }) => {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const user = { id, email, password, user_metadata: data, created_at: now };
  users.set(id, user);
  db.profiles.push({
    id,
    email,
    username: data.username ? String(data.username).toLowerCase() : null,
    full_name: data.full_name ?? "",
    phone: null,
    avatar_url: null,
    currency: "INR",
    monthly_salary: 0,
    savings_target: 0,
    onboarding_complete: false,
    streak_count: 0,
    major_account_id: null,
    daily_account_id: null,
    created_at: now,
    updated_at: now,
  });
  return user;
};

const DEFAULTS = {
  accounts: () => ({
    type: "savings",
    balance: 0,
    color_tag: "#4ece6e",
    is_primary: false,
    institution: null,
  }),
  transactions: () => ({ note: null, merchant: null, is_big_expense: false }),
  emis: () => ({ status: "active", principal: 0, interest_rate: 0 }),
  emi_payments: () => ({ account_id: null }),
  borrowings: () => ({ purpose: null, due_date: null, note: null }),
  borrowing_payments: () => ({ note: null }),
  profiles: () => ({}),
};

const send = (res, status, body, headers = {}) => {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "*",
    "Access-Control-Allow-Methods": "GET,POST,PATCH,PUT,DELETE,OPTIONS,HEAD",
    "Access-Control-Expose-Headers": "*",
    ...headers,
  });
  res.end(body === undefined ? "" : JSON.stringify(body));
};

const readBody = (req) =>
  new Promise((resolve) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks)));
  });

const caller = (req) => {
  const bearer = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (bearer === SERVICE_KEY) return { service: true };
  const claims = verifyJwt(bearer);
  return claims ? { uid: claims.sub } : {};
};

const owns = (table, row, who) => {
  if (who.service) return true;
  if (!who.uid) return false;
  return table === "profiles" ? row.id === who.uid : row.user_id === who.uid;
};

const compare = (a, b) => {
  const na = Number(a);
  const nb = Number(b);
  if (
    a !== null &&
    a !== "" &&
    !Number.isNaN(na) &&
    !Number.isNaN(nb) &&
    typeof a !== "boolean"
  )
    return na - nb;
  const da = Date.parse(a);
  const dbb = Date.parse(b);
  if (!Number.isNaN(da) && !Number.isNaN(dbb)) return da - dbb;
  return String(a).localeCompare(String(b));
};

const RESERVED = new Set(["select", "order", "limit", "offset", "on_conflict"]);

const applyFilters = (rows, params) => {
  let out = rows;
  for (const [col, raw] of params) {
    if (RESERVED.has(col)) continue;
    const dot = raw.indexOf(".");
    const op = raw.slice(0, dot);
    const val = raw.slice(dot + 1);
    out = out.filter((r) => {
      const v = r[col];
      if (op === "eq") {
        if (v === null || v === undefined) return false;
        if (String(v) === val) return true;
        const nv = Number(v);
        return val !== "" && !Number.isNaN(nv) && nv === Number(val);
      }
      if (op === "gte") return compare(v, val) >= 0;
      if (op === "lt") return compare(v, val) < 0;
      if (op === "lte") return compare(v, val) <= 0;
      if (op === "gt") return compare(v, val) > 0;
      if (op === "is")
        return val === "null"
          ? v === null || v === undefined
          : String(v) === val;
      return true;
    });
  }
  return out;
};

const project = (rows, select) => {
  if (!select || select === "*") return rows;
  const cols = select.split(",").map((c) => c.trim());
  return rows.map((r) => Object.fromEntries(cols.map((c) => [c, r[c]])));
};

const rlsViolation = () => ({
  code: "42501",
  message: "new row violates row-level security policy for table",
});

const handleRest = async (req, res, url, table) => {
  const who = caller(req);
  if (!TABLES.includes(table)) return send(res, 404, { message: "not found" });
  const params = [...url.searchParams.entries()];
  const scoped = db[table].filter((r) => owns(table, r, who));
  const prefer = req.headers.prefer || "";

  if (req.method === "GET" || req.method === "HEAD") {
    let rows = applyFilters(scoped, params);
    const order = url.searchParams.get("order");
    if (order) {
      const [col, dir] = order.split(".");
      rows = [...rows].sort(
        (a, b) => compare(a[col], b[col]) * (dir === "desc" ? -1 : 1),
      );
    }
    return send(res, 200, project(rows, url.searchParams.get("select")));
  }

  const body = (await readBody(req)).toString();
  const payload = body ? JSON.parse(body) : null;

  if (req.method === "POST") {
    const list = Array.isArray(payload) ? payload : [payload];
    const now = new Date().toISOString();
    for (const input of list) {
      const row = { ...DEFAULTS[table](), created_at: now, ...input };
      if (table !== "profiles") row.id = row.id || crypto.randomUUID();
      if (!owns(table, row, who)) return send(res, 403, rlsViolation());
      if (table === "transactions" && !who.service) {
        const acct = db.accounts.find((a) => a.id === row.account_id);
        if (!acct || acct.user_id !== who.uid)
          return send(res, 403, rlsViolation());
      }
      const idx = db[table].findIndex((r) => r.id === row.id);
      if (idx >= 0) {
        if (!prefer.includes("merge-duplicates"))
          return send(res, 409, { code: "23505", message: "duplicate key" });
        if (!owns(table, db[table][idx], who))
          return send(res, 403, rlsViolation());
        db[table][idx] = { ...db[table][idx], ...input };
      } else {
        db[table].push(row);
      }
    }
    return send(
      res,
      201,
      prefer.includes("return=representation") ? list : undefined,
    );
  }

  if (req.method === "PATCH") {
    const rows = applyFilters(scoped, params);
    for (const r of rows)
      Object.assign(r, payload, { updated_at: new Date().toISOString() });
    const select = url.searchParams.get("select");
    return send(
      res,
      200,
      select || prefer.includes("return=representation")
        ? project(rows, select)
        : undefined,
    );
  }

  if (req.method === "DELETE") {
    const rows = new Set(applyFilters(scoped, params));
    db[table] = db[table].filter((r) => !rows.has(r));
    if (table === "accounts") {
      db.transactions = db.transactions.filter((t) =>
        db.accounts.some((a) => a.id === t.account_id),
      );
    }
    return send(res, 204);
  }
  return send(res, 405, { message: "method" });
};

const handleRpc = async (req, res, fn) => {
  const who = caller(req);
  const args = JSON.parse((await readBody(req)).toString() || "{}");
  const uname = String(args.uname || "").toLowerCase();
  const profile = db.profiles.find((p) => p.username === uname);
  if (fn === "username_available") return send(res, 200, !profile);
  if (fn === "email_for_username") {
    if (!who.service)
      return send(res, 401, {
        code: "42501",
        message: "permission denied for function email_for_username",
      });
    return send(res, 200, profile ? profile.email : null);
  }
  return send(res, 404, { message: "no function" });
};

const handleAuth = async (req, res, url, rest) => {
  if (rest === ".well-known/jwks.json") return send(res, 200, { keys: [jwk] });
  const body =
    req.method === "GET"
      ? {}
      : JSON.parse((await readBody(req)).toString() || "{}");

  if (rest === "signup" && req.method === "POST") {
    if ([...users.values()].some((u) => u.email === body.email))
      return send(res, 422, {
        code: "user_already_exists",
        msg: "User already registered",
      });
    return send(res, 200, session(createUser(body)));
  }
  if (rest === "token") {
    const grant = url.searchParams.get("grant_type");
    if (grant === "password") {
      const u = [...users.values()].find(
        (x) => x.email === body.email && x.password === body.password,
      );
      if (!u)
        return send(res, 400, {
          code: "invalid_credentials",
          error: "invalid_grant",
          error_description: "Invalid login credentials",
          msg: "Invalid login credentials",
        });
      return send(res, 200, session(u));
    }
    if (grant === "refresh_token") {
      const uid = refreshTokens.get(body.refresh_token);
      const u = uid && users.get(uid);
      if (!u)
        return send(res, 400, {
          code: "refresh_token_not_found",
          msg: "Invalid Refresh Token",
        });
      return send(res, 200, session(u));
    }
  }
  if (rest === "user") {
    const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
    const claims = verifyJwt(token);
    const u = claims && users.get(claims.sub);
    if (!u) return send(res, 401, { code: "bad_jwt", msg: "invalid JWT" });
    if (req.method === "PUT") {
      if (body.data) u.user_metadata = { ...u.user_metadata, ...body.data };
      if (body.password) u.password = body.password;
      if (body.email) u.new_email = body.email;
    }
    return send(res, 200, publicUser(u));
  }
  if (rest === "logout") return send(res, 204);
  if (rest === "recover" || rest === "resend") return send(res, 200, {});
  const admin = rest.match(/^admin\/users\/(.+)$/);
  if (admin && req.method === "DELETE") {
    if (!caller(req).service) return send(res, 403, { msg: "forbidden" });
    users.delete(admin[1]);
    return send(res, 200, {});
  }
  return send(res, 404, { msg: `unknown auth route ${rest}` });
};

const handleStorage = async (req, res, url, rest) => {
  const who = caller(req);
  const list = rest.match(/^object\/list\/([^/]+)$/);
  if (list) {
    const body = JSON.parse((await readBody(req)).toString() || "{}");
    const prefix = `${list[1]}/${body.prefix ? `${body.prefix}/` : ""}`;
    const names = [...objects.keys()]
      .filter((k) => k.startsWith(prefix))
      .map((k) => ({ name: k.slice(prefix.length), id: k }));
    return send(res, 200, names);
  }
  const pub = rest.match(/^object\/public\/(.+)$/);
  if (pub && req.method === "GET") {
    const obj = objects.get(pub[1]);
    if (!obj) return send(res, 404, { message: "not found" });
    res.writeHead(200, {
      "Content-Type": obj.type,
      "Access-Control-Allow-Origin": "*",
    });
    return res.end(obj.data);
  }
  const bulk = rest.match(/^object\/([^/]+)$/);
  if (bulk && req.method === "DELETE") {
    const body = JSON.parse((await readBody(req)).toString() || "{}");
    for (const p of body.prefixes || []) objects.delete(`${bulk[1]}/${p}`);
    return send(res, 200, []);
  }
  const put = rest.match(/^object\/([^/]+)\/(.+)$/);
  if (put && (req.method === "POST" || req.method === "PUT")) {
    const [, bucket, path] = put;
    if (!who.service && path.split("/")[0] !== who.uid)
      return send(res, 403, {
        statusCode: "403",
        error: "Unauthorized",
        message: "new row violates row-level security policy",
      });
    objects.set(`${bucket}/${path}`, {
      data: await readBody(req),
      type: req.headers["content-type"] || "application/octet-stream",
    });
    return send(res, 200, {
      Key: `${bucket}/${path}`,
      Id: crypto.randomUUID(),
    });
  }
  return send(res, 404, { message: `unknown storage route ${rest}` });
};

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === "OPTIONS") return send(res, 204);
    const url = new URL(req.url, ORIGIN);
    const path = url.pathname;

    if (path === "/__reset") {
      reset();
      return send(res, 200, { ok: true });
    }
    if (path === "/__state")
      return send(res, 200, {
        db,
        users: [...users.values()].map(publicUser),
        objects: [...objects.keys()],
      });
    if (path === "/__seed" && req.method === "POST") {
      const body = JSON.parse((await readBody(req)).toString());
      const user = createUser(body.user);
      const profile = db.profiles.find((p) => p.id === user.id);
      Object.assign(profile, body.profile || {});
      for (const [table, rows] of Object.entries(body.rows || {}))
        for (const row of rows)
          db[table].push({
            ...DEFAULTS[table](),
            created_at: new Date().toISOString(),
            user_id: user.id,
            ...row,
          });
      return send(res, 200, { id: user.id });
    }
    if (path === "/__fail" && req.method === "POST") {
      failures.push(JSON.parse((await readBody(req)).toString()));
      return send(res, 200, { ok: true });
    }

    const failure = failures.find(
      (f) => req.method === f.method && path.includes(f.path),
    );
    if (failure) {
      failures = failures.filter((f) => f !== failure);
      return send(res, failure.status || 500, {
        message: failure.message || "injected failure",
      });
    }

    let m;
    if ((m = path.match(/^\/rest\/v1\/rpc\/(.+)$/)))
      return handleRpc(req, res, m[1]);
    if ((m = path.match(/^\/rest\/v1\/([^/]+)$/)))
      return handleRest(req, res, url, m[1]);
    if ((m = path.match(/^\/auth\/v1\/(.+)$/)))
      return handleAuth(req, res, url, m[1]);
    if ((m = path.match(/^\/storage\/v1\/(.+)$/)))
      return handleStorage(req, res, url, m[1]);
    return send(res, 404, { message: `no route ${path}` });
  } catch (err) {
    return send(res, 500, { message: String(err) });
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`mock supabase on ${ORIGIN}`);
});
