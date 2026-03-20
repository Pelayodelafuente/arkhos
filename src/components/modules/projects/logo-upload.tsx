"use client";

import { useState, useRef, useCallback } from "react";
import { Upload, X, Loader2 } from "lucide-react";

const MAX_SIZE = 2 * 1024 * 1024; // 2MB
const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];

interface LogoUploadProps {
  logoUrl: string | null;
  onUpload: (file: File) => Promise<string>;
  onRemove: () => Promise<void>;
}

export function LogoUpload({ logoUrl, onUpload, onRemove }: LogoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateAndUpload = useCallback(
    async (file: File) => {
      setError(null);

      if (!ACCEPTED.includes(file.type)) {
        setError("Formato no soportado. Usa JPG, PNG o WebP.");
        return;
      }
      if (file.size > MAX_SIZE) {
        setError("El archivo supera 2MB.");
        return;
      }

      setUploading(true);
      try {
        await onUpload(file);
      } catch {
        setError("Error al subir la imagen.");
      }
      setUploading(false);
    },
    [onUpload]
  );

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) validateAndUpload(file);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) validateAndUpload(file);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function handleRemove() {
    setUploading(true);
    try {
      await onRemove();
    } catch {
      setError("Error al eliminar el logo.");
    }
    setUploading(false);
  }

  if (logoUrl) {
    return (
      <div>
        <label className="mb-1.5 block text-xs font-medium text-text-secondary">
          Logo
        </label>
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logoUrl}
            alt="Logo del proyecto"
            className="h-14 w-14 rounded-xl border border-border object-cover"
          />
          <button
            type="button"
            onClick={handleRemove}
            disabled={uploading}
            className="flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-xs text-text-secondary transition-colors hover:border-red-300 hover:text-red-500 disabled:opacity-50"
          >
            {uploading ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <X size={12} strokeWidth={2} />
            )}
            Eliminar
          </button>
        </div>
        {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
      </div>
    );
  }

  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-text-secondary">
        Logo
      </label>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-5 transition-colors ${
          dragOver
            ? "border-accent bg-accent/5"
            : "border-border bg-sand/30 hover:border-accent/50"
        }`}
      >
        {uploading ? (
          <Loader2 size={20} className="animate-spin text-accent" />
        ) : (
          <>
            <Upload size={18} strokeWidth={1.75} className="mb-1.5 text-text-tertiary" />
            <p className="text-xs text-text-tertiary">
              Arrastra una imagen o haz click
            </p>
            <p className="mt-0.5 text-[10px] text-text-tertiary">
              JPG, PNG, WebP — max 2MB
            </p>
          </>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED.join(",")}
        onChange={handleFileChange}
        className="hidden"
      />
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}
