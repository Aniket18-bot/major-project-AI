export type MatchResult = {
  score: number;
  matched: string[];
  missing: string[];
  explanation: string;
};

const normalize = (value: string) => value.trim().toLowerCase();

const ALIASES: Record<string, string> = {
  ml: "machine learning",
  ai: "artificial intelligence",
  js: "javascript",
  ts: "typescript",
  nlp: "natural language processing",
  postgres: "postgresql",
  node: "node.js",
  reactjs: "react",
};

const canonical = (skill: string) => {
  const value = normalize(skill);
  return ALIASES[value] ?? value;
};

/**
 * Skill-overlap scoring with experience weighting.
 * Deliberately ignores name, gender, age and location (bias reduction).
 */
export function scoreCandidate(input: {
  candidateSkills: string[];
  requiredSkills: string[];
  preferredSkills?: string[];
  candidateExperience?: number | null;
  minExperience?: number | null;
}): MatchResult {
  const candidate = new Set(input.candidateSkills.map(canonical).filter(Boolean));
  const required = [...new Set(input.requiredSkills.map((s) => s.trim()).filter(Boolean))];
  const preferred = [
    ...new Set((input.preferredSkills ?? []).map((s) => s.trim()).filter(Boolean)),
  ];

  const matched = required.filter((skill) => candidate.has(canonical(skill)));
  const missing = required.filter((skill) => !candidate.has(canonical(skill)));
  const matchedPreferred = preferred.filter((skill) => candidate.has(canonical(skill)));

  const requiredScore = required.length ? matched.length / required.length : 0.7;
  const preferredScore = preferred.length ? matchedPreferred.length / preferred.length : 0;

  const minExp = input.minExperience ?? 0;
  const candExp = input.candidateExperience ?? 0;
  const expScore = minExp <= 0 ? 1 : Math.min(1, candExp / minExp);

  const score = Math.round((requiredScore * 0.6 + preferredScore * 0.15 + expScore * 0.25) * 100);

  const parts: string[] = [];
  parts.push(
    matched.length
      ? `Matched ${matched.length}/${required.length} core skills (${matched.join(", ")}).`
      : `No core skills matched out of ${required.length || "the"} requirements.`,
  );
  if (matchedPreferred.length) parts.push(`Bonus skills: ${matchedPreferred.join(", ")}.`);
  if (missing.length) parts.push(`Skill gaps: ${missing.join(", ")}.`);
  parts.push(
    minExp <= 0
      ? "No minimum experience required for this role."
      : `Experience ${candExp} yr vs ${minExp} yr required (${Math.round(expScore * 100)}% fit).`,
  );
  parts.push("Scoring used skills and experience only — identity details were excluded.");

  return { score, matched, missing, explanation: parts.join(" ") };
}

export function parseSkills(value: string): string[] {
  return [
    ...new Set(
      value
        .split(/[,\n;]/)
        .map((s) => s.trim())
        .filter(Boolean),
    ),
  ];
}
