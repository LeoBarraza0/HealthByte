import { test } from 'node:test';
import assert from 'node:assert/strict';
import { csv, csvConsumo } from './gestion.ts';
import type { EstadoCirugia } from '../../api/src/tipos.ts';

test('csv separa con punto y coma, pone comillas cuando hace falta y empieza con BOM para Excel', () => {
  assert.equal(csv([['Insumo', 'Cantidad'], ['Guantes, par', 8], ['Dice "hola"; adiós', 1]]),
    '﻿Insumo;Cantidad\r\nGuantes, par;8\r\n"Dice ""hola""; adiós";1');
});

test('csvConsumo pone los datos de la cirugía y una fila por línea de consumo', () => {
  const estado = {
    cirugia: { quirofano: 'Quirófano 1', fecha_programada: '2026-10-01T16:00:00.000Z', procedimiento: 'Revascularización miocárdica', paciente: { nombre: 'Rosa Elena Martínez' } },
    consumo: [{ insumo: 'Guantes, par', cantidad: 8, del_conteo: false }, { insumo: 'Compresas', cantidad: 10, del_conteo: true }],
  } as unknown as EstadoCirugia;
  const lineas = csvConsumo(estado).replace('﻿', '').split('\r\n');
  assert.deepEqual(lineas.slice(0, 2), ['Paciente;Rosa Elena Martínez', 'Procedimiento;Revascularización miocárdica']);
  assert.ok(lineas.includes('Insumo;Cantidad;Origen'));
  assert.ok(lineas.includes('Guantes, par;8;Registrado'));
  assert.ok(lineas.includes('Compresas;10;Del conteo'));
});
