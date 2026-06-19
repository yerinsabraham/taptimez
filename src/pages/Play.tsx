import TapButton from '../components/TapButton.tsx'

export default function Play() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 px-6 text-center">
      <p className="text-sm font-medium uppercase tracking-widest text-white/40">Preview</p>

      <TapButton label="TAP" onPress={() => {}} />

      <p className="max-w-xs text-white/50">
        This is the button you'll tap to start and stop the timer. The live game lands in{' '}
        <strong className="text-white/70">Phase 2</strong>.
      </p>
    </div>
  )
}
