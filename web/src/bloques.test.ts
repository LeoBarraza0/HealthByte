/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { EstadoCirugia, Insumo } from '../../api/src/tipos.ts';
import { pendientes, verificados, pasosConteo, buscarInsumos } from './bloques.ts';

function crearEstadoBase(): EstadoCirugia {
  return {
    cirugia: {
      id: 'c1',
      quirofano: 'Quirófano 1',
      fecha_programada: '2026-10-01',
      paciente: { nombre: 'Rosa Elena Martínez', tipo_doc: 'CC', num_doc: '41728305', edad: 58, eps: 'Demo A', hc: '0001' },
      procedimiento: 'Revascularización miocárdica',
      diagnostico: 'Enfermedad coronaria',
      lateralidad: 'no aplica',
      equipo_programado: {
        cirujano: { id: 'u1', nombre: 'Paola Herrera' },
        anestesiologo: { id: 'u2', nombre: 'Jorge Ortiz' },
      },
      datos_preop: {},
    },
    protocolo: {
      especialidad: 'Cardiovascular',
      campos_preop: [],
      fases: [
        {
          id: 'antes_incision',
          nombre: 'Antes de la incisión',
          abre_con: 'anestesia',
          cierra_antes_de: 'inicio_cirugia',
          items: [
            { id: 'confirma_paciente', texto: 'Confirmación del paciente', rol: 'cirujano' },
            { id: 'riesgos', texto: 'Riesgos previstos', rol: 'cirujano' },
            { id: 'antibiotico', texto: 'Antibiótico profiláctico', rol: 'anestesiologo', critico: true },
          ],
        },
      ],
      materiales: ['Compresas', 'Gasas'],
      hitos: ['Heparina', 'Entrada a bomba'],
      mediciones: [],
      duraciones: [],
    },
    horas: { anestesia: '2026-10-01T11:35:00Z' },
    presentes: ['u1'],
    checks: {
      'antes_incision.confirma_paciente': { valor: 'si', ts: '2026-10-01T11:41:00Z', rol: 'cirujano' },
    },
    fase_actual: 'antes_incision',
    conteo: {
      Compresas: { entra: 10, sale: 9 },
      Gasas: { entra: 20, sale: 20 },
    },
    datos: {},
    novedades: [],
    duraciones: [],
    alertas: [
      { id: 'conteo:Compresas', severidad: 'critica', mensaje: 'Compresas: entraron 10, salieron 9', estado: 'abierta', desde: '2026-10-01T14:40:00Z', hasta: null, motivo: null },
    ],
    acciones_conteo: [
      { accion: 'cirujano_avisado', ts: '2026-10-01T14:56:00Z' },
    ],
    consumo: [],
    insumos: [
      { nombre: 'Hoja de bisturí #11', categoria: 'general' },
      { nombre: 'Sonda Foley 16 Fr', categoria: 'equipo' },
      { nombre: 'Sonda nasogástrica', categoria: 'equipo' },
      { nombre: 'Prolene 3-0', categoria: 'sutura' },
    ],
    instrumentos: [],
    eventos: [],
  };
}

test('pendientes devuelve los ítems no verificados, críticos primero', () => {
  const estado = crearEstadoBase();
  const res = pendientes(estado, 'antes_incision');
  assert.equal(res.length, 2);
  // Crítico primero
  assert.equal(res[0].id, 'antibiotico');
  assert.equal(res[0].critico, true);
  assert.equal(res[1].id, 'riesgos');
});

test('verificados devuelve solo los ítems con check verificado', () => {
  const estado = crearEstadoBase();
  const res = verificados(estado, 'antes_incision');
  assert.equal(res.length, 1);
  assert.equal(res[0].id, 'confirma_paciente');
});

test('pasosConteo reporta los 3 pasos con su estado y hora', () => {
  const estado = crearEstadoBase();
  const pasos = pasosConteo(estado);
  assert.equal(pasos.length, 3);
  assert.equal(pasos[0].accion, 'cirujano_avisado');
  assert.equal(pasos[0].hecho, true);
  assert.equal(pasos[0].ts, '2026-10-01T14:56:00Z');
  assert.equal(pasos[1].accion, 'busqueda_en_campo');
  assert.equal(pasos[1].hecho, false);
  assert.equal(pasos[2].accion, 'rx_solicitada');
  assert.equal(pasos[2].hecho, false);
});

test('buscarInsumos ignora mayúsculas y tildes, y filtra por categoría', () => {
  const insumos: Insumo[] = [
    { nombre: 'Hoja de bisturí #11', categoria: 'general' },
    { nombre: 'Sonda Foley 16 Fr', categoria: 'equipo' },
    { nombre: 'Sonda nasogástrica', categoria: 'equipo' },
    { nombre: 'Prolene 3-0', categoria: 'sutura' },
  ];
  // bisturi sin tilde encuentra 'Hoja de bisturí #11'
  const resBisturi = buscarInsumos(insumos, 'bisturi', 'Todos');
  assert.equal(resBisturi.length, 1);
  assert.equal(resBisturi[0].nombre, 'Hoja de bisturí #11');

  // Filtro por categoría 'equipos'
  const resEquipos = buscarInsumos(insumos, 'sonda', 'Equipos');
  assert.equal(resEquipos.length, 2);

  // Filtro por categoría 'suturas'
  const resSuturas = buscarInsumos(insumos, '', 'Suturas');
  assert.equal(resSuturas.length, 1);
  assert.equal(resSuturas[0].nombre, 'Prolene 3-0');
});
