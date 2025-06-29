import { z } from 'zod';

export const ModelSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Name is required'),
  type: z.enum(['online']),
  isDefault: z.boolean().optional(),
});

export type Model = z.infer<typeof ModelSchema>;
export type NewModel = Omit<Model, 'id' | 'isDefault'>;
