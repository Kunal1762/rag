const express = require('express');
const router = express.Router();
const { handleQuery } = require('../controllers/query.controller');
const { validate } = require('../middlewares/validate');
const { querySchema } = require('../validators/query.validator');

router.post('/', validate(querySchema) ,  handleQuery);

module.exports = router;