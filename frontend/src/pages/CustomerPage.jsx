import { useEffect, useState } from 'react'
import '../App.css'

const districts = ['Darıca', 'İzmit', 'Gebze', 'Kartepe', 'Başiskele', 'Çayırova', 'Gölcük', 'Kandıra', 'Karamürsel', 'Derince', 'Dilovası', 'Körfez']
const fallbackImages = [
  'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=900&q=85',
  'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=900&q=85',
  'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=900&q=85',
  'https://images.unsplash.com/photo-1445116572660-236099ec97a0?auto=format&fit=crop&w=900&q=85',
]
const districtCoordinates = {
  Darıca: [40.7654, 29.9408], İzmit: [40.7654, 29.9408], Gebze: [40.8028, 29.4307], Kartepe: [40.7534, 30.0222],
  Başiskele: [40.7113, 29.9293], Çayırova: [40.8217, 29.3717], Gölcük: [40.7179, 29.8214], Kandıra: [41.0715, 30.1526],
  Karamürsel: [40.6913, 29.6165], Derince: [40.7569, 29.8308], Dilovası: [40.7797, 29.5355], Körfez: [40.7767, 29.7356],
}

function weatherSummary(code) {
  if (code === 0) return { icon: '☀️', label: 'Güneşli', message: 'Kafeye gitmek için harika!' }
  if ([1, 2].includes(code)) return { icon: '🌤️', label: 'Parçalı bulutlu', message: 'Kahve molası için güzel bir gün.' }
  if (code === 3) return { icon: '☁️', label: 'Bulutlu', message: 'Sıcak bir kahve iyi fikir.' }
  if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) return { icon: '🌧️', label: 'Yağmurlu', message: 'İçeride keyifli bir kahve zamanı.' }
  if ([71, 73, 75, 85, 86].includes(code)) return { icon: '❄️', label: 'Karlı', message: 'Sıcak kahveni alıp yola çık.' }
  if ([95, 96, 99].includes(code)) return { icon: '⛈️', label: 'Fırtınalı', message: 'Bugün evde kahve keyfi daha iyi.' }
  return { icon: '🌥️', label: 'Değişken', message: 'Kahve planın için hava uygun.' }
}

