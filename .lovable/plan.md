# AutoApply — Personal AI Job Application Agent

## Overview

 IMPORTANT: This is a production app for personal use, not a prototype or demo. Every feature must work end to end with real API calls. No dummy data, no mock functions, no placeholder logic. Only build UI for features that are fully functional. I will be using this daily.

Use Supabase for all storage and auth. Use the Lovable AI gateway ([ai.gateway.lovable.dev](http://ai.gateway.lovable.dev)) with model google/gemini-2.5-flash for all AI calls. Use Firecrawl for scraping. PDF generation must happen server-side in edge functions.  
  
A single-user production app that automatically discovers relevant jobs, generates tailored ATS-friendly resumes and cover letters, and manages your application pipeline — all powered by AI.

---

## Phase 1: Foundation & Profile Setup

### Authentication (Single User)

- Simple Supabase auth with email/password login — no signup flow needed, just your account
- Protected routes so only you can access the dashboard

### Profile & Preferences Page

- Form to set: target job titles (multi-select/tags), industry preferences, location preference (remote/hybrid/onsite), minimum salary, experience level, key skills
- Companies to exclude list
- Keyword blacklist (e.g., "10+ years", "security clearance", "unpaid") — any match in title or description auto-disqualifies a job
- Max applications per run setting (default 15)
- Master resume PDF upload → stored in Supabase Storage, text extracted server-side for AI processing

### Database Tables

- `user_profile` — preferences, resume text, resume PDF URL, blacklist, settings
- `job_listings` — company, title, URL, score, status, date found, source, duplicate hash
- `applications` — linked to job, tailored resume/cover letter PDF URLs, status, failure reason

---

## Phase 2: Job Discovery Engine

### Firecrawl-Powered Job Scraping

- Scrape **Workable** job boards as primary structured source
- Use Firecrawl **search** to discover company career pages dynamically (e.g., searching "[company name] careers jobs [your job title]")
- Scrape discovered career pages for job listings

### Smart Filtering Pipeline

1. **Blacklist check** — instant discard if any blacklist keyword found in title or description
2. **Duplicate detection** — hash of company + title + location, skip if exists
3. **AI Scoring** (via Lovable AI / Gemini 2.5 Flash):
  - Role match (30pts), Remote preference (20pts), Salary match (15pts), Skills match (20pts), Company fit (15pts)
  - Only jobs scoring **80+** are saved with status `pending`

---

## Phase 3: AI Resume & Cover Letter Generation

### Tailored Resume Generation

- Takes your master resume text + specific job description
- Rewrites via Gemini 2.5 Flash to match ATS keywords from the posting
- Constraints: one page max, single-column, plain text layout, Arial/Times New Roman
- Generated as clean PDF server-side (edge function), saved to Supabase Storage

### Tailored Cover Letter Generation

- Professional, human-sounding letter specific to the company and role
- References specifics from the job description
- One page max, same clean ATS-friendly PDF format
- Saved to Supabase Storage

---

## Phase 4: Dashboard

### Overview Stats

- Total jobs found, applied, pending, manual required — at a glance

### Job List View

- Company, title, score, status, date, direct link to posting
- **Pending jobs**: preview tailored resume & cover letter, with **Approve** and **Skip** buttons
- **Manual required** jobs highlighted separately with failure reason displayed

### Actions

- Manual scan trigger button to run job discovery on demand
- Approve/skip workflow for pending jobs

---

## Phase 5: Automated Application (Orgo Integration)

*Implementation pending Orgo API documentation*

- For each approved job: navigate to URL, fill form fields, upload tailored resume + cover letter, submit
- Success → status `applied`; Failure → status `manual_required` with logged reason
- Enforces max applications per run limit strictly

---

## Phase 6: Nightly Automation

### Scheduled Cron Job (2am nightly)

- Scan all configured job sources via Firecrawl
- Score, filter, and save qualifying jobs
- Generate tailored resumes and cover letters for approved jobs
- Apply via Orgo (once integrated) up to max applications limit
- Log summary of the run