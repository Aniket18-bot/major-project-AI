import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { useCurrentUser } from "@/lib/session";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  Clock,
  Video,
  MapPin,
  User,
  Briefcase,
  CheckCircle,
  AlertCircle,
  FileText,
  GraduationCap,
  ArrowLeft,
  Download,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/interviews/$id")({
  head: () => ({
    meta: [
      { title: "Interview Details — HireSense AI" },
      {
        name: "description",
        content: "View interview details, preparation tips, and AI-powered interview guidance.",
      },
    ],
  }),
  component: InterviewDetailsPage,
});

function InterviewDetailsPage() {
  const { id } = Route.useParams();
  const { data: user } = useCurrentUser();

  const { data: interview, isLoading } = useQuery({
    queryKey: ["interview", id, user?.id],
    enabled: !!user?.id && !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("applications")
        .select("*, jobs(*), profiles(full_name, headline, skills, experience, education)")
        .eq("id", id)
        .eq("student_id", user!.id)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user!.id)
        .single();
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <AppShell title="Interview Details" description="Loading interview details...">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </AppShell>
    );
  }

  if (!interview) {
    return (
      <AppShell title="Interview Details" description="Interview not found">
        <div className="rounded-xl border border-border bg-card p-10 text-center shadow-card">
          <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground" />
          <p className="mt-4 text-sm text-muted-foreground">
            Interview not found or you don't have access to view it.
          </p>
          <Button asChild className="mt-4">
            <Link to="/interviews">Back to interviews</Link>
          </Button>
        </div>
      </AppShell>
    );
  }

  const job = interview.jobs as any;
  const candidateProfile = interview.profiles as any;
  const skills = candidateProfile?.skills || [];
  const experience = candidateProfile?.experience || [];
  const education = candidateProfile?.education || [];

  // Extract key skills from the job description
  const jobSkills = job?.required_skills?.split(",").map((s: string) => s.trim()) || [];
  const matchedSkills = skills.filter((s: string) =>
    jobSkills.some((js: string) => js.toLowerCase().includes(s.toLowerCase())),
  );
  const missingSkills = jobSkills.filter(
    (js: string) => !skills.some((s: string) => s.toLowerCase().includes(js.toLowerCase())),
  );

  const isUpcoming =
    interview.interview_scheduled_at && new Date(interview.interview_scheduled_at) > new Date();

  return (
    <AppShell
      title="Interview Details"
      description="View interview details and prepare with AI-powered guidance."
      actions={
        <Button asChild variant="outline">
          <Link to="/interviews">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Interviews
          </Link>
        </Button>
      }
    >
      {/* Interview Header */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-card">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{job?.title}</h1>
            <p className="mt-1 text-lg text-muted-foreground">{job?.company_name}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {job?.location && (
                <span className="flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs">
                  <MapPin className="h-3 w-3" />
                  {job.location}
                </span>
              )}
              {job?.employment_type && (
                <span className="rounded-full bg-muted px-3 py-1 text-xs capitalize">
                  {job.employment_type}
                </span>
              )}
              {job?.work_mode && (
                <span className="rounded-full bg-muted px-3 py-1 text-xs capitalize">
                  {job.work_mode}
                </span>
              )}
            </div>
          </div>
          <div className="text-right">
            {interview.interview_scheduled_at && (
              <p className="flex items-center gap-2 text-lg font-semibold">
                <Calendar className="h-5 w-5 text-primary" />
                {new Date(interview.interview_scheduled_at).toLocaleDateString()}
              </p>
            )}
            {interview.interview_scheduled_at && (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                {new Date(interview.interview_scheduled_at).toLocaleTimeString()}
              </p>
            )}
            {isUpcoming && (
              <div className="mt-2 flex items-center gap-2 text-sm text-success">
                <CheckCircle className="h-4 w-4" />
                <span>Upcoming</span>
              </div>
            )}
          </div>
        </div>

        {/* Interview Type & Link */}
        <div className="mt-6 flex flex-wrap gap-4">
          {interview.interview_type && (
            <div className="flex items-center gap-2">
              <Video className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium capitalize">{interview.interview_type}</span>
            </div>
          )}
          {interview.interview_link && (
            <Button size="sm" asChild>
              <a href={interview.interview_link} target="_blank" rel="noopener noreferrer">
                <Video className="mr-2 h-4 w-4" />
                Join Meeting
              </a>
            </Button>
          )}
        </div>

        {interview.interview_notes && (
          <div className="mt-6 rounded-lg bg-muted/50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Interview Notes
            </p>
            <p className="mt-2 text-sm">{interview.interview_notes}</p>
          </div>
        )}
      </div>

      {/* Match Score & Status */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5 shadow-card">
          <p className="text-sm text-muted-foreground">Match Score</p>
          <p className="mt-2 text-3xl font-bold">{interview.match_score || 0}%</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Your profile matches {interview.match_score || 0}% of job requirements
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-card">
          <p className="text-sm text-muted-foreground">Application Status</p>
          <p className="mt-2 text-3xl font-bold capitalize">{interview.status}</p>
          <p className="mt-1 text-xs text-muted-foreground">Current stage in hiring process</p>
        </div>
      </div>

      {/* Key Skills to Revise */}
      <div className="mt-6 rounded-xl border border-border bg-card p-6 shadow-card">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Key Skills to Revise
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-sm font-medium text-success">Matched Skills</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {matchedSkills.length > 0 ? (
                matchedSkills.map((skill: string, idx: number) => (
                  <span
                    key={idx}
                    className="rounded-full bg-success/10 px-3 py-1 text-xs text-success"
                  >
                    {skill}
                  </span>
                ))
              ) : (
                <p className="text-xs text-muted-foreground">No matched skills found</p>
              )}
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-warning">Skills to Focus On</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {missingSkills.length > 0 ? (
                missingSkills.map((skill: string, idx: number) => (
                  <span
                    key={idx}
                    className="rounded-full bg-warning/10 px-3 py-1 text-xs text-warning-foreground"
                  >
                    {skill}
                  </span>
                ))
              ) : (
                <p className="text-xs text-muted-foreground">All skills matched!</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Preparation Tips */}
      <div className="mt-6 rounded-xl border border-border bg-card p-6 shadow-card">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <CheckCircle className="h-5 w-5" />
          Preparation Tips
        </h2>
        <div className="mt-4 space-y-4">
          <div className="flex items-start gap-3 rounded-lg bg-info/10 p-4">
            <CheckCircle className="mt-0.5 h-5 w-5 text-info" />
            <div>
              <p className="font-medium">Research the Company</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Learn about {job?.company_name}'s products, culture, values, and recent news.
                Understand their business model and competitive landscape.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-lg bg-success/10 p-4">
            <CheckCircle className="mt-0.5 h-5 w-5 text-success" />
            <div>
              <p className="font-medium">Review the Job Description</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Refresh your understanding of the role requirements, responsibilities, and how your
                experience aligns with them. Your match score is {interview.match_score || 0}%.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-lg bg-muted/50 p-4">
            <CheckCircle className="mt-0.5 h-5 w-5 text-muted-foreground" />
            <div>
              <p className="font-medium">Practice Technical Questions</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Focus on {jobSkills.slice(0, 3).join(", ")}. Be ready to discuss your projects and
                how you've applied these skills in real scenarios.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-lg bg-warning/10 p-4">
            <CheckCircle className="mt-0.5 h-5 w-5 text-warning-foreground" />
            <div>
              <p className="font-medium">Prepare Behavioral Examples</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Use the STAR method (Situation, Task, Action, Result) to answer behavioral
                questions. Have examples ready for teamwork, challenges, and achievements.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-lg bg-primary/10 p-4">
            <CheckCircle className="mt-0.5 h-5 w-5 text-primary" />
            <div>
              <p className="font-medium">Prepare Questions to Ask</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Ask about team structure, projects you'll work on, company culture, growth
                opportunities, and expectations for the first 90 days.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Your Profile Snapshot */}
      <div className="mt-6 rounded-xl border border-border bg-card p-6 shadow-card">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <User className="h-5 w-5" />
          Your Profile Snapshot
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-sm font-medium">Skills</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {skills.slice(0, 8).map((skill: string, idx: number) => (
                <span key={idx} className="rounded-full bg-muted px-2 py-1 text-xs">
                  {skill}
                </span>
              ))}
              {skills.length > 8 && (
                <span className="rounded-full bg-muted px-2 py-1 text-xs">
                  +{skills.length - 8} more
                </span>
              )}
            </div>
          </div>
          <div>
            <p className="text-sm font-medium">Experience</p>
            <div className="mt-2 space-y-1">
              {experience.slice(0, 2).map((exp: any, idx: number) => (
                <p key={idx} className="text-xs text-muted-foreground">
                  {exp.title} at {exp.company}
                </p>
              ))}
              {experience.length > 2 && (
                <p className="text-xs text-muted-foreground">+{experience.length - 2} more</p>
              )}
            </div>
          </div>
          <div>
            <p className="text-sm font-medium">Education</p>
            <div className="mt-2 space-y-1">
              {education.slice(0, 2).map((edu: any, idx: number) => (
                <p key={idx} className="text-xs text-muted-foreground">
                  {edu.degree} in {edu.field}
                </p>
              ))}
              {education.length > 2 && (
                <p className="text-xs text-muted-foreground">+{education.length - 2} more</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-6 flex flex-wrap gap-3">
        <Button asChild variant="outline">
          <Link to={`/applications`}>
            <Briefcase className="mr-2 h-4 w-4" />
            View Application
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link to={`/profile`}>
            <User className="mr-2 h-4 w-4" />
            Update Profile
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link to={`/skill-gap`}>
            <GraduationCap className="mr-2 h-4 w-4" />
            View Skill Gap
          </Link>
        </Button>
      </div>
    </AppShell>
  );
}
