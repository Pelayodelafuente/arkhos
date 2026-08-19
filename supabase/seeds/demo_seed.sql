-- ============================================================
-- Arkhos — SEED DEMO (datos ficticios de muestra)
-- Rellena TODOS los módulos con datos de ejemplo realistas para
-- un usuario de demostración. No contiene datos personales reales.
--
-- Uso:  SELECT seed_demo_for_user('<uuid-del-usuario-demo>');
-- Idempotente: borra los datos previos del usuario antes de insertar.
-- ============================================================

CREATE OR REPLACE FUNCTION seed_demo_for_user(p_user_id UUID)
RETURNS jsonb AS $$
DECLARE
  pf_tr UUID; pf_cr UUID; pf_ix UUID; pf_ho UUID; pf_mi UUID;
  ix_global UUID; ix_bonds UUID;
BEGIN

-- ===========================================================
-- 0) LIMPIEZA (idempotencia) — solo datos del usuario demo
-- ===========================================================
DELETE FROM subscription_payments WHERE user_id = p_user_id;
DELETE FROM subscriptions WHERE user_id = p_user_id;
DELETE FROM expense_categories WHERE user_id = p_user_id;
DELETE FROM user_gastos_settings WHERE user_id = p_user_id;

DELETE FROM phase_tasks WHERE phase_id IN (
  SELECT ph.id FROM project_phases ph JOIN projects p ON p.id = ph.project_id WHERE p.user_id = p_user_id);
DELETE FROM project_phases WHERE project_id IN (SELECT id FROM projects WHERE user_id = p_user_id);
DELETE FROM projects WHERE user_id = p_user_id;
DELETE FROM project_types WHERE user_id = p_user_id;
DELETE FROM project_statuses WHERE user_id = p_user_id;

DELETE FROM note_backlinks WHERE source_note_id IN (SELECT id FROM notes WHERE user_id = p_user_id);
DELETE FROM notes WHERE user_id = p_user_id;
DELETE FROM note_folders WHERE user_id = p_user_id;

DELETE FROM agenda_events WHERE user_id = p_user_id;
DELETE FROM market_alerts WHERE user_id = p_user_id;
DELETE FROM alert_configs WHERE user_id = p_user_id;

DELETE FROM passive_income WHERE user_id = p_user_id;
DELETE FROM savings_plan_items WHERE user_id = p_user_id;
DELETE FROM portfolio_transactions WHERE user_id = p_user_id;
DELETE FROM portfolio_snapshots WHERE user_id = p_user_id;
DELETE FROM portfolio_assets WHERE user_id = p_user_id;
DELETE FROM indexa_transactions WHERE user_id = p_user_id;
DELETE FROM indexa_monthly_returns WHERE user_id = p_user_id;
DELETE FROM indexa_positions WHERE user_id = p_user_id;
DELETE FROM indexa_funds WHERE user_id = p_user_id;
DELETE FROM horos_transactions WHERE user_id = p_user_id;
DELETE FROM horos_nav_history WHERE user_id = p_user_id;
DELETE FROM horos_position WHERE user_id = p_user_id;
DELETE FROM crypto_transactions WHERE user_id = p_user_id;
DELETE FROM crypto_assets WHERE user_id = p_user_id;
DELETE FROM mintos_monthly_snapshots WHERE user_id = p_user_id;
DELETE FROM mintos_deposits WHERE user_id = p_user_id;
DELETE FROM mintos_overview WHERE user_id = p_user_id;
DELETE FROM investment_platforms WHERE user_id = p_user_id;

-- ===========================================================
-- 1) GASTOS
-- ===========================================================
INSERT INTO expense_categories (user_id, name, icon, color, sort_order, budget) VALUES
  (p_user_id, 'Streaming',   'clapperboard', '#C4704A', 1, 60),
  (p_user_id, 'Software',    'laptop',       '#4A7A9B', 2, 120),
  (p_user_id, 'Hogar',       'home',         '#5B8C6A', 3, 900),
  (p_user_id, 'Salud',       'heart-pulse',  '#9B7A4A', 4, 80),
  (p_user_id, 'Servicios',   'plug',         '#7a9b76', 5, 150);

INSERT INTO user_gastos_settings (user_id, monthly_budget, default_currency, alert_enabled, alert_renewal_days)
VALUES (p_user_id, 1400, 'EUR', true, 3);

