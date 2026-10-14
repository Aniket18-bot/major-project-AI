import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { useCurrentUser } from "@/lib/session";
import { notifyInterviewScheduledFn, notifyInterviewCancelledFn } from "@/lib/notification-workflows.server";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Calendar,
  Clock,
  Video,
  MapPin,
  User,
  Briefcase,
  X,
  CheckCircle,
  AlertCircle,
  Plus,
  Edit,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/recruiter-interviews")({
  head: () => ({
    meta: [
      { title: "Interview Management — HireSense AI" },
      {
        name: "description",
        content:
          "Schedule single or bulk candidate interviews with automatic time slot management.",
      },
    ],
  }),
  component: InterviewManagementPage,
});

function InterviewManagementPage() {
  const { data: user } = useCurrentUser();
  const queryClient = useQueryClient();
  const [selectedJob, setSelectedJob] = useState("");
  const [selectedCandidates, setSelectedCandidates] = useState<string[]>([]);
  const [interviewDate, setInterviewDate] = useState("");
  const [interviewTime, setInterviewTime] = useState("");
  const [interviewType, setInterviewType] = useState("video");
  const [interviewer, setInterviewer] = useState("");
  const [meetingLink, setMeetingLink] = useState("");
  const [notes, setNotes] = useState("");
  const [timeGap, setTimeGap] = useState(30); // minutes between interviews
  const [isCandidateDropdownOpen, setIsCandidateDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsCandidateDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const { data: jobs } = useQuery({
    queryKey: ["recruiter-jobs", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select("id, title, company, required_skills")
        .eq("recruiter_id", user!.id)
        .eq("status", "open");
      if (error) throw error;
      return data;
    },
  });

  const { data: candidates } = useQuery({
    queryKey: ["candidates-for-interview", selectedJob],
    enabled: !!selectedJob,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("applications")
        .select("student_id")
        .eq("job_id", selectedJob)
        .in("status", ["shortlisted", "interview"])
        .order("match_score", { ascending: false });
      if (error) throw error;

      const studentIds = [...new Set(data.map((row: any) => row.student_id))];
      const { data: profiles, error: profilesError } = studentIds.length
        ? await supabase.from("profiles").select("id, full_name, headline").in("id", studentIds)
        : { data: [], error: null };
      if (profilesError) throw profilesError;

      const profilesById = new Map((profiles ?? []).map((row: any) => [row.id, row]));
      return data.map((row: any) => ({
        ...row,
        profile: profilesById.get(row.student_id) ?? null,
      }));
    },
  });

  const { data: interviews, isLoading } = useQuery({
    queryKey: ["interviews", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("applications")
        .select("*, jobs(title, company_name)")
        .in("status", ["interview"])
        .order("created_at", { ascending: false });
      if (error) throw error;

      const studentIds = [...new Set(data.map((row: any) => row.student_id))];
      const { data: profiles, error: profilesError } = studentIds.length
        ? await supabase.from("profiles").select("id, full_name").in("id", studentIds)
        : { data: [], error: null };
      if (profilesError) throw profilesError;

      const profilesById = new Map((profiles ?? []).map((row: any) => [row.id, row]));
      return data.map((row: any) => ({
        ...row,
        profile: profilesById.get(row.student_id) ?? null,
      }));
    },
  });

  const scheduleInterview = useMutation({
    mutationFn: async () => {
      if (!selectedJob || selectedCandidates.length === 0) {
        toast.error("Please select a job and at least one candidate");
        return;
      }

      const baseDateTime =
        interviewDate && interviewTime ? new Date(`${interviewDate}T${interviewTime}`) : null;

      // Get job details
      const { data: job } = await supabase
        .from("jobs")
        .select("*, recruiter_id")
        .eq("id", selectedJob)
        .single();

      // Get candidate profiles with emails
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", selectedCandidates);

      const profilesById = new Map((profiles ?? []).map((row: any) => [row.id, row]));

      // Schedule interviews for each candidate with time gaps
      const results = await Promise.all(
        selectedCandidates.map(async (studentId: string, index: number) => {
          const interviewDateTime = baseDateTime
            ? new Date(baseDateTime.getTime() + index * timeGap * 60000).toISOString()
            : null;

          const updateData = {
            status: "interview",
            stage: "Interview scheduled",
            interview_date: interviewDateTime
              ? new Date(interviewDateTime).toISOString().split("T")[0]
              : null,
            interview_time: interviewDateTime
              ? new Date(interviewDateTime).toTimeString().slice(0, 5)
              : null,
            interview_type: interviewType,
            interview_link: meetingLink || null,
            interview_notes: notes || null,
          };

          const { error } = await supabase
            .from("applications")
            .update(updateData as any)
            .eq("job_id", selectedJob)
            .eq("student_id", studentId);

          if (!error && job && user) {
            const candidateName = profilesById.get(studentId)?.full_name || "Candidate";
            const interviewDateStr = interviewDateTime
              ? new Date(interviewDateTime).toISOString().split("T")[0]
              : null;
            const interviewTimeStr = interviewDateTime
              ? new Date(interviewDateTime).toTimeString().slice(0, 5)
              : null;

            // Send notifications (non-blocking)
            try {
              await notifyInterviewScheduledFn({
                data: {
                  studentId,
                  jobTitle: (job as any).title,
                  company: (job as any).company || "Company",
                  interviewType,
                  interviewDate: interviewDateStr || "",
                  interviewTime: interviewTimeStr || "",
                  timeZone: "UTC",
                  interviewLink: meetingLink || null,
                  interviewer: interviewer || null,
                  instructions: notes || null,
                  interviewUrl: "/interviews",
                  recruiterId: user.id,
                  candidateName,
                },
              });
            } catch (e) {
              console.error("Failed to create notification:", e);
            }
          }

          return { studentId, error };
        }),
      );

      const errors = results.filter((r) => r.error);
      if (errors.length > 0) {
        throw new Error(`Failed to schedule ${errors.length} interviews`);
      }
    },
    onSuccess: () => {
      toast.success(
        `${selectedCandidates.length} interview${selectedCandidates.length > 1 ? "s" : ""} scheduled successfully!`,
      );
      queryClient.invalidateQueries({ queryKey: ["interviews"] });
      queryClient.invalidateQueries({ queryKey: ["job-applications", selectedJob] });
      queryClient.invalidateQueries({ queryKey: ["candidates-for-interview", selectedJob] });
      // Reset form
      setSelectedCandidates([]);
      setInterviewDate("");
      setInterviewTime("");
      setInterviewType("video");
      setInterviewer("");
      setMeetingLink("");
      setNotes("");
      setTimeGap(30);
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Failed to schedule interviews"),
  });

  const cancelInterview = useMutation({
    mutationFn: async (applicationId: string) => {
      // Get application details before cancellation
      const { data: application } = await supabase
        .from("applications")
        .select("*, student_id, jobs(*, recruiter_id)")
        .eq("id", applicationId)
        .single();

      const updateData: any = {
        status: "shortlisted",
        stage: "Shortlisted",
        interview_date: null,
        interview_time: null,
        interview_type: null,
        interview_link: null,
        interview_notes: null,
      };

      const { error } = await supabase
        .from("applications")
        .update(updateData as any)
        .eq("id", applicationId);
      if (error) throw error;

      // Send cancellation notification
      if (application && (application as any).jobs) {
        const { data: student } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", (application as any).student_id)
          .single();

        if (student) {
          await notifyInterviewCancelledFn({
            data: {
              studentId: (application as any).student_id,
              jobTitle: ((application as any).jobs as any).title,
              company: ((application as any).jobs as any).company || "Company",
              interviewUrl: "/interviews",
            },
          });
        }
      }
    },
    onSuccess: () => {
      toast.success("Interview cancelled");
      queryClient.invalidateQueries({ queryKey: ["interviews"] });
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Failed to cancel interview"),
  });

  const completeInterview = useMutation({
    mutationFn: async (applicationId: string) => {
      const updateData: any = {
        status: "under_review",
        stage: "Post-interview review",
      };
      const { error } = await supabase
        .from("applications")
        .update(updateData as any)
        .eq("id", applicationId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Interview marked as completed");
      queryClient.invalidateQueries({ queryKey: ["interviews"] });
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Failed to complete interview"),
  });

  const now = new Date();
  const todayInterviews = interviews?.filter((i: any) => i.status === "interview") || [];
  const upcomingInterviews = interviews?.filter((i: any) => i.status === "interview") || [];
  const completedInterviews = interviews?.filter((i: any) => i.status === "under_review") || [];

  return (
    <AppShell
      title="Interview Management"
      description="Schedule single or bulk candidate interviews"
      actions={
        <Button asChild variant="outline">
          <Link to="/recruiter">Back to Dashboard</Link>
        </Button>
      }
    >
      {/* Schedule Interview Form */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-card">
        <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
          <Plus className="h-5 w-5" />
          Schedule Interviews
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          Select one or multiple candidates to schedule interviews. For bulk scheduling, interviews
          will be automatically spaced with the specified time gap.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="job">Select Job</Label>
            <select
              id="job"
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
              value={selectedJob}
              onChange={(e) => setSelectedJob(e.target.value)}
            >
              <option value="">Select a job...</option>
              {jobs?.map((job: any) => (
                <option key={job.id} value={job.id}>
                  {job.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor="candidate">Select Candidates</Label>
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                id="candidate"
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm text-left flex items-center justify-between"
                onClick={() => setIsCandidateDropdownOpen(!isCandidateDropdownOpen)}
                disabled={!selectedJob}
              >
                <span>
                  {selectedCandidates.length === 0
                    ? "Select candidates..."
                    : `${selectedCandidates.length} candidate${selectedCandidates.length > 1 ? "s" : ""} selected`}
                </span>
                <svg
                  className={`w-4 h-4 transition-transform ${isCandidateDropdownOpen ? "rotate-180" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>
              {isCandidateDropdownOpen && (
                <div className="absolute z-10 w-full mt-1 bg-background border border-border rounded-md shadow-lg max-h-60 overflow-y-auto">
                  {candidates?.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No candidates available for this job
                    </p>
                  ) : (
                    candidates?.map((app: any) => (
                      <label
                        key={app.student_id}
                        className="flex items-center gap-2 p-3 hover:bg-muted/50 cursor-pointer border-b border-border last:border-b-0"
                      >
                        <input
                          type="checkbox"
                          checked={selectedCandidates.includes(app.student_id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedCandidates([...selectedCandidates, app.student_id]);
                            } else {
                              setSelectedCandidates(
                                selectedCandidates.filter((id) => id !== app.student_id),
                              );
                            }
                          }}
                          className="h-4 w-4"
                        />
                        <span className="text-sm">{app.profile?.full_name || "Candidate"}</span>
                      </label>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={interviewDate}
                onChange={(e) => setInterviewDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="time">Start Time</Label>
              <Input
                id="time"
                type="time"
                value={interviewTime}
                onChange={(e) => setInterviewTime(e.target.value)}
              />
            </div>
          </div>

          {selectedCandidates.length > 1 && (
            <div>
              <Label htmlFor="timeGap">Time Gap Between Interviews (minutes)</Label>
              <Input
                id="timeGap"
                type="number"
                min="5"
                step="5"
                value={timeGap}
                onChange={(e) => setTimeGap(Number(e.target.value))}
                className="w-full sm:w-1/2"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Interviews will be scheduled every {timeGap} minutes starting from the start time
              </p>
              {interviewDate && interviewTime && (
                <div className="mt-2 p-2 bg-muted/50 rounded text-xs">
                  <p className="font-medium mb-1">Scheduled times:</p>
                  {selectedCandidates.map((_, index) => {
                    const time = new Date(
                      new Date(`${interviewDate}T${interviewTime}`).getTime() +
                        index * timeGap * 60000,
                    );
                    return (
                      <p key={index}>
                        Interview {index + 1}:{" "}
                        {time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="type">Interview Type</Label>
              <select
                id="type"
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                value={interviewType}
                onChange={(e) => setInterviewType(e.target.value)}
              >
                <option value="video">Video Call</option>
                <option value="phone">Phone</option>
                <option value="in-person">In-Person</option>
                <option value="technical">Technical Assessment</option>
              </select>
            </div>
            <div>
              <Label htmlFor="interviewer">Interviewer Name</Label>
              <Input
                id="interviewer"
                placeholder="John Smith"
                value={interviewer}
                onChange={(e) => setInterviewer(e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="link">Meeting Link</Label>
            <Input
              id="link"
              placeholder="https://zoom.us/j/..."
              value={meetingLink}
              onChange={(e) => setMeetingLink(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              rows={3}
              placeholder="Any notes for the interviewer or candidate..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <Button
            onClick={() => scheduleInterview.mutate()}
            disabled={
              !selectedJob || selectedCandidates.length === 0 || scheduleInterview.isPending
            }
            className="w-full"
          >
            {scheduleInterview.isPending
              ? "Scheduling..."
              : selectedCandidates.length > 1
                ? `Schedule ${selectedCandidates.length} Interviews`
                : "Schedule Interview"}
          </Button>
        </div>
      </div>

      {/* Interview Lists */}
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Today's Interviews */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-card">
          <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Today's Interviews
            <span className="ml-auto text-sm font-medium text-muted-foreground">
              {todayInterviews.length}
            </span>
          </h2>
          <div className="space-y-3">
            {todayInterviews.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No interviews scheduled for today
              </p>
            ) : (
              todayInterviews.map((interview: any) => (
                <div key={interview.id} className="rounded-lg border border-border bg-muted/50 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-sm">
                        {interview.profile?.full_name || "Candidate"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {interview.jobs?.title} · {interview.jobs?.company_name}
                      </p>
                      {interview.interview_time && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {interview.interview_time}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-medium">{interview.stage || "In Progress"}</p>
                      {interview.interview_link && (
                        <a
                          href={interview.interview_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline"
                        >
                          Join
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Upcoming Interviews */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-card">
          <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Upcoming Interviews
            <span className="ml-auto text-sm font-medium text-muted-foreground">
              {upcomingInterviews.length}
            </span>
          </h2>
          <div className="space-y-3">
            {upcomingInterviews.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No upcoming interviews
              </p>
            ) : (
              upcomingInterviews.map((interview: any) => (
                <div key={interview.id} className="rounded-lg border border-border bg-muted/50 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-sm">
                        {interview.profile?.full_name || "Candidate"}
                      </p>
                      <p className="text-xs text-muted-foreground">{interview.jobs?.title}</p>
                      {interview.interview_date && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(interview.interview_date).toLocaleDateString()}
                        </p>
                      )}
                      {interview.interview_time && (
                        <p className="text-xs text-muted-foreground">{interview.interview_time}</p>
                      )}
                    </div>
                    <div className="flex gap-1">
                      {interview.interview_link && (
                        <a
                          href={interview.interview_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline p-1"
                        >
                          <Video className="h-3 w-3" />
                        </a>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => cancelInterview.mutate(interview.id)}
                        disabled={cancelInterview.isPending}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Completed Interviews */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-card">
          <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Completed Interviews
            <span className="ml-auto text-sm font-medium text-muted-foreground">
              {completedInterviews.length}
            </span>
          </h2>
          <div className="space-y-3">
            {completedInterviews.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No completed interviews
              </p>
            ) : (
              completedInterviews.map((interview: any) => (
                <div
                  key={interview.id}
                  className="rounded-lg border border-border bg-muted/50 p-3 opacity-75"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-sm">
                        {interview.profile?.full_name || "Candidate"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {interview.jobs?.title} · Completed
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => completeInterview.mutate(interview.id)}
                      disabled={completeInterview.isPending}
                    >
                      Mark Complete
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {interviews?.length === 0 && (
        <div className="mt-6 rounded-xl border border-border bg-card p-10 text-center shadow-card">
          <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground" />
          <p className="mt-4 text-sm text-muted-foreground">
            No interviews scheduled yet. Schedule your first interview from the job dashboard.
          </p>
        </div>
      )}
    </AppShell>
  );
}
