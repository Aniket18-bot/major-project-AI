import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { useCurrentUser, useProfile } from "@/lib/session";
import { scoreCandidate } from "@/lib/matching";
import { tailorResume } from "@/lib/ai";
import { profileSnapshot } from "@/lib/profile-snapshot";
import { notifyApplicationSubmittedFn } from "@/lib/notification-workflows.server";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  MapPin,
  Clock,
  Building2,
  Bookmark,
  BookmarkCheck,
  Filter,
  ArrowUpDown,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/jobs")({
  head: () => ({
    meta: [
      { title: "Available jobs — HireSense AI" },
      {
        name: "description",
        content:
          "Browse open roles, see your AI match score and skill gaps for each job description, and apply in one click.",
      },
      { property: "og:title", content: "Available jobs — HireSense AI" },
      {
        property: "og:description",
        content: "Semantic job matching with per-role match scores and skill-gap analysis.",
      },
    ],
  }),
  component: JobsPage,
});

function JobsPage() {
  const { data: user } = useCurrentUser();
  const { data: profile } = useProfile();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [showSavedOnly, setShowSavedOnly] = useState(false);
  const [showTailorModal, setShowTailorModal] = useState(false);
  const [tailoredResume, setTailoredResume] = useState("");
  const [editingResume, setEditingResume] = useState(false);
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [filters, setFilters] = useState({
    location: "",
    workMode: "",
    experience: "",
    employmentType: "",
    minMatchScore: "",
  });
  const [sortBy, setSortBy] = useState<"match" | "date" | "salary">("match");

  // Server function mutations
  const notifyApplicationSubmitted = useMutation({
    mutationFn: notifyApplicationSubmittedFn,
  });

  const { data: jobs } = useQuery({
    queryKey: ["jobs", "open"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select("*")
        .eq("status", "open")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: applications } = useQuery({
    queryKey: ["my-application-ids", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("applications")
        .select("job_id")
        .eq("student_id", user!.id);
      if (error) throw error;
      return data.map((row) => row.job_id);
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
      // Use achievements field to store saved jobs as a workaround
      const achievements = (data as any).achievements || [];
      const savedJobsArray = achievements
        .filter((item: any) => item.type === "saved_job")
        .map((item: any) => item.job_id);
      return new Set(savedJobsArray);
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
    onSuccess: (_: any, jobId: string) => {
      queryClient.invalidateQueries({ queryKey: ["saved-jobs"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast.success(savedJobs?.has(jobId) ? "Job removed from saved" : "Job saved");
    },
  });

  const { data: resumes } = useQuery({
    queryKey: ["resumes", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("resumes")
        .select("id, title, content, job_id, created_at")
        .eq("student_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const applyMutation = useMutation({
    mutationFn: async (input: { jobId: string; tailor: boolean }) => {
      const selectedJob = jobs?.find((item: any) => item.id === input.jobId);
      if (!selectedJob || !user) throw new Error("Job not available");
      const result = scoreCandidate({
        candidateSkills: profile?.skills ?? [],
        requiredSkills: selectedJob.required_skills,
        preferredSkills: selectedJob.preferred_skills,
        candidateExperience: profile?.years_experience ?? 0,
        minExperience: selectedJob.min_experience,
      });

      let resumeId =
        resumes?.find((resume: any) => resume.job_id === selectedJob.id)?.id ?? resumes?.[0]?.id ?? null;
      if (input.tailor) {
        const { content } = await tailorResume({
          data: {
            profile: profileSnapshot(profile),
            baseResume: resumes?.[0]?.content ?? "",
            job: {
              title: selectedJob.title,
              company_name: selectedJob.company_name,
              description: selectedJob.description,
              required_skills: selectedJob.required_skills,
              preferred_skills: selectedJob.preferred_skills,
            },
          },
        });
        setTailoredResume(content);
        setSelectedJob(selectedJob);
        setShowTailorModal(true);
        return { result, content, tailored: true, jobId: input.jobId };
      }

      const { error } = await supabase.from("applications").insert({
        job_id: input.jobId,
        student_id: user.id,
        match_score: result.score,
        matched_skills: result.matched,
        missing_skills: result.missing,
        explanation: result.explanation,
        resume_id: resumeId,
      });
      if (error) throw error;

      // Get job details for notification
      const { data: jobDetails } = await supabase
        .from("jobs")
        .select("*, recruiter_id")
        .eq("id", input.jobId)
        .single();

      if (jobDetails) {
        // Send notification (non-blocking)
        notifyApplicationSubmitted.mutate({
          studentId: user.id,
          studentName: profile?.full_name || user.email || "Candidate",
          jobId: jobDetails.id,
          jobTitle: jobDetails.title,
          company: jobDetails.company,
          recruiterId: jobDetails.recruiter_id,
        });
      }

      return { result, tailored: false };
    },
    onSuccess: (data) => {
      if (!data.tailored) {
        toast.success(`Applied — AI match score ${data.result.score}%`);
        queryClient.invalidateQueries({ queryKey: ["my-application-ids"] });
        queryClient.invalidateQueries({ queryKey: ["my-applications"] });
        queryClient.invalidateQueries({ queryKey: ["resumes"] });
      }
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Could not submit application"),
  });

  const submitTailoredApplication = useMutation({
    mutationFn: async (resumeContent: string) => {
      if (!selectedJob || !user) throw new Error("Job not available");
      const result = scoreCandidate({
        candidateSkills: profile?.skills ?? [],
        requiredSkills: selectedJob.required_skills,
        preferredSkills: selectedJob.preferred_skills,
        candidateExperience: profile?.years_experience ?? 0,
        minExperience: selectedJob.min_experience,
      });

      const { data: saved, error: resumeError } = await supabase
        .from("resumes")
        .insert({
          student_id: user.id,
          title: `Applied · ${selectedJob.title}`,
          content: resumeContent,
          source: "tailored",
          job_id: selectedJob.id,
        })
        .select("id")
        .single();
      if (resumeError) throw resumeError;

      const { error } = await supabase.from("applications").insert({
        job_id: selectedJob.id,
        student_id: user.id,
        match_score: result.score,
        matched_skills: result.matched,
        missing_skills: result.missing,
        explanation: result.explanation,
        resume_id: saved.id,
      });
      if (error) throw error;

      // Get job details for notification
      const { data: jobDetails } = await supabase
        .from("jobs")
        .select("*, recruiter_id")
        .eq("id", selectedJob.id)
        .single();

      if (jobDetails) {
        // Send notification (non-blocking)
        notifyApplicationSubmitted.mutate({
          studentId: user.id,
          studentName: profile?.full_name || user.email || "Candidate",
          jobId: jobDetails.id,
          jobTitle: jobDetails.title,
          company: jobDetails.company,
          recruiterId: jobDetails.recruiter_id,
        });
      }

      return result;
    },
    mutationFn: async (resumeContent: string) => {
      if (!selectedJob || !user) throw new Error("Job not available");
      const result = scoreCandidate({
        candidateSkills: profile?.skills ?? [],
        requiredSkills: selectedJob.required_skills,
        preferredSkills: selectedJob.preferred_skills,
        candidateExperience: profile?.years_experience ?? 0,
        minExperience: selectedJob.min_experience,
      });

      const { data: saved, error: resumeError } = await supabase
        .from("resumes")
        .insert({
          student_id: user.id,
          title: `Applied · ${selectedJob.title}`,
          content: resumeContent,
          source: "tailored",
          job_id: selectedJob.id,
        })
        .select("id")
        .single();
      if (resumeError) throw resumeError;

      const { error } = await supabase.from("applications").insert({
        job_id: selectedJob.id,
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
      setSelectedJob(null);
      queryClient.invalidateQueries({ queryKey: ["my-application-ids"] });
      queryClient.invalidateQueries({ queryKey: ["my-applications"] });
      queryClient.invalidateQueries({ queryKey: ["resumes"] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not submit application");
    },
  });

  const applied = new Set(applications ?? []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    let list = jobs ?? [];

    // Saved jobs filter
    if (showSavedOnly) {
      list = list.filter((job) => savedJobs?.has(job.id));
    }

    // Search filter
    if (term) {
      list = list.filter((job) =>
        [job.title, job.company_name, job.location, ...job.required_skills]
          .filter(Boolean)
          .some((field) => String(field).toLowerCase().includes(term)),
      );
    }

    // Additional filters
    if (filters.location) {
      list = list.filter((job) =>
        job.location?.toLowerCase().includes(filters.location.toLowerCase()),
      );
    }
    if (filters.workMode) {
      list = list.filter((job) => job.work_mode?.toLowerCase() === filters.workMode.toLowerCase());
    }
    if (filters.employmentType) {
      list = list.filter(
        (job) => job.employment_type?.toLowerCase() === filters.employmentType.toLowerCase(),
      );
    }
    if (filters.experience) {
      const exp = parseInt(filters.experience);
      list = list.filter((job) => (job.min_experience ?? 0) <= exp);
    }

    // Calculate match scores for sorting
    const withScores = list.map((job) => ({
      ...job,
      matchScore: scoreCandidate({
        candidateSkills: profile?.skills ?? [],
        requiredSkills: job.required_skills,
        preferredSkills: job.preferred_skills,
        candidateExperience: profile?.years_experience ?? 0,
        minExperience: job.min_experience,
      }).score,
    }));

    // Filter by minimum match score
    if (filters.minMatchScore) {
      const minScore = parseInt(filters.minMatchScore);
      withScores.filter((job) => job.matchScore >= minScore);
    }

    // Sort
    if (sortBy === "match") {
      withScores.sort((a, b) => b.matchScore - a.matchScore);
    } else if (sortBy === "date") {
      withScores.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
    } else if (sortBy === "salary") {
      withScores.sort((a, b) => (b.salary_max || 0) - (a.salary_max || 0));
    }

    return withScores;
  }, [jobs, search, filters, sortBy, profile, showSavedOnly, savedJobs]);

  if (profile?.role === "recruiter") {
    return (
      <AppShell title="Available jobs" description="Job browsing is a student feature.">
        <Button asChild>
          <Link to="/recruiter">Go to recruiter dashboard</Link>
        </Button>
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Available jobs"
      description="Each role is scored against your profile skills and experience — identity details are never used."
    >
      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="Search by role, company, skill or location"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="max-w-md bg-card"
        />
        <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
          <Filter className="mr-2 h-4 w-4" />
          Filters
        </Button>
        <Button
          variant={showSavedOnly ? "default" : "outline"}
          onClick={() => setShowSavedOnly(!showSavedOnly)}
        >
          <BookmarkCheck className="mr-2 h-4 w-4" />
          {showSavedOnly ? "All Jobs" : "Saved Jobs"}
        </Button>
        <select
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as "match" | "date" | "salary")}
        >
          <option value="match">Sort by Match</option>
          <option value="date">Sort by Date</option>
          <option value="salary">Sort by Salary</option>
        </select>
      </div>

      {showFilters && (
        <div className="mt-4 rounded-xl border border-border bg-card p-4 shadow-card">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div className="space-y-2">
              <Label htmlFor="filter-location">Location</Label>
              <Input
                id="filter-location"
                placeholder="e.g., Bangalore"
                value={filters.location}
                onChange={(e) => setFilters((prev) => ({ ...prev, location: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="filter-workmode">Work Mode</Label>
              <select
                id="filter-workmode"
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={filters.workMode}
                onChange={(e) => setFilters((prev) => ({ ...prev, workMode: e.target.value }))}
              >
                <option value="">All</option>
                <option value="remote">Remote</option>
                <option value="hybrid">Hybrid</option>
                <option value="on-site">On-site</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="filter-employment">Employment Type</Label>
              <select
                id="filter-employment"
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={filters.employmentType}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, employmentType: e.target.value }))
                }
              >
                <option value="">All</option>
                <option value="full-time">Full-time</option>
                <option value="part-time">Part-time</option>
                <option value="contract">Contract</option>
                <option value="internship">Internship</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="filter-experience">Max Experience (years)</Label>
              <Input
                id="filter-experience"
                type="number"
                min={0}
                placeholder="e.g., 5"
                value={filters.experience}
                onChange={(e) => setFilters((prev) => ({ ...prev, experience: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="filter-match">Min Match Score (%)</Label>
              <Input
                id="filter-match"
                type="number"
                min={0}
                max={100}
                placeholder="e.g., 70"
                value={filters.minMatchScore}
                onChange={(e) => setFilters((prev) => ({ ...prev, minMatchScore: e.target.value }))}
              />
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="mt-4"
            onClick={() =>
              setFilters({
                location: "",
                workMode: "",
                experience: "",
                employmentType: "",
                minMatchScore: "",
              })
            }
          >
            Clear filters
          </Button>
        </div>
      )}

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {filtered.map((job) => {
          const result = scoreCandidate({
            candidateSkills: profile?.skills ?? [],
            requiredSkills: job.required_skills,
            preferredSkills: job.preferred_skills,
            candidateExperience: profile?.years_experience ?? 0,
            minExperience: job.min_experience,
          });
          const hasApplied = applied.has(job.id);
          const isSaved = savedJobs?.has(job.id);
          return (
            <article
              key={job.id}
              className="flex flex-col rounded-xl border border-border bg-card p-5 shadow-card"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <h2 className="font-display text-lg font-semibold">{job.title}</h2>
                    <Button size="sm" variant="ghost" onClick={() => toggleSave.mutate(job.id)}>
                      {isSaved ? (
                        <BookmarkCheck className="h-4 w-4 text-primary" />
                      ) : (
                        <Bookmark className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <p className="mt-1 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Building2 className="size-3.5" />
                      {job.company_name}
                    </span>
                    {job.location ? (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="size-3.5" />
                        {job.location}
                      </span>
                    ) : null}
                    {job.employment_type ? (
                      <span className="inline-flex items-center gap-1">
                        <Clock className="size-3.5" />
                        {job.employment_type}
                      </span>
                    ) : null}
                  </p>
                </div>
                <div className="shrink-0 rounded-lg bg-primary-soft px-3 py-2 text-center">
                  <p className="font-display text-xl font-semibold text-accent-foreground">
                    {result.score}%
                  </p>
                  <p className="text-[10px] uppercase tracking-wide text-accent-foreground">
                    match
                  </p>
                </div>
              </div>

              <p className="mt-3 line-clamp-3 text-sm text-muted-foreground">{job.description}</p>

              <div className="mt-4 flex flex-wrap gap-1.5">
                {job.required_skills.map((skill) => (
                  <span
                    key={skill}
                    className={`rounded-full px-2.5 py-1 text-xs ${
                      result.matched.includes(skill)
                        ? "bg-success/15 text-success"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {skill}
                  </span>
                ))}
              </div>

              {result.missing.length ? (
                <p className="mt-3 text-xs text-muted-foreground">
                  Skill gaps to close: {result.missing.join(", ")}
                </p>
              ) : null}

              <div className="mt-5 flex flex-wrap items-center justify-end gap-2 border-t border-border pt-4">
                <p className="mr-auto text-xs text-muted-foreground">
                  {job.min_experience > 0
                    ? `${job.min_experience}+ yr experience`
                    : "Open to freshers"}
                  {job.salary_min && job.salary_max
                    ? ` · ${job.salary_min}–${job.salary_max} LPA`
                    : ""}
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={hasApplied || applyMutation.isPending}
                  onClick={() => applyMutation.mutate({ jobId: job.id, tailor: true })}
                >
                  Tailor resume & apply
                </Button>
                <Button
                  size="sm"
                  disabled={hasApplied || applyMutation.isPending}
                  onClick={() => applyMutation.mutate({ jobId: job.id, tailor: false })}
                >
                  {hasApplied ? "Applied" : "Apply now"}
                </Button>
              </div>
            </article>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <p className="mt-10 text-center text-sm text-muted-foreground">
          No open roles match your search yet.
        </p>
      ) : null}

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
