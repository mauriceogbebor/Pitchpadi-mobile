/*
 * First-launch welcome (SV-02). Pure, so it is unit tested.
 */

export type WelcomeMode =
  /** Already seen, or opened from a shared link: straight into the app. */
  | "hidden"
  /** The floodlit clip loops behind the first choice. */
  | "video"
  /** Reduced motion: the same screen over a still frame. */
  | "still";

export function welcomeMode(input: {
  seen: boolean;
  openedFromLink: boolean;
  reducedMotion: boolean;
}): WelcomeMode {
  if (input.seen || input.openedFromLink) return "hidden";
  return input.reducedMotion ? "still" : "video";
}

/** What the player chose on the welcome screen, handed to Play. */
export type WelcomeChoice =
  { kind: "area"; slug: string } | { kind: "nearMe" } | { kind: "browse" };

type Listener = (choice: WelcomeChoice) => void;
const listeners = new Set<Listener>();

/**
 * Hand the player's welcome choice to Play, which is already open underneath
 * the welcome. Browsing all of Lagos changes nothing.
 */
export function startPlay(choice: WelcomeChoice): void {
  if (choice.kind === "browse") return;
  for (const listener of listeners) listener(choice);
}

/** Play listens while it is open; returns the function that stops listening. */
export function onStartPlay(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
