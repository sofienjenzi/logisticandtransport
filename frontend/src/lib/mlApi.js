/** Coerces every numeric-looking form value to a Number, same rule the original vanilla-JS
 * formToJson() used (including select values like "0"/"1" for booleans) — the field's declared
 * `type` doesn't matter here, only whether the string parses as a finite number. */
export function buildPayload(values) {
  const out = {};
  for (const [key, value] of Object.entries(values)) {
    const maybe = Number(value);
    out[key] = value !== '' && Number.isFinite(maybe) ? maybe : value;
  }
  return out;
}

export async function postJson(url, payload) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Erreur API ${response.status}: ${text.slice(0, 100)}`);
  }
  return response.json();
}

export async function getJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Erreur API ${response.status}`);
  return response.json();
}
