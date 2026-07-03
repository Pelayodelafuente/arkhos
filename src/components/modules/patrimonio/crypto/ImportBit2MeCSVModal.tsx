"use client";

import { useState, useRef } from "react";
import { Upload, AlertCircle, CheckCircle2 } from "lucide-react";
import { Modal, Button } from "@/components/ui";
import { addCryptoTransactionAction } from "@/app/actions/crypto";
import { useCryptoStore } from "@/stores/crypto-store";
import type { CryptoAsset, CryptoTransaction, CryptoTransactionType } from "@/types/crypto";

interface ParsedRow {
  date: string;
  type: CryptoTransactionType;
  symbol: string;
  quantity: number;
  price_eur: number | null;
  fee_eur: number | null;
  isDuplicate: boolean;
  rawLine: string;
}

function mapBit2MeType(raw: string): CryptoTransactionType {
  const t = raw.trim().toLowerCase();
  if (t === "trade") return "buy";
  if (t === "withdrawal") return "transfer_out";
  if (t === "staking") return "staking_reward";
  if (t === "deposit") return "transfer_in";
  return "buy";
}

function parseCSV(text: string, existingTxIds: Set<string>): ParsedRow[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== "");
  if (lines.length < 2) return [];

  const header = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/"/g, ""));

  const idxDate = header.indexOf("date");
  const idxType = header.indexOf("type");
  const idxCurrency = header.indexOf("currency");
  const idxAmount = header.indexOf("amount");
  const idxPrice = header.indexOf("price");
  const idxFee = header.indexOf("fee");

  const rows: ParsedRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const cols = line.split(",").map((c) => c.trim().replace(/"/g, ""));

    const rawDate = idxDate >= 0 ? cols[idxDate] : "";
    const rawType = idxType >= 0 ? cols[idxType] : "Trade";
    const currency = idxCurrency >= 0 ? cols[idxCurrency] : "";
    const amount = idxAmount >= 0 ? parseFloat(cols[idxAmount]) : 0;
    const price = idxPrice >= 0 && cols[idxPrice] ? parseFloat(cols[idxPrice]) : null;
    const fee = idxFee >= 0 && cols[idxFee] ? parseFloat(cols[idxFee]) : null;

    if (!rawDate || !currency || isNaN(amount)) continue;

    // Normalize date to YYYY-MM-DD
    let date = rawDate;
    const dateMatch = rawDate.match(/(\d{4}[-/]\d{2}[-/]\d{2})/);
    if (dateMatch) date = dateMatch[1].replace(/\//g, "-");

    const externalId = `bit2me-${date}-${currency}-${amount}`;
    const isDuplicate = existingTxIds.has(externalId);

    rows.push({
      date,
      type: mapBit2MeType(rawType),
      symbol: currency.toUpperCase(),
      quantity: Math.abs(amount),
      price_eur: price && !isNaN(price) ? price : null,
      fee_eur: fee && !isNaN(fee) ? Math.abs(fee) : null,
      isDuplicate,
      rawLine: line,
    });
  }

  return rows;
}

interface ImportBit2MeCSVModalProps {
  onClose: () => void;
  onSuccess?: () => void;
}

export function ImportBit2MeCSVModal({ onClose, onSuccess }: ImportBit2MeCSVModalProps) {
  const assets = useCryptoStore((s) => s.assets);
  const transactions = useCryptoStore((s) => s.transactions);
  const setAssets = useCryptoStore((s) => s.setAssets);
  const setTransactions = useCryptoStore((s) => s.setTransactions);

  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number } | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const existingIds = new Set(
    transactions.map((tx) => tx.external_id).filter(Boolean) as string[]
  );

  function handleFile(file: File) {
    setParseError(null);
    setImportResult(null);
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      try {
        const parsed = parseCSV(text, existingIds);
        if (parsed.length === 0) {
          setParseError("No se encontraron filas válidas en el CSV. Revisa el formato.");
        } else {
          setRows(parsed);
        }
      } catch {
        setParseError("Error al parsear el CSV. Asegúrate de que es un export de Bit2Me.");
      }
    };
    reader.readAsText(file);
  }

  async function handleImport() {
    const toImport = rows.filter((r) => !r.isDuplicate);
    if (toImport.length === 0) return;

    setIsImporting(true);
    let imported = 0;
    let skipped = 0;
    const newTransactions: CryptoTransaction[] = [];
    const updatedAssets = new Map<string, CryptoAsset>();

    for (const row of toImport) {
      const asset = assets.find((a) => a.symbol === row.symbol);
      if (!asset) {
        skipped++;
        continue;
      }

      const externalId = `bit2me-${row.date}-${row.symbol}-${row.quantity}`;

      const result = await addCryptoTransactionAction({
        asset_id: asset.id,
        transaction_date: row.date,
        type: row.type,
        quantity: row.quantity,
        price_eur: row.price_eur,
        amount_eur: row.price_eur != null ? row.quantity * row.price_eur : null,
        fee_eur: row.fee_eur,
        exchange: "bit2me",
        tx_hash: null,
        notes: null,
        source: "import_bit2me",
        external_id: externalId,
      });

      if (result.ok) {
        imported++;
        if (result.transaction) newTransactions.push(result.transaction);
        if (result.asset) updatedAssets.set(result.asset.id, result.asset);
      } else {
        skipped++;
      }
    }

    setImportResult({ imported, skipped });

    // Actualiza el store directamente con lo devuelto por cada transacción
    // (sin volver a pedir todos los datos — la megacarga ya no se repite al navegar)
    if (newTransactions.length > 0) {
      setTransactions(
        [...transactions, ...newTransactions].sort(
          (a, b) => new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime()
        )
      );
    }
    if (updatedAssets.size > 0) {
      setAssets(assets.map((a) => updatedAssets.get(a.id) ?? a));
    }

    setIsImporting(false);
    onSuccess?.();
  }

  const toImportCount = rows.filter((r) => !r.isDuplicate).length;
  const duplicateCount = rows.filter((r) => r.isDuplicate).length;
  const previewRows = rows.slice(0, 5);

  return (
    <Modal open onClose={onClose} title="Importar CSV Bit2Me">
      <div className="space-y-4">
        {/* File drop area */}
        {!fileName && (
          <div
            className="rounded-xl border-2 border-dashed p-8 text-center cursor-pointer transition-colors duration-150"
            style={{
              borderColor: "var(--border-stone, rgba(160,120,80,0.30))",
              backgroundColor: "var(--bg-card)",
            }}
            onClick={() => fileRef.current?.click()}
            onKeyDown={(e) => e.key === "Enter" && fileRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const file = e.dataTransfer.files[0];
              if (file) handleFile(file);
            }}
            role="button"
            tabIndex={0}
            aria-label="Seleccionar archivo CSV de Bit2Me"
          >
            <Upload
              size={28}
              strokeWidth={1.5}
              className="mx-auto mb-3"
              style={{ color: "var(--platform-crypto)" }}
              aria-hidden="true"
            />
            <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
              Arrastra el CSV o haz clic para seleccionar
            </p>
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
              Export de Bit2Me (columnas: Date, Type, Currency, Amount, Price, Fee)
            </p>
          </div>
        )}

        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          aria-hidden="true"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />

        {/* Parse error */}
        {parseError && (
          <div
            className="flex items-start gap-2 rounded-lg px-3 py-2.5 text-sm"
            style={{
              backgroundColor: "rgba(163,45,45,0.08)",
              color: "var(--color-loss)",
              border: "1px solid rgba(163,45,45,0.18)",
            }}
            role="alert"
          >
            <AlertCircle size={15} strokeWidth={2} className="flex-shrink-0 mt-0.5" aria-hidden="true" />
            {parseError}
          </div>
        )}

        {/* Summary row */}
        {rows.length > 0 && (
          <div className="flex items-center gap-3 flex-wrap text-sm">
            <span style={{ color: "var(--text-muted)" }}>{fileName}</span>
            <span
              className="px-2 py-0.5 rounded-full text-xs font-mono"
              style={{
                backgroundColor: "rgba(46,125,107,0.10)",
                color: "var(--platform-patrimonio, var(--color-gain))",
                border: "1px solid rgba(46,125,107,0.20)",
              }}
            >
              {toImportCount} nuevas
            </span>
            {duplicateCount > 0 && (
              <span
                className="px-2 py-0.5 rounded-full text-xs font-mono"
                style={{
                  backgroundColor: "rgba(141,141,141,0.10)",
                  color: "var(--text-muted)",
                  border: "1px solid rgba(141,141,141,0.20)",
                }}
              >
                {duplicateCount} duplicadas (omitidas)
              </span>
            )}
          </div>
        )}

        {/* Preview table */}
        {previewRows.length > 0 && (
          <div
            className="rounded-xl overflow-hidden"
            style={{ border: "1px solid var(--border-stone, rgba(160,120,80,0.25))" }}
          >
            <div className="overflow-x-auto">
              <table className="w-full text-xs" role="table">
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border-stone, rgba(160,120,80,0.15))" }}>
                    {["Fecha", "Tipo", "Activo", "Cantidad", "Precio", "Estado"].map((col) => (
                      <th
                        key={col}
                        scope="col"
                        className="px-3 py-2 text-left font-medium uppercase tracking-wide"
                        style={{ color: "var(--text-muted)", backgroundColor: "var(--bg-card)" }}
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody style={{ backgroundColor: "var(--bg-card)" }}>
                  {previewRows.map((row, i) => (
                    <tr
                      key={i}
                      style={{
                        opacity: row.isDuplicate ? 0.45 : 1,
                        borderBottom:
                          i < previewRows.length - 1
                            ? "1px solid var(--border-stone, rgba(160,120,80,0.08))"
                            : "none",
                      }}
                    >
                      <td className="px-3 py-2 font-mono" style={{ color: "var(--text-primary)" }}>
                        {row.date}
                      </td>
                      <td className="px-3 py-2" style={{ color: "var(--text-primary)" }}>
                        {row.type}
                      </td>
                      <td className="px-3 py-2 font-mono font-medium" style={{ color: "var(--platform-crypto)" }}>
                        {row.symbol}
                      </td>
                      <td className="px-3 py-2 font-mono tabular-nums" style={{ color: "var(--text-primary)" }}>
                        {row.quantity.toFixed(8)}
                      </td>
                      <td className="px-3 py-2 font-mono tabular-nums" style={{ color: "var(--text-primary)" }}>
                        {row.price_eur != null
                          ? new Intl.NumberFormat("es-ES", {
                              style: "currency",
                              currency: "EUR",
                            }).format(row.price_eur)
                          : "—"}
                      </td>
                      <td className="px-3 py-2">
                        {row.isDuplicate ? (
                          <span style={{ color: "var(--text-muted)" }}>Duplicada</span>
                        ) : (
                          <span style={{ color: "var(--platform-patrimonio, var(--color-gain))" }}>Nueva</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {rows.length > 5 && (
              <p
                className="text-xs text-center py-2"
                style={{
                  color: "var(--text-muted)",
                  borderTop: "1px solid var(--border-stone, rgba(160,120,80,0.10))",
                  backgroundColor: "var(--bg-card)",
                }}
              >
                Mostrando 5 de {rows.length} filas
              </p>
            )}
          </div>
        )}

        {/* Import result */}
        {importResult && (
          <div
            className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm"
            style={{
              backgroundColor: "rgba(46,125,107,0.08)",
              color: "var(--platform-patrimonio, var(--color-gain))",
              border: "1px solid rgba(46,125,107,0.18)",
            }}
            role="status"
          >
            <CheckCircle2 size={15} strokeWidth={2} aria-hidden="true" />
            {importResult.imported} transacciones importadas
            {importResult.skipped > 0 && ` · ${importResult.skipped} omitidas`}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-2 justify-end pt-1">
          <Button variant="ghost" onClick={onClose} disabled={isImporting}>
            {importResult ? "Cerrar" : "Cancelar"}
          </Button>
          {toImportCount > 0 && !importResult && (
            <Button
              onClick={handleImport}
              disabled={isImporting}
              style={{
                backgroundColor: "var(--platform-crypto)",
                color: "#fff",
              }}
            >
              {isImporting
                ? "Importando…"
                : `Importar ${toImportCount} transacciones`}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
