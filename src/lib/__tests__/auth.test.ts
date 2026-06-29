// @vitest-environment node
import { test, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

// `auth.ts` reads/writes cookies via next/headers and is marked server-only.
// Mock those boundaries but keep `jose` real so we exercise actual JWT
// signing/verification round-trips.
const { cookieStore, store } = vi.hoisted(() => {
  const store = new Map<string, string>();
  const cookieStore = {
    set: vi.fn((name: string, value: string) => {
      store.set(name, value);
    }),
    get: vi.fn((name: string) => {
      const value = store.get(name);
      return value !== undefined ? { value } : undefined;
    }),
    delete: vi.fn((name: string) => {
      store.delete(name);
    }),
  };
  return { cookieStore, store };
});

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => cookieStore),
}));

import {
  createSession,
  getSession,
  deleteSession,
  verifySession,
} from "../auth";

const COOKIE_NAME = "auth-token";

function makeRequest(token?: string): NextRequest {
  return {
    cookies: {
      get: (name: string) =>
        name === COOKIE_NAME && token !== undefined ? { value: token } : undefined,
    },
  } as unknown as NextRequest;
}

beforeEach(() => {
  store.clear();
  vi.clearAllMocks();
});

// --- createSession ----------------------------------------------------------

test("createSession stores a signed JWT in the auth-token cookie", async () => {
  await createSession("user-1", "user@example.com");

  expect(cookieStore.set).toHaveBeenCalledTimes(1);
  const [name, token] = cookieStore.set.mock.calls[0];
  expect(name).toBe(COOKIE_NAME);
  // A JWT has three dot-separated segments.
  expect(token.split(".")).toHaveLength(3);
});

test("createSession sets secure cookie options", async () => {
  await createSession("user-1", "user@example.com");

  const options = cookieStore.set.mock.calls[0][2];
  expect(options.httpOnly).toBe(true);
  expect(options.sameSite).toBe("lax");
  expect(options.path).toBe("/");
  // Not running in production, so secure should be false.
  expect(options.secure).toBe(false);

  // Expiry should be roughly 7 days out.
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  const delta = options.expires.getTime() - Date.now();
  expect(delta).toBeGreaterThan(sevenDaysMs - 60_000);
  expect(delta).toBeLessThanOrEqual(sevenDaysMs);
});

// --- getSession -------------------------------------------------------------

test("getSession returns the payload after createSession (round-trip)", async () => {
  await createSession("user-42", "alice@example.com");

  const session = await getSession();

  expect(session).not.toBeNull();
  expect(session?.userId).toBe("user-42");
  expect(session?.email).toBe("alice@example.com");
});

test("getSession returns null when no cookie is present", async () => {
  const session = await getSession();
  expect(session).toBeNull();
});

test("getSession returns null for a malformed/tampered token", async () => {
  store.set(COOKIE_NAME, "not-a-valid-jwt");

  const session = await getSession();
  expect(session).toBeNull();
});

// --- deleteSession ----------------------------------------------------------

test("deleteSession removes the auth-token cookie", async () => {
  await createSession("user-1", "user@example.com");
  expect(store.has(COOKIE_NAME)).toBe(true);

  await deleteSession();

  expect(cookieStore.delete).toHaveBeenCalledWith(COOKIE_NAME);
  expect(store.has(COOKIE_NAME)).toBe(false);
});

// --- verifySession ----------------------------------------------------------

test("verifySession returns the payload for a valid token on the request", async () => {
  await createSession("user-7", "bob@example.com");
  const token = store.get(COOKIE_NAME)!;

  const session = await verifySession(makeRequest(token));

  expect(session?.userId).toBe("user-7");
  expect(session?.email).toBe("bob@example.com");
});

test("verifySession returns null when the request has no token", async () => {
  const session = await verifySession(makeRequest());
  expect(session).toBeNull();
});

test("verifySession returns null for an invalid token", async () => {
  const session = await verifySession(makeRequest("garbage.token.value"));
  expect(session).toBeNull();
});
