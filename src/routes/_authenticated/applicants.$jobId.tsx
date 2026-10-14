import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell, StatCard } from "@/components/AppShell";
import {
  APPLICATION_STATUSES,
  DEFAULT_STAGE,
  STATUS_CLASS,
  STATUS_LABEL,
  type ApplicationStatus,
} from "@/lib/status";
import { notifyApplicationStatusChangeFn } from "@/lib/notification-workflows.server";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Filter, Search, ArrowUpDown } from "lucide-react";
import { useCurrentUser } from "@/lib/session";

export const Route = createFileRoute("/_authenticated/applicants/$jobId")({
  head: () => ({
    meta: [
      { title: "Ranked applicants — HireSense AI" },
      {
        name: "description",
        content:
          "Automated candidate ranking for a single role: match score, matched skills, skill gaps, interview recommendation and status updates with explanations.",
      },
      { property: "og:title", content: "Ranked applicants — HireSense AI" },
      {
        property: "og:description",
        content: "Smart ranking dashboard with explainable scoring per job role.",
      },
    ],
  }),
  component: ApplicantsPage,
});

function recommendation(score: number) {
  if (score >= 75) return { label: "Shortlist", className: "bg-success/15 text-success" };
  if (score >= 50)
    return { label: "Hold / review", className: "bg-warning/20 text-warning-foreground" };
  return { label: "Reject", className: "bg-destructive/12 text-destructive" };
}

