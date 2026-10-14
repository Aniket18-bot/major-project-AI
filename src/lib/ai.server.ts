import { completeChat, extractJsonObject } from "./openrouter.server";

export async function generateAtsResumeFromProfile(profile: Record<string, unknown>) {
  return completeChat({
    system:
      "You write ATS-friendly resumes in clean plain text. Use standard headings: Summary, Skills, Education, Projects, Experience/Achievements, Certificates. No tables, no photos, no personal attributes like gender. Use only facts from the profile. If a section is empty, omit it.",
    messages: [
      {
        role: "user",
        content: `Create an ATS-friendly resume from this student profile JSON:\n${JSON.stringify(profile).slice(0, 12000)}`,
      },
    ],
  });
}

export async function parseSourceIntoProfile(sourceText: string) {
  const content = await completeChat({
    json: true,
    system:
      "Extract a student profile from resume or LinkedIn text. Return JSON only with keys: full_name, headline, about, skills (string array), years_experience (number or null), education (array of {school,degree,field,year}), achievements (array of {title,description,year}), certificates (array of {name,issuer,year}), projects (array of {name,description,tech,url}), linkedin_url, github_url, portfolio_url. Invent nothing; use empty strings or empty arrays when unknown.",
    messages: [{ role: "user", content: sourceText.slice(0, 14000) }],
  });
  return extractJsonObject(content);
}

export async function tailorResumeToJob(input: {
  profile: Record<string, unknown>;
  baseResume?: string;
  job: Record<string, unknown>;
}) {
  return completeChat({
    system:
      "Rewrite the resume so it is ATS-friendly and aligned to this job description. Emphasize overlapping skills and honest experience. Do not invent skills the candidate does not have. Keep it plain text with standard headings. If the candidate lacks a required skill, do not fake it; keep remaining strengths prominent.",
    messages: [
      {
        role: "user",
        content: JSON.stringify({
          profile: input.profile,
          currentResume: input.baseResume ?? "",
          job: input.job,
        }).slice(0, 14000),
      },
    ],
  });
}

export async function answerAssistant(input: {
  role: "student" | "recruiter";
  context: string;
  history: { role: "user" | "assistant"; content: string }[];
  question: string;
}) {
  const system =
    input.role === "recruiter"
      ? "You are the recruiter's private hiring assistant for HireSense AI. You know their company, jobs and applicants from the context. Help with pipeline questions, scoring, skill gaps and next hiring steps. Be concise. Do not invent applicants or scores that are not in context."
      : "You are the student's private career assistant for HireSense AI. You know their profile, resumes, applications and skill gaps from the context. Help them improve their profile, understand job fit, what to learn, and how to apply. Be specific and honest. Do not invent jobs or statuses that are not in context.";

  return completeChat({
    system: `${system}\n\nKnown context:\n${input.context.slice(0, 12000)}`,
    messages: [
      ...input.history.slice(-12).map((message) => ({
        role: message.role,
        content: message.content.slice(0, 2000),
      })),
      { role: "user", content: input.question.slice(0, 4000) },
    ],
  });
}

export async function analyzeJobDescription(job: Record<string, unknown>) {
  const content = await completeChat({
    json: true,
    system:
      "You are an expert job description writer and analyzer. Review the job details and provide an improved version of the job posting. Return ONLY a JSON object with these keys: improved_title, improved_description, improved_responsibilities, improved_required_skills (comma-separated string), improved_preferred_skills (comma-separated string), suggestions (array of improvement suggestions). Make the improved version more compelling, clear, and attractive to candidates while maintaining the core information. Keep skills realistic and well-defined. Make responsibilities specific and actionable.",
    messages: [
      {
        role: "user",
        content: `Analyze and improve this job posting:\nTitle: ${job["title"]}\nCompany: ${job["company_name"]}\nLocation: ${job["location"]}\nWork Mode: ${job["work_mode"]}\nEmployment Type: ${job["employment_type"]}\nMin Experience: ${job["min_experience"]} years\nSalary: ${job["salary_min"]}-${job["salary_max"]}\nDescription: ${job["description"]}\nResponsibilities: ${job["responsibilities"]}\nRequired Skills: ${job["required_skills"]}\nPreferred Skills: ${job["preferred_skills"]}`,
      },
    ],
  });
  return extractJsonObject(content);
}
