function createQuizService(repository) {
  return {
    async getQuestions() {
      const questions = await repository.listQuestions();
      return { ...await repository.getProgress(), questions };
    },

    async reset() {
      await repository.resetAnswers();
      return repository.getProgress();
    },

    async submit(questionUuid, choice) {
      const correctAnswer = await repository.findCorrectAnswer(questionUuid);
      if (correctAnswer === null) return null;

      await repository.insertAnswer(questionUuid, choice, correctAnswer === choice);
      return repository.getProgress();
    }
  };
}

module.exports = { createQuizService };
