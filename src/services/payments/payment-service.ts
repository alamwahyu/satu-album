import { randomBytes } from "crypto";
import { prisma } from "@/lib/db/prisma";

export type CreatePaymentIntentInput = {
  userId: string;
  eventId?: string;
  planId: string;
};

export interface PaymentService {
  createPaymentIntent(input: CreatePaymentIntentInput): Promise<{ transactionId: string; status: "PENDING" | "PAID" }>;
}

export class PlaceholderPaymentService implements PaymentService {
  async createPaymentIntent(input: CreatePaymentIntentInput): Promise<{ transactionId: string; status: "PENDING" | "PAID" }> {
    const plan = await prisma.plan.findUniqueOrThrow({ where: { id: input.planId } });
    const transaction = await prisma.transaction.create({
      data: {
        transactionId: `txn_${randomBytes(12).toString("hex")}`,
        userId: input.userId,
        eventId: input.eventId,
        planId: input.planId,
        amountCents: plan.priceCents,
        currency: plan.currency,
        status: plan.priceCents === 0 ? "PAID" : "PENDING",
        paymentProvider: "placeholder",
        paidAt: plan.priceCents === 0 ? new Date() : null
      }
    });

    return { transactionId: transaction.transactionId, status: transaction.status === "PAID" ? "PAID" : "PENDING" };
  }
}

export const paymentService: PaymentService = new PlaceholderPaymentService();