INSERT INTO subscriptions (user_id, category_id, name, icon, color, amount, currency, cycle, billing_day, is_active, status, url, started_at, notes)
SELECT p_user_id, c.id, s.name, s.icon, s.color, s.amount, 'EUR', s.cycle, s.billing_day, true, s.status, s.url, s.started::date, s.notes
FROM (VALUES
  ('Streaming', 'Netflix',        'netflix',   '#E50914', 17.99, 'monthly', 5,  'active', 'https://netflix.com',  '2023-01-05', 'Plan Premium 4K'),
  ('Streaming', 'Spotify',        'spotify',   '#1DB954', 11.99, 'monthly', 12, 'active', 'https://spotify.com',  '2022-06-12', 'Individual'),
  ('Streaming', 'Disney+',        'disney',    '#113CCF', 9.99,  'monthly', 20, 'paused', 'https://disneyplus.com','2023-11-20', 'Pausada temporalmente'),
  ('Streaming', 'YouTube Premium','youtube',   '#FF0000', 12.99, 'monthly', 1,  'active', 'https://youtube.com',  '2024-02-01', NULL),
  ('Software',  'GitHub Pro',     'github',    '#181717', 4.00,  'monthly', 8,  'active', 'https://github.com',   '2023-03-08', 'Copilot incluido'),
  ('Software',  'Adobe CC',       'adobe',     '#FF0000', 24.19, 'monthly', 15, 'active', 'https://adobe.com',    '2024-01-15', 'Fotografía'),
  ('Software',  'Notion',         'notion',    '#000000', 8.00,  'monthly', 10, 'active', 'https://notion.so',    '2023-09-10', 'Plus'),
  ('Software',  'ChatGPT Plus',   'openai',    '#10A37F', 20.00, 'monthly', 22, 'active', 'https://openai.com',   '2024-04-22', NULL),
  ('Software',  'Vercel Pro',     'vercel',    '#000000', 20.00, 'monthly', 3,  'active', 'https://vercel.com',   '2024-05-03', 'Hosting proyectos'),
  ('Software',  '1Password',      'onepassword','#0094F5',35.88, 'annual',  18, 'active', 'https://1password.com','2023-07-18', 'Facturación anual'),
  ('Servicios', 'Movistar Fibra', 'wifi',      '#019DF4', 49.90, 'monthly', 2,  'active', 'https://movistar.es',  '2022-01-02', 'Fibra 600Mb + móvil'),
  ('Servicios', 'Iberdrola Luz',  'zap',       '#7ED321', 62.40, 'monthly', 28, 'active', NULL,                   '2021-10-28', 'Tarifa indexada'),
  ('Servicios', 'Seguro Coche',   'car',       '#4A7A9B', 480.00,'annual',  14, 'active', NULL,                   '2024-03-14', 'Todo riesgo franquicia'),
  ('Salud',     'Gimnasio',       'dumbbell',  '#F5A623', 39.99, 'monthly', 1,  'active', NULL,                   '2024-01-01', 'Cuota mensual'),
  ('Salud',     'Sanitas',        'stethoscope','#00A9E0',55.00, 'monthly', 5,  'active', 'https://sanitas.es',   '2023-05-05', 'Seguro médico')
) AS s(cat, name, icon, color, amount, cycle, billing_day, status, url, started, notes)
JOIN expense_categories c ON c.user_id = p_user_id AND c.name = s.cat;

-- Historial de pagos: últimos 6 meses para cada suscripción mensual activa
INSERT INTO subscription_payments (subscription_id, user_id, amount, currency, paid_at, cycle, auto_generated)
SELECT s.id, p_user_id, s.amount, 'EUR',
       (date_trunc('month', now()) - (g || ' month')::interval + (least(s.billing_day,28)-1) * interval '1 day')::date,
       'monthly', true
FROM subscriptions s
CROSS JOIN generate_series(0, 5) g
WHERE s.user_id = p_user_id AND s.cycle = 'monthly' AND s.status = 'active';

-- ===========================================================
-- 2) PROYECTOS
-- ===========================================================
INSERT INTO project_types (user_id, name, icon, color, sort_order) VALUES
  (p_user_id, 'App Web',         'globe',     '#C4704A', 1),
  (p_user_id, 'Móvil',           'smartphone','#4A7A9B', 2),
  (p_user_id, 'CLI / Herramienta','terminal', '#5B8C6A', 3),
  (p_user_id, 'Diseño',          'palette',   '#9B7A4A', 4);

INSERT INTO project_statuses (user_id, name, color, is_default, sort_order) VALUES
  (p_user_id, 'Idea',       '#888780', false, 1),
  (p_user_id, 'Activo',     '#5B8C6A', true,  2),
  (p_user_id, 'En pausa',   '#9B7A4A', false, 3),
  (p_user_id, 'Completado', '#4A7A9B', false, 4);

