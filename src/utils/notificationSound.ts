/** AudioContext compartilhado — precisa de gesto do usuario para desbloquear no browser. */
let sharedContext: AudioContext | null = null

function getAudioContext() {
  const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctx) return null
  if (!sharedContext || sharedContext.state === 'closed') {
    sharedContext = new Ctx()
  }
  return sharedContext
}

/** Desbloqueia o audio apos o primeiro clique/toque no painel admin. */
export function unlockNotificationAudio() {
  const ctx = getAudioContext()
  if (!ctx) return
  if (ctx.state === 'suspended') void ctx.resume()
}

/**
 * Som curto e "premium" para novo pedido:
 * acorde ascendente (C–E–G–C) com envelope suave.
 */
export function playNewOrderSound() {
  const ctx = getAudioContext()
  if (!ctx) return

  void ctx.resume().then(() => {
    const now = ctx.currentTime
    const master = ctx.createGain()
    master.gain.value = 0.55
    master.connect(ctx.destination)

    const notes = [
      { freq: 523.25, at: 0 },
      { freq: 659.25, at: 0.08 },
      { freq: 783.99, at: 0.16 },
      { freq: 1046.5, at: 0.28 },
    ]

    for (const note of notes) {
      const t = now + note.at

      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(note.freq, t)
      gain.gain.setValueAtTime(0.0001, t)
      gain.gain.exponentialRampToValueAtTime(0.28, t + 0.025)
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.55)
      osc.connect(gain)
      gain.connect(master)
      osc.start(t)
      osc.stop(t + 0.6)

      const harm = ctx.createOscillator()
      const harmGain = ctx.createGain()
      harm.type = 'triangle'
      harm.frequency.setValueAtTime(note.freq * 2, t)
      harmGain.gain.setValueAtTime(0.0001, t)
      harmGain.gain.exponentialRampToValueAtTime(0.07, t + 0.02)
      harmGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.35)
      harm.connect(harmGain)
      harmGain.connect(master)
      harm.start(t)
      harm.stop(t + 0.4)
    }
  })
}