export function CustomerPage({ onNavToOwner }) {
  const [district, setDistrict] = useState('Darıca')
  const [cafes, setCafes] = useState([])
  const [sortOrder, setSortOrder] = useState('recommended')
  const [favorites, setFavorites] = useState([])
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')
  const [selectedCafe, setSelectedCafe] = useState(null)
  const [reviews, setReviews] = useState([])
  const [reviewText, setReviewText] = useState('')
  const [weather, setWeather] = useState(null)
  const [weatherStatus, setWeatherStatus] = useState('loading')
  const [showFavorites, setShowFavorites] = useState(false)
  const [showPlanned, setShowPlanned] = useState(false)
  const [planned, setPlanned] = useState([])
  const [user, setUser] = useState(null)
  const [authOpen, setAuthOpen] = useState(false)
  const [authMode, setAuthMode] = useState('login')
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '' })
  const [authError, setAuthError] = useState('')

  const token = localStorage.getItem('kahve-token')
  async function apiFetch(url, options = {}) {
    const headers = { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers }
    const response = await fetch(url, { ...options, headers })
    return response
  }

  useEffect(() => {
    const fetchUser = async () => {
      if (!token) return
      const response = await apiFetch('http://localhost:3000/api/auth/me')
      if (response.ok) setUser(await response.json())
    }
    fetchUser()
  }, [token])

  useEffect(() => {
    const fetchCafes = async () => {
      setStatus('loading')
      setError('')
      try {
        const response = await apiFetch(`http://localhost:3000/api/cafes?ilce=${district}`)
        if (!response.ok) throw new Error('Kafe araması başarısız.')
        const data = await response.json()
        const sortedCafes = (data.results || []).sort((a, b) => (b.rating || 0) - (a.rating || 0))
        setCafes(sortOrder === 'recommended' ? sortedCafes : [...sortedCafes].reverse())
        setStatus('idle')
      } catch (e) {
        setError(e.message)
        setStatus('error')
      }
    }
    fetchCafes()
  }, [district, sortOrder])

  useEffect(() => {
    const fetchWeather = async () => {
      const coords = districtCoordinates[district]
      if (!coords) return
      try {
        const response = await fetch(`http://localhost:3000/api/weather?lat=${coords[0]}&lon=${coords[1]}`)
        if (!response.ok) throw new Error('Hava durumu alınamadı.')
        const data = await response.json()
        setWeather(data.current_weather?.weather_code)
        setWeatherStatus('idle')
      } catch (e) {
        setWeatherStatus('error')
      }
    }
    fetchWeather()
  }, [district])

  useEffect(() => {
    const fetchFavorites = async () => {
      if (!token) return
      const response = await apiFetch('http://localhost:3000/api/favorites')
      if (response.ok) setFavorites(await response.json())
    }
    fetchFavorites()
  }, [token])

  useEffect(() => {
    const fetchPlanned = async () => {
      if (!token) return
      const response = await apiFetch('http://localhost:3000/api/planned')
      if (response.ok) setPlanned(await response.json())
    }
    fetchPlanned()
  }, [token])

  const handleSelectCafe = async (cafe) => {
    setSelectedCafe(cafe)
    const response = await apiFetch(`http://localhost:3000/api/reviews/${cafe.place_id}`)
    if (response.ok) setReviews(await response.json())
  }

  const handleAddFavorite = async (cafe) => {
    const response = await apiFetch('http://localhost:3000/api/favorites', {
      method: 'POST',
      body: JSON.stringify({ place_id: cafe.place_id, name: cafe.name, formatted_address: cafe.formatted_address, rating: cafe.rating, image: cafe.photos?.[0]?.photo_reference })
    })
    if (response.ok) {
      setFavorites([...favorites, await response.json()])
    }
  }

  const handleAddPlanned = async (cafe) => {
    const response = await apiFetch('http://localhost:3000/api/planned', {
      method: 'POST',
      body: JSON.stringify({ place_id: cafe.place_id, name: cafe.name, formatted_address: cafe.formatted_address, rating: cafe.rating, image: cafe.photos?.[0]?.photo_reference })
    })
    if (response.ok) {
      setPlanned([...planned, await response.json()])
    }
  }

  const handleAddReview = async (e) => {
    e.preventDefault()
    const response = await apiFetch('http://localhost:3000/api/reviews', {
      method: 'POST',
      body: JSON.stringify({ place_id: selectedCafe.place_id, text: reviewText })
    })
    if (response.ok) {
      setReviews([await response.json(), ...reviews])
      setReviewText('')
    }
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    setAuthError('')
    const endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/register'
    const body = authMode === 'login' ? { email: authForm.email, password: authForm.password } : authForm
    const response = await apiFetch(`http://localhost:3000${endpoint}`, { method: 'POST', body: JSON.stringify(body) })
    if (response.ok) {
      const data = await response.json()
      localStorage.setItem('kahve-token', data.token)
      setUser(data.user)
      setAuthOpen(false)
      setAuthForm({ name: '', email: '', password: '' })
    } else {
      setAuthError(await response.then(r => r.json()).then(d => d.error))
    }
  }

  const handleLogout = async () => {
    await apiFetch('http://localhost:3000/api/auth/logout', { method: 'POST' })
    localStorage.removeItem('kahve-token')
    setUser(null)
  }

  return (
    <div className="app">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', borderBottom: '1px solid #ddd' }}>
        <h1>☕ Kahve Sitesi</h1>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <button onClick={() => onNavToOwner()} style={{ padding: '0.5rem 1rem', cursor: 'pointer', backgroundColor: '#ff6b35', color: 'white', border: 'none', borderRadius: '4px' }}>
            İşletme Paneli
          </button>
          {user ? (
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <span>{user.user?.name || user.name}</span>
              <button onClick={handleLogout} style={{ padding: '0.5rem 1rem', cursor: 'pointer' }}>
                Çıkış
              </button>
            </div>
          ) : (
            <button onClick={() => setAuthOpen(true)} style={{ padding: '0.5rem 1rem', cursor: 'pointer' }}>
              Giriş / Kayıt
            </button>
          )}
        </div>
      </header>

      {authOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '8px', width: '90%', maxWidth: '400px' }}>
            <h2>{authMode === 'login' ? 'Giriş Yap' : 'Kayıt Ol'}</h2>
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {authMode === 'register' && (
                <input
                  type="text"
                  placeholder="Ad Soyad"
                  value={authForm.name}
                  onChange={(e) => setAuthForm({ ...authForm, name: e.target.value })}
                  style={{ padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
                />
              )}
              <input
                type="email"
                placeholder="E-posta"
                value={authForm.email}
                onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
                style={{ padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
              />
              <input
                type="password"
                placeholder="Şifre"
                value={authForm.password}
                onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                style={{ padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
              />
              {authError && <p style={{ color: 'red' }}>{authError}</p>}
              <button type="submit" style={{ padding: '0.5rem', backgroundColor: '#6c63ff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                {authMode === 'login' ? 'Giriş Yap' : 'Kayıt Ol'}
              </button>
              <button
                type="button"
                onClick={() => { setAuthMode(authMode === 'login' ? 'register' : 'login'); setAuthError(''); }}
                style={{ padding: '0.5rem', backgroundColor: '#f0f0f0', border: '1px solid #ddd', borderRadius: '4px', cursor: 'pointer' }}
              >
                {authMode === 'login' ? 'Kayıt Ol' : 'Giriş Yap'}
              </button>
            </form>
            <button onClick={() => { setAuthOpen(false); setAuthError(''); }} style={{ marginTop: '1rem', padding: '0.5rem', cursor: 'pointer' }}>
              Kapat
            </button>
          </div>
        </div>
      )}

      <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
          <select value={district} onChange={(e) => setDistrict(e.target.value)} style={{ padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}>
            {districts.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} style={{ padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}>
            <option value="recommended">Önerilen</option>
            <option value="alphabetical">Alfabetik</option>
          </select>
          <button onClick={() => setShowFavorites(!showFavorites)} style={{ padding: '0.5rem 1rem', backgroundColor: showFavorites ? '#ff6b35' : '#f0f0f0', cursor: 'pointer', border: '1px solid #ddd', borderRadius: '4px' }}>
            ❤️ Favoriler ({favorites.length})
          </button>
          <button onClick={() => setShowPlanned(!showPlanned)} style={{ padding: '0.5rem 1rem', backgroundColor: showPlanned ? '#ff6b35' : '#f0f0f0', cursor: 'pointer', border: '1px solid #ddd', borderRadius: '4px' }}>
            📍 Gidilecekler ({planned.length})
          </button>
        </div>

        {weather !== null && (
          <div style={{ backgroundColor: '#f9f9f9', padding: '1rem', borderRadius: '8px', marginBottom: '2rem', textAlign: 'center' }}>
            <p style={{ fontSize: '1.5rem' }}>{weatherSummary(weather).icon} {weatherSummary(weather).label}</p>
            <p>{weatherSummary(weather).message}</p>
          </div>
        )}

        {error && <p style={{ color: 'red', marginBottom: '1rem' }}>Hata: {error}</p>}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
          {(showFavorites ? favorites : showPlanned ? planned : cafes).map((cafe, idx) => (
            <div key={cafe.place_id || idx} style={{ border: '1px solid #ddd', borderRadius: '8px', overflow: 'hidden', cursor: 'pointer', transition: 'box-shadow 0.2s' }} onClick={() => handleSelectCafe(cafe)}>
              <img src={cafe.image || fallbackImages[idx % fallbackImages.length]} alt={cafe.name} style={{ width: '100%', height: '200px', objectFit: 'cover' }} />
              <div style={{ padding: '1rem' }}>
                <h3>{cafe.name}</h3>
                <p style={{ fontSize: '0.9rem', color: '#666' }}>{cafe.formatted_address}</p>
                <p style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#ff6b35' }}>⭐ {cafe.rating || 'N/A'}</p>
                {user && !showFavorites && (
                  <button onClick={(e) => { e.stopPropagation(); handleAddFavorite(cafe); }} style={{ marginRight: '0.5rem', padding: '0.5rem', cursor: 'pointer', backgroundColor: favorites.some(f => f.place_id === cafe.place_id) ? '#ff6b35' : '#f0f0f0', border: '1px solid #ddd', borderRadius: '4px' }}>
                    ❤️ Favori
                  </button>
                )}
                {user && !showPlanned && (
                  <button onClick={(e) => { e.stopPropagation(); handleAddPlanned(cafe); }} style={{ padding: '0.5rem', cursor: 'pointer', backgroundColor: planned.some(p => p.place_id === cafe.place_id) ? '#ff6b35' : '#f0f0f0', border: '1px solid #ddd', borderRadius: '4px' }}>
                    📍 Ekle
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {selectedCafe && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
            <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '8px', width: '90%', maxWidth: '600px', maxHeight: '80vh', overflowY: 'auto' }}>
              <h2>{selectedCafe.name}</h2>
              <p>{selectedCafe.formatted_address}</p>
              <h3>Yorumlar</h3>
              {user && (
                <form onSubmit={handleAddReview} style={{ marginBottom: '1rem' }}>
                  <textarea value={reviewText} onChange={(e) => setReviewText(e.target.value)} placeholder="Yorum yaz..." style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd', minHeight: '100px' }} />
                  <button type="submit" style={{ marginTop: '0.5rem', padding: '0.5rem 1rem', backgroundColor: '#6c63ff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                    Gönder
                  </button>
                </form>
              )}
              {reviews.map(review => (
                <div key={review.id} style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: '#f9f9f9', borderRadius: '4px' }}>
                  <p style={{ fontWeight: 'bold' }}>{review.name}</p>
                  <p>{review.text}</p>
                  <p style={{ fontSize: '0.8rem', color: '#999' }}>{new Date(review.created_at).toLocaleDateString('tr-TR')}</p>
                </div>
              ))}
              <button onClick={() => setSelectedCafe(null)} style={{ marginTop: '1rem', padding: '0.5rem 1rem', cursor: 'pointer' }}>
                Kapat
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
