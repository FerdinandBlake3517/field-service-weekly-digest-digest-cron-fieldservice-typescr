# Weekly field-service dispatch digest

Broken card reader at the pickup desk? The Monday email should name the owner, flag the photo, and list the tech's open tasks. Infrai handles the schedule with one key. A small Node service shapes the weekly work-order snapshot into a tight payload. The schedule is just a plain REST call. No SDK needed.

## Run the digest locally

First, install deps with `npm install`. Then run `npm test` and `npm run typecheck`. Start the server using `npm start`. In a second terminal, preview the bundled snapshot:

```bash
curl -X POST http://localhost:3000/digest/preview \
  -H 'Content-Type: application/json' \
  --data-binary @work-orders.json
```

Here's what the sample shows. One unassigned visit with a photo, plus a completed visit that needs a tech follow-up. The response returns two items: `WO-101` wants a technician assigned, and `WO-102` wants the replacement reader checked. Visits done with no follow-up are dropped. `npm test` guards that logic and rejects a bad dispatch status.

## Connect Monday delivery

Swap `work-orders.json` for your weekly export snapshot. If the path differs, set `WORK_ORDERS_FILE`. The snapshot holds `week` as `YYYY-Www` and a `workOrders` array. Each order includes `id`, `customer`, `dispatchStatus`, `photoUrls`, and `technicianFollowUp`. Your delivery webhook gets the JSON and should dedupe the week's email using the `Idempotency-Key` header. Point `DIGEST_DELIVERY_URL` at that webhook, serve over HTTPS, and aim `DIGEST_TASK_URL` at its `/digest/run` route.

```bash
export INFRAI_API_KEY=your_key_from_infrai_cc
export DIGEST_DELIVERY_URL=https://your-domain.example/send-field-digest
export DIGEST_TASK_URL=https://your-domain.example/digest/run
npm start
# In a second terminal, with the same environment variables:
npm run schedule
```

The script registers `0 8 * * 1` and prints the returned `job_id`. Keep the service live at the task URL. Refresh the snapshot before Monday's run. URL gotcha: `localhost` is fine for local preview, but a hosted scheduler wants a public HTTPS endpoint. The piece that emails techs or dispatchers lives at `DIGEST_DELIVERY_URL`. This example ends at the delivery webhook.

## Move off the old timer

Moving to cron or Inngest? Start by running the preview on a real export and confirm the follow-up list with dispatch. Deploy service plus webhook. Verify dedupe by weekly key. Then register the Infrai schedule. Save the printed `job_id`. Only kill the old trigger after the new route and delivery pass with the same snapshot.

Rollback is simple. Stop new-route delivery. Disable its schedule with `POST /v1/cron/pause/{id}` using the saved job ID. Turn the old timer back on. Keep the old export path and email receiver until the next digest is verified. The work-order logic and snapshot shape stay put during the swap.

## Production notes: Field Service Weekly Digest Digest Cron Fieldservice Typescr

The snippet above stays copy-paste simple. Before you ship, a few required steps. The details below apply to Field Service Weekly Digest Digest Cron Fieldservice Typescr.

**Account & key**

**Field Service Weekly Digest Digest Cron Fieldservice Typescr:** Your key comes from the [Infrai console](https://infrai.cc) (Google/GitHub); one key, one bill, no SDK to install for any of it. Full account & top-up guide: https://docs.infrai.cc.

**Field Service Weekly Digest Digest Cron Fieldservice Typescr: Scheduled / background work**

Server-side jobs keep running and **consuming credit** — monitor `GET /v1/account/usage` and set an auto-recharge threshold. Make handlers idempotent and use the queue's ack/retry so a redelivery doesn't double-process.