import test from "node:test";
import assert from "node:assert/strict";

import {
  getQueueStatusForPendingOffers,
  getRequestStatusForTripStatus,
} from "./request-status-sync";

test("getQueueStatusForPendingOffers returns submitted when no offers remain", () => {
  assert.equal(getQueueStatusForPendingOffers("matched", 0), "submitted");
  assert.equal(getQueueStatusForPendingOffers("submitted", 0), "submitted");
});

test("getQueueStatusForPendingOffers returns matched when pending offers exist", () => {
  assert.equal(getQueueStatusForPendingOffers("submitted", 1), "matched");
  assert.equal(getQueueStatusForPendingOffers("matched", 3), "matched");
});

test("getQueueStatusForPendingOffers ignores non-queue request statuses", () => {
  assert.equal(getQueueStatusForPendingOffers("accepted", 1), null);
  assert.equal(getQueueStatusForPendingOffers("completed", 0), null);
});

test("getRequestStatusForTripStatus maps trip lifecycle to request lifecycle", () => {
  assert.equal(getRequestStatusForTripStatus("assigned"), "accepted");
  assert.equal(getRequestStatusForTripStatus("operator_en_route"), "accepted");
  assert.equal(getRequestStatusForTripStatus("operator_arrived"), "accepted");
  assert.equal(getRequestStatusForTripStatus("in_progress"), "in_progress");
  assert.equal(getRequestStatusForTripStatus("completed"), "completed");
  assert.equal(getRequestStatusForTripStatus("canceled"), "canceled");
});
