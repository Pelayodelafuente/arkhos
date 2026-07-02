"use client";

// ══════════════════════════════════════
// Arkhos OPS — registro de widgets del muro
// Cada pantalla del muro es un slot que puede mostrar cualquiera de estos
// widgets. Todos leen los stores ya hidratados por la megacarga.
// ══════════════════════════════════════

import type { ComponentType } from "react";
import type { SalaWidgetKey } from "@/lib/sala/config";
import { MODULE_HEX, SALA_COLORS } from "@/lib/sala/palette";
import type { SalaWidgetProps } from "./types";
import { WidgetEvolucion } from "./widget-evolucion";
import { WidgetDistribucion } from "./widget-distribucion";
import { WidgetDrawdown } from "./widget-drawdown";
import { WidgetBenchmark } from "./widget-benchmark";
import { WidgetKpis } from "./widget-kpis";
import { WidgetTopMovers } from "./widget-top-movers";
import { WidgetGastos } from "./widget-gastos";
import { WidgetProximosPagos } from "./widget-proximos-pagos";
import { WidgetMercados } from "./widget-mercados";
import { WidgetSistema } from "./widget-sistema";
import { WidgetProyectos } from "./widget-proyectos";

export interface SalaWidgetMeta {
  label: string;
  /** Color de acento (bisel 3D + chip del header FUI) */
  accentHex: string;
  Component: ComponentType<SalaWidgetProps>;
}

export const SALA_WIDGETS: Record<SalaWidgetKey, SalaWidgetMeta> = {
  evolucion: { label: "Evolución patrimonio", accentHex: MODULE_HEX.patrimonio, Component: WidgetEvolucion },
  distribucion: { label: "Distribución cartera", accentHex: MODULE_HEX.patrimonio, Component: WidgetDistribucion },
  drawdown: { label: "Drawdown", accentHex: MODULE_HEX.patrimonio, Component: WidgetDrawdown },
  benchmark: { label: "vs Índices", accentHex: MODULE_HEX.patrimonio, Component: WidgetBenchmark },
  kpis: { label: "Métricas avanzadas", accentHex: MODULE_HEX.patrimonio, Component: WidgetKpis },
  topMovers: { label: "Top movers", accentHex: MODULE_HEX.patrimonio, Component: WidgetTopMovers },
  gastos: { label: "Gasto mensual", accentHex: MODULE_HEX.gastos, Component: WidgetGastos },
  proximosPagos: { label: "Próximos pagos", accentHex: MODULE_HEX.gastos, Component: WidgetProximosPagos },
  mercados: { label: "Pulso de mercados", accentHex: MODULE_HEX.mercados, Component: WidgetMercados },
  sistema: { label: "Estado del sistema", accentHex: SALA_COLORS.copper, Component: WidgetSistema },
  proyectos: { label: "Proyectos activos", accentHex: MODULE_HEX.proyectos, Component: WidgetProyectos },
};
