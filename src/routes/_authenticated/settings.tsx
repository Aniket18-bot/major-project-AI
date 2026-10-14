import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { useCurrentUser } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  User,
  Bell,
  Shield,
  Eye,
  Lock,
  Globe,
  Briefcase,
  MapPin,
  DollarSign,
  GraduationCap,
  Trash2,
  Save,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Settings — HireSense AI" },
      {
        name: "description",
        content:
          "Manage your account settings, profile visibility, job preferences, and notification preferences.",
      },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { data: user } = useCurrentUser();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<
    "account" | "profile" | "notifications" | "privacy" | "security"
  >("account");

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user!.id)
        .single();
      if (error) throw error;
      return data;
    },
  });

  // Account Settings
  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [headline, setHeadline] = useState(profile?.headline || "");

  // Job Preferences
  const [preferredLocations, setPreferredLocations] = useState(profile?.preferred_locations || "");
  const [expectedSalary, setExpectedSalary] = useState(profile?.expected_salary || "");
  const [jobTypes, setJobTypes] = useState(profile?.preferred_job_types || "");
  const [workModes, setWorkModes] = useState(profile?.preferred_work_modes || "");

  // Notification Settings
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [applicationNotifications, setApplicationNotifications] = useState(true);
  const [interviewReminders, setInterviewReminders] = useState(true);
  const [jobRecommendations, setJobRecommendations] = useState(true);
  const [aiRecommendations, setAiRecommendations] = useState(true);

  // Privacy Settings
  const [profileVisibility, setProfileVisibility] = useState<"public" | "private">("public");
  const [showEmail, setShowEmail] = useState(false);
  const [showPhone, setShowPhone] = useState(false);

  // Security Settings
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const updateProfileMutation = useMutation({
    mutationFn: async (updates: any) => {
      const { error } = await supabase.from("profiles").update(updates).eq("id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      alert("Settings saved successfully!");
    },
  });

  const handleSaveAccount = () => {
    updateProfileMutation.mutate({
      full_name: fullName,
      headline,
    });
  };

  const handleSaveJobPreferences = () => {
    updateProfileMutation.mutate({
      preferred_locations: preferredLocations,
      expected_salary: expectedSalary,
      preferred_job_types: jobTypes,
      preferred_work_modes: workModes,
    });
  };

  const handleSaveNotifications = () => {
    updateProfileMutation.mutate({
      notification_settings: {
        email: emailNotifications,
        applications: applicationNotifications,
        interviews: interviewReminders,
        jobs: jobRecommendations,
        ai: aiRecommendations,
      },
    });
  };

  const handleSavePrivacy = () => {
    updateProfileMutation.mutate({
      profile_visibility: profileVisibility,
      show_email: showEmail,
      show_phone: showPhone,
    });
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      alert("Passwords do not match!");
      return;
    }

    if (newPassword.length < 6) {
      alert("Password must be at least 6 characters!");
      return;
    }

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      alert("Error changing password: " + error.message);
    } else {
      alert("Password changed successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }
  };

  const handleDeleteAccount = async () => {
    if (!confirm("Are you sure you want to delete your account? This action cannot be undone.")) {
      return;
    }

    const { error } = await supabase.auth.admin.deleteUser(user!.id);
    if (error) {
      alert("Error deleting account: " + error.message);
    } else {
      alert("Account deleted successfully!");
      window.location.href = "/";
    }
  };

  if (isLoading) {
    return (
      <AppShell title="Settings" description="Loading settings...">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </AppShell>
    );
  }

  const tabs = [
    { id: "account" as const, label: "Account", icon: User },
    { id: "profile" as const, label: "Job Preferences", icon: Briefcase },
    { id: "notifications" as const, label: "Notifications", icon: Bell },
    { id: "privacy" as const, label: "Privacy", icon: Eye },
    { id: "security" as const, label: "Security", icon: Shield },
  ];

  return (
    <AppShell title="Settings" description="Manage your account and preferences">
      <div className="flex gap-6">
        {/* Sidebar */}
        <div className="w-64 space-y-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left transition-colors ${
                  activeTab === tab.id ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="text-sm font-medium">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1">
          {activeTab === "account" && (
            <div className="space-y-6">
              <div className="rounded-xl border border-border bg-card p-6 shadow-card">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Account Information
                </h2>
                <div className="mt-4 space-y-4">
                  <div>
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input
                      id="fullName"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Your full name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your@email.com"
                      disabled
                    />
                    <p className="mt-1 text-xs text-muted-foreground">Email cannot be changed</p>
                  </div>
                  <div>
                    <Label htmlFor="headline">Headline</Label>
                    <Textarea
                      id="headline"
                      value={headline}
                      onChange={(e) => setHeadline(e.target.value)}
                      placeholder="e.g., Full Stack Developer | React | Node.js"
                      rows={2}
                    />
                  </div>
                  <Button onClick={handleSaveAccount} disabled={updateProfileMutation.isPending}>
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </Button>
                </div>
              </div>
            </div>
          )}

          {activeTab === "profile" && (
            <div className="space-y-6">
              <div className="rounded-xl border border-border bg-card p-6 shadow-card">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Briefcase className="h-5 w-5" />
                  Job Preferences
                </h2>
                <div className="mt-4 space-y-4">
                  <div>
                    <Label htmlFor="locations">Preferred Locations</Label>
                    <Input
                      id="locations"
                      value={preferredLocations}
                      onChange={(e) => setPreferredLocations(e.target.value)}
                      placeholder="e.g., San Francisco, Remote, New York"
                    />
                  </div>
                  <div>
                    <Label htmlFor="salary">Expected Salary</Label>
                    <Input
                      id="salary"
                      value={expectedSalary}
                      onChange={(e) => setExpectedSalary(e.target.value)}
                      placeholder="e.g., $80,000 - $120,000"
                    />
                  </div>
                  <div>
                    <Label htmlFor="jobTypes">Job Types</Label>
                    <Input
                      id="jobTypes"
                      value={jobTypes}
                      onChange={(e) => setJobTypes(e.target.value)}
                      placeholder="e.g., Full-time, Contract, Part-time"
                    />
                  </div>
                  <div>
                    <Label htmlFor="workModes">Work Modes</Label>
                    <Input
                      id="workModes"
                      value={workModes}
                      onChange={(e) => setWorkModes(e.target.value)}
                      placeholder="e.g., Remote, Hybrid, On-site"
                    />
                  </div>
                  <Button
                    onClick={handleSaveJobPreferences}
                    disabled={updateProfileMutation.isPending}
                  >
                    <Save className="mr-2 h-4 w-4" />
                    Save Preferences
                  </Button>
                </div>
              </div>
            </div>
          )}

          {activeTab === "notifications" && (
            <div className="space-y-6">
              <div className="rounded-xl border border-border bg-card p-6 shadow-card">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Notification Preferences
                </h2>
                <div className="mt-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Email Notifications</p>
                      <p className="text-sm text-muted-foreground">
                        Receive notifications via email
                      </p>
                    </div>
                    <Switch checked={emailNotifications} onCheckedChange={setEmailNotifications} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Application Updates</p>
                      <p className="text-sm text-muted-foreground">
                        Get notified when your application status changes
                      </p>
                    </div>
                    <Switch
                      checked={applicationNotifications}
                      onCheckedChange={setApplicationNotifications}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Interview Reminders</p>
                      <p className="text-sm text-muted-foreground">
                        Receive reminders before scheduled interviews
                      </p>
                    </div>
                    <Switch checked={interviewReminders} onCheckedChange={setInterviewReminders} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Job Recommendations</p>
                      <p className="text-sm text-muted-foreground">
                        Get notified about new job matches
                      </p>
                    </div>
                    <Switch checked={jobRecommendations} onCheckedChange={setJobRecommendations} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">AI Recommendations</p>
                      <p className="text-sm text-muted-foreground">
                        Receive AI-powered career insights
                      </p>
                    </div>
                    <Switch checked={aiRecommendations} onCheckedChange={setAiRecommendations} />
                  </div>
                  <Button
                    onClick={handleSaveNotifications}
                    disabled={updateProfileMutation.isPending}
                  >
                    <Save className="mr-2 h-4 w-4" />
                    Save Preferences
                  </Button>
                </div>
              </div>
            </div>
          )}

          {activeTab === "privacy" && (
            <div className="space-y-6">
              <div className="rounded-xl border border-border bg-card p-6 shadow-card">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Privacy Settings
                </h2>
                <div className="mt-4 space-y-4">
                  <div>
                    <Label>Profile Visibility</Label>
                    <div className="mt-2 flex gap-4">
                      <button
                        onClick={() => setProfileVisibility("public")}
                        className={`flex-1 rounded-lg border px-4 py-3 text-sm transition-colors ${
                          profileVisibility === "public"
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border hover:bg-muted"
                        }`}
                      >
                        <Globe className="mx-auto mb-1 h-4 w-4" />
                        Public
                      </button>
                      <button
                        onClick={() => setProfileVisibility("private")}
                        className={`flex-1 rounded-lg border px-4 py-3 text-sm transition-colors ${
                          profileVisibility === "private"
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border hover:bg-muted"
                        }`}
                      >
                        <Lock className="mx-auto mb-1 h-4 w-4" />
                        Private
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Show Email</p>
                      <p className="text-sm text-muted-foreground">
                        Allow recruiters to see your email
                      </p>
                    </div>
                    <Switch checked={showEmail} onCheckedChange={setShowEmail} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Show Phone</p>
                      <p className="text-sm text-muted-foreground">
                        Allow recruiters to see your phone number
                      </p>
                    </div>
                    <Switch checked={showPhone} onCheckedChange={setShowPhone} />
                  </div>
                  <Button onClick={handleSavePrivacy} disabled={updateProfileMutation.isPending}>
                    <Save className="mr-2 h-4 w-4" />
                    Save Privacy Settings
                  </Button>
                </div>
              </div>
            </div>
          )}

          {activeTab === "security" && (
            <div className="space-y-6">
              <div className="rounded-xl border border-border bg-card p-6 shadow-card">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Security Settings
                </h2>
                <div className="mt-4 space-y-4">
                  <div>
                    <Label htmlFor="currentPassword">Current Password</Label>
                    <Input
                      id="currentPassword"
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter current password"
                    />
                  </div>
                  <div>
                    <Label htmlFor="newPassword">New Password</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
                    />
                  </div>
                  <div>
                    <Label htmlFor="confirmPassword">Confirm New Password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                    />
                  </div>
                  <Button onClick={handleChangePassword}>
                    <Lock className="mr-2 h-4 w-4" />
                    Change Password
                  </Button>
                </div>
              </div>

              <div className="rounded-xl border border-destructive/50 bg-destructive/5 p-6">
                <h2 className="text-lg font-semibold text-destructive flex items-center gap-2">
                  <Trash2 className="h-5 w-5" />
                  Danger Zone
                </h2>
                <div className="mt-4">
                  <p className="text-sm text-muted-foreground">
                    Once you delete your account, there is no going back. Please be certain.
                  </p>
                  <Button variant="destructive" className="mt-4" onClick={handleDeleteAccount}>
                    Delete Account
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