INSERT INTO projects (user_id, name, icon, type, status, stack, tags, start_date, target_date, description, repository_url, sort_order)
VALUES
  (p_user_id, 'Arkhos', 'layout-dashboard', 'App Web', 'Activo',
    ARRAY['Next.js','TypeScript','Supabase','Tailwind'], ARRAY['personal','flagship'],
    '2026-03-01', '2026-12-31', 'Centro de mando personal modular: patrimonio, gastos, notas, proyectos y mercados en una sola plataforma.', 'https://github.com/demo/arkhos', 1),
  (p_user_id, 'Portfolio Web', 'globe', 'App Web', 'Activo',
    ARRAY['Astro','TypeScript','CSS'], ARRAY['personal','marca'],
    '2026-05-10', '2026-09-30', 'Sitio web personal con blog técnico y showcase de proyectos.', 'https://github.com/demo/portfolio', 2),
  (p_user_id, 'TaskFlow CLI', 'terminal', 'CLI / Herramienta', 'En pausa',
    ARRAY['Rust','clap'], ARRAY['open-source'],
    '2026-02-15', NULL, 'Gestor de tareas por terminal con sincronización local. Aparcado a la espera de refactor.', 'https://github.com/demo/taskflow', 3),
  (p_user_id, 'FitTrack', 'smartphone', 'Móvil', 'Idea',
    ARRAY['React Native','Expo'], ARRAY['fitness','idea'],
    '2026-08-01', NULL, 'App móvil de seguimiento de entrenamientos y nutrición. En fase de conceptualización.', NULL, 4),
  (p_user_id, 'Sistema de Diseño Aurora', 'palette', 'Diseño', 'Completado',
    ARRAY['Figma','Tokens Studio'], ARRAY['design-system'],
    '2025-11-01', '2026-02-28', 'Design system con tokens, componentes y guía de marca. Entregado y documentado.', NULL, 5);

-- Fases (referencia a proyectos por nombre)
INSERT INTO project_phases (project_id, name, status, sort_order, start_date, end_date, color)
SELECT p.id, v.pname, v.pstatus, v.sort, v.sd::date, v.ed::date, v.color
FROM (VALUES
  ('Arkhos','Fundación',       'done',        1, '2026-03-01','2026-04-15','#5B8C6A'),
  ('Arkhos','Módulos core',    'done',        2, '2026-04-15','2026-06-30','#5B8C6A'),
  ('Arkhos','Pulido y demo',   'in-progress', 3, '2026-07-01', NULL,       '#C4704A'),
  ('Portfolio Web','Diseño',   'done',        1, '2026-05-10','2026-06-01','#5B8C6A'),
  ('Portfolio Web','Desarrollo','in-progress',2, '2026-06-01', NULL,       '#C4704A'),
  ('TaskFlow CLI','MVP',       'done',        1, '2026-02-15','2026-04-01','#5B8C6A'),
  ('TaskFlow CLI','Refactor',  'pending',     2, NULL,         NULL,       '#888780'),
  ('FitTrack','Research',      'in-progress', 1, '2026-08-01', NULL,       '#C4704A'),
  ('Sistema de Diseño Aurora','Tokens',    'done', 1, '2025-11-01','2025-12-15','#5B8C6A'),
  ('Sistema de Diseño Aurora','Componentes','done',2, '2025-12-15','2026-02-28','#5B8C6A')
) AS v(proj, pname, pstatus, sort, sd, ed, color)
JOIN projects p ON p.user_id = p_user_id AND p.name = v.proj;

-- Tareas (referencia a fases por proyecto+fase)
INSERT INTO phase_tasks (phase_id, text, done, status, priority, sort_order, due_date, labels, estimated_hours)
SELECT ph.id, v.txt, v.done, v.st, v.prio, v.sort, v.due::date, v.labels, v.hrs
FROM (VALUES
  ('Arkhos','Fundación','Configurar Next.js + Supabase + RLS', true, 'done','high',1,'2026-03-10', ARRAY['setup'], 8.0),
  ('Arkhos','Fundación','Sistema de autenticación con MFA',    true, 'done','high',2,'2026-03-20', ARRAY['auth'], 12.0),
  ('Arkhos','Fundación','Design system y tokens',              true, 'done','medium',3,'2026-04-10', ARRAY['ui'], 10.0),
  ('Arkhos','Módulos core','Módulo Patrimonio',                true, 'done','high',1,'2026-05-15', ARRAY['feature'], 30.0),
  ('Arkhos','Módulos core','Módulo Gastos',                    true, 'done','high',2,'2026-05-30', ARRAY['feature'], 20.0),
  ('Arkhos','Módulos core','Módulo Notas con editor',          true, 'done','medium',3,'2026-06-20', ARRAY['feature'], 25.0),
  ('Arkhos','Pulido y demo','Modo oscuro',                     true, 'done','medium',1,'2026-07-10', ARRAY['ui'], 6.0),
  ('Arkhos','Pulido y demo','Datos de ejemplo para demo',      false,'in_progress','high',2,'2026-08-20', ARRAY['demo'], 4.0),
  ('Arkhos','Pulido y demo','Optimizar rendimiento',           false,'todo','medium',3,'2026-08-25', ARRAY['perf'], 8.0),
  ('Portfolio Web','Diseño','Wireframes en Figma',             true, 'done','medium',1,'2026-05-20', ARRAY['design'], 5.0),
  ('Portfolio Web','Diseño','Paleta y tipografía',             true, 'done','low',2,'2026-05-28', ARRAY['design'], 3.0),
  ('Portfolio Web','Desarrollo','Maquetar home',               true, 'done','high',1,'2026-06-15', ARRAY['dev'], 8.0),
  ('Portfolio Web','Desarrollo','Blog con MDX',                false,'in_progress','medium',2,'2026-08-30', ARRAY['dev'], 12.0),
  ('Portfolio Web','Desarrollo','SEO y despliegue',            false,'todo','low',3,'2026-09-15', ARRAY['dev'], 4.0),
  ('TaskFlow CLI','MVP','Parser de comandos',                  true, 'done','high',1,'2026-03-01', ARRAY['core'], 10.0),
  ('TaskFlow CLI','MVP','Persistencia local',                  true, 'done','medium',2,'2026-03-25', ARRAY['core'], 8.0),
  ('TaskFlow CLI','Refactor','Migrar a async',                 false,'todo','medium',1,NULL, ARRAY['debt'], 15.0),
  ('FitTrack','Research','Analizar competencia',               false,'in_progress','medium',1,'2026-08-25', ARRAY['research'], 6.0),
  ('FitTrack','Research','Definir MVP',                        false,'todo','high',2,'2026-09-05', ARRAY['research'], 4.0),
  ('Sistema de Diseño Aurora','Tokens','Definir escala de color', true,'done','high',1,'2025-11-20', ARRAY['tokens'], 6.0),
  ('Sistema de Diseño Aurora','Componentes','Botones y formularios', true,'done','high',1,'2026-01-15', ARRAY['components'], 20.0),
  ('Sistema de Diseño Aurora','Componentes','Documentación Storybook', true,'done','medium',2,'2026-02-20', ARRAY['docs'], 12.0)
) AS v(proj, phase, txt, done, st, prio, sort, due, labels, hrs)
JOIN projects p ON p.user_id = p_user_id AND p.name = v.proj
JOIN project_phases ph ON ph.project_id = p.id AND ph.name = v.phase;

