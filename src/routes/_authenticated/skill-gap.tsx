import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { useCurrentUser, useProfile } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { TrendingUp, AlertCircle, Target, CheckCircle, XCircle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/skill-gap")({
  head: () => ({
    meta: [
      { title: "Skill gap analysis — HireSense AI" },
      {
        name: "description",
        content:
          "Analyze your skills against job requirements and get personalized learning recommendations.",
      },
    ],
  }),
  component: SkillGapPage,
});

function SkillGapPage() {
  const { data: user } = useCurrentUser();
  const { data: profile } = useProfile();

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

  const skillGapAnalysis = useMemo(() => {
    if (!profile?.skills || !jobs) return null;

    const userSkills = new Set(profile.skills.map((s) => s.toLowerCase()));
    const allRequiredSkills = new Set<string>();
    const skillFrequency = new Map<string, number>();

    jobs.forEach((job) => {
      job.required_skills.forEach((skill) => {
        allRequiredSkills.add(skill.toLowerCase());
        skillFrequency.set(skill.toLowerCase(), (skillFrequency.get(skill.toLowerCase()) || 0) + 1);
      });
    });

    const missingSkills = Array.from(allRequiredSkills).filter((skill) => !userSkills.has(skill));
    const matchedSkills = Array.from(allRequiredSkills).filter((skill) => userSkills.has(skill));

    const topMissingSkills = missingSkills
      .map((skill) => ({
        skill,
        frequency: skillFrequency.get(skill) || 0,
      }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 10);

    const topMatchedSkills = matchedSkills
      .map((skill) => ({
        skill,
        frequency: skillFrequency.get(skill) || 0,
      }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 10);

    const skillCategories = {
      Frontend: [
        "react",
        "vue",
        "angular",
        "javascript",
        "typescript",
        "html",
        "css",
        "tailwind",
        "next.js",
      ],
      Backend: [
        "node.js",
        "python",
        "java",
        "go",
        "rust",
        "express",
        "django",
        "spring",
        "fastapi",
      ],
      "Data & AI": [
        "machine learning",
        "data science",
        "python",
        "sql",
        "pandas",
        "numpy",
        "tensorflow",
        "pytorch",
      ],
      DevOps: ["docker", "kubernetes", "aws", "gcp", "azure", "ci/cd", "terraform", "jenkins"],
      Mobile: ["react native", "flutter", "swift", "kotlin", "android", "ios"],
      Database: ["sql", "mongodb", "postgresql", "mysql", "redis", "elasticsearch"],
    };

    const categoryGaps: Record<string, { total: number; missing: number }> = {};
    Object.entries(skillCategories).forEach(([category, skills]) => {
      const categorySkills = skills.filter((s) => allRequiredSkills.has(s.toLowerCase()));
      const categoryMissing = categorySkills.filter((s) => !userSkills.has(s.toLowerCase()));
      if (categorySkills.length > 0) {
        categoryGaps[category] = {
          total: categorySkills.length,
          missing: categoryMissing.length,
        };
      }
    });

    return {
      totalSkills: allRequiredSkills.size,
      matchedCount: matchedSkills.length,
      missingCount: missingSkills.length,
      matchPercentage: Math.round((matchedSkills.length / allRequiredSkills.size) * 100),
      topMissingSkills,
      topMatchedSkills,
      categoryGaps,
    };
  }, [profile, jobs]);

  if (!profile) {
    return (
      <AppShell
        title="Skill gap analysis"
        description="Complete your profile to see skill gap analysis."
      >
        <Button asChild>
          <Link to="/profile">Complete profile</Link>
        </Button>
      </AppShell>
    );
  }

  if (!skillGapAnalysis) {
    return (
      <AppShell title="Skill gap analysis" description="Loading analysis...">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Skill gap analysis"
      description="Identify skills you're missing and get recommendations to improve your job match scores."
    >
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-6 shadow-card">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Overall Match</h3>
          </div>
          <p className="mt-4 text-4xl font-bold">{skillGapAnalysis.matchPercentage}%</p>
          <p className="mt-2 text-sm text-muted-foreground">
            {skillGapAnalysis.matchedCount} of {skillGapAnalysis.totalSkills} in-demand skills
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-card">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-success" />
            <h3 className="font-semibold">Skills You Have</h3>
          </div>
          <p className="mt-4 text-4xl font-bold text-success">{skillGapAnalysis.matchedCount}</p>
          <p className="mt-2 text-sm text-muted-foreground">Skills that match job requirements</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-card">
          <div className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-destructive" />
            <h3 className="font-semibold">Skills to Learn</h3>
          </div>
          <p className="mt-4 text-4xl font-bold text-destructive">
            {skillGapAnalysis.missingCount}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">Skills that could improve your match</p>
        </div>
      </div>

      <section className="mt-8 rounded-xl border border-border bg-card p-6 shadow-card">
        <h2 className="text-lg font-semibold">Top Skills to Learn</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          These skills appear most frequently in job descriptions you don't have yet
        </p>
        <div className="mt-4 space-y-3">
          {skillGapAnalysis.topMissingSkills.map(({ skill, frequency }) => (
            <div
              key={skill}
              className="flex items-center justify-between rounded-lg bg-muted/50 p-3"
            >
              <div className="flex items-center gap-3">
                <AlertCircle className="h-4 w-4 text-warning" />
                <span className="font-medium capitalize">{skill}</span>
              </div>
              <span className="text-sm text-muted-foreground">Appears in {frequency} jobs</span>
            </div>
          ))}
          {skillGapAnalysis.topMissingSkills.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Great job! You have all the top in-demand skills.
            </p>
          )}
        </div>
      </section>

      <section className="mt-8 rounded-xl border border-border bg-card p-6 shadow-card">
        <h2 className="text-lg font-semibold">Your Strongest Skills</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          These are your most valuable skills that match job requirements
        </p>
        <div className="mt-4 space-y-3">
          {skillGapAnalysis.topMatchedSkills.map(({ skill, frequency }) => (
            <div
              key={skill}
              className="flex items-center justify-between rounded-lg bg-success/10 p-3"
            >
              <div className="flex items-center gap-3">
                <CheckCircle className="h-4 w-4 text-success" />
                <span className="font-medium capitalize">{skill}</span>
              </div>
              <span className="text-sm text-muted-foreground">Appears in {frequency} jobs</span>
            </div>
          ))}
          {skillGapAnalysis.topMatchedSkills.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Add skills to your profile to see your strengths.
            </p>
          )}
        </div>
      </section>

      {Object.keys(skillGapAnalysis.categoryGaps).length > 0 && (
        <section className="mt-8 rounded-xl border border-border bg-card p-6 shadow-card">
          <h2 className="text-lg font-semibold">Skill Gaps by Category</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            See which areas need the most improvement
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(skillGapAnalysis.categoryGaps).map(([category, { total, missing }]) => {
              const percentage = Math.round(((total - missing) / total) * 100);
              return (
                <div key={category} className="rounded-lg border border-border bg-muted/50 p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">{category}</h3>
                    <span className="text-sm font-medium">{percentage}%</span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-muted">
                    <div
                      className="h-2 rounded-full bg-primary"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {missing} of {total} skills missing
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section className="mt-8 rounded-xl border border-border bg-card p-6 shadow-card">
        <h2 className="text-lg font-semibold">Recommended Actions</h2>
        <div className="mt-4 space-y-3">
          {skillGapAnalysis.missingCount > 0 && (
            <div className="flex items-start gap-3 rounded-lg bg-info/10 p-4">
              <TrendingUp className="mt-0.5 h-5 w-5 text-info" />
              <div>
                <p className="font-medium">Focus on high-frequency skills</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Start with skills that appear in the most job listings to maximize your impact.
                </p>
              </div>
            </div>
          )}
          <div className="flex items-start gap-3 rounded-lg bg-success/10 p-4">
            <Target className="mt-0.5 h-5 w-5 text-success" />
            <div>
              <p className="font-medium">Use AI Learning Roadmap</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Get a personalized learning path based on your skill gaps and career goals.
              </p>
              <Button asChild className="mt-3" size="sm">
                <Link to="/profile">Update profile</Link>
              </Button>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-lg bg-muted/50 p-4">
            <Target className="mt-0.5 h-5 w-5 text-muted-foreground" />
            <div>
              <p className="font-medium">Update your profile regularly</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Add new skills as you learn them to improve your match scores.
              </p>
              <Button asChild className="mt-3" size="sm" variant="outline">
                <Link to="/profile">Update profile</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
