import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { STATUS_LABEL, type ApplicationStatus } from "@/lib/status";
import {
  readAchievements,
  readCertificates,
  readEducation,
  readProjects,
} from "@/lib/profile-extras";
import { Button } from "@/components/ui/button";
import { Download, Globe, Languages, ExternalLink, Linkedin, Github, FileText } from "lucide-react";
import { toast } from "sonner";
import { useSearch } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/candidate/$studentId")({
  validateSearch: (search: Record<string, unknown>) => ({
    job: typeof search["job"] === "string" ? search["job"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Candidate details — HireSense AI" },
      {
        name: "description",
        content:
          "Full candidate profile: skills, experience, links and every application they made to your jobs with scores and current status.",
      },
      { property: "og:title", content: "Candidate details — HireSense AI" },
      {
        property: "og:description",
        content: "Deep-dive candidate view for recruiters.",
      },
    ],
  }),
  component: CandidatePage,
});

function CandidatePage() {
  const { studentId } = Route.useParams();
  const search = useSearch({ from: "/_authenticated/candidate/$studentId" });
  const jobId = search.job;

  const { data: candidate } = useQuery({
    queryKey: ["candidate", studentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", studentId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: applications } = useQuery({
    queryKey: ["candidate-applications", studentId, jobId],
    queryFn: async () => {
      let query = supabase
        .from("applications")
        .select("*, jobs(title, company_name)")
        .eq("student_id", studentId);

      if (jobId) {
        query = query.eq("job_id", jobId);
      }

      const { data, error } = await query.order("created_at", { ascending: false });
      if (error) throw error;

      // Fetch resumes for each application
      const resumeIds = [
        ...new Set(data.map((row) => row.resume_id).filter((id): id is string => id !== null)),
      ];
      const { data: resumes, error: resumesError } = resumeIds.length
        ? await supabase.from("resumes").select("id, content, title").in("id", resumeIds)
        : { data: [], error: null };
      if (resumesError) throw resumesError;
      const resumesById = new Map((resumes ?? []).map((row) => [row.id, row]));

      return data.map((row) => ({
        ...row,
        resume: row.resume_id ? (resumesById.get(row.resume_id) ?? null) : null,
      }));
    },
  });

  return (
    <AppShell
      title={candidate?.full_name || "Candidate"}
      description={candidate?.headline || "Candidate profile"}
    >
      <div className="grid gap-6 lg:grid-cols-3">
        <section className="rounded-xl border border-border bg-card p-6 shadow-card lg:col-span-2">
          <h2 className="text-base font-semibold">About</h2>
          <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">
            {candidate?.about || "No details added yet."}
          </p>

          <h3 className="mt-6 text-sm font-semibold">Skills</h3>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {(candidate?.skills ?? []).map((skill) => (
              <span
                key={skill}
                className="rounded-full bg-primary-soft px-2.5 py-1 text-xs text-accent-foreground"
              >
                {skill}
              </span>
            ))}
            {(candidate?.skills ?? []).length === 0 ? (
              <span className="text-sm text-muted-foreground">No skills listed</span>
            ) : null}
          </div>

          <h3 className="mt-6 text-sm font-semibold">Languages</h3>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {((candidate as any)?.languages ?? []).map((lang: string) => (
              <span
                key={lang}
                className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground"
              >
                {lang}
              </span>
            ))}
            {((candidate as any)?.languages ?? []).length === 0 ? (
              <span className="text-sm text-muted-foreground">No languages listed</span>
            ) : null}
          </div>

          <ProfileBlock
            title="Education"
            items={readEducation(candidate?.education).map(
              (item) => `${item.degree} ${item.field} · ${item.school} (${item.year})`,
            )}
          />
          <ProfileBlock
            title="Projects"
            items={readProjects(candidate?.projects).map(
              (item) => `${item.name}${item.tech ? ` · ${item.tech}` : ""}`,
            )}
          />
          <ProfileBlock
            title="Certificates"
            items={readCertificates(candidate?.certificates).map(
              (item) => `${item.name} · ${item.issuer}`,
            )}
          />
          <ProfileBlock
            title="Achievements"
            items={readAchievements(candidate?.achievements).map((item) => item.title)}
          />
        </section>

        <section className="rounded-xl border border-border bg-card p-6 shadow-card">
          <h2 className="text-base font-semibold">Details</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <Detail label="Location" value={candidate?.location} />
            <Detail
              label="Experience"
              value={candidate?.years_experience ? `${candidate.years_experience} yr` : "Fresher"}
            />
            <Detail label="Email" value={candidate?.email} />
            <Detail label="Phone" value={candidate?.phone} />
            <Detail label="Headline" value={candidate?.headline} />
          </dl>
          <div className="mt-4 flex flex-wrap gap-2">
            {candidate?.linkedin_url && (
              <Button size="sm" variant="outline" asChild>
                <a href={candidate.linkedin_url} target="_blank" rel="noopener noreferrer">
                  <Linkedin className="mr-2 h-4 w-4" />
                  LinkedIn
                  <ExternalLink className="ml-2 h-3 w-3" />
                </a>
              </Button>
            )}
            {candidate?.github_url && (
              <Button size="sm" variant="outline" asChild>
                <a href={candidate.github_url} target="_blank" rel="noopener noreferrer">
                  <Github className="mr-2 h-4 w-4" />
                  GitHub
                  <ExternalLink className="ml-2 h-3 w-3" />
                </a>
              </Button>
            )}
            {candidate?.portfolio_url && (
              <Button size="sm" variant="outline" asChild>
                <a href={candidate.portfolio_url} target="_blank" rel="noopener noreferrer">
                  <Globe className="mr-2 h-4 w-4" />
                  Portfolio
                  <ExternalLink className="ml-2 h-3 w-3" />
                </a>
              </Button>
            )}
          </div>
        </section>
      </div>

      <section className="mt-6 rounded-xl border border-border bg-card shadow-card">
        <h2 className="border-b border-border px-5 py-4 text-base font-semibold">
          {jobId ? "Application for this job" : "Applications to your jobs"}
        </h2>
        <ul className="divide-y divide-border">
          {(applications ?? []).length === 0 ? (
            <li className="px-5 py-8 text-center text-sm text-muted-foreground">
              {jobId ? "No application found for this job" : "No applications yet"}
            </li>
          ) : (
            (applications ?? []).map((application) => (
              <li key={application.id} className="px-5 py-4">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                  <div>
                    <p className="font-medium">{application.jobs?.title}</p>
                    <p className="text-xs text-muted-foreground">{application.explanation}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {application.matched_skills.map((skill) => (
                        <span
                          key={skill}
                          className="rounded-full bg-success/15 px-2 py-0.5 text-xs text-success"
                        >
                          {skill}
                        </span>
                      ))}
                      {application.missing_skills.map((skill) => (
                        <span
                          key={skill}
                          className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="font-semibold">
                      {Math.round(Number(application.match_score ?? 0))}%
                    </span>
                    <span className="text-muted-foreground">
                      {STATUS_LABEL[application.status as ApplicationStatus]}
                    </span>
                  </div>
                </div>

                {/* Tailored Resume for this job */}
                {application.resume && (
                  <div className="mt-3 rounded-lg border border-border bg-muted/50 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">{application.resume.title}</span>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          if (application.resume) {
                            navigator.clipboard.writeText(application.resume.content);
                            toast.success("Resume copied to clipboard");
                          }
                        }}
                      >
                        Copy
                      </Button>
                    </div>
                    <pre className="max-h-40 overflow-auto whitespace-pre-wrap text-xs text-muted-foreground">
                      {application.resume.content}
                    </pre>
                  </div>
                )}
              </li>
            ))
          )}
        </ul>
      </section>

      {/* AI Match Breakdown */}
      {applications && applications.length > 0 && (
        <section className="mt-6 rounded-xl border border-border bg-card p-6 shadow-card">
          <h2 className="text-base font-semibold mb-4">AI Match Breakdown</h2>
          {applications.map((application) => (
            <div key={application.id} className="mb-4 last:mb-0">
              <div className="flex items-center justify-between mb-2">
                <p className="font-medium">{application.jobs?.title}</p>
                <p className="font-semibold">
                  {Math.round(Number(application.match_score ?? 0))}% Overall Match
                </p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-xs text-muted-foreground">Skills</p>
                  <p className="text-lg font-semibold">{(application as any)?.skill_score || 0}%</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-xs text-muted-foreground">Experience</p>
                  <p className="text-lg font-semibold">
                    {(application as any)?.experience_score || 0}%
                  </p>
                </div>
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-xs text-muted-foreground">Education</p>
                  <p className="text-lg font-semibold">
                    {(application as any)?.education_score || 0}%
                  </p>
                </div>
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-xs text-muted-foreground">Projects</p>
                  <p className="text-lg font-semibold">
                    {(application as any)?.project_score || 0}%
                  </p>
                </div>
              </div>
              <div className="mt-3 p-3 rounded-lg bg-info/10">
                <p className="text-xs font-semibold text-info mb-1">Why candidate matches</p>
                <p className="text-sm text-muted-foreground">{application.explanation}</p>
              </div>
            </div>
          ))}
        </section>
      )}
    </AppShell>
  );
}

function Detail({ label, value }: { label: string; value?: string | null | undefined }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="max-w-[60%] truncate text-right font-medium">{value || "—"}</dd>
    </div>
  );
}

function ProfileBlock({ title, items }: { title: string; items: string[] }) {
  const visible = items.filter((item) => item.replace(/[·()\s]/g, "").length > 0);
  return (
    <>
      <h3 className="mt-6 text-sm font-semibold">{title}</h3>
      {visible.length ? (
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          {visible.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">Not added.</p>
      )}
    </>
  );
}
