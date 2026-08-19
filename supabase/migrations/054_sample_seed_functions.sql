-- ============================================================
-- 054_sample_seed_functions.sql
-- Funciones de seed por-usuario (datos de ejemplo).
--
-- Definen las funciones seed_*_for_user que la app invoca vía rpc()
-- para poblar la cuenta con datos de muestra. Aquí se dejan como
-- stubs limpios (sin datos reales). El seed completo de demostración
-- vive en `supabase/seeds/demo_seed.sql` (seed_demo_for_user).
-- ============================================================

CREATE OR REPLACE FUNCTION seed_patrimonio_for_user(p_user_id UUID)
RETURNS jsonb AS $$
BEGIN
  RETURN jsonb_build_object('success', true, 'note', 'usar supabase/seeds/demo_seed.sql para datos de ejemplo');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION seed_patrimonio_transactions(p_user_id UUID)
RETURNS jsonb AS $$
BEGIN
  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION seed_indexa_for_user(p_user_id UUID)
RETURNS jsonb AS $$
BEGIN
  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION seed_horos_for_user(p_user_id UUID)
RETURNS void AS $$
BEGIN
  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION seed_crypto_for_user(p_user_id UUID)
RETURNS void AS $$
BEGIN
  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION seed_crypto_for_user_v2(p_user_id UUID)
RETURNS jsonb AS $$
BEGIN
  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
