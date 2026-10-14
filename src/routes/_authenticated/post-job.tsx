import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { useCurrentUser, useProfile } from "@/lib/session";
import { parseSkills } from "@/lib/matching";
import { analyzeJob } from "@/lib/ai";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Sparkles, Save, X, Check } from "lucide-react";

export const Route = createFileRoute("/_authenticated/post-job")({
  head: () => ({
    meta: [
      { title: "Post a job — HireSense AI" },
      {
        name: "description",
        content:
          "Publish a role with its description, required and preferred skills, experience level and salary range so the AI can score applicants automatically.",
      },
      { property: "og:title", content: "Post a job — HireSense AI" },
      {
        property: "og:description",
        content: "Create job descriptions that drive automated candidate scoring.",
      },
    ],
  }),
  component: PostJobPage,
});

function PostJobPage() {
  const { data: user } = useCurrentUser();
  const { data: profile } = useProfile();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const search = useSearch({ from: "/_authenticated/post-job" });
  const jobId = search.jobId as string | undefined;

  const [form, setForm] = useState({
    title: "",
    company_name: "",
    location: "",
    work_mode: "On-site",
    employment_type: "Full-time",
    min_experience: "0",
    salary_min: "",
    salary_max: "",
    description: "",
    responsibilities: "",
    required_skills: "",
    preferred_skills: "",
  });

  const [showAiModal, setShowAiModal] = useState(false);
  const [aiImprovements, setAiImprovements] = useState<any>(null);

  // Load job data when editing
  const { data: existingJob } = useQuery({
    queryKey: ["job", jobId],
    enabled: !!jobId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select("*")
        .eq("id", jobId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  // Populate form when job data is loaded
  useEffect(() => {
    if (existingJob) {
      setForm({
        title: existingJob.title || "",
        company_name: existingJob.company_name || "",
        location: existingJob.location || "",
        work_mode: existingJob.work_mode || "On-site",
        employment_type: existingJob.employment_type || "Full-time",
        min_experience: String(existingJob.min_experience || 0),
        salary_min: existingJob.salary_min ? String(existingJob.salary_min) : "",
        salary_max: existingJob.salary_max ? String(existingJob.salary_max) : "",
        description: existingJob.description || "",
        responsibilities: existingJob.responsibilities || "",
        required_skills: existingJob.required_skills?.join(", ") || "",
        preferred_skills: existingJob.preferred_skills?.join(", ") || "",
      });
    }
  }, [existingJob]);

  const create = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not signed in");

      const jobData = {
        recruiter_id: user.id,
        title: form.title.trim().slice(0, 140),
        company_name: (form.company_name || profile?.company_name || "").trim().slice(0, 120),
        location: form.location.trim().slice(0, 120),
        work_mode: form.work_mode,
        employment_type: form.employment_type,
        min_experience: Number(form.min_experience || 0),
        salary_min: form.salary_min ? Number(form.salary_min) : null,
        salary_max: form.salary_max ? Number(form.salary_max) : null,
        description: form.description.trim().slice(0, 8000),
        responsibilities: form.responsibilities.trim().slice(0, 4000),
        required_skills: parseSkills(form.required_skills),
        preferred_skills: parseSkills(form.preferred_skills),
        status: jobId ? (existingJob?.status === "closed" ? "closed" : "open") : "open",
      };

      console.log("Saving job data:", jobData);
      console.log("Job ID:", jobId);
      console.log("Existing job status:", existingJob?.status);

      if (jobId) {
        // Update existing job
        const { data, error } = await supabase
          .from("jobs")
          .update(jobData)
          .eq("id", jobId)
          .select()
          .single();
        if (error) {
          console.error("Update error:", error);
          throw error;
        }
        console.log("Update successful:", data);
        return data;
      } else {
        // Create new job
        const { data, error } = await supabase
          .from("jobs")
          .insert(jobData)
          .select()
          .single();
        if (error) {
          console.error("Insert error:", error);
          throw error;
        }
        console.log("Insert successful:", data);
        return data;
      }
    },
    onSuccess: () => {
      toast.success(jobId ? "Job updated" : "Job posted");
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      queryClient.invalidateQueries({ queryKey: ["recruiter-jobs"] });
      queryClient.invalidateQueries({ queryKey: ["job", jobId] });
      navigate({ to: "/recruiter" });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not save job"),
  });

  const saveDraft = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not signed in");

      const jobData = {
        recruiter_id: user.id,
        title: form.title.trim().slice(0, 140) || "Untitled Job",
        company_name: (form.company_name || profile?.company_name || "").trim().slice(0, 120),
        location: form.location.trim().slice(0, 120),
        work_mode: form.work_mode,
        employment_type: form.employment_type,
        min_experience: Number(form.min_experience || 0),
        salary_min: form.salary_min ? Number(form.salary_min) : null,
        salary_max: form.salary_max ? Number(form.salary_max) : null,
        description: form.description.trim().slice(0, 8000),
        responsibilities: form.responsibilities.trim().slice(0, 4000),
        required_skills: parseSkills(form.required_skills),
        preferred_skills: parseSkills(form.preferred_skills),
        status: "closed",
      };

      if (jobId) {
        // Update existing job
        const { data, error } = await supabase
          .from("jobs")
          .update(jobData)
          .eq("id", jobId)
          .select("id")
          .single();
        if (error) throw error;
        return data;
      } else {
        // Create new draft
        const { data, error } = await supabase
          .from("jobs")
          .insert(jobData)
          .select("id")
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      toast.success(jobId ? "Draft updated" : "Draft saved (as closed job)");
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      queryClient.invalidateQueries({ queryKey: ["recruiter-jobs"] });
      queryClient.invalidateQueries({ queryKey: ["job", jobId] });
      navigate({ to: "/recruiter" });
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Could not save draft"),
  });

  const analyzeWithAI = useMutation({
    mutationFn: async () => {
      // Validate that we have enough data to analyze
      if (!form.title || !form.description) {
        throw new Error("Please fill in at least the job title and description before analyzing.");
      }

      const jobData = {
        title: form.title,
        company_name: form.company_name || profile?.company_name || "",
        location: form.location,
        work_mode: form.work_mode,
        employment_type: form.employment_type,
        min_experience: form.min_experience,
        salary_min: form.salary_min,
        salary_max: form.salary_max,
        description: form.description,
        responsibilities: form.responsibilities,
        required_skills: form.required_skills,
        preferred_skills: form.preferred_skills,
      };

      console.log("Analyzing job with AI:", jobData);
      const result = await analyzeJob({ data: { job: jobData } });
      console.log("AI Analysis result:", result);
      return result;
    },
    onSuccess: (result) => {
      toast.success("Analysis complete");
      setAiImprovements(result);
      setShowAiModal(true);
    },
    onError: (error) => {
      console.error("AI Analysis error:", error);
      toast.error(error instanceof Error ? error.message : "Analysis failed");
    },
  });

  const field = (key: keyof typeof form) => ({
    value: form[key],
    onChange: (
      event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
    ) => setForm((prev) => ({ ...prev, [key]: event.target.value })),
  });

  const applyAiImprovements = () => {
    if (aiImprovements) {
      setForm((prev) => ({
        ...prev,
        title: aiImprovements.improved_title || prev.title,
        description: aiImprovements.improved_description || prev.description,
        responsibilities: aiImprovements.improved_responsibilities || prev.responsibilities,
        required_skills: aiImprovements.improved_required_skills || prev.required_skills,
        preferred_skills: aiImprovements.improved_preferred_skills || prev.preferred_skills,
      }));
      setShowAiModal(false);
      toast.success("AI improvements applied");
    }
  };

  if (profile && profile.role !== "recruiter") {
    return (
      <AppShell title="Post a job" description="Only recruiter accounts can publish jobs.">
        <p className="text-sm text-muted-foreground">Your account is registered as a student.</p>
      </AppShell>
    );
  }

  return (
    <AppShell
      title={jobId ? "Edit job" : "Post a job"}
      description="Required skills and experience become the scoring criteria for every applicant."
    >
      <form
        className="grid gap-6 lg:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault();
          create.mutate();
        }}
      >
        <section className="rounded-xl border border-border bg-card p-6 shadow-card">
          <h2 className="text-base font-semibold">Role</h2>
          <div className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Job title</Label>
              <Input id="title" required {...field("title")} maxLength={140} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company_name">Company</Label>
              <Input
                id="company_name"
                placeholder={profile?.company_name ?? "Company name"}
                {...field("company_name")}
                maxLength={120}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input id="location" {...field("location")} maxLength={120} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="work_mode">Work mode</Label>
                <select
                  id="work_mode"
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  {...field("work_mode")}
                >
                  {["On-site", "Hybrid", "Remote"].map((value) => (
                    <option key={value}>{value}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="employment_type">Type</Label>
                <select
                  id="employment_type"
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  {...field("employment_type")}
                >
                  {["Full-time", "Internship", "Contract", "Part-time"].map((value) => (
                    <option key={value}>{value}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="min_experience">Min exp (yr)</Label>
                <Input
                  id="min_experience"
                  type="number"
                  min={0}
                  step="0.5"
                  {...field("min_experience")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="salary_min">Salary (LPA)</Label>
                <div className="flex gap-2">
                  <Input
                    id="salary_min"
                    type="number"
                    min={0}
                    placeholder="min"
                    {...field("salary_min")}
                  />
                  <Input type="number" min={0} placeholder="max" {...field("salary_max")} />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-6 shadow-card">
          <h2 className="text-base font-semibold">Description & criteria</h2>
          <div className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="description">Job description</Label>
              <Textarea
                id="description"
                rows={6}
                required
                {...field("description")}
                maxLength={8000}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="responsibilities">Responsibilities</Label>
              <Textarea
                id="responsibilities"
                rows={4}
                {...field("responsibilities")}
                maxLength={4000}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="required_skills">Required skills (comma separated)</Label>
              <Textarea
                id="required_skills"
                rows={2}
                required
                placeholder="Python, SQL, Machine Learning"
                {...field("required_skills")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="preferred_skills">Preferred skills</Label>
              <Textarea
                id="preferred_skills"
                rows={2}
                placeholder="Docker, AWS"
                {...field("preferred_skills")}
              />
            </div>
          </div>
        </section>

        <div className="lg:col-span-2 flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => saveDraft.mutate()}
            disabled={saveDraft.isPending}
          >
            <Save className="mr-2 h-4 w-4" />
            {saveDraft.isPending ? "Saving…" : "Save Draft"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => analyzeWithAI.mutate()}
            disabled={analyzeWithAI.isPending}
          >
            <Sparkles className="mr-2 h-4 w-4" />
            {analyzeWithAI.isPending ? "Analyzing…" : "Analyze with AI"}
          </Button>
          <Button type="submit" disabled={create.isPending} className="flex-1">
            {create.isPending ? "Saving…" : jobId ? "Update job" : "Publish job"}
          </Button>
        </div>
      </form>

      {/* AI Improvements Modal */}
      {showAiModal && aiImprovements && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-xl border border-border p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">AI-Improved Job Description</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAiModal(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-4">
              {aiImprovements.suggestions && aiImprovements.suggestions.length > 0 && (
                <div className="rounded-lg bg-info/10 p-4">
                  <h4 className="font-medium text-info mb-2">Suggestions</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    {aiImprovements.suggestions.map((suggestion: string, index: number) => (
                      <li key={index}>{suggestion}</li>
                    ))}
                  </ul>
                </div>
              )}

              {aiImprovements.improved_title && (
                <div className="space-y-2">
                  <Label>Improved Title</Label>
                  <Input
                    value={aiImprovements.improved_title}
                    readOnly
                    className="bg-muted"
                  />
                </div>
              )}

              {aiImprovements.improved_description && (
                <div className="space-y-2">
                  <Label>Improved Description</Label>
                  <Textarea
                    value={aiImprovements.improved_description}
                    readOnly
                    className="bg-muted min-h-[100px]"
                  />
                </div>
              )}

              {aiImprovements.improved_responsibilities && (
                <div className="space-y-2">
                  <Label>Improved Responsibilities</Label>
                  <Textarea
                    value={aiImprovements.improved_responsibilities}
                    readOnly
                    className="bg-muted min-h-[100px]"
                  />
                </div>
              )}

              {aiImprovements.improved_required_skills && (
                <div className="space-y-2">
                  <Label>Improved Required Skills</Label>
                  <Input
                    value={aiImprovements.improved_required_skills}
                    readOnly
                    className="bg-muted"
                  />
                </div>
              )}

              {aiImprovements.improved_preferred_skills && (
                <div className="space-y-2">
                  <Label>Improved Preferred Skills</Label>
                  <Input
                    value={aiImprovements.improved_preferred_skills}
                    readOnly
                    className="bg-muted"
                  />
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <Button
                  type="button"
                  onClick={applyAiImprovements}
                  className="flex-1"
                >
                  <Check className="mr-2 h-4 w-4" />
                  Apply Improvements
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAiModal(false)}
                  className="flex-1"
                >
                  <X className="mr-2 h-4 w-4" />
                  Discard
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
