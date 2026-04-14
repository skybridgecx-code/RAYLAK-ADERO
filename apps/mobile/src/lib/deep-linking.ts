import * as Linking from "expo-linking";
import type { Href, Router } from "expo-router";

export function getDeepLinkRoute(url: string): Href | null {
  const parsed = Linking.parse(url);
  const path = parsed.path?.replace(/^\/+/, "") ?? "";
  const parts = path.split("/").filter(Boolean);

  if (parts.length === 0) {
    return null;
  }

  const [resource, id] = parts;

  if (resource === "trip" && id) {
    return `/(main)/trip/${id}`;
  }
  if (resource === "request" && id) {
    return `/(main)/request/${id}`;
  }
  if (resource === "offer" && id) {
    return `/(main)/offer/${id}`;
  }
  if (resource === "invoice" && id) {
    return `/(main)/invoice/${id}`;
  }
  if (resource === "dispute" && id) {
    return `/(main)/dispute/${id}`;
  }
  if (resource === "notifications") {
    return "/(main)/notifications";
  }

  return null;
}

export function handleNotificationNavigation(
  data: Record<string, unknown>,
  router: Router,
): void {
  const tripId = typeof data.tripId === "string" ? data.tripId : null;
  const requestId = typeof data.requestId === "string" ? data.requestId : null;
  const offerId = typeof data.offerId === "string" ? data.offerId : null;
  const invoiceId = typeof data.invoiceId === "string" ? data.invoiceId : null;
  const disputeId = typeof data.disputeId === "string" ? data.disputeId : null;

  if (tripId) {
    router.push(`/(main)/trip/${tripId}`);
    return;
  }
  if (requestId) {
    router.push(`/(main)/request/${requestId}`);
    return;
  }
  if (offerId) {
    router.push(`/(main)/offer/${offerId}`);
    return;
  }
  if (invoiceId) {
    router.push(`/(main)/invoice/${invoiceId}`);
    return;
  }
  if (disputeId) {
    router.push(`/(main)/dispute/${disputeId}`);
  }
}
