"use client";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  Check,
  ExternalLink,
  KeyRound,
  LockKeyhole,
  Mail,
  Plus,
  ShieldCheck,
  Terminal,
  Trash2,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useWorkspace } from "./workspace";
import {
  CopyButton,
  Empty,
  ErrorNotice,
  Modal,
  PageTitle,
  Spinner,
} from "./ui";
import {
  listApiKeys,
  createApiKey,
  revokeApiKey,
  createInvitation,
  acceptInvitation,
  message,
} from "@/lib/api";
import { API_ORIGIN } from "@/lib/api-client";
import { ApiKey, Invite, Member } from "@/lib/types";
const date = (value: string) =>
  new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

export function Keys() {
  const w = useWorkspace();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [secret, setSecret] = useState("");
  const [busy, setBusy] = useState(false);
  const [revoke, setRevoke] = useState<ApiKey | null>(null);
  const orgId = w.org?.id;
  async function load() {
    setLoading(true);
    try {
      if (!orgId) return;
      setKeys(await listApiKeys(orgId));
      setError("");
    } catch (e) {
      setError(message(e));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    if (w.canManage) void load();
    else setLoading(false);
  }, [orgId, w.canManage]); // Workspace is remounted on organization changes.
  async function create(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    try {
      if (!orgId) throw new Error("Select a workspace first.");
      const key = await createApiKey(orgId, {
        name: String(data.get("name") || ""),
        expires_in_days: Number(data.get("days")),
      });
      setSecret(key.key);
      setCreating(false);
      await load();
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    if (!revoke) return;
    setBusy(true);
    try {
      if (!orgId) throw new Error("Select a workspace first.");
      await revokeApiKey(orgId, revoke.id);
      setRevoke(null);
      await load();
      w.notify("API key revoked");
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageTitle
        eyebrow="THE CONNECTION STARTS HERE"
        title="API keys"
        description="Secure access for your website and applications."
        action={
          w.canManage && (
            <button
              className="button primary"
              onClick={() => {
                setError("");
                setCreating(true);
              }}
            >
              <Plus size={16} /> Create API key
            </button>
          )
        }
      />
      <div className="info-banner">
        <span className="stat-icon peach">
          <KeyRound size={22} />
        </span>
        <div>
          <h3>Small key. Big possibilities.</h3>
          <p>
            Keep your key on your server. Exchange it for a temporary token to
            start a voice conversation in the browser.
          </p>
        </div>
        <Link href="/integration" className="text-link">
          View guide <ArrowRight size={15} />
        </Link>
      </div>
      <ErrorNotice text={!creating && !revoke ? error : ""} />
      {!w.canManage ? (
        <Empty
          icon={<LockKeyhole />}
          title="Managed by your workspace admins"
          description="Ask an owner or admin to create an API key for your integration."
        />
      ) : loading ? (
        <div className="loading-state">
          <Spinner />
        </div>
      ) : keys.length ? (
        <div className="table-card">
          <table>
            <thead>
              <tr>
                <th>NAME</th>
                <th>KEY PREFIX</th>
                <th>STATUS</th>
                <th>EXPIRES</th>
                <th>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {keys.map((k) => {
                const active =
                  !k.revoked_at && new Date(k.expires_at) > new Date();
                return (
                  <tr key={k.id}>
                    <td>
                      <span className="table-name">
                        <KeyRound size={16} />
                        <b>{k.name}</b>
                      </span>
                      <small className="table-sub">
                        Created {date(k.created_at)}
                      </small>
                    </td>
                    <td>
                      <code>{k.prefix}••••••</code>
                    </td>
                    <td>
                      <span className={`status-pill ${active ? "green" : ""}`}>
                        {k.revoked_at
                          ? "Revoked"
                          : active
                            ? "Active"
                            : "Expired"}
                      </span>
                    </td>
                    <td>{date(k.expires_at)}</td>
                    <td>
                      {active && (
                        <button
                          className="icon-button"
                          aria-label={`Revoke ${k.name}`}
                          onClick={() => {
                            setRevoke(k);
                            setError("");
                          }}
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty
          icon={<KeyRound size={26} />}
          title="Your connection, waiting to happen"
          description="Create your first API key to connect a voice agent to your website."
          action={
            <button
              className="button primary"
              onClick={() => setCreating(true)}
            >
              <Plus size={16} /> Create API key
            </button>
          }
        />
      )}
      {creating && (
        <Modal
          title="Create an API key"
          subtitle="This key can access voice agents in this workspace."
          onClose={() => !busy && setCreating(false)}
        >
          <form onSubmit={create}>
            <label className="field">
              Key name
              <input
                name="name"
                required
                maxLength={100}
                placeholder="e.g. Production website"
                autoFocus
              />
            </label>
            <label className="field">
              Expires after
              <select name="days" defaultValue="90">
                <option value="30">30 days</option>
                <option value="90">90 days</option>
                <option value="180">180 days</option>
                <option value="365">365 days</option>
              </select>
            </label>
            <ErrorNotice text={error} />
            <div className="modal-actions">
              <button
                type="button"
                className="button secondary"
                onClick={() => setCreating(false)}
                disabled={busy}
              >
                Cancel
              </button>
              <button className="button primary" disabled={busy}>
                {busy && <Spinner />}Create key
              </button>
            </div>
          </form>
        </Modal>
      )}
      {secret && (
        <Modal
          title="Your API key is ready"
          subtitle="Copy it now. You won’t be able to see it again."
          onClose={() => setSecret("")}
        >
          <div className="secret-box">
            <code>{secret}</code>
            <CopyButton value={secret} />
          </div>
          <div className="inline-note">
            <ShieldCheck size={17} />
            <span>
              Store this key in your server’s environment variables. Never paste
              it into frontend code.
            </span>
          </div>
          <div className="modal-actions">
            <button className="button primary" onClick={() => setSecret("")}>
              <Check size={16} /> I’ve saved my key
            </button>
          </div>
        </Modal>
      )}
      {revoke && (
        <Modal
          title="Revoke this API key?"
          subtitle={`New requests using “${revoke.name}” will be rejected.`}
          onClose={() => !busy && setRevoke(null)}
        >
          <p className="muted">
            Existing media calls may continue until they disconnect or reach the
            session limit.
          </p>
          <ErrorNotice text={error} />
          <div className="modal-actions">
            <button
              className="button secondary"
              disabled={busy}
              onClick={() => setRevoke(null)}
            >
              Keep key
            </button>
            <button className="button danger" disabled={busy} onClick={remove}>
              {busy && <Spinner />}Revoke key
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
export function Team() {
  const w = useWorkspace();
  const [inviting, setInviting] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [invite, setInvite] = useState<Invite | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function send(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    try {
      if (!w.org) throw new Error("Select a workspace first.");
      setInvite(
        await createInvitation(w.org.id, {
          email: String(data.get("email") || ""),
          role: String(data.get("role")) as Member["role"],
        }),
      );
      setInviting(false);
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  async function accept(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    try {
      await acceptInvitation(String(data.get("token")).trim());
      setAccepting(false);
      await w.refresh();
      w.notify("Invitation accepted. Switch workspaces to explore.");
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageTitle
        eyebrow="BETTER, TOGETHER"
        title="Your team"
        description="The people behind every great conversation."
        action={
          <div className="button-group">
            <button
              className="button secondary"
              onClick={() => {
                setAccepting(true);
                setError("");
              }}
            >
              Join a workspace
            </button>
            {w.canManage && (
              <button
                className="button primary"
                onClick={() => {
                  setInviting(true);
                  setError("");
                }}
              >
                <Plus size={16} /> Invite member
              </button>
            )}
          </div>
        }
      />
      <div className="section-head">
        <div>
          <h2>
            Workspace members{" "}
            <span className="count-badge">{w.members.length}</span>
          </h2>
          <p>Access to {w.org?.name}’s agents and resources.</p>
        </div>
      </div>
      <div className="table-card">
        <table>
          <thead>
            <tr>
              <th>MEMBER</th>
              <th>ROLE</th>
              <th>ACCESS</th>
            </tr>
          </thead>
          <tbody>
            {w.members.map((member) => (
              <tr key={member.user_id}>
                <td>
                  <div className="member-cell">
                    <span className="avatar">
                      {member.user_id === w.user?.id ? (
                        w.user.name.slice(0, 2).toUpperCase()
                      ) : (
                        <Users size={17} />
                      )}
                    </span>
                    <span>
                      <b>
                        {member.user_id === w.user?.id
                          ? w.user.name
                          : "Workspace member"}{" "}
                        {member.user_id === w.user?.id && (
                          <span className="you-tag">you</span>
                        )}
                      </b>
                      <small>
                        {member.user_id === w.user?.id
                          ? w.user.email
                          : member.user_id}
                      </small>
                    </span>
                  </div>
                </td>
                <td>
                  <span className="pill neutral capitalize">{member.role}</span>
                </td>
                <td>
                  {member.role === "member"
                    ? "View and test agents"
                    : "Manage workspace resources"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="role-cards">
        <div>
          <ShieldCheck size={20} />
          <h3>Owners & admins</h3>
          <p>
            Manage agents, API keys, and member invitations. Owners can also
            invite admins.
          </p>
        </div>
        <div>
          <Users size={20} />
          <h3>Members</h3>
          <p>
            View the workspace and test its agents. No access to API-key
            management.
          </p>
        </div>
      </div>
      {inviting && (
        <Modal
          title="Bring someone on board"
          subtitle="Invite a colleague to this workspace."
          onClose={() => !busy && setInviting(false)}
        >
          <form onSubmit={send}>
            <label className="field">
              Email address
              <input
                name="email"
                type="email"
                required
                placeholder="colleague@company.com"
                autoFocus
              />
            </label>
            <label className="field">
              Workspace role
              <select name="role">
                <option value="member">Member — view and test agents</option>
                {w.canInviteAdmins && (
                  <option value="admin">Admin — manage agents and keys</option>
                )}
              </select>
            </label>
            <div className="inline-note">
              <Mail size={16} />
              <span>
                You’ll receive an invitation token to share privately. Email
                delivery is not connected yet.
              </span>
            </div>
            <ErrorNotice text={error} />
            <div className="modal-actions">
              <button className="button primary" disabled={busy}>
                {busy && <Spinner />}Create invitation
              </button>
            </div>
          </form>
        </Modal>
      )}
      {invite && (
        <Modal
          title="Invitation ready"
          subtitle={`Share this token privately. It expires ${date(invite.expires_at)}.`}
          onClose={() => setInvite(null)}
        >
          <div className="secret-box">
            <code>{invite.token}</code>
            <CopyButton value={invite.token} />
          </div>
          <p className="muted">
            Your colleague should sign in using the invited email, open Team
            members, and choose “Join a workspace”.
          </p>
          <div className="modal-actions">
            <button className="button primary" onClick={() => setInvite(null)}>
              Done
            </button>
          </div>
        </Modal>
      )}
      {accepting && (
        <Modal
          title="Join another workspace"
          subtitle="Use the invitation token shared by your workspace admin."
          onClose={() => !busy && setAccepting(false)}
        >
          <form onSubmit={accept}>
            <label className="field">
              Invitation token
              <input
                name="token"
                required
                minLength={20}
                maxLength={200}
                placeholder="Paste your invitation token"
                autoFocus
              />
            </label>
            <p className="muted">
              You must be signed in with the email address the invitation was
              sent to.
            </p>
            <ErrorNotice text={error} />
            <div className="modal-actions">
              <button className="button primary" disabled={busy}>
                {busy && <Spinner />}Accept invitation
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
export function Integration() {
  const w = useWorkspace();
  const [selected, setSelected] = useState(w.bots[0]?.id || "");
  const platform = API_ORIGIN;
  const bot = w.bots.find((b) => b.id === selected);
  const tokenCode = `// Run on YOUR server. Never expose this key to the browser.\nconst response = await fetch(\n  "${platform}/api/v1/public/bots/${selected || "YOUR_BOT_ID"}/session-token",\n  {\n    method: "POST",\n    headers: { "X-API-Key": process.env.VOXA_API_KEY }\n  }\n);\nif (!response.ok) throw new Error("Token request failed");\nconst { token } = await response.json();\n// Return { token } from your own authenticated/rate-limited endpoint.`;
  const browserCode = `// Browser: exchange a full SDP offer for an answer.\n// First get a short-lived token from YOUR server.\nconst response = await fetch(\n  "${platform}/api/v1/public/bots/${selected || "YOUR_BOT_ID"}/webrtc/offer",\n  {\n    method: "POST",\n    headers: {\n      "Authorization": \`Bearer \${token}\`,\n      "Content-Type": "application/json"\n    },\n    body: JSON.stringify(pc.localDescription)\n  }\n);\nif (!response.ok) throw new Error("WebRTC negotiation failed");\nconst { sdp, type, pc_id } = await response.json();\nawait pc.setRemoteDescription({ sdp, type });`;
  return (
    <>
      <PageTitle
        eyebrow="FROM YOUR STUDIO TO YOUR SITE"
        title="Let’s get connected"
        description="Bring real-time conversations to the places your customers already are."
      />
      <div className="integration-flow">
        <div>
          <span>01</span>
          <b>Your server</b>
          <small>Permanent API key</small>
        </div>
        <ArrowRight />
        <div>
          <span>02</span>
          <b>Voice token</b>
          <small>One call · 5-minute start window</small>
        </div>
        <ArrowRight />
        <div>
          <span>03</span>
          <b>Your website</b>
          <small>Live WebRTC conversation</small>
        </div>
      </div>
      <div className="integration-selector">
        <label className="field">
          Choose your agent
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
          >
            {!w.bots.length && <option value="">Create an agent first</option>}
            {w.bots.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </label>
        {bot && (
          <div className="bot-id-display">
            <span>BOT ID</span>
            <code>{bot.id}</code>
            <CopyButton value={bot.id} />
          </div>
        )}
      </div>
      <div className="guide-step">
        <div className="step-heading">
          <span className="step-number">1</span>
          <div>
            <h2>Create a server-side API key</h2>
            <p>
              Store it in your server environment as <code>VOXA_API_KEY</code>.
            </p>
          </div>
          <Link className="button secondary small" href="/api-keys">
            Manage keys <ArrowRight size={14} />
          </Link>
        </div>
      </div>
      <div className="guide-step">
        <div className="step-heading">
          <span className="step-number">2</span>
          <div>
            <h2>Request a voice token</h2>
            <p>
              Your server exchanges its API key for a token bound to this agent.
            </p>
          </div>
        </div>
        <CodeBlock title="Server · JavaScript" code={tokenCode} />
      </div>
      <div className="guide-step">
        <div className="step-heading">
          <span className="step-number">3</span>
          <div>
            <h2>Connect the browser</h2>
            <p>
              Add a microphone track and control data channel, then wait for ICE
              gathering to finish.
            </p>
          </div>
        </div>
        <CodeBlock title="Browser · WebRTC signaling" code={browserCode} />
      </div>
      <div className="inline-note">
        <LockKeyhole size={17} />
        <span>
          Use HTTPS for microphone access. Configure TURN for production
          networks. A voice token can start only one call; request a new token
          when retrying. Complete microphone setup is shown in the backend’s{" "}
          <code>examples/embed.js</code>.
        </span>
      </div>
      <a
        className="button secondary docs-link"
        href={`${platform}/api/v1/public/docs`}
        target="_blank"
        rel="noreferrer"
      >
        Open public API reference <ExternalLink size={15} />
      </a>
    </>
  );
}
function CodeBlock({ title, code }: { title: string; code: string }) {
  return (
    <div className="code-block">
      <div>
        <span>
          <Terminal size={14} />
          {title}
        </span>
        <CopyButton value={code} />
      </div>
      <pre>
        <code>{code}</code>
      </pre>
    </div>
  );
}
