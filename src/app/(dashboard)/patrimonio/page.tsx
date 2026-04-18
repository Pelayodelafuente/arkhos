import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  hasPlatforms,
  getPortfolioOverview,
  getAllAssets,
  getAllTransactions,
  getSavingsPlan,
  getSnapshots,
  getPassiveIncome,
  getPlatforms,
} from "@/lib/supabase/patrimonio";
import { getIndexaOverview } from "@/lib/supabase/indexa";
import { PatrimonioView } from "@/components/modules/patrimonio/PatrimonioView";
import { PatrimonioOnboarding } from "@/components/modules/patrimonio/PatrimonioOnboarding";
import type { IndexaOverview } from "@/types/indexa";

export default async function PatrimonioPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const hasData = await hasPlatforms(user.id);

  if (!hasData) {
    return <PatrimonioOnboarding />;
  }

  const [overview, assets, transactions, savingsPlan, snapshots, passiveIncome, platforms, indexaOverview] = await Promise.all([
    getPortfolioOverview(user.id),
    getAllAssets(user.id),
    getAllTransactions(user.id, 500),
    getSavingsPlan(user.id),
    getSnapshots(user.id),
    getPassiveIncome(user.id),
    getPlatforms(user.id),
    getIndexaOverview(user.id).catch(() => null as IndexaOverview | null),
  ]);

  if (!overview) {
    return <PatrimonioOnboarding />;
  }

  return (
    <PatrimonioView
      overview={overview}
      assets={assets}
      transactions={transactions}
      savingsPlan={savingsPlan}
      snapshots={snapshots}
      passiveIncome={passiveIncome}
      platforms={platforms}
      indexaOverview={indexaOverview}
    />
  );
}
