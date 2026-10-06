const { Client } = require('pg');
const { createApp } = require('./app');
const { createQuestionRepository } = require('./quiz/repository');
const { createQuizService } = require('./quiz/service');

async function start() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  console.log('Connected to PostgreSQL database');

  const repository = createQuestionRepository(client);
  const app = createApp(createQuizService(repository));
  const port = process.env.PORT || 3000;
  app.listen(port, '0.0.0.0', () => console.log(`Listening on port ${port}!`));
}

start().catch(error => {
  console.error('Failed to start server', error);
  process.exitCode = 1;
});
