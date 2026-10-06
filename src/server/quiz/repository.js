const progressQuery = `
  SELECT
    (SELECT count(*) FROM public.answers WHERE is_correct IS TRUE) AS score,
    (SELECT count(*) FROM public.answers) AS answers_total,
    (
      SELECT questions.uuid
      FROM public.questions
      WHERE questions.uuid NOT IN (SELECT question_uuid FROM public.answers)
      LIMIT 1
    ) AS question_index
`;

const questionsQuery = `
  SELECT uuid, question, option_a, option_b, option_c, option_d
  FROM public.questions
`;

function createQuestionRepository(client) {
  async function getProgress() {
    const result = await client.query(progressQuery);
    return result.rows[0];
  }

  return {
    async listQuestions() {
      const result = await client.query(questionsQuery);
      return result.rows;
    },

    getProgress,

    async resetAnswers() {
      await client.query('TRUNCATE public.answers');
    },

    async findCorrectAnswer(questionUuid) {
      const question = await client.query(
        'SELECT correct_answer FROM public.questions WHERE uuid = $1',
        [questionUuid]
      );
      return question.rows[0]?.correct_answer ?? null;
    },

    async insertAnswer(questionUuid, choice, isCorrect) {
      await client.query(
        'INSERT INTO public.answers (question_uuid, choice, is_correct) VALUES ($1, $2, $3)',
        [questionUuid, choice, isCorrect]
      );
    }
  };
}

module.exports = { createQuestionRepository };
