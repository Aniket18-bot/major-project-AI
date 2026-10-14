import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  MessageCircle,
  Send,
  X,
  Briefcase,
  FileText,
  GraduationCap,
  Lightbulb,
  Sparkles,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser, useProfile } from "@/lib/session";
import { askAssistant } from "@/lib/ai";
import { profileSnapshot } from "@/lib/profile-snapshot";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const suggestedPrompts = [
  {
    icon: Briefcase,
    label: "Job Recommendations",
    prompt: "What jobs would you recommend for me based on my profile?",
    role: "student" as const,
  },
  {
    icon: FileText,
    label: "Resume Help",
    prompt: "Can you help me improve my resume for a software engineering role?",
    role: "student" as const,
  },
  {
    icon: GraduationCap,
    label: "Skill Gap Analysis",
    prompt: "What skills should I learn to become a better fit for data science roles?",
    role: "student" as const,
  },
  {
    icon: Lightbulb,
    label: "Career Advice",
    prompt: "What career path would you recommend for someone with my background?",
    role: "student" as const,
  },
  {
    icon: Sparkles,
    label: "Application Review",
    prompt: "Why was my application for the Senior Developer role rejected?",
    role: "student" as const,
  },
];

export function FloatingChat() {
  const { data: user } = useCurrentUser();
  const { data: profile } = useProfile();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const isRecruiter = profile?.role === "recruiter";

  const { data: messages } = useQuery({
    queryKey: ["chat", user?.id],
    enabled: !!user?.id && open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: true })
        .limit(40);
      if (error) throw error;
      return data;
    },
  });

  const { data: extra } = useQuery({
    queryKey: ["chat-context", user?.id, profile?.role],
    enabled: !!user?.id && !!profile && open,
    queryFn: async () => {
      if (profile?.role === "recruiter") {
        const { data: jobs, error } = await supabase
          .from("jobs")
          .select(
            "id, title, required_skills, applications(id, status, match_score, missing_skills)",
          )
          .eq("recruiter_id", user!.id);
        if (error) throw error;
        return { jobs };
      }
      const [{ data: applications }, { data: resumes }] = await Promise.all([
        supabase
          .from("applications")
          .select(
            "status, match_score, missing_skills, explanation, jobs(title, company_name, required_skills)",
          )
          .eq("student_id", user!.id),
        supabase.from("resumes").select("title, source").eq("student_id", user!.id),
      ]);
      return { applications, resumes };
    },
  });

  const context = useMemo(
    () =>
      JSON.stringify({
        profile: isRecruiter
          ? {
              full_name: profile?.full_name,
              company_name: profile?.company_name,
              company_industry: profile?.company_industry,
              company_size: profile?.company_size,
              headline: profile?.headline,
              about: profile?.about,
            }
          : profileSnapshot(profile),
        extra,
      }),
    [extra, isRecruiter, profile],
  );

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, open]);

  const send = useMutation({
    mutationFn: async () => {
      if (!user || !profile) throw new Error("Sign in required");
      const trimmed = question.trim();
      if (!trimmed) throw new Error("Type a question first");
      const history = (messages ?? []).map((message) => ({
        role: message.role as "user" | "assistant",
        content: message.content,
      }));
      await supabase
        .from("chat_messages")
        .insert({ user_id: user.id, role: "user", content: trimmed });
      const { content } = await askAssistant({
        data: {
          role: isRecruiter ? "recruiter" : "student",
          context,
          history,
          question: trimmed,
        },
      });
      await supabase.from("chat_messages").insert({ user_id: user.id, role: "assistant", content });
    },
    onSuccess: () => {
      setQuestion("");
      queryClient.invalidateQueries({ queryKey: ["chat", user?.id] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Chat failed"),
  });

  if (!user) return null;

  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3">
      {open ? (
        <div className="pointer-events-auto flex h-[min(32rem,calc(100vh-6.5rem))] w-[min(24rem,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-elevated">
          <div className="flex items-center justify-between gap-3 bg-gradient-primary px-4 py-3 text-primary-foreground">
            <div>
              <p className="text-sm font-semibold">
                {isRecruiter ? "Hiring assistant" : "Career assistant"}
              </p>
              <p className="text-xs text-primary-foreground/80">
                Ask anything about your workspace
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-md p-1 hover:bg-white/15"
              aria-label="Close chat"
            >
              <X className="size-4" />
            </button>
          </div>
          <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto p-4">
            {(messages ?? []).length === 0 ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  {isRecruiter
                    ? "Try: “Which role has the weakest applicant pool?”"
                    : "Try a suggested prompt below:"}
                </p>
                {!isRecruiter && (
                  <div className="grid gap-2">
                    {suggestedPrompts.map((suggestion) => {
                      const Icon = suggestion.icon;
                      return (
                        <button
                          key={suggestion.label}
                          onClick={() => setQuestion(suggestion.prompt)}
                          className="flex items-start gap-2 rounded-lg border border-border bg-muted/50 p-3 text-left hover:bg-muted transition-colors text-left"
                        >
                          <Icon className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
                          <div className="flex-1">
                            <p className="text-sm font-medium">{suggestion.label}</p>
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {suggestion.prompt}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              (messages ?? []).map((message) => (
                <div
                  key={message.id}
                  className={`max-w-[90%] rounded-xl px-3 py-2 text-sm ${
                    message.role === "user"
                      ? "ml-auto bg-primary text-primary-foreground"
                      : "bg-muted text-foreground"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{message.content}</p>
                </div>
              ))
            )}
            {send.isPending ? <p className="text-xs text-muted-foreground">Thinking…</p> : null}
          </div>
          <form
            className="flex items-end gap-2 border-t border-border p-3"
            onSubmit={(event) => {
              event.preventDefault();
              send.mutate();
            }}
          >
            <Textarea
              rows={2}
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="Ask a question…"
              className="min-h-[52px] resize-none"
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  send.mutate();
                }
              }}
            />
            <Button type="submit" size="icon" disabled={send.isPending} aria-label="Send">
              <Send className="size-4" />
            </Button>
          </form>
        </div>
      ) : null}

      <Button
        type="button"
        size="icon"
        className="pointer-events-auto size-14 rounded-full shadow-elevated"
        onClick={() => setOpen((value) => !value)}
        aria-label={open ? "Close AI chat" : "Open AI chat"}
      >
        {open ? <X className="size-6" /> : <MessageCircle className="size-6" />}
      </Button>
    </div>
  );
}
