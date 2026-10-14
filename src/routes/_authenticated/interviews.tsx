import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { useCurrentUser } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, Video, MapPin, CheckCircle, AlertCircle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/interviews")({
  head: () => ({
    meta: [
      { title: "Interviews — HireSense AI" },
      {
        name: "description",
        content: "View your scheduled interviews, interview details, and preparation resources.",
      },
    ],
  }),
  component: InterviewsPage,
});

function InterviewsPage() {
  const { data: user } = useCurrentUser();

  const { data: interviews, isLoading } = useQuery({
    queryKey: ["interviews", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("applications")
        .select("*, jobs(title, company_name, location)")
        .eq("student_id", user!.id)
        .eq("status", "interview")
        .order("interview_date", { ascending: true })
        .order("interview_time", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const { data: allApplications } = useQuery({
    queryKey: ["my-applications", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("applications")
        .select("*, jobs(title, company_name)")
        .eq("student_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const stats = useMemo(() => {
    const apps = allApplications ?? [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return {
      total: apps.filter((a) => a.status === "interview").length,
      upcoming:
        interviews?.filter((i: any) => i.interview_date && new Date(i.interview_date) >= today)
          .length || 0,
      completed:
        interviews?.filter((i: any) => i.interview_date && new Date(i.interview_date) < today)
          .length || 0,
    };
  }, [allApplications, interviews]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcomingInterviews =
    interviews?.filter((i: any) => i.interview_date && new Date(i.interview_date) >= today) || [];

  const pastInterviews =
    interviews?.filter((i: any) => i.interview_date && new Date(i.interview_date) < today) || [];

  if (isLoading) {
    return (
      <AppShell title="Interviews" description="Loading interviews...">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Interviews"
      description="Track your scheduled interviews and access preparation resources."
      actions={
        <Button asChild variant="outline">
          <Link to="/applications">View applications</Link>
        </Button>
      }
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-4 shadow-card">
          <p className="text-sm text-muted-foreground">Total Interviews</p>
          <p className="mt-1 text-2xl font-bold">{stats.total}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-card">
          <p className="text-sm text-muted-foreground">Upcoming</p>
          <p className="mt-1 text-2xl font-bold">{stats.upcoming}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-card">
          <p className="text-sm text-muted-foreground">Completed</p>
          <p className="mt-1 text-2xl font-bold">{stats.completed}</p>
        </div>
      </div>

      {upcomingInterviews.length > 0 && (
        <section className="mt-8">
          <h2 className="text-lg font-semibold">Scheduled Interviews</h2>
          <div className="mt-4 space-y-4">
            {upcomingInterviews.map((interview: any) => (
              <article
                key={interview.id}
                className="rounded-xl border border-border bg-card p-5 shadow-card"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h3 className="font-semibold">{interview.jobs?.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {interview.jobs?.company_name}
                    </p>
                    {interview.jobs?.location && (
                      <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {interview.jobs.location}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    {interview.interview_date && (
                      <p className="flex items-center gap-1 text-sm font-medium">
                        <Calendar className="h-4 w-4 text-primary" />
                        {new Date(interview.interview_date).toLocaleDateString()}
                      </p>
                    )}
                    {interview.interview_time && (
                      <p className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {interview.interview_time}
                      </p>
                    )}
                    {interview.interview_type && (
                      <p className="mt-1 text-xs capitalize text-muted-foreground">
                        {interview.interview_type}
                      </p>
                    )}
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-3">
                  {interview.interview_type && (
                    <span className="rounded-full bg-primary-soft px-3 py-1 text-xs text-accent-foreground capitalize">
                      {interview.interview_type}
                    </span>
                  )}
                  {interview.interview_link && (
                    <Button size="sm" variant="outline" asChild>
                      <a href={interview.interview_link} target="_blank" rel="noopener noreferrer">
                        <Video className="mr-2 h-3 w-3" />
                        Join Meeting
                      </a>
                    </Button>
                  )}
                  <Button size="sm" asChild>
                    <Link to={`/applications`}>View Application</Link>
                  </Button>
                </div>
                {interview.interview_notes && (
                  <div className="mt-4 rounded-lg bg-muted/50 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Notes
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {interview.interview_notes}
                    </p>
                  </div>
                )}
              </article>
            ))}
          </div>
        </section>
      )}

      {pastInterviews.length > 0 && (
        <section className="mt-8">
          <h2 className="text-lg font-semibold">Past Interviews</h2>
          <div className="mt-4 space-y-4">
            {pastInterviews.map((interview: any) => (
              <article
                key={interview.id}
                className="rounded-xl border border-border bg-card p-5 shadow-card opacity-75"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h3 className="font-semibold">{interview.jobs?.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {interview.jobs?.company_name}
                    </p>
                    {interview.interview_date && (
                      <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {new Date(interview.interview_date).toLocaleDateString()}
                      </p>
                    )}
                    {interview.interview_time && (
                      <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {interview.interview_time}
                      </p>
                    )}
                  </div>
                  <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle className="h-4 w-4 text-success" />
                    <span>Completed</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {interviews?.length === 0 && (
        <div className="mt-8 rounded-xl border border-border bg-card p-10 text-center shadow-card">
          <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground" />
          <p className="mt-4 text-sm text-muted-foreground">
            No interviews scheduled yet. Keep applying to jobs and check back here for interview
            updates.
          </p>
          <Button asChild className="mt-4">
            <Link to="/jobs">Browse jobs</Link>
          </Button>
        </div>
      )}

      <section className="mt-8 rounded-xl border border-border bg-card p-6 shadow-card">
        <h2 className="text-lg font-semibold">Interview Preparation Tips</h2>
        <div className="mt-4 space-y-3">
          <div className="flex items-start gap-3 rounded-lg bg-info/10 p-4">
            <CheckCircle className="mt-0.5 h-5 w-5 text-info" />
            <div>
              <p className="font-medium">Research the company</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Learn about the company's products, culture, and recent news.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-lg bg-success/10 p-4">
            <CheckCircle className="mt-0.5 h-5 w-5 text-success" />
            <div>
              <p className="font-medium">Review your application</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Refresh your memory on the job description and your match score explanation.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-lg bg-muted/50 p-4">
            <CheckCircle className="mt-0.5 h-5 w-5 text-muted-foreground" />
            <div>
              <p className="font-medium">Practice common questions</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Prepare answers for common interview questions and behavioral scenarios.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-lg bg-warning/10 p-4">
            <CheckCircle className="mt-0.5 h-5 w-5 text-warning-foreground" />
            <div>
              <p className="font-medium">Prepare questions to ask</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Have thoughtful questions ready about the role, team, and company.
              </p>
            </div>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
