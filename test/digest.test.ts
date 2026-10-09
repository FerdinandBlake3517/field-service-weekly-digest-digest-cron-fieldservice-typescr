import assert from "node:assert/strict";
import test from "node:test";
import { buildDigest, digestRequest } from "../src/digest_decision.ts";

test("weekly digest keeps open dispatches and completed follow-ups", () => {
  const input = digestRequest.parse({ week: "2026-W38", workOrders: [
    { id: "WO-1", customer: "Shop A", dispatchStatus: "unassigned", photoUrls: [], technicianFollowUp: "" },
    { id: "WO-2", customer: "Shop B", dispatchStatus: "completed", photoUrls: ["https://example.com/photo.jpg"], technicianFollowUp: "Replace seal" },
    { id: "WO-3", customer: "Shop C", dispatchStatus: "completed", photoUrls: [], technicianFollowUp: "" }
  ] });
  assert.deepEqual(buildDigest(input).items.map(item => [item.id, item.photos, item.nextAction]), [
    ["WO-1", 0, "Assign a technician"], ["WO-2", 1, "Replace seal"]
  ]);
});

test("preview request rejects invalid dispatch status", () => {
  assert.equal(digestRequest.safeParse({ week: "2026-W38", workOrders: [
    { id: "WO-4", customer: "Shop D", dispatchStatus: "pending", photoUrls: [], technicianFollowUp: "" }
  ] }).success, false);
});
