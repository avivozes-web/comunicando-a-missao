import { addDays, todayISO } from './dates'
import { supabase } from './supabase'
import type { Assignees, Bundle, GoalConfig, Idea, Narrative, Post, Task, YearDate, YearMonth } from './types'
import { EMPTY_BUNDLE } from './types'

function asBundle(rows: Record<string, unknown[]>): Bundle {
  const goal = (rows.goal_config?.[0] || null) as GoalConfig | null
  const narrative = (rows.narrative?.[0] || { body: '', updated_by: null }) as Narrative
  return {
    posts: (rows.posts || []) as Post[],
    ideas: (rows.ideas || []) as Idea[],
    fixed_tasks: (rows.fixed_tasks || []) as Bundle['fixed_tasks'],
    tasks: (rows.tasks || []) as Task[],
    year_months: (rows.year_months || []) as YearMonth[],
    year_dates: (rows.year_dates || []) as YearDate[],
    narrative,
    reports: (rows.reports || []) as Bundle['reports'],
    snapshots: (rows.snapshots || []) as Bundle['snapshots'],
    followers: (rows.followers || []) as Bundle['followers'],
    events: (rows.events || []) as Bundle['events'],
    goal_days: (rows.goal_days || []) as Bundle['goal_days'],
    goal_config: goal,
    link_taps: (rows.link_taps || []) as Bundle['link_taps'],
  }
}

async function table(name: string, order?: string) {
  let query = supabase.from(name).select('*')
  if (order) query = query.order(order)
  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data || []
}

export async function loadBundle(): Promise<Bundle> {
  const today = todayISO()
  const { error: rollError } = await supabase.rpc('rollover_tasks', { p_today: today })
  if (rollError && !/function|schema|does not exist|404/i.test(rollError.message)) {
    // The routine still loads if the helper was not created yet.
  } else if (!rollError) {
    await supabase.rpc('materialize_fixed_tasks', { p_from: today, p_to: addDays(today, 21) })
  }
  const [
    posts, ideas, fixed_tasks, tasks, year_months, year_dates, narrative,
    reports, snapshots, followers, events, goal_days, goal_config, link_taps,
  ] = await Promise.all([
    table('posts', 'scheduled_date'),
    table('ideas', 'updated_at'),
    table('fixed_tasks', 'sort'),
    table('tasks', 'due_date'),
    table('year_months', 'month'),
    table('year_dates', 'month'),
    table('narrative'),
    table('reports', 'period_start'),
    table('follower_snapshots', 'snapshot_date'),
    table('followers', 'arroba'),
    table('follower_events', 'event_date'),
    table('goal_days', 'day'),
    table('goal_config'),
    table('link_taps', 'day'),
  ])
  return asBundle({
    posts, ideas, fixed_tasks, tasks, year_months, year_dates, narrative,
    reports, snapshots, followers, events, goal_days, goal_config, link_taps,
  })
}

export async function savePost(post: Post, assignees?: Assignees): Promise<void> {
  const { error } = await supabase.from('posts').upsert(post)
  if (error) throw new Error(error.message)
  if (!assignees) return
  const { data, error: taskError } = await supabase.from('tasks').select('*').eq('post_id', post.id)
  if (taskError) throw new Error(taskError.message)
  for (const task of (data || []) as Task[]) {
    if (!task.step || !assignees[task.step] || assignees[task.step] === task.assignee) continue
    const { error: updateError } = await supabase.from('tasks').update({ assignee: assignees[task.step] }).eq('id', task.id)
    if (updateError) throw new Error(updateError.message)
  }
}

export async function removePost(id: string): Promise<void> {
  const { error } = await supabase.from('posts').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

export async function uploadCover(postId: string, file: File): Promise<string> {
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg'
  const path = `${postId}/${Date.now()}.${ext}`
  const { error } = await supabase.storage.from('capas').upload(path, file, {
    upsert: true,
    contentType: file.type || 'image/jpeg',
  })
  if (error) throw new Error(error.message)
  const { data } = supabase.storage.from('capas').getPublicUrl(path)
  const { error: updateError } = await supabase.from('posts').update({ cover_url: data.publicUrl }).eq('id', postId)
  if (updateError) throw new Error(updateError.message)
  return data.publicUrl
}

export async function saveIdea(idea: Idea): Promise<void> {
  const { error } = await supabase.from('ideas').upsert({ ...idea, updated_at: new Date().toISOString() })
  if (error) throw new Error(error.message)
}

export async function removeIdea(id: string): Promise<void> {
  const { error } = await supabase.from('ideas').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

export async function saveTask(task: Task): Promise<void> {
  const { error } = await supabase.from('tasks').upsert(task)
  if (error) throw new Error(error.message)
}

export async function removeTask(id: string): Promise<void> {
  const { error } = await supabase.from('tasks').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

export async function saveMonth(row: YearMonth): Promise<void> {
  const { error } = await supabase.from('year_months').upsert(row)
  if (error) throw new Error(error.message)
}

export async function saveYearDate(row: YearDate): Promise<void> {
  const { error } = await supabase.from('year_dates').upsert(row)
  if (error) throw new Error(error.message)
}

export async function removeYearDate(id: string): Promise<void> {
  const { error } = await supabase.from('year_dates').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

export async function saveNarrative(narrative: Narrative): Promise<void> {
  const { error } = await supabase.from('narrative').upsert({ id: 1, ...narrative })
  if (error) throw new Error(error.message)
}

export async function saveGoalNotes(account: string, notes: GoalConfig['notes']): Promise<void> {
  const { error } = await supabase.from('goal_config').update({ notes }).eq('account', account)
  if (error) throw new Error(error.message)
}

export function emptyBundle(): Bundle {
  return structuredClone(EMPTY_BUNDLE)
}
