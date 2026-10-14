import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { useCurrentUser } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Briefcase, Calendar, FileText, Settings, Check, Loader2, Users, Bell } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/recruiter-notification-preferences")({
  head: () => ({
    meta: [
      { title: "Notification Preferences — HireSense AI" },
      {
        name: "description",
        content: "Manage your notification preferences for emails and in-app notifications.",
      },
    ],
  }),
  component: RecruiterNotificationPreferencesPage,
});

function RecruiterNotificationPreferencesPage() {
  const { data: user } = useCurrentUser();
  const queryClient = useQueryClient();
  const [isSaving, setIsSaving] = useState(false);

  const { data: preferences, isLoading } = useQuery({
    queryKey: ["recruiter-notification-preferences", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notification_preferences")
        .select("*")
        .eq("user_id", user!.id)
        .single();

      if (error) {
        console.error("Failed to fetch preferences:", error);
        return null;
      }

      return data;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (preferences: Record<string, boolean>) => {
      if (!user) throw new Error("User not authenticated");

      const { error } = await supabase
        .from("notification_preferences")
        .upsert({
          user_id: user.id,
          ...preferences,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Preferences updated successfully");
      queryClient.invalidateQueries({ queryKey: ["recruiter-notification-preferences"] });
      setIsSaving(false);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to update preferences");
      setIsSaving(false);
    },
  });

  const handleToggle = (key: string, value: boolean) => {
    if (!user || !preferences) return;

    setIsSaving(true);
    updateMutation.mutate({
      [key]: value,
    });
  };

  if (isLoading) {
    return (
      <AppShell title="Notification Preferences" description="Loading preferences...">
        <Loader2 className="h-8 w-8 animate-spin" />
      </AppShell>
    );
  }

  const prefs = preferences || {
    in_app_enabled: true,
    recruiter_application_updates: true,
    recruiter_ai_updates: true,
    recruiter_assessment_updates: true,
    recruiter_interview_updates: true,
    recruiter_job_deadline_updates: true,
    system_notifications: true,
  };

  return (
    <AppShell
      title="Notification Preferences"
      description="Manage how you receive notifications"
    >
      <div className="max-w-3xl space-y-6">
        {/* General Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              General Settings
            </CardTitle>
            <CardDescription>
              Control how you receive notifications overall
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="in-app-enabled">In-App Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Receive notifications in the app
                </p>
              </div>
              <Switch
                id="in-app-enabled"
                checked={prefs.in_app_enabled}
                onCheckedChange={(checked) => handleToggle("in_app_enabled", checked)}
                disabled={isSaving}
              />
            </div>
          </CardContent>
        </Card>

        {/* Application Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Application Notifications
            </CardTitle>
            <CardDescription>
              Control notifications for new applications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="recruiter-application-updates">New Applications</Label>
                <p className="text-sm text-muted-foreground">
                  Get notified when candidates apply to your jobs
                </p>
              </div>
              <Switch
                id="recruiter-application-updates"
                checked={prefs.recruiter_application_updates}
                onCheckedChange={(checked) => handleToggle("recruiter_application_updates", checked)}
                disabled={isSaving}
              />
            </div>
          </CardContent>
        </Card>

        {/* AI Matching Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              AI-Assisted Matching
            </CardTitle>
            <CardDescription>
              Control notifications for AI candidate matching
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="recruiter-ai-updates">AI Matching Updates</Label>
                <p className="text-sm text-muted-foreground">
                  Get notified when AI-assisted matching is available for candidates
                </p>
              </div>
              <Switch
                id="recruiter-ai-updates"
                checked={prefs.recruiter_ai_updates}
                onCheckedChange={(checked) => handleToggle("recruiter_ai_updates", checked)}
                disabled={isSaving}
              />
            </div>
          </CardContent>
        </Card>

        {/* Assessment Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Assessment Notifications
            </CardTitle>
            <CardDescription>
              Control notifications for assessments
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="recruiter-assessment-updates">Assessment Updates</Label>
                <p className="text-sm text-muted-foreground">
                  Get notified when candidates complete assessments
                </p>
              </div>
              <Switch
                id="recruiter-assessment-updates"
                checked={prefs.recruiter_assessment_updates}
                onCheckedChange={(checked) => handleToggle("recruiter_assessment_updates", checked)}
                disabled={isSaving}
              />
            </div>
          </CardContent>
        </Card>

        {/* Interview Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Interview Notifications
            </CardTitle>
            <CardDescription>
              Control notifications for interviews
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="recruiter-interview-updates">Interview Updates</Label>
                <p className="text-sm text-muted-foreground">
                  Get notified about scheduled interviews and reminders
                </p>
              </div>
              <Switch
                id="recruiter-interview-updates"
                checked={prefs.recruiter_interview_updates}
                onCheckedChange={(checked) => handleToggle("recruiter_interview_updates", checked)}
                disabled={isSaving}
              />
            </div>
          </CardContent>
        </Card>

        {/* Job Deadline Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              Job Deadline Notifications
            </CardTitle>
            <CardDescription>
              Control notifications for job deadlines
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="recruiter-job-deadline-updates">Job Deadline Updates</Label>
                <p className="text-sm text-muted-foreground">
                  Get notified when jobs are closing soon or have expired
                </p>
              </div>
              <Switch
                id="recruiter-job-deadline-updates"
                checked={prefs.recruiter_job_deadline_updates}
                onCheckedChange={(checked) => handleToggle("recruiter_job_deadline_updates", checked)}
                disabled={isSaving}
              />
            </div>
          </CardContent>
        </Card>

        {/* System Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              System Notifications
            </CardTitle>
            <CardDescription>
              Control system-wide notifications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="system-notifications">System Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Get notified about system updates and maintenance
                </p>
              </div>
              <Switch
                id="system-notifications"
                checked={prefs.system_notifications}
                onCheckedChange={(checked) => handleToggle("system_notifications", checked)}
                disabled={isSaving}
              />
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Check className="mr-2 h-4 w-4" />
                Save Preferences
              </>
            )}
          </Button>
        </div>
      </div>
    </AppShell>
  );
}
