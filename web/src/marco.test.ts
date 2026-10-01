import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { EstadoCirugia, HoraId } from '../../api/src/tipos.ts';
import { alergiaVisible, cierreSeguro, formatearMinutos, nuevaCritica, proximaHora, tramoMinutos } from './marco.ts';

function mockEstado(extra: Partial<EstadoCirugia> = {}): EstadoCirugia {
  return {
    cirugia: {
      id: '1', quirofano: 'QX 01', fecha_programada: '2026-10-01T12:00:00Z',
      paciente: { nombre: 'Paciente 1', tipo_doc: 'CC', num_doc: '123', edad: 50, eps: 'EPS 1', hc: '001' },
      procedimiento: 'Cirugía', diagnostico: 'Diag', lateralidad: 'No aplica',
      equipo_programado: {}, datos_preop: {},
    },
    protocolo: {
      especialidad: 'General', campos_preop: [], fases: [], materiales: [],
      hitos: [], mediciones: [], duraciones: [],
    },
    horas: {}, presentes: [], checks: {}, fase_actual: null, conteo: {},
    datos: {}, novedades: [], duraciones: [], alertas: [], acciones_conteo: [],
    consumo: [], insumos: [], instrumentos: [], eventos: [],
    ...extra,
  };
}

test('nuevaCritica: detecta cuándo aparece una alerta crítica abierta nueva', () => {
  const sinAlertas = mockEstado();
  const conCritica = mockEstado({
    alertas: [{ id: 'crit:1', severidad: 'critica', estado: 'abierta', mensaje: 'Falta antibiótico', desde: '2026-10-01T12:00:00Z', hasta: null, motivo: null }],
  });
  const conAdvertencia = mockEstado({
    alertas: [{ id: 'adv:1', severidad: 'advertencia', estado: 'abierta', mensaje: 'Falta sangre', desde: '2026-10-01T12:00:00Z', hasta: null, motivo: null }],
  });
  const resuelta = mockEstado({
    alertas: [{ id: 'crit:1', severidad: 'critica', estado: 'resuelta', mensaje: 'Falta antibiótico', desde: '2026-10-01T12:00:00Z', hasta: '2026-10-01T12:10:00Z', motivo: null }],
  });

  // Al inicio (antes = null) no se considera evento nuevo
  assert.equal(nuevaCritica(null, sinAlertas), false);
  assert.equal(nuevaCritica(null, conCritica), false);

  // Aparece una alerta crítica que antes no estaba
  assert.equal(nuevaCritica(sinAlertas, conCritica), true);

  // Ya estaba abierta
  assert.equal(nuevaCritica(conCritica, conCritica), false);

  // Alerta de advertencia no cuenta como crítica
  assert.equal(nuevaCritica(sinAlertas, conAdvertencia), false);

  // Alerta que estaba resuelta y se reabre
  assert.equal(nuevaCritica(resuelta, conCritica), true);
});

test('cierreSeguro: true solo cuando hay salida a recuperación y ninguna alerta abierta', () => {
  assert.equal(cierreSeguro(mockEstado()), false);

  // Con salida pero con alerta abierta
  const conAlerta = mockEstado({
    horas: { salida_recuperacion: '2026-10-01T14:00:00Z' },
    alertas: [{ id: 'a1', severidad: 'advertencia', estado: 'abierta', mensaje: 'x', desde: '', hasta: null, motivo: null }],
  });
  assert.equal(cierreSeguro(conAlerta), false);

  // Con salida y alerta resuelta o cerrada
  const seguro = mockEstado({
    horas: { salida_recuperacion: '2026-10-01T14:00:00Z' },
    alertas: [{ id: 'a1', severidad: 'advertencia', estado: 'resuelta', mensaje: 'x', desde: '', hasta: '', motivo: null }],
  });
  assert.equal(cierreSeguro(seguro), true);

  // Con salida y sin alertas
  assert.equal(cierreSeguro(mockEstado({ horas: { salida_recuperacion: '2026-10-01T14:00:00Z' } })), true);
});

test('alergiaVisible: identifica si hay una alergia reportada y le da formato', () => {
  assert.equal(alergiaVisible(''), null);
  assert.equal(alergiaVisible(null), null);
  assert.equal(alergiaVisible('ninguna'), null);
  assert.equal(alergiaVisible('Ninguna'), null);
  assert.equal(alergiaVisible('niega'), null);
  assert.equal(alergiaVisible('Penicilina'), 'Alergia a penicilina');
  assert.equal(alergiaVisible('Alergia a penicilina'), 'Alergia a penicilina');
  assert.equal(alergiaVisible('Látex y yodo'), 'Alergia a látex y yodo');
});

test('proximaHora: determina la siguiente hora sin registrar', () => {
  assert.equal(proximaHora({}), 'ingreso');
  assert.equal(proximaHora({ ingreso: '12:00' }), 'anestesia');
  assert.equal(proximaHora({ ingreso: '12:00', anestesia: '12:15' }), 'inicio_cirugia');
  assert.equal(proximaHora({ ingreso: '12:00', anestesia: '12:15', inicio_cirugia: '12:30', fin_cirugia: '14:00', salida_recuperacion: '14:15' }), null);
});

test('tramoMinutos y formatearMinutos: calcula y formatea tiempos', () => {
  const t0 = new Date(Date.UTC(2026, 9, 1, 12, 0)).toISOString();
  const t1 = new Date(Date.UTC(2026, 9, 1, 12, 15)).toISOString();
  const ahora = Date.UTC(2026, 9, 1, 12, 25);

  assert.equal(tramoMinutos(t0, t1, ahora), 15);
  assert.equal(tramoMinutos(t0, undefined, ahora), 25);
  assert.equal(tramoMinutos(undefined, undefined, ahora), null);

  assert.equal(formatearMinutos(null), '');
  assert.equal(formatearMinutos(5), '5 min');
  assert.equal(formatearMinutos(60), '1 h');
  assert.equal(formatearMinutos(85), '1 h 25 min');
});
