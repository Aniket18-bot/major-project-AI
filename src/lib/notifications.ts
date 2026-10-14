import { supabase } from "@/integrations/supabase/client";

export type NotificationCategory =
  "applications" | "interviews" | "jobs" | "resume" | "system" | "applicants";

export interface NotificationData {
  user_id: string;
  title: string;
  message: string;
  category: NotificationCategory;
  type: string;
  link?: string;
  metadata?: Record<string, unknown>;
}

export async function createNotification(data: NotificationData) {
  try {
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
      return { success: false, error };
    }

    return { success: true };
  } catch (error) {
    console.error("Error creating notification:", error);
    return { success: false, error };
  }
}

export async function createInterviewNotification(
  studentId: string,
  recruiterId: string,
  jobTitle: string,
  candidateName: string,
  interviewDate?: string,
  interviewTime?: string,
) {
  // Notification for student
  await createNotification({
    user_id: studentId,
    title: "Interview Scheduled",
    message: `You have been scheduled for an interview for the ${jobTitle} position${interviewDate ? ` on ${new Date(interviewDate).toLocaleDateString()}` : ""}${interviewTime ? ` at ${interviewTime}` : ""}.`,
    category: "interviews",
    type: "interview_scheduled",
    link: "/interviews",
    metadata: {
      job_title: jobTitle,
      interview_date: interviewDate,
      interview_time: interviewTime,
    },
  });

  // Notification for recruiter
  await createNotification({
    user_id: recruiterId,
    title: "Interview Scheduled",
    message: `Interview scheduled with ${candidateName} for ${jobTitle}${interviewDate ? ` on ${new Date(interviewDate).toLocaleDateString()}` : ""}${interviewTime ? ` at ${interviewTime}` : ""}.`,
    category: "interviews",
    type: "interview_scheduled",
    link: "/recruiter-interviews",
    metadata: {
      candidate_name: candidateName,
      job_title: jobTitle,
      interview_date: interviewDate,
      interview_time: interviewTime,
    },
  });
}

export async function createApplicationNotification(
  recruiterId: string,
  candidateName: string,
  jobTitle: string,
) {
  await createNotification({
    user_id: recruiterId,
    title: "New Application Received",
    message: `${candidateName} has applied for the ${jobTitle} position.`,
    category: "applicants",
    type: "new_application",
    link: "/recruiter",
    metadata: {
      candidate_name: candidateName,
      job_title: jobTitle,
    },
  });
}

export async function createShortlistNotification(
  studentId: string,
  recruiterId: string,
  jobTitle: string,
) {
  // Notification for student
  await createNotification({
    user_id: studentId,
    title: "Application Shortlisted",
    message: `Your application for ${jobTitle} has been shortlisted!`,
    category: "applications",
    type: "shortlisted",
    link: "/applications",
    metadata: {
      job_title: jobTitle,
    },
  });

  // Notification for recruiter
  await createNotification({
    user_id: recruiterId,
    title: "Candidate Shortlisted",
    message: `You have shortlisted a candidate for ${jobTitle}.`,
    category: "applicants",
    type: "shortlisted",
    link: "/recruiter",
    metadata: {
      job_title: jobTitle,
    },
  });
}
