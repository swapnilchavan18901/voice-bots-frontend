export const PRODUCT_NAME = "Sia";
// Fixed frontend policy. Deployment origins and ICE credentials stay in env.
export const API_ORIGIN = (
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"
).replace(/\/$/, "");
export const ICE_SERVERS: RTCIceServer[] = JSON.parse(
  process.env.NEXT_PUBLIC_ICE_SERVERS || "[]",
);
export const TOKEN_KEY = "sia_access_token";
export const WORKSPACE_KEY = "sia-organization";
export const THEME_KEY = "sia-theme";
export const DEFAULT_MEETING_VOICE_NAME = PRODUCT_NAME;
export const REQUEST_TIMEOUT_MS = 45_000;
export const VOICE_CONNECT_TIMEOUT_MS = 45_000;
export const MEETING_POLL_MS = 3_000;
export const MEMORY_POLL_MS = 10_000;
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
export const LEGACY_TOKEN_KEY = "voxa_access_token";
export const LEGACY_WORKSPACE_KEY = "voxa-organization";
export const LEGACY_THEME_KEY = "voxa-theme";
