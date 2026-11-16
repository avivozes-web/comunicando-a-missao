import assert from 'node:assert/strict'
import { test } from 'node:test'
import { addDays, startOfWeek, weekTitle } from './dates.ts'
import { postsOnDay } from './logic.ts'
import type { Post } from './types.ts'

function post(partial: Pick<Post, 'id' | 'scheduled_date' | 'status' | 'account'>): Post {
  return {
    title: partial.id,
    format: 'reel',
    scheduled_time: '12:07',
    aspect: null,
    legenda: null,
    legenda_whatsapp: null,
    ready_checks: {},
    cover_url: null,
    cover_thumb_url: null,
    drive_url: null,
    checklist: [],
    note: null,
    date_tag: null,
    updated_by: null,
    ...partial,
  }
}

test('a grade abre na semana de 16/11 e a seguinte começa na segunda 23/11', () => {
  const monday = startOfWeek('2026-11-16')
  const weeks = [0, 1, 2, 3, 4].map((index) => addDays(monday, index * 7))
  assert.deepEqual(weeks, ['2026-11-16', '2026-11-23', '2026-11-30', '2026-12-07', '2026-12-14'])
  assert.equal(weekTitle(weeks[0]), 'Semana 16–22/11')
  assert.equal(weekTitle(weeks[1]), 'Semana 23–29/11')
  assert.equal(addDays(weeks[1], 0), '2026-11-23')
})

test('post com status postado aparece no dia, como o Haiti de 16/11', () => {
  const rows = [
    post({ id: 'haiti', account: 'missao', scheduled_date: '2026-11-16', status: 'postado' }),
    post({ id: 'agendado', account: 'missao', scheduled_date: '2026-11-16', status: 'ideia' }),
    post({ id: 'escola', account: 'escola', scheduled_date: '2026-11-16', status: 'postado' }),
    post({ id: 'outro-dia', account: 'missao', scheduled_date: '2026-11-17', status: 'postado' }),
  ]
  const day = postsOnDay(rows, '2026-11-16', 'missao')
  assert.deepEqual(day.map((item) => item.id), ['haiti', 'agendado'])
  assert.equal(day[0].status, 'postado')
})