-- ===========================================================
-- 3) NOTAS
-- ===========================================================
INSERT INTO note_folders (user_id, name, icon, color, sort_order) VALUES
  (p_user_id, 'Trabajo',   'briefcase', '#4A7A9B', 1),
  (p_user_id, 'Personal',  'user',      '#5B8C6A', 2),
  (p_user_id, 'Ideas',     'lightbulb', '#9B7A4A', 3);

INSERT INTO notes (user_id, folder_id, title, content, color, icon, is_pinned, status, tags, sort_order)
SELECT p_user_id, f.id, v.title, v.content, v.color, v.icon, v.pinned, v.status, v.tags, v.sort
FROM (VALUES
  ('Trabajo',  'Roadmap Arkhos Q3', E'# Roadmap Q3\n\n- [x] Modo oscuro\n- [ ] Datos demo\n- [ ] Optimización de bundle\n\nVer también [[Arquitectura Arkhos]].', '#C4704A', 'map', true,  'in_progress', ARRAY['arkhos','roadmap'], 1),
  ('Trabajo',  'Arquitectura Arkhos', E'# Arquitectura\n\nNext.js App Router + Supabase (Postgres + RLS). Estado con Zustand.\n\nCada módulo tiene su store en `src/stores`. Relacionado con [[Roadmap Arkhos Q3]].', '#4A7A9B', 'network', false, 'none', ARRAY['arkhos','técnico'], 2),
  ('Trabajo',  'Reunión con el equipo', E'## Notas reunión\n\n- Revisar métricas de rendimiento\n- Preparar demo para dirección\n- Feedback sobre el dashboard', '#5B8C6A', 'users', false, 'done', ARRAY['reunión'], 3),
  ('Personal', 'Lista de la compra', E'- Café\n- Fruta\n- Pan\n- Aceite de oliva', '#5B8C6A', 'shopping-cart', false, 'none', ARRAY['casa'], 4),
  ('Personal', 'Libros pendientes', E'# Por leer\n\n1. *El programador pragmático*\n2. *Clean Architecture*\n3. *Designing Data-Intensive Applications*', '#9B7A4A', 'book', false, 'idea', ARRAY['lectura'], 5),
  ('Ideas',    'Ideas de proyectos', E'# Ideas\n\n- App de hábitos con gamificación\n- Extensión de navegador para marcadores\n- Bot de finanzas personales\n\nAlgunas podrían encajar en [[Roadmap Arkhos Q3]].', '#9B7A4A', 'sparkles', true, 'idea', ARRAY['brainstorm'], 6),
  ('Ideas',    'Aprender Rust', E'## Plan de estudio\n\n- The Rust Book\n- Rustlings\n- Proyecto: TaskFlow CLI', '#C4704A', 'graduation-cap', false, 'in_progress', ARRAY['aprendizaje'], 7)
) AS v(folder, title, content, color, icon, pinned, status, tags, sort)
JOIN note_folders f ON f.user_id = p_user_id AND f.name = v.folder;

