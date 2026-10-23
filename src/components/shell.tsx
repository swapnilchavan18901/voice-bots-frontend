"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  AudioLines,
  CalendarDays,
  Inbox,
  Boxes,
  ChevronDown,
  CircleHelp,
  Code2,
  KeyRound,
  LogOut,
  Menu,
  Plus,
  Radio,
  Phone,
  Users,
  ArrowUpRight,
  CheckCircle2,
  RefreshCw,
  X,
} from "lucide-react";
import { ThemeToggle } from "./theme-toggle";
import { useWorkspace } from "./workspace";
import { Logo, Modal, ErrorNotice, Spinner } from "./ui";
import { createOrganization, logout as signOut, message } from "@/lib/api";
const groups = [
  {
    label: "CLINIC BOT",
    links: [
      { href: "/clinic", label: "Clinic setup", icon: AudioLines },
      { href: "/patients", label: "Daily patients", icon: Users },
      { href: "/clinic-phone", label: "Phone calls", icon: Phone },
      { href: "/clinic-test-ground", label: "Test ground", icon: Radio },
    ],
  },
  {
    label: "MEETINGS BOT",
    links: [
      { href: "/meetings", label: "Meetings", icon: CalendarDays },
      { href: "/meeting-test-ground", label: "Test ground", icon: Radio },
      { href: "/calendar-inbox", label: "Calendar inbox", icon: Inbox },
    ],
  },
  {
    label: "OTHER BOTS",
    links: [
      { href: "/agents", label: "Other agents", icon: AudioLines },
      { href: "/playground", label: "Test ground", icon: Radio },
    ],
  },
  {
    label: "WORKSPACE SETTINGS",
    links: [
      { href: "/templates", label: "Template library", icon: Boxes },
      { href: "/api-keys", label: "API keys", icon: KeyRound },
      { href: "/team", label: "Team members", icon: Users },
      { href: "/integration", label: "Integration", icon: Code2 },
    ],
  },
];
const links = groups.flatMap((group) => group.links);
export function Shell({ children }: { children: React.ReactNode }) {
  const w = useWorkspace();
  const path = usePathname();
  const router = useRouter();
  const [mobile, setMobile] = useState(false);
  const [create, setCreate] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function addOrg(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const org = await createOrganization({ name: name.trim() });
      await w.refresh();
      w.selectOrg(org.id);
      setCreate(false);
      setName("");
      w.notify("Workspace created");
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  async function logout() {
    await signOut();
    router.replace("/login");
    router.refresh();
  }
  return (
    <div className="app-shell">
      {mobile && (
        <button
          className="nav-backdrop"
          aria-label="Close navigation"
          onClick={() => setMobile(false)}
        />
      )}
      <aside className={`sidebar ${mobile ? "open" : ""}`}>
        <div className="sidebar-brand">
          <Link href="/clinic" aria-label="Sia home">
            <Logo />
          </Link>
          <button
            className="icon-button mobile-only"
            aria-label="Close navigation"
            onClick={() => setMobile(false)}
          >
            <X size={18} />
          </button>
        </div>
        <div className="workspace-picker">
          <span className="workspace-avatar">
            {w.org?.name.slice(0, 1).toUpperCase() || "W"}
          </span>
          <div>
            <label htmlFor="workspace">WORKSPACE</label>
            <select
              id="workspace"
              aria-label="Select workspace"
              value={w.org?.id || ""}
              onChange={(e) => w.selectOrg(e.target.value)}
              disabled={w.loading}
            >
              {!w.org && <option value="">Your workspace</option>}
              {w.orgs.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </div>
          <ChevronDown size={15} />
        </div>
        <button className="new-workspace" onClick={() => setCreate(true)}>
          <Plus size={13} /> New workspace
        </button>
        <nav aria-label="Features">
          {groups.map((group) => {
            const items = group.links.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMobile(false)}
                aria-current={path === href ? "page" : undefined}
                className={`nav-link ${path === href ? "selected" : ""}`}
              >
                <Icon size={18} />
                {label}
              </Link>
            ));
            return group.label === "WORKSPACE SETTINGS" ? (
              <details
                className="nav-settings"
                key={group.label}
                open={group.links.some((link) => link.href === path)}
              >
                <summary className="nav-label">
                  Workspace settings <ChevronDown size={13} />
                </summary>
                {items}
              </details>
            ) : (
              <div key={group.label}>
                <div className="nav-label">{group.label}</div>
                {items}
              </div>
            );
          })}
        </nav>
        <div className="sidebar-bottom">
          <div className="help-card">
            <div className="help-icon">
              <AudioLines size={19} />
            </div>
            <h4>
              Your next conversation
              <br />
              starts here.
            </h4>
            <p>Connect an agent to your website in a few simple steps.</p>
            <Link href="/integration">
              Integration guide <ArrowUpRight size={14} />
            </Link>
          </div>
          <button
            className="profile"
            onClick={logout}
            title="Sign out"
            aria-label="Sign out"
          >
            <span className="avatar">
              {w.user?.name.slice(0, 2).toUpperCase() || "··"}
            </span>
            <span>
              <b>{w.user?.name || "Your account"}</b>
              <small>{w.role.charAt(0).toUpperCase() + w.role.slice(1)}</small>
            </span>
            <LogOut size={16} />
          </button>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumbs">
            <button
              className="icon-button mobile-only"
              aria-label="Open navigation"
              onClick={() => setMobile(true)}
            >
              <Menu size={20} />
            </button>
            <span>Workspace</span>
            <span className="slash">/</span>
            <strong>
              {groups
                .find((g) => g.links.some((l) => l.href === path))
                ?.label.toLowerCase()}{" "}
              / {links.find((l) => l.href === path)?.label || "Dashboard"}
            </strong>
          </div>
          <div className="top-actions">
            <ThemeToggle />
            <span className="platform-label">
              <i /> Voice agent studio
            </span>
            <Link
              className="icon-button"
              aria-label="Integration help"
              href="/integration"
            >
              <CircleHelp size={19} />
            </Link>
            <span className="avatar small-avatar">
              {w.user?.name.slice(0, 1).toUpperCase() || "V"}
            </span>
          </div>
        </header>
        <main key={w.org?.id || "loading"}>
          {w.error ? (
            <div className="connection-error">
              <ErrorNotice text={w.error} />
              <button
                className="button secondary"
                onClick={() => void w.refresh()}
              >
                <RefreshCw size={16} /> Retry connection
              </button>
            </div>
          ) : w.loading ? (
            <div className="loading-state">
              <Spinner />
              <p>Loading your workspace…</p>
            </div>
          ) : (
            children
          )}
        </main>
        <footer className="app-footer">
          <span>Made for meaningful conversations.</span>
          <span>
            Sia studio <span className="footer-dot">·</span> Powered by Sarvam
            AI
          </span>
        </footer>
      </div>
      {w.toast && (
        <div role="status" className="toast">
          <CheckCircle2 size={18} />
          {w.toast}
        </div>
      )}
      {create && (
        <Modal
          title="Create a workspace"
          subtitle="Keep agents, people, and API keys organized."
          onClose={() => !busy && setCreate(false)}
        >
          <form onSubmit={addOrg}>
            <label className="field">
              Workspace name
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                maxLength={100}
                placeholder="e.g. Acme Healthcare"
              />
            </label>
            <ErrorNotice text={error} />
            <div className="modal-actions">
              <button
                type="button"
                className="button secondary"
                onClick={() => setCreate(false)}
                disabled={busy}
              >
                Cancel
              </button>
              <button
                className="button primary"
                disabled={busy || !name.trim()}
              >
                {busy && <Spinner />}Create workspace
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
