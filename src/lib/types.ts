export type User = { id: string; email: string; name: string };
export type Organization = { id: string; name: string };
export type Member = { user_id: string; role: "owner" | "admin" | "member" };
export type Template = {
  id: string;
  slug: string;
  name: string;
  description: string;
  service_type: "conversation" | "clinic";
};
export type Bot = {
  id: string;
  organization_id: string;
  template_id: string;
  name: string;
  company_context: string;
  language: string;
};
export type ApiKey = {
  id: string;
  name: string;
  prefix: string;
  created_at: string;
  expires_at: string;
  revoked_at: string | null;
};
export type Invite = { id: string; token: string; expires_at: string };
export type Meeting = {
  id: string;
  organization_id: string;
  title: string;
  meet_url: string;
  starts_at: string;
  ends_at: string;
  timezone: string;
  agenda: string;
  status: string;
  auto_join: boolean;
};
export type CalendarEvent = {
  id: string;
  recurring_event_id: string | null;
  title: string | null;
  meet_url: string | null;
  starts_at: string | null;
  ends_at: string | null;
  cancelled: boolean;
  meeting_id: string | null;
};
export type CalendarStatus = {
  identity_ready: boolean;
  status: string;
  email: string | null;
  calendars: { id: string; last_synced_at: string | null; enabled: boolean }[];
};

export type MeetingCapabilities = {
  operator: boolean;
  manual_join_ready: boolean;
  voice_name: string;
};
export type MeetingConnection = {
  status: string;
  detail: string;
  voice_state?: "disconnected" | "listening" | "thinking" | "speaking";
  voice_error?: string | null;
  memory_status?: string;
  memory_error?: string | null;
  can_join?: boolean;
  auto_join?: boolean;
};
export type MeetingMemory = { context: string };
export type ClinicInfo = {
  today: string;
  timezone?: string;
  clinic_name?: string;
  background: string;
  booking_ready: boolean;
  hours?: string;
  lunch?: string;
  address?: string;
  phone?: string;
  fees?: string;
  parking?: string;
  booking: string;
  doctors: { id: number; name: string; specialty: string }[];
};
export type VoiceAnswer = { sdp: string; type: RTCSdpType; pc_id: string };

export type AuthResponse = {
  access_token: string;
  token_type: string;
  user: User;
};

export type ClinicPatient = {
  id: string;
  doctor_id: number;
  doctor_name: string;
  patient_name: string;
  patient_phone: string;
  start_time: string;
  reason: string | null;
  status: "booked" | "cancelled";
  visited: boolean;
};

export type BotFeature = "clinic" | "conversation";
export type FeatureData = { bots: Bot[]; templates: Template[] };
export type WorkspaceData = {
  organization: Organization;
  role: Member["role"];
  can_manage: boolean;
  can_invite_admins: boolean;
  bots: Bot[];
  templates: Template[];
  members: Member[];
  features: Record<BotFeature, FeatureData>;
};
export type ClinicRegister = {
  day: string;
  today: string;
  patients: (ClinicPatient & { can_update_visit: boolean })[];
  registered_count: number;
  visited_count: number;
};

export type TranscriptMessage = {
  id: string;
  role: "user" | "bot";
  text: string;
};
export type VoiceSession = {
  pc: RTCPeerConnection;
  stream?: MediaStream;
  pcId?: string;
  organizationId: string;
  botId: string;
  abort: AbortController;
  timer?: ReturnType<typeof setTimeout>;
};

export type ClinicDraft = {
  name: string;
  address: string;
  phone: string;
  fees: string;
  parking: string;
  booking: string;
  timezone: string;
  working_days: number[];
  open_time: string;
  close_time: string;
  lunch_start: string;
  lunch_end: string;
  slot_minutes: string;
  doctors: string;
};

export type WorkspaceContext = {
  user: User | null;
  orgs: Organization[];
  org: Organization | null;
  templates: Template[];
  bots: Bot[];
  members: Member[];
  loading: boolean;
  error: string;
  role: string;
  canManage: boolean;
  canInviteAdmins: boolean;
  features: WorkspaceData["features"];
  isOperator: boolean;
  manualJoinReady: boolean;
  meetingVoiceName: string;
  selectOrg: (id: string) => void;
  refresh: () => Promise<void>;
  notify: (text: string) => void;
  toast: string;
};

export type BotInput = Pick<Bot, "name" | "company_context" | "language">;
