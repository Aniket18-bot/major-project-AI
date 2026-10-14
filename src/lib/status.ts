export const APPLICATION_STATUSES = [
  "applied",
  "under_review",
  "shortlisted",
  "interview",
  "on_hold",
  "selected",
  "rejected",
] as const;

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export const STATUS_LABEL: Record<ApplicationStatus, string> = {
  applied: "Applied",
  under_review: "Under review",
  shortlisted: "Shortlisted",
  interview: "Interview",
  on_hold: "On hold",
  selected: "Selected",
  rejected: "Rejected",
};

export const STATUS_CLASS: Record<ApplicationStatus, string> = {
  applied: "bg-muted text-muted-foreground",
  under_review: "bg-primary-soft text-accent-foreground",
  shortlisted: "bg-info/15 text-info",
  interview: "bg-info/15 text-info",
  on_hold: "bg-warning/20 text-warning-foreground",
  selected: "bg-success/15 text-success",
  rejected: "bg-destructive/12 text-destructive",
};

export const DEFAULT_STAGE: Record<ApplicationStatus, string> = {
  applied: "Application received",
  under_review: "AI screening",
  shortlisted: "Shortlisted for interview",
  interview: "Interview round",
  on_hold: "Decision on hold",
  selected: "Offer stage",
  rejected: "Closed",
};
