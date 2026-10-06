const path = require('path');
const { registerQuizRoutes } = require('./quiz/routes');

const publicDir = path.join(__dirname, '..', 'public');

function createApp(questions, expressFactory = require('express')) {
  const app = expressFactory();
  app.use(expressFactory.json());

  app.get('/', (req, res) => res.sendFile(path.join(publicDir, 'index.html')));
  app.get('/style.css', (req, res) => res.sendFile(path.join(publicDir, 'style.css')));
  app.get('/app.js', (req, res) => res.sendFile(path.join(publicDir, 'app.js')));

  registerQuizRoutes(app, questions);

  return app;
}

module.exports = { createApp };
