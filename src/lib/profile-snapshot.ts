import type { Profile } from "@/lib/session";

export function profileSnapshot(profile: Profile | null | undefined) {
  return {
    full_name: profile?.full_name ?? "",
    headline: profile?.headline ?? "",
    about: profile?.about ?? "",
    skills: profile?.skills ?? [],
    years_experience: profile?.years_experience ?? 0,
    location: profile?.location ?? "",
    education: profile?.education ?? [],
    achievements: profile?.achievements ?? [],
    certificates: profile?.certificates ?? [],
    projects: profile?.projects ?? [],
    linkedin_url: profile?.linkedin_url ?? "",
    github_url: profile?.github_url ?? "",
    portfolio_url: profile?.portfolio_url ?? "",
    email: profile?.email ?? "",
    phone: profile?.phone ?? "",
  };
}
