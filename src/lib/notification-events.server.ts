import { sendNotification, NotificationPriority, NotificationType, UserType } from "./notification-service.server";

// ========================================
// CANDIDATE NOTIFICATIONS
// ========================================

export async function notifyAccountCreated(userId: string, dashboardUrl: string) {
  await sendNotification({
    userId,
    userType: "student",
    type: "account_created",
    title: "Welcome to HireSense AI",
    message: "Welcome to HireSense AI. Complete your profile to start discovering relevant opportunities.",
    priority: "critical",
    category: "system",
    actionUrl: dashboardUrl,
    relatedEntityType: "user",
    relatedEntityId: userId,
  });
}

export async function notifyEmailVerification(userId: string, verificationUrl: string) {
  await sendNotification({
    userId,
    userType: "student",
    type: "email_verification",
    title: "Verify Your Email",
    message: "Please verify your email address to complete your account setup.",
    priority: "critical",
    category: "system",
    actionUrl: verificationUrl,
    relatedEntityType: "user",
    relatedEntityId: userId,
  });
}

export async function notifyJobRecommendation(
  userId: string,
  jobTitle: string,
  company: string,
  location: string,
  skills: string[],
  jobUrl: string
) {
  await sendNotification({
    userId,
    userType: "student",
    type: "job_recommendation",
    title: "New Job Recommendation",
    message: `A new job matching your profile: ${jobTitle} at ${company} in ${location}.`,
    priority: "important",
    category: "jobs",
    actionUrl: jobUrl,
    relatedEntityType: "job",
    relatedEntityId: jobUrl.split("/").pop(),
  });
}

export async function notifyApplicationSubmitted(
  userId: string,
  jobTitle: string,
  company: string,
  applicationDate: string,
  applicationUrl: string
) {
  await sendNotification({
    userId,
    userType: "student",
    type: "application_submitted",
    title: "Application Submitted",
    message: `Your application for ${jobTitle} has been submitted successfully.`,
    priority: "important",
    category: "applications",
    actionUrl: applicationUrl,
    relatedEntityType: "application",
    relatedEntityId: applicationUrl.split("/").pop(),
  });
}

export async function notifyApplicationViewed(
  userId: string,
  jobTitle: string,
  company: string,
  viewedDate: string,
  applicationUrl: string
) {
  await sendNotification({
    userId,
    userType: "student",
    type: "application_viewed",
    title: "Application Viewed",
    message: `Your application for ${jobTitle} at ${company} has been viewed by the recruiter.`,
    priority: "important",
    category: "applications",
    actionUrl: applicationUrl,
    relatedEntityType: "application",
    relatedEntityId: applicationUrl.split("/").pop(),
  });
}

export async function notifyApplicationShortlisted(
  userId: string,
  jobTitle: string,
  company: string,
  stage: string,
  nextSteps: string,
  applicationUrl: string
) {
  await sendNotification({
    userId,
    userType: "student",
    type: "application_shortlisted",
    title: "Application Shortlisted",
    message: `Congratulations! Your application for ${jobTitle} has been shortlisted.`,
    priority: "critical",
    category: "applications",
    actionUrl: applicationUrl,
    relatedEntityType: "application",
    relatedEntityId: applicationUrl.split("/").pop(),
  });
}

export async function notifyApplicationOnHold(
  userId: string,
  jobTitle: string,
  company: string,
  applicationUrl: string
) {
  await sendNotification({
    userId,
    userType: "student",
    type: "application_on_hold",
    title: "Application On Hold",
    message: `Your application for ${jobTitle} at ${company} is currently on hold.`,
    priority: "important",
    category: "applications",
    actionUrl: applicationUrl,
    relatedEntityType: "application",
    relatedEntityId: applicationUrl.split("/").pop(),
  });
}

export async function notifyApplicationRejected(
  userId: string,
  jobTitle: string,
  company: string,
  dashboardUrl: string
) {
  await sendNotification({
    userId,
    userType: "student",
    type: "application_rejected",
    title: "Application Status Update",
    message: `Your application for ${jobTitle} at ${company} was not selected to proceed.`,
    priority: "important",
    category: "applications",
    actionUrl: dashboardUrl,
    relatedEntityType: "application",
    relatedEntityId: null,
  });
}

