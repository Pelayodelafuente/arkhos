"use client";

import { useState, useRef, useCallback } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ImportPreview<T = unknown> {
  newRows: T[];
  duplicateRows: T[];
  warnings: string[];
}

export interface GlobalImporterProps<T = unknown> {
  title: string;
  description?: string;
  acceptedFormats: string;
  onParse: (file: File) => Promise<ImportPreview<T>>;
  onConfirm: (preview: ImportPreview<T>) => Promise<void>;
  renderPreviewRow?: (row: T, index: number) => React.ReactNode;
  previewColumns?: string[];
}

type ImportStatus = "idle" | "parsing" | "preview" | "confirming" | "success" | "error";

// ── Spinner ───────────────────────────────────────────────────────────────────

function Spinner({ color = "var(--module-patrimonio)" }: { color?: string }) {
  return (
    <div
      className="h-8 w-8 rounded-full animate-spin mx-auto"
      style={{
        border: `2px solid color-mix(in srgb, ${color} 15%, transparent)`,
        borderTopColor: color,
      }}
      role="status"
      aria-label="Cargando"
    />
  );
}

// ── UploadIcon ────────────────────────────────────────────────────────────────

function UploadIcon({ color }: { color: string }) {
  return (
    <svg
      width="40"
      height="40"
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle cx="20" cy="20" r="20" fill={`color-mix(in srgb, ${color} 12%, transparent)`} />
      <path
        d="M20 27V20M20 20L17 23M20 20L23 23"
        stroke={color}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M14 26H13a3 3 0 0 1 0-6h.09A6 6 0 0 1 26 18.5a4 4 0 0 1-.5 7.5H26"
        stroke={color}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function GlobalImporter<T = unknown>({
  title,
  description,
  acceptedFormats,
  onParse,
  onConfirm,
  renderPreviewRow,
  previewColumns,
}: GlobalImporterProps<T>) {
  const [status, setStatus] = useState<ImportStatus>("idle");
  const [preview, setPreview] = useState<ImportPreview<T> | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [importedCount, setImportedCount] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const accentColor = "var(--module-patrimonio)";

  // ── File handling ────────────────────────────────────────────────────────────

  const handleFile = useCallback(
    async (file: File) => {
      setStatus("parsing");
      setErrorMsg(null);
      try {
        const result = await onParse(file);
        setPreview(result);
        setStatus("preview");
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : "Error al procesar el archivo");
        setStatus("error");
      }
    },
    [onParse]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => setIsDragOver(false);

  const handleZoneClick = () => {
    if (status === "idle") inputRef.current?.click();
  };

  const handleZoneKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key === "Enter" || e.key === " ") && status === "idle") {
      inputRef.current?.click();
    }
  };

  // ── Confirm ──────────────────────────────────────────────────────────────────

  const handleConfirm = async () => {
    if (!preview) return;
    setStatus("confirming");
    try {
      await onConfirm(preview);
      setImportedCount(preview.newRows.length);
      setStatus("success");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Error al importar los datos");
      setStatus("error");
    }
  };

  // ── Reset ────────────────────────────────────────────────────────────────────

  const handleReset = () => {
    setStatus("idle");
    setPreview(null);
    setErrorMsg(null);
    setImportedCount(0);
    if (inputRef.current) inputRef.current.value = "";
  };

  // ── Renders ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Header */}
      <div
        className="rounded-xl p-4"
        style={{
          backgroundColor: "var(--bg-card)",
          border: "1px solid var(--border-stone, rgba(160,120,80,0.25))",
        }}
      >
        <h3 className="font-heading text-base" style={{ color: "var(--text-primary)" }}>
          {title}
        </h3>
        {description && (
          <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
            {description}
          </p>
        )}
      </div>

      {/* ── IDLE / PARSING ── */}
      {(status === "idle" || status === "parsing") && (
        <div
          role="button"
          tabIndex={0}
          onClick={handleZoneClick}
          onKeyDown={handleZoneKeyDown}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className="rounded-xl p-10 text-center space-y-4 transition-all duration-150"
          style={{
            backgroundColor: isDragOver
              ? `color-mix(in srgb, ${accentColor} 6%, transparent)`
              : "var(--bg-card)",
            border: `2px dashed ${
              isDragOver || status === "parsing"
                ? accentColor
                : "var(--border-stone, rgba(160,120,80,0.3))"
            }`,
            cursor: status === "parsing" ? "default" : "pointer",
          }}
          aria-label={`Zona para subir archivo. Formatos aceptados: ${acceptedFormats}`}
        >
          <input
            ref={inputRef}
            type="file"
            accept={acceptedFormats}
            className="hidden"
            onChange={handleInputChange}
            aria-hidden="true"
          />

          {status === "parsing" ? (
            <>
              <Spinner />
              <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
                Procesando archivo...
              </p>
            </>
          ) : (
            <>
              <UploadIcon color={accentColor} />
              <div className="space-y-1">
                <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                  Arrastra el archivo aquí o haz clic para seleccionar
                </p>
                <p className="text-xs" style={{ color: "var(--text-tertiary, var(--text-muted))" }}>
                  Formatos aceptados: {acceptedFormats}
                </p>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  inputRef.current?.click();
                }}
                className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-150"
                style={{
                  border: `1px solid ${accentColor}`,
                  color: accentColor,
                }}
              >
                Seleccionar archivo
              </button>
            </>
          )}
        </div>
      )}

      {/* ── PREVIEW ── */}
      {status === "preview" && preview && (
        <div className="space-y-4">
          {/* Counters */}
          <div
            className="rounded-xl p-4 space-y-3"
            style={{
              backgroundColor: "var(--bg-card)",
              border: "1px solid var(--border-stone, rgba(160,120,80,0.25))",
            }}
          >
            <div className="flex flex-wrap gap-3">
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium"
                style={{
                  backgroundColor: "color-mix(in srgb, var(--color-gain, #3B7A57) 10%, transparent)",
                  color: "var(--color-gain, #3B7A57)",
                }}
              >
                <span className="font-mono font-bold">{preview.newRows.length}</span> filas nuevas
              </span>
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium"
                style={{
                  backgroundColor: "color-mix(in srgb, var(--text-tertiary, #888) 10%, transparent)",
                  color: "var(--text-tertiary, var(--text-muted))",
                }}
              >
                <span className="font-mono font-bold">{preview.duplicateRows.length}</span> duplicados
              </span>
              {preview.warnings.length > 0 && (
                <span
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium"
                  style={{
                    backgroundColor: "color-mix(in srgb, #C8A84B 10%, transparent)",
                    color: "#7A6220",
                  }}
                >
                  <span className="font-mono font-bold">{preview.warnings.length}</span> advertencias
                </span>
              )}
            </div>
          </div>

          {/* Warnings */}
          {preview.warnings.length > 0 && (
            <div
              className="rounded-xl p-4 space-y-2"
              style={{
                backgroundColor: "color-mix(in srgb, #C8A84B 8%, transparent)",
                border: "1px solid rgba(200,168,75,0.3)",
              }}
            >
              <p className="text-sm font-medium" style={{ color: "#7A6220" }}>
                Advertencias
              </p>
              <ul className="space-y-1">
                {preview.warnings.map((w, i) => (
                  <li key={i} className="text-xs" style={{ color: "var(--text-secondary)" }}>
                    · {w}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Preview table */}
          {preview.newRows.length > 0 && (
            <div
              className="rounded-xl overflow-hidden"
              style={{
                backgroundColor: "var(--bg-card)",
                border: "1px solid var(--border-stone, rgba(160,120,80,0.25))",
              }}
            >
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  {previewColumns && previewColumns.length > 0 && (
                    <thead>
                      <tr
                        style={{ borderBottom: "1px solid var(--border-stone, rgba(160,120,80,0.2))" }}
                      >
                        {previewColumns.map((col) => (
                          <th
                            key={col}
                            className="px-4 py-2.5 text-left font-medium"
                            style={{ color: "var(--text-tertiary, var(--text-muted))" }}
                          >
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                  )}
                  <tbody>
                    {preview.newRows.map((row, i) => (
                      <tr
                        key={i}
                        style={{ borderBottom: "1px solid var(--border-stone, rgba(160,120,80,0.08))" }}
                      >
                        {renderPreviewRow ? (
                          renderPreviewRow(row, i)
                        ) : (
                          <td
                            className="px-4 py-2 font-mono"
                            style={{ color: "var(--text-secondary)" }}
                          >
                            {JSON.stringify(row)}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleReset}
              className="rounded-xl px-4 py-3 text-sm font-medium transition-all duration-150"
              style={{
                border: "1px solid var(--border-stone, rgba(160,120,80,0.25))",
                color: "var(--text-secondary)",
              }}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={preview.newRows.length === 0}
              className="flex-1 rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                backgroundColor: accentColor,
                color: "#fff",
              }}
            >
              Importar {preview.newRows.length} {preview.newRows.length === 1 ? "fila" : "filas"}
            </button>
          </div>
        </div>
      )}

      {/* ── CONFIRMING ── */}
      {status === "confirming" && (
        <div
          className="rounded-xl p-10 text-center space-y-4"
          style={{
            backgroundColor: "var(--bg-card)",
            border: "1px solid var(--border-stone, rgba(160,120,80,0.25))",
          }}
        >
          <Spinner />
          <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
            Importando...
          </p>
        </div>
      )}

      {/* ── SUCCESS ── */}
      {status === "success" && (
        <div
          className="rounded-xl p-6 text-center space-y-4"
          style={{
            backgroundColor: "var(--bg-card)",
            border: "1px solid var(--border-stone, rgba(160,120,80,0.25))",
          }}
        >
          <div
            className="flex h-12 w-12 mx-auto items-center justify-center rounded-full"
            style={{ backgroundColor: "color-mix(in srgb, var(--color-gain, #3B7A57) 12%, transparent)" }}
            aria-hidden="true"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path
                d="M5 13l4 4L19 7"
                stroke="var(--color-gain, #3B7A57)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div>
            <p className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
              {importedCount} {importedCount === 1 ? "fila importada" : "filas importadas"} correctamente
            </p>
          </div>
          <button
            type="button"
            onClick={handleReset}
            className="rounded-lg px-4 py-2 text-sm font-medium transition-all duration-150"
            style={{
              border: "1px solid var(--border-stone, rgba(160,120,80,0.25))",
              color: "var(--text-secondary)",
            }}
          >
            Importar mas
          </button>
        </div>
      )}

      {/* ── ERROR ── */}
      {status === "error" && (
        <div
          className="rounded-xl p-5 space-y-3"
          style={{
            backgroundColor: "var(--bg-card)",
            border: "1px solid rgba(163,45,45,0.3)",
          }}
        >
          <div className="flex items-start gap-3">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              className="flex-shrink-0 mt-0.5"
              aria-hidden="true"
            >
              <path
                d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
                stroke="var(--color-loss)"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <div>
              <p className="text-sm font-medium" style={{ color: "var(--color-loss)" }}>
                Error al procesar el archivo
              </p>
              {errorMsg && (
                <p className="mt-1 text-xs" style={{ color: "var(--text-secondary)" }}>
                  {errorMsg}
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={handleReset}
            className="rounded-lg px-4 py-2 text-sm font-medium transition-all duration-150"
            style={{
              border: "1px solid var(--border-stone, rgba(160,120,80,0.25))",
              color: "var(--text-secondary)",
            }}
          >
            Reintentar
          </button>
        </div>
      )}
    </div>
  );
}
