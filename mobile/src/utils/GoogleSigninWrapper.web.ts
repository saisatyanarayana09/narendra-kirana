let webClientId =
  "729937153109-6e8fivp20b3ri2qsah1d6u2a7oi0uls6.apps.googleusercontent.com";

const GSI_SCRIPT_URL = "https://accounts.google.com/gsi/client";

let gsiLoadPromise: Promise<void> | null = null;

function loadGsiScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if ((window as any).google?.accounts) return Promise.resolve();
  if (gsiLoadPromise) return gsiLoadPromise;

  gsiLoadPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector(`script[src="${GSI_SCRIPT_URL}"]`);
    if (existing) {
      if ((window as any).google?.accounts) {
        resolve();
      } else {
        existing.addEventListener("load", () => resolve());
        existing.addEventListener("error", () =>
          reject(new Error("Failed to load Google Identity Services.")),
        );
      }
      return;
    }

    const script = document.createElement("script");
    script.src = GSI_SCRIPT_URL;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => {
      gsiLoadPromise = null;
      reject(new Error("Failed to load Google Identity Services from CDN."));
    };
    document.head.appendChild(script);
  });

  return gsiLoadPromise;
}

export const GoogleSignin = {
  configure: (config: { webClientId?: string }) => {
    if (config?.webClientId) {
      webClientId = config.webClientId;
    }
  },

  hasPlayServices: async () => true,

  signIn: async (): Promise<{
    data: { idToken: string; tokenType: string };
    idToken: string;
    tokenType: string;
  }> => {
    await loadGsiScript();

    const google = (window as any).google;
    if (!google?.accounts) {
      throw new Error("Google Identity Services SDK is not available.");
    }

    return new Promise((resolve, reject) => {
      try {
        const tokenClient = google.accounts.oauth2.initTokenClient({
          client_id: webClientId,
          scope: "openid email profile",
          callback: (response: any) => {
            if (response?.error) {
              if (
                response.error === "popup_closed_by_user" ||
                response.error === "access_denied"
              ) {
                const cancelErr: any = new Error("Sign in cancelled");
                cancelErr.code = "SIGN_IN_CANCELLED";
                reject(cancelErr);
              } else {
                reject(new Error(response.error_description || response.error));
              }
              return;
            }

            if (response?.access_token) {
              resolve({
                data: {
                  idToken: response.access_token,
                  tokenType: "access_token",
                },
                idToken: response.access_token,
                tokenType: "access_token",
              });
            } else {
              reject(new Error("No access token returned from Google Sign-In"));
            }
          },
          error_callback: (err: any) => {
            if (err?.type === "popup_closed") {
              const cancelErr: any = new Error("Sign in cancelled");
              cancelErr.code = "SIGN_IN_CANCELLED";
              reject(cancelErr);
            } else {
              reject(new Error(err?.message || "Google Sign-In popup error"));
            }
          },
        });

        tokenClient.requestAccessToken({ prompt: "" });
      } catch (clientErr) {
        reject(clientErr);
      }
    });
  },

  signOut: async () => {
    try {
      const google =
        typeof window !== "undefined" ? (window as any).google : null;
      if (google?.accounts?.id?.disableAutoSelect) {
        google.accounts.id.disableAutoSelect();
      }
    } catch {}
  },
};

export default GoogleSignin;
