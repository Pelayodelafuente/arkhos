import { describe, it, expect } from 'vitest'
import { projectSchema, phaseSchema, taskSchema } from '@/lib/validations'

describe('projectSchema', () => {
  it('accepts a valid project', () => {
    const result = projectSchema.safeParse({ name: 'Arkhos', type: 'Web' })
    expect(result.success).toBe(true)
  })

  it('rejects empty name', () => {
    const result = projectSchema.safeParse({ name: '' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('El nombre es obligatorio')
    }
  })

  it('rejects missing name', () => {
    const result = projectSchema.safeParse({})
    expect(result.success).toBe(false)
  })

  it('accepts project with optional fields omitted', () => {
    const result = projectSchema.safeParse({ name: 'Mi proyecto' })
    expect(result.success).toBe(true)
  })

  it('accepts project with full data', () => {
    const result = projectSchema.safeParse({
      name: 'Arkhos',
      type: 'Web',
      status: 'Activo',
      stack: ['Next.js', 'TypeScript'],
      icon: 'Globe',
    })
    expect(result.success).toBe(true)
  })

  it('rejects name longer than 100 chars', () => {
    const result = projectSchema.safeParse({ name: 'a'.repeat(101) })
    expect(result.success).toBe(false)
  })
})

describe('phaseSchema', () => {
  it('accepts a valid phase', () => {
    const result = phaseSchema.safeParse({ name: 'Fase 1', status: 'pending' })
    expect(result.success).toBe(true)
  })

  it('rejects empty name', () => {
    const result = phaseSchema.safeParse({ name: '' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('El nombre de la fase es obligatorio')
    }
  })

  it('rejects invalid status', () => {
    const result = phaseSchema.safeParse({ name: 'Fase', status: 'invalid' })
    expect(result.success).toBe(false)
  })

  it('accepts all valid statuses', () => {
    for (const status of ['pending', 'in-progress', 'done'] as const) {
      const result = phaseSchema.safeParse({ name: 'Fase', status })
      expect(result.success).toBe(true)
    }
  })
})

describe('taskSchema', () => {
  it('accepts a valid task', () => {
    const result = taskSchema.safeParse({ text: 'Implementar login', priority: 'high' })
    expect(result.success).toBe(true)
  })

  it('rejects empty text', () => {
    const result = taskSchema.safeParse({ text: '' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('El texto de la tarea es obligatorio')
    }
  })

  it('rejects missing text', () => {
    const result = taskSchema.safeParse({})
    expect(result.success).toBe(false)
  })

  it('rejects invalid priority', () => {
    const result = taskSchema.safeParse({ text: 'Tarea', priority: 'urgent' })
    expect(result.success).toBe(false)
  })

  it('accepts all valid priorities', () => {
    for (const priority of ['none', 'low', 'medium', 'high'] as const) {
      const result = taskSchema.safeParse({ text: 'Tarea', priority })
      expect(result.success).toBe(true)
    }
  })
})
