const uuidPattern = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;

function registerQuizRoutes(app, questions) {
  app.get('/questions', async (req, res) => {
    try {
      res.json(await questions.getQuestions());
    } catch (error) {
      console.error(error);
      res.status(500).send('Failed to retrieve questions');
    }
  });

  app.put('/reset', async (req, res) => {
    try {
      res.json(await questions.reset());
    } catch (error) {
      console.error(error);
      res.status(500).send('Failed to reset answers');
    }
  });

  app.put('/submit', async (req, res) => {
    const { question_uuid: questionUuid, choice } = req.body || {};
    if (typeof questionUuid !== 'string' || !uuidPattern.test(questionUuid) ||
        typeof choice !== 'string' || !/^[a-d]$/i.test(choice)) {
      return res.status(400).send('Invalid question or choice');
    }

    try {
      const progress = await questions.submit(questionUuid, choice.toUpperCase());
      if (!progress) return res.status(404).send('Question not found');
      res.json(progress);
    } catch (error) {
      console.error(error);
      res.status(500).send('Failed to record answer');
    }
  });
}

module.exports = { registerQuizRoutes };
