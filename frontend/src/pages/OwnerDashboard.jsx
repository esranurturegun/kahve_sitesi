import { useState, useEffect } from 'react'
import '../App.css'

export function OwnerDashboard({ onNavToCustomer }) {
  const [ownerToken, setOwnerToken] = useState(localStorage.getItem('owner-token'))
  const [ownerUser, setOwnerUser] = useState(null)
  const [authMode, setAuthMode] = useState('login')
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '' })
  const [authError, setAuthError] = useState('')
  
  const [businesses, setBusinesses] = useState([])
  const [selectedBusiness, setSelectedBusiness] = useState(null)
  const [activeTab, setActiveTab] = useState('info') // info, menu, gallery
  
  const [businessForm, setBusinessForm] = useState({ name: '', aciklama: '', adres: '', il: '', ilce: '', enlem: '', boylam: '' })
  const [menuCategories, setMenuCategories] = useState([])
  const [newCategory, setNewCategory] = useState('')
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [menuItems, setMenuItems] = useState([])
  const [newItem, setNewItem] = useState({ name: '', aciklama: '', fiyat: '', dosya_yolu: '' })
  const [galleryImages, setGalleryImages] = useState([])
  const [newImageUrl, setNewImageUrl] = useState('')

  async function apiFetch(url, options = {}) {
    const headers = {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(ownerToken ? { Authorization: `Bearer ${ownerToken}` } : {}),
      ...options.headers
    }
    return fetch(url, { ...options, headers })
  }

  useEffect(() => {
    const fetchOwnerUser = async () => {
      if (!ownerToken) return
      const response = await apiFetch('http://localhost:3000/api/owner/me')
      if (response.ok) {
        const data = await response.json()
        setOwnerUser(data.user)
        fetchBusinesses()
      } else {
        localStorage.removeItem('owner-token')
        setOwnerToken(null)
      }
    }
    fetchOwnerUser()
  }, [ownerToken])

  const fetchBusinesses = async () => {
    const response = await apiFetch('http://localhost:3000/api/owner/businesses')
    if (response.ok) {
      const data = await response.json()
      setBusinesses(data)
      if (data.length > 0) setSelectedBusiness(data[0])
    }
  }

  const handleOwnerLogin = async (e) => {
    e.preventDefault()
    setAuthError('')
    const endpoint = authMode === 'login' ? '/api/owner/auth/login' : '/api/owner/auth/register'
    const body = authMode === 'login' ? { email: authForm.email, password: authForm.password } : authForm
    const response = await apiFetch(`http://localhost:3000${endpoint}`, { method: 'POST', body: JSON.stringify(body) })
    if (response.ok) {
      const data = await response.json()
      localStorage.setItem('owner-token', data.token)
      setOwnerToken(data.token)
      setOwnerUser(data.user)
      setAuthForm({ name: '', email: '', password: '' })
    } else {
      const errorData = await response.json()
      setAuthError(errorData.error)
    }
  }

  const handleOwnerLogout = async () => {
    await apiFetch('http://localhost:3000/api/owner/auth/logout', { method: 'POST' })
    localStorage.removeItem('owner-token')
    setOwnerToken(null)
    setOwnerUser(null)
    setBusinesses([])
    setSelectedBusiness(null)
  }

  const handleSaveBusiness = async (e) => {
    e.preventDefault()
    const method = selectedBusiness?.isletme_id ? 'PUT' : 'POST'
    const url = selectedBusiness?.isletme_id
      ? `http://localhost:3000/api/owner/businesses/${selectedBusiness.isletme_id}`
      : 'http://localhost:3000/api/owner/businesses'
    
    const response = await apiFetch(url, { method, body: JSON.stringify(businessForm) })
    if (response.ok) {
      const data = await response.json()
      if (method === 'POST') {
        setBusinesses([...businesses, data])
        setSelectedBusiness(data)
      } else {
        setSelectedBusiness(data)
        setBusinesses(businesses.map(b => b.isletme_id === data.isletme_id ? data : b))
      }
      setBusinessForm({ name: '', aciklama: '', adres: '', il: '', ilce: '', enlem: '', boylam: '' })
    }
  }

  const handleAddCategory = async (e) => {
    e.preventDefault()
    if (!selectedBusiness || !newCategory) return
    const response = await apiFetch('http://localhost:3000/api/owner/menu-categories', {
      method: 'POST',
      body: JSON.stringify({ isletme_id: selectedBusiness.isletme_id, name: newCategory })
    })
    if (response.ok) {
      const data = await response.json()
      setMenuCategories([...menuCategories, data])
      setNewCategory('')
    }
  }

  const handleAddMenuItem = async (e) => {
    e.preventDefault()
    if (!selectedCategory) return
    const response = await apiFetch('http://localhost:3000/api/owner/menu-items', {
      method: 'POST',
      body: JSON.stringify({ kategori_id: selectedCategory.id, ...newItem })
    })
    if (response.ok) {
      const data = await response.json()
      setMenuItems([...menuItems, data])
      setNewItem({ name: '', aciklama: '', fiyat: '', dosya_yolu: '' })
    }
  }

  const handleAddImage = async (e) => {
    e.preventDefault()
    if (!selectedBusiness || !newImageUrl) return
    const response = await apiFetch('http://localhost:3000/api/owner/gallery', {
      method: 'POST',
      body: JSON.stringify({ isletme_id: selectedBusiness.isletme_id, dosya_yolu: newImageUrl })
    })
    if (response.ok) {
      const data = await response.json()
      setGalleryImages([...galleryImages, data])
      setNewImageUrl('')
    }
  }

  if (!ownerToken) {
    return (
      <div style={{ padding: '2rem', maxWidth: '400px', margin: '0 auto' }}>
        <h2>{authMode === 'login' ? 'İşletme Sahibi Giriş' : 'İşletme Sahibi Kayıt'}</h2>
        <form onSubmit={handleOwnerLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
          {authMode === 'register' && (
            <input
              type="text"
              placeholder="İşletme Sahibi Adı"
              value={authForm.name}
              onChange={(e) => setAuthForm({ ...authForm, name: e.target.value })}
              style={{ padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
              required
            />
          )}
          <input
            type="email"
            placeholder="E-posta"
            value={authForm.email}
            onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
            style={{ padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
            required
          />
          <input
            type="password"
            placeholder="Şifre"
            value={authForm.password}
            onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
            style={{ padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
            required
          />
          {authError && <p style={{ color: 'red' }}>{authError}</p>}
          <button type="submit" style={{ padding: '0.7rem', backgroundColor: '#ff6b35', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '1rem' }}>
            {authMode === 'login' ? 'Giriş Yap' : 'Kayıt Ol'}
          </button>
        </form>
        <button onClick={() => { setAuthMode(authMode === 'login' ? 'register' : 'login'); setAuthError(''); }} style={{ width: '100%', padding: '0.7rem', backgroundColor: '#f0f0f0', border: '1px solid #ddd', borderRadius: '4px', cursor: 'pointer', marginBottom: '2rem' }}>
          {authMode === 'login' ? 'Kayıt Ol' : 'Giriş Yap'}
        </button>
        <button onClick={onNavToCustomer} style={{ width: '100%', padding: '0.7rem', backgroundColor: '#6c63ff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
          Müşteri Sayfasına Dön
        </button>
      </div>
    )
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', borderBottom: '1px solid #ddd', paddingBottom: '1rem' }}>
        <h1>🏪 İşletme Paneli</h1>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <span>{ownerUser?.name}</span>
          <button onClick={onNavToCustomer} style={{ padding: '0.5rem 1rem', backgroundColor: '#6c63ff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            Müşteri Sayfası
          </button>
          <button onClick={handleOwnerLogout} style={{ padding: '0.5rem 1rem', cursor: 'pointer', border: '1px solid #ddd', borderRadius: '4px' }}>
            Çıkış
          </button>
        </div>
      </header>

      <div style={{ display: 'flex', gap: '2rem' }}>
        {/* Sol panel - İşletmeler */}
        <div style={{ flex: '0 0 250px', borderRight: '1px solid #ddd', paddingRight: '1rem' }}>
          <h3>İşletmelerim</h3>
          <div style={{ marginBottom: '1rem' }}>
            {businesses.map(biz => (
              <div
                key={biz.isletme_id}
                onClick={() => { setSelectedBusiness(biz); setActiveTab('info'); }}
                style={{
                  padding: '0.75rem',
                  marginBottom: '0.5rem',
                  backgroundColor: selectedBusiness?.isletme_id === biz.isletme_id ? '#ff6b35' : '#f0f0f0',
                  color: selectedBusiness?.isletme_id === biz.isletme_id ? 'white' : 'black',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                {biz.name}
              </div>
            ))}
          </div>
          <button
            onClick={() => { setSelectedBusiness(null); setBusinessForm({ name: '', aciklama: '', adres: '', il: '', ilce: '', enlem: '', boylam: '' }); setActiveTab('info'); }}
            style={{ width: '100%', padding: '0.75rem', backgroundColor: '#6c63ff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            + Yeni İşletme
          </button>
        </div>

        {/* Sağ panel - İçerik */}
        <div style={{ flex: 1 }}>
          {selectedBusiness && (
            <>
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid #ddd', paddingBottom: '1rem' }}>
                <button
                  onClick={() => setActiveTab('info')}
                  style={{ padding: '0.5rem 1rem', backgroundColor: activeTab === 'info' ? '#ff6b35' : '#f0f0f0', border: 'none', borderRadius: '4px', cursor: 'pointer', color: activeTab === 'info' ? 'white' : 'black' }}
                >
                  İşletme Bilgileri
                </button>
                <button
                  onClick={() => setActiveTab('menu')}
                  style={{ padding: '0.5rem 1rem', backgroundColor: activeTab === 'menu' ? '#ff6b35' : '#f0f0f0', border: 'none', borderRadius: '4px', cursor: 'pointer', color: activeTab === 'menu' ? 'white' : 'black' }}
                >
                  Menu
                </button>
                <button
                  onClick={() => setActiveTab('gallery')}
                  style={{ padding: '0.5rem 1rem', backgroundColor: activeTab === 'gallery' ? '#ff6b35' : '#f0f0f0', border: 'none', borderRadius: '4px', cursor: 'pointer', color: activeTab === 'gallery' ? 'white' : 'black' }}
                >
                  Galeri
                </button>
              </div>

              {activeTab === 'info' && (
                <div>
                  <h3>{selectedBusiness ? 'İşletme Bilgilerini Düzenle' : 'Yeni İşletme Oluştur'}</h3>
                  <form onSubmit={handleSaveBusiness} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <input
                      type="text"
                      placeholder="İşletme Adı"
                      value={businessForm.name}
                      onChange={(e) => setBusinessForm({ ...businessForm, name: e.target.value })}
                      style={{ padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
                      required
                    />
                    <textarea
                      placeholder="İşletme Açıklaması"
                      value={businessForm.aciklama}
                      onChange={(e) => setBusinessForm({ ...businessForm, aciklama: e.target.value })}
                      style={{ padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px', minHeight: '80px' }}
                    />
                    <input
                      type="text"
                      placeholder="Adres"
                      value={businessForm.adres}
                      onChange={(e) => setBusinessForm({ ...businessForm, adres: e.target.value })}
                      style={{ padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
                      required
                    />
                    <select
                      value={businessForm.il}
                      onChange={(e) => setBusinessForm({ ...businessForm, il: e.target.value })}
                      style={{ padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
                      required
                    >
                      <option value="">İl Seç</option>
                      <option value="Kocaeli">Kocaeli</option>
                    </select>
                    <select
                      value={businessForm.ilce}
                      onChange={(e) => setBusinessForm({ ...businessForm, ilce: e.target.value })}
                      style={{ padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
                    >
                      <option value="">İlçe Seç</option>
                      <option value="Darıca">Darıca</option>
                      <option value="İzmit">İzmit</option>
                      <option value="Gebze">Gebze</option>
                      <option value="Kartepe">Kartepe</option>
                      <option value="Başiskele">Başiskele</option>
                      <option value="Çayırova">Çayırova</option>
                      <option value="Gölcük">Gölcük</option>
                      <option value="Kandıra">Kandıra</option>
                      <option value="Karamürsel">Karamürsel</option>
                      <option value="Derince">Derince</option>
                      <option value="Dilovası">Dilovası</option>
                      <option value="Körfez">Körfez</option>
                    </select>
                    <input
                      type="number"
                      placeholder="Enlem"
                      step="0.000001"
                      value={businessForm.enlem}
                      onChange={(e) => setBusinessForm({ ...businessForm, enlem: e.target.value })}
                      style={{ padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
                      required
                    />
                    <input
                      type="number"
                      placeholder="Boylam"
                      step="0.000001"
                      value={businessForm.boylam}
                      onChange={(e) => setBusinessForm({ ...businessForm, boylam: e.target.value })}
                      style={{ padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
                      required
                    />
                    <button type="submit" style={{ padding: '0.75rem', backgroundColor: '#6c63ff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                      Kaydet
                    </button>
                  </form>
                </div>
              )}

              {activeTab === 'menu' && (
                <div>
                  <h3>Menu Yönetimi</h3>
                  <div style={{ marginBottom: '2rem' }}>
                    <h4>Kategoriler</h4>
                    <form onSubmit={handleAddCategory} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                      <input
                        type="text"
                        placeholder="Yeni Kategori"
                        value={newCategory}
                        onChange={(e) => setNewCategory(e.target.value)}
                        style={{ flex: 1, padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
                      />
                      <button type="submit" style={{ padding: '0.5rem 1rem', backgroundColor: '#6c63ff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                        Ekle
                      </button>
                    </form>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                      {menuCategories.map(cat => (
                        <button
                          key={cat.id}
                          onClick={() => setSelectedCategory(cat)}
                          style={{ padding: '0.5rem 1rem', backgroundColor: selectedCategory?.id === cat.id ? '#ff6b35' : '#f0f0f0', border: '1px solid #ddd', borderRadius: '4px', cursor: 'pointer', color: selectedCategory?.id === cat.id ? 'white' : 'black' }}
                        >
                          {cat.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {selectedCategory && (
                    <div>
                      <h4>"{selectedCategory.name}" Kategorisine Ürün Ekle</h4>
                      <form onSubmit={handleAddMenuItem} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
                        <input
                          type="text"
                          placeholder="Ürün Adı"
                          value={newItem.name}
                          onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                          style={{ padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
                          required
                        />
                        <textarea
                          placeholder="Ürün Açıklaması"
                          value={newItem.aciklama}
                          onChange={(e) => setNewItem({ ...newItem, aciklama: e.target.value })}
                          style={{ padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px', minHeight: '60px' }}
                        />
                        <input
                          type="number"
                          placeholder="Fiyat (₺)"
                          step="0.01"
                          value={newItem.fiyat}
                          onChange={(e) => setNewItem({ ...newItem, fiyat: e.target.value })}
                          style={{ padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
                        />
                        <input
                          type="url"
                          placeholder="Ürün Resim URL'i"
                          value={newItem.dosya_yolu}
                          onChange={(e) => setNewItem({ ...newItem, dosya_yolu: e.target.value })}
                          style={{ padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
                        />
                        <button type="submit" style={{ padding: '0.75rem', backgroundColor: '#6c63ff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                          Ürün Ekle
                        </button>
                      </form>

                      <h4>Mevcut Ürünler</h4>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1rem' }}>
                        {menuItems.map(item => (
                          <div key={item.id} style={{ border: '1px solid #ddd', borderRadius: '4px', padding: '1rem' }}>
                            {item.dosya_yolu && <img src={item.dosya_yolu} alt={item.name} style={{ width: '100%', height: '150px', objectFit: 'cover', borderRadius: '4px', marginBottom: '0.5rem' }} />}
                            <h5>{item.name}</h5>
                            <p style={{ fontSize: '0.9rem', color: '#666' }}>{item.aciklama}</p>
                            <p style={{ fontWeight: 'bold', color: '#ff6b35' }}>{item.fiyat}₺</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'gallery' && (
                <div>
                  <h3>Galeri Yönetimi</h3>
                  <form onSubmit={handleAddImage} style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem' }}>
                    <input
                      type="url"
                      placeholder="Resim URL'i"
                      value={newImageUrl}
                      onChange={(e) => setNewImageUrl(e.target.value)}
                      style={{ flex: 1, padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
                    />
                    <button type="submit" style={{ padding: '0.5rem 1rem', backgroundColor: '#6c63ff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                      Ekle
                    </button>
                  </form>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
                    {galleryImages.map(img => (
                      <div key={img.id} style={{ borderRadius: '4px', overflow: 'hidden', border: '1px solid #ddd' }}>
                        <img src={img.dosya_yolu} alt="Gallery" style={{ width: '100%', height: '150px', objectFit: 'cover' }} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {!selectedBusiness && (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#999' }}>
              <p>Yeni bir işletme oluşturmak için sol paneldeki "+ Yeni İşletme" butonuna tıklayın</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
