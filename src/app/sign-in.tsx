import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  View,
  type TextInputInstance,
} from "react-native";
import { requestSignInCode, verifySignInCode } from "@/api/generated";
import { useAuth } from "@/auth/auth-context";
import { Body, Button, Field, Heading, Notice, Screen } from "@/components/ui";
import { space } from "@/theme/tokens";

type ErrorBody = { error?: string; fieldErrors?: Record<string, string[]> };

/** Phone number, then the 6-digit SMS code. A new number gets an account. */
export default function SignInScreen() {
  const auth = useAuth();
  const [phone, setPhone] = useState("");
  const [challenge, setChallenge] = useState<{
    id: string;
    devCode?: string;
  } | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [wait, setWait] = useState(0);
  const codeInput = useRef<TextInputInstance>(null);

  useEffect(() => {
    if (wait <= 0) return;
    const timer = setTimeout(() => setWait((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [wait]);

  async function sendCode() {
    setBusy(true);
    setError(null);
    try {
      const response = await requestSignInCode({ phone });
      if (response.status !== 200) {
        const body = response.data as ErrorBody;
        const retry = Number(response.headers.get("retry-after"));
        if (retry) setWait(retry);
        setError(body.fieldErrors?.phone?.[0] ?? body.error ?? "Try again.");
        return;
      }
      setChallenge({
        id: response.data.challengeId,
        devCode: response.data.devCode,
      });
      setWait(response.data.resendAfterSeconds);
      setCode("");
      setTimeout(() => codeInput.current?.focus(), 50);
    } catch {
      setError(
        "We could not reach PitchPadi. Check your connection and try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function verify(value = code) {
    if (!challenge || value.length !== 6) return;
    setBusy(true);
    setError(null);
    try {
      const response = await verifySignInCode({
        challengeId: challenge.id,
        code: value,
        client: "app",
      });
      if (response.status !== 200 || !response.data.sessionToken) {
        setError(
          (response.data as ErrorBody).error ?? "That code did not work.",
        );
        return;
      }
      await auth.signIn(response.data.sessionToken);
      if (router.canGoBack()) router.back();
      else router.replace("/");
    } catch {
      setError(
        "We could not reach PitchPadi. Check your connection and try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Screen edges={["bottom"]}>
        {!challenge ? (
          <>
            <Heading>Sign in with your phone</Heading>
            <Body tone="muted">
              We&apos;ll text you a 6-digit code. New to PitchPadi? The same
              code creates your account.
            </Body>
            <Field
              label="Phone number"
              value={phone}
              onChangeText={(text) => {
                setPhone(text);
                setError(null);
              }}
              placeholder="0803 000 0000"
              keyboardType="phone-pad"
              textContentType="telephoneNumber"
              autoComplete="tel"
              returnKeyType="send"
              onSubmitEditing={sendCode}
              error={error}
            />
            <Button
              label={wait > 0 ? `Send code in ${wait}s` : "Send code"}
              onPress={sendCode}
              busy={busy}
              disabled={phone.trim().length < 7 || wait > 0}
            />
          </>
        ) : (
          <>
            <Heading>Enter the code</Heading>
            <Body tone="muted">We sent a 6-digit code to {phone}.</Body>
            {challenge.devCode ? (
              <Notice title={`Development code: ${challenge.devCode}`}>
                <Body tone="muted">Shown only while SMS is not connected.</Body>
              </Notice>
            ) : null}
            <Field
              ref={codeInput}
              label="6-digit code"
              value={code}
              onChangeText={(text) => {
                const digits = text.replace(/\D/g, "").slice(0, 6);
                setCode(digits);
                setError(null);
                if (digits.length === 6) verify(digits);
              }}
              keyboardType="number-pad"
              textContentType="oneTimeCode"
              autoComplete="sms-otp"
              maxLength={6}
              error={error}
              style={{ fontSize: 24, letterSpacing: 8 }}
            />
            <Button
              label="Sign in"
              onPress={() => verify()}
              busy={busy}
              disabled={code.length !== 6}
            />
            <View
              style={{ flexDirection: "row", gap: space.sm, flexWrap: "wrap" }}
            >
              <Button
                variant="ghost"
                label={
                  wait > 0 ? `Send a new code in ${wait}s` : "Send a new code"
                }
                onPress={sendCode}
                disabled={wait > 0 || busy}
              />
              <Button
                variant="ghost"
                label="Change number"
                onPress={() => {
                  setChallenge(null);
                  setError(null);
                }}
              />
            </View>
          </>
        )}
      </Screen>
    </KeyboardAvoidingView>
  );
}
