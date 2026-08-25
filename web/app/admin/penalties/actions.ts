"use server";
import { revalidatePath } from "next/cache";
import { addPenaltyEvent, deletePenaltyEvent, penaltyEventSchema } from "@/lib/penalties";
import { createClient } from "@/lib/supabase/server";

export async function addPenaltyAction(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.is_anonymous) throw new Error("unauthorized");

  const parsed = penaltyEventSchema.safeParse({
    gameweek: formData.get("gameweek"),
    player_name: formData.get("player_name"),
    event_type: formData.get("event_type"),
  });
  if (!parsed.success) throw new Error("Invalid penalty event");
  await addPenaltyEvent(parsed.data);
  revalidatePath("/admin/penalties");
}

export async function deletePenaltyAction(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.is_anonymous) throw new Error("unauthorized");

  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing id");
  await deletePenaltyEvent(id);
  revalidatePath("/admin/penalties");
}
