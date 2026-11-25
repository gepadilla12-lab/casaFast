const test = require('node:test');
const assert = require('node:assert/strict');
const {
  validBuyerDocuments,
  canAdvisorRecordFinancing,
  canAdvisorScheduleSigning,
  canAdvisorRecordSigningOutcome,
  validSigningOutcomeDate,
} = require('./server');

test('accepts buyer documents using the frontend nombre field', () => {
  const documentos = [
    {
      tipo: 'Identificación oficial',
      nombre: 'identificacion.pdf',
      data: 'data:application/pdf;base64,JVBERi0xLjQ=',
    },
    {
      tipo: 'Documento financiero',
      nombre: 'estado-de-cuenta.pdf',
      data: 'data:application/pdf;base64,JVBERi0xLjQ=',
    },
  ];

  assert.equal(validBuyerDocuments(documentos), true);
});

test('rejects buyer documents with unsupported file types', () => {
  const documentos = [
    {
      tipo: 'Identificación oficial',
      nombre: 'identificacion.txt',
      data: 'data:text/plain;base64,aGVsbG8=',
    },
    {
      tipo: 'Documento financiero',
      nombre: 'estado-de-cuenta.pdf',
      data: 'data:application/pdf;base64,JVBERi0xLjQ=',
    },
  ];

  assert.equal(validBuyerDocuments(documentos), false);
});

test('allows only the assigned advisor to record pending approved credit cases', () => {
  const tramite = {
    asesorId: 7,
    estado: 'Aprobado',
    metodoPago: 'Infonavit',
    estadoDocumentacion: 'Aprobado',
    estadoFinanciamiento: 'Pendiente',
  };

  assert.equal(canAdvisorRecordFinancing(tramite, 7), true);
  assert.equal(canAdvisorRecordFinancing(tramite, 8), false);
  assert.equal(canAdvisorRecordFinancing({ ...tramite, estadoDocumentacion: 'En Revisión' }, 7), false);
});

test('allows the assigned advisor to schedule signatures only after documents and financing are approved', () => {
  const cashTramite = {
    asesorId: 7,
    estado: 'Aprobado',
    metodoPago: 'Contado',
    estadoDocumentacion: 'Aprobado',
    estadoFinanciamiento: 'No requerido',
  };
  const creditTramite = {
    ...cashTramite,
    metodoPago: 'Infonavit',
    estadoFinanciamiento: 'Aprobado',
  };

  assert.equal(canAdvisorScheduleSigning(cashTramite, 7), true);
  assert.equal(canAdvisorScheduleSigning(creditTramite, 7), true);
  assert.equal(canAdvisorScheduleSigning(cashTramite, 8), false);
  assert.equal(canAdvisorScheduleSigning({ ...cashTramite, estadoDocumentacion: 'En Revisión' }, 7), false);
  assert.equal(canAdvisorScheduleSigning({ ...creditTramite, estadoFinanciamiento: 'Pendiente' }, 7), false);
  assert.equal(canAdvisorScheduleSigning({ ...creditTramite, estadoFinanciamiento: 'Rechazado' }, 7), false);
});

test('allows the assigned advisor to record the result of a scheduled signature', () => {
  const tramite = {
    asesorId: 7,
    estado: 'Aprobado',
    metodoPago: 'Contado',
    estadoDocumentacion: 'Aprobado',
    estadoFinanciamiento: 'No requerido',
    fechaFirma: '2020-01-01',
    estadoFirma: 'Pendiente',
  };

  assert.equal(canAdvisorRecordSigningOutcome(tramite, 7), true);
  assert.equal(canAdvisorRecordSigningOutcome(tramite, 8), false);
  assert.equal(canAdvisorRecordSigningOutcome({ ...tramite, fechaFirma: null }, 7), false);
  assert.equal(canAdvisorRecordSigningOutcome({ ...tramite, estadoFirma: 'Firmada' }, 7), false);
});

test('accepts only a valid signing result date on or after the scheduled date and not in the future', () => {
  const today = new Date();
  const todayDate = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, '0'),
    String(today.getDate()).padStart(2, '0'),
  ].join('-');
  const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
  const tomorrowDate = [
    tomorrow.getFullYear(),
    String(tomorrow.getMonth() + 1).padStart(2, '0'),
    String(tomorrow.getDate()).padStart(2, '0'),
  ].join('-');

  assert.equal(validSigningOutcomeDate(todayDate, todayDate), true);
  assert.equal(validSigningOutcomeDate(todayDate, tomorrowDate), false);
  assert.equal(validSigningOutcomeDate(tomorrowDate, todayDate), false);
  assert.equal(validSigningOutcomeDate('2026-02-30', null), false);
});
