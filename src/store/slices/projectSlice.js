// Project metadata: title, key, clef, time signature.

export const defaultProject = {
  title: 'Untitled',
  keySignature: 'C',
  clef: 'treble',
  timeSignature: '4/4',
}

export const createProjectSlice = (set) => ({
  projectInfo: { ...defaultProject },

  setProjectInfo: (patch) =>
    set((s) => ({ projectInfo: { ...s.projectInfo, ...patch } })),
})
