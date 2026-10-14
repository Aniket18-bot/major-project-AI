import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { useCurrentUser } from "@/lib/session";
import { STATUS_CLASS, STATUS_LABEL, type ApplicationStatus } from "@/lib/status";
import { Button } from "@/components/ui/button";
import { Filter, Calendar, TrendingUp, Video } from "lucide-react";

export const Route = createFileRoute("/_authenticated/applications")({
  head: () => ({
    meta: [
      { title: "My applications — HireSense AI" },
      {
        name: "description",
        content:
          "Every application with its current stage, AI match score, matched skills, skill gaps and the written reason behind the decision.",
      },
      { property: "og:title", content: "My applications — HireSense AI" },
      {
        property: "og:description",
        content: "Explainable status tracking for each job you applied to.",
      },
    ],
  }),
  component: ApplicationsPage,
});
function ApplicationsPage() {
  const { data: user } = useCurrentUser();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"date" | "score" | "status">("date");

  const { data: applications, isLoading } = useQuery({
    queryKey: ["my-applications", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("applications")
        .select("*, jobs(title, company_name, location, required_skills), resumes(title)")
        .eq("student_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const list = useMemo(() => {
    let filtered = applications ?? [];

    // Filter by status
    if (statusFilter !== "all") {
      filtered = filtered.filter((app) => app.status === statusFilter);
    }

    // Sort
    if (sortBy === "date") {
      filtered = [...filtered].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
    } else if (sortBy === "score") {
      filtered = [...filtered].sort((a, b) => (b.match_score ?? 0) - (a.match_score ?? 0));
    } else if (sortBy === "status") {
      const statusOrder = ["interview", "shortlisted", "applied", "rejected", "selected"];
      filtered = [...filtered].sort((a, b) => {
        const aIndex = statusOrder.indexOf(a.status as string);
        const bIndex = statusOrder.indexOf(b.status as string);
        return aIndex - bIndex;
      });
    }

    return filtered;
  }, [applications, statusFilter, sortBy]);

  const stats = useMemo(() => {
    const apps = applications ?? [];
    return {
      total: apps.length,
      applied: apps.filter((a) => a.status === "applied").length,
      shortlisted: apps.filter((a) => a.status === "shortlisted").length,
      interview: apps.filter((a) => a.status === "interview").length,
      selected: apps.filter((a) => a.status === "selected").length,
      rejected: apps.filter((a) => a.status === "rejected").length,
      avgScore:
        apps.length > 0
          ? Math.round(apps.reduce((sum, a) => sum + (a.match_score ?? 0), 0) / apps.length)
          : 0,
    };
  }, [applications]);

  return (
    <AppShell
      title="My applications"
      description="Transparent decisions: what matched, what was missing, and why you're at this stage."
      actions={
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link to="/interviews">
              <Video className="mr-2 h-4 w-4" />
              Interviews
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/jobs">Find more jobs</Link>
          </Button>
        </div>
      }
    >
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : list.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-10 text-center shadow-card">
          <p className="text-sm text-muted-foreground">No applications yet.</p>
          <Button asChild className="mt-4">
            <Link to="/jobs">Browse open roles</Link>
          </Button>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-border bg-card p-4 shadow-card">
              <p className="text-sm text-muted-foreground">Total Applications</p>
              <p className="mt-1 text-2xl font-bold">{stats.total}</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4 shadow-card">
              <p className="text-sm text-muted-foreground">In Progress</p>
              <p className="mt-1 text-2xl font-bold">
                {stats.applied + stats.shortlisted + stats.interview}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4 shadow-card">
              <p className="text-sm text-muted-foreground">Interviews</p>
              <p className="mt-1 text-2xl font-bold">{stats.interview}</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4 shadow-card">
              <p className="text-sm text-muted-foreground">Avg Match Score</p>
              <p className="mt-1 text-2xl font-bold">{stats.avgScore}%</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <select
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Status</option>
                <option value="applied">Applied</option>
                <option value="shortlisted">Shortlisted</option>
                <option value="interview">Interview</option>
                <option value="selected">Selected</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <select
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as "date" | "score" | "status")}
              >
                <option value="date">Sort by Date</option>
                <option value="score">Sort by Score</option>
                <option value="status">Sort by Status</option>
              </select>
            </div>
          </div>

          <div className="space-y-4">
            {list.map((application) => (
              <article
                key={application.id}
                className="rounded-xl border border-border bg-card p-5 shadow-card"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="font-display text-lg font-semibold">
                      {application.jobs?.title}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {application.jobs?.company_name}
                      {application.jobs?.location ? ` · ${application.jobs.location}` : ""} ·
                      applied {new Date(application.created_at).toLocaleDateString()}
                      {application.resumes?.title ? ` · resume: ${application.resumes.title}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-display text-lg font-semibold">
                      {Math.round(Number(application.match_score ?? 0))}%
                    </span>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${
                        STATUS_CLASS[application.status as ApplicationStatus]
                      }`}
                    >
                      {STATUS_LABEL[application.status as ApplicationStatus]}
                    </span>
                  </div>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div className="rounded-lg bg-muted/60 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Current stage
                    </p>
                    <p className="mt-1 text-sm font-medium">{application.stage}</p>
                    {application.recruiter_note ? (
                      <p className="mt-2 text-sm text-muted-foreground">
                        Recruiter note: {application.recruiter_note}
                      </p>
                    ) : null}
                  </div>
                  <div className="rounded-lg bg-muted/60 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Why this decision
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {application.explanation ?? "Awaiting evaluation."}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-4 text-xs">
                  <div>
                    <span className="font-medium text-success">Matched:</span>{" "}
                    {application.matched_skills.length
                      ? application.matched_skills.join(", ")
                      : "none"}
                  </div>
                  <div>
                    <span className="font-medium text-destructive">Gaps:</span>{" "}
                    {application.missing_skills.length
                      ? application.missing_skills.join(", ")
                      : "none"}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </>
      )}
    </AppShell>
  );
}
