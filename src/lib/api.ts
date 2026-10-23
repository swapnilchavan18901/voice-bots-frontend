import type { BotInput } from "./types";
import { apiClient, setAccessToken } from "@/utils/api-client";
import type {
  ApiKey,
  AuthResponse,
  Bot,
  CalendarEvent,
  CalendarStatus,
  ClinicInfo,
  ClinicPatient,
  ClinicRegister,
  ClinicPhoneCapabilities,
  ClinicPhoneRoute,
  ClinicPhoneCall,
  WorkspaceData,
  Invite,
  Meeting,
  MeetingCapabilities,
  MeetingConnection,
  MeetingMemory,
  Member,
  Organization,
  User,
  VoiceAnswer,
} from "./types";

export { message } from "@/utils/api-client";

const orgPath = (orgId: string) =>
  `/organizations/${encodeURIComponent(orgId)}`;
const botPath = (orgId: string, botId: string) =>
  `${orgPath(orgId)}/bots/${encodeURIComponent(botId)}`;
const meetingPath = (orgId: string, meetingId: string) =>
  `${orgPath(orgId)}/meetings/${encodeURIComponent(meetingId)}`;

export async function login(data: { email: string; password: string }) {
  const response = (await apiClient.post<AuthResponse>("/auth/login", data))
    .data;
  setAccessToken(response.access_token);
  return response;
}
export async function register(data: {
  email: string;
  password: string;
  name: string;
}) {
  const response = (await apiClient.post<AuthResponse>("/auth/register", data))
    .data;
  setAccessToken(response.access_token);
  return response;
}
export async function logout() {
  setAccessToken(null);
}
export async function getCurrentUser() {
  return (await apiClient.get<User>("/auth/me")).data;
}
export async function listOrganizations() {
  return (await apiClient.get<Organization[]>("/organizations")).data;
}
export async function createOrganization(data: { name: string }) {
  return (await apiClient.post<Organization>("/organizations", data)).data;
}
export async function getMeetingCapabilities() {
  return (await apiClient.get<MeetingCapabilities>("/meeting-capabilities"))
    .data;
}

export async function createBot(
  orgId: string,
  data: BotInput & { template_id: string },
) {
  return (await apiClient.post<Bot>(`${orgPath(orgId)}/bots`, data)).data;
}
export async function updateBot(orgId: string, botId: string, data: BotInput) {
  return (await apiClient.put<Bot>(botPath(orgId, botId), data)).data;
}
export async function deleteBot(orgId: string, botId: string) {
  await apiClient.delete(botPath(orgId, botId));
}
export async function listApiKeys(orgId: string) {
  return (await apiClient.get<ApiKey[]>(`${orgPath(orgId)}/api-keys`)).data;
}
export async function createApiKey(
  orgId: string,
  data: { name: string; expires_in_days: number },
) {
  return (
    await apiClient.post<ApiKey & { key: string }>(
      `${orgPath(orgId)}/api-keys`,
      data,
    )
  ).data;
}
export async function revokeApiKey(orgId: string, keyId: string) {
  await apiClient.delete(
    `${orgPath(orgId)}/api-keys/${encodeURIComponent(keyId)}`,
  );
}
export async function createInvitation(
  orgId: string,
  data: { email: string; role: Member["role"] },
) {
  return (await apiClient.post<Invite>(`${orgPath(orgId)}/invitations`, data))
    .data;
}
export async function acceptInvitation(token: string) {
  await apiClient.post("/invitations/accept", { token });
}
export async function listMeetings(orgId: string, offset = 0) {
  return (
    await apiClient.get<Meeting[]>(`${orgPath(orgId)}/meetings`, {
      params: { offset },
    })
  ).data;
}
export async function getMeetingConnection(orgId: string, meetingId: string) {
  return (
    await apiClient.get<MeetingConnection>(
      `${meetingPath(orgId, meetingId)}/connection`,
    )
  ).data;
}
export async function joinMeeting(orgId: string, meetingId: string) {
  return (
    await apiClient.post<MeetingConnection>(
      `${meetingPath(orgId, meetingId)}/join`,
    )
  ).data;
}
export async function leaveMeeting(orgId: string, meetingId: string) {
  return (
    await apiClient.post<MeetingConnection>(
      `${meetingPath(orgId, meetingId)}/leave`,
    )
  ).data;
}
export async function getCalendarStatus() {
  return (await apiClient.get<CalendarStatus>("/operator/meeting-calendar"))
    .data;
}
export async function listCalendarEvents(offset = 0) {
  return (
    await apiClient.get<CalendarEvent[]>("/operator/meeting-events", {
      params: { offset },
    })
  ).data;
}
export async function listAssignableOrganizations() {
  return (
    await apiClient.get<Organization[]>("/operator/meeting-organizations")
  ).data;
}
export async function assignCalendarEvent(
  eventId: string,
  data: {
    organization_id: string;
    agenda: string;
    auto_join: boolean;
  },
) {
  return (
    await apiClient.post<Meeting>(
      `/operator/meeting-events/${encodeURIComponent(eventId)}/assign`,
      data,
    )
  ).data;
}
export async function getClinicInfo(
  orgId: string,
  botId: string,
  signal?: AbortSignal,
) {
  return (
    await apiClient.get<ClinicInfo>(`${botPath(orgId, botId)}/clinic/info`, {
      signal,
    })
  ).data;
}
export async function createVoiceSession(
  orgId: string,
  botId: string,
  data: { sdp: string; type: "offer" },
  signal?: AbortSignal,
) {
  return (
    await apiClient.post<VoiceAnswer>(
      `${botPath(orgId, botId)}/voice/offer`,
      data,
      { signal },
    )
  ).data;
}
export async function endVoiceSession(
  orgId: string,
  botId: string,
  sessionId: string,
) {
  // Preserve best-effort cleanup when navigating away from the playground.
  await apiClient.delete(
    `${botPath(orgId, botId)}/voice/${encodeURIComponent(sessionId)}`,
    {
      adapter: "fetch",
      fetchOptions: { keepalive: true },
    },
  );
}

