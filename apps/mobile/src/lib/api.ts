import Constants from "expo-constants";

type ApiClientOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  token?: string | null;
};

type ApiEnvelope<T> = {
  data?: T;
  error?: string;
};

const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, unknown>;
const extraBase =
  typeof extra["API_BASE_URL"] === "string" ? extra["API_BASE_URL"] : undefined;

export const API_BASE_URL = (
  extraBase ?? process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:3001"
).replace(/\/$/, "");

export async function apiClient<T>(
  path: string,
  options?: ApiClientOptions,
): Promise<T> {
  const normalizedPath = path.replace(/^\/+/, "");
  const url = `${API_BASE_URL}/api/v1/${normalizedPath}`;

  const response = await fetch(url, {
    method: options?.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...(options?.token ? { Authorization: `Bearer ${options.token}` } : {})
    },
    body: options?.body === undefined ? undefined : JSON.stringify(options.body)
  });

  let payload: ApiEnvelope<T> | null = null;
  try {
    payload = (await response.json()) as ApiEnvelope<T>;
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const message = payload?.error ?? `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  if (!payload || !("data" in payload)) {
    throw new Error("Invalid API response.");
  }

  return payload.data as T;
}
