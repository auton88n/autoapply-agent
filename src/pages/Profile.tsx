import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X, Upload, Save, Loader2 } from "lucide-react";

type Profile = {
  target_job_titles: string[];
  industry_preferences: string[];
  location_preference: string;
  minimum_salary: number | null;
  experience_level: string;
  key_skills: string[];
  excluded_companies: string[];
  keyword_blacklist: string[];
  max_applications_per_run: number;
  resume_pdf_url: string | null;
  resume_text: string | null;
};

function TagInput({ value, onChange, placeholder }: { value: string[]; onChange: (v: string[]) => void; placeholder: string }) {
  const [input, setInput] = useState("");

  const addTag = () => {
    const trimmed = input.trim();
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed]);
      setInput("");
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={placeholder}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); addTag(); }
          }}
        />
        <Button type="button" variant="outline" size="sm" onClick={addTag}>Add</Button>
      </div>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((tag) => (
            <Badge key={tag} variant="secondary" className="gap-1 pr-1">
              {tag}
              <button type="button" onClick={() => onChange(value.filter((t) => t !== tag))} className="rounded-full p-0.5 hover:bg-muted-foreground/20">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Profile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [profile, setProfile] = useState<Profile>({
    target_job_titles: [],
    industry_preferences: [],
    location_preference: "remote",
    minimum_salary: null,
    experience_level: "mid",
    key_skills: [],
    excluded_companies: [],
    keyword_blacklist: [],
    max_applications_per_run: 15,
    resume_pdf_url: null,
    resume_text: null,
  });

  useEffect(() => {
    if (!user) return;
    supabase
      .from("user_profile")
      .select("*")
      .eq("user_id", user.id)
      .single()
      .then(({ data, error }) => {
        if (data) {
          setProfile({
            target_job_titles: data.target_job_titles || [],
            industry_preferences: data.industry_preferences || [],
            location_preference: data.location_preference || "remote",
            minimum_salary: data.minimum_salary,
            experience_level: data.experience_level || "mid",
            key_skills: data.key_skills || [],
            excluded_companies: data.excluded_companies || [],
            keyword_blacklist: data.keyword_blacklist || [],
            max_applications_per_run: data.max_applications_per_run || 15,
            resume_pdf_url: data.resume_pdf_url,
            resume_text: data.resume_text,
          });
        }
        setLoading(false);
      });
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("user_profile")
      .update({
        target_job_titles: profile.target_job_titles,
        industry_preferences: profile.industry_preferences,
        location_preference: profile.location_preference,
        minimum_salary: profile.minimum_salary,
        experience_level: profile.experience_level,
        key_skills: profile.key_skills,
        excluded_companies: profile.excluded_companies,
        keyword_blacklist: profile.keyword_blacklist,
        max_applications_per_run: profile.max_applications_per_run,
      })
      .eq("user_id", user.id);

    setSaving(false);
    if (error) {
      toast({ title: "Error saving", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Profile saved" });
    }
  };

  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.type !== "application/pdf") {
      toast({ title: "Only PDF files allowed", variant: "destructive" });
      return;
    }
    setUploading(true);

    const path = `${user.id}/resume.pdf`;
    const { error: uploadError } = await supabase.storage
      .from("documents")
      .upload(path, file, { upsert: true });

    if (uploadError) {
      toast({ title: "Upload failed", description: uploadError.message, variant: "destructive" });
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("documents").getPublicUrl(path);

    await supabase
      .from("user_profile")
      .update({ resume_pdf_url: urlData.publicUrl })
      .eq("user_id", user.id);

    setProfile((p) => ({ ...p, resume_pdf_url: urlData.publicUrl }));
    setUploading(false);
    toast({ title: "Resume uploaded" });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Profile & Preferences</h1>
        <p className="text-muted-foreground">Configure your job search criteria and upload your resume.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Job Preferences</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label>Target Job Titles</Label>
            <TagInput value={profile.target_job_titles} onChange={(v) => setProfile((p) => ({ ...p, target_job_titles: v }))} placeholder="e.g. Frontend Engineer" />
          </div>

          <div className="space-y-2">
            <Label>Key Skills</Label>
            <TagInput value={profile.key_skills} onChange={(v) => setProfile((p) => ({ ...p, key_skills: v }))} placeholder="e.g. React, TypeScript" />
          </div>

          <div className="space-y-2">
            <Label>Industry Preferences</Label>
            <TagInput value={profile.industry_preferences} onChange={(v) => setProfile((p) => ({ ...p, industry_preferences: v }))} placeholder="e.g. FinTech, SaaS" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Location Preference</Label>
              <Select value={profile.location_preference} onValueChange={(v) => setProfile((p) => ({ ...p, location_preference: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="remote">Remote</SelectItem>
                  <SelectItem value="hybrid">Hybrid</SelectItem>
                  <SelectItem value="onsite">On-site</SelectItem>
                  <SelectItem value="any">Any</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Experience Level</Label>
              <Select value={profile.experience_level} onValueChange={(v) => setProfile((p) => ({ ...p, experience_level: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="entry">Entry</SelectItem>
                  <SelectItem value="mid">Mid</SelectItem>
                  <SelectItem value="senior">Senior</SelectItem>
                  <SelectItem value="lead">Lead</SelectItem>
                  <SelectItem value="executive">Executive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Minimum Salary ($)</Label>
              <Input
                type="number"
                value={profile.minimum_salary ?? ""}
                onChange={(e) => setProfile((p) => ({ ...p, minimum_salary: e.target.value ? Number(e.target.value) : null }))}
                placeholder="e.g. 80000"
              />
            </div>
            <div className="space-y-2">
              <Label>Max Applications Per Run</Label>
              <Input
                type="number"
                value={profile.max_applications_per_run}
                onChange={(e) => setProfile((p) => ({ ...p, max_applications_per_run: Number(e.target.value) || 15 }))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
          <CardDescription>Jobs matching these will be auto-disqualified.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label>Keyword Blacklist</Label>
            <TagInput value={profile.keyword_blacklist} onChange={(v) => setProfile((p) => ({ ...p, keyword_blacklist: v }))} placeholder="e.g. security clearance" />
          </div>
          <div className="space-y-2">
            <Label>Excluded Companies</Label>
            <TagInput value={profile.excluded_companies} onChange={(v) => setProfile((p) => ({ ...p, excluded_companies: v }))} placeholder="e.g. Acme Corp" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Master Resume</CardTitle>
          <CardDescription>Upload your base resume PDF. AI will tailor it per application.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Button variant="outline" className="gap-2" disabled={uploading} asChild>
              <label>
                <Upload className="h-4 w-4" />
                {uploading ? "Uploading..." : "Upload PDF"}
                <input type="file" accept=".pdf" className="hidden" onChange={handleResumeUpload} />
              </label>
            </Button>
            {profile.resume_pdf_url && (
              <span className="text-sm text-muted-foreground">✓ Resume uploaded</span>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save Preferences
        </Button>
      </div>
    </div>
  );
}
