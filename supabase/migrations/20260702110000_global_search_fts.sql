-- Búsqueda global de contenido (⌘K): notas, proyectos, suscripciones y eventos.
-- SECURITY INVOKER (por defecto): corre con los permisos del usuario → RLS intacto,
-- y además filtra explícitamente por auth.uid(). FTS en español + fallback ILIKE
-- para prefijos/palabras parciales. Volumen personal → sin índices dedicados.
CREATE OR REPLACE FUNCTION global_search(p_query text, p_limit int DEFAULT 12)
RETURNS TABLE(kind text, id uuid, title text, snippet text, rank real)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  WITH q AS (
    SELECT websearch_to_tsquery('spanish', p_query) AS tsq,
           '%' || p_query || '%' AS pat
  )
  SELECT * FROM (
    -- Notas: título + contenido (HTML → texto)
    SELECT
      'note'::text AS kind,
      n.id,
      n.title,
      left(regexp_replace(coalesce(n.content, ''), '<[^>]+>', ' ', 'g'), 140) AS snippet,
      (CASE WHEN to_tsvector('spanish', coalesce(n.title, '') || ' ' ||
              regexp_replace(coalesce(n.content, ''), '<[^>]+>', ' ', 'g')) @@ q.tsq
            THEN ts_rank(to_tsvector('spanish', coalesce(n.title, '') || ' ' ||
              regexp_replace(coalesce(n.content, ''), '<[^>]+>', ' ', 'g')), q.tsq)
            ELSE 0 END
       + CASE WHEN n.title ILIKE q.pat THEN 0.5 ELSE 0 END
       + CASE WHEN n.content ILIKE q.pat THEN 0.05 ELSE 0 END)::real AS rank
    FROM notes n, q
    WHERE n.user_id = auth.uid()
      AND n.deleted_at IS NULL
      AND n.archived = false

    UNION ALL

    -- Proyectos: nombre + descripción
    SELECT
      'project'::text,
      p.id,
      p.name,
      left(coalesce(p.description, ''), 140),
      (CASE WHEN to_tsvector('spanish', coalesce(p.name, '') || ' ' || coalesce(p.description, '')) @@ q.tsq
            THEN ts_rank(to_tsvector('spanish', coalesce(p.name, '') || ' ' || coalesce(p.description, '')), q.tsq)
            ELSE 0 END
       + CASE WHEN p.name ILIKE q.pat THEN 0.5 ELSE 0 END
       + CASE WHEN p.description ILIKE q.pat THEN 0.05 ELSE 0 END)::real
    FROM projects p, q
    WHERE p.user_id = auth.uid()
      AND p.status <> 'archived'

    UNION ALL

    -- Suscripciones: nombre + notas
    SELECT
      'subscription'::text,
      s.id,
      s.name,
      left(coalesce(s.notes, ''), 140),
      (CASE WHEN to_tsvector('spanish', coalesce(s.name, '') || ' ' || coalesce(s.notes, '')) @@ q.tsq
            THEN ts_rank(to_tsvector('spanish', coalesce(s.name, '') || ' ' || coalesce(s.notes, '')), q.tsq)
            ELSE 0 END
       + CASE WHEN s.name ILIKE q.pat THEN 0.5 ELSE 0 END)::real
    FROM subscriptions s, q
    WHERE s.user_id = auth.uid()

    UNION ALL

    -- Eventos de Cronos: título + descripción
    SELECT
      'event'::text,
      e.id,
      e.title,
      left(coalesce(e.description, ''), 140),
      (CASE WHEN to_tsvector('spanish', coalesce(e.title, '') || ' ' || coalesce(e.description, '')) @@ q.tsq
            THEN ts_rank(to_tsvector('spanish', coalesce(e.title, '') || ' ' || coalesce(e.description, '')), q.tsq)
            ELSE 0 END
       + CASE WHEN e.title ILIKE q.pat THEN 0.5 ELSE 0 END)::real
    FROM agenda_events e, q
    WHERE e.user_id = auth.uid()
  ) results
  WHERE results.rank > 0
  ORDER BY results.rank DESC
  LIMIT greatest(1, least(p_limit, 30));
$$;

GRANT EXECUTE ON FUNCTION global_search(text, int) TO authenticated;
REVOKE EXECUTE ON FUNCTION global_search(text, int) FROM anon;
