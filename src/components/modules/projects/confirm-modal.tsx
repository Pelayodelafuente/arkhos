"use client";

import { Modal, Button } from "@/components/ui";

interface ConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  loading?: boolean;
}

export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Eliminar",
  loading = false,
}: ConfirmModalProps) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <p className="mb-4 text-sm text-text-secondary">{message}</p>
      <div className="animate-fade-in-up flex justify-end gap-2" style={{ animationDelay: "150ms" }}>
        <Button variant="secondary" size="sm" onClick={onClose} disabled={loading}>
          Cancelar
        </Button>
        <Button variant="danger" size="sm" onClick={onConfirm} loading={loading}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
