import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { useProfile } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";
import { Settings, Edit } from "lucide-react";
import {
  readAchievements,
  readCertificates,
  readEducation,
  readProjects,
} from "@/lib/profile-extras";
import { ExtraListEditor } from "@/components/ExtraListEditor";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Profile — HireSense AI" },
      {
        name: "description",
        content:
          "Maintain the profile recruiters see: skills, experience, education, achievements, projects and links — or your company details as a recruiter.",
      },
      { property: "og:title", content: "Profile — HireSense AI" },
      {
        property: "og:description",
        content: "The profile that powers AI matching and recruiter review.",
      },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { data: profile } = useProfile();
  const queryClient = useQueryClient();
  const isRecruiter = profile?.role === "recruiter";
  const [isEditing, setIsEditing] = useState(false);

  const [form, setForm] = useState({
    full_name: "",
    headline: "",
    phone: "",
    location: "",
    about: "",
    linkedin_url: "",
    github_url: "",
    portfolio_url: "",
    skills: "",
    years_experience: "",
    languages: "",
    preferred_roles: "",
    preferred_locations: "",
    work_mode_preference: "",
    expected_salary_min: "",
    expected_salary_max: "",
    employment_preference: "",
    company_name: "",
    company_website: "",
    company_industry: "",
    company_size: "",
    company_logo: "",
    company_founded: "",
    company_culture: "",
    company_benefits: "",
    company_tech_stack: "",
    company_social_links: "",
  });

  const [education, setEducation] = useState<
    Array<{ school: string; degree: string; field: string; year: string }>
  >([]);
  const [achievements, setAchievements] = useState<
    Array<{ title: string; description: string; year: string }>
  >([]);
  const [certificates, setCertificates] = useState<
    Array<{ name: string; issuer: string; year: string }>
  >([]);
  const [projects, setProjects] = useState<
    Array<{ name: string; description: string; tech: string; url: string }>
  >([]);

  const field = (key: keyof typeof form) => ({
    value: form[key],
    onChange: (
      event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
    ) => setForm((prev) => ({ ...prev, [key]: event.target.value })),
  });

  useEffect(() => {
    if (!profile) return;
    setForm({
      full_name: profile.full_name ?? "",
      headline: profile.headline ?? "",
      phone: profile.phone ?? "",
      location: profile.location ?? "",
      about: profile.about ?? "",
      linkedin_url: profile.linkedin_url ?? "",
      github_url: profile.github_url ?? "",
      portfolio_url: profile.portfolio_url ?? "",
      skills: (profile.skills ?? []).join(", "),
      years_experience: profile.years_experience?.toString() ?? "",
      languages: ((profile as any).languages ?? []).join(", "),
      preferred_roles: ((profile as any).preferred_roles ?? []).join(", "),
      preferred_locations: ((profile as any).preferred_locations ?? []).join(", "),
      work_mode_preference: (profile as any).work_mode_preference ?? "",
      expected_salary_min: (profile as any).expected_salary_min?.toString() ?? "",
      expected_salary_max: (profile as any).expected_salary_max?.toString() ?? "",
      employment_preference: (profile as any).employment_preference ?? "",
      company_name: profile.company_name ?? "",
      company_website: profile.company_website ?? "",
      company_industry: profile.company_industry ?? "",
      company_size: profile.company_size ?? "",
      company_logo: (profile as any).company_logo ?? "",
      company_founded: (profile as any).company_founded ?? "",
      company_culture: (profile as any).company_culture ?? "",
      company_benefits: (profile as any).company_benefits ?? "",
      company_tech_stack: (profile as any).company_tech_stack ?? "",
      company_social_links: (profile as any).company_social_links ?? "",
    });
    setEducation(readEducation(profile.education));
    setAchievements(readAchievements(profile.achievements));
    setCertificates(readCertificates(profile.certificates));
    setProjects(readProjects(profile.projects));
  }, [profile]);

  const save = useMutation({
    mutationFn: async () => {
      if (!profile) throw new Error("Profile not loaded");
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: form.full_name.trim().slice(0, 100),
          headline: form.headline.trim().slice(0, 160),
          phone: form.phone.trim().slice(0, 30),
          location: form.location.trim().slice(0, 120),
          about: form.about.trim().slice(0, 4000),
          linkedin_url: form.linkedin_url.trim().slice(0, 300),
          github_url: form.github_url.trim().slice(0, 300),
          portfolio_url: form.portfolio_url.trim().slice(0, 300),
          skills: parseSkills(form.skills),
          years_experience: form.years_experience ? Number(form.years_experience) : null,
          achievements: achievements as any,
          certificates: certificates as any,
          education: education as any,
          projects: projects as any,
          ...(form.company_name ? { company_name: form.company_name.trim().slice(0, 120) } : {}),
          ...(form.company_website
            ? { company_website: form.company_website.trim().slice(0, 300) }
            : {}),
          ...(form.company_industry
            ? { company_industry: form.company_industry.trim().slice(0, 120) }
            : {}),
          ...(form.company_size ? { company_size: form.company_size.trim().slice(0, 60) } : {}),
        })
        .eq("id", profile.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Profile updated");
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Could not update profile"),
  });

  function parseSkills(str: string): string[] {
    return str
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }

  if (profile && profile.role !== "recruiter" && profile.role !== "student") {
    return (
      <AppShell title="Profile" description="This area is for user accounts.">
        <p className="text-sm text-muted-foreground">Your account role is: {profile.role}</p>
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Profile"
      description={
        isRecruiter
          ? "Your recruiter identity and company details, shown to candidates on your job posts."
          : "This is what recruiters see, and what the AI uses to score you against job descriptions."
      }
      actions={
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link to={isRecruiter ? "/recruiter-settings" : "/settings"}>
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </Link>
          </Button>
          {!isEditing ? (
            <Button onClick={() => setIsEditing(true)}>
              <Edit className="mr-2 h-4 w-4" />
              Edit Profile
            </Button>
          ) : (
            <Button
              onClick={() => {
                save.mutate();
                setIsEditing(false);
              }}
              disabled={save.isPending}
            >
              {save.isPending ? "Saving…" : "Save changes"}
            </Button>
          )}
        </div>
      }
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-border bg-card p-6 shadow-card">
          <h2 className="text-base font-semibold">Basics</h2>
          <div className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Full name</Label>
              <Input id="full_name" {...field("full_name")} maxLength={100} disabled={!isEditing} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="headline">{isRecruiter ? "Professional Title" : "Headline"}</Label>
              <Input
                id="headline"
                placeholder={
                  isRecruiter
                    ? "Talent Acquisition Lead, HR Manager..."
                    : "Final-year CSE · ML enthusiast"
                }
                {...field("headline")}
                maxLength={160}
                disabled={!isEditing}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" {...field("phone")} maxLength={30} disabled={!isEditing} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input id="location" {...field("location")} maxLength={120} disabled={!isEditing} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="about">{isRecruiter ? "About You" : "About you"}</Label>
              <Textarea
                id="about"
                rows={6}
                {...field("about")}
                maxLength={4000}
                disabled={!isEditing}
              />
            </div>
          </div>
        </section>

        {isRecruiter ? (
          <>
            <section className="rounded-xl border border-border bg-card p-6 shadow-card">
              <h2 className="text-base font-semibold">Company</h2>
              <div className="mt-4 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="company_name">Company name</Label>
                  <Input
                    id="company_name"
                    {...field("company_name")}
                    maxLength={120}
                    disabled={!isEditing}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company_website">Website</Label>
                  <Input
                    id="company_website"
                    {...field("company_website")}
                    maxLength={300}
                    disabled={!isEditing}
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="company_industry">Industry</Label>
                    <Input
                      id="company_industry"
                      {...field("company_industry")}
                      maxLength={120}
                      disabled={!isEditing}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company_size">Company size</Label>
                    <Input
                      id="company_size"
                      placeholder="50-200"
                      {...field("company_size")}
                      maxLength={60}
                      disabled={!isEditing}
                    />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="company_founded">Founded year</Label>
                    <Input
                      id="company_founded"
                      placeholder="2015"
                      {...field("company_founded")}
                      maxLength={4}
                      disabled={!isEditing}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company_logo">Company logo URL</Label>
                    <Input
                      id="company_logo"
                      placeholder="https://..."
                      {...field("company_logo")}
                      maxLength={500}
                      disabled={!isEditing}
                    />
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-xl border border-border bg-card p-6 shadow-card">
              <h2 className="text-base font-semibold">Company Details</h2>
              <div className="mt-4 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="company_culture">Company culture</Label>
                  <Textarea
                    id="company_culture"
                    rows={3}
                    placeholder="Describe your company culture..."
                    {...field("company_culture")}
                    maxLength={1000}
                    disabled={!isEditing}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company_benefits">Benefits</Label>
                  <Textarea
                    id="company_benefits"
                    rows={3}
                    placeholder="Health insurance, remote work, etc."
                    {...field("company_benefits")}
                    maxLength={1000}
                    disabled={!isEditing}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company_tech_stack">Technology stack</Label>
                  <Textarea
                    id="company_tech_stack"
                    rows={2}
                    placeholder="React, Node.js, Python, AWS..."
                    {...field("company_tech_stack")}
                    maxLength={500}
                    disabled={!isEditing}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company_social_links">Social links</Label>
                  <Textarea
                    id="company_social_links"
                    rows={2}
                    placeholder="LinkedIn, Twitter, Instagram URLs..."
                    {...field("company_social_links")}
                    maxLength={500}
                    disabled={!isEditing}
                  />
                </div>
              </div>
            </section>
          </>
        ) : (
          <>
            <section className="rounded-xl border border-border bg-card p-6 shadow-card">
              <h2 className="text-base font-semibold">Skills & experience</h2>
              <div className="mt-4 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="skills">Skills (comma separated)</Label>
                  <Textarea
                    id="skills"
                    rows={4}
                    placeholder="Python, Machine Learning, SQL, React"
                    {...field("skills")}
                    disabled={!isEditing}
                  />
                  <p className="text-xs text-muted-foreground">
                    These drive your match score for every job description.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="years_experience">Years of experience</Label>
                  <Input
                    id="years_experience"
                    type="number"
                    min={0}
                    step="0.5"
                    {...field("years_experience")}
                    disabled={!isEditing}
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="linkedin_url">LinkedIn</Label>
                    <Input
                      id="linkedin_url"
                      {...field("linkedin_url")}
                      maxLength={300}
                      disabled={!isEditing}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="github_url">GitHub</Label>
                    <Input
                      id="github_url"
                      {...field("github_url")}
                      maxLength={300}
                      disabled={!isEditing}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="portfolio_url">Portfolio / projects link</Label>
                  <Input
                    id="portfolio_url"
                    {...field("portfolio_url")}
                    maxLength={300}
                    disabled={!isEditing}
                  />
                </div>
              </div>
            </section>

            <section className="rounded-xl border border-border bg-card p-6 shadow-card">
              <h2 className="text-base font-semibold">Career preferences</h2>
              <div className="mt-4 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="languages">Languages (comma separated)</Label>
                  <Textarea
                    id="languages"
                    rows={2}
                    placeholder="English, Hindi, Spanish"
                    {...field("languages")}
                    disabled={!isEditing}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="preferred_roles">Preferred roles (comma separated)</Label>
                  <Textarea
                    id="preferred_roles"
                    rows={2}
                    placeholder="Software Engineer, Data Scientist, Frontend Developer"
                    {...field("preferred_roles")}
                    disabled={!isEditing}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="preferred_locations">Preferred locations (comma separated)</Label>
                  <Textarea
                    id="preferred_locations"
                    rows={2}
                    placeholder="Bangalore, Mumbai, Remote"
                    {...field("preferred_locations")}
                    disabled={!isEditing}
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="work_mode_preference">Work mode preference</Label>
                    <select
                      id="work_mode_preference"
                      className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                      value={form.work_mode_preference}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, work_mode_preference: e.target.value }))
                      }
                      disabled={!isEditing}
                    >
                      <option value="">Select preference</option>
                      <option value="Remote">Remote</option>
                      <option value="Hybrid">Hybrid</option>
                      <option value="On-site">On-site</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="employment_preference">Employment preference</Label>
                    <select
                      id="employment_preference"
                      className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                      value={form.employment_preference}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, employment_preference: e.target.value }))
                      }
                      disabled={!isEditing}
                    >
                      <option value="">Select preference</option>
                      <option value="Full-time">Full-time</option>
                      <option value="Part-time">Part-time</option>
                      <option value="Contract">Contract</option>
                      <option value="Internship">Internship</option>
                    </select>
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="expected_salary_min">Expected salary (LPA) - Min</Label>
                    <Input
                      id="expected_salary_min"
                      type="number"
                      min={0}
                      placeholder="e.g., 8"
                      {...field("expected_salary_min")}
                      disabled={!isEditing}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="expected_salary_max">Expected salary (LPA) - Max</Label>
                    <Input
                      id="expected_salary_max"
                      type="number"
                      min={0}
                      placeholder="e.g., 15"
                      {...field("expected_salary_max")}
                      disabled={!isEditing}
                    />
                  </div>
                </div>
              </div>
            </section>
          </>
        )}
      </div>

      {!isRecruiter && (
        <div className="mt-6 grid gap-6">
          <ExtraListEditor
            title="Education / qualifications"
            items={education}
            blank={{ school: "", degree: "", field: "", year: "" }}
            fields={[
              { key: "school", label: "School / college" },
              { key: "degree", label: "Degree" },
              { key: "field", label: "Field" },
              { key: "year", label: "Year" },
            ]}
            onChange={setEducation}
            disabled={!isEditing}
          />
          <ExtraListEditor
            title="Achievements"
            items={achievements}
            blank={{ title: "", description: "", year: "" }}
            fields={[
              { key: "title", label: "Title" },
              { key: "year", label: "Year" },
              { key: "description", label: "Description", textarea: true },
            ]}
            onChange={setAchievements}
            disabled={!isEditing}
          />
          <ExtraListEditor
            title="Certificates"
            items={certificates}
            blank={{ name: "", issuer: "", year: "" }}
            fields={[
              { key: "name", label: "Certificate" },
              { key: "issuer", label: "Issuer" },
              { key: "year", label: "Year" },
            ]}
            onChange={setCertificates}
            disabled={!isEditing}
          />
          <ExtraListEditor
            title="Projects"
            items={projects}
            blank={{ name: "", description: "", tech: "", url: "" }}
            fields={[
              { key: "name", label: "Project name" },
              { key: "tech", label: "Tech / skills" },
              { key: "url", label: "Link" },
              { key: "description", label: "Description", textarea: true },
            ]}
            onChange={setProjects}
            disabled={!isEditing}
          />
        </div>
      )}
    </AppShell>
  );
}
