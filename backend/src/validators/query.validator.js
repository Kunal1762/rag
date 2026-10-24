const { z } = require('zod');

const querySchema = z.object({
  question: z.string().trim().min(3, 'question is too short').max(1000, 'question is too long (max 1000)'),
  documentId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'documentId must be a valid id').optional(),
});

module.exports = { querySchema };