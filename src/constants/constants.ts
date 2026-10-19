// Fixed frontend policy. Deployment origins and ICE credentials stay in env.
export const API_ORIGIN = (
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"
).replace(/\/$/, "");
export const ICE_SERVERS: RTCIceServer[] = JSON.parse(
  process.env.NEXT_PUBLIC_ICE_SERVERS || "[]",
);
export const TOKEN_KEY = "voxa_access_token";
export const WORKSPACE_KEY = "voxa-organization";
export const THEME_KEY = "voxa-theme";
export const DEFAULT_MEETING_VOICE_NAME = "Sia";
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
