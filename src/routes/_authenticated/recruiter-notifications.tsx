import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { useCurrentUser } from "@/lib/session";
import { Button } from "@/components/ui/button";
import {
  Bell,
  Check,
  Trash2,
  ArrowLeft,
  Briefcase,
  User,
  FileText,
  AlertCircle,
  Users,
  Calendar,
  Clock,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/recruiter-notifications")({
  head: () => ({
    meta: [
      { title: "Recruiter Notifications — HireSense AI" },
      {
        name: "description",
        content:
          "Stay updated with new applications, candidate shortlists, interview schedules, and job expiry alerts.",
      },
    ],
  }),
  component: RecruiterNotificationsPage,
});

function RecruiterNotificationsPage() {
  const { data: user } = useCurrentUser();
  const queryClient = useQueryClient();
  const [category, setCategory] = useState<"all" | "applicants" | "interviews" | "jobs" | "system">(
    "all",
  );
  const [filterRead, setFilterRead] = useState<"all" | "read" | "unread">("all");

  const { data: notifications, isLoading } = useQuery({
    queryKey: ["recruiter-notifications", user?.id, category, filterRead],
    enabled: !!user?.id,
    queryFn: async () => {
      let query = supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user!.id as any)
        .order("created_at", { ascending: false });

      if (category !== "all") {
        query = query.eq("category", category as any);
      }

      if (filterRead === "read") {
        query = query.eq("read", true as any);
      } else if (filterRead === "unread") {
        query = query.eq("read", false as any);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const markAsRead = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from("notifications")
        .update({ read: true } as any)
        .eq("id", notificationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recruiter-notifications"] });
    },
  });

  const markAllAsRead = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("notifications")
        .update({ read: true } as any)
        .eq("user_id", user!.id as any)
        .eq("read", false as any);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("All notifications marked as read");
      queryClient.invalidateQueries({ queryKey: ["recruiter-notifications"] });
    },
  });

  const deleteNotification = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase.from("notifications").delete().eq("id", notificationId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Notification deleted");
      queryClient.invalidateQueries({ queryKey: ["recruiter-notifications"] });
    },
  });

  const filteredNotifications =
    notifications?.filter((n: any) => {
      const matchesCategory = category === "all" || n.category === category;
      const matchesRead =
        filterRead === "all" ||
        (filterRead === "read" && n.read) ||
        (filterRead === "unread" && !n.read);
      return matchesCategory && matchesRead;
    }) || [];

  const unreadCount = notifications?.filter((n: any) => !n.read).length || 0;

  const categoryIcons = {
    applicants: <Users className="h-4 w-4" />,
    interviews: <Calendar className="h-4 w-4" />,
    jobs: <Briefcase className="h-4 w-4" />,
    system: <TrendingUp className="h-4 w-4" />,
  };

  const notificationTypeIcons = {
    new_application: <User className="h-4 w-4" />,
    shortlisted: <Check className="h-4 w-4" />,
    interview_scheduled: <Calendar className="h-4 w-4" />,
    job_expiry: <Clock className="h-4 w-4" />,
    candidate_update: <TrendingUp className="h-4 w-4" />,
    analytics: <FileText className="h-4 w-4" />,
  };

  return (
    <AppShell
      title="Recruiter Notifications"
      description="Stay updated with hiring activities and important alerts"
      actions={
        <Button asChild variant="outline">
          <Link to="/recruiter">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Link>
        </Button>
      }
    >
      {/* Category Filter */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-4 shadow-card">
        <Bell className="h-5 w-5 text-muted-foreground" />
        <div className="flex gap-1">
          {[
            { value: "all", label: "All" },
            { value: "applicants", label: "Applicants" },
            { value: "interviews", label: "Interviews" },
            { value: "jobs", label: "Jobs" },
            { value: "system", label: "System" },
          ].map((option) => (
            <button
              key={option.value}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                category === option.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted hover:bg-muted/80"
              }`}
              onClick={() => setCategory(option.value as any)}
            >
              {option.label}
            </button>
          ))}
        </div>
        <div className="ml-auto flex gap-2">
          <select
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            value={filterRead}
            onChange={(e) => setFilterRead(e.target.value as any)}
          >
            <option value="all">All</option>
            <option value="unread">Unread ({unreadCount})</option>
            <option value="read">Read</option>
          </select>
          {unreadCount > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => markAllAsRead.mutate()}
              disabled={markAllAsRead.isPending}
            >
              <Check className="mr-2 h-4 w-4" />
              Mark all read
            </Button>
          )}
        </div>
      </div>

      {/* Notifications List */}
      <div className="mt-6 space-y-3">
        {isLoading ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            Loading notifications...
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-10 text-center shadow-card">
            <Bell className="mx-auto h-12 w-12 text-muted-foreground" />
            <p className="mt-4 text-sm text-muted-foreground">
              {category === "all" && filterRead === "all"
                ? "No notifications yet"
                : "No notifications match your filters"}
            </p>
          </div>
        ) : (
          filteredNotifications.map((notification: any) => (
            <div
              key={notification.id}
              className={`rounded-xl border p-4 shadow-card transition-colors ${
                !notification.read ? "border-primary bg-primary/5" : "border-border bg-card"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1">
                  <div
                    className={`mt-1 rounded-full p-2 ${
                      !notification.read
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {notificationTypeIcons[
                      notification.type as keyof typeof notificationTypeIcons
                    ] ||
                      categoryIcons[notification.category as keyof typeof categoryIcons] || (
                        <Bell className="h-4 w-4" />
                      )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium">{notification.title}</h3>
                      {!notification.read && <span className="w-2 h-2 rounded-full bg-primary" />}
                    </div>
                    <p className="text-sm text-muted-foreground">{notification.message}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          notification.category === "applicants"
                            ? "bg-success/10 text-success"
                            : notification.category === "interviews"
                              ? "bg-info/10 text-info"
                              : notification.category === "jobs"
                                ? "bg-warning/10 text-warning-foreground"
                                : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {notification.category}
                      </span>
                      <p className="text-xs text-muted-foreground">
                        {new Date(notification.created_at).toLocaleString()}
                      </p>
                    </div>
                    {notification.link && (
                      <Button asChild size="sm" variant="link" className="mt-2 p-0 h-auto">
                        <Link to={notification.link}>View details</Link>
                      </Button>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  {!notification.read && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => markAsRead.mutate(notification.id)}
                      disabled={markAsRead.isPending}
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deleteNotification.mutate(notification.id)}
                    disabled={deleteNotification.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </AppShell>
  );
}
