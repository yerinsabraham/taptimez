import { NavLink } from 'react-router-dom'

const tabs = [
  { to: '/', label: 'Home', end: true },
  { to: '/play', label: 'Play', end: false },
  { to: '/leaderboard', label: 'Ranks', end: false },
  { to: '/profile', label: 'Profile', end: false },
]

export default function Nav() {
  return (
    <nav className="sticky bottom-0 grid grid-cols-4 border-t border-white/10 bg-[#0a0a0f]/90 backdrop-blur">
      {tabs.map((t) => (
        <NavLink
          key={t.to}
          to={t.to}
          end={t.end}
          className={({ isActive }) =>
            `py-3 text-center text-sm font-medium transition ${
              isActive ? 'text-indigo-400' : 'text-white/50 hover:text-white/80'
            }`
          }
        >
          {t.label}
        </NavLink>
      ))}
    </nav>
  )
}
