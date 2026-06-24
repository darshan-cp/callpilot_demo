export type LeadStatus =
  | "pending"
  | "calling"
  | "verified"
  | "voicemail"
  | "wrong_contact"
  | "company_mismatch"
  | "invalid_number";

export const STATUS_CONFIG: Record<LeadStatus, { label: string; color: string; bg: string; dot: string }> = {
  pending: {
    label: "Pending",
    color: "text-slate-500 dark:text-slate-400",
    bg: "bg-slate-100 dark:bg-slate-800",
    dot: "bg-slate-400",
  },
  calling: {
    label: "Calling",
    color: "text-violet-600 dark:text-violet-400",
    bg: "bg-violet-100 dark:bg-violet-900/40",
    dot: "bg-violet-500 animate-pulse-dot",
  },
  verified: {
    label: "Verified",
    color: "text-emerald-700 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-900/30",
    dot: "bg-emerald-500",
  },
  voicemail: {
    label: "Voicemail",
    color: "text-amber-700 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-900/30",
    dot: "bg-amber-500",
  },
  wrong_contact: {
    label: "Wrong Contact",
    color: "text-orange-700 dark:text-orange-400",
    bg: "bg-orange-50 dark:bg-orange-900/30",
    dot: "bg-orange-500",
  },
  company_mismatch: {
    label: "Company Mismatch",
    color: "text-blue-700 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-900/30",
    dot: "bg-blue-500",
  },
  invalid_number: {
    label: "Invalid Number",
    color: "text-red-700 dark:text-red-400",
    bg: "bg-red-50 dark:bg-red-900/30",
    dot: "bg-red-500",
  },
};

export function getStatusConfig(status: string) {
  return STATUS_CONFIG[status as LeadStatus] ?? STATUS_CONFIG.pending;
}
