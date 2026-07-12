// OAuth configuration — all values come from environment variables
// See .env.example and SETUP_GUIDE.md for where to get each key

export const OAUTH = {
  github: {
    clientId: process.env.GITHUB_CLIENT_ID || "",
    clientSecret: process.env.GITHUB_CLIENT_SECRET || "",
    scope: "read:user public_repo",
    authUrl: "https://github.com/login/oauth/authorize",
    tokenUrl: "https://github.com/login/oauth/access_token",
    apiBase: "https://api.github.com",
  },
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || "",
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    scope: "https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email",
    authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    apiBase: "https://www.googleapis.com",
  },
  linkedin: {
    clientId: process.env.LINKEDIN_CLIENT_ID || "",
    clientSecret: process.env.LINKEDIN_CLIENT_SECRET || "",
    scope: "openid profile email",
    authUrl: "https://www.linkedin.com/oauth/v2/authorization",
    tokenUrl: "https://www.linkedin.com/oauth/v2/accessToken",
    apiBase: "https://api.linkedin.com/v2",
  },
  microsoft: {
    clientId: process.env.MICROSOFT_CLIENT_ID || "",
    clientSecret: process.env.MICROSOFT_CLIENT_SECRET || "",
    tenant: process.env.MICROSOFT_TENANT_ID || "common",
    scope: "Files.Read User.Read offline_access",
    get authUrl() { return `https://login.microsoftonline.com/${this.tenant}/oauth2/v2.0/authorize`; },
    get tokenUrl() { return `https://login.microsoftonline.com/${this.tenant}/oauth2/v2.0/token`; },
    apiBase: "https://graph.microsoft.com/v1.0",
  },
};

export function getRedirectUri(provider: string) {
  let base = process.env.NEXT_PUBLIC_APP_URL;
  if (!base && process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL) {
    base = `https://${process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (!base && process.env.NEXT_PUBLIC_VERCEL_URL) {
    base = `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`;
  }
  if (!base && process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    base = `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (!base && process.env.VERCEL_URL) {
    base = `https://${process.env.VERCEL_URL}`;
  }
  if (!base) {
    base = "http://localhost:3000";
  }
  return `${base}/api/auth/${provider}/callback`;
}

export function buildAuthUrl(provider: keyof typeof OAUTH): string {
  const cfg = OAUTH[provider];
  const params = new URLSearchParams({
    client_id: cfg.clientId,
    redirect_uri: getRedirectUri(provider),
    scope: cfg.scope,
    response_type: "code",
    state: provider,
    ...(provider === "google" ? { access_type: "offline", prompt: "consent" } : {}),
  });
  return `${cfg.authUrl}?${params}`;
}

export async function exchangeCode(provider: keyof typeof OAUTH, code: string): Promise<string> {
  const cfg = OAUTH[provider];
  const body: Record<string, string> = {
    client_id: cfg.clientId,
    client_secret: cfg.clientSecret,
    code,
    redirect_uri: getRedirectUri(provider),
    grant_type: "authorization_code",
  };

  const headers: Record<string, string> = { "Content-Type": "application/x-www-form-urlencoded" };
  if (provider === "github") headers["Accept"] = "application/json";

  const r = await fetch(cfg.tokenUrl, {
    method: "POST",
    headers,
    body: new URLSearchParams(body),
  });
  const data = await r.json();
  if (data.error) throw new Error(`${provider} token error: ${data.error_description || data.error}`);
  return data.access_token;
}

// GitHub API helpers
export async function githubFetch(path: string, token: string) {
  const r = await fetch(`${OAUTH.github.apiBase}${path}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" },
  });
  if (!r.ok) throw new Error(`GitHub ${r.status}`);
  return r.json();
}

// Google Drive API helpers
export async function driveFetch(path: string, token: string) {
  const r = await fetch(`https://www.googleapis.com${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!r.ok) throw new Error(`Drive ${r.status}`);
  return r.json();
}

// LinkedIn API helpers
export async function linkedinFetch(path: string, token: string) {
  const r = await fetch(`${OAUTH.linkedin.apiBase}${path}`, {
    headers: { Authorization: `Bearer ${token}`, "X-Restli-Protocol-Version": "2.0.0" },
  });
  if (!r.ok) throw new Error(`LinkedIn ${r.status}`);
  return r.json();
}

// Microsoft Graph (OneDrive) helpers
export async function msFetch(path: string, token: string) {
  const r = await fetch(`${OAUTH.microsoft.apiBase}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!r.ok) throw new Error(`OneDrive ${r.status}`);
  return r.json();
}