export async function notifyAssessmentAssigned(
  userId: string,
  jobTitle: string,
  assessmentName: string,
  deadline: string,
  duration: string,
  assessmentUrl: string
) {
  await sendNotification({
    userId,
    userType: "student",
    type: "assessment_assigned",
    title: "Assessment Assigned",
    message: `An assessment has been assigned to you for ${jobTitle}.`,
    priority: "critical",
    category: "applications",
    actionUrl: assessmentUrl,
    relatedEntityType: "assessment",
    relatedEntityId: assessmentUrl.split("/").pop(),
  });
}

export async function notifyAssessmentReminder(
  userId: string,
  jobTitle: string,
  assessmentName: string,
  deadline: string,
  assessmentUrl: string
) {
  await sendNotification({
    userId,
    userType: "student",
    type: "assessment_reminder",
    title: "Assessment Reminder",
    message: `Reminder: Your assessment for ${jobTitle} is due on ${deadline}.`,
    priority: "critical",
    category: "applications",
    actionUrl: assessmentUrl,
    relatedEntityType: "assessment",
    relatedEntityId: assessmentUrl.split("/").pop(),
  });
}

export async function notifyAssessmentCompletedCandidate(
  userId: string,
  jobTitle: string,
  score: string,
  dashboardUrl: string
) {
  await sendNotification({
    userId,
    userType: "student",
    type: "assessment_completed",
    title: "Assessment Completed",
    message: `Your assessment for ${jobTitle} has been completed. Score: ${score}`,
    priority: "important",
    category: "applications",
    actionUrl: dashboardUrl,
    relatedEntityType: "assessment",
    relatedEntityId: null,
  });
}

export async function notifyInterviewScheduledCandidate(
  userId: string,
  jobTitle: string,
  company: string,
  interviewType: string,
  interviewDate: string,
  interviewTime: string,
  timeZone: string,
  interviewLink: string | null,
  interviewer: string | null,
  instructions: string | null,
  interviewUrl: string
) {
  await sendNotification({
    userId,
    userType: "student",
    type: "interview_scheduled",
    title: "Interview Scheduled",
    message: `You have been scheduled for an interview for ${jobTitle} on ${interviewDate} at ${interviewTime}.`,
    priority: "critical",
    category: "interviews",
    actionUrl: interviewUrl,
    relatedEntityType: "interview",
    relatedEntityId: interviewUrl.split("/").pop(),
  });
}

export async function notifyInterviewReminderCandidate(
  userId: string,
  jobTitle: string,
  company: string,
  interviewDate: string,
  interviewTime: string,
  interviewUrl: string
) {
  await sendNotification({
    userId,
    userType: "student",
    type: "interview_reminder",
    title: "Interview Reminder",
    message: `Reminder: Your interview for ${jobTitle} is scheduled for ${interviewDate} at ${interviewTime}.`,
    priority: "critical",
    category: "interviews",
    actionUrl: interviewUrl,
    relatedEntityType: "interview",
    relatedEntityId: interviewUrl.split("/").pop(),
  });
}

export async function notifyInterviewRescheduled(
  userId: string,
  jobTitle: string,
  company: string,
  originalInterview: string,
  newInformation: string,
  interviewUrl: string
) {
  await sendNotification({
    userId,
    userType: "student",
    type: "interview_rescheduled",
    title: "Interview Rescheduled",
    message: `Your interview for ${jobTitle} has been rescheduled. ${newInformation}`,
    priority: "critical",
    category: "interviews",
    actionUrl: interviewUrl,
    relatedEntityType: "interview",
    relatedEntityId: null,
  });
}

export async function notifyInterviewCancelled(
  userId: string,
  jobTitle: string,
  company: string,
  interviewUrl: string
) {
  await sendNotification({
    userId,
    userType: "student",
    type: "interview_cancelled",
    title: "Interview Cancelled",
    message: `Your interview for ${jobTitle} at ${company} has been cancelled.`,
    priority: "critical",
    category: "interviews",
    actionUrl: interviewUrl,
    relatedEntityType: "interview",
    relatedEntityId: null,
  });
}

