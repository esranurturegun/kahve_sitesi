import { useEffect, useState } from 'react'
import './App.css'

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

function App() {
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
  const [businessSearch, setBusinessSearch] = useState('')
  const [user, setUser] = useState(null)
  const [authOpen, setAuthOpen] = useState(false)
  const [ownerAuthOpen, setOwnerAuthOpen] = useState(false)
  const [ownerAuthMode, setOwnerAuthMode] = useState('login')
  const [authMode, setAuthMode] = useState('login')
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '' })
  const [ownerAuthForm, setOwnerAuthForm] = useState({ name: '', email: '', password: '' })
  const [authError, setAuthError] = useState('')
  const [ownerAuthError, setOwnerAuthError] = useState('')
  const [ownerUser, setOwnerUser] = useState(null)
  const [ownerBusinesses, setOwnerBusinesses] = useState([])
  const [ownerForm, setOwnerForm] = useState({
    name: '',
    aciklama: '',
    adres: '',
    il: 'Kocaeli',
    ilce: 'Darıca',
    enlem: '40.7654',
    boylam: '29.9408',
    cover_image: '',
  })
  const [ownerFormError, setOwnerFormError] = useState('')
  const [showOwnerPage, setShowOwnerPage] = useState(false)

  const token = localStorage.getItem('kahve-token')
  const ownerToken = localStorage.getItem('kahve-owner-token')

  async function apiFetch(url, options = {}) {
    const headers = { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers }
    return fetch(url, { ...options, headers })
  }

  async function ownerApiFetch(url, options = {}) {
    const headers = { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(ownerToken ? { Authorization: `Bearer ${ownerToken}` } : {}), ...options.headers }
    return fetch(url, { ...options, headers })
  }

  useEffect(() => {
    async function loadUserData() {
      const savedToken = localStorage.getItem('kahve-token')
      if (!savedToken) return
      try {
        const headers = { Authorization: `Bearer ${savedToken}` }
        const [userResponse, favoritesResponse, plannedResponse] = await Promise.all([
          fetch('/api/auth/me', { headers }),
          fetch('/api/favorites', { headers }),
          fetch('/api/planned', { headers }),
        ])
        if (!userResponse.ok) throw new Error('Oturum geçersiz.')
        const userData = await userResponse.json()
        const favorites = await favoritesResponse.json()
        const places = await plannedResponse.json()
        setUser(userData.user)
        setFavorites(favorites.map((favorite) => ({ ...favorite, id: favorite.place_id })))
        setPlanned(places.map((place) => ({ ...place, id: place.place_id })))
      } catch {
        localStorage.removeItem('kahve-token')
      }
    }

    async function loadOwnerData() {
      const savedOwnerToken = localStorage.getItem('kahve-owner-token')
      if (!savedOwnerToken) return
      try {
        const response = await fetch('/api/owner/me', {
          headers: { Authorization: `Bearer ${savedOwnerToken}` },
        })
        if (!response.ok) throw new Error('Owner session invalid.')
        const data = await response.json()
        setOwnerUser(data.user)
      } catch {
        localStorage.removeItem('kahve-owner-token')
      }
    }

    loadUserData()
    loadOwnerData()
  }, [])

  useEffect(() => {
    const [latitude, longitude] = districtCoordinates[district]
    let cancelled = false

    async function loadWeather() {
      setWeatherStatus('loading')
      try {
        const response = await fetch(`/api/weather?lat=${latitude}&lon=${longitude}`)
        const data = await response.json()
        if (!response.ok) throw new Error('Hava durumu alınamadı.')
        if (!cancelled) {
          setWeather({ ...data.current_weather, ...weatherSummary(data.current_weather.weathercode) })
          setWeatherStatus('ready')
        }
      } catch {
        if (!cancelled) setWeatherStatus('error')
      }
    }

    loadWeather()
    return () => { cancelled = true }
  }, [district])

  function normalizeText(text) {
    return (text || '')
      .toLowerCase()
      .replace(/i̇/g, 'i')
      .replace(/ı/g, 'i')
      .replace(/ğ/g, 'g')
      .replace(/ü/g, 'u')
      .replace(/ş/g, 's')
      .replace(/ö/g, 'o')
      .replace(/ç/g, 'c')
      .trim()
  }

  async function findCafes(selectedDistrict = district) {
    setStatus('loading')
    setError('')
    try {
      const response = await fetch('/api/public/businesses')
      const contentType = response.headers.get('content-type') || ''
      if (!contentType.includes('application/json')) {
        throw new Error('Backend sunucusu (http://localhost:3000) veya veritabanı aktif değil. Lütfen backend sunucunuzun çalıştığından emin olun.')
      }
      const businesses = await response.json()
      if (!response.ok) throw new Error(businesses.error || 'Kafeler yüklenemedi.')

      const normDistrict = normalizeText(selectedDistrict)

      let matched = (businesses || []).filter((business) => {
        const normIl = normalizeText(business.il)
        const normIlce = normalizeText(business.ilce)
        const normAdres = normalizeText(business.adres)
        const normName = normalizeText(business.name || business.ad)

        if (!normDistrict || normDistrict === 'kocaeli' || normDistrict === 'tumu') return true

        return normIlce.includes(normDistrict) ||
               normDistrict.includes(normIlce) ||
               normAdres.includes(normDistrict) ||
               normName.includes(normDistrict) ||
               normIl.includes(normDistrict)
      })

      if (matched.length === 0 && (businesses || []).length > 0) {
        matched = businesses
      }

      const term = normalizeText(businessSearch)
      if (term) {
        matched = matched.filter((b) => {
          const haystack = normalizeText(`${b.name || b.ad || ''} ${b.il || ''} ${b.ilce || ''} ${b.adres || ''}`)
          return haystack.includes(term)
        })
      }

      const ownerBusinesses = matched.map((business, idx) => ({
        place_id: `owner-${business.isletme_id}`,
        id: business.isletme_id,
        name: business.name || business.ad,
        formatted_address: business.adres,
        rating: 4.8,
        image: business.cover_image || business.gallery_image || fallbackImages[idx % fallbackImages.length],
        data_source: 'Veritabanı',
        fetched_at: business.created_at,
        is_owner_business: true,
        ...business,
      }))

      setCafes(ownerBusinesses)
      setStatus('ready')
    } catch (requestError) {
      setError(requestError.message)
      setStatus('error')
    }
  }

  useEffect(() => {
    findCafes(district)
  }, [district])

  async function toggleFavorite(cafe) {
    if (!user) {
      setAuthOpen(true)
      return
    }
    const id = cafe.place_id || cafe.id || cafe.name
    const favorite = { ...cafe, id, place_id: id, image: cafe.image || fallbackImages[favorites.length % fallbackImages.length] }

    try {
      if (favorites.some((item) => item.id === id)) {
        const response = await apiFetch(`/api/favorites/${encodeURIComponent(id)}`, { method: 'DELETE' })
        if (!response.ok) throw new Error('Favori silinemedi.')
        setFavorites(favorites.filter((item) => item.id !== id))
      } else {
        const response = await apiFetch('/api/favorites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(favorite),
        })
        if (!response.ok) throw new Error('Favori kaydedilemedi.')
        const savedFavorite = await response.json()
        setFavorites([...favorites, { ...savedFavorite, id: savedFavorite.place_id }])
      }
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  async function togglePlanned(cafe) {
    if (!user) {
      setAuthOpen(true)
      return
    }
    const id = cafe.place_id || cafe.id || cafe.name
    const place = { ...cafe, id, place_id: id, image: cafe.image || fallbackImages[planned.length % fallbackImages.length] }
    try {
      if (planned.some((item) => item.id === id)) {
        const response = await apiFetch(`/api/planned/${encodeURIComponent(id)}`, { method: 'DELETE' })
        if (!response.ok) throw new Error('Gidileceklerden çıkarılamadı.')
        setPlanned(planned.filter((item) => item.id !== id))
      } else {
        const response = await apiFetch('/api/planned', { method: 'POST', body: JSON.stringify(place) })
        if (!response.ok) throw new Error('Gidileceklere eklenemedi.')
        const savedPlace = await response.json()
        setPlanned([...planned, { ...savedPlace, id: savedPlace.place_id }])
      }
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  const isFavorite = (cafe) => favorites.some((item) => item.id === (cafe.place_id || cafe.id || cafe.name))
  const isPlanned = (cafe) => planned.some((item) => item.id === (cafe.place_id || cafe.id || cafe.name))
  const sortedCafes = sortOrder === 'rating'
    ? [...cafes].sort((firstCafe, secondCafe) => Number(secondCafe.rating || 0) - Number(firstCafe.rating || 0))
    : cafes
  const openCafe = (cafe, index) => setSelectedCafe({ ...cafe, image: cafe.image || fallbackImages[index % fallbackImages.length] })

  useEffect(() => {
    if (!selectedCafe) return
    const cafeId = selectedCafe.place_id || selectedCafe.name
    setReviews([])
    fetch(`/api/reviews/${encodeURIComponent(cafeId)}`)
      .then((response) => response.ok ? response.json() : Promise.reject(new Error('Yorumlar alınamadı.')))
      .then(setReviews)
      .catch((requestError) => setError(requestError.message))
  }, [selectedCafe])

  function openFavorites() {
    setSelectedCafe(null)
    setShowFavorites(true)
    setShowPlanned(false)
  }

  function openPlanned() {
    setSelectedCafe(null)
    setShowFavorites(false)
    setShowPlanned(true)
  }

  function openDiscovery() {
    setSelectedCafe(null)
    setShowFavorites(false)
    setShowPlanned(false)
  }

  async function submitAuth(event) {
    event.preventDefault()
    setAuthError('')
    try {
      const response = await fetch(`/api/auth/${authMode === 'login' ? 'login' : 'register'}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(authForm),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'İşlem gerçekleştirilemedi.')
      localStorage.setItem('kahve-token', data.token)
      setUser(data.user)
      setAuthOpen(false)
      setAuthForm({ name: '', email: '', password: '' })
      window.location.reload()
    } catch (requestError) {
      setAuthError(requestError.message)
    }
  }

  async function logout() {
    await apiFetch('/api/auth/logout', { method: 'POST' })
    localStorage.removeItem('kahve-token')
    setUser(null)
    setFavorites([])
    setPlanned([])
    setShowFavorites(false)
  }

  async function submitOwnerAuth(event) {
    event.preventDefault()
    setOwnerAuthError('')
    try {
      const response = await fetch(`/api/owner/auth/${ownerAuthMode === 'login' ? 'login' : 'register'}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ownerAuthForm),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'İşlem gerçekleştirilemedi.')
      localStorage.setItem('kahve-owner-token', data.token)
      setOwnerUser(data.user)
      setShowOwnerPage(true)
      setOwnerAuthOpen(false)
      setOwnerAuthForm({ name: '', email: '', password: '' })
      setOwnerAuthMode('login')
      await loadOwnerBusinesses()
    } catch (requestError) {
      setOwnerAuthError(requestError.message)
    }
  }

  async function loadOwnerBusinesses() {
    const savedOwnerToken = localStorage.getItem('kahve-owner-token')
    if (!savedOwnerToken) return
    try {
      const response = await fetch('/api/owner/businesses', {
        headers: { Authorization: `Bearer ${savedOwnerToken}` },
      })
      if (!response.ok) throw new Error('İşletmeler alınamadı.')
      const data = await response.json()
      setOwnerBusinesses(data)
      if (data.length > 0) setOwnerForm({ ...ownerForm, name: data[0].name, aciklama: data[0].aciklama || '', adres: data[0].adres || '', il: data[0].il || 'Kocaeli', ilce: data[0].ilce || '', enlem: String(data[0].enlem || ''), boylam: String(data[0].boylam || ''), cover_image: data[0].cover_image || '' })
    } catch {
      setOwnerBusinesses([])
    }
  }

  async function publishBusiness(event) {
    event.preventDefault()
    setOwnerFormError('')
    const savedOwnerToken = localStorage.getItem('kahve-owner-token')
    if (!savedOwnerToken) {
      setOwnerFormError('Önce cafe sahibi olarak giriş yapmalısınız.')
      return
    }
    try {
      const response = await fetch('/api/owner/businesses', {
        method: 'POST',
        headers: { Authorization: `Bearer ${savedOwnerToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...ownerForm,
          enlem: Number(ownerForm.enlem),
          boylam: Number(ownerForm.boylam),
          il: ownerForm.il || 'Kocaeli',
          ilce: ownerForm.ilce || 'Darıca',
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Kafe yayınlanamadı.')
      setOwnerBusinesses((current) => [data, ...current])
      setOwnerForm({ name: '', aciklama: '', adres: '', il: 'Kocaeli', ilce: 'Darıca', enlem: '40.7654', boylam: '29.9408', cover_image: '' })
      setShowOwnerPage(false)
      setSelectedCafe(null)
      setShowFavorites(false)
      setShowPlanned(false)
      setError('')
      await findCafes(district)
    } catch (requestError) {
      setOwnerFormError(requestError.message)
    }
  }

  async function addReview(event) {
    event.preventDefault()
    if (!user) {
      setAuthOpen(true)
      return
    }
    if (!selectedCafe || !reviewText.trim()) return

    try {
      const response = await apiFetch('/api/reviews', {
        method: 'POST',
        body: JSON.stringify({ place_id: selectedCafe.place_id || selectedCafe.name, text: reviewText }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Yorum kaydedilemedi.')
      setReviews([data, ...reviews])
      setReviewText('')
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  return (
    <div className="site-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="Kahve Keşfi ana sayfa"><span className="brand-mark">☕</span><span><strong>Kahve</strong><small>KEŞFİ</small></span></a>
        <nav className="nav-links" aria-label="Ana menü"><button className={!showFavorites && !showPlanned && !selectedCafe ? 'active' : ''} type="button" onClick={openDiscovery}>Keşfet</button><button className={showFavorites ? 'active' : ''} type="button" onClick={openFavorites}>Favoriler <span className="nav-count">{user ? favorites.length : 0}</span></button><button className={showPlanned ? 'active' : ''} type="button" onClick={openPlanned}>Gidilecekler <span className="nav-count">{user ? planned.length : 0}</span></button><a href="#hakkimizda">Hakkımızda</a></nav>
        <div className="header-actions">
          <button className="profile-chip" type="button" onClick={() => user ? logout() : setAuthOpen(true)}><span>{user ? user.name.slice(0, 2).toUpperCase() : 'G'}</span><small>{user ? `${user.name}<br />Çıkış yap` : 'Misafir<br />Giriş yap'}</small></button>
          <a className="owner-circle-button" href="/isletme-girisi" aria-label="Cafe sahibi girişi" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>☕</a>
        </div>
      </header>

      {authOpen && <div className="auth-backdrop" role="presentation" onClick={(event) => event.target === event.currentTarget && setAuthOpen(false)}><form className="auth-panel" onSubmit={submitAuth}><button className="auth-close" type="button" onClick={() => setAuthOpen(false)} aria-label="Pencereyi kapat">×</button><p className="eyebrow">Kahve Keşfi hesabı</p><h2>{authMode === 'login' ? 'Tekrar hoş geldin' : 'Hesap oluştur'}</h2><p className="auth-copy">Favorilerini ve gitmek istediğin mekanları kaydet.</p>{authMode === 'register' && <input value={authForm.name} onChange={(event) => setAuthForm({ ...authForm, name: event.target.value })} placeholder="Adın" aria-label="Adın" required />}<input type="email" value={authForm.email} onChange={(event) => setAuthForm({ ...authForm, email: event.target.value })} placeholder="E-posta" aria-label="E-posta" required /><input type="password" value={authForm.password} onChange={(event) => setAuthForm({ ...authForm, password: event.target.value })} placeholder="Şifre (en az 6 karakter)" aria-label="Şifre" minLength="6" required />{authError && <p className="auth-error">{authError}</p>}<button className="primary-button auth-submit" type="submit">{authMode === 'login' ? 'Giriş yap' : 'Kayıt ol'} <span>→</span></button><button className="auth-switch" type="button" onClick={() => { setAuthMode(authMode === 'login' ? 'register' : 'login'); setAuthError('') }}>{authMode === 'login' ? 'Hesabın yok mu? Kayıt ol' : 'Zaten hesabın var mı? Giriş yap'}</button></form></div>}

      {ownerAuthOpen && <div className="auth-backdrop" role="presentation" onClick={(event) => event.target === event.currentTarget && setOwnerAuthOpen(false)}><form className="auth-panel small-owner-panel" onSubmit={submitOwnerAuth}><button className="auth-close" type="button" onClick={() => setOwnerAuthOpen(false)} aria-label="Pencereyi kapat">×</button><p className="eyebrow">Cafe Sahibi</p><h2>{ownerAuthMode === 'login' ? 'Giriş yap' : 'Kayıt ol'}</h2><p className="auth-copy">{ownerAuthMode === 'login' ? 'İşletme paneline erişmek için hesabınıza giriş yapın.' : 'İşletmenizi eklemek için bir hesap oluşturun.'}</p>{ownerAuthMode === 'register' && <input value={ownerAuthForm.name} onChange={(event) => setOwnerAuthForm({ ...ownerAuthForm, name: event.target.value })} placeholder="İsim / işletme adı" aria-label="Cafe sahibi isim" required />}<input type="email" value={ownerAuthForm.email} onChange={(event) => setOwnerAuthForm({ ...ownerAuthForm, email: event.target.value })} placeholder="E-posta" aria-label="Cafe sahibi e-posta" required /><input type="password" value={ownerAuthForm.password} onChange={(event) => setOwnerAuthForm({ ...ownerAuthForm, password: event.target.value })} placeholder="Şifre" aria-label="Cafe sahibi şifre" minLength="6" required />{ownerAuthError && <p className="auth-error">{ownerAuthError}</p>}<button className="primary-button auth-submit" type="submit">{ownerAuthMode === 'login' ? 'Devam et' : 'Kayıt ol'} <span>→</span></button><button className="auth-switch" type="button" onClick={() => { setOwnerAuthMode(ownerAuthMode === 'login' ? 'register' : 'login'); setOwnerAuthError('') }}>{ownerAuthMode === 'login' ? 'Hesabın yok mu? Kayıt ol' : 'Zaten hesabın var mı? Giriş yap'}</button></form></div>}

      <main>
        <section className="db-search-panel" aria-label="Veritabanı kafe arama">
          <div className="db-search-box">
            <span className="pin-icon">⌕</span>
            <input
              type="text"
              value={businessSearch}
              onChange={(event) => setBusinessSearch(event.target.value)}
              placeholder="Kafe adını, ilçeyi veya adresi ara"
              aria-label="Kafe ara"
            />
            <button className="primary-button" type="button" onClick={() => findCafes(district)}>Ara</button>
          </div>
        </section>

        {showOwnerPage && ownerUser ? (
          <section className="favorites-page" style={{ display: 'grid', gap: '1.5rem' }}>
            <div className="section-heading"><div><p className="eyebrow">Cafe sahibi paneli</p><h1>Kafeni yayınla</h1></div><button className="outline-button" type="button" onClick={() => setShowOwnerPage(false)}>Geri dön</button></div>
            <form className="auth-panel small-owner-panel" style={{ width: '100%', maxWidth: '760px', margin: '0 auto' }} onSubmit={publishBusiness}>
              <p className="eyebrow">Kafe bilgileri</p>
              <div style={{ display: 'grid', gap: '0.9rem' }}>
                <input value={ownerForm.name} onChange={(event) => setOwnerForm({ ...ownerForm, name: event.target.value })} placeholder="Kafe adı" aria-label="Kafe adı" required />
                <textarea value={ownerForm.aciklama} onChange={(event) => setOwnerForm({ ...ownerForm, aciklama: event.target.value })} placeholder="Kısa tanım / açıklama" aria-label="Kafe açıklaması" rows="3" />
                <input value={ownerForm.adres} onChange={(event) => setOwnerForm({ ...ownerForm, adres: event.target.value })} placeholder="Adres" aria-label="Adres" required />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <input value={ownerForm.il} onChange={(event) => setOwnerForm({ ...ownerForm, il: event.target.value })} placeholder="İl" aria-label="İl" required />
                  <input value={ownerForm.ilce} onChange={(event) => setOwnerForm({ ...ownerForm, ilce: event.target.value })} placeholder="İlçe" aria-label="İlçe" required />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <input value={ownerForm.enlem} onChange={(event) => setOwnerForm({ ...ownerForm, enlem: event.target.value })} placeholder="Enlem" aria-label="Enlem" required />
                  <input value={ownerForm.boylam} onChange={(event) => setOwnerForm({ ...ownerForm, boylam: event.target.value })} placeholder="Boylam" aria-label="Boylam" required />
                </div>
                <input value={ownerForm.cover_image} onChange={(event) => setOwnerForm({ ...ownerForm, cover_image: event.target.value })} placeholder="Kapak fotoğrafı URL" aria-label="Kapak fotoğrafı URL" />
                {ownerFormError && <p className="auth-error">{ownerFormError}</p>}
                <button className="primary-button auth-submit" type="submit">Yayınla <span>→</span></button>
              </div>
            </form>
            {ownerBusinesses.length > 0 && (
              <div className="cafe-grid">
                {ownerBusinesses.map((business) => (
                  <article className="cafe-card" key={business.isletme_id}>
                    <div className="card-image-wrap"><img src={business.cover_image || fallbackImages[0]} alt={business.name} /></div>
                    <div className="card-content"><div className="card-title-row"><h3>{business.name}</h3><span className="rating">★ 4.8</span></div><p className="address">⌖ {business.adres}</p><p className="detail-source">{business.il} / {business.ilce}</p></div>
                  </article>
                ))}
              </div>
            )}
          </section>
        ) : selectedCafe ? (
          <section className="detail-page">
            <button className="back-link" type="button" onClick={() => setSelectedCafe(null)}>← Kafelere dön</button>
            <div className="detail-hero">
              <div className="detail-image"><img src={selectedCafe.image} alt={selectedCafe.name} /></div>
              <div className="detail-summary">
                <p className="eyebrow">Kocaeli / {district}</p>
                <div className="detail-title-row">
                  <h1>{selectedCafe.name}</h1>
                  <button className={`favorite-button detail-favorite ${isFavorite(selectedCafe) ? 'saved' : ''}`} type="button" onClick={() => toggleFavorite(selectedCafe)} aria-label="Favori durumu">{isFavorite(selectedCafe) ? '♥' : '♡'}</button>
                </div>
                <div className="detail-rating">★ {selectedCafe.rating || '—'} <span>{selectedCafe.user_ratings_total ? `(${selectedCafe.user_ratings_total} değerlendirme)` : 'Kullanıcı değerlendirmeleri'}</span></div>
                <p className="detail-address">⌖ {selectedCafe.formatted_address || `${district}, Kocaeli`}</p>
                <p className="detail-source">Veri kaynağı: {selectedCafe.data_source || 'Veritabanı'} · {selectedCafe.fetched_at ? `Kayıt Tarihi: ${new Date(selectedCafe.fetched_at).toLocaleDateString('tr-TR')}` : 'Sistem verisi'}</p>
                <p className="detail-intro">Kahve molan için {selectedCafe.name} hakkında bilmen gerekenler. Mekanın atmosferini keşfet, konumunu kaydet ve bir sonraki kahve durağını planla.</p>
                <div className="detail-actions">
                  <button className="primary-button" type="button" onClick={() => toggleFavorite(selectedCafe)}>{isFavorite(selectedCafe) ? 'Favorilerde' : 'Favorilere ekle'} <span>♥</span></button>
                  <button className="outline-button" type="button" onClick={() => togglePlanned(selectedCafe)} style={{ cursor: 'pointer' }}>{isPlanned(selectedCafe) ? 'Gidileceklerde ✓' : 'Gidileceklere ekle +'}</button>
                  <a className="outline-button" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedCafe.name + ' ' + (selectedCafe.formatted_address || district))}`} target="_blank" rel="noreferrer">Haritada aç ↗</a>
                </div>
              </div>
            </div>

            <div className="detail-lower">
              <div>
                <div className="section-heading detail-heading"><div><p className="eyebrow">Ziyaret notları</p><h2>Bu mekanı keşfet</h2></div></div>
                <div className="detail-facts">
                  <div><span>☕</span><strong>Kahve durağı</strong><small>Yeni bir tat keşfet</small></div>
                  <div><span>★</span><strong>{selectedCafe.rating || '—'} puan</strong><small>Platform değerlendirmesi</small></div>
                  <div><span>⌖</span><strong>{district}</strong><small>Kocaeli, Türkiye</small></div>
                </div>
              </div>
            </div>

            <section className="reviews-section">
              <div className="section-heading detail-heading"><div><p className="eyebrow">Kahve severler</p><h2>Kullanıcı yorumları</h2></div><span className="result-count">{reviews.length} yorum</span></div>
              <div className="review-list">
                {reviews.length === 0 ? <p className="empty-reviews">Bu mekan için henüz yorum yok. İlk yorumu sen yaz.</p> : reviews.map((review) => (
                  <article className="user-review" key={review.id}><span className="review-avatar">{review.name.charAt(0).toUpperCase()}</span><div><strong>{review.name}</strong><p>{review.text}</p></div></article>
                ))}
              </div>
              <form className="review-form" onSubmit={addReview}>
                <h3>Yorum yaz</h3>
                <div className="review-fields">
                  <textarea value={reviewText} onChange={(event) => setReviewText(event.target.value)} placeholder={user ? `${user.name}, bu mekan hakkındaki düşüncen...` : 'Yorum yazmak için giriş yap'} aria-label="Yorumun" rows="3" />
                </div>
                <button className="primary-button" type="submit" disabled={!reviewText.trim()}>Yorumu paylaş <span>↗</span></button>
              </form>
            </section>
          </section>
        ) : showFavorites ? (
          <section className="favorites-page">
            <div className="section-heading"><div><p className="eyebrow">Kayıtlı mekanların</p><h1>Favorilerim</h1></div><span className="result-count">{favorites.length} mekan</span></div>
            {!user ? (
              <div className="state-box"><strong>Favorilerini görmek için giriş yap.</strong><span>Hesabına bağlanınca kayıtlı mekanların burada olacak.</span><button type="button" onClick={() => setAuthOpen(true)}>Giriş yap</button></div>
            ) : favorites.length === 0 ? (
              <div className="state-box"><strong>Henüz favori mekanın yok.</strong><span>Keşfet sayfasından beğendiğin kafeleri buraya ekleyebilirsin.</span><button type="button" onClick={openDiscovery}>Kafeleri keşfet</button></div>
            ) : (
              <div className="cafe-grid">{favorites.map((cafe, index) => (
                <article className="cafe-card" key={cafe.id}>
                  <div className="card-image-wrap"><img src={cafe.image || fallbackImages[index % fallbackImages.length]} alt={cafe.name} /><button className="favorite-button saved" type="button" onClick={() => toggleFavorite(cafe)} aria-label={`${cafe.name} favorilerden çıkar`}>♥</button></div>
                  <div className="card-content"><div className="card-title-row"><h3>{cafe.name}</h3><span className="rating">★ {cafe.rating || '—'}</span></div><p className="address">⌖ {cafe.formatted_address || `${district}, Kocaeli`}</p><button className="detail-link" type="button" onClick={() => openCafe(cafe, index)}>Mekanı incele <span>↗</span></button></div>
                </article>
              ))}</div>
            )}
          </section>
        ) : showPlanned ? (
          <section className="favorites-page">
            <div className="section-heading"><div><p className="eyebrow">Bir sonraki kahve molan</p><h1>Gidilecekler</h1></div><span className="result-count">{planned.length} mekan</span></div>
            {!user ? (
              <div className="state-box"><strong>Gidilecekler listeni oluştur.</strong><span>Merak ettiğin mekanları kaydetmek için giriş yap.</span><button type="button" onClick={() => setAuthOpen(true)}>Giriş yap</button></div>
            ) : planned.length === 0 ? (
              <div className="state-box"><strong>Henüz gidilecek mekanın yok.</strong><span>Keşfet sayfasından işinize yarayacak kafeleri ekleyebilirsiniz.</span><button type="button" onClick={openDiscovery}>Kafeleri keşfet</button></div>
            ) : (
              <div className="cafe-grid">{planned.map((cafe, index) => (
                <article className="cafe-card" key={cafe.id}>
                  <div className="card-image-wrap"><img src={cafe.image || fallbackImages[index % fallbackImages.length]} alt={cafe.name} /><button className="favorite-button saved" type="button" onClick={() => toggleFavorite(cafe)} aria-label={`${cafe.name} favoriye ekle`}>♥</button></div>
                  <div className="card-content"><div className="card-title-row"><h3>{cafe.name}</h3><span className="rating">★ {cafe.rating || '—'}</span></div><p className="address">⌖ {cafe.formatted_address || `${district}, Kocaeli`}</p><button className="detail-link" type="button" onClick={() => openCafe(cafe, index)}>Mekanı incele <span>↗</span></button></div>
                </article>
              ))}</div>
            )}
          </section>
        ) : (
          <>
            <section className="hero-section" id="kesfet">
              <div className="hero-copy"><p className="eyebrow">Kocaeli kahve rehberi</p><h1>Şehrindeki kahveyi<br /><em>bul.</em></h1><p className="hero-text">Kocaeli'nin ilçelerinde keşfedilmeyi bekleyen kahve duraklarını bul, yeni favorini seç.</p></div>
              <div className="hero-tools">
                <div className="search-panel">
                  <div className="search-label"><span className="pin-icon">⌖</span><span>Nerede kahve içmek istersin?</span></div>
                  <div className="search-row">
                    <label className="select-wrap"><span>İlçe seçin</span><select value={district} onChange={(event) => setDistrict(event.target.value)}>{districts.map((item) => <option key={item}>{item}</option>)}</select></label>
                    <button className="primary-button" type="button" onClick={() => findCafes()} disabled={status === 'loading'}>{status === 'loading' ? 'Listeleniyor...' : 'Listele'} <span>→</span></button>
                  </div>
                </div>
                <aside className="weather-widget" aria-live="polite">
                  <div className="weather-widget-head"><span>☁︎</span><small>{district} hava durumu</small></div>
                  {weatherStatus === 'loading' && <div className="weather-loading">Hava kontrol ediliyor...</div>}
                  {weatherStatus === 'error' && <div className="weather-loading">Hava bilgisi alınamadı.</div>}
                  {weatherStatus === 'ready' && weather && (
                    <div className="weather-content">
                      <div className="weather-main"><span className="weather-icon">{weather.icon}</span><strong>{Math.round(weather.temperature)}°</strong></div>
                      <div><b>{weather.label}</b><p>{weather.message}</p></div>
                      <small className="weather-wind">Rüzgar {Math.round(weather.windspeed)} km/s</small>
                    </div>
                  )}
                </aside>
              </div>
            </section>

            <section className="results-section" id="favoriler">
              <div className="section-heading"><div><p className="eyebrow">Senin için seçtik</p><h2>{district} kahveleri</h2></div><div className="results-controls">{status === 'ready' && <span className="result-count">{cafes.length} mekan bulundu</span>}<label className="sort-control"><span>Sıralama</span><select value={sortOrder} onChange={(event) => setSortOrder(event.target.value)}><option value="recommended">Önerilen</option><option value="rating">Puana göre</option><option value="map" disabled>Haritaya göre (yakında)</option></select></label></div></div>
              {status === 'error' && <div className="state-box error-box"><strong>Bir şeyler ters gitti.</strong><span>{error}</span><button type="button" onClick={() => findCafes()}>Tekrar dene</button></div>}
              {status === 'loading' && <div className="loading-grid">{[1, 2, 3].map((item) => <div className="skeleton-card" key={item} />)}</div>}
              {status === 'ready' && cafes.length === 0 && <div className="state-box"><strong>Bu ilçede sonuç bulamadık.</strong><span>Başka bir Kocaeli ilçesi seçip yeniden deneyebilirsin.</span></div>}
              {status === 'ready' && cafes.length > 0 && (
                <div className="cafe-grid">{sortedCafes.filter((cafe) => {
                    const term = businessSearch.trim().toLowerCase()
                    if (!term) return true
                    const haystack = `${cafe.name || ''} ${cafe.il || ''} ${cafe.ilce || ''} ${cafe.formatted_address || ''}`.toLowerCase()
                    return haystack.includes(term)
                  }).map((cafe, index) => (
                  <article className="cafe-card" key={cafe.place_id || cafe.name}>
                    <div className="card-image-wrap"><img src={fallbackImages[index % fallbackImages.length]} alt={cafe.name} /><button className={`favorite-button ${isFavorite(cafe) ? 'saved' : ''}`} type="button" onClick={() => toggleFavorite(cafe)} title={isFavorite(cafe) ? 'Favorilerden çıkar' : 'Favorilere ekle'} aria-label={`${cafe.name} favori durumu`}>{isFavorite(cafe) ? '♥' : '♡'}</button><button className={`planned-button ${isPlanned(cafe) ? 'planned-saved' : ''}`} type="button" onClick={() => togglePlanned(cafe)} title={isPlanned(cafe) ? 'Gidileceklerden çıkar' : 'Gidileceklere ekle'} aria-label={`${cafe.name} gidilecekler durumu`}>{isPlanned(cafe) ? '✓' : '+'}</button></div>
                    <div className="card-content"><div className="card-title-row"><h3>{cafe.name}</h3><span className="rating">★ {cafe.rating || '—'}</span></div><p className="address">⌖ {cafe.formatted_address || `${district}, Kocaeli`}</p><button className="detail-link" type="button" onClick={() => openCafe(cafe, index)}>Mekanı incele <span>↗</span></button></div>
                  </article>
                ))}</div>
              )}
            </section>
          </>
        )}
      </main>

      <footer id="hakkimizda"><div><span className="brand-mark small">☕</span> <strong>Kahve Keşfi</strong> ile şehrindeki iyi kahveyi bul.</div><span>Kocaeli ile başladık, yakında tüm şehirlerdeyiz.</span></footer>
    </div>
  )
}

export default App
