import type { DatosEvento, Decision, EstadoCirugia, HoraId } from './tipos.ts';
import type { PreguntarFn } from './jev.ts';
import { UMBRALES, construirPreguntas, describir, estadoParaJev } from './preguntas.ts';
import { numerosConContexto, primerNumero } from './numeros.ts';
import { seudonimizar } from './privacidad.ts';

export async function interpretar(frase: string, s: EstadoCirugia, hayPendiente: boolean, preguntar: PreguntarFn): Promise<Decision> {
  const segura = seudonimizar(frase, s.cirugia);
  const r = await preguntar(estadoParaJev(segura, s, hayPendiente), construirPreguntas(segura, s));
  const noul = (k: string) => { const x = r[k]; return x?.type === 'noul' ? x.noul : 0; };
  const elegir = (k: string) => { const x = r[k]; return x?.type === 'choice' ? x : undefined; };

  if (noul('dirigida') < UMBRALES.dirigida) return { accion: 'ignorar' };
  const intencion = elegir('intencion');
  if (!intencion || intencion.confidence < UMBRALES.minimo) return { accion: 'ignorar', no_entendido: true };

  const confianzas = [intencion.confidence];
  /** Traduce la opción «oN» al elemento N de `lista`, y anota su confianza. */
  const opcion = (k: string, lista: string[]): string | null => {
    const c = elegir(k);
    if (!c || c.choice === 'ninguno') return null;
    confianzas.push(c.confidence);
    return lista[Number(c.choice.slice(1))] ?? null;
  };

  const p = s.protocolo;
  const eventos: DatosEvento[] = [];
  switch (intencion.choice) {
    case 'nada':
      return { accion: 'ignorar' };
    case 'si':
    case 'no':
      return hayPendiente ? { accion: 'responder', si: intencion.choice === 'si' } : { accion: 'ignorar' };
    case 'deshacer':
      return { accion: 'deshacer' };
    case 'hora': {
      const h = elegir('hora');
      if (h && h.choice !== 'ninguno') { confianzas.push(h.confidence); eventos.push({ tipo: 'hora', hora: h.choice as HoraId }); }
      break;
    }
    case 'check': {
      const fase = p.fases.find(f => f.id === s.fase_actual);
      const valor = elegir('valor_check');
      if (valor) confianzas.push(valor.confidence);
      for (const item of fase?.items ?? []) {
        if (noul(`item_${item.id}`) >= UMBRALES.item) {
          eventos.push({ tipo: 'check', fase: fase!.id, item: item.id, valor: (valor?.choice ?? 'si') as 'si' | 'no' | 'na' });
        }
      }
      break;
    }
    case 'conteo': {
      const mov = elegir('movimiento');
      if (mov) confianzas.push(mov.confidence);
      const signo = mov?.choice === 'sale' ? -1 : 1;
      numerosConContexto(segura).forEach((n, i) => {
        const material = opcion(`material_${i}`, p.materiales);
        if (material) eventos.push({ tipo: 'conteo', material, cantidad: signo * n.valor });
      });
      break;
    }
    case 'hito': {
      const hito = opcion('hito', p.hitos);
      if (hito) eventos.push({ tipo: 'hito', hito });
      break;
    }
    case 'medicion': {
      const medicion = opcion('medicion', p.mediciones.map(m => m.id));
      const valor = primerNumero(segura);
      if (medicion && valor !== null) eventos.push({ tipo: 'medicion', medicion, valor });
      break;
    }
    case 'dato': {
      const campo = opcion('campo', p.campos_preop.filter(c => c.tipo === 'numero').map(c => c.id));
      const valor = primerNumero(segura);
      if (campo && valor !== null) eventos.push({ tipo: 'dato', campo, valor });
      break;
    }
    case 'novedad':
      eventos.push({ tipo: 'novedad', texto: segura });
      break;
    case 'novedad_atendida':
    case 'novedad_solucionada': {
      const n = s.novedades.findLast(x => x.estado !== 'solucionada');
      if (!n) break;
      eventos.push(intencion.choice === 'novedad_atendida'
        ? { tipo: 'novedad_atendida', novedad_id: n.id, responsable: segura }
        : { tipo: 'novedad_solucionada', novedad_id: n.id, acciones: segura });
      break;
    }
    case 'cerrar_alerta': {
      const alerta = opcion('alerta', s.alertas.filter(a => a.estado === 'abierta').map(a => a.id));
      if (alerta) eventos.push({ tipo: 'alerta_cierre', alerta, motivo: segura });
      break;
    }
  }

  if (!eventos.length) return { accion: 'ignorar', no_entendido: true };
  const confianza = Math.min(...confianzas);
  if (confianza < UMBRALES.minimo) return { accion: 'ignorar', no_entendido: true };
  return {
    accion: confianza >= UMBRALES.automatico ? 'registrar' : 'confirmar',
    eventos, confianza, resumen: eventos.map(e => describir(e, p)).join(' · '),
  };
}
