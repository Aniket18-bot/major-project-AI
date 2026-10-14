import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const COLORS = ["#2563eb", "#0ea5e9", "#22c55e", "#eab308", "#f97316", "#ef4444", "#8b5cf6"];

type ApplicationPoint = {
  status: string;
  match_score: number | null;
  created_at?: string;
};

export function HiringCharts({
  applications,
  jobsPosted,
}: {
  applications: ApplicationPoint[];
  jobsPosted: { title: string; count: number }[];
}) {
  const selected = applications.filter((item) => item.status === "selected").length;
  const rejected = applications.filter((item) => item.status === "rejected").length;
  const pending = applications.length - selected - rejected;
  const pie = [
    { name: "Selected", value: selected },
    { name: "Rejected", value: rejected },
    { name: "Pending", value: pending },
  ].filter((item) => item.value > 0);

  const byDay = new Map<string, number>();
  applications.forEach((item) => {
    const day = (item.created_at ?? "").slice(0, 10) || "unknown";
    byDay.set(day, (byDay.get(day) ?? 0) + 1);
  });
  const line = [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, count]) => ({ day, applications: count }));

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-3">
      <section className="rounded-xl border border-border bg-card p-5 shadow-card">
        <h2 className="text-sm font-semibold">Applications by job</h2>
        <div className="mt-3 h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={jobsPosted}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="title" hide />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="#2563eb" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
      <section className="rounded-xl border border-border bg-card p-5 shadow-card">
        <h2 className="text-sm font-semibold">Pipeline mix</h2>
        <div className="mt-3 h-56">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pie.length ? pie : [{ name: "No data", value: 1 }]}
                dataKey="value"
                nameKey="name"
                innerRadius={40}
                outerRadius={70}
              >
                {(pie.length ? pie : [{ name: "No data", value: 1 }]).map((entry, index) => (
                  <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </section>
      <section className="rounded-xl border border-border bg-card p-5 shadow-card">
        <h2 className="text-sm font-semibold">Applications over time</h2>
        <div className="mt-3 h-56">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={line.length ? line : [{ day: "—", applications: 0 }]}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" hide />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="applications" stroke="#0ea5e9" strokeWidth={2} dot />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}
