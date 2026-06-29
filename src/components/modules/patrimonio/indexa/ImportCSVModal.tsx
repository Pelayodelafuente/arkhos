"use client";

import { useState, useRef } from "react";
import { Upload, FileText, AlertCircle } from "lucide-react";
import { Modal, Button } from "@/components/ui";
import type { IndexaFund, IndexaTransaction, IndexaTransactionType } from "@/types/indexa";
import { formatEur } from "@/lib/utils/format";

export interface ImportCSVModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (transactions: Partial<IndexaTransaction>[]) => Promise<void>;
  funds: IndexaFund[];
}

// Indexa CSV uses semicolons (European CSV)
// Columns: Fecha valor;Tipo;Fondo;Participaciones;Precio;Importe neto
const EXPECTED_HEADERS = ["Fecha valor", "Tipo", "Fondo", "Participaciones", "Precio", "Importe neto"];

const TX_TYPE_MAP: Record<string, IndexaTransactionType> = {
  suscripcion: "subscription",
  suscripción: "subscription",
  reembolso: "redemption",
  "traspaso entrada": "transfer_in",
  "traspaso salida": "transfer_out",
};

function normalizeType(raw: string): IndexaTransactionType {
  const key = raw.toLowerCase().trim();
  return TX_TYPE_MAP[key] ?? "subscription";
}

function matchFund(rawName: string, funds: IndexaFund[]): IndexaFund | null {
  const lower = rawName.toLowerCase();
  return (
    funds.find((f) => f.name.toLowerCase().includes(lower) || lower.includes(f.name.toLowerCase())) ?? null
  );
}

