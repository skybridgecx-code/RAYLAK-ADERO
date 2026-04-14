import type { NextRequest } from "next/server";
import { z } from "zod";
import { ApiAuthError, authenticateRequest } from "@/lib/api-auth";
import { addDisputeMessage, getDisputeById } from "@/lib/disputes";
import { createDisputeMessageSchema } from "@/lib/validators";
import { apiError, apiSuccess, getErrorMessage } from "@/app/api/v1/_utils";

const ParamsSchema = z.object({
  id: z.string().uuid(),
});

const MessageSchema = createDisputeMessageSchema
  .omit({ disputeId: true, attachmentUrl: true })
  .extend({
    attachmentUrl: z.string().url().optional(),
  });

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const routeParams = await params;
    const parsedParams = ParamsSchema.safeParse(routeParams);
    if (parsedParams.success === false) {
      return apiError("Invalid dispute id.", 400);
    }

    const { user } = await authenticateRequest();
    const dispute = await getDisputeById(parsedParams.data.id);

    if (dispute === null) {
      return apiError("Dispute not found.", 404);
    }

    const canSend =
      user.role === "admin"
      || dispute.filedByUserId === user.id
      || dispute.filedAgainstUserId === user.id;

    if (canSend === false) {
      return apiError("Forbidden", 403);
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return apiError("Invalid JSON body.", 400);
    }

    const parsedBody = MessageSchema.safeParse(body);
    if (parsedBody.success === false) {
      return apiError("Invalid dispute message payload.", 400);
    }

    const message = await addDisputeMessage(user.id, user.role, {
      disputeId: parsedParams.data.id,
      message: parsedBody.data.message,
      attachmentUrl: parsedBody.data.attachmentUrl,
    });

    return apiSuccess(message, 201);
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return apiError(error.message, error.status);
    }
    return apiError(getErrorMessage(error, "Failed to send dispute message."), 500);
  }
}
