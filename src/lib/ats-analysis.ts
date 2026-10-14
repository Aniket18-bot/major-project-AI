/**
 * Analyze resume for ATS compatibility
 */
export interface ATSAnalysis {
  overallScore: number;
  formattingScore: number;
  skillsCoverageScore: number;
  keywordRelevanceScore: number;
  readabilityScore: number;
  completenessScore: number;
  healthScore: number;
  strengths: string[];
  improvements: string[];
  analysisData: {
    hasSections: boolean[];
    sectionCount: number;
    wordCount: number;
    avgSentenceLength: number;
    skillKeywords: string[];
    actionVerbs: string[];
  };
}

export function analyzeResumeForATS(resumeContent: string, requiredSkills?: string[]): ATSAnalysis {
  const content = resumeContent.toLowerCase();
  const lines = resumeContent.split("\n").filter((line) => line.trim());
  const words = resumeContent.split(/\s+/).filter((word) => word.trim());

  // Check for standard sections
  const standardSections = [
    "summary",
    "skills",
    "experience",
    "education",
    "projects",
    "certifications",
    "achievements",
  ];
  const hasSections = standardSections.map(
    (section) => content.includes(section) || content.includes(section.replace("summary", "about")),
  );
  const sectionCount = hasSections.filter(Boolean).length;
  const formattingScore = Math.round((sectionCount / standardSections.length) * 100);

  // Skills coverage
  let skillsCoverageScore = 0;
  const skillKeywords: string[] = [];
  if (requiredSkills && requiredSkills.length > 0) {
    const matchedSkills = requiredSkills.filter((skill) => content.includes(skill.toLowerCase()));
    skillsCoverageScore = Math.round((matchedSkills.length / requiredSkills.length) * 100);
    skillKeywords.push(...matchedSkills);
  } else {
    // Extract potential skills from resume
    const commonSkills = [
      "python",
      "javascript",
      "react",
      "node",
      "sql",
      "java",
      "aws",
      "docker",
      "git",
      "kubernetes",
      "machine learning",
      "data analysis",
      "project management",
    ];
    const foundSkills = commonSkills.filter((skill) => content.includes(skill));
    skillsCoverageScore = foundSkills.length > 0 ? 70 : 30;
    skillKeywords.push(...foundSkills);
  }

  // Keyword relevance (action verbs and keywords)
  const actionVerbs = [
    "developed",
    "implemented",
    "designed",
    "created",
    "managed",
    "led",
    "built",
    "optimized",
    "analyzed",
    "achieved",
  ];
  const foundActionVerbs = actionVerbs.filter((verb) => content.includes(verb));
  const keywordRelevanceScore = Math.min(
    100,
    Math.round((foundActionVerbs.length / actionVerbs.length) * 100) + 30,
  );

  // Readability (sentence length, complexity)
  const sentences = resumeContent.split(/[.!?]+/).filter((s) => s.trim());
  const avgSentenceLength = sentences.length > 0 ? words.length / sentences.length : 0;
  const readabilityScore =
    avgSentenceLength > 0 && avgSentenceLength < 25 ? 90 : avgSentenceLength < 35 ? 70 : 50;

  // Completeness (has all key sections)
  const completenessScore = formattingScore;

  // Overall score (weighted average)
  const overallScore = Math.round(
    formattingScore * 0.2 +
      skillsCoverageScore * 0.3 +
      keywordRelevanceScore * 0.2 +
      readabilityScore * 0.15 +
      completenessScore * 0.15,
  );

  // Health score (overall + bonus factors)
  const healthScore = Math.min(100, overallScore + (words.length > 200 ? 10 : 0));

  // Generate strengths
  const strengths: string[] = [];
  if (sectionCount >= 5) strengths.push("Well-structured with standard sections");
  if (skillsCoverageScore >= 70) strengths.push("Strong skills coverage");
  if (foundActionVerbs.length >= 5) strengths.push("Good use of action verbs");
  if (readabilityScore >= 80) strengths.push("Clear and readable content");
  if (words.length > 300) strengths.push("Comprehensive content");

  // Generate improvements
  const improvements: string[] = [];
  if (sectionCount < 5)
    improvements.push(
      "Add missing standard sections (Summary, Skills, Experience, Education, Projects)",
    );
  if (skillsCoverageScore < 50) improvements.push("Include more relevant skills and keywords");
  if (foundActionVerbs.length < 3)
    improvements.push("Use more action verbs to describe achievements");
  if (readabilityScore < 70) improvements.push("Break down long sentences for better readability");
  if (words.length < 200) improvements.push("Add more detail to your experience and projects");
  if (!content.includes("quantif") && !content.includes("%") && !content.includes("number")) {
    improvements.push(
      "Add quantifiable achievements (e.g., 'increased by 30%', 'managed team of 5')",
    );
  }

  return {
    overallScore,
    formattingScore,
    skillsCoverageScore,
    keywordRelevanceScore,
    readabilityScore,
    completenessScore,
    healthScore,
    strengths,
    improvements,
    analysisData: {
      hasSections,
      sectionCount,
      wordCount: words.length,
      avgSentenceLength,
      skillKeywords,
      actionVerbs: foundActionVerbs,
    },
  };
}
