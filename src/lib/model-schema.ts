import { z } from 'zod';

export const ModelSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Name is required'),
  type: z.enum(['online', 'local']),
  isDefault: z.boolean().optional(),
});

export type Model = z.infer<typeof ModelSchema>;
export type NewModel = Pick<Model, 'name' | 'type'>;
