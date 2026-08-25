import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { SUPABASE_ENV } from "./env";

export async function createClient() {
  const cookieStore = await cookies();
  const { url, anonKey } = SUPABASE_ENV();
  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // called from a Server Component; middleware refreshes the session
        }
      },
    },
  });
}
