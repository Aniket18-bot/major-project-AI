import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { useCurrentUser, useProfile } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  ArrowLeft,
  User,
  Bell,
  Shield,
  Key,
  Trash2,
  Save,
  Building,
  Briefcase,
  Globe,
  Users,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/recruiter-settings")({
  head: () => ({
    meta: [
      { title: "Recruiter Settings — HireSense AI" },
      {
        name: "description",
        content:
          "Manage your recruiter account settings, notifications, preferences, and security.",
      },
    ],
  }),
  component: RecruiterSettingsPage,
});

function RecruiterSettingsPage() {
  const { data: user } = useCurrentUser();
  const { data: profile } = useProfile();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<
    "account" | "company" | "notifications" | "hiring" | "privacy" | "security"
  >("account");

  // Account Settings
  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [headline, setHeadline] = useState(profile?.headline || "");

  // Company Settings
  const [companyName, setCompanyName] = useState(profile?.company_name || "");
  const [companyWebsite, setCompanyWebsite] = useState(profile?.company_website || "");
  const [companyIndustry, setCompanyIndustry] = useState(profile?.company_industry || "");
  const [companySize, setCompanySize] = useState(profile?.company_size || "");

  // Notification Settings
  const [newApplicantAlerts, setNewApplicantAlerts] = useState(true);
  const [interviewReminders, setInterviewReminders] = useState(true);
  const [candidateRecommendations, setCandidateRecommendations] = useState(true);
  const [weeklyAnalytics, setWeeklyAnalytics] = useState(false);
  const [jobExpiryAlerts, setJobExpiryAlerts] = useState(true);
  const [candidateUpdateAlerts, setCandidateUpdateAlerts] = useState(false);

  // Hiring Preferences
  const [autoShortlistThreshold, setAutoShortlistThreshold] = useState("75");
  const [hiringSpeed, setHiringSpeed] = useState("normal");

  // Privacy Settings
  const [profileVisibility, setProfileVisibility] = useState<
    "public" | "private" | "recruiters_only"
  >("public");
  const [dataUsage, setDataUsage] = useState("full");
  const [candidateAccess, setCandidateAccess] = useState("full");

  // Security Settings
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const updateProfile = useMutation({
    mutationFn: async (updates: any) => {
      const { error } = await supabase.from("profiles").update(updates).eq("id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Settings updated successfully");
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Failed to update settings"),
  });

  const updateNotificationSettings = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("profiles")
        .update({
          notification_preferences: JSON.stringify({
            newApplicantAlerts,
            interviewReminders,
            candidateRecommendations,
            weeklyAnalytics,
            jobExpiryAlerts,
            candidateUpdateAlerts,
          }),
          hiring_preferences: JSON.stringify({
            autoShortlistThreshold,
            hiringSpeed,
          }),
          profile_visibility: profileVisibility,
        })
        .eq("id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Preferences updated successfully");
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Failed to update preferences"),
  });

  const changePassword = useMutation({
    mutationFn: async () => {
      if (newPassword !== confirmPassword) {
        toast.error("Passwords do not match");
        return;
      }
      if (newPassword.length < 6) {
        toast.error("Password must be at least 6 characters");
        return;
      }
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Password changed successfully");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Failed to change password"),
  });

  const deleteAccount = useMutation({
    mutationFn: async () => {
      if (!confirm("Are you sure you want to delete your account? This action cannot be undone.")) {
        return;
      }
      const { error } = await supabase.auth.admin.deleteUser(user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Account deleted successfully");
      window.location.href = "/";
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Failed to delete account"),
  });

  if (profile && profile.role !== "recruiter") {
    return (
      <AppShell title="Recruiter Settings" description="This area is for recruiter accounts.">
        <Button asChild>
          <Link to="/dashboard">Go to student dashboard</Link>
        </Button>
      </AppShell>
    );
  }

  const tabs = [
    { id: "account" as const, label: "Account", icon: User },
    { id: "company" as const, label: "Company", icon: Building },
    { id: "notifications" as const, label: "Notifications", icon: Bell },
    { id: "hiring" as const, label: "Hiring", icon: Briefcase },
    { id: "privacy" as const, label: "Privacy", icon: Globe },
    { id: "security" as const, label: "Security", icon: Shield },
  ];

  return (
    <AppShell title="Recruiter Settings" description="Manage your account and preferences">
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
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" value={user?.email || ""} disabled className="bg-muted" />
                    <p className="mt-1 text-xs text-muted-foreground">Email cannot be changed</p>
                  </div>
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
                    <Label htmlFor="headline">Headline</Label>
                    <Textarea
                      id="headline"
                      value={headline}
                      onChange={(e) => setHeadline(e.target.value)}
                      placeholder="e.g., Talent Acquisition Lead | HR Manager"
                      rows={2}
                    />
                  </div>
                  <Button
                    onClick={() => updateProfile.mutate({ full_name: fullName, headline })}
                    disabled={updateProfile.isPending}
                  >
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </Button>
                </div>
              </div>
            </div>
          )}

          {activeTab === "company" && (
            <div className="space-y-6">
              <div className="rounded-xl border border-border bg-card p-6 shadow-card">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Building className="h-5 w-5" />
                  Company Settings
                </h2>
                <div className="mt-4 space-y-4">
                  <div>
                    <Label htmlFor="companyName">Company Name</Label>
                    <Input
                      id="companyName"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="Your company name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="companyWebsite">Company Website</Label>
                    <Input
                      id="companyWebsite"
                      value={companyWebsite}
                      onChange={(e) => setCompanyWebsite(e.target.value)}
                      placeholder="https://yourcompany.com"
                    />
                  </div>
                  <div>
                    <Label htmlFor="companyIndustry">Industry</Label>
                    <Input
                      id="companyIndustry"
                      value={companyIndustry}
                      onChange={(e) => setCompanyIndustry(e.target.value)}
                      placeholder="e.g., Technology, Healthcare, Finance"
                    />
                  </div>
                  <div>
                    <Label htmlFor="companySize">Company Size</Label>
                    <Input
                      id="companySize"
                      value={companySize}
                      onChange={(e) => setCompanySize(e.target.value)}
                      placeholder="e.g., 50-200 employees"
                    />
                  </div>
                  <Button
                    onClick={() =>
                      updateProfile.mutate({
                        company_name: companyName,
                        company_website: companyWebsite,
                        company_industry: companyIndustry,
                        company_size: companySize,
                      })
                    }
                    disabled={updateProfile.isPending}
                  >
                    <Save className="mr-2 h-4 w-4" />
                    Save Company Settings
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
                      <p className="font-medium">New Applicant Alerts</p>
                      <p className="text-sm text-muted-foreground">
                        Get notified when new candidates apply
                      </p>
                    </div>
                    <Switch checked={newApplicantAlerts} onCheckedChange={setNewApplicantAlerts} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Interview Reminders</p>
                      <p className="text-sm text-muted-foreground">
                        Reminders before scheduled interviews
                      </p>
                    </div>
                    <Switch checked={interviewReminders} onCheckedChange={setInterviewReminders} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Candidate Recommendations</p>
                      <p className="text-sm text-muted-foreground">
                        AI-powered candidate suggestions
                      </p>
                    </div>
                    <Switch
                      checked={candidateRecommendations}
                      onCheckedChange={setCandidateRecommendations}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Weekly Analytics</p>
                      <p className="text-sm text-muted-foreground">
                        Weekly hiring performance reports
                      </p>
                    </div>
                    <Switch checked={weeklyAnalytics} onCheckedChange={setWeeklyAnalytics} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Job Expiry Alerts</p>
                      <p className="text-sm text-muted-foreground">
                        Alerts when job postings are about to expire
                      </p>
                    </div>
                    <Switch checked={jobExpiryAlerts} onCheckedChange={setJobExpiryAlerts} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Candidate Update Alerts</p>
                      <p className="text-sm text-muted-foreground">
                        Alerts when candidates update their profiles
                      </p>
                    </div>
                    <Switch
                      checked={candidateUpdateAlerts}
                      onCheckedChange={setCandidateUpdateAlerts}
                    />
                  </div>
                  <Button
                    onClick={() => updateNotificationSettings.mutate()}
                    disabled={updateNotificationSettings.isPending}
                  >
                    <Save className="mr-2 h-4 w-4" />
                    Save Notification Preferences
                  </Button>
                </div>
              </div>
            </div>
          )}

          {activeTab === "hiring" && (
            <div className="space-y-6">
              <div className="rounded-xl border border-border bg-card p-6 shadow-card">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Briefcase className="h-5 w-5" />
                  Hiring Preferences
                </h2>
                <div className="mt-4 space-y-4">
                  <div>
                    <Label htmlFor="autoShortlist">Auto-shortlist Threshold</Label>
                    <select
                      id="autoShortlist"
                      className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                      value={autoShortlistThreshold}
                      onChange={(e) => setAutoShortlistThreshold(e.target.value)}
                    >
                      <option value="90">90% - Very strict</option>
                      <option value="75">75% - Balanced</option>
                      <option value="60">60% - Lenient</option>
                      <option value="50">50% - Very lenient</option>
                      <option value="off">Disabled</option>
                    </select>
                    <p className="text-xs text-muted-foreground mt-1">
                      Automatically shortlist candidates above this match score
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="hiringSpeed">Hiring Speed</Label>
                    <select
                      id="hiringSpeed"
                      className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                      value={hiringSpeed}
                      onChange={(e) => setHiringSpeed(e.target.value)}
                    >
                      <option value="fast">Fast - Prioritize speed over thoroughness</option>
                      <option value="normal">Normal - Balanced approach</option>
                      <option value="thorough">Thorough - Prioritize quality over speed</option>
                    </select>
                  </div>
                  <Button
                    onClick={() => updateNotificationSettings.mutate()}
                    disabled={updateNotificationSettings.isPending}
                  >
                    <Save className="mr-2 h-4 w-4" />
                    Save Hiring Preferences
                  </Button>
                </div>
              </div>
            </div>
          )}

          {activeTab === "privacy" && (
            <div className="space-y-6">
              <div className="rounded-xl border border-border bg-card p-6 shadow-card">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  Privacy Settings
                </h2>
                <div className="mt-4 space-y-4">
                  <div>
                    <Label htmlFor="visibility">Company Profile Visibility</Label>
                    <select
                      id="visibility"
                      className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                      value={profileVisibility}
                      onChange={(e) => setProfileVisibility(e.target.value as any)}
                    >
                      <option value="public">Public - Visible to all candidates</option>
                      <option value="private">Private - Only to invited candidates</option>
                      <option value="recruiters_only">
                        Recruiters Only - Industry professionals only
                      </option>
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="dataUsage">Data Usage Preferences</Label>
                    <select
                      id="dataUsage"
                      className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                      value={dataUsage}
                      onChange={(e) => setDataUsage(e.target.value)}
                    >
                      <option value="full">Full - All AI features enabled</option>
                      <option value="limited">Limited - Basic matching only</option>
                      <option value="minimal">Minimal - Required only</option>
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="candidateAccess">Candidate Data Access</Label>
                    <select
                      id="candidateAccess"
                      className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                      value={candidateAccess}
                      onChange={(e) => setCandidateAccess(e.target.value)}
                    >
                      <option value="full">Full - All candidate information</option>
                      <option value="basic">Basic - Name, skills, experience only</option>
                      <option value="restricted">Restricted - Match score only</option>
                    </select>
                  </div>
                  <Button
                    onClick={() => updateNotificationSettings.mutate()}
                    disabled={updateNotificationSettings.isPending}
                  >
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
                  <Button
                    onClick={() => changePassword.mutate()}
                    disabled={changePassword.isPending || !newPassword}
                  >
                    <Key className="mr-2 h-4 w-4" />
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
                  <Button
                    variant="destructive"
                    onClick={() => deleteAccount.mutate()}
                    disabled={deleteAccount.isPending}
                    className="mt-4"
                  >
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
