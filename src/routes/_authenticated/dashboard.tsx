import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppShell, StatCard } from "@/components/AppShell";
import { useCurrentUser, useProfile } from "@/lib/session";
import { STATUS_CLASS, STATUS_LABEL, type ApplicationStatus } from "@/lib/status";
import { Button } from "@/components/ui/button";
import { calculateProfileCompletion } from "@/lib/profile-completion";
import { TrendingUp, AlertCircle, Calendar, BookOpen, Award, Briefcase, Bell } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Student dashboard — HireSense AI" },
      {
        name: "description",
        content:
          "Track every job you applied to, your AI match score, current hiring stage and the explanation behind each decision.",
      },
      { property: "og:title", content: "Student dashboard — HireSense AI" },
      {
        property: "og:description",
        content: "Application tracking with AI match scores and transparent decision explanations.",
      },
    ],
  }),
  component: StudentDashboard,
});
function StudentDashboard() {
  const { data: user } = useCurrentUser();
  const { data: profile } = useProfile();

  const { data: applications } = useQuery({
    queryKey: ["my-applications", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("applications")
        .select("*, jobs(title, company_name, location)")
        .eq("student_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: openJobs } = useQuery({
    queryKey: ["open-jobs-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("jobs")
        .select("id", { count: "exact", head: true })
        .eq("status", "open");
      if (error) throw error;
      return count ?? 0;
    },
  });

  const { data: resumes } = useQuery({
    queryKey: ["resumes", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("resumes")
        .select("ats_score, health_score")
        .eq("student_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(1);
      if (error) throw error;
      return data;
    },
  });

  const { data: recommendedJobs } = useQuery({
    queryKey: ["recommended-jobs", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select("*")
        .eq("status", "open")
        .order("created_at", { ascending: false })
        .limit(3);
      if (error) throw error;
      return data;
    },
  });

  const { data: interviews } = useQuery({
    queryKey: ["upcoming-interviews", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("applications")
        .select("*, jobs(title, company_name)")
        .eq("student_id", user!.id)
        .eq("status", "interview")
        .gte("interview_scheduled_at", new Date().toISOString())
        .order("interview_scheduled_at", { ascending: true })
        .limit(3);
      if (error) throw error;
      return data;
    },
  });

  if (profile && profile.role === "recruiter") {
    return (
      <AppShell title="Recruiter workspace" description="Your account is set up as a recruiter.">
        <Button asChild>
          <Link to="/recruiter">Go to recruiter dashboard</Link>
        </Button>
      </AppShell>
    );
  }

  const list = applications ?? [];
  const avgScore = list.length
    ? Math.round(list.reduce((sum, a) => sum + Number(a.match_score ?? 0), 0) / list.length)
    : 0;
  const active = list.filter((a) => !["rejected", "selected"].includes(a.status as string)).length;
  const shortlisted = list.filter((a) => a.status === "shortlisted").length;
  const interviewCount = list.filter((a) => a.status === "interview").length;
  const selected = list.filter((a) => a.status === "selected").length;
  const profileCompletion = profile ? calculateProfileCompletion(profile as any) : 0;
  const resumeAtsScore = (resumes?.[0] as any)?.ats_score ?? null;
  const resumeHealth = (resumes?.[0] as any)?.health_score ?? null;

  return (
    <AppShell
      title={`Hi ${profile?.full_name?.split(" ")[0] || "there"} 👋`}
      description="Your live hiring pipeline — every status change comes with an explanation."
      actions={
        <Button asChild>
          <Link to="/jobs">Browse jobs</Link>
        </Button>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Profile completion"
          value={`${profileCompletion}%`}
          hint="Complete your profile"
        />
        <StatCard
          label="Resume ATS score"
          value={resumeAtsScore ? `${Math.round(resumeAtsScore)}%` : "—"}
          hint={resumeHealth ? `Health: ${Math.round(resumeHealth)}%` : "Upload resume"}
        />
        <StatCard label="Applications" value={list.length} hint="Total applied" />
        <StatCard label="In screening" value={active} hint="Not yet closed" />
        <StatCard label="Shortlisted" value={shortlisted} hint="Interview ready" />
        <StatCard label="Interviews" value={interviewCount} hint="Scheduled" />
        <StatCard label="Selected" value={selected} hint="Offers received" />
        <StatCard label="Avg match score" value={`${avgScore}%`} hint="Across all applications" />
      </div>

      {/* Recommended Jobs Section */}
      {(recommendedJobs ?? []).length > 0 && (
        <section className="mt-8 rounded-xl border border-border bg-card shadow-card">
          <header className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="text-base font-semibold">Recommended jobs</h2>
            <Link to="/jobs" className="text-sm font-medium text-primary hover:underline">
              View all jobs
            </Link>
          </header>
          <div className="p-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {recommendedJobs?.slice(0, 3).map((job) => (
              <article key={job.id} className="rounded-lg border border-border bg-muted/30 p-4">
                <h3 className="font-semibold">{job.title}</h3>
                <p className="text-sm text-muted-foreground">{job.company_name}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {job.location} · {job.employment_type}
                </p>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* Skill Gap Preview */}
      {profile?.skills && profile.skills.length > 0 && (
        <section className="mt-8 rounded-xl border border-border bg-card shadow-card">
          <header className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="text-base font-semibold">Your skills</h2>
            <Link to="/profile" className="text-sm font-medium text-primary hover:underline">
              Manage
            </Link>
          </header>
          <div className="p-5">
            <div className="flex flex-wrap gap-2">
              {profile.skills.slice(0, 8).map((skill) => (
                <span
                  key={skill}
                  className="rounded-full bg-primary-soft px-3 py-1 text-xs text-accent-foreground"
                >
                  {skill}
                </span>
              ))}
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              You have {profile.skills.length} skills. Add more to improve your match scores.
            </p>
          </div>
        </section>
      )}

      <section className="mt-8 rounded-xl border border-border bg-card shadow-card">
        <header className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-base font-semibold">Track your applications</h2>
          <Link to="/applications" className="text-sm font-medium text-primary hover:underline">
            View all
          </Link>
        </header>
        {list.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <p className="text-sm text-muted-foreground">
              You haven't applied to anything yet. Add your skills in your profile, then apply — the
              AI scores you against every job description.
            </p>
            <div className="mt-4 flex justify-center gap-2">
              <Button asChild variant="outline">
                <Link to="/profile">Complete profile</Link>
              </Button>
              <Button asChild>
                <Link to="/jobs">Find jobs</Link>
              </Button>
            </div>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {list.slice(0, 5).map((application) => (
              <li key={application.id} className="px-5 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{application.jobs?.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {application.jobs?.company_name}
                      {application.jobs?.location ? ` · ${application.jobs.location}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold">
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
                <p className="mt-2 text-xs text-muted-foreground">
                  Stage: {application.stage}
                  {application.explanation ? ` — ${application.explanation}` : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </AppShell>
  );
}
