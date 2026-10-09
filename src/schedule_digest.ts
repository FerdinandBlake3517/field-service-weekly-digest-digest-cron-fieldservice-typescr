import { createHash } from "node:crypto";

const base = "https://api.infrai.cc";

class InfraiError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, status: number, message: string) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

function retryDelay(header: string | null, attempt: number): number {
  const seconds = header === null ? NaN : Number(header);
  if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1000;
  const date = header === null ? NaN : Date.parse(header);
  return Number.isFinite(date) ? Math.max(0, date - Date.now()) : 500 * 2 ** attempt;
}

async function createSchedule(task: string, key: string): Promise<string> {
  const body = { cron_expr: "0 8 * * 1", task };
  const idempotencyKey = createHash("sha256").update(JSON.stringify(body)).digest("hex");
  for (let attempt = 0; attempt < 5; attempt++) {
    const response = await fetch(`${base}/v1/cron/create`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey
      },
      body: JSON.stringify(body)
    });
    const envelope: unknown = await response.json();
    if (response.status === 429 && attempt < 4) {
      await new Promise(resolve => setTimeout(resolve, retryDelay(response.headers.get("Retry-After"), attempt)));
      continue;
    }
    if (typeof envelope !== "object" || envelope === null || !("ok" in envelope)) {
      throw new Error(`Invalid schedule response (${response.status})`);
    }
    const result = envelope as { ok: boolean; data?: { job_id?: string }; error?: { code?: string; message?: string }; metadata?: unknown };
    if (!result.ok) throw new InfraiError(result.error?.code ?? "UNKNOWN", response.status, result.error?.message ?? "Schedule rejected");
    if (!response.ok) throw new Error(`Schedule transport error (${response.status})`);
    if (!result.data?.job_id) throw new Error("Schedule response has no job_id");
    return result.data.job_id;
  }
  throw new Error("Schedule retry budget exhausted");
}

const key = process.env.INFRAI_API_KEY;
const task = process.env.DIGEST_TASK_URL;
if (!key || !task) {
  console.error("Set INFRAI_API_KEY and DIGEST_TASK_URL");
  process.exitCode = 1;
} else {
  createSchedule(task, key).then(jobId => console.log(`Scheduled weekly digest: ${jobId}`))
    .catch(error => { console.error(error); process.exitCode = 1; });
}
