import type { Disposition } from "@/lib/schema";

export const DISPOSITION_LABELS: Record<Disposition, string> = {
  ready_for_petition_prep: "Ready for petition prep",
  needs_follow_up: "Needs follow-up",
  needs_attorney_review: "Needs attorney review",
};

export const DISPOSITION_STYLES: Record<Disposition, string> = {
  ready_for_petition_prep: "bg-emerald-50 border-emerald-200 text-emerald-900",
  needs_follow_up: "bg-amber-50 border-amber-200 text-amber-900",
  needs_attorney_review: "bg-orange-50 border-orange-200 text-orange-900",
};

export const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  analyzed: "Analyzed",
  approved: "Approved",
  exported: "Exported",
};

export const STATUS_STYLES: Record<string, string> = {
  draft: "bg-zinc-100 text-zinc-700",
  analyzed: "bg-blue-50 text-blue-800",
  approved: "bg-emerald-50 text-emerald-800",
  exported: "bg-violet-50 text-violet-800",
};
