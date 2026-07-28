-- Some games (mainly college football beyond the first few weeks) have a
-- confirmed DATE well before their exact kickoff TIME is announced via TV
-- selection windows. Rather than making start_time nullable (which would
-- lose the one thing we do know — the date), games get a placeholder time
-- on the real date and this flag says so, so the UI can show "Time TBD"
-- instead of a fabricated-looking kickoff time.
alter table games add column start_time_tbd boolean not null default false;
