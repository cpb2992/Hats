/** Lets the mic button in the tab bar drive listening on the Capture screen. */
type Cmd = "start" | "stop" | "toggle";
const subs = new Set<(c: Cmd) => void>();
export const voiceBus = {
  /** When the hold was released, so a start that lands after it stops right away. */
  stoppedAt: 0,
  emit(c: Cmd) {
    if (c === "stop") voiceBus.stoppedAt = Date.now();
    subs.forEach((f) => f(c));
  },
  on(f: (c: Cmd) => void) {
    subs.add(f);
    return () => {
      subs.delete(f);
    };
  },
};
