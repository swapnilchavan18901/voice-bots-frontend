"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Eye,
  EyeOff,
  Phone,
  PhoneCall,
  RefreshCw,
  Settings2,
} from "lucide-react";
import {
  CLINIC_PHONE_PAGE_SIZE,
  CLINIC_PHONE_POLL_MS,
} from "@/constants/constants";
import {
  dialClinicPhone,
  getClinicPhoneCapabilities,
  getClinicPhoneRoute,
  listClinicPhoneCalls,
  message,
  reconcileClinicPhoneCall,
  setClinicPhoneRoute,
} from "@/lib/api";
import type {
  ClinicPhoneCall,
  ClinicPhoneCapabilities,
  ClinicPhoneRoute,
} from "@/lib/types";
import { meetingDate } from "@/utils/format";
import {
  CopyButton,
  Empty,
  ErrorNotice,
  Modal,
  PageTitle,
  Spinner,
} from "./ui";
import { useWorkspace } from "./workspace";

const statusLabels: Record<ClinicPhoneCall["status"], string> = {
  dialing: "Dialing",
  unknown: "Needs review",
  queued: "Queued",
  ringing: "Ringing",
  "in-progress": "In progress",
  completed: "Completed",
  failed: "Failed",
  busy: "Busy",
  "no-answer": "No answer",
  cancelled: "Cancelled",
};
type PendingCall = {
  phone_number: string;
  request_id: string;
  callId?: string;
};
const normalizedPhone = (value: string) => value.replace(/[\s().-]/g, "");
const validPhone = (value: string) =>
  /^\+[1-9]\d{7,14}$/.test(normalizedPhone(value));

export function ClinicPhone() {
  const w = useWorkspace();
  const query = useSearchParams();
  const bots = w.features.clinic.bots;
  const [selection, setSelection] = useState(query.get("bot") || "");
  const selected = bots.find((bot) => bot.id === selection) || bots[0];
  return (
    <>
      <PageTitle
        eyebrow="CLINIC BOT"
        title="Phone calls"
        description="Let your clinic assistant answer incoming calls and help patients over the phone."
      />
      {!selected || !w.org ? (
        <Empty
          icon={<Phone />}
          title="Set up your clinic first"
          description="Create a clinic assistant before connecting a phone number."
          action={
            <Link className="button primary" href="/clinic">
              Clinic setup
            </Link>
          }
        />
      ) : (
        <>
          <div className="phone-heading-row">
            <label className="field phone-assistant-picker">
              Clinic assistant
              <select
                value={selected.id}
                onChange={(event) => setSelection(event.target.value)}
              >
                {bots.map((bot) => (
                  <option key={bot.id} value={bot.id}>
                    {bot.name}
                  </option>
                ))}
              </select>
            </label>
            <Link
              className="button secondary small"
              href={`/clinic-test-ground?bot=${selected.id}`}
            >
              Try browser voice <ArrowUpRight size={14} />
            </Link>
          </div>
          <PhoneWorkspace
            key={`${w.org.id}:${selected.id}`}
            orgId={w.org.id}
            botId={selected.id}
            name={selected.name}
          />
        </>
      )}
    </>
  );
}

