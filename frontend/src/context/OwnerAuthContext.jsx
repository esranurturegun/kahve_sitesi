import { createContext, useContext, useEffect, useState } from 'react';

const OwnerAuthContext = createContext(null);

export async function safeParseJson(response) {
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return await response.json();
  }
  const text = await response.text();
  if (!response.ok) {
    if (response.status === 502 || response.status === 503 || response.status === 504) {
      throw new Error('Backend sunucusu (http://localhost:3000) veya veritabanı aktif değil. Lütfen backend sunucunuzun ve MySQL servisinizin çalıştığından emin olun.');
    }
    const preMatch = text.match(/<pre>(.*?)<\/pre>/s);
    const cleanMessage = preMatch
      ? preMatch[1].replace(/<[^>]+>/g, '').trim()
      : text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    throw new Error(`Sunucu hatası (${response.status}): ${cleanMessage.slice(0, 150)}`);
  }
  throw new Error('Sunucudan geçersiz yanıt alındı.');
}

export function OwnerAuthProvider({ children }) {
  const [owner, setOwner] = useState(null);
  const [loading, setLoading] = useState(true);

  const getOwnerToken = () =>
    localStorage.getItem('isletme_owner_token') ||
    localStorage.getItem('kahve-owner-token') ||
    localStorage.getItem('owner-token');

  const setOwnerTokens = (token) => {
    if (token) {
      localStorage.setItem('isletme_owner_token', token);
      localStorage.setItem('kahve-owner-token', token);
      localStorage.setItem('owner-token', token);
    } else {
      localStorage.removeItem('isletme_owner_token');
      localStorage.removeItem('kahve-owner-token');
      localStorage.removeItem('owner-token');
    }
  };

  useEffect(() => {
    async function loadOwner() {
      const token = getOwnerToken();
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch('/api/owner/auth/me', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await safeParseJson(response);
          setOwner(data.user);
        } else {
          setOwnerTokens(null);
          setOwner(null);
        }
      } catch (err) {
        console.error('Owner auth check failed:', err);
      } finally {
        setLoading(false);
      }
    }

    loadOwner();
  }, []);

  const login = async (email, password) => {
    const response = await fetch('/api/owner/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await safeParseJson(response);
    if (!response.ok) {
      throw new Error(data.error || 'Giriş yapılamadı.');
    }

    setOwnerTokens(data.token);
    setOwner(data.user);
    return data.user;
  };

  const register = async (name, email, password) => {
    const response = await fetch('/api/owner/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });

    const data = await safeParseJson(response);
    if (!response.ok) {
      throw new Error(data.error || 'Kayıt yapılamadı.');
    }

    setOwnerTokens(data.token);
    setOwner(data.user);
    return data.user;
  };

  const logout = async () => {
    const token = getOwnerToken();
    if (token) {
      try {
        await fetch('/api/owner/auth/logout', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      } catch (err) {
        console.error('Owner logout error:', err);
      }
    }
    setOwnerTokens(null);
    setOwner(null);
  };

  const ownerApiFetch = async (url, options = {}) => {
    const token = getOwnerToken();
    const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
    const headers = {
      ...(options.body && !isFormData ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    };
    return fetch(url, { ...options, headers });
  };

  return (
    <OwnerAuthContext.Provider
      value={{
        owner,
        loading,
        login,
        register,
        logout,
        ownerApiFetch,
        token: getOwnerToken(),
      }}
    >
      {children}
    </OwnerAuthContext.Provider>
  );
}

export function useOwnerAuth() {
  const context = useContext(OwnerAuthContext);
  if (!context) {
    throw new Error('useOwnerAuth must be used within an OwnerAuthProvider');
  }
  return context;
}
