import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { digestRequest, buildDigest } from "./digest_decision.ts";

const port = Number(process.env.PORT ?? 3000);
const snapshot = process.env.WORK_ORDERS_FILE ?? "work-orders.json";

createServer(async (request, response) => {
  const send = (status: number, value: unknown) => {
    response.writeHead(status, { "Content-Type": "application/json" });
    response.end(JSON.stringify(value));
  };
  if (request.method !== "POST" || !["/digest/preview", "/digest/run"].includes(request.url ?? "")) {
    send(404, { error: "Route not found" });
    return;
  }
  try {
    const raw = request.url === "/digest/preview"
      ? await new Promise<string>((resolve, reject) => {
          const chunks: Buffer[] = [];
          request.on("data", chunk => chunks.push(Buffer.from(chunk)));
          request.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
          request.on("error", reject);
        })
      : await readFile(snapshot, "utf8");
    let body: unknown;
    try {
      body = JSON.parse(raw);
    } catch (error) {
      if (request.url !== "/digest/preview") throw error;
      send(400, { error: "Request body must be JSON" });
      return;
    }
    const parsed = digestRequest.safeParse(body);
    if (!parsed.success) {
      send(400, { error: parsed.error.flatten() });
      return;
    }
    const digest = buildDigest(parsed.data);
    if (request.url === "/digest/preview") {
      send(200, digest);
      return;
    }
    const destination = process.env.DIGEST_DELIVERY_URL;
    if (!destination) throw new Error("Set DIGEST_DELIVERY_URL");
    const delivery = await fetch(destination, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": createHash("sha256").update(`field-service:${digest.week}`).digest("hex")
      },
      body: JSON.stringify(digest)
    });
    if (!delivery.ok) throw new Error(`Delivery returned ${delivery.status}`);
    send(200, { week: digest.week, deliveredItems: digest.items.length });
  } catch (error) {
    send(500, { error: error instanceof Error ? error.message : "Unexpected error" });
  }
}).listen(port, () => console.log(`Digest service listening on ${port}`));