-- Backlinks entre notas (wikilinks)
INSERT INTO note_backlinks (source_note_id, target_note_id)
SELECT s.id, t.id FROM notes s, notes t
WHERE s.user_id = p_user_id AND t.user_id = p_user_id AND (
  (s.title='Roadmap Arkhos Q3'   AND t.title='Arquitectura Arkhos') OR
  (s.title='Arquitectura Arkhos' AND t.title='Roadmap Arkhos Q3') OR
  (s.title='Ideas de proyectos'  AND t.title='Roadmap Arkhos Q3')
);

-- ===========================================================
-- 4) AGENDA
-- ===========================================================
INSERT INTO agenda_events (user_id, title, description, start_time, end_time, is_all_day, location, color, completed)
SELECT p_user_id, v.title, v.descr,
       (date_trunc('month', now()) + (v.day-1) * interval '1 day' + v.h * interval '1 hour'),
       (date_trunc('month', now()) + (v.day-1) * interval '1 day' + (v.h + v.dur) * interval '1 hour'),
       v.allday, v.loc, v.color, v.done
FROM (VALUES
  ('Daily standup',        'Sincronización diaria del equipo', 3,  9,  1, false, 'Meet',        '#4A7A9B', false),
  ('Revisión de sprint',   'Demo y retrospectiva',             5,  16, 2, false, 'Sala 2',      '#C4704A', false),
  ('Comida con Ana',       NULL,                               8,  14, 1, false, 'Centro',      '#5B8C6A', false),
  ('Dentista',             'Revisión anual',                   10, 17, 1, false, 'Clínica Sur', '#9B7A4A', false),
  ('Gimnasio',             'Entrenamiento fuerza',             12, 19, 1, false, NULL,          '#F5A623', false),
  ('Deadline Portfolio',   'Entregar maqueta del blog',        15, 0,  0, true,  NULL,          '#E50914', false),
  ('Llamada inversores',   'Actualización trimestral',         18, 11, 1, false, 'Zoom',        '#7260C4', false),
  ('Fin de semana rural',  'Escapada',                         22, 0,  0, true,  'Ávila',       '#5B8C6A', false),
  ('Renovación seguro',    'Revisar póliza del coche',         14, 10, 1, false, NULL,          '#4A7A9B', false),
  ('Cumpleaños Marta',     NULL,                               25, 0,  0, true,  NULL,          '#C4704A', false),
  ('Planificación Q4',     'Objetivos del próximo trimestre',  28, 15, 2, false, 'Oficina',     '#9B7A4A', false)
) AS v(title, descr, day, h, dur, allday, loc, color, done);

-- ===========================================================
-- 5) MERCADOS (alertas del usuario)
-- ===========================================================
INSERT INTO alert_configs (user_id, alert_type, is_enabled, threshold_value, channel) VALUES
  (p_user_id, 'vix_spike',       true, 25, ARRAY['in_app']),
  (p_user_id, 'btc_price',       true, 60000, ARRAY['in_app']),
  (p_user_id, 'sp500_drawdown',  true, 5, ARRAY['in_app']);

INSERT INTO market_alerts (user_id, alert_type, title, message, severity, is_read, triggered_at, metric_value, threshold_value) VALUES
  (p_user_id, 'btc_price', 'Bitcoin supera 58.000 €', 'BTC ha subido un 4,2% en las últimas 24h.', 'info', false, now() - interval '2 hour', 58200, 60000),
  (p_user_id, 'vix_spike', 'Volatilidad al alza', 'El VIX ha subido a 22 puntos.', 'warning', false, now() - interval '1 day', 22, 25),
  (p_user_id, 'sp500_drawdown', 'Corrección leve en el S&P 500', 'El índice cae un 1,8% en la semana.', 'info', true, now() - interval '3 day', -1.8, -5);

-- ===========================================================
-- 6) PATRIMONIO — Plataformas
-- ===========================================================
INSERT INTO investment_platforms (user_id, name, slug, color, icon, sort_order) VALUES
  (p_user_id, 'Trade Republic', 'trade-republic', '#2E7D6B', 'trending-up', 1),
  (p_user_id, 'Cripto',         'crypto',         '#B07A3A', 'coins',       2),
  (p_user_id, 'Indexa Capital', 'indexa',         '#3B78B0', 'bar-chart-2', 3),
  (p_user_id, 'Horos',          'horos',          '#7260C4', 'pie-chart',   4),
  (p_user_id, 'Mintos',         'mintos',         '#C4704A', 'percent',     5);
SELECT id INTO pf_tr FROM investment_platforms WHERE user_id=p_user_id AND slug='trade-republic';
SELECT id INTO pf_cr FROM investment_platforms WHERE user_id=p_user_id AND slug='crypto';
SELECT id INTO pf_ix FROM investment_platforms WHERE user_id=p_user_id AND slug='indexa';
SELECT id INTO pf_ho FROM investment_platforms WHERE user_id=p_user_id AND slug='horos';
SELECT id INTO pf_mi FROM investment_platforms WHERE user_id=p_user_id AND slug='mintos';

