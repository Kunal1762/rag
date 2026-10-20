const express = require('express');
const router = express.Router();
const { createDocument, getDocuments, removeDocument } = require('../controllers/document.controller');

router.post('/', createDocument);
router.get('/', getDocuments);
router.delete('/:id', removeDocument);

module.exports = router;