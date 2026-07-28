-- CRM submissions: a lightweight, standalone email/push-notification
-- planner alongside the sports content-idea system. Deliberately not linked
-- to games/events/storylines — it's for marketing comms, not sports content.
create table crm_submissions (
  id uuid primary key default gen_random_uuid(),
  email_subject text not null,
  content text,
  platform text not null
    check (platform in ('push_notification', 'email')),
  priority text not null default 'normal'
    check (priority in ('low','normal','high','breaking')),
  status text not null default 'idea'
    check (status in ('idea','in_progress','ready','scheduled','posted','archived')),
  due_date date,
  due_time time,
  internal_notes text,
  is_sample boolean not null default false,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index crm_submissions_status_idx on crm_submissions(status);
create index crm_submissions_due_date_idx on crm_submissions(due_date);
create index crm_submissions_archived_idx on crm_submissions(archived_at);
create trigger crm_submissions_set_updated_at before update on crm_submissions
  for each row execute function set_updated_at();

alter table crm_submissions enable row level security;

alter table notifications drop constraint notifications_type_check;
alter table notifications add constraint notifications_type_check
  check (type in (
    'content_idea_added','storyline_added','game_approaching',
    'major_event_approaching','content_due_soon','content_overdue',
    'graphic_due_soon','video_due_soon','storyline_breaking','status_changed',
    'crm_submission_added'
  ));

alter table notifications drop constraint notifications_related_table_check;
alter table notifications add constraint notifications_related_table_check
  check (related_table is null or related_table in (
    'games','major_events','storylines','content_ideas',
    'graphic_requests','video_concepts','crm_submissions'
  ));
