-- Database Setup Verification Script
-- Run this AFTER running supabase-tables.sql to verify everything was created correctly

-- Check if all tables were created
SELECT 
  schemaname,
  tablename,
  tableowner
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN (
    'user_profiles',
    'comments', 
    'feedback',
    'security_audit_logs',
    'moderation_actions',
    'video_performance_logs',
    'error_logs'
  )
ORDER BY tablename;

-- Check if all indexes were created
SELECT 
  indexname,
  tablename,
  indexdef
FROM pg_indexes 
WHERE schemaname = 'public'
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- Check if RLS is enabled on all tables
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN (
    'comments', 
    'feedback',
    'security_audit_logs',
    'moderation_actions',
    'video_performance_logs',
    'error_logs'
  )
ORDER BY tablename;

-- Check if policies were created
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Check if functions and triggers were created
SELECT 
  routine_name,
  routine_type,
  data_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('update_updated_at_column', 'handle_new_user');

SELECT 
  trigger_name,
  event_manipulation,
  event_object_table
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND trigger_name IN ('update_comments_updated_at', 'update_feedback_updated_at', 'on_auth_user_created');