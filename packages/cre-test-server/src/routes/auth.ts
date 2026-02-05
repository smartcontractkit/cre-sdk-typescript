import { type Context, Hono } from "hono";
import { getCookie, setCookie } from "hono/cookie";

/**
 * Simulates an API that requires cookie-based session authentication.
 *
 * Flow:
 *   1. POST /login  — authenticates and sets multiple session cookies
 *   2. GET  /profile — requires ALL cookies to be present
 *   3. GET  /data    — another protected endpoint requiring ALL cookies
 *
 * The server sets two cookies on login:
 *   - session_id  : identifies the session
 *   - csrf_token  : a secondary token that must accompany every request
 *
 * If any cookie is missing on a protected route the server returns 401.
 * This models the real-world scenario where CRE workflows must forward
 * every cookie received from a login response in subsequent requests.
 *
 * Idea behind this:
 *   1. Login sets multiple Set-Cookie headers — a workflow must capture and forward all of them.
 *   2. Missing any single cookie → 401 with a missing_cookies array telling you exactly which ones are absent.
 *   3. Verbose logging on the server side — shows which cookies were received vs. expected, making debugging easy.
 */

const SESSION_ID = "test-session-abc123";
const CSRF_TOKEN = "csrf-xyz789";

const auth = new Hono();

// ── Login ────────────────────────────────────────────────────────────────────
auth.post("/login", async (c) => {
	const body = await c.req.json<{ username?: string; password?: string }>();

	console.log("[auth /login] Login attempt", { username: body.username });

	if (body.username === "testuser" && body.password === "testpass") {
		setCookie(c, "session_id", SESSION_ID, {
			path: "/",
			httpOnly: true,
			sameSite: "Lax",
		});
		setCookie(c, "csrf_token", CSRF_TOKEN, {
			path: "/",
			sameSite: "Lax",
		});

		console.log("[auth /login] Login successful — cookies set");
		return c.json({ message: "Login successful" });
	}

	console.log("[auth /login] Invalid credentials");
	return c.json({ error: "Invalid credentials" }, 401);
});

// ── Middleware: require both cookies ─────────────────────────────────────────
function requireSession(c: Context) {
	const sessionId = getCookie(c, "session_id");
	const csrfToken = getCookie(c, "csrf_token");

	const missing: string[] = [];
	if (!sessionId) missing.push("session_id");
	if (!csrfToken) missing.push("csrf_token");

	if (missing.length > 0) {
		const receivedCookies = (c.req.raw.headers.get("cookie") ?? "")
			.split(";")
			.map((p) => p.trim().split("=")[0])
			.filter(Boolean);

		console.log(`[auth] Rejected — missing cookies: ${missing.join(", ")}`, {
			received: receivedCookies,
		});
		return c.json({ error: "Unauthorized", missing_cookies: missing }, 401);
	}

	if (sessionId !== SESSION_ID || csrfToken !== CSRF_TOKEN) {
		console.log("[auth] Rejected — invalid cookie values");
		return c.json({ error: "Invalid session" }, 401);
	}

	return null; // session is valid
}

// ── Protected: /profile ─────────────────────────────────────────────────────
auth.get("/profile", (c) => {
	const rejection = requireSession(c);
	if (rejection) return rejection;

	console.log("[auth /profile] Returning profile");
	return c.json({
		username: "testuser",
		email: "testuser@example.com",
		role: "admin",
	});
});

// ── Protected: /data ────────────────────────────────────────────────────────
auth.get("/data", (c) => {
	const rejection = requireSession(c);
	if (rejection) return rejection;

	console.log("[auth /data] Returning data");
	return c.json({
		items: [
			{ id: 1, name: "Item A", value: 100 },
			{ id: 2, name: "Item B", value: 200 },
			{ id: 3, name: "Item C", value: 300 },
		],
	});
});

// ── Logout ──────────────────────────────────────────────────────────────────
auth.post("/logout", (c) => {
	setCookie(c, "session_id", "", { path: "/", maxAge: 0 });
	setCookie(c, "csrf_token", "", { path: "/", maxAge: 0 });

	console.log("[auth /logout] Session cleared");
	return c.json({ message: "Logged out" });
});

export { auth };
