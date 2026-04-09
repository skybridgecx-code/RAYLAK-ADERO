import { Redirect, Stack } from "expo-router";
import { LoadingScreen } from "@/components/LoadingScreen";
import { useAderoAuth } from "@/lib/auth";

export default function AuthLayout() {
  const { isLoaded, isSignedIn } = useAderoAuth();

  if (!isLoaded) {
    return <LoadingScreen />;
  }

  if (isSignedIn) {
    return <Redirect href="/(main)" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