-- Activos Trade Republic (ficticios)
INSERT INTO portfolio_assets (user_id, platform_id, name, ticker, isin, category, risk_level, sector, geographic_region, current_quantity, avg_buy_price, total_invested, current_price, price_updated_at, sort_order) VALUES
  (p_user_id, pf_tr, 'iShares Core S&P 500 UCITS ETF',    'SXR8', 'IE00B5BMR087', 'etf_index',    'low',    'Renta Variable', 'USA',    6.500000, 580.00, 3770.00, 620.00, now(), 1),
  (p_user_id, pf_tr, 'iShares Core MSCI World UCITS ETF', 'IWDA', 'IE00B4L5Y983', 'etf_index',    'low',    'Renta Variable', 'Global', 40.000000, 95.00, 3800.00, 110.00, now(), 2),
  (p_user_id, pf_tr, 'iShares Nasdaq 100 UCITS ETF',      'CNDX', 'IE00B53SZB19', 'etf_index',    'medium', 'Tecnología',     'USA',    3.000000, 1100.00, 3300.00, 1230.00, now(), 3),
  (p_user_id, pf_tr, 'Vanguard FTSE All-World UCITS ETF', 'VWRL', 'IE00BK5BR733', 'etf_index',    'low',    'Renta Variable', 'Global', 30.000000, 105.00, 3150.00, 118.00, now(), 4),
  (p_user_id, pf_tr, 'Xtrackers MSCI World IT UCITS ETF', 'XDWT', 'IE00BM67HT60', 'etf_thematic', 'medium', 'Tecnología',     'Global', 10.000000, 55.00, 550.00, 68.00, now(), 5),
  (p_user_id, pf_tr, 'iShares Physical Gold ETC',         'IGLN', 'IE00B4ND3602', 'etf_commodity','low',    'Oro Físico',     'Global', 20.000000, 60.00, 1200.00, 78.00, now(), 6),
  (p_user_id, pf_tr, 'NVIDIA Corp.',                      'NVDA', 'US67066G1040', 'stock_us',     'high',   'Semiconductores','USA',    8.000000, 120.00, 960.00, 156.00, now(), 7),
  (p_user_id, pf_tr, 'Apple Inc.',                        'AAPL', 'US0378331005', 'stock_us',     'medium', 'Tecnología',     'USA',    6.000000, 180.00, 1080.00, 225.00, now(), 8),
  (p_user_id, pf_tr, 'Microsoft Corp.',                   'MSFT', 'US5949181045', 'stock_us',     'medium', 'Software',       'USA',    3.000000, 380.00, 1140.00, 430.00, now(), 9),
  (p_user_id, pf_tr, 'Amazon.com Inc.',                   'AMZN', 'US0231351067', 'stock_us',     'medium', 'E-Commerce',     'USA',    5.000000, 170.00, 850.00, 199.00, now(), 10),
  (p_user_id, pf_tr, 'Alphabet Inc. Cl.A',               'GOOGL','US02079K3059', 'stock_us',     'medium', 'Tecnología',     'USA',    4.000000, 150.00, 600.00, 190.00, now(), 11),
  (p_user_id, pf_tr, 'Tesla Inc.',                        'TSLA', 'US88160R1014', 'stock_us',     'high',   'Automoción',     'USA',    3.000000, 250.00, 750.00, 295.00, now(), 12),
  (p_user_id, pf_tr, 'ASML Holding NV',                   'ASML', 'NL0010273215', 'stock_eu',     'medium', 'Semiconductores','Europa', 1.500000, 850.00, 1275.00, 980.00, now(), 13),
  (p_user_id, pf_tr, 'Efectivo cuenta corriente TR',      NULL,   NULL,           'cash',         'very_low', NULL,           NULL,     8500.00, 1.00, 8500.00, 1.00, now(), 0);

-- Plan de ahorro
INSERT INTO savings_plan_items (user_id, asset_id, monthly_amount, is_active, execution_day, started_at, notes, sort_order)
SELECT p_user_id, pa.id, plan.amount, true, 2, plan.sd::date, plan.notes, plan.sort
FROM portfolio_assets pa
JOIN (VALUES
  ('IE00B5BMR087', 200.00, '2026-03-01', 'Core holding', 1),
  ('IE00B4L5Y983', 150.00, '2026-03-01', 'Diversificación global', 2),
  ('IE00BK5BR733', 100.00, '2026-04-01', 'All-World', 3),
  ('IE00B4ND3602', 50.00,  '2026-05-01', 'Oro como refugio', 4)
) AS plan(isin, amount, sd, notes, sort) ON pa.isin=plan.isin AND pa.user_id=p_user_id;

