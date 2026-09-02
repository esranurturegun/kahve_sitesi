import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useOwnerAuth, safeParseJson } from '../context/OwnerAuthContext';
import { KafeFormModal } from '../components/KafeFormModal';
import '../App.css';

const fallbackImages = [
  'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=900&q=85',
  'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=900&q=85',
  'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=900&q=85',
  'https://images.unsplash.com/photo-1445116572660-236099ec97a0?auto=format&fit=crop&w=900&q=85',
];

export function Kafelerim() {
  const { owner, logout, loading, ownerApiFetch } = useOwnerAuth();
  const navigate = useNavigate();

  const [cafes, setCafes] = useState([]);
  const [cafesLoading, setCafesLoading] = useState(true);
  const [error, setError] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCafe, setEditingCafe] = useState(null);

  useEffect(() => {
    if (!loading && !owner) {
      navigate('/isletme-girisi');
    }
  }, [owner, loading, navigate]);

  const loadCafes = async () => {
    setCafesLoading(true);
    setError('');
    try {
      const response = await ownerApiFetch('/api/owner/isletmeler');
      const data = await safeParseJson(response);
      if (!response.ok) {
        if (response.status === 401) {
          navigate('/isletme-girisi');
          return;
        }
        throw new Error(data.error || 'Kafeler yüklenemedi.');
      }
      setCafes(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setCafesLoading(false);
    }
  };

  useEffect(() => {
    if (owner) {
      loadCafes();
    }
  }, [owner]);

  const handleOpenAddModal = () => {
    setEditingCafe(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (cafe) => {
    setEditingCafe(cafe);
    setIsModalOpen(true);
  };

  const handleModalSuccess = () => {
    loadCafes();
  };

  const handleLogout = async () => {
    await logout();
    navigate('/isletme-girisi');
  };

  if (loading) {
    return (
      <div className="site-shell" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <p>Yükleniyor...</p>
      </div>
    );
  }

  return (
    <div className="site-shell">
      <header className="topbar">
        <Link className="brand" to="/" aria-label="Kahve Keşfi ana sayfa">
          <span className="brand-mark">☕</span>
          <span>
            <strong>Kahve</strong>
            <small>KEŞFİ</small>
          </span>
        </Link>
        <nav className="nav-links">
          <Link to="/kafelerim" className="active">
            Kafelerim
          </Link>
          <Link to="/">Keşfet (Müşteri Girişi)</Link>
        </nav>
        <div className="header-actions">
          {owner ? (
            <button className="profile-chip" type="button" onClick={handleLogout} title={`${owner.email} - Çıkış Yap`}>
              <span>{owner.name ? owner.name.slice(0, 2).toUpperCase() : 'İŞ'}</span>
              <small>
                {owner.name} ({owner.email})
                <br />
                Çıkış Yap
              </small>
            </button>
          ) : (
            <Link to="/isletme-girisi" className="outline-button" style={{ color: '#fff', borderColor: 'rgba(255,255,255,0.3)' }}>
              Giriş Yap
            </Link>
          )}
        </div>
      </header>

      <main style={{ padding: '2rem 1rem', maxWidth: '1200px', margin: '0 auto', minHeight: '80vh' }}>
        <section className="favorites-page" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="section-heading" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <p className="eyebrow">İşletme Sahibi Paneli ({owner?.email})</p>
              <h1>Kafelerim</h1>
            </div>
            <button className="primary-button" type="button" onClick={handleOpenAddModal}>
              + Yeni Kafe Ekle
            </button>
          </div>

          {error && (
            <div className="state-box error-box">
              <strong>Hata oluştu.</strong>
              <span>{error}</span>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', marginTop: '1rem' }}>
                <button type="button" onClick={loadCafes}>Tekrar Dene</button>
                <button type="button" onClick={() => navigate('/isletme-girisi')} style={{ background: '#666' }}>
                  Giriş Sayfasına Git
                </button>
              </div>
            </div>
          )}

          {cafesLoading ? (
            <div className="loading-grid">
              {[1, 2, 3].map((item) => (
                <div className="skeleton-card" key={item} />
              ))}
            </div>
          ) : cafes.length === 0 ? (
            <div className="state-box">
              <strong>{owner?.email} hesabına tanımlı henüz eklenmiş bir kafe bulunmuyor.</strong>
              <span>Aşağıdaki butona tıklayarak ilk kafenizi hemen ekleyin.</span>
              <button type="button" onClick={handleOpenAddModal} style={{ marginTop: '1rem' }}>
                + Yeni Kafe Ekle
              </button>
            </div>
          ) : (
            <div className="cafe-grid">
              {cafes.map((cafe, index) => (
                <article className="cafe-card" key={cafe.isletme_id}>
                  <div className="card-image-wrap">
                    <img
                      src={cafe.gallery_image || cafe.cover_image || fallbackImages[index % fallbackImages.length]}
                      alt={cafe.name || cafe.ad}
                    />
                  </div>
                  <div className="card-content" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div className="card-title-row">
                      <h3>{cafe.name || cafe.ad}</h3>
                    </div>
                    {cafe.aciklama && (
                      <p className="detail-source" style={{ color: '#555', fontSize: '0.88rem' }}>
                        {cafe.aciklama}
                      </p>
                    )}
                    <p className="address">⌖ {cafe.adres}</p>
                    <p className="detail-source">
                      {cafe.il} {cafe.ilce ? `/ ${cafe.ilce}` : ''}
                    </p>
                    <div style={{ marginTop: 'auto', paddingTop: '0.75rem' }}>
                      <button
                        className="outline-button"
                        type="button"
                        onClick={() => handleOpenEditModal(cafe)}
                        style={{ width: '100%', cursor: 'pointer', textAlign: 'center' }}
                      >
                        ✏️ Güncelle
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>

      <KafeFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        cafeToEdit={editingCafe}
        onSuccess={handleModalSuccess}
      />

      <footer id="hakkimizda">
        <div>
          <span className="brand-mark small">☕</span> <strong>Kahve Keşfi</strong> — İşletme Sahibi Portalı
        </div>
      </footer>
    </div>
  );
}
