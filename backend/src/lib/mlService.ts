/** Header the ML service checks on every request (see ml-service/app/main.py).
 * Empty when ML_SERVICE_KEY isn't set, for setups that haven't added one yet. */
export function mlAuthHeaders(): Record<string, string> {
  const key = process.env.ML_SERVICE_KEY;
  return key ? { "X-Service-Key": key } : {};
}
