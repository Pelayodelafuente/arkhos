import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  hasPlatforms,
  getPortfolioOverview,
  getAllAssets,
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

  const [overview, assets, savingsPlan, snapshots, passiveIncome, platforms] = await Promise.all([
    getPortfolioOverview(user.id),
    getAllAssets(user.id),
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
      savingsPlan={savingsPlan}
      snapshots={snapshots}
      passiveIncome={passiveIncome}
      platforms={platforms}
    />
  );
}
