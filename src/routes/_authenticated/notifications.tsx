import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { useCurrentUser } from "@/lib/session";
import { Button } from "@/components/ui/button";
import {
  Bell,
  Briefcase,
  Calendar,
  FileText,
  CheckCircle,
  AlertCircle,
  Trash2,
  Check,
  X,
  Filter,
  ChevronDown,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — HireSense AI" },
      {
        name: "description",
        content:
          "View and manage your notifications for applications, interviews, and job recommendations.",
      },
    ],
  }),
  component: NotificationsPage,
});

type NotificationCategory = "all" | "applications" | "interviews" | "jobs" | "resume" | "system";

function NotificationsPage() {
  const { data: user } = useCurrentUser();
  const queryClient = useQueryClient();
  const [category, setCategory] = useState<NotificationCategory>("all");
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);

  const { data: notifications, isLoading } = useQuery({
    queryKey: ["notifications", user?.id, category, showUnreadOnly],
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

      if (showUnreadOnly) {
        query = query.eq("read", false as any);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from("notifications")
        .update({ read: true } as any)
        .eq("id", notificationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("notifications")
        .update({ read: true } as any)
        .eq("user_id", user!.id as any)
        .eq("read", false as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const deleteNotificationMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase.from("notifications").delete().eq("id", notificationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const categories: { value: NotificationCategory; label: string; icon: any }[] = [
    { value: "all", label: "All", icon: Bell },
    { value: "applications", label: "Applications", icon: Briefcase },
    { value: "interviews", label: "Interviews", icon: Calendar },
    { value: "jobs", label: "Jobs", icon: Briefcase },
    { value: "resume", label: "Resume", icon: FileText },
    { value: "system", label: "System", icon: AlertCircle },
  ];

  const unreadCount = notifications?.filter((n: any) => !n.read).length || 0;

  if (isLoading) {
    return (
      <AppShell title="Notifications" description="Loading notifications...">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Notifications"
      description={`You have ${unreadCount} unread notification${unreadCount !== 1 ? "s" : ""}`}
      actions={
        <div className="flex gap-2">
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => markAllAsReadMutation.mutate()}
              disabled={markAllAsReadMutation.isPending}
            >
              <Check className="mr-2 h-4 w-4" />
              Mark All Read
            </Button>
          )}
        </div>
      }
    >
      {/* Category Filter */}
      <div className="flex flex-wrap gap-2">
        {categories.map((cat) => {
          const Icon = cat.icon;
          return (
            <Button
              key={cat.value}
              variant={category === cat.value ? "default" : "outline"}
              size="sm"
              onClick={() => setCategory(cat.value)}
            >
              <Icon className="mr-2 h-4 w-4" />
              {cat.label}
            </Button>
          );
        })}
      </div>

      {/* Unread Filter */}
      <div className="mt-4 flex items-center gap-2">
        <Button
          variant={showUnreadOnly ? "default" : "outline"}
          size="sm"
          onClick={() => setShowUnreadOnly(!showUnreadOnly)}
        >
          <Filter className="mr-2 h-4 w-4" />
          {showUnreadOnly ? "Show All" : "Unread Only"}
        </Button>
      </div>

      {/* Notifications List */}
      {notifications && notifications.length > 0 ? (
        <div className="mt-6 space-y-3">
          {notifications.map((notification: any) => (
            <article
              key={notification.id}
              className={`rounded-xl border p-5 shadow-card transition-colors ${
                !notification.read ? "border-primary bg-card" : "border-border bg-card/50"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-start gap-3">
                    {!notification.read && <div className="mt-1 h-2 w-2 rounded-full bg-primary" />}
                    <div className="flex-1">
                      <h3 className="font-semibold">{notification.title}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">{notification.message}</p>
                      <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{new Date(notification.created_at).toLocaleDateString()}</span>
                        <span>•</span>
                        <span className="capitalize">{notification.category}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  {!notification.read && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => markAsReadMutation.mutate(notification.id)}
                      disabled={markAsReadMutation.isPending}
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteNotificationMutation.mutate(notification.id)}
                    disabled={deleteNotificationMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {notification.action_link && (
                <div className="mt-3">
                  <Button asChild variant="link" size="sm" className="p-0 h-auto">
                    <Link to={notification.action_link}>View Details →</Link>
                  </Button>
                </div>
              )}
            </article>
          ))}
        </div>
      ) : (
        <div className="mt-8 rounded-xl border border-border bg-card p-10 text-center shadow-card">
          <Bell className="mx-auto h-12 w-12 text-muted-foreground" />
          <p className="mt-4 text-sm text-muted-foreground">
            {showUnreadOnly
              ? "No unread notifications."
              : category === "all"
                ? "No notifications yet."
                : `No ${category} notifications.`}
          </p>
          {category === "all" && !showUnreadOnly && (
            <Button asChild className="mt-4">
              <Link to="/jobs">Browse jobs</Link>
            </Button>
          )}
        </div>
      )}
    </AppShell>
  );
}
