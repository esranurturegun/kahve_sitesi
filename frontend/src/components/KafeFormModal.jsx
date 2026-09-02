import { useEffect, useState } from 'react';
import { useOwnerAuth, safeParseJson } from '../context/OwnerAuthContext';

export function KafeFormModal({ isOpen, onClose, cafeToEdit, onSuccess }) {
  const { ownerApiFetch } = useOwnerAuth();
  const [form, setForm] = useState({
    ad: '',
    aciklama: '',
    adres: '',
    il: 'Kocaeli',
    ilce: 'Darıca',
    enlem: '40.7654',
    boylam: '29.9408',
  });
  const [existingImages, setExistingImages] = useState([]);
  const [newFiles, setNewFiles] = useState([]);
  const [newPreviews, setNewPreviews] = useState([]);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isEditing = Boolean(cafeToEdit && cafeToEdit.isletme_id);

  const loadExistingImages = async (isletmeId) => {
    try {
      const response = await ownerApiFetch(`/api/owner/isletmeler/${isletmeId}/resimler`);
      if (response.ok) {
        const data = await safeParseJson(response);
        setExistingImages(data || []);
      }
    } catch (err) {
      console.error('Fotoğraflar yüklenemedi:', err);
    }
  };

  useEffect(() => {
    if (cafeToEdit) {
      setForm({
        ad: cafeToEdit.name || cafeToEdit.ad || '',
        aciklama: cafeToEdit.aciklama || '',
        adres: cafeToEdit.adres || '',
        il: cafeToEdit.il || 'Kocaeli',
        ilce: cafeToEdit.ilce || 'Darıca',
        enlem: cafeToEdit.enlem !== undefined && cafeToEdit.enlem !== null ? String(cafeToEdit.enlem) : '40.7654',
        boylam: cafeToEdit.boylam !== undefined && cafeToEdit.boylam !== null ? String(cafeToEdit.boylam) : '29.9408',
      });
      loadExistingImages(cafeToEdit.isletme_id);
    } else {
      setForm({
        ad: '',
        aciklama: '',
        adres: '',
        il: 'Kocaeli',
        ilce: 'Darıca',
        enlem: '40.7654',
        boylam: '29.9408',
      });
      setExistingImages([]);
    }
    setNewFiles([]);
    setNewPreviews([]);
    setError('');
  }, [cafeToEdit, isOpen]);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    const validFiles = [];
    const previews = [];

    for (const file of files) {
      if (file.size > 5 * 1024 * 1024) {
        setError(`"${file.name}" dosya boyutu 5MB sınırını aşıyor.`);
        return;
      }
      validFiles.push(file);
      previews.push(URL.createObjectURL(file));
    }

    setNewFiles((prev) => [...prev, ...validFiles]);
    setNewPreviews((prev) => [...prev, ...previews]);
    setError('');
  };

  const handleRemoveNewFile = (index) => {
    setNewFiles((prev) => prev.filter((_, i) => i !== index));
    setNewPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDeleteExistingImage = async (resimId) => {
    if (!cafeToEdit?.isletme_id) return;
    try {
      const response = await ownerApiFetch(`/api/owner/isletmeler/${cafeToEdit.isletme_id}/resimler/${resimId}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        setExistingImages((prev) => prev.filter((img) => img.id !== resimId));
      } else {
        const data = await safeParseJson(response);
        setError(data.error || 'Resim silinemedi.');
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    const payload = {
      ad: form.ad.trim(),
      name: form.ad.trim(),
      aciklama: form.aciklama.trim() || null,
      adres: form.adres.trim(),
      il: form.il.trim(),
      ilce: form.ilce.trim() || null,
      enlem: Number(form.enlem),
      boylam: Number(form.boylam),
    };

    if (!payload.ad || !payload.adres || !payload.il || isNaN(payload.enlem) || isNaN(payload.boylam)) {
      setError('Lütfen zorunlu alanları (işletme adı, adres, il, enlem, boylam) geçerli değerlerle doldurun.');
      setSubmitting(false);
      return;
    }

    try {
      const url = isEditing
        ? `/api/owner/isletmeler/${cafeToEdit.isletme_id}`
        : '/api/owner/isletmeler';
      const method = isEditing ? 'PUT' : 'POST';

      const response = await ownerApiFetch(url, {
        method,
        body: JSON.stringify(payload),
      });

      const data = await safeParseJson(response);
      if (!response.ok) {
        throw new Error(data.error || 'İşlem gerçekleştirilemedi.');
      }

      const isletmeId = data.isletme_id || cafeToEdit?.isletme_id;

      // Upload new image files if selected
      if (isletmeId && newFiles.length > 0) {
        const formData = new FormData();
        for (const file of newFiles) {
          formData.append('resimler', file);
        }

        const uploadResponse = await ownerApiFetch(`/api/owner/isletmeler/${isletmeId}/resimler`, {
          method: 'POST',
          body: formData,
        });

        if (!uploadResponse.ok) {
          const uploadError = await safeParseJson(uploadResponse);
          console.warn('Fotoğraf yükleme uyarısı:', uploadError);
        }
      }

      onSuccess(data);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="auth-backdrop"
      role="presentation"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{ zIndex: 2000 }}
    >
      <form
        className="auth-panel"
        onSubmit={handleSubmit}
        style={{ maxWidth: '640px', width: '90%', padding: '2rem' }}
      >
        <button
          className="auth-close"
          type="button"
          onClick={onClose}
          aria-label="Pencereyi kapat"
        >
          ×
        </button>

        <p className="eyebrow">İşletme Sahibi Paneli</p>
        <h2>{isEditing ? 'Kafe Bilgilerini Güncelle' : 'Yeni Kafe Ekle'}</h2>
        <p className="auth-copy">
          {isEditing
            ? 'Mevcut kafe bilgilerinizi ve fotoğraflarınızı düzenleyin.'
            : 'İşletmenizi platforma eklemek için aşağıdaki alanları doldurun.'}
        </p>

        <div style={{ display: 'grid', gap: '0.9rem', marginTop: '1rem' }}>
          <div>
            <label style={{ fontSize: '0.85rem', fontWeight: 'bold', display: 'block', marginBottom: '0.25rem' }}>
              İşletme Adı *
            </label>
            <input
              type="text"
              value={form.ad}
              onChange={(e) => setForm({ ...form, ad: e.target.value })}
              placeholder="Örn: Espresso Lab"
              required
            />
          </div>

          <div>
            <label style={{ fontSize: '0.85rem', fontWeight: 'bold', display: 'block', marginBottom: '0.25rem' }}>
              Açıklama
            </label>
            <textarea
              value={form.aciklama}
              onChange={(e) => setForm({ ...form, aciklama: e.target.value })}
              placeholder="Kafe hakkında kısa bilgi..."
              rows={3}
              style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #ddd', fontFamily: 'inherit' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.85rem', fontWeight: 'bold', display: 'block', marginBottom: '0.25rem' }}>
              Adres *
            </label>
            <input
              type="text"
              value={form.adres}
              onChange={(e) => setForm({ ...form, adres: e.target.value })}
              placeholder="Örn: Bağdat Cad. No:12"
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: 'bold', display: 'block', marginBottom: '0.25rem' }}>
                İl *
              </label>
              <input
                type="text"
                value={form.il}
                onChange={(e) => setForm({ ...form, il: e.target.value })}
                placeholder="İl"
                required
              />
            </div>
            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: 'bold', display: 'block', marginBottom: '0.25rem' }}>
                İlçe
              </label>
              <input
                type="text"
                value={form.ilce}
                onChange={(e) => setForm({ ...form, ilce: e.target.value })}
                placeholder="İlçe"
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: 'bold', display: 'block', marginBottom: '0.25rem' }}>
                Enlem (Latitude) *
              </label>
              <input
                type="number"
                step="any"
                value={form.enlem}
                onChange={(e) => setForm({ ...form, enlem: e.target.value })}
                placeholder="40.7654"
                required
              />
            </div>
            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: 'bold', display: 'block', marginBottom: '0.25rem' }}>
                Boylam (Longitude) *
              </label>
              <input
                type="number"
                step="any"
                value={form.boylam}
                onChange={(e) => setForm({ ...form, boylam: e.target.value })}
                placeholder="29.9408"
                required
              />
            </div>
          </div>

          {/* FOTOĞRAF YÜKLEME ALANI */}
          <div style={{ marginTop: '0.5rem', padding: '1rem', border: '1px dashed #c8aea0', borderRadius: '8px', background: '#faf5f0' }}>
            <label style={{ fontSize: '0.88rem', fontWeight: 'bold', display: 'block', marginBottom: '0.5rem', color: '#59392b' }}>
              📷 Kafe Fotoğrafları Ekle (İsteğe Bağlı)
            </label>
            <input
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
              style={{ width: '100%', fontSize: '0.85rem', cursor: 'pointer' }}
            />
            <small style={{ color: '#888', display: 'block', marginTop: '0.3rem', fontSize: '0.75rem' }}>
              Birden fazla resim seçebilirsiniz (JPG, PNG, WEBP - Max 5MB).
            </small>

            {/* Yeni Seçilen Fotoğrafların Önizlemesi */}
            {newPreviews.length > 0 && (
              <div style={{ marginTop: '0.75rem' }}>
                <p style={{ fontSize: '0.78rem', fontWeight: 'bold', color: '#59392b', marginBottom: '0.4rem' }}>
                  Yüklenecek Yeni Fotoğraflar ({newPreviews.length}):
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: '0.5rem' }}>
                  {newPreviews.map((preview, index) => (
                    <div key={index} style={{ position: 'relative', width: '80px', height: '80px', borderRadius: '6px', overflow: 'hidden', border: '1px solid #ccc' }}>
                      <img src={preview} alt="Önizleme" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <button
                        type="button"
                        onClick={() => handleRemoveNewFile(index)}
                        style={{
                          position: 'absolute',
                          top: '2px',
                          right: '2px',
                          background: 'rgba(0,0,0,0.7)',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '50%',
                          width: '20px',
                          height: '20px',
                          fontSize: '12px',
                          cursor: 'pointer',
                          display: 'grid',
                          placeItems: 'center',
                        }}
                        title="Kaldır"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Mevcut Yüklenmiş Fotoğraflar Galerisi */}
            {isEditing && existingImages.length > 0 && (
              <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid #e0d0c4' }}>
                <p style={{ fontSize: '0.78rem', fontWeight: 'bold', color: '#59392b', marginBottom: '0.4rem' }}>
                  Yüklü Fotoğraflar ({existingImages.length}):
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: '0.5rem' }}>
                  {existingImages.map((img) => (
                    <div key={img.id} style={{ position: 'relative', borderRadius: '6px', overflow: 'hidden', border: '1px solid #ddd' }}>
                      <img
                        src={img.dosya_yolu}
                        alt="Yüklü Fotoğraf"
                        style={{ width: '100%', height: '80px', objectFit: 'cover', display: 'block' }}
                      />
                      <button
                        type="button"
                        onClick={() => handleDeleteExistingImage(img.id)}
                        style={{
                          width: '100%',
                          padding: '3px 0',
                          background: '#b75f45',
                          color: '#fff',
                          border: 'none',
                          fontSize: '0.72rem',
                          fontWeight: 'bold',
                          cursor: 'pointer',
                        }}
                      >
                        Sil
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {error && <p className="auth-error">{error}</p>}

          <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
            <button
              className="primary-button auth-submit"
              type="submit"
              disabled={submitting}
              style={{ flex: 1 }}
            >
              {submitting ? 'Kaydediliyor...' : isEditing ? 'Güncelle' : 'Kaydet'} <span>→</span>
            </button>
            <button
              className="outline-button"
              type="button"
              onClick={onClose}
              style={{ padding: '0.75rem 1.25rem' }}
            >
              İptal
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
