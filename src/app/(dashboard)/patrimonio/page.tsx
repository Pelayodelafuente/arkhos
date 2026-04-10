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
import { PatrimonioView } from "@/components/modules/patrimonio/PatrimonioView";
import { PatrimonioOnboarding } from "@/components/modules/patrimonio/PatrimonioOnboarding";

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

  const [overview, assets, transactions, savingsPlan, snapshots, passiveIncome, platforms] = await Promise.all([
    getPortfolioOverview(user.id),
    getAllAssets(user.id),
    getAllTransactions(user.id, 500),
    getSavingsPlan(user.id),
    getSnapshots(user.id),
    getPassiveIncome(user.id),
    getPlatforms(user.id),
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
    />
  );
}
