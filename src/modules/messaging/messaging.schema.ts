import { z } from "zod";

export const MAX_MESSAGE_LENGTH = 4000;

export const sendMessageSchema = z.object({
  body: z
    .string()
    .trim()
    .min(1, "Write something first")
    .max(MAX_MESSAGE_LENGTH, `Keep it under ${MAX_MESSAGE_LENGTH} characters`),
});
export type SendMessageInput = z.infer<typeof sendMessageSchema>;

export const startConversationSchema = z.object({
  recipientId: z.string().trim().min(1),
  journeyId: z
    .string()
    .trim()
    .optional()
    .transform((v) => v || undefined),
});
export type StartConversationInput = z.infer<typeof startConversationSchema>;
