import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Search,
  ArrowLeft,
  X,
  User,
  Briefcase,
  GraduationCap,
  FileText,
  CheckCircle,
} from "lucide-react";
import { useCurrentUser } from "@/lib/session";

export const Route = createFileRoute("/_authenticated/compare")({
  head: () => ({
    meta: [
      { title: "Candidate Comparison — HireSense AI" },
      {
        name: "description",
        content: "Compare candidates side-by-side to make better hiring decisions.",
      },
    ],
  }),
  component: CandidateComparisonPage,
});

function CandidateComparisonPage() {
  const { data: user } = useCurrentUser();
  const [selectedJob, setSelectedJob] = useState("");
  const [selectedCandidates, setSelectedCandidates] = useState<string[]>([]);
  const [candidateData, setCandidateData] = useState<any[]>([]);
  const [minMatchScore, setMinMatchScore] = useState("0");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: jobs } = useQuery({
    queryKey: ["recruiter-jobs", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select("id, title, required_skills")
        .eq("recruiter_id", user!.id)
        .eq("status", "open");
      if (error) throw error;
      return data;
    },
  });

  const { data: candidates } = useQuery({
    queryKey: ["job-candidates", selectedJob],
    enabled: !!selectedJob,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("applications")
        .select("*")
        .eq("job_id", selectedJob)
        .order("match_score", { ascending: false });
      if (error) throw error;

      const studentIds = [...new Set(data.map((row) => row.student_id))];
      const { data: profiles, error: profilesError } = studentIds.length
        ? await supabase
            .from("profiles")
            .select("id, full_name, headline, skills, years_experience, education, projects")
            .in("id", studentIds)
        : { data: [], error: null };
      if (profilesError) throw profilesError;

      const profilesById = new Map((profiles ?? []).map((row) => [row.id, row]));
      return data.map((row) => ({
        ...row,
        profile: profilesById.get(row.student_id) ?? null,
      }));
    },
  });

  // Filter candidates based on criteria
  const filteredCandidates = candidates?.filter((candidate: any) => {
    const matchScore = Number(candidate.match_score || 0);
    const meetsScore = matchScore >= Number(minMatchScore);
    const meetsStatus =
      statusFilter === "all" ||
      (statusFilter === "shortlisted" && candidate.status === "shortlisted") ||
      (statusFilter === "interview" && candidate.status === "interview") ||
      (statusFilter === "under_review" && candidate.status === "under_review");
    return meetsScore && meetsStatus;
  });

  const addCandidate = (application: any) => {
    if (selectedCandidates.length >= 4) {
      alert("Maximum 4 candidates can be compared");
      return;
    }
    if (!selectedCandidates.includes(application.id)) {
      setSelectedCandidates([...selectedCandidates, application.id]);
      setCandidateData([...candidateData, application]);
    }
  };

  const removeCandidate = (id: string) => {
    setSelectedCandidates(selectedCandidates.filter((c) => c !== id));
    setCandidateData(candidateData.filter((c) => c.id !== id));
  };

  return (
    <AppShell
      title="Candidate Comparison"
      description="Compare candidates side-by-side to make better hiring decisions"
      actions={
        <Button asChild variant="outline">
          <Link to="/recruiter">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Link>
        </Button>
      }
    >
      {/* Job Selection */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-card">
        <h2 className="text-base font-semibold mb-4">Select Job</h2>
        <select
          className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
          value={selectedJob}
          onChange={(e) => {
            setSelectedJob(e.target.value);
            setSelectedCandidates([]);
            setCandidateData([]);
            setMinMatchScore("0");
            setStatusFilter("all");
          }}
        >
          <option value="">Select a job...</option>
          {jobs?.map((job: any) => (
            <option key={job.id} value={job.id}>
              {job.title}
            </option>
          ))}
        </select>
      </div>

      {/* Filters */}
      {selectedJob && (
        <div className="rounded-xl border border-border bg-card p-6 shadow-card">
          <h2 className="text-base font-semibold mb-4">Filter Candidates</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="minMatchScore">Minimum Match Score</Label>
              <select
                id="minMatchScore"
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                value={minMatchScore}
                onChange={(e) => {
                  setMinMatchScore(e.target.value);
                  setSelectedCandidates([]);
                  setCandidateData([]);
                }}
              >
                <option value="0">All scores</option>
                <option value="40">40%+</option>
                <option value="50">50%+</option>
                <option value="60">60%+</option>
                <option value="70">70%+</option>
                <option value="80">80%+</option>
                <option value="90">90%+</option>
              </select>
            </div>
            <div>
              <Label htmlFor="statusFilter">Application Status</Label>
              <select
                id="statusFilter"
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setSelectedCandidates([]);
                  setCandidateData([]);
                }}
              >
                <option value="all">All statuses</option>
                <option value="shortlisted">Shortlisted</option>
                <option value="interview">Interview</option>
                <option value="under_review">Under Review</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Candidate Selection */}
      {selectedJob && (
        <div className="rounded-xl border border-border bg-card p-6 shadow-card">
          <h2 className="text-base font-semibold mb-4">Select Candidates to Compare</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {filteredCandidates?.map((application: any) => (
              <div
                key={application.id}
                className={`rounded-lg border p-4 cursor-pointer transition-colors ${
                  selectedCandidates.includes(application.id)
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-muted-foreground"
                }`}
                onClick={() => addCandidate(application)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-medium">{application.profile?.full_name || "Candidate"}</p>
                    <p className="text-xs text-muted-foreground">
                      {application.profile?.headline || "No headline"}
                    </p>
                  </div>
                  {selectedCandidates.includes(application.id) && (
                    <CheckCircle className="h-5 w-5 text-primary" />
                  )}
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-semibold">{Math.round(application.match_score || 0)}%</span>
                  <span className="text-muted-foreground">match</span>
                </div>
              </div>
            ))}
          </div>
          {filteredCandidates?.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              {candidates?.length === 0
                ? "No candidates have applied to this job yet"
                : "No candidates match the current filters"}
            </p>
          )}
        </div>
      )}

      {/* Comparison Table */}
      {candidateData.length > 0 && (
        <div className="mt-6 rounded-xl border border-border bg-card overflow-hidden shadow-card">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Criteria</th>
                  {candidateData.map((application) => (
                    <th
                      key={application.id}
                      className="px-4 py-3 text-center text-sm font-semibold relative"
                    >
                      {application.profile?.full_name || "Candidate"}
                      <button
                        onClick={() => removeCandidate(application.id)}
                        className="absolute top-2 right-2 text-muted-foreground hover:text-destructive"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <tr>
                  <td className="px-4 py-3 text-sm font-medium flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Overall Match
                  </td>
                  {candidateData.map((application) => (
                    <td key={application.id} className="px-4 py-3 text-center">
                      <span
                        className={`font-semibold ${
                          (application.match_score || 0) >= 80
                            ? "text-success"
                            : (application.match_score || 0) >= 60
                              ? "text-warning-foreground"
                              : "text-destructive"
                        }`}
                      >
                        {Math.round(application.match_score || 0)}%
                      </span>
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="px-4 py-3 text-sm font-medium flex items-center gap-2">
                    <Briefcase className="h-4 w-4" />
                    Experience
                  </td>
                  {candidateData.map((application) => (
                    <td key={application.id} className="px-4 py-3 text-center text-sm">
                      {application.profile?.years_experience
                        ? `${application.profile.years_experience} years`
                        : "Not specified"}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="px-4 py-3 text-sm font-medium flex items-center gap-2">
                    <GraduationCap className="h-4 w-4" />
                    Education
                  </td>
                  {candidateData.map((application) => (
                    <td key={application.id} className="px-4 py-3 text-center text-sm">
                      {application.profile?.education ? "Specified" : "Not specified"}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="px-4 py-3 text-sm font-medium flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Projects
                  </td>
                  {candidateData.map((application) => (
                    <td key={application.id} className="px-4 py-3 text-center text-sm">
                      {application.profile?.projects ? "Yes" : "None"}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="px-4 py-3 text-sm font-medium">Skills</td>
                  {candidateData.map((application) => (
                    <td key={application.id} className="px-4 py-3 text-center">
                      <div className="flex flex-wrap gap-1 justify-center">
                        {(application.profile?.skills || []).slice(0, 3).map((skill: string) => (
                          <span key={skill} className="rounded-full bg-muted px-2 py-0.5 text-xs">
                            {skill}
                          </span>
                        ))}
                        {(application.profile?.skills || []).length > 3 && (
                          <span className="text-xs text-muted-foreground">
                            +{(application.profile?.skills || []).length - 3}
                          </span>
                        )}
                      </div>
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="px-4 py-3 text-sm font-medium text-success">Matched Skills</td>
                  {candidateData.map((application) => (
                    <td key={application.id} className="px-4 py-3 text-center">
                      <div className="flex flex-wrap gap-1 justify-center">
                        {(application.matched_skills || []).slice(0, 3).map((skill: string) => (
                          <span
                            key={skill}
                            className="rounded-full bg-success/15 px-2 py-0.5 text-xs text-success"
                          >
                            {skill}
                          </span>
                        ))}
                        {(application.matched_skills || []).length > 3 && (
                          <span className="text-xs text-muted-foreground">
                            +{(application.matched_skills || []).length - 3}
                          </span>
                        )}
                      </div>
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="px-4 py-3 text-sm font-medium text-warning-foreground">
                    Missing Skills
                  </td>
                  {candidateData.map((application) => (
                    <td key={application.id} className="px-4 py-3 text-center">
                      <div className="flex flex-wrap gap-1 justify-center">
                        {(application.missing_skills || []).slice(0, 3).map((skill: string) => (
                          <span
                            key={skill}
                            className="rounded-full bg-warning/10 px-2 py-0.5 text-xs text-warning-foreground"
                          >
                            {skill}
                          </span>
                        ))}
                        {(application.missing_skills || []).length > 3 && (
                          <span className="text-xs text-muted-foreground">
                            +{(application.missing_skills || []).length - 3}
                          </span>
                        )}
                      </div>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {candidateData.length === 0 && selectedJob && (
        <div className="mt-6 rounded-xl border border-border bg-card p-10 text-center shadow-card">
          <Search className="mx-auto h-12 w-12 text-muted-foreground" />
          <p className="mt-4 text-sm text-muted-foreground">
            Select 2-4 candidates above to compare them side-by-side
          </p>
        </div>
      )}

      {!selectedJob && (
        <div className="mt-6 rounded-xl border border-border bg-card p-10 text-center shadow-card">
          <Search className="mx-auto h-12 w-12 text-muted-foreground" />
          <p className="mt-4 text-sm text-muted-foreground">
            Select a job first to see candidates for comparison
          </p>
        </div>
      )}
    </AppShell>
  );
}
