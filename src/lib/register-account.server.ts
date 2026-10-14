import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { RegisterAccountInput } from "./register-account";

export async function registerAccountAdmin(input: RegisterAccountInput) {
  const email = input.email.trim().toLowerCase();
  const metadata = {
    full_name: input.fullName.trim(),
    role: input.role,
    company_name: input.companyName.trim(),
  };

  const created = await supabaseAdmin.auth.admin.createUser({
    email,
    password: input.password,
    email_confirm: true,
    user_metadata: metadata,
  });

  if (!created.error) {
    return { userId: created.data.user.id };
  }

  const message = created.error.message.toLowerCase();
  const alreadyExists =
    message.includes("already") || message.includes("registered") || created.error.status === 422;

  if (!alreadyExists) {
    throw new Error(created.error.message);
  }

  const { data } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const existing = data.users.find((user) => user.email?.toLowerCase() === email);
  if (existing && !existing.email_confirmed_at) {
    await supabaseAdmin.auth.admin.updateUserById(existing.id, {
      email_confirm: true,
      user_metadata: { ...existing.user_metadata, ...metadata },
    });
    return { userId: existing.id };
  }

  throw new Error("An account with this email already exists. Sign in instead.");
}
