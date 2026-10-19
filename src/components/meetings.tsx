"use client";

import { useCallback, useEffect, useState } from "react";
import { CalendarDays, Inbox, RefreshCw, ArrowUpRight } from "lucide-react";
import {
  listMeetings,
  getMeetingConnection,
  joinMeeting,
  leaveMeeting,
  getCalendarStatus,
  listCalendarEvents,
  listAssignableOrganizations,
  assignCalendarEvent,
  getMeetingMemory,
  setMeetingAutoJoin,
  message,
} from "@/lib/api";
import {
  CalendarEvent,
  CalendarStatus,
  Meeting,
  Organization,
  MeetingConnection,
  MeetingMemory,
} from "@/lib/types";
import { useWorkspace } from "./workspace";
import { Empty, ErrorNotice, Modal, PageTitle, Spinner } from "./ui";

function date(value: string | null) {
  if (!value) return "No scheduled time";
  const normalized = /(?:Z|[+-]\d\d:\d\d)$/.test(value) ? value : value + "Z";
  return new Date(normalized).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}
function MeetLink({ url }: { url: string | null }) {
  if (!url || !/^https:\/\/meet\.google\.com\//.test(url)) return null;
  return (
    <a
      className="button secondary small"
      href={url}
      target="_blank"
      rel="noopener noreferrer"
    >
      Open Meet <ArrowUpRight size={14} />
    </a>
  );
}
function Pages({
  offset,
  count,
  setOffset,
}: {
  offset: number;
  count: number;
  setOffset: (n: number) => void;
}) {
  return (
    <div className="meeting-pagination">
      <button
        className="button secondary small"
        disabled={!offset}
        onClick={() => setOffset(Math.max(0, offset - 50))}
      >
        Previous
      </button>
      <span>Page {offset / 50 + 1}</span>
      <button
        className="button secondary small"
        disabled={count < 50}
        onClick={() => setOffset(offset + 50)}
      >
        Next
      </button>
    </div>
  );
}

const liveStatuses = [
  "starting",
  "joining",
  "waiting",
  "connected",
  "stopping",
];

function JoinControls({ meeting }: { meeting: Meeting }) {
  const w = useWorkspace();
  const [connection, setConnection] = useState<MeetingConnection>({
    status: "idle",
    detail: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const orgId = meeting.organization_id;
  const meetingId = meeting.id;
  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      try {
        const result = await getMeetingConnection(orgId, meetingId);
        if (active) {
          setConnection(result);
          setError("");
        }
      } catch (e) {
        if (active) setError(message(e));
      }
      if (active) timer = setTimeout(poll, 3000);
    }
    void poll();
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [orgId, meetingId]);
  async function command(action: "join" | "leave") {
    setBusy(true);
    setError("");
    try {
      setConnection(
        await (action === "join"
          ? joinMeeting(orgId, meetingId)
          : leaveMeeting(orgId, meetingId)),
      );
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  async function toggleAutoJoin() {
    setBusy(true);
    try {
      const updated = await setMeetingAutoJoin(
        orgId,
        meetingId,
        !(connection.auto_join ?? meeting.auto_join),
      );
      setConnection((previous) => ({
        ...previous,
        auto_join: updated.auto_join,
      }));
      setError("");
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  const active = liveStatuses.includes(connection.status);
  return (
    <div className="meeting-join-controls">
      {connection.memory_error && (
        <ErrorNotice text={connection.memory_error} />
      )}
      {connection.status !== "idle" && (
        <div role="status" className="meeting-connection-status">
          <b>
            {connection.status === "connected"
              ? `${w.meetingVoiceName} is in this meeting`
              : connection.status.replaceAll("_", " ")}
          </b>
          <span>{connection.detail}</span>
          {connection.voice_state &&
            connection.voice_state !== "disconnected" && (
              <span>Voice: {connection.voice_state}</span>
            )}
          {connection.voice_error && <span>{connection.voice_error}</span>}
        </div>
      )}
      {w.isOperator && (
        <button
          className={`button ${active ? "secondary" : "primary"}`}
          disabled={
            busy ||
            (!active &&
              (!w.manualJoinReady ||
                meeting.status === "cancelled" ||
                connection.can_join === false))
          }
          onClick={() => void command(active ? "leave" : "join")}
        >
          {busy && <Spinner />}
          {active ? "Stop bot" : "Connect voice agent"}
        </button>
      )}
      {w.isOperator &&
        !active &&
        meeting.status === "scheduled" &&
        new Date(meeting.ends_at) > new Date() && (
          <button
            className="button secondary small"
            disabled={busy}
            onClick={() => void toggleAutoJoin()}
          >
            Auto-join:{" "}
            {(connection.auto_join ?? meeting.auto_join) ? "on" : "off"}
          </button>
        )}
      {w.isOperator && !w.manualJoinReady && (
        <small>
          Configure Attendee and the public backend URL to enable meeting voice.
        </small>
      )}
      <ErrorNotice text={error} />
    </div>
  );
}

function Memory({ orgId }: { orgId: string }) {
  const [data, setData] = useState<MeetingMemory | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      try {
        const result = await getMeetingMemory(orgId);
        if (active) {
          setData(result);
          setError("");
        }
      } catch (e) {
        if (active) setError(message(e));
      }
      if (active) timer = setTimeout(poll, 10000);
    }
    void poll();
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [orgId]);
  return (
    <section className="meeting-banner">
      <div>
        <h3>Workspace memory · last 14 days</h3>
        <p>
          Updated automatically after meetings. Ask Sia about progress,
          decisions, or blockers.
        </p>
        <ErrorNotice text={error} />
        <p style={{ whiteSpace: "pre-wrap" }}>
          {data?.context || "No meeting memory yet."}
        </p>
      </div>
    </section>
  );
}

export function Meetings({ testGround = false }: { testGround?: boolean }) {
  const w = useWorkspace();
  const [items, setItems] = useState<Meeting[]>([]);
  const [selected, setSelected] = useState<Meeting | null>(null);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    setItems([]);
    if (!w.org) {
      setLoading(false);
      return;
    }
    listMeetings(w.org.id, offset)
      .then((data) => {
        if (active) setItems(data);
      })
      .catch((e) => {
        if (active) setError(message(e));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [w.org?.id, offset, revision]);
  return (
    <>
      <PageTitle
        eyebrow="MAKE ROOM FOR BETTER CONVERSATIONS"
        title={testGround ? "Meetings test ground" : "Meetings bot"}
        description={
          testGround
            ? "Open an assigned Google Meet and connect the bot to try a conversation. Test calls use real meetings."
            : "Meeting schedules and agendas for your workspace."
        }
        action={
          <button
            className="button secondary"
            disabled={loading}
            onClick={() => setRevision((n) => n + 1)}
          >
            <RefreshCw size={16} /> Refresh
          </button>
        }
      />
      <div className="meeting-banner">
        <CalendarDays size={22} />
        <div>
          <b>Your meeting voice assistant</b>
          <p>
            Enable auto-join for scheduled meetings, or connect now. Admit Sia
            from the host account when requested. It listens quietly until you
            address it by name, for example “Hey {w.meetingVoiceName}, what did
            we decide?”
          </p>
        </div>
      </div>
      {!testGround && w.org && <Memory key={w.org.id} orgId={w.org.id} />}
      <ErrorNotice text={error} />
      {loading ? (
        <div className="loading-state">
          <Spinner /> Loading meetings…
        </div>
      ) : (
        !error && (
          <>
            {!items.length ? (
              <Empty
                icon={<CalendarDays />}
                title="No meetings assigned yet"
                description="Your platform operator can assign calendar events to this workspace."
              />
            ) : (
              <div className="meeting-list">
                {items.map((item) => (
                  <article className="meeting-row" key={item.id}>
                    <div className="meeting-date-icon">
                      <CalendarDays size={23} />
                    </div>
                    <div className="meeting-row-content">
                      <h3>{item.title}</h3>
                      <p>
                        {date(item.starts_at)} – {date(item.ends_at)}
                      </p>
                      <span className="status-pill">
                        {item.status === "scheduled"
                          ? item.auto_join
                            ? "Scheduled · auto-join on"
                            : "Scheduled · manual join"
                          : item.status.replaceAll("_", " ")}
                      </span>
                    </div>
                    <JoinControls meeting={item} />
                    <button
                      className="button secondary"
                      onClick={() => setSelected(item)}
                    >
                      View details
                    </button>
                  </article>
                ))}
              </div>
            )}
            <Pages offset={offset} count={items.length} setOffset={setOffset} />
          </>
        )
      )}
      {selected && (
        <Modal
          title={selected.title}
          subtitle={date(selected.starts_at)}
          onClose={() => setSelected(null)}
        >
          <div className="meeting-details">
            <h3>Agenda</h3>
            <p className="meeting-agenda">
              {selected.agenda || "No agenda added yet."}
            </p>
            <MeetLink url={selected.meet_url} />
          </div>
        </Modal>
      )}
    </>
  );
}

export function CalendarInbox() {
  const w = useWorkspace();
  const [status, setStatus] = useState<CalendarStatus | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<CalendarEvent | null>(null);
  const [orgId, setOrgId] = useState("");
  const [agenda, setAgenda] = useState("");
  const [autoJoin, setAutoJoin] = useState(true);
  const [assignSeries, setAssignSeries] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => setRevision((n) => n + 1), []);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    Promise.all([
      getCalendarStatus(),
      listCalendarEvents(offset),
      listAssignableOrganizations(),
    ])
      .then(([s, e, o]) => {
        if (active) {
          setStatus(s);
          setEvents(e);
          setOrgs(o);
        }
      })
      .catch((e) => {
        if (active) setError(message(e));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [w.user?.id, offset, revision]);
  async function assign(e: React.FormEvent) {
    e.preventDefault();
    if (!selected || !orgId) return;
    setSaving(true);
    setFormError("");
    try {
      await assignCalendarEvent(selected.id, {
        organization_id: orgId,
        agenda,
        auto_join: autoJoin,
        assign_series: assignSeries,
      });
      setSelected(null);
      setOffset(0);
      refresh();
      w.notify("Meeting assigned to workspace");
    } catch (e) {
      setFormError(message(e));
    } finally {
      setSaving(false);
    }
  }
  return (
    <>
      <PageTitle
        eyebrow="YOUR CALENDAR"
        title="Calendar inbox"
        description="Your meetings are matched by organizer email. Choose from your own workspaces when needed."
        action={
          <button
            className="button secondary"
            disabled={loading}
            onClick={refresh}
          >
            <RefreshCw size={16} /> Refresh view
          </button>
        }
      />
      <ErrorNotice text={error} />
      {status && !status.identity_ready && (
        <div className="notice">
          Your calendar email needs to be linked to your account. Contact your
          platform operator to enable your private inbox.
        </div>
      )}
      {loading ? (
        <div className="loading-state">
          <Spinner /> Loading calendar…
        </div>
      ) : (
        !error && (
          <>
            <section className="meeting-connection">
              <div>
                <span
                  className={`status-pill ${status?.status === "connected" ? "green" : ""}`}
                >
                  {status?.status.replaceAll("_", " ")}
                </span>
                <h3>{status?.email || "Google account not connected"}</h3>
                <p>
                  {status?.calendars.length
                    ? `Last calendar sync: ${date(status.calendars[0].last_synced_at)}`
                    : "No calendar synced yet."}
                </p>
                {status?.status !== "connected" && (
                  <p>
                    Ask the deployment operator to reconnect the Google account.
                  </p>
                )}
              </div>
              <p>
                Only you can see your unassigned meetings and workspace choices.
                If you belong to one workspace, meetings are assigned
                automatically.
              </p>
            </section>
            <div className="meeting-section-heading">
              <h2>Unassigned meetings</h2>
              <span>Times shown in your local timezone</span>
            </div>
            {!events.length ? (
              <Empty
                icon={<Inbox />}
                title="You’re all caught up"
                description="Meetings needing a workspace choice appear here after calendar sync. Automatically assigned meetings are in your workspace’s Meetings page."
              />
            ) : (
              <div className="meeting-list">
                {events.map((item) => (
                  <article className="meeting-row" key={item.id}>
                    <div className="meeting-date-icon">
                      <CalendarDays size={23} />
                    </div>
                    <div className="meeting-row-content">
                      <h3>{item.title || "Untitled event"}</h3>
                      <p>{date(item.starts_at)}</p>
                      {!item.meet_url && (
                        <span className="status-pill">No Google Meet link</span>
                      )}
                    </div>
                    <button
                      className="button primary"
                      disabled={
                        !item.meet_url || !item.starts_at || !item.ends_at
                      }
                      onClick={() => {
                        setSelected(item);
                        setOrgId(orgs.length === 1 ? orgs[0].id : "");
                        setAgenda("");
                        setAutoJoin(true);
                        setAssignSeries(false);
                        setFormError("");
                      }}
                    >
                      Assign workspace
                    </button>
                  </article>
                ))}
              </div>
            )}
            <Pages
              offset={offset}
              count={events.length}
              setOffset={setOffset}
            />
          </>
        )
      )}
      {selected && (
        <Modal
          title="Assign meeting"
          subtitle={selected.title || "Untitled event"}
          onClose={() => !saving && setSelected(null)}
        >
          <form onSubmit={assign}>
            <p className="meeting-assignment-note">
              Workspace members will be able to see this meeting’s title,
              schedule, link, and agenda. Enable auto-join to send the assistant
              at the scheduled start time.
            </p>
            <label className="field">
              Your workspace
              <select
                required
                value={orgId}
                onChange={(e) => setOrgId(e.target.value)}
              >
                <option value="">Choose one of your workspaces</option>
                {orgs.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              Agenda (optional)
              <textarea
                rows={4}
                maxLength={20000}
                value={agenda}
                onChange={(e) => setAgenda(e.target.value)}
                placeholder="What should this meeting cover?"
              />
            </label>
            <label className="field">
              <span>
                <input
                  type="checkbox"
                  checked={autoJoin}
                  onChange={(e) => setAutoJoin(e.target.checked)}
                />{" "}
                Join automatically at the scheduled start
              </span>
            </label>
            {selected.recurring_event_id && (
              <label className="field">
                <span>
                  <input
                    type="checkbox"
                    checked={assignSeries}
                    onChange={(e) => setAssignSeries(e.target.checked)}
                  />{" "}
                  Apply to this and future occurrences of this series
                </span>
              </label>
            )}
            <ErrorNotice text={formError} />
            <div className="modal-actions">
              <button
                type="button"
                className="button secondary"
                disabled={saving}
                onClick={() => setSelected(null)}
              >
                Cancel
              </button>
              <button className="button primary" disabled={saving || !orgId}>
                {saving && <Spinner />}Assign meeting
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
