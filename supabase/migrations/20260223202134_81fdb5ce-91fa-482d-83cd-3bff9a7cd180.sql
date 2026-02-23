
-- Drop restrictive policies and recreate as permissive
DROP POLICY IF EXISTS "Users can manage own profile" ON public.user_profile;
CREATE POLICY "Users can manage own profile" ON public.user_profile FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own job listings" ON public.job_listings;
CREATE POLICY "Users can manage own job listings" ON public.job_listings FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own applications" ON public.applications;
CREATE POLICY "Users can manage own applications" ON public.applications FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
