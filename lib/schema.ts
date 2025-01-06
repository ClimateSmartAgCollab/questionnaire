import { z } from 'zod';

export const FormDataSchema = z.object({
  steps: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      fields: z.array(
        z.object({
          label: z.string(),
          section: z.string().optional(),
          type: z.enum(['Text', 'DateTime', 'Boolean', 'enum', 'reference']),
          options: z.record(z.string()).optional(),
          ref: z.string().optional()
        })
      )
    })
  )
});
