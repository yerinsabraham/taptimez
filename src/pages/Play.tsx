import { useState } from 'react'
import Practice from './Practice.tsx'
import SinglePlayer from './SinglePlayer.tsx'
import { RoomEntry } from './Multiplayer.tsx'

type Route = 'menu' | 'practice' | 'player' | 'single' | 'multiplayer' | 'timekeeper'

export default function Play() {
  const [route, setRoute] = useState<Route>('menu')
  const back = () => setRoute('menu')

  switch (route) {
    case 'practice':
      return <Practice onBack={back} />
    case 'single':
      return <SinglePlayer onBack={() => setRoute('player')} />
    case 'multiplayer':
      return <RoomEntry role="player" onExit={back} />
    case 'timekeeper':
      return <RoomEntry role="timekeeper" onExit={back} />
    case 'player':
      return <PlayerChoice onBack={back} onPick={setRoute} />
    default:
      return <ModeSelect onPick={setRoute} />
  }
}

/* ---------------- Mode select ---------------- */

function ModeSelect({ onPick }: { onPick: (r: Route) => void }) {
  return (
    <div className="flex flex-1 flex-col justify-center gap-6 px-6 py-10">
      <div className="text-center">
        <h2 className="text-2xl font-black">Choose a mode</h2>
        <p className="mt-1 text-sm text-white/50">How do you want to play?</p>
      </div>
      <div className="flex flex-col gap-3">
        <ModeCard
          title="Practice"
          desc="Pick a target and train, with the clock shown or hidden."
          onClick={() => onPick('practice')}
        />
        <ModeCard
          title="Player"
          desc="Play solo or against friends. No clock, just instinct."
          onClick={() => onPick('player')}
        />
        <ModeCard
          title="Timekeeper"
          desc="Host a game and watch the clock while players stop it."
          onClick={() => onPick('timekeeper')}
        />
      </div>
    </div>
  )
}

/* ---------------- Player: single vs multiplayer ---------------- */

function PlayerChoice({ onBack, onPick }: { onBack: () => void; onPick: (r: Route) => void }) {
  return (
    <div className="flex flex-1 flex-col justify-center gap-6 px-6 py-10">
      <button onClick={onBack} className="self-start text-sm text-white/40 transition hover:text-white/70">
        ‹ Modes
      </button>
      <div className="text-center">
        <h2 className="text-2xl font-black">Player</h2>
        <p className="mt-1 text-sm text-white/50">Solo or with friends?</p>
      </div>
      <div className="flex flex-col gap-3">
        <ModeCard
          title="Single player"
          desc="Just you. No clock, scored against your target."
          onClick={() => onPick('single')}
        />
        <ModeCard
          title="Multiplayer"
          desc="Create or join a game with a code and compete."
          onClick={() => onPick('multiplayer')}
        />
      </div>
    </div>
  )
}

function ModeCard({ title, desc, onClick }: { title: string; desc: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-left transition active:scale-[0.99]"
    >
      <div>
        <span className="text-lg font-bold">{title}</span>
        <p className="mt-1 text-sm text-white/50">{desc}</p>
      </div>
      <span className="text-xl text-white/30">›</span>
    </button>
  )
}