function parseCSV(content: string, funds: IndexaFund[]): Partial<IndexaTransaction>[] {
  const lines = content.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  // Try to detect header row
  const headerLine = lines[0].split(";");
  const hasHeader = EXPECTED_HEADERS.some((h) =>
    headerLine.some((col) => col.toLowerCase().includes(h.toLowerCase()))
  );
  const dataLines = hasHeader ? lines.slice(1) : lines;

  return dataLines
    .filter((l) => l.trim() !== "")
    .map((line) => {
      const cols = line.split(";").map((c) => c.trim().replace(/"/g, ""));
      const [fechaValor, tipo, fondoName, participaciones, precio, importeNeto] = cols;

      if (!fechaValor || !tipo) return null;

      const fund = fondoName ? matchFund(fondoName, funds) : null;
      const parsedAmount = parseFloat((importeNeto ?? "0").replace(",", ".")) || 0;
      const parsedShares = participaciones
        ? parseFloat(participaciones.replace(",", ".")) || null
        : null;
      const parsedPrice = precio ? parseFloat(precio.replace(",", ".")) || null : null;

      const tx: Partial<IndexaTransaction> = {
        transaction_date: fechaValor ?? "",
        value_date: fechaValor ?? null,
        type: normalizeType(tipo ?? ""),
        fund_id: fund?.id ?? null,
        shares: parsedShares,
        price_per_share: parsedPrice,
        amount: Math.abs(parsedAmount),
        retention: 0,
        fiscal_result: 0,
        notes: null,
        source: "import_csv" as const,
      };

      return tx;
    })
    .filter((tx): tx is Partial<IndexaTransaction> => tx !== null);
}

type Step = "upload" | "preview" | "done";

export function ImportCSVModal({ isOpen, onClose, onImport, funds }: ImportCSVModalProps) {
  const [step, setStep] = useState<Step>("upload");
  const [parsed, setParsed] = useState<Partial<IndexaTransaction>[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    if (!file.name.endsWith(".csv")) {
      setParseError("El archivo debe ser .csv");
      return;
    }
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      try {
        const txs = parseCSV(content, funds);
        if (txs.length === 0) {
          setParseError("No se encontraron transacciones válidas en el archivo");
          return;
        }
        setParsed(txs);
        setParseError(null);
        setStep("preview");
      } catch {
        setParseError("Error al parsear el CSV. Verifica el formato.");
      }
    };
    reader.readAsText(file, "utf-8");
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleImport = async () => {
    setIsImporting(true);
    setImportError(null);
    try {
      await onImport(parsed);
      setStep("done");
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "Error al importar");
    } finally {
      setIsImporting(false);
    }
  };

  const handleClose = () => {
    setStep("upload");
    setParsed([]);
    setFileName(null);
    setParseError(null);
    setImportError(null);
    onClose();
  };

  const preview = parsed.slice(0, 5);

  const TX_TYPE_LABEL: Record<string, string> = {
    subscription: "SUSCRIPCIÓN",
    redemption: "REEMBOLSO",
    transfer_in: "TRASPASO ENT.",
    transfer_out: "TRASPASO SAL.",
  };

  return (
    <Modal
      open={isOpen}
      onClose={handleClose}
      title="Importar CSV de Indexa"
      footer={
        step === "preview" ? (
          <div className="flex items-center justify-between gap-2 w-full">
            <button
              type="button"
              onClick={() => setStep("upload")}
              className="text-xs"
              style={{ color: "var(--text-muted)" }}
            >
              Cambiar archivo
            </button>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={handleClose} disabled={isImporting}>
                Cancelar
              </Button>
              <Button variant="primary" size="sm" onClick={handleImport} disabled={isImporting}>
                {isImporting ? "Importando..." : `Importar ${parsed.length} transacciones`}
              </Button>
            </div>
          </div>
        ) : step === "done" ? (
          <div className="flex justify-end">
            <Button variant="primary" size="sm" onClick={handleClose}>
              Cerrar
            </Button>
          </div>
        ) : undefined
      }
    >
      {step === "upload" && (
        <div className="space-y-4">
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Descarga el CSV desde <strong>Indexa Capital → Mis movimientos → Exportar</strong>.
            El archivo usa separador de punto y coma (;).
          </p>

          {/* Drop zone */}
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => inputRef.current?.click()}
            className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed cursor-pointer p-8 transition-colors duration-150 hover:bg-[rgba(160,120,80,0.04)]"
            style={{ borderColor: "var(--border-stone, rgba(160,120,80,0.25))" }}
            role="button"
            aria-label="Zona de carga de archivo CSV"
          >
            <Upload
              size={28}
              strokeWidth={1.5}
              style={{ color: "var(--platform-indexa, #3B78B0)" }}
              aria-hidden="true"
            />
            <div className="text-center">
              <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                Arrastra el CSV aquí
              </p>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                o haz clic para seleccionar
              </p>
            </div>
            <input
              ref={inputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleInputChange}
              aria-hidden="true"
            />
          </div>

          {parseError && (
            <div
              className="flex items-start gap-2 rounded-lg px-3 py-2.5 text-xs"
              style={{
                backgroundColor: "rgba(163,45,45,0.08)",
                border: "1px solid rgba(163,45,45,0.25)",
                color: "#A32D2D",
              }}
            >
              <AlertCircle size={13} strokeWidth={1.75} className="mt-0.5 flex-shrink-0" aria-hidden="true" />
              {parseError}
            </div>
          )}
        </div>
      )}

      {step === "preview" && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <FileText
              size={14}
              strokeWidth={1.75}
              style={{ color: "var(--platform-indexa, #3B78B0)" }}
              aria-hidden="true"
            />
            <span className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>
              {fileName}
            </span>
            <span
              className="ml-auto text-xs px-2 py-0.5 rounded font-semibold"
              style={{
                backgroundColor: "rgba(59,120,176,0.12)",
                color: "var(--platform-indexa, #3B78B0)",
              }}
            >
              {parsed.length} filas
            </span>
          </div>

          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Primeras {Math.min(5, parsed.length)} filas:
          </p>

          {/* Preview table */}
          <div className="overflow-x-auto rounded-lg" style={{ border: "1px solid var(--border-stone, rgba(160,120,80,0.25))" }}>
            <table className="w-full text-xs font-mono min-w-[420px]">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border-stone, rgba(160,120,80,0.2))", backgroundColor: "rgba(160,120,80,0.05)" }}>
                  <th className="px-3 py-2 text-left font-semibold" style={{ color: "var(--text-secondary)" }}>Fecha</th>
                  <th className="px-3 py-2 text-left font-semibold" style={{ color: "var(--text-secondary)" }}>Tipo</th>
                  <th className="px-3 py-2 text-left font-semibold" style={{ color: "var(--text-secondary)" }}>Fondo</th>
                  <th className="px-3 py-2 text-right font-semibold" style={{ color: "var(--text-secondary)" }}>Importe</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((tx, i) => {
                  const fund = funds.find((f) => f.id === tx.fund_id);
                  const typeLabel = TX_TYPE_LABEL[tx.type ?? ""] ?? tx.type ?? "—";
                  return (
                    <tr
                      key={i}
                      style={{
                        borderBottom: i < preview.length - 1 ? "1px solid var(--border-stone, rgba(160,120,80,0.12))" : undefined,
                      }}
                    >
                      <td className="px-3 py-2 tabular-nums" style={{ color: "var(--text-secondary)" }}>
                        {tx.transaction_date ?? "—"}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className="px-1 py-0.5 rounded text-xs"
                          style={{
                            backgroundColor: "rgba(59,120,176,0.12)",
                            color: "var(--platform-indexa, #3B78B0)",
                          }}
                        >
                          {typeLabel}
                        </span>
                      </td>
                      <td className="px-3 py-2 truncate max-w-[120px]" style={{ color: "var(--text-muted)" }}>
                        {fund?.name ?? (tx.fund_id ? "Desconocido" : "—")}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums" style={{ color: "var(--text-primary)" }}>
                        {tx.amount !== undefined ? formatEur(tx.amount) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {parsed.length > 5 && (
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              ... y {parsed.length - 5} filas más
            </p>
          )}

          {importError && (
            <div
              className="flex items-start gap-2 rounded-lg px-3 py-2.5 text-xs"
              style={{
                backgroundColor: "rgba(163,45,45,0.08)",
                border: "1px solid rgba(163,45,45,0.25)",
                color: "#A32D2D",
              }}
            >
              <AlertCircle size={13} strokeWidth={1.75} className="mt-0.5 flex-shrink-0" aria-hidden="true" />
              {importError}
            </div>
          )}
        </div>
      )}

      {step === "done" && (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <div
            className="h-12 w-12 rounded-full flex items-center justify-center"
            style={{ backgroundColor: "rgba(46,125,107,0.12)" }}
          >
            <svg
              width={24}
              height={24}
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--platform-tr, #2E7D6B)"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            {parsed.length} transacciones importadas
          </p>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Los datos se han registrado correctamente
          </p>
        </div>
      )}
    </Modal>
  );
}
