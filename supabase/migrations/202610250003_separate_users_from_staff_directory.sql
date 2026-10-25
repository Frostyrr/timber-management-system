-- ==============================================================================
-- Migration: 202610250003_separate_users_from_staff_directory.sql
-- Description: Decouple System Operator Accounts (timber.profiles) from the 
--              Editorial Staff Directory (timber.people).
--
-- Background:
-- In migration 202610240003, all records from timber.profiles were copied into 
-- timber.people to ensure legacy borrower foreign keys stayed valid. However,
-- this blurred the boundary between authenticated software operators (Admins,
-- Custodians) and editorial masthead members / equipment borrowers (Photojournalists,
-- Writers, Cartoonists).
--
-- This script:
-- 1. Safely removes mock/legacy releases or incidents attached to system profiles.
-- 2. Deletes system profiles from timber.people so the Staff Directory strictly 
--    represents editorial personnel and legitimate borrowers.
-- 3. Is 100% idempotent.
-- ==============================================================================

begin;

-- Step 1: Clean up any foreign key dependencies on releases borrowed by system profiles
delete from timber.external_contacts 
where release_id in (
  select id from timber.releases where borrower_id in (select id from timber.profiles)
);

delete from timber.incidents 
where subject_id in (
  select id from timber.profiles
);

delete from timber.releases 
where borrower_id in (
  select id from timber.profiles
);

-- Step 2: Remove all system operator profiles from the Staff Directory (timber.people)
delete from timber.people 
where id in (
  select id from timber.profiles
);

commit;
