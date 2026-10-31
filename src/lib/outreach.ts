import { apiClient } from "@/utils/api-client";

export type SalesAgentInput = {
  name: string;
  sales_context: string;
  language: string;
};
export type SalesAgent = SalesAgentInput & {
  id: string;
  organization_id: string;
  created_at: string;
};
export type Campaign = {
  id: string;
  organization_id: string;
  agent_id: string;
  name: string;
  mode: "sequential" | "parallel";
  status: "draft" | "running" | "stopping" | "completed" | "cancelled";
  agent_snapshot: SalesAgentInput;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
};
export type OutreachCall = {
  id: string;
  position: number;
  phone_number: string;
  name: string;
  status:
    | "pending"
    | "dialing"
    | "unknown"
    | "queued"
    | "ringing"
    | "in-progress"
    | "completed"
    | "failed"
    | "busy"
    | "no-answer"
    | "cancelled";
  provider_call_sid: string | null;
  error: string | null;
  started_at: string | null;
  finished_at: string | null;
};
export type Contact = { phone_number: string; name: string; context: string };
const path = (org: string) =>
  `/organizations/${encodeURIComponent(org)}/outreach`;
const campaignPath = (org: string, id: string) =>
  `${path(org)}/campaigns/${encodeURIComponent(id)}`;
export const listSalesAgents = async (org: string, signal?: AbortSignal) =>
  (await apiClient.get<SalesAgent[]>(`${path(org)}/agents`, { signal })).data;
export const saveSalesAgent = async (
  org: string,
  data: SalesAgentInput,
  id?: string,
) =>
  id
    ? (
        await apiClient.put<SalesAgent>(
          `${path(org)}/agents/${encodeURIComponent(id)}`,
          data,
        )
      ).data
    : (await apiClient.post<SalesAgent>(`${path(org)}/agents`, data)).data;
export const listCampaigns = async (
  org: string,
  offset: number,
  signal?: AbortSignal,
) =>
  (
    await apiClient.get<Campaign[]>(`${path(org)}/campaigns`, {
      params: { offset, limit: 21 },
      signal,
    })
  ).data;
export const getCampaign = async (
  org: string,
  id: string,
  signal?: AbortSignal,
) => (await apiClient.get<Campaign>(campaignPath(org, id), { signal })).data;
export const listOutreachCalls = async (
  org: string,
  id: string,
  offset: number,
  signal?: AbortSignal,
) =>
  (
    await apiClient.get<OutreachCall[]>(`${campaignPath(org, id)}/calls`, {
      params: { offset, limit: 51 },
      signal,
    })
  ).data;
export async function createCampaign(
  org: string,
  data: { name: string; agent_id: string; mode: Campaign["mode"] },
  contacts: Contact[],
  file: File | null,
) {
  if (!file)
    return (
      await apiClient.post<Campaign>(`${path(org)}/campaigns`, {
        ...data,
        contacts,
      })
    ).data;
  const form = new FormData();
  Object.entries(data).forEach(([key, value]) => form.append(key, value));
  form.append("file", file);
  return (
    await apiClient.post<Campaign>(`${path(org)}/campaigns/csv`, form, {
      headers: { "Content-Type": undefined },
    })
  ).data;
}
export const campaignAction = async (
  org: string,
  id: string,
  action: "run" | "stop",
) =>
  (await apiClient.post<Campaign>(`${campaignPath(org, id)}/${action}`)).data;
export const reconcileOutreachCall = async (
  org: string,
  campaign: string,
  call: string,
  data: { provider_call_sid: string } | { confirmed_not_placed: true },
) =>
  (
    await apiClient.post<OutreachCall>(
      `${campaignPath(org, campaign)}/calls/${encodeURIComponent(call)}/reconcile`,
      data,
    )
  ).data;
export async function downloadContactsTemplate(org: string) {
  const response = await apiClient.get<Blob>(
    `${path(org)}/contacts-template.csv`,
    { responseType: "blob" },
  );
  const url = URL.createObjectURL(response.data);
  const link = document.createElement("a");
  link.href = url;
  link.download = "audiva-outreach-contacts.csv";
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
