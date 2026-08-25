import { SUPABASE_ENV } from "./env";

test("SUPABASE_ENV reads url and anon key from environment", () => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://x.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
  expect(SUPABASE_ENV()).toEqual({ url: "https://x.supabase.co", anonKey: "anon-key" });
});
