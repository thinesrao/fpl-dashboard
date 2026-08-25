"use client";
import { createBrowserClient } from "@supabase/ssr";
import { SUPABASE_ENV } from "./env";

export function createClient() {
  const { url, anonKey } = SUPABASE_ENV();
  return createBrowserClient(url, anonKey);
}