-- Ingresos pasivos
INSERT INTO passive_income (user_id, asset_id, platform_id, type, income_date, amount, notes)
SELECT p_user_id, pa.id, pf_tr, inc.t::passive_income_type, inc.d::date, inc.a, inc.n
FROM (VALUES
  (NULL,           'interest', '2026-05-01', 8.40,  'Interés cuenta corriente'),
  (NULL,           'interest', '2026-06-01', 9.10,  'Interés cuenta corriente'),
  (NULL,           'interest', '2026-07-01', 9.80,  'Interés cuenta corriente'),
  (NULL,           'interest', '2026-08-01', 10.20, 'Interés cuenta corriente'),
  ('US67066G1040', 'dividend', '2026-06-27', 0.18,  'NVIDIA dividend'),
  ('US5949181045', 'dividend', '2026-06-12', 2.25,  'Microsoft dividend'),
  ('US0378331005', 'dividend', '2026-05-16', 1.44,  'Apple dividend'),
  ('US02079K3059', 'dividend', '2026-06-16', 0.80,  'Alphabet dividend')
) AS inc(isin, t, d, a, n)
LEFT JOIN portfolio_assets pa ON pa.isin=inc.isin AND pa.user_id=p_user_id;

-- Transacciones de compra (una por activo, resumida)
INSERT INTO portfolio_transactions (user_id, asset_id, platform_id, type, transaction_date, quantity, price_per_unit, total_amount, currency, source)
SELECT p_user_id, pa.id, pf_tr, 'buy', '2026-03-05'::date, pa.current_quantity, pa.avg_buy_price, pa.total_invested, 'EUR', 'demo'
FROM portfolio_assets pa WHERE pa.user_id=p_user_id AND pa.platform_id=pf_tr AND pa.category <> 'cash';

-- Indexa Capital (tablas dedicadas)
INSERT INTO indexa_funds (user_id, name, isin, fund_type, benchmark, annual_cost, currency, color, is_active) VALUES
  (p_user_id, 'Vanguard Global Stock Index Fund', 'IE00B03HCZ61', 'equity', 'MSCI World', 0.18, 'EUR', '#3B78B0', true),
  (p_user_id, 'Vanguard Global Bond Index Fund',  'IE00B18GC888', 'bond',   'Global Agg', 0.16, 'EUR', '#7EA8CC', true);
SELECT id INTO ix_global FROM indexa_funds WHERE user_id=p_user_id AND fund_type='equity';
SELECT id INTO ix_bonds  FROM indexa_funds WHERE user_id=p_user_id AND fund_type='bond';

INSERT INTO indexa_positions (user_id, fund_id, fund_type, shares, price_per_share, total_value, total_cost, unrealized_gain, allocation_pct, updated_at) VALUES
  (p_user_id, ix_global, 'equity', 45.20, 152.30, 6883.96, 6300.00, 583.96, 70, now()),
  (p_user_id, ix_bonds,  'bond',   28.10, 104.80, 2944.88, 2800.00, 144.88, 30, now());

INSERT INTO indexa_transactions (user_id, fund_id, transaction_date, type, shares, price_per_share, amount, source)
SELECT p_user_id, fid, d::date, 'subscription', sh, pps, amt, 'manual' FROM (VALUES
  (ix_global, '2026-03-15', 20.00, 145.00, 2900.00),
  (ix_bonds,  '2026-03-15', 14.00, 102.00, 1428.00),
  (ix_global, '2026-06-15', 25.20, 150.00, 3780.00),
  (ix_bonds,  '2026-06-15', 14.10, 103.50, 1459.35)
) AS t(fid, d, sh, pps, amt);

INSERT INTO indexa_monthly_returns (user_id, year, month, return_pct, benchmark_pct, cumulative_twr) VALUES
  (p_user_id, 2026, 4, 1.80, 1.60, 1.80),
  (p_user_id, 2026, 5, 2.10, 1.90, 3.94),
  (p_user_id, 2026, 6, -0.90, -1.10, 3.00),
  (p_user_id, 2026, 7, 2.40, 2.20, 5.47);

-- Horos (fondo value)
-- unrealized_gain / unrealized_gain_pct son columnas generadas: no se insertan
INSERT INTO horos_position (user_id, fund_name, isin, shares, nav_price, nav_date, total_value, total_cost, updated_at)
VALUES (p_user_id, 'Horos Value Internacional', 'ES0180792006', 380.50, 16.30, current_date, 6202.15, 5500.00, now());

INSERT INTO horos_nav_history (user_id, nav_date, nav_price, portfolio_value)
SELECT p_user_id, d::date, nav, 380.50*nav FROM (VALUES
  ('2026-04-01', 14.80),('2026-05-01', 15.10),('2026-06-01', 14.95),
  ('2026-07-01', 15.70),('2026-08-01', 16.30)
) AS t(d, nav);

