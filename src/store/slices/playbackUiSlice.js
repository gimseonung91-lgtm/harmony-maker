// Playback (tracks, tempo, transport flag) and toolbar UI state.

export const createPlaybackUiSlice = (set) => ({
  // Which tracks are unmuted for playback. 'melody' + each line id.
  enabledTracks: { melody: true },
  isPlaying: false,
  bpm: 90,

  toolbarOpen: true,
  activeCategory: 'notes',
  // Duration used when adding a note by clicking on the staff
  selectedDuration: 'q',

  toggleTrack: (id) =>
    set((s) => ({
      enabledTracks: { ...s.enabledTracks, [id]: !(s.enabledTracks[id] ?? true) },
    })),
  setBpm: (bpm) => set({ bpm }),
  setIsPlaying: (isPlaying) => set({ isPlaying }),

  toggleToolbar: () => set((s) => ({ toolbarOpen: !s.toolbarOpen })),
  setActiveCategory: (cat) => set({ activeCategory: cat }),
  setSelectedDuration: (duration) => set({ selectedDuration: duration }),
})
