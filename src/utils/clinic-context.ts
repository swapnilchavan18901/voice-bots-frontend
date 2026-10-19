import type { ClinicDraft } from "@/lib/types";

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
