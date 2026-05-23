"use client";

import { useState } from "react";
import { TrendingUp, CheckCircle, ArrowRight } from "lucide-react";
import { importPatrimonioData } from "@/app/actions/patrimonio";
import { Button } from "@/components/ui";
import Link from "next/link";

export function PatrimonioOnboarding() {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleImport() {
    setStatus("loading");
    const result = await importPatrimonioData();
    if (result.success) {
      setStatus("success");
      setMessage(result.message);
    } else {
      setStatus("error");
      setMessage(result.message);
    }
  }

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <div
        className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl"
        style={{
          backgroundColor: "rgba(46,125,107,0.12)",
          border: "1px solid rgba(46,125,107,0.25)",
        }}
      >
        <TrendingUp
          size={28}
          strokeWidth={1.75}
          style={{ color: "var(--module-patrimonio)" }}
          aria-hidden="true"
        />
      </div>

      <h1 className="font-heading text-3xl text-foreground">
        Tu centro de mando financiero
      </h1>
      <p className="mt-3 max-w-md text-sm text-text-secondary">
        Conecta tus plataformas de inversión y ten una visión completa de tu patrimonio en tiempo
        real.
      </p>

      {/* Preview card */}
      <div
        className="mt-8 w-full max-w-sm rounded-xl border border-border bg-card p-5 text-left"
        style={{ borderTopColor: "var(--module-patrimonio)", borderTopWidth: 2 }}
      >
        <div className="flex items-center gap-3">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-lg"
            style={{
              backgroundColor: "rgba(46,125,107,0.12)",
              border: "1px solid rgba(46,125,107,0.2)",
            }}
          >
            <TrendingUp
              size={16}
              strokeWidth={1.75}
              style={{ color: "var(--module-patrimonio)" }}
              aria-hidden="true"
            />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Trade Republic</p>
            <p className="text-xs text-text-tertiary">
              29 activos · 5 plataformas · Plan de ahorro activo
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-3">
          {[
            { label: "ETFs", value: "12" },
            { label: "Acciones", value: "8" },
            { label: "Commodities", value: "3" },
          ].map(({ label, value }) => (
            <div
              key={label}
              className="rounded-lg bg-sand p-2.5 text-center"
            >
              <p className="font-mono text-lg font-semibold text-foreground">{value}</p>
              <p className="text-xs text-text-tertiary">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="mt-8 space-y-3">
        {status === "success" ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2" style={{ color: "var(--module-patrimonio)" }}>
              <CheckCircle size={18} strokeWidth={1.75} aria-hidden="true" />
              <p className="text-sm font-medium">{message}</p>
            </div>
            <Link href="/patrimonio">
              <Button
                className="gap-2"
                style={{
                  backgroundColor: "var(--module-patrimonio)",
                  color: "white",
                  borderColor: "var(--module-patrimonio)",
                }}
              >
                Ver mi portfolio
                <ArrowRight size={14} strokeWidth={1.75} aria-hidden="true" />
              </Button>
            </Link>
          </div>
        ) : (
          <>
            <Button
              onClick={handleImport}
              disabled={status === "loading"}
              className="gap-2 px-6"
              style={{
                backgroundColor: "var(--module-patrimonio)",
                color: "white",
                borderColor: "var(--module-patrimonio)",
              }}
            >
              {status === "loading" ? (
                <>
                  <span className="animate-spin">⟳</span>
                  Importando cartera...
                </>
              ) : (
                <>
                  <TrendingUp size={14} strokeWidth={1.75} aria-hidden="true" />
                  Importar mi cartera
                </>
              )}
            </Button>
            {status === "error" && (
              <p className="text-sm text-[#A32D2D]">{message}</p>
            )}
          </>
        )}
      </div>

      <p className="mt-6 text-xs text-text-tertiary">
        Se importaran tus datos de Trade Republic, Indexa Capital, Horos, Cripto y Mintos
      </p>
    </div>
  );
}
