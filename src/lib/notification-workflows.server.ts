import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import {
  notifyApplicationSubmitted,
  notifyNewApplication,
  notifyApplicationShortlisted,
  notifyApplicationOnHold,
  notifyApplicationRejected,
  notifyCandidateSelected,
  notifyJobPosted,
  notifyJobPublished,
  notifyJobClosingSoon,
  notifyJobExpired,
  notifyInterviewScheduledCandidate,
  notifyInterviewScheduledRecruiter,
  notifyInterviewCancelled,
} from "./notification-events.server";

function createSupabaseClient() {
  const SUPABASE_URL = process.env["SUPABASE_URL"];
  const SUPABASE_SERVICE_ROLE_KEY =
    process.env["SUPABASE_SERVICE_ROLE_KEY"] || process.env["SUPABASE_SECRET_KEY"];

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Missing Supabase environment variables");
  }

  return createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

// Server function for application submission notification
export const notifyApplicationSubmittedFn = createServerFn()
  .validator(
    (data: {
      studentId: string;
      studentName: string;
      jobId: string;
      jobTitle: string;
      company: string;
      recruiterId: string;
    }) => data,
  )
  .handler(async ({ data }) => {
    const supabase = createSupabaseClient();

    // Get job details
    const { data: job } = await supabase
      .from("jobs")
      .select("*")
      .eq("id", data.jobId)
      .single();

    if (!job) {
      return { success: false, error: "Job not found" };
    }

    // Notify candidate
    await notifyApplicationSubmitted(
      data.studentId,
      data.jobTitle,
      data.company,
      new Date().toLocaleDateString(),
      `/applications`
    );

    // Notify recruiter
    await notifyNewApplication(
      data.recruiterId,
      data.studentName,
      data.jobTitle,
      new Date().toLocaleDateString(),
      `New application received from ${data.studentName}`,
      `/applicants/${data.jobId}`
    );

    return { success: true };
  });

// Server function for application status change notification
export const notifyApplicationStatusChangeFn = createServerFn()
  .validator(
    (data: {
      data: {
        applicationId: string;
        studentId: string;
        studentName: string;
        recruiterId: string;
        jobId: string;
        jobTitle: string;
        company: string;
        status: string;
        stage?: string;
      };
    }) => data,
  )
  .handler(async ({ data }) => {
    const supabase = createSupabaseClient();

    switch (data.status) {
      case "shortlisted":
        await notifyApplicationShortlisted(
          data.studentId,
          data.jobTitle,
          data.company,
          data.stage || "Shortlisted",
          "Your application is under review. You will be contacted for the next steps.",
          `/applications`
        );
        break;

      case "on_hold":
        await notifyApplicationOnHold(
          data.studentId,
          data.jobTitle,
          data.company,
          `/applications`
        );
        break;

      case "rejected":
        await notifyApplicationRejected(
          data.studentId,
          data.jobTitle,
          data.company,
          `/dashboard`
        );
        break;

      case "selected":
        await notifyCandidateSelected(
          data.studentId,
          data.jobTitle,
          data.company,
          "You will receive an offer letter with details about the position and next steps.",
          null
        );
        break;

      default:
        break;
    }

    return { success: true };
  });

// Server function for job posted notification
export const notifyJobPostedFn = createServerFn()
  .validator(
    (data: {
      recruiterId: string;
      jobId: string;
      jobTitle: string;
      postingDate: string;
      deadline: string | null;
      status: string;
    }) => data,
  )
  .handler(async ({ data }) => {
    await notifyJobPosted(
      data.recruiterId,
      data.jobTitle,
      data.postingDate,
      data.deadline || "Not specified",
      data.status,
      `/recruiter/jobs/${data.jobId}`
    );

    return { success: true };
  });

// Server function for job published notification
export const notifyJobPublishedFn = createServerFn()
  .validator(
    (data: {
      recruiterId: string;
      jobId: string;
      jobTitle: string;
      publicationDate: string;
      deadline: string | null;
    }) => data,
  )
  .handler(async ({ data }) => {
    await notifyJobPublished(
      data.recruiterId,
      data.jobTitle,
      data.publicationDate,
      `/recruiter/jobs/${data.jobId}`
    );

    return { success: true };
  });

// Server function for job closing soon notification
export const notifyJobClosingSoonFn = createServerFn()
  .validator(
    (data: {
      recruiterId: string;
      jobId: string;
      jobTitle: string;
      closingDate: string;
      applicationCount: number;
    }) => data,
  )
  .handler(async ({ data }) => {
    await notifyJobClosingSoon(
      data.recruiterId,
      data.jobTitle,
      data.closingDate,
      `/recruiter/applicants/${data.jobId}`
    );

    return { success: true };
  });

// Server function for job expired notification
export const notifyJobExpiredFn = createServerFn()
  .validator(
    (data: {
      recruiterId: string;
      jobId: string;
      jobTitle: string;
      expirationDate: string;
      applicationCount: number;
    }) => data,
  )
  .handler(async ({ data }) => {
    await notifyJobExpired(
      data.recruiterId,
      data.jobTitle,
      `/recruiter/applicants/${data.jobId}`
    );

    return { success: true };
  });

// Server function for interview scheduled notification
export const notifyInterviewScheduledFn = createServerFn()
  .validator(
    (data: {
      data: {
        studentId: string;
        jobTitle: string;
        company: string;
        interviewType: string;
        interviewDate: string;
        interviewTime: string;
        timeZone: string;
        interviewLink: string | null;
        interviewer: string | null;
        instructions: string | null;
        interviewUrl: string;
        recruiterId: string;
        candidateName: string;
      };
    }) => data,
  )
  .handler(async ({ data }) => {
    // Notify candidate
    await notifyInterviewScheduledCandidate(
      data.studentId,
      data.jobTitle,
      data.company,
      data.interviewType,
      data.interviewDate,
      data.interviewTime,
      data.timeZone,
      data.interviewLink,
      data.interviewer,
      data.instructions,
      data.interviewUrl
    );

    // Notify recruiter
    await notifyInterviewScheduledRecruiter(
      data.recruiterId,
      data.candidateName,
      data.jobTitle,
      data.interviewDate,
      data.interviewTime,
      data.interviewType,
      data.interviewLink,
      data.interviewUrl
    );

    return { success: true };
  });

// Server function for interview cancelled notification
export const notifyInterviewCancelledFn = createServerFn()
  .validator(
    (data: {
      data: {
        studentId: string;
        jobTitle: string;
        company: string;
        interviewUrl: string;
      };
    }) => data,
  )
  .handler(async ({ data }) => {
    await notifyInterviewCancelled(
      data.studentId,
      data.jobTitle,
      data.company,
      data.interviewUrl
    );

    return { success: true };
  });
