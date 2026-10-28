import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { emailLinkPending, finishEmailLink } from "../personal/cloud";
import { Hat } from "../personal/Hat";
import { usePersonal } from "../personal/Store";
import { Button, Page, Panel, T } from "../personal/ui";

type State = "working" | "done" | "error" | "idle";

export default function AuthCallback() {
  const params = useLocalSearchParams<{
    code?: string;
    error_description?: string;
  }>();
  const { sync } = usePersonal();
  const [state, setState] = useState<State>("working");
  const started = useRef(false);
  const [detail, setDetail] = useState("");
  const code = typeof params.code === "string" ? params.code : "";
  const failure =
    typeof params.error_description === "string"
      ? params.error_description
      : "";
  useEffect(() => {
    // A sign-in link is single-use: redeem it once per screen.
    if (started.current) return;
    started.current = true;
    const finish = async () => {
      if (failure) throw new Error(failure.replace(/\+/g, " "));
      // Google sign-in finishes inside its own browser session; only an
      // emailed link from this phone is redeemed here.
      if (!code || !(await emailLinkPending())) return "idle" as const;
      const email = await finishEmailLink(code);
      await sync();
      return email;
    };
    finish()
      .then((result) => {
        if (result === "idle") setState("idle");
        else {
          setDetail(result);
          setState("done");
        }
      })
      .catch((e) => {
        setDetail(
          e instanceof Error
            ? e.message
            : "The link didn’t work. Send a new one from Settings.",
        );
        setState("error");
      });
  }, [code, failure, sync]);
  return (
    <Page tabs={false}>
      <Hat id={state === "error" ? "hardhat" : "cap"} size={84} wobble />
      <Panel>
        <T size={24} display>
          {state === "working"
            ? "Signing you in…"
            : state === "done"
              ? "You’re signed in."
              : state === "error"
                ? "That sign-in didn’t finish."
                : "Back to your private life."}
        </T>
        <T muted>
          {state === "working"
            ? "One moment while Hats checks the link."
            : state === "done"
              ? `Signed in as ${detail}. Your plan is syncing privately.`
              : state === "error"
                ? `${detail} Your plan on this phone hasn’t changed.`
                : "Return to Settings to check your connection. Your personal plan has not been changed."}
        </T>
        {state !== "working" ? (
          <Button
            title="Back to Settings"
            hat="hardhat"
            onPress={() => router.replace("/settings")}
          />
        ) : null}
      </Panel>
    </Page>
  );
}
