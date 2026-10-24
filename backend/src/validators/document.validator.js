const { z } = require('zod');

const createDocumentSchema = z.object({
  title: z.string().trim().min(1, 'title is required').max(200, 'title is too long (max 200)'),
  text: z.string().trim().min(1, 'text is required').max(100000, 'text is too long (max 100,000 characters)'),
});

module.exports = { createDocumentSchema };