function PhoneWorkspace({
  orgId,
  botId,
  name,
}: {
  orgId: string;
  botId: string;
  name: string;
}) {
  const w = useWorkspace();
  const [capabilities, setCapabilities] =
    useState<ClinicPhoneCapabilities | null>(null);
  const [route, setRoute] = useState<ClinicPhoneRoute | null>(null);
  const [setupError, setSetupError] = useState("");
  const [setupLoading, setSetupLoading] = useState(true);
  const [setupRevision, setSetupRevision] = useState(0);
  const [revealUrl, setRevealUrl] = useState(false);
  const [editing, setEditing] = useState(false);
  const [calls, setCalls] = useState<ClinicPhoneCall[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState("");
  const [offset, setOffset] = useState(0);
  const [historyRevision, setHistoryRevision] = useState(0);
  const [updatedAt, setUpdatedAt] = useState("");
  const [review, setReview] = useState<ClinicPhoneCall | null>(null);
  const [phone, setPhone] = useState("");
  const [pending, setPending] = useState<PendingCall | null>(null);
  const [restored, setRestored] = useState(false);
  const [confirmDial, setConfirmDial] = useState(false);
  const [dialError, setDialError] = useState("");
  const [dialBusy, setDialBusy] = useState(false);
  const [callResult, setCallResult] = useState<ClinicPhoneCall | null>(null);
  const mounted = useRef(false);
  const dialing = useRef(false);
  const storageKey = `sia-clinic-call:${w.user?.id}:${orgId}:${botId}`;
  const clearPending = useCallback(() => {
    sessionStorage.removeItem(storageKey);
    setPending(null);
  }, [storageKey]);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(storageKey);
      if (saved) {
        const data: PendingCall = JSON.parse(saved);
        if (
          validPhone(data.phone_number) &&
          typeof data.request_id === "string"
        ) {
          setPending(data);
          setPhone(data.phone_number);
        }
      }
    } catch {
      setDialError(
        "Allow browser storage so phone call requests can be retried safely.",
      );
    }
    setRestored(true);
  }, [storageKey]);

  useEffect(() => {
    const controller = new AbortController();
    setSetupLoading(true);
    setSetupError("");
    (async () => {
      const caps = await getClinicPhoneCapabilities(
        orgId,
        botId,
        controller.signal,
      );
      if (controller.signal.aborted) return;
      setCapabilities(caps);
      const configured = caps.can_view_route
        ? await getClinicPhoneRoute(orgId, botId, controller.signal)
        : null;
      if (!controller.signal.aborted) {
        setRoute(configured);
        setRevealUrl(false);
      }
    })()
      .catch((error) => {
        if (!controller.signal.aborted) {
          setCapabilities(null);
          setSetupError(message(error));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setSetupLoading(false);
      });
    return () => controller.abort();
  }, [orgId, botId, setupRevision]);

  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    setHistoryLoading(true);
    setCalls([]);
    const load = async () => {
      try {
        if (!document.hidden) {
          const data = await listClinicPhoneCalls(
            orgId,
            botId,
            offset,
            CLINIC_PHONE_PAGE_SIZE + 1,
            controller.signal,
          );
          if (!controller.signal.aborted) {
            setCalls(data);
            setHistoryError("");
            setUpdatedAt(new Date().toLocaleTimeString());
          }
        }
      } catch (error) {
        if (!controller.signal.aborted) setHistoryError(message(error));
      } finally {
        if (!controller.signal.aborted) {
          setHistoryLoading(false);
          timer = setTimeout(load, CLINIC_PHONE_POLL_MS);
        }
      }
    };
    void load();
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [orgId, botId, offset, historyRevision]);

  useEffect(() => {
    if (!pending?.callId) return;
    const result = calls.find((call) => call.id === pending.callId);
    if (result && result.status !== "unknown") {
      try {
        clearPending();
      } catch {
        /* Existing pending state still prevents accidental redial. */
      }
      setCallResult(result);
    }
  }, [calls, pending, clearPending]);

  async function dial() {
    if (dialing.current) return;
    dialing.current = true;
    setDialBusy(true);
    setDialError("");
    try {
      const attempt = pending || {
        phone_number: normalizedPhone(phone),
        request_id: crypto.randomUUID(),
      };
      // Persist BEFORE sending: timeout/reload/retry must reuse the same attempt.
      sessionStorage.setItem(storageKey, JSON.stringify(attempt));
      setPending(attempt);
      const result = await dialClinicPhone(orgId, botId, {
        phone_number: attempt.phone_number,
        request_id: attempt.request_id,
      });
      if (!mounted.current) return;
      setCallResult(result);
      if (result.status === "unknown") {
        const saved = { ...attempt, callId: result.id };
        sessionStorage.setItem(storageKey, JSON.stringify(saved));
        setPending(saved);
      } else {
        clearPending();
      }
      setConfirmDial(false);
      setOffset(0);
      setHistoryRevision((value) => value + 1);
    } catch (error) {
      if (!mounted.current) return;
      const status =
        error && typeof error === "object" && "status" in error
          ? Number(error.status)
          : 0;
      if ([400, 401, 403, 404, 422, 503].includes(status)) {
        try {
          clearPending();
        } catch {
          /* Preserve the attempt if storage cannot be updated. */
        }
      }
      setDialError(message(error));
      setConfirmDial(false);
    } finally {
      dialing.current = false;
      if (mounted.current) setDialBusy(false);
    }
  }

  const visibleCalls = calls.slice(0, CLINIC_PHONE_PAGE_SIZE);
  return (
    <>
      <ErrorNotice text={setupError} />
      {setupError && (
        <button
          className="button secondary small"
          onClick={() => setSetupRevision((value) => value + 1)}
        >
          Retry phone settings
        </button>
      )}
      {setupLoading ? (
        <div className="phone-loading" role="status">
          <Spinner /> Loading phone settings…
        </div>
      ) : (
        capabilities && (
          <div className="phone-panels">
            <section className="phone-panel" aria-labelledby="inbound-heading">
              <div className="phone-panel-title">
                <span className="phone-icon">
                  <ArrowDownLeft size={19} />
                </span>
                <div>
                  <h2 id="inbound-heading">Incoming calls</h2>
                  <p>Patients call. Your assistant answers.</p>
                </div>
                {capabilities.can_manage_route && (
                  <button
                    className="icon-button"
                    aria-label="Edit clinic phone settings"
                    onClick={() => setEditing(true)}
                  >
                    <Settings2 size={18} />
                  </button>
                )}
              </div>
              {!capabilities.can_view_route ? (
                <p className="phone-description">
                  Your workspace owner or admin manages the clinic number. You
                  can view call history below.
                </p>
              ) : route ? (
                <>
                  <div className="phone-number">{route.phone_number}</div>
                  <span
                    className={`phone-status ${route.enabled ? "success" : "neutral"}`}
                  >
                    {route.enabled ? "Enabled in Sia" : "Disabled in Sia"}
                  </span>
                  <p className="phone-description">
                    {route.enabled
                      ? "The number must also be connected to this assistant in Exotel. Incoming calls work even when the dashboard is closed."
                      : "New inbound sessions are blocked. Calls already connected can finish."}
                  </p>
                  {route.inbound_stream_url && (
                    <details className="phone-connection">
                      <summary>Exotel connection</summary>
                      <p>
                        Use this private connection URL in the Exotel Voicebot
                        applet.
                      </p>
                      <label className="field">
                        Connection URL
                        <input
                          type={revealUrl ? "text" : "password"}
                          readOnly
                          value={route.inbound_stream_url}
                          autoComplete="off"
                        />
                      </label>
                      <div className="phone-actions">
                        <CopyButton
                          value={route.inbound_stream_url}
                          label="Copy connection URL"
                        />
                        <button
                          className="button secondary small"
                          onClick={() => setRevealUrl((value) => !value)}
                        >
                          {revealUrl ? <EyeOff size={14} /> : <Eye size={14} />}
                          {revealUrl ? "Hide" : "Show"}
                        </button>
                      </div>
                    </details>
                  )}
                </>
              ) : (
                <>
                  <p className="phone-description">
                    No incoming number is assigned to this assistant yet.
                  </p>
                  {capabilities.can_manage_route ? (
                    <button
                      className="button secondary"
                      onClick={() => setEditing(true)}
                    >
                      Connect clinic number
                    </button>
                  ) : (
                    <p className="phone-description">
                      Ask your platform operator to assign the Exotel number.
                    </p>
                  )}
                </>
              )}
              {!capabilities.inbound_ready && (
                <p className="phone-warning">
                  Phone service is not ready. Ask your administrator to check
                  the backend configuration.
                </p>
              )}
            </section>
            <section className="phone-panel" aria-labelledby="outbound-heading">
              <div className="phone-panel-title">
                <span className="phone-icon">
                  <ArrowUpRight size={19} />
                </span>
                <div>
                  <h2 id="outbound-heading">Call a patient</h2>
                  <p>{name} handles the conversation.</p>
                </div>
              </div>
              {capabilities.can_call ? (
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    setDialError("");
                    setConfirmDial(true);
                  }}
                >
                  <label className="field">
                    Patient phone number
                    <span className="field-hint">
                      Include the country code, for example +919876543210.
                    </span>
                    <input
                      type="tel"
                      autoComplete="tel"
                      value={pending?.phone_number || phone}
                      onChange={(event) => setPhone(event.target.value)}
                      placeholder="+91…"
                      disabled={dialBusy || !!pending}
                      required
                      maxLength={40}
                    />
                  </label>
                  {pending && (
                    <p className="phone-warning">
                      {pending.callId
                        ? "This call needs review. Verify its outcome below before starting another request."
                        : "Your previous request has not been confirmed. Check it using the same request to avoid dialing twice."}
                    </p>
                  )}
                  <ErrorNotice text={dialError} />
                  <button
                    className="button primary"
                    disabled={
                      !restored ||
                      dialBusy ||
                      !capabilities.outbound_ready ||
                      !validPhone(pending?.phone_number || phone)
                    }
                  >
                    {dialBusy ? <Spinner /> : <PhoneCall size={16} />}
                    {pending ? "Check previous request" : "Call patient"}
                  </button>
                  <p className="phone-description">
                    {capabilities.outbound_ready
                      ? "Starts a real phone call. Appointments are saved only after the patient confirms."
                      : "Outbound calling is unavailable. Ask your administrator to check the Exotel configuration."}
                  </p>
                  {callResult && (
                    <p className="phone-call-result" role="status">
                      {callResult.phone_number}:{" "}
                      {statusLabels[callResult.status]}. Follow the latest
                      status in call history.
                    </p>
                  )}
                </form>
              ) : (
                <p className="phone-description">
                  Only workspace owners and admins can start phone calls.
                </p>
              )}
            </section>
          </div>
        )
      )}
      <section
        className="phone-history"
        aria-labelledby="phone-history-heading"
      >
        <div className="phone-history-heading">
          <div>
            <h2 id="phone-history-heading">Call history</h2>
            <p>
              {updatedAt
                ? `Updated ${updatedAt} · Refreshes automatically`
                : "Incoming and outgoing calls for this assistant"}
            </p>
          </div>
          <button
            className="button secondary small"
            disabled={historyLoading}
            onClick={() => setHistoryRevision((value) => value + 1)}
          >
            <RefreshCw size={14} />
            Refresh
          </button>
        </div>
        <ErrorNotice text={historyError} />
        {historyLoading ? (
          <div className="phone-loading" role="status">
            <Spinner /> Loading calls…
          </div>
        ) : !visibleCalls.length ? (
          <Empty
            icon={<Phone />}
            title={historyError ? "Call history unavailable" : "No calls yet"}
            description={
              historyError
                ? "Refresh to try loading the calls again."
                : "Incoming and outgoing phone calls will appear here."
            }
          />
        ) : (
          <div className="table-card">
            <table>
              <caption className="sr-only">Clinic phone call history</caption>
              <thead>
                <tr>
                  <th scope="col">DIRECTION</th>
                  <th scope="col">PHONE NUMBER</th>
                  <th scope="col">STATUS</th>
                  <th scope="col">STARTED</th>
                  <th scope="col">DETAILS</th>
                </tr>
              </thead>
              <tbody>
                {visibleCalls.map((call) => (
                  <tr key={call.id}>
                    <td>
                      <span className="phone-direction">
                        {call.direction === "inbound" ? (
                          <ArrowDownLeft size={15} />
                        ) : (
                          <ArrowUpRight size={15} />
                        )}
                        {call.direction === "inbound" ? "Incoming" : "Outgoing"}
                      </span>
                    </td>
                    <td className="phone-contact">{call.phone_number}</td>
                    <td>
                      <span
                        className={`phone-status ${call.status === "unknown" ? "warning" : call.status === "in-progress" ? "success" : "neutral"}`}
                      >
                        {statusLabels[call.status]}
                      </span>
                    </td>
                    <td>{meetingDate(call.created_at)}</td>
                    <td className="phone-call-detail">
                      {call.error && <p>{call.error}</p>}
                      {call.provider_call_sid && (
                        <small>Exotel ID: {call.provider_call_sid}</small>
                      )}
                      {call.status === "unknown" && capabilities?.can_call && (
                        <button
                          className="button secondary small"
                          onClick={() => setReview(call)}
                        >
                          Review call
                        </button>
                      )}
                      {call.status === "completed" && (
                        <small>
                          Call ended. Check Daily patients for confirmed
                          appointments.
                        </small>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="meeting-pagination">
          <button
            className="button secondary small"
            disabled={!offset || historyLoading}
            onClick={() =>
              setOffset(Math.max(0, offset - CLINIC_PHONE_PAGE_SIZE))
            }
          >
            Previous
          </button>
          <span>Page {offset / CLINIC_PHONE_PAGE_SIZE + 1}</span>
          <button
            className="button secondary small"
            disabled={historyLoading || calls.length <= CLINIC_PHONE_PAGE_SIZE}
            onClick={() => setOffset(offset + CLINIC_PHONE_PAGE_SIZE)}
          >
            Next
          </button>
        </div>
      </section>
      {editing && (
        <RouteEditor
          orgId={orgId}
          botId={botId}
          route={route}
          onClose={() => setEditing(false)}
          onSaved={(saved) => {
            setRoute(saved);
            setRevealUrl(false);
            setEditing(false);
          }}
        />
      )}
      {confirmDial && (
        <Modal
          title={pending ? "Check previous call request" : "Call this patient?"}
          subtitle={`${name} will speak with ${pending?.phone_number || normalizedPhone(phone)}.`}
          onClose={() => {
            if (!dialBusy) setConfirmDial(false);
          }}
        >
          <p className="phone-description">
            {pending
              ? "This checks the existing request. It will not place a second call if the first request was already accepted."
              : "Your AI receptionist will introduce itself, ask whether it is a convenient time, and help with appointments."}
          </p>
          <div className="modal-actions">
            <button
              className="button secondary"
              disabled={dialBusy}
              onClick={() => setConfirmDial(false)}
            >
              Cancel
            </button>
            <button
              className="button primary"
              disabled={dialBusy}
              onClick={() => void dial()}
            >
              {dialBusy && <Spinner />}
              {pending ? "Check request" : "Start phone call"}
            </button>
          </div>
        </Modal>
      )}
      {review && (
        <CallReview
          key={review.id}
          orgId={orgId}
          botId={botId}
          call={review}
          onClose={() => setReview(null)}
          onSaved={(result) => {
            if (pending?.callId === result.id) {
              try {
                clearPending();
              } catch {
                /* Retain safe retry state. */
              }
            }
            setReview(null);
            setHistoryRevision((value) => value + 1);
          }}
        />
      )}
    </>
  );
}

function RouteEditor({
  orgId,
  botId,
  route,
  onClose,
  onSaved,
}: {
  orgId: string;
  botId: string;
  route: ClinicPhoneRoute | null;
  onClose: () => void;
  onSaved: (route: ClinicPhoneRoute) => void;
}) {
  const [phone, setPhone] = useState(route?.phone_number || "");
  const [enabled, setEnabled] = useState(route?.enabled ?? true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      onSaved(
        await setClinicPhoneRoute(orgId, botId, {
          phone_number: normalizedPhone(phone),
          enabled,
        }),
      );
    } catch (error) {
      setError(message(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title="Clinic phone settings"
      subtitle="Assign an Exotel number to this clinic assistant."
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <form onSubmit={save}>
        <label className="field">
          Exotel clinic number
          <span className="field-hint">
            Use a number allocated to your Exotel account, including its country
            code.
          </span>
          <input
            autoFocus
            type="tel"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            required
            maxLength={40}
            disabled={busy}
            placeholder="+918012345678"
          />
        </label>
        <label className="phone-checkbox">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(event) => setEnabled(event.target.checked)}
            disabled={busy}
          />
          Enable incoming calls in Sia
        </label>
        <p className="phone-warning">
          Saving replaces the connection URL. Update the Voicebot applet in
          Exotel with the new URL after saving. Disabling blocks new inbound
          sessions.
        </p>
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
            disabled={busy || !validPhone(phone)}
          >
            {busy && <Spinner />}Save phone settings
          </button>
        </div>
      </form>
    </Modal>
  );
}

function CallReview({
  orgId,
  botId,
  call,
  onClose,
  onSaved,
}: {
  orgId: string;
  botId: string;
  call: ClinicPhoneCall;
  onClose: () => void;
  onSaved: (call: ClinicPhoneCall) => void;
}) {
  const [sid, setSid] = useState("");
  const [notPlaced, setNotPlaced] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      onSaved(
        await reconcileClinicPhoneCall(
          orgId,
          botId,
          call.id,
          notPlaced
            ? { confirmed_not_placed: true }
            : { provider_call_sid: sid.trim() },
        ),
      );
    } catch (error) {
      setError(message(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title="Review call outcome"
      subtitle={`Verify the call to ${call.phone_number} in Exotel first.`}
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <form onSubmit={save}>
        <p className="phone-description">
          The provider has not confirmed whether this call was placed. Link the
          matching Exotel call, or confirm that no call was placed. This action
          will not dial again.
        </p>
        <label className="field">
          Verified Exotel call ID
          <input
            value={sid}
            onChange={(event) => setSid(event.target.value)}
            disabled={notPlaced || busy}
            required={!notPlaced}
            maxLength={128}
            pattern="[A-Za-z0-9_\-]+"
          />
        </label>
        <label className="phone-checkbox">
          <input
            type="checkbox"
            checked={notPlaced}
            onChange={(event) => setNotPlaced(event.target.checked)}
            disabled={busy}
          />
          I checked Exotel and confirmed no call was placed.
        </label>
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
            disabled={busy || (!notPlaced && !sid.trim())}
          >
            {busy && <Spinner />}Save verified outcome
          </button>
        </div>
      </form>
    </Modal>
  );
}
