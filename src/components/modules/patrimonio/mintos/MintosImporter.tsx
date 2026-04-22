"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Upload,
  CheckCircle2,
  AlertTriangle,
  Eye,
  FileSpreadsheet,
  ArrowRight,
  X,
} from "lucide-react";
import type { MintosImportResult } from "@/types/mintos";
import type { MintosParseResult } from "@/lib/mintos/parse-excel";

type ImportStatus = "idle" | "parsing" | "preview" | "processing" | "success" | "error";

const formatEur = (v: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", minimumFractionDigits: 2 }).format(v);

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });

// ── helpers ──────────────────────────────────────────────────────────────────

function Badge({ ok, text }: { ok: boolean; text: string }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
      style={{
        backgroundColor: ok ? "color-mix(in srgb, #3B7A57 12%, transparent)" : "color-mix(in srgb, #A32D2D 12%, transparent)",
        color: ok ? "#3B7A57" : "#A32D2D",
      }}
    >
      {ok ? <CheckCircle2 size={11} strokeWidth={2} /> : <X size={11} strokeWidth={2} />}
      {text}
    </span>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="text-xs font-semibold uppercase tracking-wider mb-2"
      style={{ color: "var(--text-muted)" }}
    >
      {children}
    </p>
  );
}

// ── Preview panel ─────────────────────────────────────────────────────────────

