import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "HireSense AI — AI recruitment decision system" },
      {
        name: "description",
        content:
          "HireSense AI scores every application against the job description, explains the decision, and gives students and recruiters one transparent hiring workflow.",
      },
      { property: "og:title", content: "HireSense AI — AI recruitment decision system" },
      {
        property: "og:description",
        content:
          "Automated candidate scoring, explainable shortlists and live application tracking for students and recruiters.",
      },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  {
    title: "Automated scoring",
    body: "Every application is scored against the job's required skills and experience the moment it's submitted.",
  },
  {
    title: "Explainable decisions",
    body: "Students see matched skills, gaps and the reason behind each score — not a silent rejection.",
  },
  {
    title: "Bias reduction",
    body: "Scoring reads skills and experience only. Names, gender, college and location never affect the result.",
  },
  {
    title: "Live status tracking",
    body: "Applied, under review, shortlisted, interview, on hold, selected — visible to the candidate in real time.",
  },
  {
    title: "Ranked shortlists",
    body: "Recruiters get one ranking dashboard per role, with score filters and interview recommendations.",
  },
  {
    title: "Pipeline analytics",
    body: "Funnel, score distribution, in-demand skills and the biggest skill gaps across your applicants.",
  },
];

function Landing() {
  return (
    <main className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <span className="font-display text-lg font-semibold tracking-tight">HireSense AI</span>
        <Button asChild size="sm">
          <Link to="/auth">Sign in</Link>
        </Button>
      </header>

      <section className="mx-auto max-w-6xl px-6 pt-10 pb-20">
        <p className="inline-flex rounded-full bg-primary-soft px-3 py-1 text-xs font-medium text-accent-foreground">
          AI-based recruitment decision system
        </p>
        <h1 className="mt-5 max-w-3xl font-display text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
          Hiring decisions that can be explained, not just made.
        </h1>
        <p className="mt-5 max-w-2xl text-lg text-muted-foreground">
          Students apply once and see exactly where they stand. Recruiters get ranked, scored
          shortlists with the reasoning attached — no résumé pile, no guesswork.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link to="/auth">Get started</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link to="/auth">I'm hiring</Link>
          </Button>
        </div>

        <div className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <article
              key={feature.title}
              className="rounded-xl border border-border bg-card p-6 shadow-card"
            >
              <h2 className="font-display text-base font-semibold">{feature.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{feature.body}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