export async function getMeetingMemory(orgId: string) {
  return (
    await apiClient.get<MeetingMemory>(`${orgPath(orgId)}/meeting-memory`)
  ).data;
}

export async function setMeetingAutoJoin(
  orgId: string,
  meetingId: string,
  autoJoin: boolean,
) {
  return (
    await apiClient.put<Meeting>(`${meetingPath(orgId, meetingId)}/schedule`, {
      auto_join: autoJoin,
    })
  ).data;
}

export async function setClinicVisit(
  orgId: string,
  botId: string,
  appointmentId: string,
  visited: boolean,
) {
  return (
    await apiClient.patch<Omit<ClinicPatient, "doctor_name">>(
      `${botPath(orgId, botId)}/clinic/appointments/${encodeURIComponent(appointmentId)}/visit`,
      { visited },
    )
  ).data;
}

export async function getWorkspace(orgId: string) {
  return (await apiClient.get<WorkspaceData>(`${orgPath(orgId)}/workspace`))
    .data;
}

export async function getClinicRegister(
  orgId: string,
  botId: string,
  day?: string,
  signal?: AbortSignal,
) {
  return (
    await apiClient.get<ClinicRegister>(
      `${botPath(orgId, botId)}/clinic/patients`,
      {
        params: { day },
        signal,
      },
    )
  ).data;
}

export async function getClinicPhoneCapabilities(orgId: string, botId: string, signal?: AbortSignal) {
  return (await apiClient.get<ClinicPhoneCapabilities>(`${botPath(orgId, botId)}/phone/capabilities`, { signal })).data;
}
export async function getClinicPhoneRoute(orgId: string, botId: string, signal?: AbortSignal) {
  try {
    return (await apiClient.get<ClinicPhoneRoute>(`${botPath(orgId, botId)}/phone/route`, { signal })).data;
  } catch (error) {
    if (error && typeof error === "object" && "status" in error && error.status === 404) return null;
    throw error;
  }
}
export async function setClinicPhoneRoute(orgId: string, botId: string, data: { phone_number: string; enabled: boolean }) {
  return (await apiClient.put<ClinicPhoneRoute>(`${botPath(orgId, botId)}/phone/route`, data)).data;
}
export async function listClinicPhoneCalls(orgId: string, botId: string, offset: number, limit: number, signal?: AbortSignal) {
  return (await apiClient.get<ClinicPhoneCall[]>(`${botPath(orgId, botId)}/phone/calls`, { params: { offset, limit }, signal })).data;
}
export async function dialClinicPhone(orgId: string, botId: string, data: { phone_number: string; request_id: string }) {
  return (await apiClient.post<ClinicPhoneCall>(`${botPath(orgId, botId)}/phone/calls`, data)).data;
}
export async function reconcileClinicPhoneCall(orgId: string, botId: string, callId: string, data: { provider_call_sid: string } | { confirmed_not_placed: true }) {
  return (await apiClient.post<ClinicPhoneCall>(`${botPath(orgId, botId)}/phone/calls/${encodeURIComponent(callId)}/reconcile`, data)).data;
}
