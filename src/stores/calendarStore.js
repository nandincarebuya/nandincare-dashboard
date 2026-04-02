import { create } from 'zustand'

export const useCalendarStore = create((set) => ({
  selectedDate: new Date(),
  viewType: 'timeGridDay',
  selectedEvent: null,

  setSelectedDate: (date) => set({ selectedDate: date }),
  setViewType: (viewType) => set({ viewType }),
  setSelectedEvent: (event) => set({ selectedEvent: event }),
  clearSelectedEvent: () => set({ selectedEvent: null }),
}))
