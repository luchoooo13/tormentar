import { z } from "zod";
import { publicProcedure, router } from "./_core/trpc";
import { getVapidPublicKey, saveSubscription, deleteSubscription, sendPushToAll } from "./push";

export const pushRouter = router({
  publicKey: publicProcedure.query(() => {
    const publicKey = getVapidPublicKey();
    return { publicKey };
  }),

  subscribe: publicProcedure
    .input(
      z.object({
        endpoint: z.string(),
        keys: z.object({
          p256dh: z.string(),
          auth: z.string(),
        }),
      })
    )
    .mutation(async ({ input }) => {
      await saveSubscription(input);
      return { success: true };
    }),

  unsubscribe: publicProcedure
    .input(
      z.object({
        endpoint: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      await deleteSubscription(input.endpoint);
      return { success: true };
    }),

  notify: publicProcedure
    .input(
      z.object({
        title: z.string(),
        body: z.string(),
        severity: z.string().optional(),
        alertId: z.string().optional(),
        url: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return await sendPushToAll(input);
    }),
});
