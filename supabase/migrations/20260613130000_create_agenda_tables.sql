-- =====================================================
-- CRONOS (Agenda) MODULE TABLES
-- Migration 20260613130000
-- Centro de mando temporal: eventos nativos + push + feed ICS
-- =====================================================

-- Eventos nativos del calendario
CREATE TABLE IF NOT EXISTS agenda_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  is_all_day BOOLEAN NOT NULL DEFAULT FALSE,
  location TEXT,
  color TEXT NOT NULL DEFAULT '#8A5A7A',
  recurrence_rule TEXT,                        -- RRULE iCal (RFC 5545), null = evento unico
  reminders INT[] NOT NULL DEFAULT ARRAY[15],  -- minutos antes para el push
  source TEXT NOT NULL DEFAULT 'native',       -- 'native' (las demas fuentes son virtuales)
  linked_task_id UUID REFERENCES phase_tasks(id) ON DELETE SET NULL, -- timeboxing de tarea
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (end_time >= start_time)
);

ALTER TABLE agenda_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own agenda events"
  ON agenda_events FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_agenda_events_user_range
  ON agenda_events(user_id, start_time);
CREATE INDEX idx_agenda_events_recurring
  ON agenda_events(user_id) WHERE recurrence_rule IS NOT NULL;

-- Suscripciones Web Push (VAPID)
CREATE TABLE IF NOT EXISTS agenda_push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  device TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE agenda_push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own push subscriptions"
  ON agenda_push_subscriptions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_agenda_push_user ON agenda_push_subscriptions(user_id);

-- Token secreto del feed ICS (uno por usuario)
CREATE TABLE IF NOT EXISTS agenda_feed_tokens (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE agenda_feed_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own feed token"
  ON agenda_feed_tokens FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
