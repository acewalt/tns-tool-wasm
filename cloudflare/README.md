# TNS Tool Stats Worker

This optional Cloudflare Worker supplies three public counters from D1:

- `documents_generated`: increments after valid `.tns` bytes exist in browser memory, before `downloadBytes()`.
- `daily_visitors`: stores one anonymous visitor ID per date with a unique `(visit_date, visitor_id)` key.
- `totalVisitors`: counts distinct visitor IDs across all dates, so returning on another day does not increment the lifetime total.

The browser keeps its anonymous ID in localStorage; Portable keeps a stable ID in its user profile, independent of the localhost port. This counts browser/profile identities, not identifiable people across devices or private sessions. Clearing browser data or using another profile creates a separate identity.

For an explicitly requested reset, run [reset-stats.sql](reset-stats.sql) once in the authenticated D1 console. There is no public reset API. Visitor identities should remain intact. Every page load registers the same stable ID, with one request per renderer. D1 deduplicates it, so a returning browser is registered immediately after a reset without inflating totals. Tests exercise the real SQL with SQLite, including duplicates across dates and the reset.

## Deploy

1. Create a D1 database in Cloudflare, for example `tns_tool_stats`.
2. Run `stats-schema.sql` in that D1 database.
3. Create a Worker and paste `tns-tool-stats-worker.js`.
4. Bind the D1 database to the Worker with binding name `DB`.
5. Deploy the Worker.
6. Copy the Worker URL and paste it in `stats-config.js`:

```js
window.TNS_TOOL_STATS_API_BASE_URL = "https://your-worker.your-subdomain.workers.dev";
```

If you prefer Wrangler, copy `wrangler.stats.example.jsonc` to `wrangler.jsonc`, paste your D1 `database_id`, then run the SQL migration and deploy with Wrangler.

## API

`GET /api/stats`

Returns:

```json
{
  "documentsGenerated": 1284,
  "visitorsToday": 128
}
```

`POST /api/generated`

Increments `documents_generated` by one. The web page calls this only after the generated `.tns` file has been read back from Pyodide's in-memory filesystem as bytes.

`POST /api/visit`

Receives `{ "visitorId": "..." }`, stores it with `INSERT OR IGNORE`, and returns today's unique visitor count. Reloading the page with the same browser ID does not increase the count.

## Security Notes

The Worker rejects browser requests from origins outside `https://acewalt.github.io` and localhost development URLs. This is not private authentication; public counters can still be abused by spoofed direct requests. If abuse becomes a real issue, add a Cloudflare WAF/rate limiting rule for `POST /api/generated` and `POST /api/visit`.
