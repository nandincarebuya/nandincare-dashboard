import { useState } from 'react'

export default function LoginScreen({ onSignIn }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error: err } = await onSignIn(email, password)
    if (err) {
      setError(err.message === 'Invalid login credentials'
        ? 'Имэйл эсвэл нууц үг буруу байна'
        : err.message)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full" style={{ maxWidth: 360 }}>
        <div className="text-center mb-6">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-xl mx-auto mb-3"
            style={{ backgroundColor: '#295272' }}
          >
            N
          </div>
          <h1 className="text-2xl font-bold" style={{ color: '#295272' }}>NandinCare</h1>
          <p className="text-slate-400 text-sm mt-1">Command center</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Имэйл"
              required
              className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#295272]/30 focus:border-[#295272] transition-colors"
            />
          </div>
          <div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Нууц үг"
              required
              className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#295272]/30 focus:border-[#295272] transition-colors"
            />
          </div>

          {error && (
            <div className="text-red-600 text-sm text-center bg-red-50 rounded-lg py-2 px-3">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg text-white text-sm font-medium transition-opacity disabled:opacity-60"
            style={{ backgroundColor: '#295272' }}
          >
            {loading ? 'Нэвтэрч байна...' : 'Нэвтрэх'}
          </button>
        </form>
      </div>
    </div>
  )
}
