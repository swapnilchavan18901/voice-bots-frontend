"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { RefreshCw, Users } from "lucide-react";
import { getClinicRegister, setClinicVisit, message } from "@/lib/api";
import type { ClinicPatient, ClinicRegister } from "@/lib/types";
import { useWorkspace } from "./workspace";
import { Empty, ErrorNotice, PageTitle, Spinner } from "./ui";

export function Patients() {
  const w = useWorkspace();
  const bots = w.features.clinic.bots;
  const [selection, setSelection] = useState("");
  const selected = bots.find((b) => b.id === selection)?.id || bots[0]?.id;
  return (
    <>
      <PageTitle
        eyebrow="HEALTHCARE"
        title="Daily patients"
        description="Patients registered for each appointment day. Mark their visit when they see the doctor."
      />
      {!selected || !w.org ? (
        <Empty
          icon={<Users />}
          title="Set up your clinic first"
          description="Confirmed clinic bookings will appear here automatically."
          action={
            <Link href="/clinic" className="button primary">
              Clinic setup
            </Link>
          }
        />
      ) : (
        <>
          {bots.length > 1 && (
            <label className="field">
              Clinic assistant
              <select
                value={selected}
                onChange={(e) => setSelection(e.target.value)}
              >
                {bots.map((bot) => (
                  <option key={bot.id} value={bot.id}>
                    {bot.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <DailyList
            key={`${w.org.id}:${selected}`}
            orgId={w.org.id}
            botId={selected}
          />
        </>
      )}
    </>
  );
}

function DailyList({ orgId, botId }: { orgId: string; botId: string }) {
  const w = useWorkspace();
  const [day, setDay] = useState("");
  const [data, setData] = useState<ClinicRegister | null>(null);
  const items = data?.patients || [];
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [visitError, setVisitError] = useState("");
  const [saving, setSaving] = useState<string[]>([]);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setVisitError("");
    setError("");
    getClinicRegister(orgId, botId, day || undefined, controller.signal)
      .then(setData)
      .catch((e) => {
        if (!controller.signal.aborted) setError(message(e));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [orgId, botId, day, revision]);
  async function mark(patient: ClinicPatient) {
    setSaving((ids) => [...ids, patient.id]);
    setVisitError("");
    try {
      const updated = await setClinicVisit(
        orgId,
        botId,
        patient.id,
        !patient.visited,
      );
      setRevision((n) => n + 1);
      w.notify(updated.visited ? "Doctor visit marked" : "Visit mark removed");
    } catch (e) {
      setVisitError(message(e));
    } finally {
      setSaving((ids) => ids.filter((id) => id !== patient.id));
    }
  }
  return (
    <section>
      <div className="patient-toolbar">
        <label className="field">
          Appointment day
          <input
            type="date"
            value={day || data?.day || ""}
            disabled={loading || saving.length > 0}
            onChange={(e) => {
              if (e.target.value) setDay(e.target.value);
            }}
          />
        </label>
        <button
          className="button secondary"
          disabled={loading || saving.length > 0}
          onClick={() => setRevision((n) => n + 1)}
        >
          <RefreshCw size={16} /> Refresh
        </button>
        {!loading && !error && (
          <span className="muted">
            {data?.registered_count || 0} registered ·{" "}
            {data?.visited_count || 0} visited
          </span>
        )}
      </div>
      <ErrorNotice text={error} />
      <ErrorNotice text={visitError} />
      {loading ? (
        <div className="loading-state">
          <Spinner /> Loading patients…
        </div>
      ) : (
        !error &&
        (items.length ? (
          <div className="table-card patient-table">
            <table>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Patient</th>
                  <th>Doctor</th>
                  <th>Status</th>
                  <th>Visited doctor</th>
                </tr>
              </thead>
              <tbody>
                {items.map((patient) => (
                  <tr key={patient.id}>
                    <td>{patient.start_time.slice(11, 16)}</td>
                    <td>
                      <b>{patient.patient_name}</b>
                      <div className="table-sub">{patient.patient_phone}</div>
                      {patient.reason && (
                        <div className="table-sub">{patient.reason}</div>
                      )}
                    </td>
                    <td>{patient.doctor_name}</td>
                    <td>
                      <span className="status-pill">
                        {patient.status === "cancelled"
                          ? "Cancelled"
                          : "Registered"}
                      </span>
                    </td>
                    <td>
                      <label className="visit-check">
                        <input
                          type="checkbox"
                          checked={patient.visited}
                          aria-label={`Visited doctor: ${patient.patient_name}`}
                          disabled={
                            !patient.can_update_visit ||
                            saving.includes(patient.id)
                          }
                          onChange={() => void mark(patient)}
                        />
                        {saving.includes(patient.id)
                          ? "Saving…"
                          : patient.visited
                            ? "Done"
                            : "Pending"}
                      </label>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty
            icon={<Users />}
            title="No patients for this day"
            description="Confirmed bookings will appear here for their appointment date."
          />
        ))
      )}
    </section>
  );
}
