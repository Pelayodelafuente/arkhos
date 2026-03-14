import { z } from 'zod/v4'

export const projectSchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio').max(100),
  type: z.string().optional(),
  status: z.string().optional(),
  stack: z.array(z.string()).optional(),
  icon: z.string().optional(),
})

export const phaseSchema = z.object({
  name: z.string().min(1, 'El nombre de la fase es obligatorio').max(100),
  status: z.enum(['pending', 'in-progress', 'done']).optional(),
  notes: z.string().optional(),
})

export const taskSchema = z.object({
  text: z.string().min(1, 'El texto de la tarea es obligatorio').max(500),
  priority: z.enum(['none', 'low', 'medium', 'high']).optional(),
  content: z.string().optional(),
})

export type ProjectInput = z.infer<typeof projectSchema>
export type PhaseInput = z.infer<typeof phaseSchema>
export type TaskInput = z.infer<typeof taskSchema>
