import assert from 'node:assert/strict'
import { test } from 'node:test'
import { addHour, organizeDay, taskTitle } from './dictate.ts'

test('horários falados, almoço e uma hora cravada', () => {
  const day = organizeDay('amanhã às 9 gravo o vídeo, depois do almoço edito, às 16h atualizo o orçamento')
  assert.equal(day.dayHint, 'amanha')
  assert.deepEqual(day.items.map((item) => [item.time, item.title, item.suggested]), [
    ['09:00', 'Gravar o vídeo', false],
    ['14:00', 'Editar', false],
    ['16:00', 'Atualizar o orçamento', false],
  ])
  assert.equal(taskTitle(day.items[0]), '9h · Gravar o vídeo')
})

test('manhã e noite separadas por e também', () => {
  const day = organizeDay('de manhã fecho as legendas e também à noite posto o reel')
  assert.equal(day.dayHint, null)
  assert.deepEqual(day.items.map((item) => [item.time, item.title, item.suggested]), [
    ['09:00', 'Fechar as legendas', false],
    ['19:00', 'Postar o reel', false],
  ])
})

test('sem hora, sugere de hora em hora a partir das 9', () => {
  const day = organizeDay('gravo dois vídeos, edito a capa, aprovo a legenda')
  assert.deepEqual(day.items.map((item) => [item.time, item.title, item.suggested]), [
    ['09:00', 'Gravar dois vídeos', true],
    ['10:00', 'Editar a capa', true],
    ['11:00', 'Aprovar a legenda', true],
  ])
})

test('9h30, 11h e depois do almoço', () => {
  const day = organizeDay('às 9h30 gravo o vídeo da escola, 11h atualizo o orçamento e também depois do almoço edito')
  assert.deepEqual(day.items.map((item) => [item.time, item.title, item.suggested]), [
    ['09:30', 'Gravar o vídeo da escola', false],
    ['11:00', 'Atualizar o orçamento', false],
    ['14:00', 'Editar', false],
  ])
  assert.equal(taskTitle(day.items[0]), '9h30 · Gravar o vídeo da escola')
})

test('meio-dia e à tarde', () => {
  const day = organizeDay('meio-dia posto o carrossel, à tarde reviso os stories')
  assert.deepEqual(day.items.map((item) => [item.time, item.title, item.suggested]), [
    ['12:00', 'Postar o carrossel', false],
    ['15:00', 'Revisar os stories', false],
  ])
})

test('sem acento, como o reconhecimento de voz às vezes devolve', () => {
  const day = organizeDay('amanha as 9 gravo o video, depois do almoco edito, as 16h atualizo o orcamento')
  assert.equal(day.dayHint, 'amanha')
  assert.deepEqual(day.items.map((item) => [item.time, item.title]), [
    ['09:00', 'Gravar o video'],
    ['14:00', 'Editar'],
    ['16:00', 'Atualizar o orcamento'],
  ])
})

test('horas por extenso, meia e um item sem hora no meio', () => {
  const day = organizeDay('amanhã às nove e meia gravo o vídeo, depois edito a capa')
  assert.equal(day.dayHint, 'amanha')
  assert.deepEqual(day.items.map((item) => [item.time, item.title, item.suggested]), [
    ['09:30', 'Gravar o vídeo', false],
    ['10:30', 'Editar a capa', true],
  ])
})

test('da noite empurra a hora para a tarde-noite e da manhã segura de madrugada', () => {
  const night = organizeDay('às 7 da noite posto o reel')
  assert.deepEqual(night.items.map((item) => [item.time, item.title]), [['19:00', 'Postar o reel']])
  const early = organizeDay('às 4 da manhã fecho o roteiro')
  assert.deepEqual(early.items.map((item) => [item.time, item.title]), [['04:00', 'Fechar o roteiro']])
  const afternoon = organizeDay('às 4 fecho o dia')
  assert.deepEqual(afternoon.items.map((item) => [item.time, item.title]), [['16:00', 'Fechar o dia']])
})

test('duas manhãs não ficam no mesmo horário', () => {
  const day = organizeDay('de manhã fecho as legendas e também de manhã posto o reel')
  assert.deepEqual(day.items.map((item) => [item.time, item.title, item.suggested]), [
    ['09:00', 'Fechar as legendas', false],
    ['10:00', 'Postar o reel', true],
  ])
})

test('hora seguinte para incluir uma tarefa na lista', () => {
  assert.equal(addHour('09:30'), '10:30')
  assert.equal(addHour('21:00'), '21:00')
})
