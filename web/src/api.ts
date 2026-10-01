export async function api<T>(ruta: string, cuerpo?: unknown): Promise<T> {
  const r = await fetch(ruta, cuerpo === undefined ? {} : {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(cuerpo),
  });
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error ?? r.statusText);
  return r.json();
}
