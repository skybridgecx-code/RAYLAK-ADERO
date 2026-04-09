import type { NextRequest } from "next/server";
import { ApiAuthError, authenticateRequest } from "@/lib/api-auth";
import { createIncident, getIncidentsForUser } from "@/lib/incidents";
import { createIncidentSchema } from "@/lib/validators";
import { apiError, apiSuccess, getErrorMessage } from "@/app/api/v1/_utils";

export async function GET(_request: NextRequest) {
  try {
    const { user } = await authenticateRequest();
    const incidents = await getIncidentsForUser(user.id);
    return apiSuccess(incidents);
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return apiError(error.message, error.status);
    }
    return apiError(getErrorMessage(error, "Failed to load incidents."), 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user } = await authenticateRequest();
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return apiError("Invalid JSON body.", 400);
    }

    const parsed = createIncidentSchema.safeParse(body);
    if (parsed.success === false) {
      return apiError("Invalid incident payload.", 400);
    }

    const incident = await createIncident(user.id, parsed.data);
    return apiSuccess(incident, 201);
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return apiError(error.message, error.status);
    }
    return apiError(getErrorMessage(error, "Failed to report incident."), 500);
  }
}
