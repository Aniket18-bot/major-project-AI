import { createServerFn } from "@tanstack/react-start";

export const generateAtsResume = createServerFn({ method: "POST" })
  .validator(
    (data: { profile: ReturnType<typeof import("./profile-snapshot").profileSnapshot> }) => data,
  )
  .handler(async ({ data }) => {
    const { generateAtsResumeFromProfile } = await import("./ai.server");
    const content = await generateAtsResumeFromProfile(data.profile);
    return { content };
  });

function asJsonList(value: unknown) {
  return JSON.parse(JSON.stringify(Array.isArray(value) ? value : [])) as never[];
}

export const parseResumeSource = createServerFn({ method: "POST" })
  .validator((data: { sourceText: string }) => data)
  .handler(async ({ data }) => {
    const { parseSourceIntoProfile } = await import("./ai.server");
    const parsed = await parseSourceIntoProfile(data.sourceText);
    const skills = Array.isArray(parsed["skills"])
      ? parsed["skills"].map((skill) => String(skill))
      : [];
    return {
      full_name: String(parsed["full_name"] ?? ""),
      headline: String(parsed["headline"] ?? ""),
      about: String(parsed["about"] ?? ""),
      skills,
      years_experience:
        typeof parsed["years_experience"] === "number" ? parsed["years_experience"] : null,
      education: asJsonList(parsed["education"]),
      achievements: asJsonList(parsed["achievements"]),
      certificates: asJsonList(parsed["certificates"]),
      projects: asJsonList(parsed["projects"]),
      linkedin_url: String(parsed["linkedin_url"] ?? ""),
      github_url: String(parsed["github_url"] ?? ""),
      portfolio_url: String(parsed["portfolio_url"] ?? ""),
    };
  });

export const tailorResume = createServerFn({ method: "POST" })
  .validator(
    (data: {
      profile: ReturnType<typeof import("./profile-snapshot").profileSnapshot>;
      baseResume?: string;
      job: {
        title: string;
        company_name: string;
        description: string;
        required_skills: string[];
        preferred_skills?: string[];
        min_experience?: number;
      };
    }) => data,
  )
  .handler(async ({ data }) => {
    const { tailorResumeToJob } = await import("./ai.server");
    const content = await tailorResumeToJob(data);
    return { content };
  });

export const askAssistant = createServerFn({ method: "POST" })
  .validator(
    (data: {
      role: "student" | "recruiter";
      context: string;
      history: { role: "user" | "assistant"; content: string }[];
      question: string;
    }) => data,
  )
  .handler(async ({ data }) => {
    const { answerAssistant } = await import("./ai.server");
    const content = await answerAssistant(data);
    return { content };
  });

export const analyzeJob = createServerFn({ method: "POST" })
  .validator((data: { job: Record<string, unknown> }) => data)
  .handler(async ({ data }) => {
    const { analyzeJobDescription } = await import("./ai.server");
    const result = await analyzeJobDescription(data.job);
    return result;
  });
