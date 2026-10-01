import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH, args: ['--no-sandbox'] });
const context = await browser.newContext({ timezoneId: 'America/Caracas' });
const page = await context.newPage();
const errors = [];
page.on('pageerror', error => { errors.push(error.message); console.error('Browser error:', error.message); });
page.setDefaultTimeout(10000);
const doctor = { id: '1', firstName: 'Médico', lastName: 'Prueba', role: 'doctor', email: 'test@example.invalid', isActive: true };
const patient = { id: 17, id_usuario: null, nombres: 'Paciente', apellidos: 'Prueba', cedula: 'TEST-17', id_programa: 4, activo: 1 };
const posts = [];
let studies = [];
const vitals = { weight: [], pulse: [], bloodPressure: [], bodyMassIndex: [], glycemia: [], heartRateRecovery: [] };
await context.addInitScript(({ doctor }) => {
  localStorage.setItem('hoffmann_token', 'local-test-token');
  localStorage.setItem('hoffmann_user', JSON.stringify(doctor));
  localStorage.setItem('hoffmann_token_exp', String(Date.now() + 3600000));
}, { doctor });
// All API calls use fixtures. No connection to a production backend or patient DB.
await context.route('**/*', async route => {
  const url = new URL(route.request().url());
  if (url.origin === 'http://127.0.0.1:5178') return route.continue();
  if (url.origin !== 'http://127.0.0.1:3999') return route.abort();
  const method = route.request().method();
  const path = url.pathname;
  let payload = [];
  if (path.startsWith('/auth/')) payload = doctor;
  if (path === '/patient') payload = [patient];
  if (path === '/patient/17') payload = patient;
  if (path === '/programs') payload = [{ id: 4, nombre: 'Programa persistido' }];
  if (path === '/programs/4') payload = { id: 4, nombre: 'Programa persistido', activities: [] };
  if (path.endsWith('/history')) payload = { alterations: { tos: true }, diseases: [{ disease: 'Otra Venerea', status: 'Detalle conservado' }], attachments: studies };
  if (path.includes('consultation')) payload = [{ id: 31, id_paciente: 17, fecha: '2026-09-24', observacion: 'Consulta realizada por Dra. Prueba', indicaciones: 'Indicación visible sin editar' }];
  if (path.endsWith('/attachments')) {
    if (method === 'POST') studies = [{ id: 5, file: '17/estudio-prueba.pdf', createdAt: '2026-09-24T00:00:00.000Z' }];
    payload = method === 'POST' ? studies[0] : studies;
  }
  if (path === '/vitals/patient/17') payload = vitals;
  if (path === '/vitals/patient/17/weight' && method === 'POST') {
    const body = route.request().postDataJSON();
    posts.push({ path, body });
    vitals.weight.push({ id: 2, value: Number(body.peso), rawValue: body.peso, recordedAt: '2026-09-24T00:00:00.000Z', source: 'weight', unit: 'kg' });
    payload = vitals.weight[0];
  }
  await route.fulfill({ json: payload });
});
try {
  await page.goto('http://127.0.0.1:5178/patients/17');
  await page.getByRole('heading', { name: 'Estudios del paciente' }).waitFor();
  assert.equal(await page.getByText('Programa persistido', { exact: true }).count(), 1);
  await page.getByLabel('Seleccionar estudio').setInputFiles({ name: 'estudio-prueba.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 local fixture') });
  await page.getByText('estudio-prueba.pdf', { exact: true }).waitFor();
  await page.reload();
  await page.getByText('estudio-prueba.pdf', { exact: true }).waitFor();
  await page.goto('http://127.0.0.1:5178/evolution');
  await page.getByRole('row').filter({ hasText: 'Paciente Prueba' }).getByRole('button', { name: 'Ver evolución' }).click();
  await page.getByText('Cédula: TEST-17', { exact: true }).waitFor();
  await page.getByText('Consulta realizada por Dra. Prueba', { exact: true }).waitFor();
  await page.getByText('Indicación visible sin editar', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Registrar datos', exact: true }).click();
  await page.getByLabel('Fecha de las fotos o mediciones').fill('2026-09-24');
  await page.getByPlaceholder('Ingresa tu peso').fill('72.5');
  await page.getByRole('button', { name: 'Guardar registro', exact: true }).click();
  await page.getByPlaceholder('Ingresa tu peso').waitFor({ state: 'hidden' });
  assert.equal(posts.length, 1);
  assert.equal(posts[0].body.peso, '72.5');
  assert.equal(posts[0].body.fecha.slice(0, 10), '2026-09-24');
  assert.equal(errors.length, 0, errors.join('\n'));
  await page.screenshot({ path: '/tmp/hoffman-evolution-smoke.png', fullPage: true });
  console.log('PASS: doctor studies upload/reload, program display, identification, consultation details and dated weight-only save without linked user.');
} catch (error) {
  console.error((await page.locator('body').innerText()).slice(-5000));
  throw error;
} finally { await browser.close(); }
