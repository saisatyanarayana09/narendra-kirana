// Session tracker so it only shows once per app session matching web app sessionStorage
let hasShownWelcomeSession = false;

export function getHasShownWelcomeSession(): boolean {
  return hasShownWelcomeSession;
}

export function setHasShownWelcomeSession(shown: boolean): void {
  hasShownWelcomeSession = shown;
}

export function resetWelcomeSession(): void {
  hasShownWelcomeSession = false;
}