export async function notifyCandidateSelected(
  userId: string,
  jobTitle: string,
  company: string,
  nextSteps: string,
  contactInfo: string | null
) {
  await sendNotification({
    userId,
    userType: "student",
    type: "candidate_selected",
    title: "Congratulations – You Have Been Selected",
    message: `You have been selected for the ${jobTitle} position at ${company}.`,
    priority: "critical",
    category: "applications",
    relatedEntityType: "application",
    relatedEntityId: null,
  });
}

export async function notifyResumeAnalysisCompleted(
  userId: string,
  score: string,
  suggestions: string[],
  dashboardUrl: string
) {
  await sendNotification({
    userId,
    userType: "student",
    type: "resume_analysis",
    title: "Resume Analysis Complete",
    message: `Your resume analysis is complete. Score: ${score}`,
    priority: "low",
    category: "ai",
    actionUrl: dashboardUrl,
    relatedEntityType: "resume",
    relatedEntityId: null,
  });
}

export async function notifySkillGapAnalysis(
  userId: string,
  targetRole: string,
  missingSkills: string[],
  recommendations: string[],
  dashboardUrl: string
) {
  await sendNotification({
    userId,
    userType: "student",
    type: "skill_gap_analysis",
    title: "Skill Gap Analysis Complete",
    message: `Your skill gap analysis for ${targetRole} is complete.`,
    priority: "low",
    category: "ai",
    actionUrl: dashboardUrl,
    relatedEntityType: "skill_gap",
    relatedEntityId: null,
  });
}

// ========================================
// RECRUITER NOTIFICATIONS
// ========================================

export async function notifyWelcomeRecruiter(userId: string, dashboardUrl: string) {
  await sendNotification({
    userId,
    userType: "recruiter",
    type: "welcome_recruiter",
    title: "Welcome to HireSense AI",
    message: "Welcome to HireSense AI. Start posting jobs and discovering top talent.",
    priority: "critical",
    category: "system",
    actionUrl: dashboardUrl,
    relatedEntityType: "user",
    relatedEntityId: userId,
  });
}

export async function notifyJobPosted(
  userId: string,
  jobTitle: string,
  postingDate: string,
  deadline: string | null,
  status: string,
  jobUrl: string
) {
  await sendNotification({
    userId,
    userType: "recruiter",
    type: "job_posted",
    title: "Job Posted Successfully",
    message: `Your job posting "${jobTitle}" has been created successfully.`,
    priority: "important",
    category: "jobs",
    actionUrl: jobUrl,
    relatedEntityType: "job",
    relatedEntityId: jobUrl.split("/").pop(),
  });
}

export async function notifyJobPublished(
  userId: string,
  jobTitle: string,
  publishDate: string,
  jobUrl: string
) {
  await sendNotification({
    userId,
    userType: "recruiter",
    type: "job_published",
    title: "Job Published",
    message: `Your job "${jobTitle}" has been published and is now visible to candidates.`,
    priority: "important",
    category: "jobs",
    actionUrl: jobUrl,
    relatedEntityType: "job",
    relatedEntityId: jobUrl.split("/").pop(),
  });
}

export async function notifyNewApplication(
  userId: string,
  candidateName: string,
  jobTitle: string,
  applicationDate: string,
  message: string,
  applicantsUrl: string
) {
  await sendNotification({
    userId,
    userType: "recruiter",
    type: "new_application",
    title: "New Application Received",
    message: `${candidateName} has applied for ${jobTitle}.`,
    priority: "important",
    category: "applications",
    actionUrl: applicantsUrl,
    relatedEntityType: "application",
    relatedEntityId: applicantsUrl.split("/").pop(),
  });
}

export async function notifyMultipleApplications(
  userId: string,
  count: number,
  jobTitle: string,
  applicantsUrl: string
) {
  await sendNotification({
    userId,
    userType: "recruiter",
    type: "multiple_applications",
    title: "Multiple New Applications",
    message: `You have ${count} new applications for ${jobTitle}.`,
    priority: "important",
    category: "applications",
    actionUrl: applicantsUrl,
    relatedEntityType: "job",
    relatedEntityId: applicantsUrl.split("/").pop(),
  });
}

