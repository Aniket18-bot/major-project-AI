import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

function createSupabaseClient() {
  const SUPABASE_URL = process.env["SUPABASE_URL"];
  const SUPABASE_SERVICE_ROLE_KEY =
    process.env["SUPABASE_SERVICE_ROLE_KEY"] || process.env["SUPABASE_SECRET_KEY"];

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Missing Supabase environment variables");
  }

  return createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

export type NotificationPriority = "critical" | "important" | "low";
export type NotificationType =
  | "account_created"
  | "email_verification"
  | "job_recommendation"
  | "application_submitted"
  | "application_viewed"
  | "application_shortlisted"
  | "application_on_hold"
  | "application_rejected"
  | "assessment_assigned"
  | "assessment_completed"
  | "assessment_reminder"
  | "interview_scheduled"
  | "interview_rescheduled"
  | "interview_cancelled"
  | "interview_reminder"
  | "candidate_selected"
  | "resume_analysis_completed"
  | "skill_gap_analysis"
  | "ai_matching_completed"
  | "job_posted"
  | "job_published"
  | "job_closing_soon"
  | "job_expired"
  | "new_application"
  | "candidate_withdrew"
  | "system";

export type UserType = "student" | "recruiter";

export interface NotificationData {
  userId: string;
  userType: UserType;
  type: NotificationType;
  title: string;
  message: string;
  priority: NotificationPriority;
  category: string;
  link?: string;
  actionUrl?: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  metadata?: Record<string, unknown>;
}

export interface NotificationPreference {
  emailEnabled: boolean;
  inAppEnabled: boolean;
  jobRecommendations: boolean;
  applicationUpdates: boolean;
  assessmentUpdates: boolean;
  interviewUpdates: boolean;
  careerUpdates: boolean;
  recruiterApplicationUpdates: boolean;
  recruiterAiUpdates: boolean;
  recruiterAssessmentUpdates: boolean;
  recruiterInterviewUpdates: boolean;
  recruiterJobDeadlineUpdates: boolean;
  systemNotifications: boolean;
}

// Duplicate prevention key generation
function generateDuplicateKey(
  type: NotificationType,
  relatedEntityType: string | undefined,
  relatedEntityId: string | undefined,
  userId: string
): string {
  return `${type}:${relatedEntityType || 'none'}:${relatedEntityId || 'none'}:${userId}`;
}

// Check if notification should be sent based on preferences
async function shouldSendNotification(
  userId: string,
  type: NotificationType,
  userType: UserType
): Promise<{ inApp: boolean; email: boolean }> {
  const supabase = createSupabaseClient();

  // Get user preferences
  const { data: preferences } = await supabase
    .from("notification_preferences")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (!preferences) {
    // Default preferences if not set
    return { inApp: true, email: false };
  }

  const emailEnabled = preferences.email_enabled && preferences.in_app_enabled;
  const inAppEnabled = preferences.in_app_enabled;

  // Check specific preference based on notification type
  switch (type) {
    case "job_recommendation":
      return {
        inApp: inAppEnabled && preferences.job_recommendations,
        email: emailEnabled && preferences.job_recommendations,
      };
    case "application_submitted":
    case "application_viewed":
    case "application_shortlisted":
    case "application_on_hold":
    case "application_rejected":
      return {
        inApp: inAppEnabled && preferences.application_updates,
        email: emailEnabled && preferences.application_updates,
      };
    case "assessment_assigned":
    case "assessment_completed":
    case "assessment_reminder":
      return {
        inApp: inAppEnabled && preferences.assessment_updates,
        email: emailEnabled && preferences.assessment_updates,
      };
    case "interview_scheduled":
    case "interview_rescheduled":
    case "interview_cancelled":
    case "interview_reminder":
      return {
        inApp: inAppEnabled && preferences.interview_updates,
        email: emailEnabled && preferences.interview_updates,
      };
    case "resume_analysis_completed":
    case "skill_gap_analysis":
    case "ai_matching_completed":
      return {
        inApp: inAppEnabled && preferences.career_updates,
        email: emailEnabled && preferences.career_updates,
      };
    case "new_application":
      return {
        inApp: inAppEnabled && preferences.recruiter_application_updates,
        email: emailEnabled && preferences.recruiter_application_updates,
      };
    case "ai_matching_completed":
      return {
        inApp: inAppEnabled && preferences.recruiter_ai_updates,
        email: emailEnabled && preferences.recruiter_ai_updates,
      };
    case "assessment_completed":
      return {
        inApp: inAppEnabled && preferences.recruiter_assessment_updates,
        email: emailEnabled && preferences.recruiter_assessment_updates,
      };
    case "interview_scheduled":
    case "interview_rescheduled":
    case "interview_cancelled":
      return {
        inApp: inAppEnabled && preferences.recruiter_interview_updates,
        email: emailEnabled && preferences.recruiter_interview_updates,
      };
    case "job_closing_soon":
    case "job_expired":
      return {
        inApp: inAppEnabled && preferences.recruiter_job_deadline_updates,
        email: emailEnabled && preferences.recruiter_job_deadline_updates,
      };
    case "account_created":
    case "email_verification":
      // Security notifications - always send
      return { inApp: true, email: true };
    default:
      return {
        inApp: inAppEnabled && preferences.system_notifications,
        email: emailEnabled && preferences.system_notifications,
      };
  }
}

