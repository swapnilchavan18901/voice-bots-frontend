"use client";
import {
  WORKSPACE_KEY,
  TOAST_DURATION_MS,
  DEFAULT_MEETING_VOICE_NAME,
} from "@/constants/constants";
import type { WorkspaceContext } from "@/lib/types";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import {
  getCurrentUser,
  listOrganizations,
  getMeetingCapabilities,
  getWorkspace,
  message,
} from "@/lib/api";
import { getAccessToken } from "@/utils/api-client";
import {
  Organization,
  User,
  WorkspaceData,
} from "@/lib/types";
const Workspace = createContext<WorkspaceContext | null>(null);
export const useWorkspace = () => {
  const value = useContext(Workspace);
  if (!value) throw new Error("Missing workspace");
  return value;
};
export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [meetingVoiceName, setMeetingVoiceName] = useState(
    DEFAULT_MEETING_VOICE_NAME,
  );
  const [manualJoinReady, setManualJoinReady] = useState(false);
  const [isOperator, setIsOperator] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [workspace, setWorkspace] = useState<WorkspaceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const generation = useRef(0);
  const selected = useRef("");
  useEffect(() => {
    const expired = () => {
      generation.current++;
      setUser(null);
      router.replace("/login?expired=1");
    };
    window.addEventListener("auth-expired", expired);
    return () => window.removeEventListener("auth-expired", expired);
  }, [router]);
  const refresh = useCallback(async () => {
    if (!getAccessToken()) {
      router.replace("/login");
      return;
    }
    const run = ++generation.current;
    setLoading(true);
    setError("");
    try {
      const [me, organizations, capabilities] = await Promise.all([
        getCurrentUser(),
        listOrganizations(),
        getMeetingCapabilities(),
      ]);
      const preferred = selected.current || localStorage.getItem(WORKSPACE_KEY);
      const id =
        organizations.find((o) => o.id === preferred)?.id ||
        organizations[0]?.id ||
        "";
      const data = id ? await getWorkspace(id) : null;
      if (run !== generation.current) return;
      selected.current = id;
      setUser(me);
      setIsOperator(capabilities.operator);
      setManualJoinReady(capabilities.manual_join_ready);
      setMeetingVoiceName(
        capabilities.voice_name || DEFAULT_MEETING_VOICE_NAME,
      );
      setOrgs(organizations);
      setWorkspace(data);
      if (id) localStorage.setItem(WORKSPACE_KEY, id);
    } catch (e) {
      if (run === generation.current) setError(message(e));
    } finally {
      if (run === generation.current) setLoading(false);
    }
  }, [router]);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), TOAST_DURATION_MS);
    return () => clearTimeout(timer);
  }, [toast]);
  const selectOrg = (id: string) => {
    selected.current = id;
    setWorkspace(null);
    void refresh();
  };

  if (!user) {
    return (
      <main className="main-content">
        {error ? (
          <>
            <p role="alert">{error}</p>
            <button className="button primary" onClick={() => void refresh()}>
              Try again
            </button>
            <button
              className="button secondary"
              onClick={() => router.replace("/login")}
            >
              Sign in
            </button>
          </>
        ) : (
          <p role="status">Loading your workspace…</p>
        )}
      </main>
    );
  }
  return (
    <Workspace.Provider
      value={{
        user,
        orgs,
        org: workspace?.organization || null,
        templates: workspace?.templates || [],
        bots: workspace?.bots || [],
        members: workspace?.members || [],
        features: workspace?.features || {
          clinic: { bots: [], templates: [] },
          conversation: { bots: [], templates: [] },
        },
        loading,
        error,
        role: workspace?.role || "member",
        isOperator,
        manualJoinReady,
        meetingVoiceName,
        canManage: workspace?.can_manage || false,
        canInviteAdmins: workspace?.can_invite_admins || false,
        selectOrg,
        refresh,
        notify: setToast,
        toast,
      }}
    >
      {children}
    </Workspace.Provider>
  );
}
