-- Run once against the tns_tool_stats D1 database using its authenticated console.
-- Keep browser/desktop visitor IDs: returning visitors retain their identity.
DELETE FROM daily_visitors;
UPDATE stats SET value = 0, updated_at = CURRENT_TIMESTAMP
WHERE name = 'documents_generated';
SELECT
  COALESCE((SELECT value FROM stats WHERE name='documents_generated'),0) AS documentsGenerated,
  (SELECT COUNT(*) FROM daily_visitors WHERE visit_date=date('now')) AS visitorsToday,
  (SELECT COUNT(DISTINCT visitor_id) FROM daily_visitors) AS totalVisitors;
