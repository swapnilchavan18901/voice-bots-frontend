"use client";

import { useEffect, useRef, useState } from "react";
import {
  Download,
  Pencil,
  Phone,
  Play,
  Plus,
  RefreshCw,
  Square,
  TrendingUp,
  X,
} from "lucide-react";
import { languages } from "@/constants/constants";
import { message } from "@/lib/api";
import {
  campaignAction,
  createCampaign,
  downloadContactsTemplate,
  getCampaign,
  listCampaigns,
  listOutreachCalls,
  listSalesAgents,
  reconcileOutreachCall,
  saveSalesAgent,
} from "@/lib/outreach";
import type {
  Campaign,
  Contact,
  OutreachCall,
  SalesAgent,
} from "@/lib/outreach";
import { Empty, ErrorNotice, Modal, PageTitle, Spinner } from "./ui";
import { useWorkspace } from "./workspace";

function Status({ value }: { value: string }) {
  const tone =
    value === "completed"
      ? "success"
      : ["unknown", "failed", "busy", "no-answer"].includes(value)
        ? "warning"
        : "neutral";
  return (
    <span className={`phone-status ${tone}`}>
      {value === "unknown" ? "Needs review" : value.replaceAll("-", " ")}
    </span>
  );
}
function Pager({
  offset,
  size,
  more,
  busy,
  onChange,
}: {
  offset: number;
  size: number;
  more: boolean;
  busy: boolean;
  onChange: (value: number) => void;
}) {
  return (
    <div className="meeting-pagination">
      <button
        className="button secondary small"
        disabled={!offset || busy}
        onClick={() => onChange(offset - size)}
      >
        Previous
      </button>
      <span>Page {offset / size + 1}</span>
      <button
        className="button secondary small"
        disabled={!more || busy}
        onClick={() => onChange(offset + size)}
      >
        Next
      </button>
    </div>
  );
}