// Check for duplicate notification
async function isDuplicate(
  type: NotificationType,
  relatedEntityType: string | undefined,
  relatedEntityId: string | undefined,
  userId: string
): Promise<boolean> {
  const supabase = createSupabaseClient();
  const duplicateKey = generateDuplicateKey(type, relatedEntityType, relatedEntityId, userId);

  // Check if similar notification exists in last 24 hours
  const { data: existingNotifications } = await supabase
    .from("notifications")
    .select("id")
    .eq("user_id", userId)
    .eq("type", type)
    .eq("related_entity_type", relatedEntityType || null)
    .eq("related_entity_id", relatedEntityId || null)
    .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .limit(1);

  return !!existingNotifications && existingNotifications.length > 0;
}

// Main notification function
export async function sendNotification(data: NotificationData): Promise<{
  success: boolean;
  inAppCreated: boolean;
  emailQueued: boolean;
  error?: string;
}> {
  try {
    const supabase = createSupabaseClient();

    // Check for duplicates
    const duplicate = await isDuplicate(
      data.type,
      data.relatedEntityType,
      data.relatedEntityId,
      data.userId
    );

    if (duplicate) {
      console.log(`Duplicate notification prevented: ${data.type} for user ${data.userId}`);
      return { success: true, inAppCreated: false, emailQueued: false };
    }

    // Check user preferences
    const shouldSend = await shouldSendNotification(data.userId, data.type, data.userType);

    let inAppCreated = false;
    let emailQueued = false;

    // Create in-app notification if enabled
    if (shouldSend.inApp) {
      const { error: insertError } = await supabase.from("notifications").insert({
        user_id: data.userId,
        user_type: data.userType,
        type: data.type,
        title: data.title,
        message: data.message,
        priority: data.priority,
        category: data.category,
        link: data.link,
        action_url: data.actionUrl,
        related_entity_type: data.relatedEntityType,
        related_entity_id: data.relatedEntityId,
        metadata: data.metadata || {},
        read: false,
        created_at: new Date().toISOString(),
      });

      if (insertError) {
        console.error("Failed to create in-app notification:", insertError);
        return { success: false, inAppCreated: false, emailQueued: false, error: insertError.message };
      }

      inAppCreated = true;
    }

    // Queue email if enabled and priority is critical or important
    if (shouldSend.email && (data.priority === "critical" || data.priority === "important")) {
      // Email will be handled by email service
      emailQueued = true;
    }

    return { success: true, inAppCreated, emailQueued };
  } catch (error) {
    console.error("Error sending notification:", error);
    return {
      success: false,
      inAppCreated: false,
      emailQueued: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Get user preferences
export async function getUserPreferences(userId: string): Promise<NotificationPreference | null> {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from("notification_preferences")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error || !data) {
    return null;
  }

  return {
    emailEnabled: data.email_enabled,
    inAppEnabled: data.in_app_enabled,
    jobRecommendations: data.job_recommendations,
    applicationUpdates: data.application_updates,
    assessmentUpdates: data.assessment_updates,
    interviewUpdates: data.interview_updates,
    careerUpdates: data.career_updates,
    recruiterApplicationUpdates: data.recruiter_application_updates,
    recruiterAiUpdates: data.recruiter_ai_updates,
    recruiterAssessmentUpdates: data.recruiter_assessment_updates,
    recruiterInterviewUpdates: data.recruiter_interview_updates,
    recruiterJobDeadlineUpdates: data.recruiter_job_deadline_updates,
    systemNotifications: data.system_notifications,
  };
}

// Update user preferences
export async function updateUserPreferences(
  userId: string,
  preferences: Partial<NotificationPreference>
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createSupabaseClient();

    const { error } = await supabase
      .from("notification_preferences")
      .upsert({
        user_id: userId,
        ...preferences,
        updated_at: new Date().toISOString(),
      });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
