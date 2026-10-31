import { Meetings, CalendarInbox } from "@/components/meetings";
import { notFound } from "next/navigation";
import { Agents, Templates } from "@/components/agents";
import { Team, Keys, Integration } from "@/components/settings";
import { Patients } from "@/components/patients";
import { Playground } from "@/components/playground";
import { Outreach } from "@/components/outreach";
import { ClinicPhone } from "@/components/clinic-phone";
export default async function Page({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  const pages: Record<string, React.ReactNode> = {
    agents: <Agents />,
    outreach: <Outreach />,
    clinic: <Agents feature="clinic" />,
    patients: <Patients />,
    "clinic-phone": <ClinicPhone />,
    "clinic-preview": <Playground feature="clinic" />,
    "clinic-test-ground": <Playground feature="clinic" />,
    "meeting-preview": <Meetings testGround />,
    "meeting-test-ground": <Meetings testGround />,
    meetings: <Meetings />,
    "calendar-inbox": <CalendarInbox />,
    templates: <Templates />,
    "voice-preview": <Playground />,
    playground: <Playground />,
    team: <Team />,
    "api-keys": <Keys />,
    integration: <Integration />,
  };
  return pages[section] ?? notFound();
}
