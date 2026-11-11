import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  buildInstrumentCharts,
} = require('../../backend/dist/src/modules/patients/patient-instruments/utils/instrument-charts.util.js');
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
  args: ['--no-sandbox'],
});
const context = await browser.newContext({ timezoneId: 'America/Caracas' });
const page = await context.newPage();
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
page.setDefaultTimeout(12000);
const coach = {
  id: '8',
  firstName: 'Coach',
  lastName: 'Prueba',
  username: 'Coach Prueba',
  role: 'coach',
  email: 'test@example.invalid',
  isActive: true,
};
const patient = { id: 17, id_usuario: 18, nombres: 'Paciente', apellidos: 'Prueba', activo: 1 };
const patientUser = { ...coach, id: '18', role: 'patient', patientId: 17, firstName: 'Paciente' };
const names = ['Bienestar', 'Rueda de salud', 'Cuestionario abierto'];
const types = ['test-salud', 'rueda-salud', 'cuestionario'];
const assignments = names.map((name, index) => ({
  id: index + 1,
  patientId: 17,
  instrumentTypeId: 13,
  instrumentTypeName: 'Tests de prueba',
  assignedAt: '2026-11-10T00:00:00.000Z',
  completed: true,
  available: false,
  evaluated: false,
  topics: [name],
  instruments: [{ id: 11 + index, name, subjectId: 55 + index, completed: true }],
}));
const responses = assignments.flatMap((assignment, index) =>
  ['A', 'B', 'C'].map((topic, question) => ({
    id: index * 10 + question + 1,
    patientId: 17,
    patientInstrumentId: assignment.id,
    instrumentTypeId: 13,
    instrumentId: 11 + index,
    questionId: index * 10 + question + 101,
    question: `Pregunta ${topic}`,
    answer: index === 2 ? ['Sí', 'No', 'Sí'][question] : String(question + index + 1),
    competence: null,
    order: question + 1,
    saved: false,
    evaluated: false,
    topic,
    type: types[index],
    theme: names[index],
    answerDate: '2026-11-10T00:00:00.000Z',
  })),
);
const chartResults = assignments.map((assignment, index) => ({
  assignmentId: assignment.id,
  instrumentId: 11 + index,
  name: names[index],
  assignedAt: assignment.assignedAt,
  status: 'completed',
  charts: buildInstrumentCharts(
    responses.filter((row) => row.patientInstrumentId === assignment.id),
    types[index],
  ),
}));
const metadata = Object.fromEntries(
  [
    'attitudinal',
    'firmnessAdaptability',
    'diagnostics',
    'tests',
    'dailyReview',
    'wellnessLife',
    'wellnessHealth',
    'wellnessRegiflex',
  ].map((key) => [key, { availableDates: [], selectedDate: null }]),
);
const aggregate = {
  attitudinal: { strengths: [], summary: null },
  firmnessAdaptability: null,
  health: { diagnostics: [], tests: {} },
  dailyReview: [],
  wellness: { wheelOfLife: [], wheelOfHealth: [], regiflex: null },
  metadata,
};
let observations = [];
let instrumentComments = [];
let failSave = false;
const requests = [];
await context.addInitScript(
  ({ coach, patientUser }) => {
    localStorage.setItem('hoffmann_token', 'local-test-token');
    localStorage.setItem('hoffmann_user', JSON.stringify(location.pathname.startsWith('/activities') ? patientUser : coach));
    localStorage.setItem('hoffmann_token_exp', String(Date.now() + 3600000));
  },
  { coach, patientUser },
);
// Every API call is intercepted; these tests never contact production or save real patient data.
await context.route('**/*', async (route) => {
  const url = new URL(route.request().url());
  if (url.origin === 'http://127.0.0.1:5178') return route.continue();
  if (url.origin !== 'http://127.0.0.1:3999') return route.abort();
  const path = url.pathname;
  const method = route.request().method();
  let payload = [];
  if (path.startsWith('/auth/')) payload = page.url().includes('/activities') ? patientUser : coach;
  if (path === '/patient') payload = [patient];
  if (path === '/patient/17') payload = patient;
  if (path.endsWith('/history') || path.endsWith('/full')) payload = {};
  if (path.includes('/charts/')) payload = chartResults;
  if (path.includes('/results/')) payload = aggregate;
  if (/\/patient-instruments\/(patient|user)\//.test(path)) payload = assignments;
  if (path.includes('/patient-instruments/responses/')) payload = responses;
  if (path === '/coach-diagnostic-observation') {
    payload = instrumentComments;
    if (method === 'POST') {
      const body = route.request().postDataJSON();
      const row = {
        id: instrumentComments.length + 1,
        instrumentId: body.id_instrumento,
        patientId: body.id_paciente,
        comment: body.comentario,
        coach: body.coach,
        appliedAt: body.fecha_aplicado,
      };
      instrumentComments.push(row);
      payload = row;
    }
  }
  if (path.includes('/coach-consultations')) {
    payload = observations;
    if (method === 'POST' || method === 'PUT') {
      const body = route.request().postDataJSON();
      requests.push({ method, path, body });
      if (failSave)
        return route.fulfill({ status: 503, json: { message: 'Fallo simulado de guardado' } });
      const id = method === 'PUT' ? Number(path.split('/').at(-1)) : observations.length + 1;
      const row = { ...body, id, date: `${body.date}T00:00:00.000Z`, coach: 'Coach Prueba' };
      observations = [row, ...observations.filter((item) => item.id !== id)];
      payload = row;
    }
  }
  if (path === '/questions')
    payload = responses.map((row) => ({
      id: row.questionId,
      id_instrumento: row.instrumentId,
      nombre: row.question,
      orden: row.order,
      tipo_respuesta: 'texto',
    }));
  if (/^\/instruments\/\d+$/.test(path)) {
    const id = Number(path.split('/').at(-1));
    payload = {
      id,
      id_tema: id + 44,
      id_instrumento_tipo: 13,
      activo: 1,
      descripcion: names[id - 11],
    };
  }
  if (/^\/topics\/\d+$/.test(path))
    payload = {
      id: Number(path.split('/').at(-1)),
      nombre: names[Number(path.split('/').at(-1)) - 55],
    };
  if (path === '/vitals/patient/17')
    payload = {
      weight: [],
      pulse: [],
      bloodPressure: [],
      bodyMassIndex: [],
      glycemia: [],
      heartRateRecovery: [],
    };
  await route.fulfill({ json: payload });
});

async function openPatient() {
  await page.goto('http://127.0.0.1:5178/evolution');
  await page
    .getByRole('row')
    .filter({ hasText: 'Paciente Prueba' })
    .getByRole('button', { name: 'Ver evolución' })
    .click();
  await page.getByRole('heading', { name: 'Observaciones generales del coach' }).waitFor();
}

try {
  await openPatient();
  await page.getByLabel('Fecha de la observación').fill('2026-11-09');
  await page.getByLabel('Motivo de la observación').fill('Seguimiento de prueba');
  await page
    .getByLabel('Observación del coach', { exact: true })
    .fill('Primera línea\nSegunda línea');
  await page.getByRole('button', { name: 'Guardar observación', exact: true }).click();
  await page.getByText('Observación del coach guardada correctamente.').waitFor();
  await openPatient();
  await page.getByText('Primera línea\nSegunda línea', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Editar observación' }).click();
  await page.getByLabel('Observación del coach', { exact: true }).fill('Observación editada');
  await page.getByRole('button', { name: 'Actualizar observación', exact: true }).click();
  await page.getByText('Observación editada', { exact: true }).waitFor();
  assert.equal(observations.length, 1);
  assert.equal(requests[0].body.date, '2026-11-09');
  assert.equal(requests[1].method, 'PUT');
  failSave = true;
  await page.getByLabel('Observación del coach', { exact: true }).fill('Borrador conservado');
  await page.getByRole('button', { name: 'Guardar observación', exact: true }).click();
  await page.getByText('Fallo simulado de guardado').waitFor();
  assert.equal(
    await page.getByLabel('Observación del coach', { exact: true }).inputValue(),
    'Borrador conservado',
  );
  failSave = false;
  await page.getByRole('button', { name: 'Resultados de instrumentos', exact: true }).click();
  const results = page.getByTestId('assigned-instrument-results');
  await results.getByRole('heading', { name: 'Cuestionario abierto' }).waitFor();
  assert.equal(await results.locator('.recharts-wrapper').count(), 5);
  assert.equal(await results.locator('.recharts-radar').count(), 1);
  await results.getByLabel('Instrumento y asignación').selectOption('3:13');
  assert.equal(await results.getByRole('article').count(), 1);
  await results.getByRole('heading', { name: 'Distribución de respuestas no numéricas' }).waitFor();
  await results.screenshot({ path: '/tmp/hoffman-assigned-charts.png' });
  for (let index = 0; index < 5; index++) chartResults.push({
    ...chartResults[0], assignmentId: 10 + index, name: `Repetición ${index + 1}`,
  });
  await page.getByRole('button', { name: 'Actualizar', exact: true }).last().click();
  await results.getByText('Página 1 de 2 · 8 instrumentos').waitFor();
  assert.equal(await results.getByRole('article').count(), 6);
  await results.getByRole('button', { name: 'Siguientes', exact: true }).click();
  assert.equal(await results.getByRole('article').count(), 2);
  await results.getByRole('button', { name: 'Anteriores', exact: true }).click();
  await page.getByRole('button', { name: 'Instrumentos', exact: true }).click();
  const testCard = page
    .locator('div.rounded-2xl')
    .filter({ has: page.getByRole('heading', { name: 'Bienestar', exact: true }) })
    .filter({ has: page.getByRole('button', { name: 'Ver respuestas del paciente' }) })
    .last();
  await testCard.getByLabel('Comentario para el paciente').fill('Comentario del test conservado');
  await testCard.getByRole('button', { name: 'Guardar comentario', exact: true }).click();
  await testCard.getByText('Comentario guardado correctamente.').waitFor();
  await page.getByRole('button', { name: 'Actualizar lista', exact: true }).click();
  await testCard.getByLabel('Comentario para el paciente').waitFor();
  assert.equal(await testCard.getByLabel('Comentario para el paciente').inputValue(), 'Comentario del test conservado');
  await testCard.getByRole('button', { name: 'Ver respuestas del paciente' }).click();
  await page
    .getByTestId('assigned-instrument-results')
    .getByRole('heading', { name: 'Valores registrados por pregunta' })
    .waitFor();
  await page.getByRole('button', { name: 'Cerrar', exact: true }).click();
  await page.goto('http://127.0.0.1:5178/activities?patientId=17');
  await page.getByRole('button', { name: 'Ver resultados', exact: true }).first().click();
  await page
    .getByTestId('assigned-instrument-results')
    .getByRole('heading', { name: 'Valores registrados por pregunta' })
    .waitFor();
  assert.equal(errors.length, 0, errors.join('\n'));
  console.log(
    'PASS: coach create/edit/reload and failed-save draft; graphs for numeric, radar and text tests; independent test selector; result modals for professional and patient.',
  );
} catch (error) {
  console.error((await page.locator('body').innerText()).slice(-5000));
  throw error;
} finally {
  await browser.close();
}
