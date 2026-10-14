import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { useCurrentUser, useProfile } from "@/lib/session";
import { scoreCandidate } from "@/lib/matching";
import { tailorResume } from "@/lib/ai";
import { profileSnapshot } from "@/lib/profile-snapshot";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  MapPin,
  Clock,
  Building2,
  Bookmark,
  BookmarkCheck,
  ArrowLeft,
  CheckCircle,
  XCircle,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/jobs/$jobId")({
  head: () => ({
    meta: [
      { title: "Job details — HireSense AI" },
      {
        name: "description",
        content: "View detailed job information, AI match score breakdown, and apply.",
      },
    ],
  }),
  component: JobDetailsPage,
});

function JobDetailsPage() {
  const { jobId } = Route.useParams();
  const { data: user } = useCurrentUser();
  const { data: profile } = useProfile();
  const queryClient = useQueryClient();
  const [tailoring, setTailoring] = useState(false);
  const [showTailorModal, setShowTailorModal] = useState(false);
  const [tailoredResume, setTailoredResume] = useState("");
  const [editingResume, setEditingResume] = useState(false);

  const { data: job } = useQuery({
    queryKey: ["job", jobId],
    queryFn: async () => {
      const { data, error } = await supabase.from("jobs").select("*").eq("id", jobId).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: application } = useQuery({
    queryKey: ["my-application", jobId, user?.id],
    enabled: !!user?.id && !!jobId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("applications")
        .select("*")
        .eq("job_id", jobId)
        .eq("student_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: savedJobs } = useQuery({
    queryKey: ["saved-jobs", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("achievements")
        .eq("id", user!.id)
        .single();
      if (error) throw error;
      const achievements = (data as any).achievements || [];
      const savedJobsArray = achievements
        .filter((item: any) => item.type === "saved_job")
        .map((item: any) => item.job_id);
      return new Set(savedJobsArray);
    },
  });

  const { data: resumes } = useQuery({
    queryKey: ["resumes", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("resumes")
        .select("id, title, content, job_id")
        .eq("student_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const toggleSave = useMutation({
    mutationFn: async (jobId: string) => {
      if (!user) throw new Error("Sign in required");
      const isSaved = savedJobs?.has(jobId);

      // Get current achievements
      const { data: profile } = await supabase
        .from("profiles")
        .select("achievements")
        .eq("id", user.id)
        .single();

      const currentAchievements = (profile as any).achievements || [];
      const savedJobEntries = currentAchievements.filter((item: any) => item.type === "saved_job");
      const otherAchievements = currentAchievements.filter(
        (item: any) => item.type !== "saved_job",
      );

      let newAchievements: any[];
      if (isSaved) {
        newAchievements = otherAchievements;
      } else {
        newAchievements = [
          ...otherAchievements,
          { type: "saved_job", job_id: jobId, saved_at: new Date().toISOString() },
        ];
      }

      const { error } = await supabase
        .from("profiles")
        .update({ achievements: newAchievements as any })
        .eq("id", user.id);
      if (error) throw error;
    },
    onSuccess: (_, jobId) => {
      queryClient.invalidateQueries({ queryKey: ["saved-jobs"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast.success(savedJobs?.has(jobId) ? "Job removed from saved" : "Job saved");
    },
  });

  const applyMutation = useMutation({
    mutationFn: async (tailor: boolean) => {
      if (!job || !user) throw new Error("Job not available");
      const result = scoreCandidate({
        candidateSkills: profile?.skills ?? [],
        requiredSkills: job.required_skills,
        preferredSkills: job.preferred_skills,
        candidateExperience: profile?.years_experience ?? 0,
        minExperience: job.min_experience,
      });

      let resumeId =
        resumes?.find((resume) => resume.job_id === job.id)?.id ?? resumes?.[0]?.id ?? null;
      if (tailor) {
        setTailoring(true);
        const { content } = await tailorResume({
          data: {
            profile: profileSnapshot(profile),
            baseResume: resumes?.[0]?.content ?? "",
            job: {
              title: job.title,
              company_name: job.company_name,
              description: job.description,
              required_skills: job.required_skills,
              preferred_skills: job.preferred_skills,
            },
          },
        });
        setTailoredResume(content);
        setShowTailorModal(true);
        setTailoring(false);
        return { result, content, tailored: true };
      }

      const { error } = await supabase.from("applications").insert({
        job_id: job.id,
        student_id: user.id,
        match_score: result.score,
        matched_skills: result.matched,
        missing_skills: result.missing,
        explanation: result.explanation,
        resume_id: resumeId,
      });
      if (error) throw error;
      return { result, tailored: false };
    },
    onSuccess: (data) => {
      if (!data.tailored) {
        toast.success(`Applied — AI match score ${data.result.score}%`);
        queryClient.invalidateQueries({ queryKey: ["my-application", jobId] });
        queryClient.invalidateQueries({ queryKey: ["my-application-ids"] });
        queryClient.invalidateQueries({ queryKey: ["resumes"] });
      }
    },
    onError: (error) => {
      setTailoring(false);
      toast.error(error instanceof Error ? error.message : "Could not submit application");
    },
  });

  const submitTailoredApplication = useMutation({
    mutationFn: async (resumeContent: string) => {
      if (!job || !user) throw new Error("Job not available");
      const result = scoreCandidate({
        candidateSkills: profile?.skills ?? [],
        requiredSkills: job.required_skills,
        preferredSkills: job.preferred_skills,
        candidateExperience: profile?.years_experience ?? 0,
        minExperience: job.min_experience,
      });

      const { data: saved, error: resumeError } = await supabase
        .from("resumes")
        .insert({
          student_id: user.id,
          title: `Applied · ${job.title}`,
          content: resumeContent,
          source: "tailored",
          job_id: job.id,
        })
        .select("id")
        .single();
      if (resumeError) throw resumeError;

      const { error } = await supabase.from("applications").insert({
        job_id: job.id,
        student_id: user.id,
        match_score: result.score,
        matched_skills: result.matched,
        missing_skills: result.missing,
        explanation: result.explanation,
        resume_id: saved.id,
      });
      if (error) throw error;
      return result;
    },
    onSuccess: (result) => {
      toast.success(`Applied — AI match score ${result.score}%`);
      setShowTailorModal(false);
      setTailoredResume("");
      setEditingResume(false);
      queryClient.invalidateQueries({ queryKey: ["my-application", jobId] });
      queryClient.invalidateQueries({ queryKey: ["my-application-ids"] });
      queryClient.invalidateQueries({ queryKey: ["resumes"] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not submit application");
    },
  });

  if (!job) {
    return (
      <AppShell
        title="Job not found"
        description="The job you're looking for doesn't exist or has been closed."
      >
        <Button asChild>
          <Link to="/jobs">Browse all jobs</Link>
        </Button>
      </AppShell>
    );
  }

  const matchResult = scoreCandidate({
    candidateSkills: profile?.skills ?? [],
    requiredSkills: job.required_skills,
    preferredSkills: job.preferred_skills,
    candidateExperience: profile?.years_experience ?? 0,
    minExperience: job.min_experience,
  });

  const isSaved = savedJobs?.has(job.id);
  const hasApplied = !!application;

  return (
    <AppShell title={job.title} description={`${job.company_name} · ${job.location || "Remote"}`}>
      <Button asChild variant="ghost" size="sm">
        <Link to="/jobs">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to jobs
        </Link>
      </Button>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <section className="rounded-xl border border-border bg-card p-6 shadow-card">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold">{job.title}</h1>
                <p className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Building2 className="size-4" />
                    {job.company_name}
                  </span>
                  {job.location && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="size-4" />
                      {job.location}
                    </span>
                  )}
                  {job.employment_type && (
                    <span className="inline-flex items-center gap-1">
                      <Clock className="size-4" />
                      {job.employment_type}
                    </span>
                  )}
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => toggleSave.mutate(job.id)}>
                {isSaved ? (
                  <BookmarkCheck className="h-4 w-4 text-primary" />
                ) : (
                  <Bookmark className="h-4 w-4" />
                )}
              </Button>
            </div>

            <div className="mt-4 flex flex-wrap gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Experience:</span>{" "}
                <span className="font-medium">
                  {job.min_experience ? `${job.min_experience}+ years` : "Any"}
                </span>
              </div>
              {job.salary_min && job.salary_max && (
                <div>
                  <span className="text-muted-foreground">Salary:</span>{" "}
                  <span className="font-medium">
                    {job.salary_min}–{job.salary_max} LPA
                  </span>
                </div>
              )}
              {job.work_mode && (
                <div>
                  <span className="text-muted-foreground">Work Mode:</span>{" "}
                  <span className="font-medium capitalize">{job.work_mode}</span>
                </div>
              )}
            </div>

            <div className="mt-6">
              <h2 className="text-base font-semibold">Description</h2>
              <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
                {job.description}
              </p>
            </div>

            {job.responsibilities && (
              <div className="mt-6">
                <h2 className="text-base font-semibold">Responsibilities</h2>
                <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
                  {job.responsibilities}
                </p>
              </div>
            )}
          </section>

          <section className="rounded-xl border border-border bg-card p-6 shadow-card">
            <h2 className="text-base font-semibold">Required Skills</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {job.required_skills.map((skill) => (
                <span
                  key={skill}
                  className={`rounded-full px-3 py-1 text-sm ${
                    matchResult.matched.includes(skill)
                      ? "bg-success/15 text-success"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {matchResult.matched.includes(skill) ? (
                    <CheckCircle className="mr-1 inline h-3 w-3" />
                  ) : (
                    <XCircle className="mr-1 inline h-3 w-3" />
                  )}
                  {skill}
                </span>
              ))}
            </div>

            {job.preferred_skills.length > 0 && (
              <>
                <h2 className="mt-6 text-base font-semibold">Preferred Skills</h2>
                <div className="mt-3 flex flex-wrap gap-2">
                  {job.preferred_skills.map((skill) => (
                    <span
                      key={skill}
                      className="rounded-full bg-info/15 px-3 py-1 text-sm text-info"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </>
            )}
          </section>

          {matchResult.missing.length > 0 && (
            <section className="rounded-xl border border-border bg-card p-6 shadow-card">
              <h2 className="text-base font-semibold">Skill Gaps</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Consider learning these skills to improve your match:
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {matchResult.missing.map((skill) => (
                  <span
                    key={skill}
                    className="rounded-full bg-warning/15 px-3 py-1 text-sm text-warning-foreground"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </section>
          )}
        </div>

        <div className="space-y-6">
          <section className="rounded-xl border border-border bg-card p-6 shadow-card">
            <h2 className="text-base font-semibold">AI Match Score</h2>
            <div className="mt-4 text-center">
              <p className="text-5xl font-bold text-primary">{matchResult.score}%</p>
              <p className="mt-2 text-sm text-muted-foreground">Overall Match</p>
            </div>

            <div className="mt-6 space-y-3">
              <div>
                <div className="flex justify-between text-sm">
                  <span>Skills</span>
                  <span className="font-medium">
                    {Math.round((matchResult.matched.length / job.required_skills.length) * 100)}%
                  </span>
                </div>
                <div className="mt-1 h-2 rounded-full bg-muted">
                  <div
                    className="h-2 rounded-full bg-primary"
                    style={{
                      width: `${(matchResult.matched.length / job.required_skills.length) * 100}%`,
                    }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm">
                  <span>Experience</span>
                  <span className="font-medium">
                    {profile?.years_experience && job.min_experience
                      ? Math.min(
                          100,
                          Math.round((profile.years_experience / job.min_experience) * 100),
                        )
                      : 100}
                    %
                  </span>
                </div>
                <div className="mt-1 h-2 rounded-full bg-muted">
                  <div
                    className="h-2 rounded-full bg-primary"
                    style={{
                      width: `${
                        profile?.years_experience && job.min_experience
                          ? Math.min(100, (profile.years_experience / job.min_experience) * 100)
                          : 100
                      }%`,
                    }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm">
                  <span>Education</span>
                  <span className="font-medium">100%</span>
                </div>
                <div className="mt-1 h-2 rounded-full bg-muted">
                  <div className="h-2 rounded-full bg-primary" style={{ width: "100%" }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm">
                  <span>Projects</span>
                  <span className="font-medium">
                    {profile?.projects && (profile.projects as any).length > 0 ? 85 : 50}%
                  </span>
                </div>
                <div className="mt-1 h-2 rounded-full bg-muted">
                  <div
                    className="h-2 rounded-full bg-primary"
                    style={{
                      width: `${profile?.projects && (profile.projects as any).length > 0 ? 85 : 50}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-lg bg-muted/50 p-4">
              <p className="text-sm font-medium">Why this job matches you</p>
              <p className="mt-2 text-sm text-muted-foreground">{matchResult.explanation}</p>
            </div>
          </section>

          <section className="rounded-xl border border-border bg-card p-6 shadow-card">
            <h2 className="text-base font-semibold">Apply</h2>
            {hasApplied ? (
              <div className="mt-4 text-center">
                <p className="text-sm text-muted-foreground">
                  You have already applied to this job
                </p>
                <Button asChild className="mt-4" variant="outline">
                  <Link to="/applications">View application</Link>
                </Button>
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                <Button
                  className="w-full"
                  disabled={applyMutation.isPending}
                  onClick={() => applyMutation.mutate(false)}
                >
                  {applyMutation.isPending && !tailoring ? "Applying..." : "Apply now"}
                </Button>
                <Button
                  className="w-full"
                  variant="outline"
                  disabled={applyMutation.isPending}
                  onClick={() => applyMutation.mutate(true)}
                >
                  {tailoring ? "Tailoring resume..." : "Tailor resume & apply"}
                </Button>
                <p className="text-xs text-center text-muted-foreground">
                  Tailoring rewrites your resume for this specific job using only skills you already
                  have.
                </p>
              </div>
            )}
          </section>
        </div>
      </div>

      {showTailorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-xl border border-border bg-card p-6 shadow-card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Review Tailored Resume</h2>
              <Button variant="ghost" size="sm" onClick={() => setShowTailorModal(false)}>
                Cancel
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Review and edit the AI-tailored resume before applying. You can make any changes you
              want.
            </p>
            <Textarea
              value={tailoredResume}
              onChange={(e) => setTailoredResume(e.target.value)}
              disabled={!editingResume}
              rows={20}
              className="font-mono text-sm mb-4"
            />
            <div className="flex gap-3">
              {!editingResume ? (
                <Button onClick={() => setEditingResume(true)}>Edit Resume</Button>
              ) : (
                <Button onClick={() => setEditingResume(false)} variant="outline">
                  Finish Editing
                </Button>
              )}
              <Button
                onClick={() => submitTailoredApplication.mutate(tailoredResume)}
                disabled={submitTailoredApplication.isPending}
                className="flex-1"
              >
                {submitTailoredApplication.isPending ? "Applying..." : "Apply with Edited Resume"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
