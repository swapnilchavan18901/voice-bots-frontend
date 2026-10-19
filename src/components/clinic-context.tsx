"use client";
import type { ClinicDraft } from "@/lib/types";

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
