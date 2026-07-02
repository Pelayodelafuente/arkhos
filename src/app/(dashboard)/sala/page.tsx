import type { Metadata } from "next";
import { SalaShell } from "@/components/modules/sala/sala-shell";

export const metadata: Metadata = {
  title: "Sala — Arkhos OPS",
  description: "Centro de mando inmersivo de Arkhos",
};

export default function SalaPage() {
  return <SalaShell />;
}
