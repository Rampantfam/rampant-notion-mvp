import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

let browserClient: ReturnType<typeof createBrowserClient> | null = null;

function readCookie(name: string) {
  if (typeof window === "undefined") return undefined;
  const match = document.cookie
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${name}=`));
  if (!match) return undefined;
  return decodeURIComponent(match.split("=")[1] ?? "");
}

function writeCookie(name: string, value: string, options?: { path?: string; domain?: string; maxAge?: number; expires?: Date; secure?: boolean }) {
  if (typeof window === "undefined") return;
  const parts = [`${name}=${encodeURIComponent(value)}`];
  if (options?.expires) parts.push(`Expires=${options.expires.toUTCString()}`);
  if (options?.maxAge !== undefined) parts.push(`Max-Age=${options.maxAge}`);
  parts.push(`Path=${options?.path ?? "/"}`);
  if (options?.domain) parts.push(`Domain=${options.domain}`);
  parts.push("SameSite=Lax");
  if (options?.secure ?? window.location.protocol === "https:") parts.push("Secure");
  document.cookie = parts.join("; ");
}

export function createClient() {
  if (!browserClient) {
    browserClient = createBrowserClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        get: readCookie,
        set: writeCookie,
        remove(name, options) {
          writeCookie(name, "", { ...options, maxAge: 0 });
        },
      },
    });
  }
  return browserClient;
}

export const supabase = createClient();
