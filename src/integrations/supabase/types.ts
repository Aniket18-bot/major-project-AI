export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      applications: {
        Row: {
          cover_note: string | null;
          created_at: string;
          explanation: string | null;
          id: string;
          interview_date: string | null;
          interview_link: string | null;
          interview_notes: string | null;
          interview_time: string | null;
          interview_type: string | null;
          job_id: string;
          match_score: number | null;
          matched_skills: string[];
          missing_skills: string[];
          recruiter_note: string | null;
          resume_id: string | null;
          stage: string;
          status:
            "applied" | "under_review" | "shortlisted" | "interview" | "selected" | "rejected";
          student_id: string;
          updated_at: string;
        };
        Insert: {
          cover_note?: string | null;
          created_at?: string;
          explanation?: string | null;
          id?: string;
          interview_date?: string | null;
          interview_link?: string | null;
          interview_notes?: string | null;
          interview_time?: string | null;
          interview_type?: string | null;
          job_id: string;
          match_score?: number | null;
          matched_skills?: string[];
          missing_skills?: string[];
          recruiter_note?: string | null;
          resume_id?: string | null;
          stage?: string;
          status?:
            "applied" | "under_review" | "shortlisted" | "interview" | "selected" | "rejected";
          student_id: string;
          updated_at?: string;
        };
        Update: {
          cover_note?: string | null;
          created_at?: string;
          explanation?: string | null;
          id?: string;
          interview_date?: string | null;
          interview_link?: string | null;
          interview_notes?: string | null;
          interview_time?: string | null;
          interview_type?: string | null;
          job_id?: string;
          match_score?: number | null;
          matched_skills?: string[];
          missing_skills?: string[];
          recruiter_note?: string | null;
          resume_id?: string | null;
          stage?: string;
          status?:
            "applied" | "under_review" | "shortlisted" | "interview" | "selected" | "rejected";
          student_id?: string;
          updated_at?: string;
        };
      };
      jobs: {
        Row: {
          company_name: string | null;
          created_at: string;
          description: string;
          id: string;
          location: string | null;
          recruiter_id: string;
          required_skills: string[];
          status: "open" | "closed";
          title: string;
          updated_at: string;
        };
        Insert: {
          company_name?: string | null;
          created_at?: string;
          description: string;
          id?: string;
          location?: string | null;
          recruiter_id: string;
          required_skills?: string[];
          status?: "open" | "closed";
          title: string;
          updated_at?: string;
        };
        Update: {
          company_name?: string | null;
          created_at?: string;
          description?: string;
          id?: string;
          location?: string | null;
          recruiter_id?: string;
          required_skills?: string[];
          status?: "open" | "closed";
          title?: string;
          updated_at?: string;
        };
      };
      notifications: {
        Row: {
          action_link: string | null;
          action_url: string | null;
          category: string;
          created_at: string;
          id: string;
          link: string | null;
          message: string;
          metadata: Json;
          priority: "critical" | "important" | "low";
          read: boolean;
          related_entity_id: string | null;
          related_entity_type: string | null;
          title: string;
          type: string;
          user_id: string;
          user_type: "student" | "recruiter";
        };
        Insert: {
          action_link?: string | null;
          action_url?: string | null;
          category: string;
          created_at?: string;
          id?: string;
          link?: string | null;
          message: string;
          metadata?: Json;
          priority?: "critical" | "important" | "low";
          read?: boolean;
          related_entity_id?: string | null;
          related_entity_type?: string | null;
          title: string;
          type: string;
          user_id: string;
          user_type?: "student" | "recruiter";
        };
        Update: {
          action_link?: string | null;
          action_url?: string | null;
          category?: string;
          created_at?: string;
          id?: string;
          link?: string | null;
          message?: string;
          metadata?: Json;
          priority?: "critical" | "important" | "low";
          read?: boolean;
          related_entity_id?: string | null;
          related_entity_type?: string | null;
          title?: string;
          type?: string;
          user_id?: string;
          user_type?: "student" | "recruiter";
        };
      };
      notification_preferences: {
        Row: {
          assessment_updates: boolean;
          application_updates: boolean;
          career_updates: boolean;
          created_at: string;
          email_enabled: boolean;
          in_app_enabled: boolean;
          interview_updates: boolean;
          job_recommendations: boolean;
          recruiter_ai_updates: boolean;
          recruiter_application_updates: boolean;
          recruiter_assessment_updates: boolean;
          recruiter_interview_updates: boolean;
          recruiter_job_deadline_updates: boolean;
          system_notifications: boolean;
          updated_at: string;
          user_id: string;
          id: string;
        };
        Insert: {
          assessment_updates?: boolean;
          application_updates?: boolean;
          career_updates?: boolean;
          created_at?: string;
          email_enabled?: boolean;
          id?: string;
          in_app_enabled?: boolean;
          interview_updates?: boolean;
          job_recommendations?: boolean;
          recruiter_ai_updates?: boolean;
          recruiter_application_updates?: boolean;
          recruiter_assessment_updates?: boolean;
          recruiter_interview_updates?: boolean;
          recruiter_job_deadline_updates?: boolean;
          system_notifications?: boolean;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          assessment_updates?: boolean;
          application_updates?: boolean;
          career_updates?: boolean;
          created_at?: string;
          email_enabled?: boolean;
          id?: string;
          in_app_enabled?: boolean;
          interview_updates?: boolean;
          job_recommendations?: boolean;
          recruiter_ai_updates?: boolean;
          recruiter_application_updates?: boolean;
          recruiter_assessment_updates?: boolean;
          recruiter_interview_updates?: boolean;
          recruiter_job_deadline_updates?: boolean;
          system_notifications?: boolean;
          updated_at?: string;
          user_id?: string;
        };
      };
      profiles: {
        Row: {
          achievements: Json;
          certificates: Json;
          created_at: string;
          education: Json;
          email: string | null;
          full_name: string | null;
          github_url: string | null;
          headline: string | null;
          id: string;
          linkedin_url: string | null;
          location: string | null;
          phone: string | null;
          portfolio_url: string | null;
          preferred_roles: Json;
          projects: Json;
          role: "student" | "recruiter";
          skills: string[];
          updated_at: string;
          years_experience: number | null;
        };
        Insert: {
          achievements?: Json;
          certificates?: Json;
          created_at?: string;
          education?: Json;
          email?: string | null;
          full_name?: string | null;
          github_url?: string | null;
          headline?: string | null;
          id?: string;
          linkedin_url?: string | null;
          location?: string | null;
          phone?: string | null;
          portfolio_url?: string | null;
          preferred_roles?: Json;
          projects?: Json;
          role?: "student" | "recruiter";
          skills?: string[];
          updated_at?: string;
          years_experience?: number | null;
        };
        Update: {
          achievements?: Json;
          certificates?: Json;
          created_at?: string;
          education?: Json;
          email?: string | null;
          full_name?: string | null;
          github_url?: string | null;
          headline?: string | null;
          id?: string;
          linkedin_url?: string | null;
          location?: string | null;
          phone?: string | null;
          portfolio_url?: string | null;
          preferred_roles?: Json;
          projects?: Json;
          role?: "student" | "recruiter";
          skills?: string[];
          updated_at?: string;
          years_experience?: number | null;
        };
      };
      resumes: {
        Row: {
          content: string;
          created_at: string;
          id: string;
          source: string;
          student_id: string;
          title: string;
          updated_at: string;
        };
        Insert: {
          content: string;
          created_at?: string;
          id?: string;
          source: string;
          student_id: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          content?: string;
          created_at?: string;
          id?: string;
          source?: string;
          student_id?: string;
          title?: string;
          updated_at?: string;
        };
      };
      user_roles: {
        Row: {
          id: string;
          role: "student" | "recruiter";
          user_id: string;
        };
        Insert: {
          id?: string;
          role: "student" | "recruiter";
          user_id: string;
        };
        Update: {
          id?: string;
          role?: "student" | "recruiter";
          user_id?: string;
        };
      };
      chat_messages: {
        Row: {
          created_at: string;
          id: string;
          message: string;
          role: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          message: string;
          role: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          message?: string;
          role?: string;
          user_id?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      application_status:
        "applied" | "under_review" | "shortlisted" | "interview" | "selected" | "rejected";
      app_role: "student" | "recruiter";
      job_status: "open" | "closed";
    };
  };
};
