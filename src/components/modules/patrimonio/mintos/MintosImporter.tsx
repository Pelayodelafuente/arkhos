"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Upload, CheckCircle2, AlertTriangle } from "lucide-react";
import type { MintosImportResult } from "@/types/mintos";

type ImportStatus = "idle" | "selected" | "processing" | "success" | "error";

export function MintosImporter() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<ImportStatus>("idle");
  const [result, setResult] = useState<MintosImportResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;
    const f = files[0];
    if (!f.name.match(/\.(xlsx|xls)$/i)) {
      setErrorMsg("Formato no válido. Solo se aceptan archivos .xlsx o .xls");
      setStatus("error");
      return;
    }
    setFile(f);
    setStatus("selected");
    setErrorMsg(null);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragOver(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  const handleProcess = async () => {
    if (!file) return;
    setStatus("processing");
    setErrorMsg(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/patrimonio/mintos/import", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error ?? `Error ${res.status}`);
      }

      const data = (await res.json()) as MintosImportResult;
      setResult(data);
      setStatus("success");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Error desconocido al procesar el archivo");
      setStatus("error");
    }
  };

  const handleReset = () => {
    setFile(null);
    setStatus("idle");
    setResult(null);
    setErrorMsg(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="space-y-5">
      {/* Instructions */}
      <div
        className="rounded-xl p-4 space-y-2"
        style={{
          backgroundColor: "var(--bg-card)",
          border: "1px solid var(--border-stone, rgba(160,120,80,0.25))",
        }}
      >
        <h3 className="font-heading text-base" style={{ color: "var(--text-primary)" }}>
          Importar Extracto de Mintos
        </h3>
        <ol className="space-y-1 text-sm list-decimal list-inside" style={{ color: "var(--text-secondary)" }}>
          <li>Entra en Mintos → Documentos → Extracto de cuenta</li>
          <li>Selecciona el rango de fechas (recomendado: mes completo)</li>
          <li>Exporta el archivo en formato Excel (.xlsx)</li>
          <li>Sube el archivo aquí</li>
        </ol>
      </div>

      {/* Drop zone */}
      {(status === "idle" || status === "selected") && (
        <div
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={() => setIsDragOver(false)}
          className="rounded-xl p-8 text-center cursor-pointer transition-all duration-150 space-y-3"
          style={{
            backgroundColor: isDragOver
              ? "color-mix(in srgb, var(--platform-mintos) 8%, transparent)"
              : "var(--bg-card)",
            border: `2px dashed ${isDragOver ? "var(--platform-mintos)" : "var(--border-stone, rgba(160,120,80,0.3))"}`,
          }}
          aria-label="Zona para subir archivo Excel"
        >
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
            aria-hidden="true"
          />
          <div
            className="flex h-12 w-12 mx-auto items-center justify-center rounded-full"
            style={{ backgroundColor: "color-mix(in srgb, var(--platform-mintos) 12%, transparent)" }}
            aria-hidden="true"
          >
            <Upload size={22} strokeWidth={1.5} style={{ color: "var(--platform-mintos)" }} />
          </div>
          {file ? (
            <div className="space-y-1">
              <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                {file.name}
              </p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                {(file.size / 1024).toFixed(1)} KB — listo para procesar
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                Arrastra el archivo aquí o haz clic para seleccionar
              </p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                Acepta .xlsx y .xls
              </p>
            </div>
          )}
        </div>
      )}

      {/* Processing state */}
      {status === "processing" && (
        <div
          className="rounded-xl p-8 flex flex-col items-center gap-4 text-center"
          style={{
            backgroundColor: "var(--bg-card)",
            border: "1px solid var(--border-stone, rgba(160,120,80,0.25))",
          }}
        >
          <div
            className="h-10 w-10 rounded-full animate-spin"
            style={{
              border: "3px solid color-mix(in srgb, var(--platform-mintos) 15%, transparent)",
              borderTopColor: "var(--platform-mintos)",
            }}
            aria-label="Procesando archivo"
            role="status"
          />
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Procesando {file?.name}…
          </p>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Esto puede tardar unos segundos
          </p>
        </div>
      )}

      {/* Success state */}
      {status === "success" && result && (
        <div
          className="rounded-xl p-5 space-y-4"
          style={{
            backgroundColor: "var(--bg-card)",
            border: "1px solid var(--border-stone, rgba(160,120,80,0.25))",
          }}
        >
          <div className="flex items-center gap-3">
            <CheckCircle2 size={22} strokeWidth={1.5} style={{ color: "#3B7A57" }} aria-hidden="true" />
            <h3 className="font-heading text-base" style={{ color: "var(--text-primary)" }}>
              Importación completada
            </h3>
          </div>

          {/* Summary stats */}
          <div className="grid grid-cols-3 gap-3">
            <div
              className="rounded-lg p-3 text-center"
              style={{ backgroundColor: "color-mix(in srgb, #3B7A57 8%, transparent)" }}
            >
              <p className="font-mono text-lg font-semibold" style={{ color: "#3B7A57" }}>
                {result.totalRows}
              </p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>Transacciones</p>
            </div>
            <div
              className="rounded-lg p-3 text-center"
              style={{ backgroundColor: "color-mix(in srgb, var(--platform-mintos) 8%, transparent)" }}
            >
              <p className="font-mono text-lg font-semibold" style={{ color: "var(--platform-mintos)" }}>
                {result.monthsProcessed.length}
              </p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>Meses actualizados</p>
            </div>
            <div
              className="rounded-lg p-3 text-center"
              style={{ backgroundColor: "color-mix(in srgb, var(--platform-mintos) 8%, transparent)" }}
            >
              <p className="font-mono text-lg font-semibold" style={{ color: "var(--platform-mintos)" }}>
                {result.depositsFound}
              </p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>Depósitos</p>
            </div>
          </div>

          {/* Transaction type breakdown */}
          {Object.keys(result.summary).length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
                Desglose por tipo
              </p>
              <div className="space-y-1">
                {Object.entries(result.summary).map(([type, count]) => (
                  <div key={type} className="flex items-center justify-between text-sm">
                    <span style={{ color: "var(--text-secondary)" }}>{type}</span>
                    <span className="font-mono tabular-nums" style={{ color: "var(--text-primary)" }}>
                      {count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Months processed */}
          {result.monthsProcessed.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
                Meses procesados
              </p>
              <p className="text-sm font-mono" style={{ color: "var(--text-secondary)" }}>
                {result.monthsProcessed.join(", ")}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => router.refresh()}
              className="flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-150"
              style={{
                backgroundColor: "var(--platform-mintos)",
                color: "#fff",
              }}
            >
              Actualizar datos
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="rounded-lg px-4 py-2 text-sm font-medium transition-all duration-150"
              style={{
                border: "1px solid var(--border-stone, rgba(160,120,80,0.25))",
                color: "var(--text-secondary)",
              }}
            >
              Importar otro
            </button>
          </div>
        </div>
      )}

      {/* Error state */}
      {status === "error" && (
        <div
          className="rounded-xl p-5 space-y-4"
          style={{
            backgroundColor: "var(--bg-card)",
            border: "1px solid rgba(163,45,45,0.3)",
          }}
        >
          <div className="flex items-center gap-3">
            <AlertTriangle size={20} strokeWidth={1.5} style={{ color: "#A32D2D" }} aria-hidden="true" />
            <h3 className="text-base font-medium" style={{ color: "#A32D2D" }}>
              Error en la importación
            </h3>
          </div>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            {errorMsg ?? "Error desconocido. Verifica el formato del archivo."}
          </p>
          <button
            type="button"
            onClick={handleReset}
            className="rounded-lg px-4 py-2 text-sm font-medium transition-all duration-150"
            style={{
              border: "1px solid var(--border-stone, rgba(160,120,80,0.25))",
              color: "var(--text-secondary)",
            }}
          >
            Intentar de nuevo
          </button>
        </div>
      )}

      {/* Process button */}
      {status === "selected" && file && (
        <button
          type="button"
          onClick={handleProcess}
          className="w-full rounded-xl px-4 py-3 text-sm font-medium transition-all duration-150"
          style={{
            backgroundColor: "var(--platform-mintos)",
            color: "#fff",
          }}
        >
          Procesar {file.name}
        </button>
      )}
    </div>
  );
}
