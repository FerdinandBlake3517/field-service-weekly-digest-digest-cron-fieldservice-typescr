import { z } from "zod";

export const workOrder = z.object({
  id: z.string().min(1),
  customer: z.string().min(1),
  dispatchStatus: z.enum(["unassigned", "assigned", "completed"]),
  photoUrls: z.array(z.string().url()),
  technicianFollowUp: z.string().default("")
});

export const digestRequest = z.object({
  week: z.string().regex(/^\d{4}-W\d{2}$/),
  workOrders: z.array(workOrder)
});

export type DigestRequest = z.infer<typeof digestRequest>;

export function buildDigest(input: DigestRequest) {
  return {
    week: input.week,
    items: input.workOrders.filter(order =>
      order.dispatchStatus !== "completed" || order.technicianFollowUp.trim().length > 0
    ).map(order => ({
      id: order.id,
      customer: order.customer,
      dispatchStatus: order.dispatchStatus,
      photos: order.photoUrls.length,
      nextAction: order.dispatchStatus === "unassigned" ? "Assign a technician" :
        order.technicianFollowUp.trim() || "Confirm completion with the customer"
    }))
  };
}
