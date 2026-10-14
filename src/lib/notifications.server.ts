import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@/integrations/supabase/client.server";

export const createNotificationFn = createServerFn()
  .validator(
    (data: {
      user_id: string;
      title: string;
      message: string;
      category: string;
      type: string;
      link?: string;
      metadata?: Record<string, unknown>;
    }) => data,
  )
  .handler(async ({ data }) => {
    const supabase = createClient();

    const { error } = await supabase.from("notifications").insert({
      user_id: data.user_id,
      title: data.title,
      message: data.message,
      category: data.category,
      type: data.type,
      link: data.link,
      metadata: data.metadata || {},
      read: false,
      created_at: new Date().toISOString(),
    });

    if (error) {
      console.error("Failed to create notification:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  });

export const createInterviewNotificationFn = createServerFn()
  .validator(
    (data: {
      studentId: string;
      recruiterId: string;
      jobTitle: string;
      candidateName: string;
      interviewDate?: string | null;
      interviewTime?: string | null;
    }) => data,
  )
  .handler(async ({ data }) => {
    const supabase = createClient();

    // Notification for student
    const studentResult = await supabase.from("notifications").insert({
      user_id: data.studentId,
      title: "Interview Scheduled",
      message: `You have been scheduled for an interview for the ${data.jobTitle} position${data.interviewDate ? ` on ${new Date(data.interviewDate).toLocaleDateString()}` : ""}${data.interviewTime ? ` at ${data.interviewTime}` : ""}.`,
      category: "interviews",
      type: "interview_scheduled",
      link: "/interviews",
      metadata: {
        job_title: data.jobTitle,
        interview_date: data.interviewDate,
        interview_time: data.interviewTime,
      },
      read: false,
      created_at: new Date().toISOString(),
    });

    // Notification for recruiter
    const recruiterResult = await supabase.from("notifications").insert({
      user_id: data.recruiterId,
      title: "Interview Scheduled",
      message: `Interview scheduled with ${data.candidateName} for ${data.jobTitle}${data.interviewDate ? ` on ${new Date(data.interviewDate).toLocaleDateString()}` : ""}${data.interviewTime ? ` at ${data.interviewTime}` : ""}.`,
      category: "interviews",
      type: "interview_scheduled",
      link: "/recruiter-interviews",
      metadata: {
        candidate_name: data.candidateName,
        job_title: data.jobTitle,
        interview_date: data.interviewDate,
        interview_time: data.interviewTime,
      },
      read: false,
      created_at: new Date().toISOString(),
    });

    if (studentResult.error || recruiterResult.error) {
      console.error("Failed to create notifications:", { studentResult, recruiterResult });
      return { success: false, error: "Failed to create notifications" };
    }

    return { success: true };
  });
