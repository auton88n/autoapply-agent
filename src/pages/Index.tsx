import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Briefcase, CheckCircle, Clock, AlertTriangle, ExternalLink, Loader2, Search } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type JobListing = Tables<"job_listings">;

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Pending", variant: "outline" },
  approved: { label: "Approved", variant: "default" },
  skipped: { label: "Skipped", variant: "secondary" },
  applied: { label: "Applied", variant: "default" },
  manual_required: { label: "Manual", variant: "destructive" },
};

export default function Index() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<JobListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, pending: 0, applied: 0, manual: 0 });

  useEffect(() => {
    if (!user) return;
    supabase
      .from("job_listings")
      .select("*")
      .eq("user_id", user.id)
      .order("date_found", { ascending: false })
      .then(({ data }) => {
        const list = data || [];
        setJobs(list);
        setStats({
          total: list.length,
          pending: list.filter((j) => j.status === "pending").length,
          applied: list.filter((j) => j.status === "applied").length,
          manual: list.filter((j) => j.status === "manual_required").length,
        });
        setLoading(false);
      });
  }, [user]);

  const updateJobStatus = async (id: string, status: string) => {
    await supabase.from("job_listings").update({ status }).eq("id", id);
    setJobs((prev) =>
      prev.map((j) => (j.id === id ? { ...j, status } : j))
    );
    setStats((prev) => {
      const job = jobs.find((j) => j.id === id);
      if (!job) return prev;
      const s = { ...prev };
      if (job.status === "pending") s.pending--;
      if (job.status === "applied") s.applied--;
      if (job.status === "manual_required") s.manual--;
      if (status === "pending") s.pending++;
      if (status === "applied") s.applied++;
      if (status === "manual_required") s.manual++;
      return s;
    });
  };

  const statCards = [
    { label: "Total Found", value: stats.total, icon: Briefcase, color: "text-primary" },
    { label: "Pending Review", value: stats.pending, icon: Clock, color: "text-warning" },
    { label: "Applied", value: stats.applied, icon: CheckCircle, color: "text-success" },
    { label: "Manual Required", value: stats.manual, icon: AlertTriangle, color: "text-destructive" },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Your job application pipeline at a glance.</p>
        </div>
        <Button className="gap-2" disabled>
          <Search className="h-4 w-4" />
          Scan for Jobs
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="flex items-center gap-4 p-5">
              <div className={`rounded-lg bg-muted p-2.5 ${color}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{value}</p>
                <p className="text-sm text-muted-foreground">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Job Listings</CardTitle>
        </CardHeader>
        <CardContent>
          {jobs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Briefcase className="mb-3 h-10 w-10 text-muted-foreground/40" />
              <p className="font-medium text-muted-foreground">No jobs found yet</p>
              <p className="text-sm text-muted-foreground/70">Set up your profile and run a scan to discover jobs.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.map((job) => (
                  <TableRow key={job.id}>
                    <TableCell className="font-medium">{job.company}</TableCell>
                    <TableCell>{job.title}</TableCell>
                    <TableCell>
                      <span className="font-mono text-sm">{job.score ?? "—"}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusConfig[job.status]?.variant || "outline"}>
                        {statusConfig[job.status]?.label || job.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(job.date_found).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {job.status === "pending" && (
                          <>
                            <Button size="sm" variant="default" onClick={() => updateJobStatus(job.id, "approved")}>
                              Approve
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => updateJobStatus(job.id, "skipped")}>
                              Skip
                            </Button>
                          </>
                        )}
                        <Button size="sm" variant="ghost" asChild>
                          <a href={job.url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
