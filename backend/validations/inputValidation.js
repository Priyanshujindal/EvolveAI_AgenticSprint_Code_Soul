const { z } = require('zod');

const AnalyzeSchema = z.object({
  notes: z.string().max(10000).optional(),
  vitals: z.record(z.any()).optional(),
  labs: z.record(z.any()).optional(),
  patient: z.record(z.any()).optional(),
}).passthrough();

function validateAnalyzePayload(payload) {
  const result = AnalyzeSchema.safeParse(payload);
  if (!result.success) {
    const issue = result.error.issues[0];
    const path = issue && issue.path && issue.path.join('.') || '';
    return { ok: false, error: `${path ? path + ' ' : ''}${issue.message}` };
  }
  return { ok: true, data: result.data };
}

module.exports = { validateAnalyzePayload };


