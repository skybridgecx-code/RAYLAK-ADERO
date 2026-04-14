import { Link, useRouter } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, Text, TextInput, View } from "react-native";
import { useSignIn } from "@clerk/clerk-expo";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { colors, fontSize, spacing } from "@/lib/theme";

export default function SignInScreen() {
  const { isLoaded, signIn, setActive } = useSignIn();
  const router = useRouter();
  const [emailAddress, setEmailAddress] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSignIn = async () => {
    if (!isLoaded) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const result = await signIn.create({ identifier: emailAddress.trim(), password });
      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        router.replace("/(main)");
      } else {
        setError("Sign in requires additional steps.");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to sign in.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.select({ ios: "padding", android: undefined })}
      style={{ flex: 1, backgroundColor: colors.background, justifyContent: "center", padding: spacing.lg }}
    >
      <Card style={{ gap: spacing.md }}>
        <Text style={{ color: colors.text, fontSize: fontSize.xl, fontWeight: "700" }}>Sign in to Adero</Text>
        <TextInput
          value={emailAddress}
          onChangeText={setEmailAddress}
          placeholder="Email"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
          keyboardType="email-address"
          style={{
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: "rgba(255,255,255,0.03)",
            borderRadius: 12,
            color: colors.text,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.md,
          }}
        />
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="Password"
          placeholderTextColor={colors.textMuted}
          secureTextEntry
          style={{
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: "rgba(255,255,255,0.03)",
            borderRadius: 12,
            color: colors.text,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.md,
          }}
        />
        {error ? <Text style={{ color: colors.error }}>{error}</Text> : null}
        <Button title="Sign In" onPress={onSignIn} loading={isSubmitting} />
        <Text style={{ color: colors.textSecondary }}>
          New to Adero? <Link href="/(auth)/sign-up" style={{ color: colors.primary }}>Create an account</Link>
        </Text>
      </Card>
    </KeyboardAvoidingView>
  );
}
