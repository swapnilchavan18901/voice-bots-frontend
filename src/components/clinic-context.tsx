"use client";

type ClinicDraft = {
  name: string;
  address: string;
  phone: string;
  fees: string;
  parking: string;
  booking: string;
  timezone: string;
  working_days: number[];
  open_time: string;
  close_time: string;
  lunch_start: string;
  lunch_end: string;
  slot_minutes: string;
  doctors: string;
};
const empty: ClinicDraft = {
  name: "",
  address: "",
  phone: "",
  fees: "",
  parking: "",
  booking: "",
  timezone: "",
  working_days: [],
  open_time: "",
  close_time: "",
  lunch_start: "",
  lunch_end: "",
  slot_minutes: "",
  doctors: "",
};
export function readClinicContext(context: string): {
  background: string;
  clinic: ClinicDraft;
} {
  try {
    const data = JSON.parse(context);
    if (data && typeof data === "object" && data.clinic) {
      const clinic = data.clinic;
      return {
        background: typeof data.background === "string" ? data.background : "",
        clinic: {
          ...empty,
          ...Object.fromEntries(
            Object.keys(empty)
              .filter(
                (key) =>
                  key !== "doctors" &&
                  key !== "working_days" &&
                  key !== "slot_minutes",
              )
              .map((key) => [
                key,
                typeof clinic[key] === "string" ? clinic[key] : "",
              ]),
          ),
          working_days: Array.isArray(clinic.working_days)
            ? clinic.working_days
            : [],
          slot_minutes:
            clinic.slot_minutes == null ? "" : String(clinic.slot_minutes),
          doctors: Array.isArray(clinic.doctors)
            ? clinic.doctors
                .map(
                  (d: { name: string; specialty: string }) =>
                    `${d.name} | ${d.specialty}`,
                )
                .join("\n")
            : "",
        },
      };
    }
  } catch {
    /* Free text is valid clinic background. */
  }
  return { background: context, clinic: { ...empty, working_days: [] } };
}
export function saveClinicContext(
  background: string,
  draft: ClinicDraft,
): string {
  const clinic: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(draft)) {
    if (key === "doctors" || key === "working_days" || key === "slot_minutes")
      continue;
    if (typeof value === "string" && value.trim()) clinic[key] = value.trim();
  }
  if (draft.working_days.length) clinic.working_days = draft.working_days;
  if (draft.slot_minutes) clinic.slot_minutes = Number(draft.slot_minutes);
  if (draft.doctors.trim()) {
    clinic.doctors = draft.doctors
      .split("\n")
      .filter((line) => line.trim())
      .map((line) => {
        const [name, specialty, extra] = line
          .split("|")
          .map((value) => value.trim());
        if (!name || !specialty || extra !== undefined) {
          throw new Error(
            "Enter each doctor as Name | Specialty, one per line.",
          );
        }
        return { name, specialty };
      });
  }
  const context = JSON.stringify({ background, clinic });
  if (context.length > 20000)
    throw new Error("Clinic details and background exceed 20,000 characters.");
  return context;
}
export function ClinicContextFields({
  value,
  onChange,
}: {
  value: ClinicDraft;
  onChange: (value: ClinicDraft) => void;
}) {
  const update = (key: keyof ClinicDraft, text: string) =>
    onChange({ ...value, [key]: text });
  return (
    <fieldset className="clinic-context-fields">
      <legend>Clinic details</legend>
      <p className="field-hint">
        These details are saved as part of your agent context. Add the doctors
        and schedule to enable appointment booking.
      </p>
      <div className="form-grid">
        {(
          [
            ["name", "Clinic name"],
            ["phone", "Front desk phone"],
            ["address", "Clinic address"],
            ["fees", "Fees and payment methods"],
            ["parking", "Parking"],
            ["booking", "Booking policy"],
          ] as const
        ).map(([key, label]) => (
          <label className="field" key={key}>
            {label}
            <input
              value={value[key]}
              onChange={(e) => update(key, e.target.value)}
              maxLength={key === "name" ? 120 : key === "phone" ? 100 : 2000}
            />
          </label>
        ))}
      </div>
      <label className="field">
        Doctors
        <textarea
          rows={3}
          value={value.doctors}
          onChange={(e) => update("doctors", e.target.value)}
          placeholder="One doctor per line: Name | Specialty"
        />
      </label>
      <div className="form-grid">
        <label className="field">
          Clinic timezone
          <input
            value={value.timezone}
            onChange={(e) => update("timezone", e.target.value)}
            placeholder="e.g. Asia/Kolkata"
          />
        </label>
        <label className="field">
          Appointment duration (minutes)
          <input
            type="number"
            min={5}
            max={240}
            value={value.slot_minutes}
            onChange={(e) => update("slot_minutes", e.target.value)}
          />
        </label>
        {(
          [
            ["open_time", "Opening time"],
            ["close_time", "Closing time"],
            ["lunch_start", "Break starts (optional)"],
            ["lunch_end", "Break ends (optional)"],
          ] as const
        ).map(([key, label]) => (
          <label className="field" key={key}>
            {label}
            <input
              type="time"
              value={value[key].slice(0, 5)}
              onChange={(e) => update(key, e.target.value)}
            />
          </label>
        ))}
      </div>
      <div className="field">
        Working days
        <div className="clinic-working-days">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(
            (day, index) => (
              <label key={day}>
                <input
                  type="checkbox"
                  checked={value.working_days.includes(index)}
                  onChange={(e) =>
                    onChange({
                      ...value,
                      working_days: e.target.checked
                        ? [...value.working_days, index].sort()
                        : value.working_days.filter((d) => d !== index),
                    })
                  }
                />
                {day}
              </label>
            ),
          )}
        </div>
      </div>
    </fieldset>
  );
}
