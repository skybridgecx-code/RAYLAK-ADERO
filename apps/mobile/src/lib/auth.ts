import { useAuth, useUser } from "@clerk/clerk-expo";

export function useAderoAuth() {
  const { isLoaded, isSignedIn, signOut, getToken } = useAuth();
  const { user } = useUser();

  return {
    isLoaded,
    isSignedIn,
    user,
    signOut,
    getToken: () => getToken(),
  };
}
