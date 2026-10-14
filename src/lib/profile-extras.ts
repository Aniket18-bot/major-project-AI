export type EducationItem = {
  school: string;
  degree: string;
  field: string;
  year: string;
};

export type AchievementItem = {
  title: string;
  description: string;
  year: string;
};

export type CertificateItem = {
  name: string;
  issuer: string;
  year: string;
};

export type ProjectItem = {
  name: string;
  description: string;
  tech: string;
  url: string;
};

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

export function readEducation(value: unknown): EducationItem[] {
  return asArray<EducationItem>(value).map((item) => ({
    school: item.school ?? "",
    degree: item.degree ?? "",
    field: item.field ?? "",
    year: item.year ?? "",
  }));
}

export function readAchievements(value: unknown): AchievementItem[] {
  return asArray<AchievementItem>(value).map((item) => ({
    title: item.title ?? "",
    description: item.description ?? "",
    year: item.year ?? "",
  }));
}

export function readCertificates(value: unknown): CertificateItem[] {
  return asArray<CertificateItem>(value).map((item) => ({
    name: item.name ?? "",
    issuer: item.issuer ?? "",
    year: item.year ?? "",
  }));
}

export function readProjects(value: unknown): ProjectItem[] {
  return asArray<ProjectItem>(value).map((item) => ({
    name: item.name ?? "",
    description: item.description ?? "",
    tech: item.tech ?? "",
    url: item.url ?? "",
  }));
}
