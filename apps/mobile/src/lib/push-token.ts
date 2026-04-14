import { apiClient } from "@/lib/api";

export async function savePushToken(token: string, authToken: string): Promise<void> {
  await apiClient("me/push-token", {
    method: "POST",
    token: authToken,
    body: { expoPushToken: token },
  });
}

export async function removePushToken(authToken: string): Promise<void> {
  await apiClient("me/push-token", {
    method: "DELETE",
    token: authToken,
  });
}
