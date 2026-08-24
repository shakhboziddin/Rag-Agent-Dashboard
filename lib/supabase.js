import { createClient } from "@supabase/supabase-js";

/**
 * Lazy Supabase client.
 *
 * Next.js pre-renders pages at BUILD time, where env vars may not exist yet.
 * Calling createClient() at module level would throw "supabaseUrl is required"
 * and kill the build. This proxy only creates the real client the first time
 * a property is actually used — which always happens in the browser.
 */
let _client = null;

function getClient() {
  if (_client) return _client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    // During build / SSR without env vars, return a harmless stub so nothing throws
    return null;
  }

  _client = createClient(url, key);
  return _client;
}

// No-op response used when the client is not available (build time only)
const emptyResult = Promise.resolve({ data: null, error: null, count: 0 });

const stubBuilder = () => {
  const b = {};
  const methods = [
    "select", "insert", "update", "upsert", "delete", "eq", "neq", "filter",
    "order", "limit", "maybeSingle", "single", "match", "in", "is",
  ];
  methods.forEach((m) => { b[m] = () => b; });
  b.then = (res) => emptyResult.then(res);
  return b;
};

export const supabase = new Proxy({}, {
  get(_target, prop) {
    const client = getClient();

    if (!client) {
      // build-time fallbacks
      if (prop === "from") return () => stubBuilder();
      if (prop === "auth") {
        return {
          getSession: () => Promise.resolve({ data: { session: null } }),
          onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
          signInWithPassword: () => Promise.resolve({ error: new Error("Supabase not configured") }),
          signUp: () => Promise.resolve({ error: new Error("Supabase not configured") }),
          signOut: () => Promise.resolve({ error: null }),
        };
      }
      return undefined;
    }

    const value = client[prop];
    return typeof value === "function" ? value.bind(client) : value;
  },
});