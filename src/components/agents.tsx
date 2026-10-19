"use client";
import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  AudioLines,
  Check,
  Layers3,
  LockKeyhole,
  Mic,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { useWorkspace } from "./workspace";
import {
  ClinicContextFields,
  readClinicContext,
  saveClinicContext,
} from "./clinic-context";
import {
  CopyButton,
  Empty,
  ErrorNotice,
  Modal,
  PageTitle,
  Spinner,
  TemplateIcon,
} from "./ui";
import { Bot, languages, Template } from "@/lib/types";
import { createBot, updateBot, deleteBot, message } from "@/lib/api";

function kind(template?: Template) {
  return template?.service_type === "clinic"
    ? "clinic"
    : template?.slug.includes("sales")
      ? "sales"
      : "general";
}
function BotEditor({
  bot,
  template,
  onClose,
  feature,
}: {
  feature?: "clinic" | "conversation";
  bot?: Bot;
  template?: Template;
  onClose: () => void;
}) {
  const w = useWorkspace();
  const availableTemplates = feature
    ? w.features[feature].templates
    : w.templates;
  const [selected, setSelected] = useState(
    template?.id || bot?.template_id || availableTemplates[0]?.id || "",
  );
  const [name, setName] = useState(bot?.name || "");
  const isClinic =
    feature === "clinic" ||
    (template || w.templates.find((t) => t.id === selected))?.service_type ===
      "clinic";
  const initialClinic = isClinic
    ? readClinicContext(bot?.company_context || "")
    : {
        background: bot?.company_context || "",
        clinic: readClinicContext("").clinic,
      };
  const [context, setContext] = useState(initialClinic.background);
  const [clinicDraft, setClinicDraft] = useState(initialClinic.clinic);
  const [language, setLanguage] = useState(bot?.language || "en-IN");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (!w.org) throw new Error("Select a workspace first.");
      const data = {
        name: name.trim(),
        company_context: isClinic
          ? saveClinicContext(context, clinicDraft)
          : context,
        language,
      };
      if (bot) await updateBot(w.org.id, bot.id, data);
      else await createBot(w.org.id, { ...data, template_id: selected });
      await w.refresh();
      w.notify(bot ? "Agent updated" : "Your agent is ready to test");
      onClose();
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={bot ? "Make it your own" : "Create your voice agent"}
      subtitle="Start with our expertise. Add what makes your business different."
      onClose={() => !busy && onClose()}
    >
      <form onSubmit={save}>
        {!bot && (
          <label className="field">
            Choose a template
            <select
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              required
            >
              {availableTemplates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <div className="form-grid">
          <label className="field">
            Agent name
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={100}
              placeholder="e.g. Acme appointment assistant"
            />
          </label>
          <label className="field">
            Conversation language
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
            >
              {languages.map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="field">
          Company context{" "}
          <span className="field-hint">
            Tell your agent about your business, services, hours, and FAQs.
          </span>
          <textarea
            rows={8}
            maxLength={20000}
            value={context}
            onChange={(e) => setContext(e.target.value)}
            placeholder={
              "About us\nWe are Acme Clinic, based in Pune.\n\nOur services\nGeneral consultations and dental checkups.\n\nHours\nMonday–Saturday, 9 AM–6 PM."
            }
          />
          <span className="character-count">
            {context.length.toLocaleString()} / 20,000
          </span>
        </label>
        {isClinic && (
          <ClinicContextFields value={clinicDraft} onChange={setClinicDraft} />
        )}
        <div className="inline-note">
          <LockKeyhole size={15} />
          <span>
            Our base instructions stay in place. Your context makes the
            conversation specific to your company.
          </span>
        </div>
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
            disabled={busy || !selected || !name.trim()}
          >
            {busy ? <Spinner /> : <Check size={16} />}{" "}
            {bot ? "Save changes" : "Create agent"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
export function Agents({
  feature = "conversation",
}: {
  feature?: "clinic" | "conversation";
}) {
  const w = useWorkspace();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Bot | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<Bot | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const bots = w.features[feature].bots;
  const filtered = bots.filter((b) =>
    b.name.toLowerCase().includes(search.toLowerCase()),
  );
  async function remove() {
    if (!deleting) return;
    setBusy(true);
    setError("");
    try {
      if (!w.org) throw new Error("Select a workspace first.");
      await deleteBot(w.org.id, deleting.id);
      setDeleting(null);
      await w.refresh();
      w.notify("Agent deleted");
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageTitle
        eyebrow="YOUR VOICE, AT WORK"
        title={feature === "clinic" ? "Clinic bot" : "Other agents"}
        description={
          feature === "clinic"
            ? "Set up your clinic assistant, track patients, and test a call."
            : "Set up and test your other voice assistants."
        }
        action={
          w.canManage && (
            <button
              className="button primary"
              onClick={() => setCreating(true)}
            >
              <Plus size={17} />{" "}
              {feature === "clinic" ? "Set up clinic bot" : "Create agent"}
            </button>
          )
        }
      />
      <section className="agents-section">
        <div className="section-head">
          <div>
            <h2>
              Your agents <span className="count-badge">{bots.length}</span>
            </h2>
            <p>Personalized for your business. Ready for a conversation.</p>
          </div>
          <div className="search-box">
            <Search size={16} />
            <input
              aria-label="Search agents"
              placeholder="Search agents…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button aria-label="Clear search" onClick={() => setSearch("")}>
                <X size={14} />
              </button>
            )}
          </div>
        </div>
        {filtered.length ? (
          <div className="agent-grid">
            {filtered.map((bot) => {
              const template = w.templates.find(
                (t) => t.id === bot.template_id,
              );
              return (
                <article className="agent-card" key={bot.id}>
                  <div className="card-top">
                    <span className={`template-icon ${kind(template)}`}>
                      <TemplateIcon slug={template?.slug} />
                    </span>
                    <span className="pill neutral">
                      {languages.find((l) => l[0] === bot.language)?.[1] ||
                        bot.language}
                    </span>
                  </div>
                  <h3>{bot.name}</h3>
                  <span className="card-template">
                    {template?.name || "Unavailable template"}
                  </span>
                  <p className="agent-context">
                    {readClinicContext(bot.company_context).background ||
                      readClinicContext(bot.company_context).clinic.name ||
                      "Add your company details to make this agent feel like part of your team."}
                  </p>
                  <div className="agent-id">
                    <code>
                      {bot.id.slice(0, 8)}…{bot.id.slice(-4)}
                    </code>
                    <CopyButton value={bot.id} label="Copy ID" />
                  </div>
                  <div className="card-bottom">
                    <Link
                      href={`${feature === "clinic" ? "/clinic-test-ground" : "/playground"}?bot=${bot.id}`}
                      className="text-link"
                    >
                      <Mic size={15} /> Test agent <ArrowRight size={14} />
                    </Link>
                    {w.canManage && (
                      <div className="card-tools">
                        <button
                          className="icon-button"
                          aria-label={`Edit ${bot.name}`}
                          onClick={() => setEditing(bot)}
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          className="icon-button"
                          aria-label={`Delete ${bot.name}`}
                          onClick={() => {
                            setDeleting(bot);
                            setError("");
                          }}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
            {w.canManage && (
              <button className="add-card" onClick={() => setCreating(true)}>
                <span>
                  <Plus size={23} />
                </span>
                <b>
                  {feature === "clinic"
                    ? "Add a clinic assistant"
                    : "Add an agent"}
                </b>
                <small>Add your business details</small>
              </button>
            )}
          </div>
        ) : (
          <Empty
            icon={<AudioLines size={26} />}
            title={
              search ? "No matching agents" : "Your first agent starts here"
            }
            description={
              search
                ? "Try another name or clear your search."
                : "Choose a template, add your company context, and try a conversation."
            }
            action={
              w.canManage && !search ? (
                <button
                  className="button primary"
                  onClick={() => setCreating(true)}
                >
                  <Plus size={16} /> Create your first agent
                </button>
              ) : undefined
            }
          />
        )}
      </section>
      {(creating || editing) && (
        <BotEditor
          bot={editing || undefined}
          feature={feature}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
        />
      )}
      {deleting && (
        <Modal
          title="Delete this agent?"
          subtitle={`“${deleting.name}” and its company context will be permanently removed.`}
          onClose={() => !busy && setDeleting(null)}
        >
          <p className="muted">
            Website integrations using this bot ID will stop accepting new
            calls.
          </p>
          <ErrorNotice text={error} />
          <div className="modal-actions">
            <button
              className="button secondary"
              disabled={busy}
              onClick={() => setDeleting(null)}
            >
              Keep agent
            </button>
            <button className="button danger" disabled={busy} onClick={remove}>
              {busy && <Spinner />}Delete agent
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
export function Templates() {
  const w = useWorkspace();
  const [selected, setSelected] = useState<Template | null>(null);
  return (
    <>
      <PageTitle
        eyebrow="A HEAD START, BUILT IN"
        title="Find your next voice"
        description="Purpose-built templates. Powered by your business context."
      />
      <div className="catalog-intro">
        <span className="pill">
          <Sparkles size={13} /> THE TEMPLATE LIBRARY
        </span>
        <h2>
          Expertise included.
          <br />
          Personality is up to you.
        </h2>
        <p>
          Start with a role, add your company’s knowledge, and let the
          conversation begin.
        </p>
      </div>
      <div className="template-grid">
        {w.templates.map((t, i) => (
          <article key={t.id} className="template-card">
            <div className={`template-visual ${kind(t)}`}>
              <div className="visual-ring" />
              <TemplateIcon slug={t.slug} size={48} />
              <span className="template-number">0{i + 1}</span>
              <span className="visual-plus">+</span>
            </div>
            <div className="template-body">
              <div className="eyebrow">
                {t.slug.includes("clinic")
                  ? "HEALTHCARE"
                  : t.slug.includes("sales")
                    ? "SALES & GROWTH"
                    : "CUSTOMER EXPERIENCE"}
              </div>
              <h3>{t.name}</h3>
              <p>{t.description}</p>
              <div className="template-features">
                <span>
                  <Check size={13} /> Company context
                </span>
                <span>
                  <Check size={13} /> 11 languages
                </span>
              </div>
              <button
                className="button secondary full"
                disabled={!w.canManage}
                onClick={() => setSelected(t)}
              >
                Use this template <ArrowRight size={16} />
              </button>
            </div>
          </article>
        ))}
      </div>
      <div className="meeting-preview-grid">
        {[
          {
            name: "Meeting Facilitator",
            description:
              "Guide the agenda and capture decisions in Google Meet.",
          },
          {
            name: "Founder Q&A",
            description:
              "Ask questions across your meetings, with answers linked to their sources.",
          },
        ].map((item) => (
          <article className="meeting-preview" key={item.name}>
            <span className="status-pill">Coming soon</span>
            <h3>{item.name}</h3>
            <p>{item.description}</p>
            <button className="button secondary" disabled>
              Coming soon
            </button>
          </article>
        ))}
      </div>
      {w.templates.length === 0 && (
        <Empty
          icon={<Layers3 />}
          title="No templates available"
          description="Your platform operator needs to publish a template first."
        />
      )}
      <div className="inline-note catalog-note">
        <LockKeyhole size={16} />
        <span>
          Templates include platform-managed instructions. Booking, CRM, and
          outbound calling require connected tools.
        </span>
      </div>
      {selected && (
        <BotEditor template={selected} onClose={() => setSelected(null)} />
      )}
    </>
  );
}