function ApplicantsPage() {
  const { jobId } = Route.useParams();
  const { data: user } = useCurrentUser();
  const queryClient = useQueryClient();
  const [minScore, setMinScore] = useState(0);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"score" | "name" | "experience">("score");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [selectedApplicants, setSelectedApplicants] = useState<Set<string>>(new Set());

  const { data: job } = useQuery({
    queryKey: ["job", jobId],
    queryFn: async () => {
      const { data, error } = await supabase.from("jobs").select("*").eq("id", jobId).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: applications } = useQuery({
    queryKey: ["job-applications", jobId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("applications")
        .select("*, student_id, jobs(*)")
        .eq("job_id", jobId)
        .order("match_score", { ascending: false });
      if (error) throw error;
      const ids = [...new Set(data.map((row: any) => row.student_id))];
      const { data: candidates, error: candidatesError } = ids.length
        ? await supabase
            .from("profiles")
            .select("id, full_name, headline, location, skills, years_experience")
            .in("id", ids)
        : { data: [], error: null };
      if (candidatesError) throw candidatesError;
      const byId = new Map((candidates ?? []).map((row: any) => [row.id, row]));
      return data.map((row: any) => ({ ...row, candidate: byId.get(row.student_id) ?? null }));
    },
  });

  const update = useMutation({
    mutationFn: async (input: {
      id: string;
      status: ApplicationStatus;
      note?: string | undefined;
    }) => {
      const updateData = {
        status: input.status,
        stage: DEFAULT_STAGE[input.status],
        ...(input.note !== undefined ? { recruiter_note: input.note.slice(0, 2000) } : {}),
      };
      const { error } = await supabase
        .from("applications")
        .update(updateData as any)
        .eq("id", input.id);
      if (error) throw error;

      // Get application details for notification
      const { data: application } = await supabase
        .from("applications")
        .select("*, student_id, jobs(*, recruiter_id)")
        .eq("id", input.id)
        .single();

      if (application && (application as any).jobs) {
        const { data: student } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", application.student_id)
          .single();

        if (student) {
          // Send notification (non-blocking)
          try {
            await notifyApplicationStatusChangeFn({
              data: {
                applicationId: (application as any).id,
                studentId: (application as any).student_id,
                studentName: (student as any).full_name || "Candidate",
                recruiterId: ((application as any).jobs as any).recruiter_id,
                jobId: (application as any).job_id,
                jobTitle: ((application as any).jobs as any).title,
                company: ((application as any).jobs as any).company,
                status: input.status,
                stage: DEFAULT_STAGE[input.status],
              },
            });
          } catch (e) {
            console.error("Failed to send notification:", e);
          }
        }
      }
    },
    onSuccess: () => {
      toast.success("Candidate updated — the student sees this instantly");
      queryClient.invalidateQueries({ queryKey: ["job-applications", jobId] });
      queryClient.invalidateQueries({ queryKey: ["recruiter-jobs"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Update failed"),
  });

  const bulkUpdate = useMutation({
    mutationFn: async (input: { ids: string[]; status: ApplicationStatus }) => {
      const updateData = {
        status: input.status,
        stage: DEFAULT_STAGE[input.status],
      };
      const { error } = await supabase
        .from("applications")
        .update(updateData as any)
        .in("id", input.ids);
      if (error) throw error;

      // Get application details for notifications
      const { data: applications } = await supabase
        .from("applications")
        .select("*, student_id, jobs(*, recruiter_id)")
        .in("id", input.ids);

      if (applications) {
        for (const application of applications) {
          if ((application as any).jobs) {
            const { data: student } = await supabase
              .from("profiles")
              .select("full_name")
              .eq("id", (application as any).student_id)
              .single();

            if (student) {
              // Send notification (non-blocking)
              try {
                await notifyApplicationStatusChangeFn({
                  data: {
                    applicationId: (application as any).id,
                    studentId: (application as any).student_id,
                    studentName: (student as any).full_name || "Candidate",
                    recruiterId: ((application as any).jobs as any).recruiter_id,
                    jobId: (application as any).job_id,
                    jobTitle: ((application as any).jobs as any).title,
                    company: ((application as any).jobs as any).company,
                    status: input.status,
                    stage: DEFAULT_STAGE[input.status],
                  },
                });
              } catch (e) {
                console.error("Failed to send notification:", e);
              }
            }
          }
        }
      }
    },
    onSuccess: () => {
      toast.success(`Updated ${selectedApplicants.size} candidates`);
      setSelectedApplicants(new Set());
      queryClient.invalidateQueries({ queryKey: ["job-applications", jobId] });
      queryClient.invalidateQueries({ queryKey: ["recruiter-jobs"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Bulk update failed"),
  });

  const list = (applications ?? [])
    .filter((application) => Number(application.match_score ?? 0) >= minScore)
    .filter((application) => {
      const matchesSearch =
        !searchQuery ||
        (application.candidate?.full_name || "")
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        (application.candidate?.headline || "").toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = filterStatus === "all" || application.status === filterStatus;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      if (sortBy === "score") return ((b as any).match_score ?? 0) - ((a as any).match_score ?? 0);
      if (sortBy === "name")
        return ((a as any).candidate?.full_name || "").localeCompare((b as any).candidate?.full_name || "");
      if (sortBy === "experience")
        return ((b as any).candidate?.years_experience || 0) - ((a as any).candidate?.years_experience || 0);
      return 0;
    });
  const all = applications ?? [];
  const avg = all.length
    ? Math.round(all.reduce((sum, a) => sum + Number((a as any).match_score ?? 0), 0) / all.length)
    : 0;

  return (
    <AppShell
      title={(job as any)?.title ? `Ranking · ${(job as any).title}` : "Ranked applicants"}
      description="Ranked by automated score from skills and experience only — names and locations are not scored."
      actions={
        <Button asChild variant="outline">
          <Link to="/recruiter">Back to jobs</Link>
        </Button>
      }
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Applicants" value={all.length} />
        <StatCard label="Average score" value={`${avg}%`} />
        <StatCard
          label="Shortlist-ready"
          value={all.filter((a) => Number(a.match_score ?? 0) >= 75).length}
          hint="Score 75%+"
        />
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-4 shadow-card">
        <div className="flex items-center gap-2 flex-1">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search candidates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <select
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">All Status</option>
            {APPLICATION_STATUSES.map((status) => (
              <option key={status} value={status}>
                {STATUS_LABEL[status]}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
          <select
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as "score" | "name" | "experience")}
          >
            <option value="score">Sort by Score</option>
            <option value="name">Sort by Name</option>
            <option value="experience">Sort by Experience</option>
          </select>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-4 shadow-card">
        <span className="text-sm font-medium">Filter by minimum score</span>
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={minScore}
          onChange={(event) => setMinScore(Number(event.target.value))}
          className="flex-1 accent-primary"
        />
        <span className="w-12 text-sm font-semibold">{minScore}%</span>
      </div>

      {/* Bulk Operations */}
      {selectedApplicants.size > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-primary bg-primary/5 p-4">
          <span className="text-sm font-medium">{selectedApplicants.size} selected</span>
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              bulkUpdate.mutate({ ids: Array.from(selectedApplicants), status: "shortlisted" })
            }
            disabled={bulkUpdate.isPending}
          >
            Bulk Shortlist
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              bulkUpdate.mutate({ ids: Array.from(selectedApplicants), status: "interview" })
            }
            disabled={bulkUpdate.isPending}
          >
            Move to Interview
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              bulkUpdate.mutate({ ids: Array.from(selectedApplicants), status: "rejected" })
            }
            disabled={bulkUpdate.isPending}
          >
            Bulk Reject
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSelectedApplicants(new Set())}>
            Clear selection
          </Button>
        </div>
      )}

      <div className="mt-6 space-y-4">
        {list.map((application, index) => {
          const score = Math.round(Number(application.match_score ?? 0));
          const rec = recommendation(score);
          const candidate = application.candidate;
          return (
            <article
              key={application.id}
              className="rounded-xl border border-border bg-card p-5 shadow-card"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <span className="mt-1 flex size-8 items-center justify-center rounded-lg bg-muted text-sm font-semibold">
                    #{index + 1}
                  </span>
                  <div>
                    <h2 className="font-display text-lg font-semibold">
                      {candidate?.full_name || "Candidate"}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {candidate?.headline || "No headline"}
                      {candidate?.years_experience
                        ? ` · ${candidate.years_experience} yr experience`
                        : ""}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <span className={`rounded-full px-3 py-1 text-xs font-medium ${rec.className}`}>
                    {rec.label}
                  </span>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      STATUS_CLASS[application.status as ApplicationStatus]
                    }`}
                  >
                    {STATUS_LABEL[application.status as ApplicationStatus]}
                  </span>
                  <div className="text-right">
                    <p className="font-display text-2xl font-semibold">{score}%</p>
                    <p className="text-[10px] uppercase text-muted-foreground">match</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectedApplicants.has(application.id)}
                    onChange={(e) => {
                      const newSelected = new Set(selectedApplicants);
                      if (e.target.checked) {
                        newSelected.add((application as any).id);
                      } else {
                        newSelected.delete((application as any).id);
                      }
                      setSelectedApplicants(newSelected);
                    }}
                    className="h-4 w-4"
                  />
                </div>
              </div>

              <p className="mt-3 text-sm text-muted-foreground">{(application as any).explanation}</p>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {(application as any).matched_skills.map((skill: string) => (
                  <span
                    key={skill}
                    className="rounded-full bg-success/15 px-2.5 py-1 text-xs text-success"
                  >
                    {skill}
                  </span>
                ))}
                {(application as any).missing_skills.map((skill: string) => (
                  <span
                    key={skill}
                    className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground"
                  >
                    missing: {skill}
                  </span>
                ))}
              </div>

              <div className="mt-4 grid gap-3 border-t border-border pt-4 md:grid-cols-[1fr_auto]">
                <div>
                  <Textarea
                    rows={2}
                    placeholder="Explanation for the candidate (why shortlisted, on hold or rejected)"
                    value={notes[application.id] ?? application.recruiter_note ?? ""}
                    onChange={(event) =>
                      setNotes((prev) => ({ ...prev, [application.id]: event.target.value }))
                    }
                  />
                </div>
                <div className="flex flex-wrap items-start gap-2">
                  <select
                    className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                    value={application.status}
                    onChange={(event) =>
                      update.mutate({
                        id: application.id,
                        status: event.target.value as ApplicationStatus,
                        note: notes[application.id],
                      })
                    }
                  >
                    {APPLICATION_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {STATUS_LABEL[status]}
                      </option>
                    ))}
                  </select>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      update.mutate({
                        id: application.id,
                        status: application.status as ApplicationStatus,
                        note: notes[application.id] ?? application.recruiter_note ?? "",
                      })
                    }
                  >
                    Save note
                  </Button>
                  <Button asChild size="sm" variant="ghost">
                    <Link
                      to="/candidate/$studentId"
                      params={{ studentId: application.student_id }}
                      search={{ job: jobId }}
                    >
                      View profile
                    </Link>
                  </Button>
                </div>
              </div>
            </article>
          );
        })}

        {list.length === 0 ? (
          <p className="rounded-xl border border-border bg-card p-10 text-center text-sm text-muted-foreground shadow-card">
            No applicants match this filter yet.
          </p>
        ) : null}
      </div>
    </AppShell>
  );
}
