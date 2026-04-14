import { Redirect } from "expo-router";
import { LoadingScreen } from "@/components/LoadingScreen";
import { useAderoAuth } from "@/lib/auth";

export default function IndexScreen() {
  const { isLoaded, isSignedIn } = useAderoAuth();

  if (!isLoaded) {
    return <LoadingScreen />;
  }

  if (isSignedIn) {
    return <Redirect href="/(main)" />;
  }

  return <Redirect href="/(auth)/sign-in" />;
}
