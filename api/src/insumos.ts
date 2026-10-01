import type { Insumo } from './tipos.ts';

// Catálogo de la hoja «Control de consumos de cirugía» (research/Control_consumos_cirugia.md), sin repetidos.
// La siembra lo copia a la tabla insumo de cada clínica; cada clínica puede ajustar sus nombres.
const nombres = (categoria: Insumo['categoria'], lista: string[]): Insumo[] => lista.map(nombre => ({ nombre, categoria }));

export const INSUMOS: Insumo[] = [
  ...nombres('general', [
    'Aguja desechable', 'Air strip', 'Apósito', 'Barticgras', 'Cabestrillo', 'Cotonoides', 'Equipo cistoflo',
    'Equipo cistoirrig', 'Equipo de venoclisis', 'Férula nasal', 'Gasitas', 'Guantes, par', 'Hemostático absorbible',
    'Hoja de bisturí', 'Inmovilizador', 'Jeringa aséptica', 'Jeringa desechable', 'Liner', 'Cuchilla de rasuradora',
    'Mechas', 'Medias', 'Op site', 'Placa de electro', 'Sonda alimentación', 'Sonda Foley', 'Sonda nasogástrica',
    'Sonda Nelaton', 'Steri strip', 'Tapón nasal', 'Tubo de tórax', 'Venda algodón', 'Venda de yeso', 'Venda elástica',
    'Hemovac-Exovac', 'Hemoclip amarillo', 'Hemoclip azul', 'Hem-o-lok', 'Ligaclip LT 300', 'Paquete artroscopia',
    'Paquete desechable',
  ]),
  ...nombres('sutura', [
    'Catgut cromado', 'Catgut simple', 'Caprofyl', 'Cera ósea', 'Ethibond', 'Monocryl', 'Nurolon', 'PDS', 'Polysorb',
    'Prolene', 'Polipropileno', 'Seda', 'Sofsilk', 'Surgipro', 'Vicryl', 'Nylon', 'Surgicel', 'Ticron',
  ]),
  ...nombres('otro', [
    'Dren', 'Artromatic', 'Reservorio', 'Fixomull', 'Ioban', 'Jelco', 'Durapred', 'SSN 0,9 %', 'Agua oxigenada', 'Afrin',
    'Bupirop', 'Asfromatic', 'Xilocaína', 'Udrape', 'Kit traqueostomía', 'Merocel',
  ]),
  ...nombres('equipo', [
    'Detector de ganglio centinela', 'Fibrobroncoscopio', 'Mediastinoscopio', 'Ellman', 'Histeroscopio', 'Morcelador',
    'Versapoint', 'Video ligadura de trompas', 'Video histerectomía', 'Instrumental de artroscopia',
    'Intensificador de imagen', 'Motor de ortopedia', 'Shaver', 'Video artroscopia', 'Microscopio', 'Motor de neuro',
    'Motor de oído', 'Equipo de urología', 'Litoclast', 'Calentador de fluidos', 'Instrumental de laparoscopia',
    'Sistema de compresión dinámica', 'Video laparoscopia diagnóstica', 'Video laparoscopia operatoria', 'Video solo',
  ]),
];
