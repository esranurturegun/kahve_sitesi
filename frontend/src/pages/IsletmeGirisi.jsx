import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useOwnerAuth } from '../context/OwnerAuthContext';
import '../App.css';

export function IsletmeGirisi() {
  const { owner, login, register, loading } = useOwnerAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState('login'); // 'login' or 'register'
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (owner && !loading) {
      navigate('/kafelerim');
    }
  }, [owner, loading, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      if (mode === 'login') {
        await login(form.email, form.password);
      } else {
        if (!form.name.trim()) {
          throw new Error('İşletme sahibi adı zorunludur.');
        }
        await register(form.name, form.email, form.password);
      }
      navigate('/kafelerim');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
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
          <Link to="/">Keşfet (Müşteri Girişi)</Link>
        </nav>
      </header>

      <main style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem' }}>
        <div className="auth-panel" style={{ width: '100%', maxWidth: '440px', position: 'static' }}>
          <p className="eyebrow">İşletme Sahibi Paneli</p>
          <h2>{mode === 'login' ? 'İşletme Girişi' : 'İşletme Hesabı Oluştur'}</h2>
          <p className="auth-copy">
            {mode === 'login'
              ? 'Kafelerinizi yönetmek için işletme sahibi hesabınızla giriş yapın.'
              : 'Kafelerinizi sergilemek ve yönetmek için işletme sahibi olarak kayıt olun.'}
          </p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem', marginTop: '1.2rem' }}>
            {mode === 'register' && (
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Adınız veya İşletme Adınız"
                aria-label="İşletme sahibi ismi"
                required
              />
            )}
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="E-posta adresiniz"
              aria-label="E-posta"
              required
            />
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="Şifreniz (en az 6 karakter)"
              aria-label="Şifre"
              minLength={6}
              required
            />

            {error && <p className="auth-error">{error}</p>}

            <button className="primary-button auth-submit" type="submit" disabled={submitting}>
              {submitting ? 'İşleniyor...' : mode === 'login' ? 'Giriş Yap' : 'Kayıt Ol'} <span>→</span>
            </button>

            <button
              className="auth-switch"
              type="button"
              onClick={() => {
                setMode(mode === 'login' ? 'register' : 'login');
                setError('');
              }}
            >
              {mode === 'login' ? 'Hesabınız yok mu? İşletme Sahibi Olarak Kayıt Olun' : 'Zaten hesabınız var mı? Giriş Yapın'}
            </button>
          </form>

          <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #eee', textAlign: 'center' }}>
            <Link to="/" style={{ color: '#666', fontSize: '0.85rem', textDecoration: 'none' }}>
              ← Müşteri Ana Sayfasına Dön
            </Link>
          </div>
        </div>
      </main>

      <footer id="hakkimizda">
        <div>
          <span className="brand-mark small">☕</span> <strong>Kahve Keşfi</strong> — İşletme Sahibi Portalı
        </div>
      </footer>
    </div>
  );
}