INSERT INTO horos_transactions (user_id, request_date, value_date, type, nav_applied, shares, amount, source) VALUES
  (p_user_id, '2026-03-10', '2026-03-12', 'subscription', 14.50, 200.00, 2900.00, 'demo'),
  (p_user_id, '2026-06-05', '2026-06-09', 'subscription', 15.00, 180.50, 2600.00, 'demo');

-- Cripto
INSERT INTO crypto_assets (user_id, symbol, name, coingecko_id, network, current_balance, avg_buy_price_eur, total_invested_eur, current_price_eur, price_updated_at, is_active, color, sort_order) VALUES
  (p_user_id, 'BTC', 'Bitcoin',  'bitcoin',  'Bitcoin',  0.050000, 45000.00, 2250.00, 58000.00, now(), true, '#F7931A', 1),
  (p_user_id, 'ETH', 'Ethereum', 'ethereum', 'Ethereum', 1.000000, 2800.00,  2800.00, 3200.00,  now(), true, '#627EEA', 2),
  (p_user_id, 'SOL', 'Solana',   'solana',   'Solana',   15.000000, 95.00,   1425.00, 140.00,   now(), true, '#14F195', 3);

INSERT INTO crypto_transactions (user_id, asset_id, transaction_date, type, quantity, price_eur, amount_eur, exchange, source)
SELECT p_user_id, ca.id, d, 'buy', q, p, q*p, 'Bit2Me', 'demo'
FROM crypto_assets ca
JOIN (VALUES
  ('BTC', '2026-03-20'::timestamptz, 0.050000, 45000.00),
  ('ETH', '2026-04-10'::timestamptz, 1.000000, 2800.00),
  ('SOL', '2026-05-05'::timestamptz, 15.000000, 95.00)
) AS t(sym, d, q, p) ON ca.symbol=t.sym AND ca.user_id=p_user_id;

-- Mintos (P2P)
INSERT INTO mintos_overview (user_id, total_value, invested_in_loans, cash_balance, pending_payments, net_gain, xirr, avg_interest_rate, active_loans_count, originators_count, countries_count, snapshot_date)
VALUES (p_user_id, 3210.40, 2980.00, 180.40, 50.00, 210.40, 11.20, 12.50, 148, 22, 9, current_date);

INSERT INTO mintos_deposits (user_id, deposit_date, amount, notes) VALUES
  (p_user_id, '2026-03-01', 1500.00, 'Depósito inicial'),
  (p_user_id, '2026-05-01', 1000.00, 'Aportación'),
  (p_user_id, '2026-07-01', 500.00,  'Aportación');

INSERT INTO mintos_monthly_snapshots (user_id, year, month, total_value, total_deposited, interest_income) VALUES
  (p_user_id, 2026, 4, 1520.00, 1500.00, 12.30),
  (p_user_id, 2026, 5, 2545.00, 2500.00, 18.60),
  (p_user_id, 2026, 6, 2580.00, 2500.00, 21.10),
  (p_user_id, 2026, 7, 3125.00, 3000.00, 24.80);

-- ===========================================================
-- 7) SNAPSHOTS GLOBALES DE PATRIMONIO (evolución)
-- ===========================================================
-- Snapshot actual por plataforma + global (calculado de los activos TR reales del demo)
INSERT INTO portfolio_snapshots (user_id, snapshot_date, platform_id, total_value, total_invested, cash_value, pl_amount, pl_percentage)
SELECT p_user_id, current_date, pf_tr,
       COALESCE(SUM(current_quantity*current_price),0),
       COALESCE(SUM(total_invested),0),
       COALESCE(SUM(CASE WHEN category='cash' THEN current_quantity*current_price ELSE 0 END),0),
       COALESCE(SUM(current_quantity*current_price - total_invested),0),
       ROUND(COALESCE(SUM(current_quantity*current_price - total_invested)/NULLIF(SUM(total_invested),0)*100,0),2)
FROM portfolio_assets WHERE user_id=p_user_id AND platform_id=pf_tr;

INSERT INTO portfolio_snapshots (user_id, snapshot_date, platform_id, total_value, total_invested, cash_value, pl_amount, pl_percentage) VALUES
  (p_user_id, current_date, NULL, 61800.00, 54925.00, 8680.00, 6875.00, 12.52);

-- Evolución mensual global (últimos 8 meses, crecimiento progresivo)
INSERT INTO portfolio_snapshots (user_id, snapshot_date, platform_id, total_value, total_invested, cash_value, pl_amount, pl_percentage)
SELECT p_user_id, (date_trunc('month', now()) - (g || ' month')::interval)::date, NULL,
       48000 + g_desc*1750, 45000 + g_desc*1250, 6000 + g_desc*330,
       3000 + g_desc*500, ROUND((3000 + g_desc*500)/(45000 + g_desc*1250)*100, 2)
FROM generate_series(1, 8) g, LATERAL (SELECT 8-g AS g_desc) x;

RETURN jsonb_build_object('success', true, 'user_id', p_user_id, 'seeded', 'all_modules');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