export function Outreach() {
  const w = useWorkspace();
  return (
    <>
      <PageTitle
        eyebrow="SALES OUTREACH"
        title="Turn conversations into opportunities"
        description="Create your sales assistant, prepare a contact list, and follow every call."
      />
      {w.org ? (
        <OutreachWorkspace key={w.org.id} orgId={w.org.id} />
      ) : (
        <Empty
          icon={<TrendingUp />}
          title="Choose a workspace"
          description="Create or select a workspace to manage sales outreach."
        />
      )}
    </>
  );
}
function OutreachWorkspace({ orgId }: { orgId: string }) {
  const w = useWorkspace();
  const [agents, setAgents] = useState<SalesAgent[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [offset, setOffset] = useState(0);
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editor, setEditor] = useState<SalesAgent | "new" | null>(null);
  const [creating, setCreating] = useState(false);
  const [selected, setSelected] = useState<Campaign | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    setLoading(true);
    const load = async () => {
      try {
        const [nextAgents, nextCampaigns] = await Promise.all([
          listSalesAgents(orgId, controller.signal),
          listCampaigns(orgId, offset, controller.signal),
        ]);
        if (!controller.signal.aborted) {
          setAgents(nextAgents);
          setCampaigns(nextCampaigns);
          setError("");
        }
      } catch (err) {
        if (!controller.signal.aborted) setError(message(err));
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
          timer = setTimeout(() => {
            void load();
          }, 5000);
        }
      }
    };
    void load();
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [orgId, offset, revision]);
  const refresh = () => setRevision((v) => v + 1);
  return (
    <>
      {!w.canManage && (
        <p className="phone-description">
          You can view sales agents and campaigns. Workspace owners and admins
          manage agents and place calls.
        </p>
      )}
      <section aria-labelledby="sales-agents-heading">
        <div className="meeting-section-heading">
          <h2 id="sales-agents-heading">Sales agents</h2>
          {w.canManage && (
            <button
              className="button secondary"
              onClick={() => setEditor("new")}
            >
              <Plus size={16} />
              New agent
            </button>
          )}
        </div>
        <div className="outreach-agent-grid">
          {agents.map((agent) => (
            <article className="phone-panel" key={agent.id}>
              <div className="outreach-row">
                <span className="phone-icon">
                  <TrendingUp size={19} />
                </span>
                <h3>{agent.name}</h3>
                {w.canManage && (
                  <button
                    className="icon-button"
                    aria-label={`Edit ${agent.name}`}
                    onClick={() => setEditor(agent)}
                  >
                    <Pencil size={16} />
                  </button>
                )}
              </div>
              <p className="phone-description outreach-excerpt">
                {agent.sales_context}
              </p>
              <span className="phone-status neutral">
                {languages.find(([code]) => code === agent.language)?.[1] ||
                  agent.language}
              </span>
            </article>
          ))}
        </div>
        {!loading && !error && !agents.length && (
          <Empty
            icon={<TrendingUp />}
            title="Your first sales assistant"
            description="Give your agent a product brief, pricing, and a clear conversation goal."
            action={
              w.canManage ? (
                <button
                  className="button primary"
                  onClick={() => setEditor("new")}
                >
                  Create sales agent
                </button>
              ) : undefined
            }
          />
        )}
      </section>
      <section
        className="outreach-campaigns"
        aria-labelledby="campaigns-heading"
      >
        <div className="meeting-section-heading">
          <div>
            <h2 id="campaigns-heading">Campaigns</h2>
            <p className="phone-description">
              Drafts only place calls when you explicitly start them. Status
              refreshes every 5 seconds.
            </p>
          </div>
          <div className="phone-actions">
            <button
              className="button secondary small"
              onClick={refresh}
              disabled={loading}
            >
              <RefreshCw size={14} />
              Refresh
            </button>
            {w.canManage && (
              <button
                className="button primary"
                disabled={!agents.length}
                onClick={() => setCreating(true)}
              >
                <Plus size={16} />
                New campaign
              </button>
            )}
          </div>
        </div>
        <ErrorNotice text={error} />
        {loading ? (
          <div className="phone-loading" role="status">
            <Spinner />
            Loading outreach…
          </div>
        ) : (
          <>
            <div className="meeting-list">
              {campaigns.slice(0, 20).map((campaign) => (
                <article className="meeting-row" key={campaign.id}>
                  <div className="phone-icon">
                    <Phone size={19} />
                  </div>
                  <div className="meeting-row-content">
                    <h3>{campaign.name}</h3>
                    <p>
                      {campaign.agent_snapshot.name} ·{" "}
                      {campaign.mode === "parallel"
                        ? "Up to 5 simultaneous calls"
                        : "One call at a time"}
                    </p>
                    <Status value={campaign.status} />
                  </div>
                  <button
                    className="button secondary small"
                    onClick={() => setSelected(campaign)}
                  >
                    View campaign
                  </button>
                </article>
              ))}
            </div>
            {!error && !campaigns.length && (
              <Empty
                icon={<Phone />}
                title="No campaigns here yet"
                description="Add contacts manually or upload a CSV, then review your draft before starting calls."
              />
            )}
            {(offset > 0 || campaigns.length > 20) && (
              <Pager
                offset={offset}
                size={20}
                more={campaigns.length > 20}
                busy={loading}
                onChange={setOffset}
              />
            )}
          </>
        )}
      </section>
      {editor && (
        <AgentEditor
          orgId={orgId}
          agent={editor === "new" ? undefined : editor}
          onClose={() => setEditor(null)}
          onSaved={() => {
            setEditor(null);
            refresh();
            w.notify("Sales agent saved");
          }}
        />
      )}
      {creating && (
        <CampaignEditor
          orgId={orgId}
          agents={agents}
          onClose={() => setCreating(false)}
          onSaved={(campaign) => {
            setCreating(false);
            setOffset(0);
            refresh();
            setSelected(campaign);
            w.notify("Campaign draft created");
          }}
        />
      )}
      {selected && (
        <CampaignDetails
          key={selected.id}
          orgId={orgId}
          initial={selected}
          canManage={w.canManage}
          onClose={() => {
            setSelected(null);
            refresh();
          }}
        />
      )}
    </>
  );
}

