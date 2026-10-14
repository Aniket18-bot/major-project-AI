/**
 * Calculate profile completion percentage for students
 */
export function calculateProfileCompletion(profile: {
  full_name?: string | null;
  headline?: string | null;
  about?: string | null;
  phone?: string | null;
  location?: string | null;
  skills?: string[] | null;
  years_experience?: number | null;
  linkedin_url?: string | null;
  github_url?: string | null;
  portfolio_url?: string | null;
  education?: any[] | null;
  achievements?: any[] | null;
  certificates?: any[] | null;
  projects?: any[] | null;
  languages?: string[] | null;
  preferred_roles?: string[] | null;
  preferred_locations?: string[] | null;
  work_mode_preference?: string | null;
  expected_salary_min?: number | null;
  expected_salary_max?: number | null;
  employment_preference?: string | null;
}): number {
  let completed = 0;
  let total = 20;

  // Basic info (5 fields)
  if (profile.full_name?.trim()) completed++;
  if (profile.headline?.trim()) completed++;
  if (profile.about?.trim() && profile.about.length > 50) completed++;
  if (profile.phone?.trim()) completed++;
  if (profile.location?.trim()) completed++;

  // Skills & experience (2 fields)
  if (profile.skills?.length && profile.skills.length > 0) completed++;
  if (profile.years_experience !== null && profile.years_experience !== undefined) completed++;

  // Links (3 fields)
  if (profile.linkedin_url?.trim()) completed++;
  if (profile.github_url?.trim()) completed++;
  if (profile.portfolio_url?.trim()) completed++;

  // Extended profile (4 fields)
  if (profile.education?.length && profile.education.length > 0) completed++;
  if (profile.achievements?.length && profile.achievements.length > 0) completed++;
  if (profile.certificates?.length && profile.certificates.length > 0) completed++;
  if (profile.projects?.length && profile.projects.length > 0) completed++;

  // Career preferences (6 fields)
  if (profile.languages?.length && profile.languages.length > 0) completed++;
  if (profile.preferred_roles?.length && profile.preferred_roles.length > 0) completed++;
  if (profile.preferred_locations?.length && profile.preferred_locations.length > 0) completed++;
  if (profile.work_mode_preference?.trim()) completed++;
  if (profile.expected_salary_min && profile.expected_salary_max) completed++;
  if (profile.employment_preference?.trim()) completed++;

  return Math.round((completed / total) * 100);
}

/**
 * Get profile completion tips
 */
export function getCompletionTips(profile: any): string[] {
  const tips: string[] = [];

  if (!profile.full_name?.trim()) tips.push("Add your full name");
  if (!profile.headline?.trim()) tips.push("Add a professional headline");
  if (!profile.about?.trim() || profile.about.length < 50)
    tips.push("Write a detailed about section (50+ characters)");
  if (!profile.phone?.trim()) tips.push("Add your phone number");
  if (!profile.location?.trim()) tips.push("Add your location");
  if (!profile.skills?.length || profile.skills.length === 0)
    tips.push("Add your technical skills");
  if (profile.years_experience === null || profile.years_experience === undefined)
    tips.push("Specify your years of experience");
  if (!profile.linkedin_url?.trim()) tips.push("Add your LinkedIn profile");
  if (!profile.github_url?.trim()) tips.push("Add your GitHub profile");
  if (!profile.portfolio_url?.trim()) tips.push("Add your portfolio link");
  if (!profile.education?.length || profile.education.length === 0)
    tips.push("Add your education details");
  if (!profile.achievements?.length || profile.achievements.length === 0)
    tips.push("Add your achievements");
  if (!profile.certificates?.length || profile.certificates.length === 0)
    tips.push("Add your certificates");
  if (!profile.projects?.length || profile.projects.length === 0) tips.push("Add your projects");
  if (!profile.languages?.length || profile.languages.length === 0)
    tips.push("Add languages you know");
  if (!profile.preferred_roles?.length || profile.preferred_roles.length === 0)
    tips.push("Add your preferred job roles");
  if (!profile.preferred_locations?.length || profile.preferred_locations.length === 0)
    tips.push("Add your preferred locations");
  if (!profile.work_mode_preference?.trim()) tips.push("Specify your work mode preference");
  if (!profile.expected_salary_min || !profile.expected_salary_max)
    tips.push("Set your expected salary range");
  if (!profile.employment_preference?.trim()) tips.push("Specify your employment preference");

  return tips;
}
