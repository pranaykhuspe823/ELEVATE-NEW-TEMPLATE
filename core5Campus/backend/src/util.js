export const str = (v, max = 500) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
export const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
export const isPhone = (v) => /^[+\d][\d\s-]{7,16}$/.test(v);
export const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
export const bad = (res, msg, code = 400) => res.status(code).json({ error: msg });