function AgentEditor({
  orgId,
  agent,
  onClose,
  onSaved,
}: {
  orgId: string;
  agent?: SalesAgent;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(agent?.name || "");
  const [context, setContext] = useState(agent?.sales_context || "");
  const [language, setLanguage] = useState(agent?.language || "en-IN");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await saveSalesAgent(
        orgId,
        { name: name.trim(), sales_context: context.trim(), language },
        agent?.id,
      );
      onSaved();
    } catch (err) {
      setError(message(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={agent ? "Edit sales agent" : "Create sales agent"}
      subtitle="Describe what you sell and how your assistant should help."
      onClose={() => !busy && onClose()}
    >
      <form onSubmit={save}>
        <fieldset disabled={busy} className="outreach-fields">
          <label className="field">
            Agent name
            <input
              autoFocus
              required
              maxLength={100}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Audiva product advisor"
            />
          </label>
          <label className="field">
            Conversation language
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
            >
              {languages.map(([code, label]) => (
                <option key={code} value={code}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Sales context
            <textarea
              required
              rows={9}
              maxLength={20000}
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="Company and product, benefits, pricing, common questions, and the next step you want customers to take…"
            />
          </label>
          <p className="phone-description">
            Existing campaigns keep the agent brief captured when they were
            created.
          </p>
        </fieldset>
        <ErrorNotice text={error} />
        <div className="modal-actions">
          <button
            type="button"
            className="button secondary"
            disabled={busy}
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="button primary"
            disabled={busy || !name.trim() || !context.trim()}
          >
            {busy && <Spinner />}Save agent
          </button>
        </div>
      </form>
    </Modal>
  );
}

const emptyContact = (): Contact => ({
  phone_number: "",
  name: "",
  context: "",
});
function CampaignEditor({
  orgId,
  agents,
  onClose,
  onSaved,
}: {
  orgId: string;
  agents: SalesAgent[];
  onClose: () => void;
  onSaved: (campaign: Campaign) => void;
}) {
  const [name, setName] = useState("");
  const [agent, setAgent] = useState(agents[0]?.id || "");
  const [mode, setMode] = useState<Campaign["mode"]>("sequential");
  const [source, setSource] = useState("manual");
  const [contacts, setContacts] = useState<Contact[]>([emptyContact()]);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState(false);
  function change(index: number, key: keyof Contact, value: string) {
    setContacts((rows) =>
      rows.map((row, i) => (i === index ? { ...row, [key]: value } : row)),
    );
  }
  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setError("");
    const normalized = contacts.map((row) => ({
      phone_number: row.phone_number.replace(/[\s().-]/g, ""),
      name: row.name.trim(),
      context: row.context.trim(),
    }));
    if (source === "manual") {
      if (
        normalized.some((row) => !/^\+[1-9]\d{7,14}$/.test(row.phone_number))
      ) {
        setError(
          "Every contact needs a phone number with a country code, e.g. +919876543210.",
        );
        return;
      }
      if (
        new Set(normalized.map((row) => row.phone_number)).size !==
        normalized.length
      ) {
        setError(
          "Remove duplicate phone numbers before creating this campaign.",
        );
        return;
      }
    } else if (!file || file.size > 2_000_000 || file.size === 0) {
      setError("Choose a nonempty CSV file up to 2 MB.");
      return;
    }
    setBusy(true);
    try {
      onSaved(
        await createCampaign(
          orgId,
          { name: name.trim(), agent_id: agent, mode },
          normalized,
          source === "csv" ? file : null,
        ),
      );
    } catch (err) {
      setError(message(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title="New campaign"
      subtitle="Prepare a draft. Creating it does not place any calls."
      onClose={() => !busy && onClose()}
    >
      <form onSubmit={save}>
        <fieldset disabled={busy} className="outreach-fields">
          <label className="field">
            Campaign name
            <input
              autoFocus
              required
              maxLength={100}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. October product introductions"
            />
          </label>
          <label className="field">
            Sales agent
            <select value={agent} onChange={(e) => setAgent(e.target.value)}>
              {agents.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Calling mode
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as Campaign["mode"])}
            >
              <option value="sequential">
                Sequential — one call at a time
              </option>
              <option value="parallel">
                Parallel — up to 5 calls at a time
              </option>
            </select>
          </label>
          <label className="field">
            Add contacts
            <select value={source} onChange={(e) => setSource(e.target.value)}>
              <option value="manual">Enter manually</option>
              <option value="csv">Upload CSV</option>
            </select>
          </label>
          {source === "manual" ? (
            <>
              <div className="outreach-contacts">
                {contacts.map((contact, index) => (
                  <div className="outreach-contact" key={index}>
                    <div className="outreach-row">
                      <b>Contact {index + 1}</b>
                      <button
                        type="button"
                        className="icon-button"
                        aria-label={`Remove contact ${index + 1}`}
                        disabled={contacts.length === 1}
                        onClick={() =>
                          setContacts((rows) =>
                            rows.filter((_, i) => i !== index),
                          )
                        }
                      >
                        <X size={16} />
                      </button>
                    </div>
                    <label className="field">
                      Phone number
                      <input
                        type="tel"
                        required
                        maxLength={40}
                        value={contact.phone_number}
                        placeholder="+919876543210"
                        onChange={(e) =>
                          change(index, "phone_number", e.target.value)
                        }
                      />
                    </label>
                    <label className="field">
                      Name (optional)
                      <input
                        maxLength={120}
                        value={contact.name}
                        onChange={(e) => change(index, "name", e.target.value)}
                      />
                    </label>
                    <label className="field">
                      Recipient context (optional)
                      <textarea
                        rows={2}
                        maxLength={2000}
                        value={contact.context}
                        onChange={(e) =>
                          change(index, "context", e.target.value)
                        }
                      />
                    </label>
                  </div>
                ))}
              </div>
              <button
                type="button"
                className="button secondary small"
                disabled={contacts.length >= 10000}
                onClick={() => setContacts((rows) => [...rows, emptyContact()])}
              >
                <Plus size={14} />
                Add contact
              </button>
            </>
          ) : (
            <>
              <label className="field">
                Contacts CSV
                <input
                  type="file"
                  accept=".csv,text/csv"
                  required
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
                <span className="field-hint">
                  UTF-8 CSV, up to 2 MB and 10,000 contacts. Required column:
                  phone_number. Optional: name, context.
                </span>
              </label>
              <button
                type="button"
                className="button secondary small"
                disabled={downloading}
                onClick={async () => {
                  setDownloading(true);
                  try {
                    await downloadContactsTemplate(orgId);
                  } catch (err) {
                    setError(message(err));
                  } finally {
                    setDownloading(false);
                  }
                }}
              >
                <Download size={14} />
                {downloading ? "Downloading…" : "Download CSV template"}
              </button>
            </>
          )}
        </fieldset>
        <ErrorNotice text={error} />
        <div className="modal-actions">
          <button
            type="button"
            className="button secondary"
            disabled={busy}
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="button primary"
            disabled={busy || !name.trim() || !agent}
          >
            {busy && <Spinner />}Create draft
          </button>
        </div>
      </form>
    </Modal>
  );
}

function CampaignDetails({
  orgId,
  initial,
  canManage,
  onClose,
}: {
  orgId: string;
  initial: Campaign;
  canManage: boolean;
  onClose: () => void;
}) {
  const [campaign, setCampaign] = useState(initial);
  const [calls, setCalls] = useState<OutreachCall[]>([]);
  const [offset, setOffset] = useState(0);
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<"run" | "stop" | null>(null);
  const [review, setReview] = useState<OutreachCall | null>(null);
  const [sid, setSid] = useState("");
  const [notPlaced, setNotPlaced] = useState(false);
  const mutation = useRef(false);
  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    setLoading(true);
    setCalls([]);
    const load = async () => {
      try {
        const [next, rows] = await Promise.all([
          getCampaign(orgId, initial.id, controller.signal),
          listOutreachCalls(orgId, initial.id, offset, controller.signal),
        ]);
        if (!controller.signal.aborted && !mutation.current) {
          setCampaign(next);
          setCalls(rows);
          setLoadError("");
        }
      } catch (err) {
        if (!controller.signal.aborted) setLoadError(message(err));
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
          timer = setTimeout(() => {
            void load();
          }, 5000);
        }
      }
    };
    void load();
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [orgId, initial.id, offset, revision]);
  async function act() {
    if (!confirm || mutation.current) return;
    mutation.current = true;
    setBusy(true);
    setError("");
    try {
      setCampaign(await campaignAction(orgId, campaign.id, confirm));
      setConfirm(null);
    } catch (err) {
      setError(message(err));
    } finally {
      mutation.current = false;
      setBusy(false);
      setRevision((v) => v + 1);
    }
  }
  async function reconcile(event: React.FormEvent) {
    event.preventDefault();
    if (!review || mutation.current) return;
    mutation.current = true;
    setBusy(true);
    setError("");
    try {
      await reconcileOutreachCall(
        orgId,
        campaign.id,
        review.id,
        notPlaced
          ? { confirmed_not_placed: true }
          : { provider_call_sid: sid.trim() },
      );
      setReview(null);
    } catch (err) {
      setError(message(err));
    } finally {
      mutation.current = false;
      setBusy(false);
      setRevision((v) => v + 1);
    }
  }
  return (
    <Modal
      title={campaign.name}
      subtitle={`${campaign.agent_snapshot.name} · ${campaign.mode === "parallel" ? "Up to 5 simultaneous calls" : "One call at a time"}`}
      onClose={() => !busy && onClose()}
    >
      <div className="outreach-detail">
        <div className="outreach-row">
          <Status value={campaign.status} />
          <button
            className="button secondary small"
            disabled={loading || busy}
            onClick={() => setRevision((v) => v + 1)}
          >
            <RefreshCw size={14} />
            Refresh
          </button>
        </div>
        <p className="phone-description">
          Created {new Date(campaign.created_at).toLocaleString()}
          {campaign.started_at && (
            <> · Started {new Date(campaign.started_at).toLocaleString()}</>
          )}
        </p>
        <details className="phone-connection">
          <summary>Agent brief used for this campaign</summary>
          <p className="outreach-brief">
            {campaign.agent_snapshot.sales_context}
          </p>
          <p>
            Language:{" "}
            {languages.find(
              ([code]) => code === campaign.agent_snapshot.language,
            )?.[1] || campaign.agent_snapshot.language}
          </p>
        </details>
        {campaign.status === "stopping" && (
          <p className="phone-warning">
            Pending contacts are cancelled. Reserved and active calls will
            finish before the campaign stops. Calls awaiting review may need a
            verified outcome.
          </p>
        )}
        {canManage && !confirm && !review && (
          <div className="phone-actions outreach-controls">
            {campaign.status === "draft" && (
              <button
                className="button primary"
                disabled={loading || busy || !!loadError}
                onClick={() => {
                  setError("");
                  setConfirm("run");
                }}
              >
                <Play size={14} />
                Start campaign
              </button>
            )}
            {["draft", "running"].includes(campaign.status) && (
              <button
                className="button secondary"
                disabled={loading || busy || !!loadError}
                onClick={() => {
                  setError("");
                  setConfirm("stop");
                }}
              >
                <Square size={14} />
                {campaign.status === "draft" ? "Cancel draft" : "Stop campaign"}
              </button>
            )}
          </div>
        )}
        {confirm && (
          <div className="outreach-confirm">
            <h3>
              {confirm === "run"
                ? "Start calling these contacts?"
                : "Cancel pending calls?"}
            </h3>
            <p className="phone-description">
              {confirm === "run"
                ? `This starts real phone calls using ${campaign.agent_snapshot.name}. ${campaign.mode === "parallel" ? "Up to five contacts will be called simultaneously." : "Contacts will be called one at a time."} The campaign continues when you close this page.`
                : "Pending contacts will be cancelled. Calls already reserved or active can finish."}
            </p>
            <div className="phone-actions">
              <button
                className="button secondary"
                disabled={busy}
                onClick={() => {
                  setConfirm(null);
                  setError("");
                }}
              >
                Go back
              </button>
              <button
                className="button primary"
                disabled={busy}
                onClick={() => void act()}
              >
                {busy && <Spinner />}
                {confirm === "run"
                  ? "Start phone calls"
                  : "Confirm cancellation"}
              </button>
            </div>
          </div>
        )}
        <ErrorNotice text={error} />
        <ErrorNotice text={loadError} />
        {review && (
          <form className="outreach-confirm" onSubmit={reconcile}>
            <h3>Review call to {review.phone_number}</h3>
            <p className="phone-description">
              Check Exotel, then link the verified call ID or confirm that no
              call was placed. This does not dial again.
            </p>
            <label className="field">
              Verified Exotel call ID
              <input
                value={sid}
                disabled={busy || notPlaced}
                required={!notPlaced}
                maxLength={128}
                pattern="[A-Za-z0-9_\-]+"
                onChange={(e) => setSid(e.target.value)}
              />
            </label>
            <label className="phone-checkbox">
              <input
                type="checkbox"
                checked={notPlaced}
                disabled={busy}
                onChange={(e) => setNotPlaced(e.target.checked)}
              />
              I verified in Exotel that no call was placed.
            </label>
            <div className="phone-actions">
              <button
                type="button"
                className="button secondary"
                disabled={busy}
                onClick={() => {
                  setReview(null);
                  setError("");
                }}
              >
                Cancel review
              </button>
              <button
                className="button primary"
                disabled={busy || (!notPlaced && !sid.trim())}
              >
                {busy && <Spinner />}Save verified outcome
              </button>
            </div>
          </form>
        )}
        <h3 className="outreach-call-heading">Contacts & call results</h3>
        <p className="phone-description" role="status">
          Updates every 5 seconds. Showing up to 50 contacts per page.
        </p>
        {loading ? (
          <div className="phone-loading">
            <Spinner />
            Loading calls…
          </div>
        ) : (
          <>
            <div className="outreach-calls">
              {calls.slice(0, 50).map((call) => (
                <article className="outreach-call" key={call.id}>
                  <div className="outreach-row">
                    <div>
                      <b>
                        {call.position}. {call.name || call.phone_number}
                      </b>
                      {call.name && (
                        <p className="phone-description">{call.phone_number}</p>
                      )}
                    </div>
                    <Status value={call.status} />
                  </div>
                  {call.started_at && (
                    <p className="phone-description">
                      Started {new Date(call.started_at).toLocaleString()}
                      {call.finished_at && (
                        <>
                          {" "}
                          · Finished{" "}
                          {new Date(call.finished_at).toLocaleString()}
                        </>
                      )}
                    </p>
                  )}
                  {call.error && <p className="phone-warning">{call.error}</p>}
                  {call.provider_call_sid && (
                    <p className="phone-description">
                      Exotel ID: {call.provider_call_sid}
                    </p>
                  )}
                  {call.status === "unknown" && canManage && (
                    <button
                      className="button secondary small"
                      disabled={busy || !!confirm || !!review}
                      onClick={() => {
                        setReview(call);
                        setSid("");
                        setNotPlaced(false);
                        setError("");
                      }}
                    >
                      Review call outcome
                    </button>
                  )}
                </article>
              ))}
            </div>
            {!loadError && !calls.length && (
              <p className="phone-description">No contacts on this page.</p>
            )}
            <Pager
              offset={offset}
              size={50}
              more={calls.length > 50}
              busy={loading || busy || !!confirm || !!review}
              onChange={setOffset}
            />
          </>
        )}
      </div>
    </Modal>
  );
}