export async function notifyAiMatchingAvailable(
  userId: string,
  candidateName: string,
  jobTitle: string,
  matchScore: string,
  dashboardUrl: string
) {
  await sendNotification({
    userId,
    userType: "recruiter",
    type: "ai_matching",
    title: "AI-Assisted Candidate Match Available",
    message: `AI-assisted candidate matching analysis is available for ${candidateName} for ${jobTitle}. Match score: ${matchScore}`,
    priority: "important",
    category: "ai",
    actionUrl: dashboardUrl,
    relatedEntityType: "ai_match",
    relatedEntityId: null,
  });
}

export async function notifyAssessmentCompletedRecruiter(
  userId: string,
  candidateName: string,
  jobTitle: string,
  score: string,
  applicantsUrl: string
) {
  await sendNotification({
    userId,
    userType: "recruiter",
    type: "assessment_completed",
    title: "Assessment Completed",
    message: `${candidateName} has completed the assessment for ${jobTitle}. Score: ${score}`,
    priority: "important",
    category: "applications",
    actionUrl: applicantsUrl,
    relatedEntityType: "assessment",
    relatedEntityId: applicantsUrl.split("/").pop(),
  });
}

export async function notifyInterviewScheduledRecruiter(
  userId: string,
  candidateName: string,
  jobTitle: string,
  interviewDate: string,
  interviewTime: string,
  interviewType: string,
  interviewLink: string | null,
  interviewsUrl: string
) {
  await sendNotification({
    userId,
    userType: "recruiter",
    type: "interview_scheduled",
    title: "Interview Scheduled",
    message: `Interview with ${candidateName} for ${jobTitle} scheduled for ${interviewDate} at ${interviewTime}.`,
    priority: "important",
    category: "interviews",
    actionUrl: interviewsUrl,
    relatedEntityType: "interview",
    relatedEntityId: interviewsUrl.split("/").pop(),
  });
}

export async function notifyInterviewReminderRecruiter(
  userId: string,
  candidateName: string,
  jobTitle: string,
  interviewDate: string,
  interviewTime: string,
  interviewsUrl: string
) {
  await sendNotification({
    userId,
    userType: "recruiter",
    type: "interview_reminder",
    title: "Interview Reminder",
    message: `Reminder: Interview with ${candidateName} for ${jobTitle} is scheduled for ${interviewDate} at ${interviewTime}.`,
    priority: "important",
    category: "interviews",
    actionUrl: interviewsUrl,
    relatedEntityType: "interview",
    relatedEntityId: interviewsUrl.split("/").pop(),
  });
}

export async function notifyCandidateWithdrew(
  userId: string,
  candidateName: string,
  jobTitle: string,
  applicantsUrl: string
) {
  await sendNotification({
    userId,
    userType: "recruiter",
    type: "candidate_withdrew",
    title: "Candidate Withdrew Application",
    message: `${candidateName} has withdrawn their application for ${jobTitle}.`,
    priority: "important",
    category: "applications",
    actionUrl: applicantsUrl,
    relatedEntityType: "application",
    relatedEntityId: applicantsUrl.split("/").pop(),
  });
}

export async function notifyJobClosingSoon(
  userId: string,
  jobTitle: string,
  deadline: string,
  jobUrl: string
) {
  await sendNotification({
    userId,
    userType: "recruiter",
    type: "job_closing_soon",
    title: "Job Closing Soon",
    message: `Your job "${jobTitle}" is closing on ${deadline}.`,
    priority: "important",
    category: "jobs",
    actionUrl: jobUrl,
    relatedEntityType: "job",
    relatedEntityId: jobUrl.split("/").pop(),
  });
}

export async function notifyJobExpired(
  userId: string,
  jobTitle: string,
  jobUrl: string
) {
  await sendNotification({
    userId,
    userType: "recruiter",
    type: "job_expired",
    title: "Job Expired",
    message: `Your job "${jobTitle}" has expired.`,
    priority: "low",
    category: "jobs",
    actionUrl: jobUrl,
    relatedEntityType: "job",
    relatedEntityId: jobUrl.split("/").pop(),
  });
}

export async function notifyDailyRecruiterDigest(
  userId: string,
  summary: string,
  dashboardUrl: string
) {
  await sendNotification({
    userId,
    userType: "recruiter",
    type: "daily_digest",
    title: "Daily Recruiter Digest",
    message: summary,
    priority: "low",
    category: "system",
    actionUrl: dashboardUrl,
    relatedEntityType: "digest",
    relatedEntityId: null,
  });
}
