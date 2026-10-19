import axios from "axios";

class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

const TOKEN_KEY = "voxa_access_token";

export function getAccessToken() {
  if (typeof document === "undefined") return null;
  const entry = document.cookie
    .split("; ")
    .find((cookie) => cookie.startsWith(`${TOKEN_KEY}=`));
  if (!entry) return null;
  try {
    return decodeURIComponent(entry.slice(TOKEN_KEY.length + 1));
  } catch {
    return null;
  }
}

export function setAccessToken(token: string | null) {
  if (typeof document === "undefined") return;
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  let expiry = token ? "" : "; Max-Age=0";
  if (token) {
    try {
      const encoded = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
      const payload = JSON.parse(atob(encoded));
      if (typeof payload.exp === "number" && Number.isFinite(payload.exp)) {
        expiry = `; Max-Age=${Math.max(0, Math.floor(payload.exp - Date.now() / 1000))}`;
      }
    } catch {
      // Without a usable expiry, keep it as a browser-session cookie.
    }
  }
  document.cookie = `${TOKEN_KEY}=${token ? encodeURIComponent(token) : ""}; Path=/; SameSite=Lax${expiry}${secure}`;
}

// The origin is configured once; exported API functions supply relative endpoints.
export const API_ORIGIN = (
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"
).replace(/\/$/, "");
export const apiClient = axios.create({
  baseURL: `${API_ORIGIN}/api/v1`,
  timeout: 45000,
  headers: { "Content-Type": "application/json" },
});

apiClient.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (
    token &&
    config.url !== "/auth/login" &&
    config.url !== "/auth/register"
  ) {
    config.headers.set("Authorization", `Bearer ${token}`);
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (axios.isCancel(error)) return Promise.reject(error);
    if (!axios.isAxiosError(error)) return Promise.reject(error);
    const status = error.response?.status ?? 0;
    if (
      status === 401 &&
      typeof window !== "undefined" &&
      error.config?.url !== "/auth/login" &&
      error.config?.url !== "/auth/register" &&
      (!getAccessToken() ||
        error.config?.headers.get("Authorization") ===
          `Bearer ${getAccessToken()}`)
    ) {
      setAccessToken(null);
      window.dispatchEvent(new Event("auth-expired"));
    }
    const detail: unknown = error.response?.data?.detail;
    const validation = Array.isArray(detail)
      ? detail
          .flatMap((item) =>
            item && typeof item.msg === "string" ? [item.msg] : [],
          )
          .join(", ")
      : "";
    const fallback =
      error.code === "ECONNABORTED" || error.code === "ETIMEDOUT"
        ? "The request timed out. Please try again."
        : status === 0
          ? "Cannot connect to the server. Please try again."
          : "Something went wrong. Please try again.";
    return Promise.reject(
      new ApiError(
        typeof detail === "string" ? detail : validation || fallback,
        status,
      ),
    );
  },
);

export const message = (error: unknown) =>
  error instanceof Error ? error.message : "Something went wrong.";
