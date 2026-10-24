const express = require('express');
const router = express.Router();
const { createDocument, getDocuments, removeDocument } = require('../controllers/document.controller');
const { validate } = require('../middlewares/validate');
const { createDocumentSchema } = require('../validators/document.validator');

router.post('/', validate(createDocumentSchema) ,createDocument);
router.get('/', getDocuments);
router.delete('/:id', removeDocument);

module.exports = router;