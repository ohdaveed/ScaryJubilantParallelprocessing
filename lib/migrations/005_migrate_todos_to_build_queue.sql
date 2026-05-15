-- Migrate remaining todos rows into build_queue_items, then drop todos.
-- Safe to re-run: INSERT is guarded by a NOT EXISTS check on (topic, requested_by).

INSERT INTO build_queue_items (
  concept_id, artifact_id, queue_status, priority, requested_by,
  topic, audience, error_message, karl_grade, created_at
)
SELECT
  NULL                                                                      AS concept_id,
  built_page_id                                                             AS artifact_id,
  COALESCE(status, CASE WHEN done THEN 'done' ELSE 'pending' END)          AS queue_status,
  50                                                                        AS priority,
  'legacy-todos-migration'                                                  AS requested_by,
  topic,
  user_type                                                                 AS audience,
  error_message,
  karl_grade,
  created_at
FROM todos t
WHERE NOT EXISTS (
  SELECT 1 FROM build_queue_items bqi
  WHERE bqi.topic = t.topic
    AND bqi.requested_by = 'legacy-todos-migration'
    AND bqi.created_at = t.created_at
);

DROP TABLE IF EXISTS todos;
