const assert = require('node:assert/strict');
const { existsSync } = require('node:fs');
const test = require('node:test');
const { createQuestionRepository } = require('../src/server/quiz/repository');
const { createQuizService } = require('../src/server/quiz/service');
const { createApp } = require('../src/server/app');

const questionUuid = '123e4567-e89b-42d3-a456-426614174000';
const missingUuid = '123e4567-e89b-42d3-a456-426614174001';

function createClient() {
  const answers = [];
  const question = {
    uuid: questionUuid,
    question: 'Pergunta?',
    option_a: 'A',
    option_b: 'B',
    option_c: 'C',
    option_d: 'D'
  };

  return {
    answers,
    async query(sql, params = []) {
      if (sql.includes('SELECT uuid, question')) return { rows: [question] };
      if (sql.includes('AS answers_total')) {
        return { rows: [{
          score: String(answers.filter(answer => answer.isCorrect).length),
          answers_total: String(answers.length),
          question_index: answers.some(answer => answer.uuid === questionUuid) ? null : questionUuid
        }] };
      }
      if (sql.includes('SELECT correct_answer')) {
        return { rows: params[0] === questionUuid ? [{ correct_answer: 'B' }] : [] };
      }
      if (sql.includes('INSERT INTO public.answers')) {
        answers.push({ uuid: params[0], choice: params[1], isCorrect: params[2] });
        return { rows: [] };
      }
      if (sql.includes('TRUNCATE public.answers')) {
        answers.length = 0;
        return { rows: [] };
      }
      throw new Error(`Unexpected query: ${sql}`);
    }
  };
}

function createExpressStub() {
  const routes = new Map();
  const factory = () => ({
    routes,
    use() {},
    get(path, handler) { routes.set(`GET ${path}`, handler); },
    put(path, handler) { routes.set(`PUT ${path}`, handler); }
  });
  factory.json = () => () => {};
  return factory;
}

async function request(routes, route, body) {
  const response = {
    statusCode: 200,
    status(code) { this.statusCode = code; return this; },
    json(value) { this.body = value; return this; },
    send(value) { this.body = value; return this; },
    sendFile(file) { this.file = file; return this; }
  };
  await routes.get(route)({ body }, response);
  return response;
}

test('static routes point to the public files', async () => {
  const { routes } = createApp({}, createExpressStub());
  for (const route of ['GET /', 'GET /style.css', 'GET /app.js']) {
    const response = await request(routes, route);
    assert.equal(response.statusCode, 200);
    assert.ok(existsSync(response.file), `${route} should point to an existing file`);
  }
});

test('questions, submission and reset preserve quiz progress', async () => {
  const client = createClient();
  const repository = createQuestionRepository(client);
  const expressStub = createExpressStub();
  const { routes } = createApp(createQuizService(repository), expressStub);

  const initial = await request(routes, 'GET /questions');
  assert.equal(initial.statusCode, 200);
  assert.equal(initial.body.questions.length, 1);
  assert.equal(initial.body.question_index, questionUuid);
  assert.equal(initial.body.answers_total, '0');

  const submitted = await request(routes, 'PUT /submit', {
    question_uuid: questionUuid,
    choice: 'b'
  });
  assert.equal(submitted.statusCode, 200);
  assert.equal(submitted.body.score, '1');
  assert.equal(submitted.body.answers_total, '1');
  assert.equal(submitted.body.question_index, null);
  assert.deepEqual(client.answers[0], { uuid: questionUuid, choice: 'B', isCorrect: true });

  const reset = await request(routes, 'PUT /reset');
  assert.equal(reset.statusCode, 200);
  assert.equal(reset.body.answers_total, '0');
  assert.equal(reset.body.question_index, questionUuid);
  assert.equal(client.answers.length, 0);
});

test('submit rejects invalid input and missing questions without inserting an answer', async () => {
  const client = createClient();
  const expressStub = createExpressStub();
  const { routes } = createApp(createQuizService(createQuestionRepository(client)), expressStub);

  for (const body of [undefined, {}, { question_uuid: 'invalid', choice: 'A' },
    { question_uuid: questionUuid, choice: 'E' }]) {
    const response = await request(routes, 'PUT /submit', body);
    assert.equal(response.statusCode, 400);
  }

  const missing = await request(routes, 'PUT /submit', {
    question_uuid: missingUuid,
    choice: 'A'
  });
  assert.equal(missing.statusCode, 404);
  assert.equal(client.answers.length, 0);
});
