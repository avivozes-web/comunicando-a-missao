import assert from 'node:assert/strict'
import { test } from 'node:test'
import { addDays, startOfWeek, weekTitle } from './dates.ts'
import { aspectForFormat, defaultAssignees, defaultChecklist, postarPrefix, stepLabel, postsOnDay, syncGeneratedTasks, syncIdeaDateTasks, taskForPerson, workdayBefore } from './logic.ts'
import type { Idea, Post } from './types.ts'

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

test('proporção e checklist seguem o formato', () => {
  assert.equal(aspectForFormat('reel'), '9:16')
  assert.equal(aspectForFormat('stories'), '9:16')
  assert.equal(aspectForFormat('video'), '16:9')
  assert.equal(aspectForFormat('carrossel'), '4:5')
  assert.equal(aspectForFormat('post_leve'), '4:5')
  const reel = defaultChecklist('reel', '12:05')
  assert.deepEqual(reel.map((item) => item.label), [
    'Vídeo aprovado',
    'Capa',
    'Legenda do Instagram aprovada',
    'Legenda do WhatsApp',
    'Programado 12h05',
    '1º comentário QUERO',
  ])
  const carrossel = defaultChecklist('carrossel')
  assert.ok(carrossel.every((item) => item.label !== 'Capa'))
  assert.equal(carrossel[0].label, 'Arte aprovada')
  assert.equal(carrossel.find((item) => item.label.startsWith('Programado'))?.label, 'Programado 12h07')
})

test('data automática no fim de semana vai para a sexta', () => {
  assert.equal(workdayBefore('2026-11-21'), '2026-11-20')
  assert.equal(workdayBefore('2026-11-22'), '2026-11-20')
  assert.equal(workdayBefore('2026-11-23'), '2026-11-23')
})

test('conteúdo novo gera só a tarefa de postar, no dia do post', () => {
  const tasks = syncGeneratedTasks([], post({ id: 'p1', account: 'escola', scheduled_date: '2026-11-30', status: 'ideia' }))
  assert.equal(tasks.length, 1)
  assert.equal(tasks[0].step, 'postar')
  assert.equal(tasks[0].due_date, '2026-11-30')
  assert.equal(tasks[0].title, 'Postar o vídeo: p1')
  assert.equal(postarPrefix('carrossel'), 'Postar o carrossel: ')
})

test('mudar a data do post só leva a tarefa Postar', () => {
  const first = syncGeneratedTasks([], post({ id: 'p2', account: 'escola', scheduled_date: '2026-11-26', status: 'ideia' }))
  first.push({
    ...first[0],
    id: 'gravar-p2',
    title: 'Gravar p2',
    step: 'gravar',
    due_date: '2026-11-23',
    origin_date: '2026-11-23',
    sort: 80,
    done: false,
  })
  const moved = syncGeneratedTasks(first, post({ id: 'p2', account: 'escola', scheduled_date: '2026-12-03', status: 'ideia' }))
  const byStep = Object.fromEntries(moved.map((task) => [task.step, task.due_date]))
  assert.deepEqual(byStep, { postar: '2026-12-03', gravar: '2026-11-23' })
  assert.equal(moved.find((task) => task.step === 'postar')?.title, 'Postar o vídeo: p2')
})

test('visão Richard mostra só as tarefas dele', () => {
  const base = syncGeneratedTasks([], post({ id: 'p3', account: 'escola', scheduled_date: '2026-11-26', status: 'ideia' }))[0]
  assert.equal(taskForPerson({ ...base, assignee: 'Isabelle + Richard' }, 'Richard'), true)
  assert.equal(taskForPerson({ ...base, assignee: 'Isabelle' }, 'Richard'), false)
  assert.equal(taskForPerson({ ...base, assignee: 'Isabelle' }, 'Isabelle'), true)
})

test('carrossel tem plano slide por slide e confecção, reel tem gravar e editar', () => {
  assert.equal(stepLabel('gravar', 'carrossel'), 'Plano slide por slide')
  assert.equal(stepLabel('editar', 'post_leve'), 'Confecção')
  assert.equal(stepLabel('gravar', 'reel'), 'Gravar')
  assert.equal(defaultAssignees('carrossel').editar, 'Lídia + Isabelle')
  assert.equal(defaultAssignees('reel').editar, 'Isabelle + Bezalel')
  const tasks = syncGeneratedTasks([], { ...post({ id: 'c1', account: 'missao', scheduled_date: '2026-11-30', status: 'ideia' }), format: 'carrossel', title: 'Macedônia' })
  assert.deepEqual(tasks.map((task) => task.title), ['Postar o carrossel: Macedônia'])
})

test('datas de gravar e editar na Fábrica viram tarefas nesses dias', () => {
  const idea: Idea = {
    id: 'idea-1',
    account: 'escola',
    title: 'Tem teologia e Teologia',
    body: '',
    format: 'reel',
    tags: [],
    status: 'roteiro_pronto',
    suggested_date: '2026-12-04',
    heart: false,
    updated_by: 'Isabelle',
    course: 'Teologia',
    script_url: null,
    archived: false,
    post_id: null,
    record_date: '2026-11-24',
    edit_date: '2026-11-25',
  }
  const tasks = syncIdeaDateTasks([], idea)
  assert.deepEqual(tasks.map((task) => [task.step, task.due_date, task.title, task.assignee, task.done]), [
    ['gravar', '2026-11-24', 'Gravar Tem teologia e Teologia', 'Isabelle', false],
    ['editar', '2026-11-25', 'Editar Tem teologia e Teologia', 'Isabelle + Bezalel', false],
  ])
})
