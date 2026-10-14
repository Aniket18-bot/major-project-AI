import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { useCurrentUser, useProfile } from "@/lib/session";
import { generateAtsResume, parseResumeSource, tailorResume } from "@/lib/ai";
import { profileSnapshot } from "@/lib/profile-snapshot";
import { readResumeFileText } from "@/lib/resume-file";
import { parseSkills } from "@/lib/matching";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Download, Copy, Edit2, Trash2, FileText } from "lucide-react";

export const Route = createFileRoute("/_authenticated/resume")({
  head: () => ({
    meta: [{ title: "Resume — HireSense AI" }],
  }),
  component: ResumePage,
});

function ResumePage() {
  const { data: user } = useCurrentUser();
  const { data: profile } = useProfile();
  const queryClient = useQueryClient();
  const [sourceText, setSourceText] = useState("");
  const [tailorJobId, setTailorJobId] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");

  const { data: resumes } = useQuery({
    queryKey: ["resumes", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("resumes")
        .select("*")
        .eq("student_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
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

  async function saveResume(
    title: string,
    content: string,
    source: string,
    jobId?: string,
    filePath?: string,
  ) {
    if (!user) throw new Error("Sign in required");
    const { error } = await supabase.from("resumes").insert({
      student_id: user.id,
      title: title.slice(0, 120),
      content,
      source,
      job_id: jobId || null,
      file_path: filePath ?? null,
    });
    if (error) throw error;
  }

  const generate = useMutation({
    mutationFn: async () => {
      const { content } = await generateAtsResume({ data: { profile: profileSnapshot(profile) } });
      await saveResume("ATS resume from profile", content, "generated");
    },
    onSuccess: () => {
      toast.success("ATS resume created from your profile");
      queryClient.invalidateQueries({ queryKey: ["resumes"] });
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Could not generate resume"),
  });

  const importSource = useMutation({
    mutationFn: async () => {
      if (!profile) throw new Error("Profile not loaded");
      const parsed = await parseResumeSource({ data: { sourceText } });
      const skills = Array.isArray(parsed.skills)
        ? parsed.skills.map((skill) => String(skill))
        : parseSkills(String(parsed.skills ?? ""));

      // Create a temporary profile object from the parsed data without updating the actual profile
      const tempProfile = {
        ...profile,
        full_name: parsed.full_name || profile.full_name,
        headline: parsed.headline || profile.headline,
        about: parsed.about || profile.about,
        skills,
        years_experience: parsed.years_experience ?? profile.years_experience,
        education: parsed.education ?? profile.education,
        achievements: parsed.achievements ?? profile.achievements,
        certificates: parsed.certificates ?? profile.certificates,
        projects: parsed.projects ?? profile.projects,
        linkedin_url: parsed.linkedin_url || profile.linkedin_url,
        github_url: parsed.github_url || profile.github_url,
        portfolio_url: parsed.portfolio_url || profile.portfolio_url,
      };

      const { content } = await generateAtsResume({
        data: {
          profile: profileSnapshot(tempProfile),
        },
      });
      await saveResume("ATS resume from uploaded details", content, "upload");
    },
    onSuccess: () => {
      toast.success("ATS resume created from uploaded text");
      setSourceText("");
      queryClient.invalidateQueries({ queryKey: ["resumes"] });
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Could not import resume"),
  });

  const tailor = useMutation({
    mutationFn: async () => {
      const job = jobs?.find((item) => item.id === tailorJobId);
      if (!job) throw new Error("Pick a job to tailor the resume");
      const latest = resumes?.[0]?.content;
      const { content } = await tailorResume({
        data: {
          profile: profileSnapshot(profile),
          baseResume: latest ?? "",
          job: {
            title: job.title,
            company_name: job.company_name,
            description: job.description,
            required_skills: job.required_skills,
            preferred_skills: job.preferred_skills,
            min_experience: job.min_experience,
          },
        },
      });
      await saveResume(`Tailored for ${job.title}`, content, "tailored", job.id);
      return job.title;
    },
    onSuccess: (title) => {
      toast.success(`Resume tailored for ${title}`);
      queryClient.invalidateQueries({ queryKey: ["resumes"] });
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Could not tailor resume"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("resumes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["resumes"] }),
  });

  const duplicate = useMutation({
    mutationFn: async (resume: any) => {
      if (!user) throw new Error("Sign in required");
      const { error } = await supabase.from("resumes").insert({
        student_id: user.id,
        title: `${resume.title} (copy)`.slice(0, 120),
        content: resume.content,
        source: resume.source,
        job_id: resume.job_id,
        file_path: resume.file_path,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Resume duplicated");
      queryClient.invalidateQueries({ queryKey: ["resumes"] });
    },
  });

  const updateResume = useMutation({
    mutationFn: async ({ id, content }: { id: string; content: string }) => {
      const { error } = await supabase.from("resumes").update({ content }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Resume updated");
      setEditingId(null);
      setEditContent("");
      queryClient.invalidateQueries({ queryKey: ["resumes"] });
    },
  });

  if (profile?.role === "recruiter") {
    return (
      <AppShell title="Resume studio" description="Resume tools are for student accounts.">
        <Button asChild>
          <Link to="/recruiter">Go to recruiter dashboard</Link>
        </Button>
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Resume studio"
      description="Upload a PDF/TXT or paste LinkedIn/profile text. AI builds an ATS-friendly resume and can rewrite it for a specific job."
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-border bg-card p-6 shadow-card">
          <h2 className="text-base font-semibold">Create from your profile</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Uses your qualifications, skills, projects, certificates and achievements.
          </p>
          <Button className="mt-4" onClick={() => generate.mutate()} disabled={generate.isPending}>
            {generate.isPending ? "Writing…" : "Generate ATS resume"}
          </Button>
        </section>

        <section className="rounded-xl border border-border bg-card p-6 shadow-card">
          <h2 className="text-base font-semibold">Upload or paste details</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            PDF, TXT, or pasted LinkedIn / resume text. AI creates an ATS resume without updating
            your profile.
          </p>
          <div className="mt-4 space-y-3">
            <div className="space-y-2">
              <Label htmlFor="resume-file">Resume file</Label>
              <Input
                id="resume-file"
                type="file"
                accept=".pdf,.txt,.md,application/pdf,text/plain"
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  if (!file || !user) return;
                  try {
                    const text = await readResumeFileText(file);
                    setSourceText(text);
                    const path = `${user.id}/${Date.now()}-${file.name}`;
                    await supabase.storage.from("resumes").upload(path, file, { upsert: true });
                    toast.success("File text loaded. Review it, then import.");
                  } catch (error) {
                    toast.error(error instanceof Error ? error.message : "Could not read file");
                  }
                }}
              />
            </div>
            <Textarea
              rows={8}
              placeholder="Paste LinkedIn About + experience, or resume text…"
              value={sourceText}
              onChange={(event) => setSourceText(event.target.value)}
            />
            <Button
              onClick={() => importSource.mutate()}
              disabled={importSource.isPending || sourceText.trim().length < 40}
            >
              {importSource.isPending ? "Importing…" : "Import & make ATS resume"}
            </Button>
          </div>
        </section>
      </div>

      <section className="mt-6 rounded-xl border border-border bg-card p-6 shadow-card">
        <h2 className="text-base font-semibold">Tailor for a job description</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          AI rewrites your latest resume for that role using only skills you already have.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <select
            className="h-9 min-w-64 rounded-md border border-input bg-background px-3 text-sm"
            value={tailorJobId}
            onChange={(event) => setTailorJobId(event.target.value)}
          >
            <option value="">Select a job</option>
            {(jobs ?? []).map((job) => (
              <option key={job.id} value={job.id}>
                {job.title} · {job.company_name}
              </option>
            ))}
          </select>
          <Button onClick={() => tailor.mutate()} disabled={tailor.isPending || !tailorJobId}>
            {tailor.isPending ? "Rewriting…" : "Tailor resume"}
          </Button>
        </div>
      </section>

      <section className="mt-6 space-y-4">
        <h2 className="text-base font-semibold">Saved resumes</h2>
        {(resumes ?? []).map((resume) => (
          <article
            key={resume.id}
            className="rounded-xl border border-border bg-card p-5 shadow-card"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h3 className="font-semibold">{resume.title}</h3>
                </div>
                <p className="text-xs capitalize text-muted-foreground">
                  {resume.source} · {new Date(resume.created_at).toLocaleString()}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    navigator.clipboard.writeText(resume.content);
                    toast.success("Resume copied to clipboard");
                  }}
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    const blob = new Blob([resume.content], { type: "text/plain" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `${resume.title}.txt`;
                    a.click();
                    URL.revokeObjectURL(url);
                    toast.success("Resume downloaded");
                  }}
                >
                  <Download className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setEditingId(resume.id);
                    setEditContent(resume.content);
                  }}
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => duplicate.mutate(resume)}>
                  <FileText className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => remove.mutate(resume.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
            {editingId === resume.id ? (
              <div className="mt-4 space-y-3">
                <Textarea
                  rows={12}
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="font-mono text-sm"
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => updateResume.mutate({ id: resume.id, content: editContent })}
                    disabled={updateResume.isPending}
                  >
                    {updateResume.isPending ? "Saving..." : "Save changes"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditingId(null);
                      setEditContent("");
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap font-sans text-sm text-muted-foreground">
                {resume.content}
              </pre>
            )}
          </article>
        ))}
        {(resumes ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No resumes yet. Generate or import one above.
          </p>
        ) : null}
      </section>
    </AppShell>
  );
}
