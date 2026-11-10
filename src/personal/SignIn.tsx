import { useState } from "react";
import { Platform } from "react-native";
import { sendCode, verifyCode } from "./cloud";
import { Button, Field, T } from "./ui";

/**
 * Sign in by email: a one-tap link, or the 6-digit code in the same email (the code is the
 * way to go on an iPhone Home Screen app, where links open in Safari instead).
 */
export function SignIn({
  onSignedIn,
  say,
  cta = "Email me a sign-in link",
}: {
  onSignedIn: (email: string) => void | Promise<void>;
  say: (text: string) => void;
  cta?: string;
}) {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    try {
      await action();
    } catch (e) {
      say(e instanceof Error ? e.message : "That didn’t work. Try again.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <Field
        label="Email address"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
      />
      <Button
        title={sent ? "Send a new email" : cta}
        disabled={busy || !email.trim()}
        onPress={() =>
          run(async () => {
            await sendCode(email.trim());
            setSent(true);
            say("Check your email.");
          })
        }
      />
      {sent ? (
        <>
          <T muted size={13}>
            {Platform.OS === "web"
              ? "Open the email and type the 6-digit code here, or tap the link in this same browser."
              : "Open the email on this phone and tap the link. If it shows a 6-digit code, you can type it here instead."}
          </T>
          <Field
            label="Code from the email"
            value={code}
            onChangeText={(v) => setCode(v.replace(/\D/g, "").slice(0, 8))}
            keyboardType="number-pad"
            autoComplete="one-time-code"
          />
          <Button
            title="Sign in with the code"
            quiet
            disabled={busy || code.length < 6}
            onPress={() =>
              run(async () => {
                const who = await verifyCode(email.trim(), code.trim());
                await onSignedIn(who);
              })
            }
          />
        </>
      ) : null}
    </>
  );
}
