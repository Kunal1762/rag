const express = require('express');
const router = express.Router();
const { handleQuery } = require('../controllers/query.controller');

router.post('/', handleQuery);

module.exports = router;