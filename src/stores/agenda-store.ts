import { create } from 'zustand'
import type {
  AgendaEvent,
  AgendaViewMode,
  CronosItem,
  EventFormData,
  EventSource,
  TimeboxTask,
} from '@/types/agenda'
import {
  createEvent,
  deleteEvent,
  eventToItem,
  getEvents,
  updateEvent,
} from '@/lib/supabase/agenda'
import { createClient } from '@/lib/supabase/client'
import { getAggregatedItems, getUnscheduledTasks } from '@/lib/agenda/aggregate'

interface AgendaStore {
  // ── Estado ──
  events: AgendaEvent[] // eventos nativos (fuente de verdad)
  aggregated: CronosItem[] // eventos virtuales de otros módulos (Fase 3)
  unscheduled: TimeboxTask[] // tareas de Proyectos sin fecha (timeboxing)
  initialized: boolean
  isLoading: boolean
  viewMode: AgendaViewMode
  selectedDate: string // ISO del día enfocado
  sourceFilter: Record<EventSource, boolean>

  // ── Hidratación / fetch ──
  hydrate: (events: AgendaEvent[], aggregated?: CronosItem[]) => void
  fetchEvents: (userId: string, rangeStart: string, rangeEnd: string) => Promise<void>
  fetchAggregated: (userId: string, rangeStart: string, rangeEnd: string) => Promise<void>
  fetchUnscheduled: (userId: string) => Promise<void>

  // ── CRUD ──
  addEvent: (userId: string, form: EventFormData) => Promise<AgendaEvent | null>
  editEvent: (
    id: string,
    form: Partial<EventFormData> & { completed?: boolean }
  ) => Promise<void>
  removeEvent: (id: string) => Promise<void>

  // ── Setters UI ──
  setViewMode: (mode: AgendaViewMode) => void
  setSelectedDate: (iso: string) => void
  toggleSource: (source: EventSource) => void
  setAggregated: (items: CronosItem[]) => void
}

const ALL_SOURCES_ON: Record<EventSource, boolean> = {
  native: true,
  gasto: true,
  proyecto: true,
  mercado: true,
}

export const useAgendaStore = create<AgendaStore>((set, get) => ({
  events: [],
  aggregated: [],
  unscheduled: [],
  initialized: false,
  isLoading: false,
  viewMode: 'month',
  selectedDate: new Date().toISOString(),
  sourceFilter: { ...ALL_SOURCES_ON },

  hydrate: (events, aggregated) =>
    set({ events, aggregated: aggregated ?? [], initialized: true }),

  fetchEvents: async (userId, rangeStart, rangeEnd) => {
    set({ isLoading: true })
    try {
      const events = await getEvents(userId, rangeStart, rangeEnd)
      set({ events, initialized: true })
    } catch (e) {
      console.error('[agenda] fetchEvents', e)
    } finally {
      set({ isLoading: false })
    }
  },

  fetchAggregated: async (userId, rangeStart, rangeEnd) => {
    try {
      const items = await getAggregatedItems(createClient(), userId, rangeStart, rangeEnd)
      set({ aggregated: items })
    } catch (e) {
      console.error('[agenda] fetchAggregated', e)
    }
  },

  fetchUnscheduled: async (userId) => {
    try {
      const tasks = await getUnscheduledTasks(createClient(), userId)
      set({ unscheduled: tasks })
    } catch (e) {
      console.error('[agenda] fetchUnscheduled', e)
    }
  },

  addEvent: async (userId, form) => {
    try {
      const created = await createEvent(userId, form)
      set({ events: [...get().events, created] })
      return created
    } catch (e) {
      console.error('[agenda] addEvent', e)
      return null
    }
  },

  editEvent: async (id, form) => {
    try {
      const updated = await updateEvent(id, form)
      set({ events: get().events.map((e) => (e.id === id ? updated : e)) })
    } catch (e) {
      console.error('[agenda] editEvent', e)
    }
  },

  removeEvent: async (id) => {
    try {
      await deleteEvent(id)
      set({ events: get().events.filter((e) => e.id !== id) })
    } catch (e) {
      console.error('[agenda] removeEvent', e)
    }
  },

  setViewMode: (mode) => set({ viewMode: mode }),
  setSelectedDate: (iso) => set({ selectedDate: iso }),
  toggleSource: (source) =>
    set({
      sourceFilter: {
        ...get().sourceFilter,
        [source]: !get().sourceFilter[source],
      },
    }),
  setAggregated: (items) => set({ aggregated: items }),
}))

/** Selector: items nativos (sin recurrencia expandida todavía — Fase 2). */
export function selectNativeItems(events: AgendaEvent[]): CronosItem[] {
  return events.map(eventToItem)
}
