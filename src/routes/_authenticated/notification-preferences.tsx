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
import { Bell, Briefcase, Calendar, FileText, Settings, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/notification-preferences")({
  head: () => ({
    meta: [
      { title: "Notification Preferences — HireSense AI" },
      {
        name: "description",
        content: "Manage your notification preferences for emails and in-app notifications.",
      },
    ],
  }),
  component: NotificationPreferencesPage,
});

function NotificationPreferencesPage() {
  const { data: user } = useCurrentUser();
  const queryClient = useQueryClient();
  const [isSaving, setIsSaving] = useState(false);

  const { data: preferences, isLoading } = useQuery({
    queryKey: ["notification-preferences", user?.id],
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
      queryClient.invalidateQueries({ queryKey: ["notification-preferences"] });
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
    job_recommendations: true,
    application_updates: true,
    assessment_updates: true,
    interview_updates: true,
    career_updates: true,
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

        {/* Job Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              Job Notifications
            </CardTitle>
            <CardDescription>
              Control notifications related to job opportunities
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="job-recommendations">Job Recommendations</Label>
                <p className="text-sm text-muted-foreground">
                  Get notified about jobs matching your profile
                </p>
              </div>
              <Switch
                id="job-recommendations"
                checked={prefs.job_recommendations}
                onCheckedChange={(checked) => handleToggle("job_recommendations", checked)}
                disabled={isSaving}
              />
            </div>
          </CardContent>
        </Card>

        {/* Application Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Application Notifications
            </CardTitle>
            <CardDescription>
              Control notifications for your job applications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="application-updates">Application Updates</Label>
                <p className="text-sm text-muted-foreground">
                  Get notified when your application status changes
                </p>
              </div>
              <Switch
                id="application-updates"
                checked={prefs.application_updates}
                onCheckedChange={(checked) => handleToggle("application_updates", checked)}
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
                <Label htmlFor="assessment-updates">Assessment Updates</Label>
                <p className="text-sm text-muted-foreground">
                  Get notified about assessments and reminders
                </p>
              </div>
              <Switch
                id="assessment-updates"
                checked={prefs.assessment_updates}
                onCheckedChange={(checked) => handleToggle("assessment_updates", checked)}
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
                <Label htmlFor="interview-updates">Interview Updates</Label>
                <p className="text-sm text-muted-foreground">
                  Get notified about scheduled interviews and reminders
                </p>
              </div>
              <Switch
                id="interview-updates"
                checked={prefs.interview_updates}
                onCheckedChange={(checked) => handleToggle("interview_updates", checked)}
                disabled={isSaving}
              />
            </div>
          </CardContent>
        </Card>

        {/* Career/AI Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Career & AI Updates
            </CardTitle>
            <CardDescription>
              Control notifications for career assistance and AI features
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="career-updates">Career Updates</Label>
                <p className="text-sm text-muted-foreground">
                  Get notified about resume analysis, skill gaps, and AI recommendations
                </p>
              </div>
              <Switch
                id="career-updates"
                checked={prefs.career_updates}
                onCheckedChange={(checked) => handleToggle("career_updates", checked)}
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
