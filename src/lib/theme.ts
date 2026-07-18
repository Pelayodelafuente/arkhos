// Tema claro/oscuro de Arkhos (paleta Primary).
// El tema activo vive en <html data-theme="light|dark"> y se persiste en
// localStorage. Un script inline en el RootLayout lo aplica antes del primer
// paint (anti-flash); aquí solo helpers de cliente.

export type ArkhosTheme = "light" | "dark";

export const THEME_STORAGE_KEY = "arkhos-theme";
export const THEME_CHANGE_EVENT = "arkhos:theme-change";

export function getTheme(): ArkhosTheme {
  if (typeof document === "undefined") return "light";
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

export function setTheme(theme: ArkhosTheme): void {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    /* modo privado / storage lleno — el tema sigue aplicado en el DOM */
  }
  window.dispatchEvent(new CustomEvent<ArkhosTheme>(THEME_CHANGE_EVENT, { detail: theme }));
}

export function toggleTheme(): ArkhosTheme {
  const next: ArkhosTheme = getTheme() === "dark" ? "light" : "dark";
  setTheme(next);
  return next;
}

// Script inline para el <head>: aplica el tema guardado antes del primer paint.
// Sin preferencia guardada, el por defecto es SIEMPRE oscuro (se ignora
// prefers-color-scheme). Solo se usa claro si el usuario lo eligió a propósito.
export const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");if(t!=="light"){t="dark"}document.documentElement.dataset.theme=t}catch(e){document.documentElement.dataset.theme="dark"}})();`;
