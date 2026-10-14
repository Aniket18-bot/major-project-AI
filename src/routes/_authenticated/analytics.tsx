import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppShell, StatCard } from "@/components/AppShell";
import { HiringCharts } from "@/components/HiringCharts";
import { useCurrentUser } from "@/lib/session";
import { APPLICATION_STATUSES, STATUS_LABEL, type ApplicationStatus } from "@/lib/status";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/analytics")({
  head: () => ({
    meta: [
      { title: "Hiring analytics — HireSense AI" },
      {
        name: "description",
        content:
          "Recruitment analytics across your roles: applicant funnel, score distribution, most in-demand skills and the biggest skill gaps in your pipeline.",
      },
      { property: "og:title", content: "Hiring analytics — HireSense AI" },
      {
        property: "og:description",
        content: "Funnel, score distribution and skill-gap analytics for your pipeline.",
      },
    ],
  }),
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const { data: user } = useCurrentUser();
  const [timeFilter, setTimeFilter] = useState<"7d" | "30d" | "90d" | "all">("all");
  const [selectedJob, setSelectedJob] = useState<string>("all");

  const { data } = useQuery({
    queryKey: ["analytics", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data: jobs, error } = await supabase
        .from("jobs")
        .select(
          "id, title, required_skills, applications(id, status, match_score, missing_skills, matched_skills, created_at)",
        )
        .eq("recruiter_id", user!.id);
      if (error) throw error;
      return jobs;
    },
  });

  const jobs = data ?? [];
  const applications = jobs.flatMap((job) => job.applications ?? []);

  // Filter applications based on time
  const filteredApplications = applications.filter((app) => {
    if (timeFilter === "all") return true;
    const now = new Date();
    const appDate = new Date(app.created_at);
    const daysDiff = Math.floor((now.getTime() - appDate.getTime()) / (1000 * 60 * 60 * 24));
    return daysDiff <= parseInt(timeFilter);
  });

  // Filter by job if selected
  const finalApplications =
    selectedJob === "all"
      ? filteredApplications
      : filteredApplications.filter((app) => {
          const job = jobs.find((j: any) => j.id === selectedJob);
          return job && job.applications?.some((a: any) => a.id === app.id);
        });

  const funnel = APPLICATION_STATUSES.map((status) => ({
    status,
    count: finalApplications.filter((a) => a.status === status).length,
  }));

  const buckets = [
    { label: "0–39%", min: 0, max: 39 },
    { label: "40–59%", min: 40, max: 59 },
    { label: "60–74%", min: 60, max: 74 },
    { label: "75–89%", min: 75, max: 89 },
    { label: "90–100%", min: 90, max: 100 },
  ].map((bucket) => ({
    ...bucket,
    count: finalApplications.filter((a) => {
      const score = Number(a.match_score ?? 0);
      return score >= bucket.min && score <= bucket.max;
    }).length,
  }));

  const gapCount = new Map<string, number>();
  finalApplications.forEach((application) =>
    (application.missing_skills ?? []).forEach((skill) =>
      gapCount.set(skill, (gapCount.get(skill) ?? 0) + 1),
    ),
  );
  const gaps = [...gapCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);

  const demandCount = new Map<string, number>();
  jobs.forEach((job) =>
    (job.required_skills ?? []).forEach((skill) =>
      demandCount.set(skill, (demandCount.get(skill) ?? 0) + 1),
    ),
  );
  const demand = [...demandCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);

  const selected = finalApplications.filter((a) => a.status === "selected").length;
  const shortlisted = finalApplications.filter((a) => a.status === "shortlisted").length;
  const interviewed = finalApplications.filter((a) => a.status === "interview").length;
  const conversion = finalApplications.length
    ? Math.round((selected / finalApplications.length) * 100)
    : 0;
  const shortlistRate = finalApplications.length
    ? Math.round((shortlisted / finalApplications.length) * 100)
    : 0;
  const interviewRate = finalApplications.length
    ? Math.round((interviewed / finalApplications.length) * 100)
    : 0;
  const maxFunnel = Math.max(1, ...funnel.map((row) => row.count));
  const maxBucket = Math.max(1, ...buckets.map((row) => row.count));

  return (
    <AppShell
      title="Hiring analytics"
      description="How your pipeline is performing, and where candidate skills fall short of your requirements."
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Open roles" value={jobs.length} />
        <StatCard label="Total applications" value={finalApplications.length} />
        <StatCard label="Offer conversion" value={`${conversion}%`} hint="Selected / applied" />
        <StatCard label="Shortlist rate" value={`${shortlistRate}%`} hint="Shortlisted / applied" />
        <StatCard label="Interview rate" value={`${interviewRate}%`} hint="Interviewed / applied" />
        <StatCard
          label="Strong matches"
          value={finalApplications.filter((a) => Number(a.match_score ?? 0) >= 75).length}
        />
      </div>

      {/* Filter Controls */}
      <div className="flex flex-wrap items-center gap-4 rounded-xl border border-border bg-card p-4 shadow-card">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Time Period:</span>
          <div className="flex gap-1">
            {[
              { value: "7d", label: "7 Days" },
              { value: "30d", label: "30 Days" },
              { value: "90d", label: "90 Days" },
              { value: "all", label: "All Time" },
            ].map((option) => (
              <button
                key={option.value}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  timeFilter === option.value
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted hover:bg-muted/80"
                }`}
                onClick={() => setTimeFilter(option.value as any)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Job:</span>
          <select
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            value={selectedJob}
            onChange={(e) => setSelectedJob(e.target.value)}
          >
            <option value="all">All Jobs</option>
            {jobs.map((job: any) => (
              <option key={job.id} value={job.id}>
                {job.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      <HiringCharts
        applications={finalApplications}
        jobsPosted={jobs.map((job) => ({
          title: job.title,
          count: (job.applications ?? []).length,
        }))}
      />

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-border bg-card p-6 shadow-card">
          <h2 className="text-base font-semibold">Applicant funnel</h2>
          <ul className="mt-4 space-y-3">
            {funnel.map((row) => (
              <li key={row.status}>
                <div className="flex justify-between text-sm">
                  <span>{STATUS_LABEL[row.status as ApplicationStatus]}</span>
                  <span className="font-medium">{row.count}</span>
                </div>
                <div className="mt-1 h-2 rounded-full bg-muted">
                  <div
                    className="h-2 rounded-full bg-primary"
                    style={{ width: `${(row.count / maxFunnel) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-xl border border-border bg-card p-6 shadow-card">
          <h2 className="text-base font-semibold">Match score distribution</h2>
          <div className="mt-6 flex h-48 items-end gap-3">
            {buckets.map((bucket) => (
              <div key={bucket.label} className="flex flex-1 flex-col items-center gap-2">
                <span className="text-xs font-medium">{bucket.count}</span>
                <div
                  className="w-full rounded-t-md bg-primary/80"
                  style={{ height: `${(bucket.count / maxBucket) * 100}%`, minHeight: "4px" }}
                />
                <span className="text-[10px] text-muted-foreground">{bucket.label}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-6 shadow-card">
          <h2 className="text-base font-semibold">Most requested skills</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {demand.map(([skill, count]) => (
              <li key={skill} className="flex justify-between">
                <span className="capitalize">{skill}</span>
                <span className="text-muted-foreground">{count} roles</span>
              </li>
            ))}
            {demand.length === 0 ? (
              <li className="text-muted-foreground">Post a job to see demand data.</li>
            ) : null}
          </ul>
        </section>

        <section className="rounded-xl border border-border bg-card p-6 shadow-card">
          <h2 className="text-base font-semibold">Biggest skill gaps</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Skills your applicants most often lack — useful for training or relaxing criteria.
          </p>
          <ul className="mt-4 space-y-2 text-sm">
            {gaps.map(([skill, count]) => (
              <li key={skill} className="flex justify-between">
                <span className="capitalize">{skill}</span>
                <span className="text-muted-foreground">{count} candidates</span>
              </li>
            ))}
            {gaps.length === 0 ? (
              <li className="text-muted-foreground">No applications analysed yet.</li>
            ) : null}
          </ul>
        </section>

        <section className="rounded-xl border border-border bg-card p-6 shadow-card">
          <h2 className="text-base font-semibold">Application Status Distribution</h2>
          <div className="mt-4 flex h-48 items-end gap-2">
            {funnel.map((row) => (
              <div key={row.status} className="flex flex-1 flex-col items-center gap-2">
                <span className="text-xs font-medium">{row.count}</span>
                <div
                  className="w-full rounded-t-md bg-primary/80"
                  style={{ height: `${(row.count / maxFunnel) * 100}%`, minHeight: "4px" }}
                />
                <span className="text-[10px] text-muted-foreground leading-tight text-center">
                  {STATUS_LABEL[row.status as ApplicationStatus].split(" ")[0]}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-6 shadow-card">
          <h2 className="text-base font-semibold">Job Performance</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {jobs.map((job: any) => (
              <li key={job.id} className="flex justify-between items-center">
                <span className="capitalize">{job.title}</span>
                <div className="flex items-center gap-3">
                  <span className="text-muted-foreground">
                    {(job.applications ?? []).length} apps
                  </span>
                  <span className="text-muted-foreground">
                    {job.applications?.length > 0
                      ? Math.round(
                          job.applications.reduce(
                            (sum: number, a: any) => sum + (a.match_score ?? 0),
                            0,
                          ) / job.applications.length,
                        )
                      : 0}
                    % avg
                  </span>
                </div>
              </li>
            ))}
            {jobs.length === 0 ? (
              <li className="text-muted-foreground">No jobs posted yet.</li>
            ) : null}
          </ul>
        </section>

        <section className="rounded-xl border border-border bg-card p-6 shadow-card">
          <h2 className="text-base font-semibold">Top Candidate Skills</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Skills most commonly found in your applicant pool.
          </p>
          <ul className="mt-4 space-y-2 text-sm">
            {demand.map(([skill, count]) => (
              <li key={skill} className="flex justify-between">
                <span className="capitalize">{skill}</span>
                <span className="text-muted-foreground">{count} candidates</span>
              </li>
            ))}
            {demand.length === 0 ? (
              <li className="text-muted-foreground">No candidate data yet.</li>
            ) : null}
          </ul>
        </section>
      </div>
    </AppShell>
  );
}
