import { z } from "zod";

import { createBmoniUserInputSchema } from "../services/bmoni/index.js";

export const createMoniflowUserInputSchema = createBmoniUserInputSchema
  .extend({ localUserId: z.uuid().optional() })
  .strict();

export type CreateMoniflowUserInput = z.infer<typeof createMoniflowUserInputSchema>;

export const moniflowUserMappingResponseSchema = z
  .object({
    localUserId: z.uuid(),
    bmoniUserId: z.string().min(1),
    status: z.enum(["created", "existing"])
  })
  .strict();

export type MoniflowUserMappingResponse = z.infer<
  typeof moniflowUserMappingResponseSchema
>;
