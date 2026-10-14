import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppShell, StatCard } from "@/components/AppShell";
import { useCurrentUser, useProfile } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { HiringCharts } from "@/components/HiringCharts";
import { Search, Filter, Plus, Edit, Copy, X, FileText, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/recruiter")({
  head: () => ({
    meta: [
      { title: "Recruiter dashboard — HireSense AI" },
      {
        name: "description",
        content:
          "Manage job postings, see applicant volume per role and open the ranked shortlist for any job with automated candidate scoring.",
      },
      { property: "og:title", content: "Recruiter dashboard — HireSense AI" },
      {
        property: "og:description",
        content: "Job management and per-role ranking dashboards for recruiters.",
      },
    ],
  }),
  component: RecruiterDashboard,
});

function RecruiterDashboard() {
  const { data: user } = useCurrentUser();
  const { data: profile } = useProfile();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "open" | "closed">("all");

  const { data: jobs } = useQuery({
    queryKey: ["recruiter-jobs", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select("*, applications(id, status, match_score, created_at)")
        .eq("recruiter_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const deleteJob = useMutation({
    mutationFn: async (jobId: string) => {
      // First check if job has applications
      const { data: applications, error: checkError } = await supabase
        .from("applications")
        .select("id")
        .eq("job_id", jobId);

      if (checkError) throw checkError;

      if (applications && applications.length > 0) {
        throw new Error(
          `Cannot delete job with ${applications.length} existing applications. Please handle applications first.`,
        );
      }

      // If no applications, proceed with deletion
      const { error } = await supabase.from("jobs").delete().eq("id", jobId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Job deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["recruiter-jobs"] });
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Failed to delete job"),
  });

  if (profile && profile.role !== "recruiter") {
    return (
      <AppShell title="Recruiter dashboard" description="This area is for recruiter accounts.">
        <Button asChild>
          <Link to="/dashboard">Go to student dashboard</Link>
        </Button>
      </AppShell>
    );
  }

  const list = jobs ?? [];
  const allApplications = list.flatMap((job) => job.applications ?? []);
  const selected = allApplications.filter((a) => a.status === "selected").length;
  const rejected = allApplications.filter((a) => a.status === "rejected").length;
  const shortlisted = allApplications.filter((a) => a.status === "shortlisted").length;
  const interview = allApplications.filter((a) => a.status === "interview").length;
  const underReview = allApplications.filter((a) => a.status === "under_review").length;
  const applied = allApplications.filter((a) => a.status === "applied").length;
  const onHold = allApplications.filter((a) => a.status === "on_hold").length;
  const pending = allApplications.length - selected - rejected;
  const acceptance = allApplications.length
    ? Math.round((selected / allApplications.length) * 100)
    : 0;
  const rejectedPct = allApplications.length
    ? Math.round((rejected / allApplications.length) * 100)
    : 0;
  const pendingPct = allApplications.length
    ? Math.round((pending / allApplications.length) * 100)
    : 0;
  const skillCount = new Map<string, number>();
  list.forEach((job) =>
    job.required_skills.forEach((skill) => skillCount.set(skill, (skillCount.get(skill) ?? 0) + 1)),
  );
  const topSkills = [...skillCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  const avgScore = allApplications.length
    ? Math.round(
        allApplications.reduce((sum, a) => sum + Number(a.match_score ?? 0), 0) /
          allApplications.length,
      )
    : 0;

  return (
    <AppShell
      title={profile?.company_name ? `${profile.company_name} hiring` : "Recruiter dashboard"}
      description="Every role has its own ranked candidate dashboard with automated scoring."
      actions={
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link to="/analytics">Analytics</Link>
          </Button>
          <Button asChild>
            <Link to="/post-job">Post a job</Link>
          </Button>
        </div>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Jobs posted" value={list.length} />
        <StatCard label="Applications" value={allApplications.length} />
        <StatCard label="Average score" value={`${avgScore}%`} />
        <StatCard label="Acceptance rate" value={`${acceptance}%`} hint="Selected / applied" />
        <StatCard label="Rejected %" value={`${rejectedPct}%`} />
        <StatCard label="Pending %" value={`${pendingPct}%`} />
        <StatCard label="Selected" value={selected} hint="Offers extended" />
        <StatCard label="Shortlisted" value={shortlisted} hint="Candidates shortlisted" />
        <StatCard label="Interviews" value={interview} hint="Scheduled interviews" />
        <StatCard label="Under Review" value={underReview} hint="Pending reviews" />
        <StatCard label="On Hold" value={onHold} hint="Candidates on hold" />
        <StatCard
          label="Top skills"
          value={topSkills[0]?.[0] ?? "—"}
          hint={topSkills.map(([skill]) => skill).join(", ") || "Post a job to see demand"}
        />
      </div>

      <HiringCharts
        applications={allApplications}
        jobsPosted={list.map((job) => ({
          title: job.title,
          count: (job.applications ?? []).length,
        }))}
      />

      {/* AI Insights Section */}
      {list.length > 0 && (
        <section className="mt-8 rounded-xl border border-border bg-card p-6 shadow-card">
          <h2 className="text-base font-semibold mb-4">AI Insights</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-lg bg-info/10 p-4">
              <p className="text-sm font-medium text-info">Strongest Candidate Pool</p>
              <p className="mt-1 text-lg font-semibold">
                {list.length > 0
                  ? (() => {
                      const strongest = list.reduce((max, job) => {
                        const jobAvg =
                          (job.applications ?? []).length > 0
                            ? (job.applications ?? []).reduce(
                                (sum, a) => sum + (a.match_score ?? 0),
                                0,
                              ) / (job.applications ?? []).length
                            : 0;
                        const maxAvg =
                          max && (max.applications ?? []).length > 0
                            ? (max.applications ?? []).reduce(
                                (sum, a) => sum + (a.match_score ?? 0),
                                0,
                              ) / (max.applications ?? []).length
                            : 0;
                        return jobAvg > maxAvg ? job : max;
                      }, list[0]);
                      return strongest?.title || "N/A";
                    })()
                  : "N/A"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{avgScore}% average match score</p>
            </div>
            <div className="rounded-lg bg-success/10 p-4">
              <p className="text-sm font-medium text-success">Hottest Skills</p>
              <p className="mt-1 text-lg font-semibold">
                {topSkills
                  .slice(0, 2)
                  .map(([skill]) => skill)
                  .join(", ") || "N/A"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">Most requested across all jobs</p>
            </div>
            <div className="rounded-lg bg-warning/10 p-4">
              <p className="text-sm font-medium text-warning-foreground">Conversion Rate</p>
              <p className="mt-1 text-lg font-semibold">
                {allApplications.length > 0
                  ? Math.round((interview / allApplications.length) * 100)
                  : 0}
                %
              </p>
              <p className="mt-1 text-xs text-muted-foreground">Applications to interviews</p>
            </div>
          </div>
        </section>
      )}

      <section className="mt-8 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-base font-semibold">Your job postings</h2>
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search jobs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-64"
              />
            </div>
            <Button variant="outline" size="sm">
              <Filter className="mr-2 h-4 w-4" />
              Filter
            </Button>
            <Button asChild size="sm">
              <Link to="/post-job">
                <Plus className="mr-2 h-4 w-4" />
                Post Job
              </Link>
            </Button>
          </div>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex gap-2">
          <Button
            variant={statusFilter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("all")}
          >
            All ({list.length})
          </Button>
          <Button
            variant={statusFilter === "open" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("open")}
          >
            Open ({list.filter((j) => j.status === "open").length})
          </Button>
          <Button
            variant={statusFilter === "closed" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("closed")}
          >
            Closed ({list.filter((j) => j.status === "closed").length})
          </Button>
        </div>

        {list.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-10 text-center shadow-card">
            <p className="text-sm text-muted-foreground">
              No jobs yet. Post your first role to start receiving scored applications.
            </p>
            <Button asChild className="mt-4">
              <Link to="/post-job">Post a job</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {list
              .filter((job) => {
                const matchesSearch =
                  job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  job.company_name.toLowerCase().includes(searchQuery.toLowerCase());
                const matchesStatus = statusFilter === "all" || job.status === statusFilter;
                return matchesSearch && matchesStatus;
              })
              .map((job) => {
                const apps = job.applications ?? [];
                const avgScore =
                  apps.length > 0
                    ? Math.round(
                        apps.reduce((sum, a) => sum + (a.match_score ?? 0), 0) / apps.length,
                      )
                    : 0;
                const shortlisted = apps.filter((a) => a.status === "shortlisted").length;
                const interviews = apps.filter((a) => a.status === "interview").length;
                const selected = apps.filter((a) => a.status === "selected").length;

                return (
                  <article
                    key={job.id}
                    className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-card p-5 shadow-card"
                  >
                    <div className="flex-1">
                      <div className="flex items-start gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-display text-lg font-semibold">{job.title}</h3>
                            <span
                              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                                job.status === "open"
                                  ? "bg-success/10 text-success"
                                  : "bg-muted text-muted-foreground"
                              }`}
                            >
                              {job.status}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {job.location || "Location flexible"} · {job.employment_type} ·{" "}
                            {job.work_mode}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Required: {job.required_skills.slice(0, 3).join(", ")}
                            {job.required_skills.length > 3 &&
                              ` +${job.required_skills.length - 3} more`}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-center">
                        <p className="font-display text-2xl font-semibold">{apps.length}</p>
                        <p className="text-xs text-muted-foreground">applicants</p>
                      </div>
                      <div className="text-center">
                        <p className="font-display text-2xl font-semibold">{avgScore}%</p>
                        <p className="text-xs text-muted-foreground">avg score</p>
                      </div>
                      <div className="text-center">
                        <p className="font-display text-2xl font-semibold">{shortlisted}</p>
                        <p className="text-xs text-muted-foreground">shortlisted</p>
                      </div>
                      <div className="text-center">
                        <p className="font-display text-2xl font-semibold">{interviews}</p>
                        <p className="text-xs text-muted-foreground">interviews</p>
                      </div>
                      <div className="text-center">
                        <p className="font-display text-2xl font-semibold">{selected}</p>
                        <p className="text-xs text-muted-foreground">selected</p>
                      </div>
                      <div className="flex gap-2">
                        <Button asChild size="sm" variant="outline">
                          <Link to="/applicants/$jobId" params={{ jobId: job.id }}>
                            <FileText className="mr-2 h-4 w-4" />
                            Applicants
                          </Link>
                        </Button>
                        <Button asChild size="sm" variant="outline">
                          <Link to="/post-job" search={{ jobId: job.id }}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </Link>
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            if (
                              confirm(
                                "Are you sure you want to delete this job posting? This action cannot be undone.",
                              )
                            ) {
                              deleteJob.mutate(job.id);
                            }
                          }}
                          disabled={deleteJob.isPending}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </article>
                );
              })}
          </div>
        )}
      </section>
    </AppShell>
  );
}
