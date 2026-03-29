import { create } from "zustand";

// ─── Toast ────────────────────────────

export type ToastVariant = "success" | "error" | "info";

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
  action?: ToastAction;
}

// ─── Store ────────────────────────────

export interface UIStore {
  // Mobile sidebar
  sidebarOpen: boolean;
  openSidebar: () => void;
  closeSidebar: () => void;
  toggleSidebar: () => void;

  // Desktop sidebar collapsed
  sidebarCollapsed: boolean;
  toggleSidebarCollapsed: () => void;
  loadSidebarState: () => void;

  // Toasts
  toasts: Toast[];
  addToast: (message: string, variant?: ToastVariant, action?: ToastAction) => void;
  removeToast: (id: string) => void;

  // Active modal
  activeModal: string | null;
  openModal: (id: string) => void;
  closeModal: () => void;
}

export const useUIStore = create<UIStore>((set) => ({
  // Mobile sidebar
  sidebarOpen: false,
  openSidebar: () => set({ sidebarOpen: true }),
  closeSidebar: () => set({ sidebarOpen: false }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),

  // Desktop sidebar collapsed
  sidebarCollapsed: false,
  toggleSidebarCollapsed: () => {
    set((s) => {
      const next = !s.sidebarCollapsed;
      try {
        localStorage.setItem('arkhos-sidebar-collapsed', JSON.stringify(next));
      } catch { /* ignore */ }
      return { sidebarCollapsed: next };
    });
  },
  loadSidebarState: () => {
    try {
      const raw = localStorage.getItem('arkhos-sidebar-collapsed');
      if (raw !== null) {
        set({ sidebarCollapsed: JSON.parse(raw) as boolean });
      }
    } catch { /* ignore */ }
  },

  // Toasts
  toasts: [],
  addToast: (message, variant = "info", action?) => {
    const id = Math.random().toString(36).slice(2);
    set((s) => ({ toasts: [...s.toasts, { id, message, variant, action }] }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, 4000);
  },
  removeToast: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  // Active modal
  activeModal: null,
  openModal: (id) => set({ activeModal: id }),
  closeModal: () => set({ activeModal: null }),
}));

// ─── Convenience hook ────────────────

export function useToast() {
  const addToast = useUIStore((s) => s.addToast);
  return {
    success: (message: string, action?: ToastAction) => addToast(message, "success", action),
    error: (message: string, action?: ToastAction) => addToast(message, "error", action),
    info: (message: string, action?: ToastAction) => addToast(message, "info", action),
  };
}
