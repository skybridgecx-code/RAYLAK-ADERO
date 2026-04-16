#!/usr/bin/env bash
set -euo pipefail

# Post-deploy smoke checks for a live Adero deployment.
# Do not run this with secrets pasted into chat, tickets, or shared logs.

pass() {
  echo "PASS: $1"
}

fail() {
  echo "FAIL: $1" >&2
  exit 1
}

require_env() {
  local name="$1"
  local value="${!name:-}"
  if [[ -z "$value" ]]; then
    fail "Missing required environment variable: $name"
  fi
}

http_status() {
  local url="$1"
  shift
  local status
  if ! status="$(curl -sS -o /dev/null -w "%{http_code}" "$@" "$url")"; then
    fail "Request failed for $url"
  fi
  printf "%s" "$status"
}

is_safe_denial_status() {
  local status="$1"
  case "$status" in
    401|403|404|405|429) return 0 ;;
    *) return 1 ;;
  esac
}

require_env "ADERO_DEPLOYED_BASE_URL"
require_env "ADERO_ADMIN_SECRET"
require_env "ADERO_CRON_SECRET"

if [[ "$ADERO_ADMIN_SECRET" == "$ADERO_CRON_SECRET" ]]; then
  fail "ADERO_ADMIN_SECRET and ADERO_CRON_SECRET must be different"
fi

BASE_URL="${ADERO_DEPLOYED_BASE_URL%/}"
if [[ -z "$BASE_URL" ]]; then
  fail "ADERO_DEPLOYED_BASE_URL resolves to an empty value"
fi

HOMEPAGE_URL="$BASE_URL/"
ADMIN_LOGIN_URL="$BASE_URL/admin/login"
CRON_URL="$BASE_URL/api/cron/payment-lifecycle"

status="$(http_status "$HOMEPAGE_URL")"
if [[ "$status" == "200" ]]; then
  pass "Homepage returned HTTP 200"
else
  fail "Homepage check expected HTTP 200, got HTTP $status"
fi

status="$(http_status "$ADMIN_LOGIN_URL")"
if (( status >= 200 && status < 400 )); then
  pass "Admin login endpoint returned acceptable status HTTP $status"
else
  fail "Admin login check expected HTTP 2xx/3xx, got HTTP $status"
fi

status="$(http_status "$CRON_URL")"
if is_safe_denial_status "$status"; then
  pass "Cron endpoint without x-cron-secret was denied with HTTP $status"
else
  fail "Cron endpoint without x-cron-secret expected safe denial (401/403/404/405/429), got HTTP $status"
fi

WRONG_CRON_SECRET="invalid-smoke-secret"
if [[ "$WRONG_CRON_SECRET" == "$ADERO_CRON_SECRET" ]]; then
  WRONG_CRON_SECRET="invalid-smoke-secret-$(date +%s)"
fi

status="$(http_status "$CRON_URL" -H "x-cron-secret: $WRONG_CRON_SECRET")"
if is_safe_denial_status "$status"; then
  pass "Cron endpoint with wrong x-cron-secret was denied with HTTP $status"
else
  fail "Cron endpoint with wrong x-cron-secret expected safe denial (401/403/404/405/429), got HTTP $status"
fi

status="$(http_status "$CRON_URL" -H "x-cron-secret: $ADERO_CRON_SECRET")"
if (( status >= 200 && status < 300 )); then
  pass "Cron endpoint with correct x-cron-secret returned success HTTP $status"
elif [[ "$status" == "429" ]]; then
  pass "Cron endpoint with correct x-cron-secret returned safe application response HTTP 429 (rate limited)"
else
  fail "Cron endpoint with correct x-cron-secret expected HTTP 2xx (or 429), got HTTP $status"
fi

pass "Adero deployed smoke checks completed"
