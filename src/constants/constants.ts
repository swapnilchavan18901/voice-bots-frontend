export const PRODUCT_NAME = "Audiva";
// Fixed frontend policy. Deployment origins stay in env.
export const API_ORIGIN = (
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"
).replace(/\/$/, "");
export const TOKEN_KEY = "audiva_access_token";
export const WORKSPACE_KEY = "audiva-organization";
export const THEME_KEY = "audiva-theme";
export const DEFAULT_MEETING_VOICE_NAME = PRODUCT_NAME;
export const REQUEST_TIMEOUT_MS = 45_000;
export const VOICE_CONNECT_TIMEOUT_MS = 45_000;
export const MEETING_POLL_MS = 3_000;
export const MEMORY_POLL_MS = 10_000;
export const CLINIC_PHONE_POLL_MS = 5_000;
export const CLINIC_PHONE_PAGE_SIZE = 20;
export const TOAST_DURATION_MS = 4_000;
export const LIVE_MEETING_STATUSES = [
  "starting",
  "joining",
  "waiting",
  "connected",
  "stopping",
];
export const languages = [
  ["en-IN", "English"],
  ["hi-IN", "Hindi"],
  ["mr-IN", "Marathi"],
  ["ta-IN", "Tamil"],
  ["te-IN", "Telugu"],
  ["bn-IN", "Bengali"],
  ["gu-IN", "Gujarati"],
  ["kn-IN", "Kannada"],
  ["ml-IN", "Malayalam"],
  ["od-IN", "Odia"],
  ["pa-IN", "Punjabi"],
];

// Read existing browser state during the product rename.
export const LEGACY_TOKEN_KEYS = ["sia_access_token", "voxa_access_token"] as const;
export const LEGACY_WORKSPACE_KEYS = ["sia-organization", "voxa-organization"] as const;
export const LEGACY_THEME_KEYS = ["sia-theme", "voxa-theme"] as const;
