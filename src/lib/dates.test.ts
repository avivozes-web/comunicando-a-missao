import assert from 'node:assert/strict'
import { test } from 'node:test'
import { addDays, asDate, startOfWeek, todayISO, weekTitle } from './dates.ts'

test('a data escolhida não vira o dia anterior em São Paulo', () => {
  assert.equal(asDate('2026-11-18'), '2026-11-18')
  assert.equal(asDate('2026-11-18T00:00:00.000Z'), '2026-11-18')
  assert.equal(asDate('2026-11-18T03:00:00+00:00'), '2026-11-18')
  const monday = startOfWeek('2026-11-16')
  const days = [0, 1, 2, 3, 4, 5, 6].map((index) => addDays(monday, index))
  assert.equal(days[2], '2026-11-18')
  assert.equal(days.includes(asDate('2026-11-18T00:00:00.000Z')), true)
})

test('título da semana atual e da que cruza o mês', () => {
  assert.equal(weekTitle('2026-11-16'), 'Semana 16–22/11')
  assert.equal(weekTitle('2026-11-30'), 'Semana 30/11–6/12')
})

test('hoje segue o calendário de São Paulo, não o de UTC', () => {
  assert.equal(todayISO(new Date('2026-11-17T02:30:00Z')), '2026-11-16')
  assert.equal(todayISO(new Date('2026-11-17T03:00:00Z')), '2026-11-17')
})