function ImportPreview({
  preview,
  fileName,
  onConfirm,
  onCancel,
  isProcessing,
}: {
  preview: MintosParseResult;
  fileName: string;
  onConfirm: () => void;
  onCancel: () => void;
  isProcessing: boolean;
}) {
  const [showTypes, setShowTypes] = useState(false);

  const hasWarnings = preview.unknownTypes.length > 0;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div
        className="rounded-xl p-4 space-y-3"
        style={{
          backgroundColor: "var(--bg-card)",
          border: "1px solid var(--border-stone, rgba(160,120,80,0.25))",
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div
              className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg"
              style={{ backgroundColor: "color-mix(in srgb, var(--platform-mintos) 12%, transparent)" }}
              aria-hidden="true"
            >
              <Eye size={18} strokeWidth={1.5} style={{ color: "var(--platform-mintos)" }} />
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                Vista previa
              </p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                {fileName}
              </p>
            </div>
          </div>
          <Badge ok={preview.isValidFormat} text="Formato Mintos ✓" />
        </div>

        {/* Quick stats row */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "Transacciones", value: preview.totalRows.toLocaleString("es-ES") },
            { label: "Meses", value: String(preview.months.length) },
            { label: "Período", value: preview.months.length > 0
              ? `${preview.periodStart.slice(0, 7)} → ${preview.periodEnd.slice(0, 7)}`
              : "—"
            },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-lg p-2.5 text-center"
              style={{ backgroundColor: "var(--bg-subtle, rgba(160,120,80,0.05))" }}
            >
              <p className="font-mono text-sm font-semibold tabular-nums" style={{ color: "var(--text-primary)" }}>
                {s.value}
              </p>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Deposits — crítico verificar */}
      <div
        className="rounded-xl p-4 space-y-3"
        style={{
          backgroundColor: "var(--bg-card)",
          border: "1px solid var(--border-stone, rgba(160,120,80,0.25))",
        }}
      >
        <div className="flex items-center justify-between">
          <SectionTitle>Depósitos detectados</SectionTitle>
          <Badge ok={preview.deposits.length > 0} text={`${preview.deposits.length} encontrados`} />
        </div>

        {preview.deposits.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            No se detectaron depósitos en este extracto.
          </p>
        ) : (
          <div className="space-y-1">
            {preview.deposits.map((d, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-lg px-3 py-2"
                style={{ backgroundColor: "color-mix(in srgb, #3B7A57 5%, transparent)" }}
              >
                <span className="font-mono text-sm" style={{ color: "var(--text-secondary)" }}>
                  {formatDate(d.date)}
                </span>
                <span
                  className="font-mono text-sm font-semibold"
                  style={{ color: "#3B7A57" }}
                >
                  +{formatEur(d.amount)}
                </span>
              </div>
            ))}
            <div
              className="flex items-center justify-between rounded-lg px-3 py-2 mt-1"
              style={{ backgroundColor: "color-mix(in srgb, #3B7A57 10%, transparent)" }}
            >
              <span className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>
                Total depositado
              </span>
              <span className="font-mono text-sm font-bold" style={{ color: "#3B7A57" }}>
                {formatEur(preview.totalDeposited)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Monthly interest breakdown */}
      <div
        className="rounded-xl p-4 space-y-3"
        style={{
          backgroundColor: "var(--bg-card)",
          border: "1px solid var(--border-stone, rgba(160,120,80,0.25))",
        }}
      >
        <SectionTitle>Intereses por mes</SectionTitle>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border-stone, rgba(160,120,80,0.2))" }}>
                {["Mes", "Intereses", "Recompras", "Retenciones", "Comisiones", "Neto"].map((h) => (
                  <th
                    key={h}
                    className="pb-2 text-right first:text-left font-medium"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {preview.monthlyBreakdown.map((m) => (
                <tr
                  key={m.month}
                  style={{ borderBottom: "1px solid var(--border-stone, rgba(160,120,80,0.08))" }}
                >
                  <td className="py-2 font-medium" style={{ color: "var(--text-primary)" }}>
                    {m.label}
                  </td>
                  <td className="py-2 text-right font-mono tabular-nums" style={{ color: "var(--text-secondary)" }}>
                    {formatEur(m.interest_income)}
                  </td>
                  <td className="py-2 text-right font-mono tabular-nums" style={{ color: "var(--text-secondary)" }}>
                    {formatEur(m.buyback_interest + m.late_interest)}
                  </td>
                  <td className="py-2 text-right font-mono tabular-nums" style={{ color: "#A32D2D" }}>
                    -{formatEur(m.taxes_withheld)}
                  </td>
                  <td className="py-2 text-right font-mono tabular-nums" style={{ color: "#A32D2D" }}>
                    -{formatEur(m.commissions)}
                  </td>
                  <td
                    className="py-2 text-right font-mono tabular-nums font-semibold"
                    style={{ color: m.net_interest >= 0 ? "#3B7A57" : "#A32D2D" }}
                  >
                    {m.net_interest >= 0 ? "+" : ""}{formatEur(m.net_interest)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td className="pt-2 text-xs font-semibold" style={{ color: "var(--text-muted)" }}>
                  Total
                </td>
                <td colSpan={4} />
                <td
                  className="pt-2 text-right font-mono text-sm font-bold"
                  style={{ color: preview.totalNetInterest >= 0 ? "#3B7A57" : "#A32D2D" }}
                >
                  {preview.totalNetInterest >= 0 ? "+" : ""}{formatEur(preview.totalNetInterest)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Unknown types warning */}
      {hasWarnings && (
        <div
          className="rounded-xl p-4 space-y-2"
          style={{
            backgroundColor: "color-mix(in srgb, #C8A84B 8%, transparent)",
            border: "1px solid rgba(200,168,75,0.3)",
          }}
        >
          <div className="flex items-center gap-2">
            <AlertTriangle size={15} strokeWidth={1.75} style={{ color: "#C8A84B" }} aria-hidden="true" />
            <p className="text-sm font-medium" style={{ color: "#7A6220" }}>
              Tipos de transacción no reconocidos ({preview.unknownTypes.length})
            </p>
          </div>
          <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
            Las siguientes operaciones se ignorarán en la importación:
          </p>
          <ul className="space-y-0.5">
            {preview.unknownTypes.map((t) => (
              <li key={t} className="font-mono text-xs" style={{ color: "var(--text-muted)" }}>
                · {t}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Transaction type breakdown (collapsible) */}
      <div
        className="rounded-xl overflow-hidden"
        style={{
          border: "1px solid var(--border-stone, rgba(160,120,80,0.25))",
        }}
      >
        <button
          type="button"
          onClick={() => setShowTypes((v) => !v)}
          className="w-full flex items-center justify-between p-4 text-left transition-colors duration-150"
          style={{ backgroundColor: "var(--bg-card)" }}
        >
          <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
            Desglose por tipo de operación
          </span>
          <ArrowRight
            size={14}
            strokeWidth={2}
            className="transition-transform duration-150"
            style={{
              color: "var(--text-muted)",
              transform: showTypes ? "rotate(90deg)" : "rotate(0deg)",
            }}
            aria-hidden="true"
          />
        </button>
        {showTypes && (
          <div
            className="px-4 pb-4 space-y-1.5"
            style={{ backgroundColor: "var(--bg-card)" }}
          >
            {Object.entries(preview.typeSummary)
              .sort((a, b) => b[1] - a[1])
              .map(([tipo, count]) => (
                <div key={tipo} className="flex items-center justify-between gap-3">
                  <span className="text-sm truncate" style={{ color: "var(--text-secondary)" }}>
                    {tipo}
                  </span>
                  <span
                    className="font-mono text-xs tabular-nums flex-shrink-0"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {count.toLocaleString("es-ES")} ops
                  </span>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={isProcessing}
          className="rounded-xl px-4 py-3 text-sm font-medium transition-all duration-150 disabled:opacity-50"
          style={{
            border: "1px solid var(--border-stone, rgba(160,120,80,0.25))",
            color: "var(--text-secondary)",
          }}
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={isProcessing}
          className="flex-1 flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-150 disabled:opacity-60"
          style={{
            backgroundColor: "var(--platform-mintos)",
            color: "#fff",
          }}
        >
          {isProcessing ? (
            <>
              <span
                className="h-4 w-4 rounded-full animate-spin"
                style={{
                  border: "2px solid rgba(255,255,255,0.3)",
                  borderTopColor: "#fff",
                }}
                aria-hidden="true"
              />
              Guardando…
            </>
          ) : (
            <>
              Confirmar importación
              <ArrowRight size={15} strokeWidth={2} aria-hidden="true" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function MintosImporter() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<ImportStatus>("idle");
  const [preview, setPreview] = useState<MintosParseResult | null>(null);
  const [result, setResult] = useState<MintosImportResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // ── Parse client-side for preview ──────────────────────────────────────────
  const parseForPreview = useCallback(async (f: File) => {
    setStatus("parsing");
    setErrorMsg(null);

    try {
      const [{ read, utils }, buffer] = await Promise.all([
        import("xlsx"),
        f.arrayBuffer(),
      ]);

      const wb = read(buffer, { type: "array", cellDates: true });
      const ws = wb.Sheets[wb.SheetNames[0]];
      if (!ws) throw new Error("Archivo Excel vacío");

      const rows: unknown[][] = utils.sheet_to_json(ws, { header: 1, defval: "", raw: true });

      const { parseMintosRows } = await import("@/lib/mintos/parse-excel");
      const parsed = parseMintosRows(rows);

      if (!parsed.isValidFormat) {
        setErrorMsg(parsed.formatError ?? "Formato no reconocido");
        setStatus("error");
        return;
      }

      setPreview(parsed);
      setStatus("preview");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Error al leer el archivo");
      setStatus("error");
    }
  }, []);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return;
      const f = files[0];
      if (!f.name.match(/\.(xlsx|xls)$/i)) {
        setErrorMsg("Formato no válido. Solo se aceptan archivos .xlsx o .xls");
        setStatus("error");
        return;
      }
      setFile(f);
      parseForPreview(f);
    },
    [parseForPreview]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragOver(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  // ── Confirm → send to API ───────────────────────────────────────────────────
  const handleConfirm = async () => {
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

      const data = (await res.json()) as { result: MintosImportResult };
      setResult(data.result);
      setStatus("success");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Error desconocido al guardar los datos");
      setStatus("error");
    }
  };

  const handleReset = () => {
    setFile(null);
    setStatus("idle");
    setPreview(null);
    setResult(null);
    setErrorMsg(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      {/* Instructions — always visible except after success */}
      {status !== "success" && (
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
          <ol
            className="space-y-1 text-sm list-decimal list-inside"
            style={{ color: "var(--text-secondary)" }}
          >
            <li>Entra en Mintos → Documentos → Extracto de cuenta</li>
            <li>Selecciona el rango de fechas (recomendado: desde el inicio)</li>
            <li>Exporta el archivo en formato Excel (.xlsx)</li>
            <li>Sube el archivo — verás una vista previa antes de guardar nada</li>
          </ol>
        </div>
      )}

      {/* Drop zone */}
      {(status === "idle" || status === "parsing") && (
        <div
          role="button"
          tabIndex={0}
          onClick={() => status === "idle" && inputRef.current?.click()}
          onKeyDown={(e) => e.key === "Enter" && status === "idle" && inputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={() => setIsDragOver(false)}
          className="rounded-xl p-8 text-center cursor-pointer transition-all duration-150 space-y-3"
          style={{
            backgroundColor: isDragOver
              ? "color-mix(in srgb, var(--platform-mintos) 8%, transparent)"
              : "var(--bg-card)",
            border: `2px dashed ${
              status === "parsing"
                ? "var(--platform-mintos)"
                : isDragOver
                ? "var(--platform-mintos)"
                : "var(--border-stone, rgba(160,120,80,0.3))"
            }`,
            cursor: status === "parsing" ? "default" : "pointer",
          }}
          aria-label="Zona para subir archivo Excel de Mintos"
        >
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
            aria-hidden="true"
          />

          {status === "parsing" ? (
            <>
              <div
                className="h-10 w-10 mx-auto rounded-full animate-spin"
                style={{
                  border: "3px solid color-mix(in srgb, var(--platform-mintos) 15%, transparent)",
                  borderTopColor: "var(--platform-mintos)",
                }}
                aria-label="Analizando archivo"
                role="status"
              />
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                Analizando {file?.name}…
              </p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                Calculando vista previa, no se guarda nada todavía
              </p>
            </>
          ) : (
            <>
              <div
                className="flex h-12 w-12 mx-auto items-center justify-center rounded-full"
                style={{ backgroundColor: "color-mix(in srgb, var(--platform-mintos) 12%, transparent)" }}
                aria-hidden="true"
              >
                <FileSpreadsheet size={22} strokeWidth={1.5} style={{ color: "var(--platform-mintos)" }} />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                  Arrastra el extracto aquí o haz clic para seleccionar
                </p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  Acepta .xlsx y .xls — se mostrará vista previa antes de guardar
                </p>
              </div>
            </>
          )}
        </div>
      )}

      {/* Preview */}
      {status === "preview" && preview && file && (
        <ImportPreview
          preview={preview}
          fileName={file.name}
          onConfirm={handleConfirm}
          onCancel={handleReset}
          isProcessing={false}
        />
      )}

      {/* Processing (preview confirm in progress) */}
      {status === "processing" && preview && file && (
        <ImportPreview
          preview={preview}
          fileName={file.name}
          onConfirm={handleConfirm}
          onCancel={handleReset}
          isProcessing={true}
        />
      )}

      {/* Success */}
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

          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Transacciones", value: result.totalRows.toLocaleString("es-ES"), color: "#3B7A57" },
              { label: "Meses actualizados", value: String(result.monthsProcessed.length), color: "var(--platform-mintos)" },
              { label: "Depósitos", value: String(result.depositsFound), color: "var(--platform-mintos)" },
            ].map((s) => (
              <div
                key={s.label}
                className="rounded-lg p-3 text-center"
                style={{ backgroundColor: `color-mix(in srgb, ${s.color} 8%, transparent)` }}
              >
                <p className="font-mono text-lg font-semibold" style={{ color: s.color }}>
                  {s.value}
                </p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>{s.label}</p>
              </div>
            ))}
          </div>

          {result.monthsProcessed.length > 0 && (
            <p className="font-mono text-xs" style={{ color: "var(--text-muted)" }}>
              Meses: {result.monthsProcessed.join(" · ")}
            </p>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={() => router.refresh()}
              className="flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all duration-150"
              style={{ backgroundColor: "var(--platform-mintos)", color: "#fff" }}
            >
              Ver datos actualizados
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-150"
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

      {/* Error */}
      {status === "error" && (
        <div
          className="rounded-xl p-5 space-y-3"
          style={{ backgroundColor: "var(--bg-card)", border: "1px solid rgba(163,45,45,0.3)" }}
        >
          <div className="flex items-center gap-3">
            <AlertTriangle size={20} strokeWidth={1.5} style={{ color: "#A32D2D" }} aria-hidden="true" />
            <h3 className="text-base font-medium" style={{ color: "#A32D2D" }}>
              Error al procesar el archivo
            </h3>
          </div>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            {errorMsg ?? "Verifica que el archivo es el extracto de cuenta de Mintos en formato .xlsx"}
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
    </div>
  );
}
