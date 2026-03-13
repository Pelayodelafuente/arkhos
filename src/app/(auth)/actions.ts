"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod/v4";

const loginSchema = z.object({
  email: z.string().email("Email no válido"),
  password: z.string().min(1, "La contraseña es obligatoria"),
});

const registerSchema = z.object({
  fullName: z.string().min(1, "El nombre es obligatorio"),
  email: z.string().email("Email no válido"),
  password: z.string().min(8, "Mínimo 8 caracteres"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Las contraseñas no coinciden",
  path: ["confirmPassword"],
});

const resetSchema = z.object({
  email: z.string().email("Email no válido"),
});

export interface AuthState {
  error: string | null;
  success: string | null;
}

export async function login(
  _prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message, success: null };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return { error: "Credenciales incorrectas", success: null };
  }

  redirect("/");
}

export async function register(
  _prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const parsed = registerSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message, success: null };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: {
        full_name: parsed.data.fullName,
      },
    },
  });

  if (error) {
    return { error: error.message, success: null };
  }

  return {
    error: null,
    success: "Cuenta creada. Revisa tu email para confirmar.",
  };
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function resetPassword(
  _prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const parsed = resetSchema.safeParse({
    email: formData.get("email"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message, success: null };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(
    parsed.data.email,
    { redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://arkhos.pelayodelafuente.es"}/auth/callback` }
  );

  if (error) {
    return { error: error.message, success: null };
  }

  return {
    error: null,
    success: "Si el email existe, recibirás un enlace para restablecer tu contraseña.",
  };
}
