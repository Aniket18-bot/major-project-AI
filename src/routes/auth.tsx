import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Brain, GraduationCap, Briefcase } from "lucide-react";
import { authErrorMessage, isStrongPassword } from "@/lib/auth-errors";
import { ensureProfile } from "@/lib/ensure-profile";
import { registerAccount } from "@/lib/register-account";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — HireSense AI Recruitment" },
      {
        name: "description",
        content:
          "Sign in or create an account on HireSense AI as a student to apply for jobs, or as a recruiter to post roles and screen candidates.",
      },
      { property: "og:title", content: "Sign in — HireSense AI Recruitment" },
      {
        property: "og:description",
        content: "Student and recruiter access to the AI-based recruitment decision system.",
      },
    ],
  }),
  component: AuthPage,
});

type Role = "student" | "recruiter";

async function goToWorkspace(navigate: ReturnType<typeof useNavigate>, fallbackRole?: Role) {
  const { data: userData, error } = await supabase.auth.getUser();
  if (error || !userData.user)
    throw error ?? new Error("Could not load your account after signing in.");
  const role = (await ensureProfile(userData.user.id)) ?? fallbackRole ?? "student";
  navigate({ to: role === "recruiter" ? "/recruiter" : "/dashboard", replace: true });
}

async function signInWithRetry(email: string, password: string) {
  const first = await supabase.auth.signInWithPassword({ email, password });
  if (!first.error) return first;
  const message = first.error.message.toLowerCase();
  if (message.includes("email not confirmed")) {
    await new Promise((resolve) => setTimeout(resolve, 700));
    return supabase.auth.signInWithPassword({ email, password });
  }
  return first;
}

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [role, setRole] = useState<Role>("student");
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmedEmail = email.trim().toLowerCase();
    if (mode === "signup" && !isStrongPassword(password)) {
      toast.error(
        "Use at least 8 characters with letters and numbers. Avoid common passwords like Password123.",
      );
      return;
    }
    setLoading(true);
    try {
      if (mode === "signup") {
        await registerAccount({
          email: trimmedEmail,
          password,
          fullName: fullName.trim(),
          role,
          companyName: companyName.trim(),
        });
        const signedIn = await signInWithRetry(trimmedEmail, password);
        if (signedIn.error) throw signedIn.error;
        await goToWorkspace(navigate, role);
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      });
      if (error) throw error;
      await goToWorkspace(navigate);
    } catch (error) {
      toast.error(authErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout>
      <h1 className="text-2xl font-semibold">
        {mode === "signin" ? "Welcome back" : "Create your account"}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {mode === "signin"
          ? "Sign in to your student or recruiter workspace."
          : "Pick how you want to use HireSense AI."}
      </p>

      {mode === "signup" ? (
        <div className="mt-6 grid grid-cols-2 gap-3">
          {(
            [
              { value: "student", label: "Student", icon: GraduationCap, hint: "Apply for jobs" },
              { value: "recruiter", label: "Recruiter", icon: Briefcase, hint: "Hire talent" },
            ] as const
          ).map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setRole(option.value)}
              className={`rounded-xl border p-4 text-left transition-colors ${
                role === option.value
                  ? "border-primary bg-primary-soft"
                  : "border-border bg-card hover:bg-accent/50"
              }`}
            >
              <option.icon className="size-5 text-primary" />
              <p className="mt-2 text-sm font-semibold">{option.label}</p>
              <p className="text-xs text-muted-foreground">{option.hint}</p>
            </button>
          ))}
        </div>
      ) : null}

      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        {mode === "signup" ? (
          <>
            <div className="space-y-2">
              <Label htmlFor="fullName">Full name</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                maxLength={100}
                autoComplete="name"
              />
            </div>
            {role === "recruiter" ? (
              <div className="space-y-2">
                <Label htmlFor="company">Company name</Label>
                <Input
                  id="company"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  required
                  maxLength={120}
                  autoComplete="organization"
                />
              </div>
            ) : null}
          </>
        ) : null}
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            maxLength={255}
            autoComplete="email"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={mode === "signup" ? 8 : 6}
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
          />
          {mode === "signup" ? (
            <p className="text-xs text-muted-foreground">
              At least 8 characters, with letters and numbers. Common passwords are rejected.
            </p>
          ) : null}
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        {mode === "signin" ? "New here?" : "Already have an account?"}{" "}
        <button
          type="button"
          className="font-medium text-primary hover:underline"
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
        >
          {mode === "signin" ? "Create an account" : "Sign in"}
        </button>
      </p>
    </AuthLayout>
  );
}

function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-hero px-4 py-12">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-6 flex items-center justify-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-lg bg-gradient-primary text-primary-foreground">
            <Brain className="size-5" />
          </span>
          <span className="font-display text-lg font-semibold">HireSense AI</span>
        </Link>
        <div className="rounded-2xl border border-border bg-card p-8 shadow-elevated">
          {children}
        </div>
      </div>
    </div>
  );
}
