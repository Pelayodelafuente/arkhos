"use client";

import { logout } from "../(auth)/actions";

export function LogoutButton() {
  return (
    <form action={logout}>
      <button
        type="submit"
        className="rounded-md border border-border px-4 py-2 text-sm text-text-secondary transition-colors hover:border-accent hover:text-accent"
      >
        Cerrar sesión
      </button>
    </form>
  );
}
