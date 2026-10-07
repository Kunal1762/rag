const { answerQuestion } = require('../services/query.service');

async function handleQuery(req, res, next) {
  try {
    const { question } = req.body;
    const result = await answerQuestion(question);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = { handleQuery };