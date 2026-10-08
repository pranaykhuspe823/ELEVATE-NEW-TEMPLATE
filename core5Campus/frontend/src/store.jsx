import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api, getToken, setToken } from './api.js';

const Ctx = createContext(null);
export const useStore = () => useContext(Ctx);

export function StoreProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(!getToken());
  const [catalog, setCatalog] = useState({ categories: [], loaded: false, error: '' });

  const loadCatalog = useCallback(() => {
    api('/catalog').then((d) => setCatalog({ ...d, loaded: true, error: '' }))
      .catch((e) => setCatalog((c) => ({ ...c, loaded: true, error: e.message })));
  }, []);

  useEffect(() => { loadCatalog(); }, [loadCatalog]);
  useEffect(() => {
    if (!getToken()) return;
    api('/auth/me').then((d) => setUser(d.user)).catch(() => setToken(null)).finally(() => setReady(true));
  }, []);

  const signIn = async (path, body) => {
    const d = await api(path, { method: 'POST', body });
    setToken(d.token); setUser(d.user); return d.user;
  };
  const value = {
    user, ready, catalog, loadCatalog, setUser,
    login: (body) => signIn('/auth/login', body),
    register: (body) => signIn('/auth/register', body),
    logout: () => { setToken(null); setUser(null); },
    published: catalog.categories.flatMap((c) => c.courses).filter((c) => c.status === 'published'),
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
