const crypto = require('node:crypto');
const path = require('node:path');
const express = require('express');
const cors = require('cors');
const { Sequelize, DataTypes, Op } = require('sequelize');

const app = express();
const PORT = Number(process.env.PORT) || 5000;
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(__dirname, 'casafast_local.sqlite'),
  logging: false,
});
const tokens = new Map();
const ROLES = ['comprador', 'propietario', 'asesor', 'gerente', 'responsable_legal'];
const STATUSES = ['Disponible', 'Pendiente Aprobación', 'Apartado'];
const OPERATION_TYPES = ['Venta', 'Renta'];
const PAYMENT_SCHEMES = ['Credix SOFOM', 'Contado'];
const PURCHASE_METHODS = ['Contado', 'Crédito bancario', 'Infonavit', 'Credix SOFOM'];
const CREDIT_METHODS = PURCHASE_METHODS.filter((method) => method !== 'Contado');
const MAX_PHOTOS = 8;
const MAX_PHOTO_BYTES = 1_500_000;
const MAX_LEGAL_FILE_BYTES = 4_000_000;
const LEGACY_DEMO_PASSWORD = 'CasaFast2026!';
const DEMO_PASSWORD = process.env.DEMO_PASSWORD || 'app123';

app.use(cors({ origin: process.env.FRONTEND_ORIGIN || true }));
app.use(express.json({ limit: '30mb' }));

const Usuario = sequelize.define('Usuario', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  nombre: { type: DataTypes.STRING(120), allowNull: false },
  email: { type: DataTypes.STRING(160), allowNull: false, unique: true, validate: { isEmail: true } },
  passwordHash: { type: DataTypes.STRING(128), allowNull: false },
  rol: { type: DataTypes.ENUM(...ROLES), allowNull: false },
  telefono: { type: DataTypes.STRING(40), allowNull: true },
}, { tableName: 'Usuarios', defaultScope: { attributes: { exclude: ['passwordHash'] } } });

const Propiedad = sequelize.define('Propiedad', {
  codigo: { type: DataTypes.STRING(24), primaryKey: true },
  titulo: { type: DataTypes.STRING(160), allowNull: false },
  direccion: { type: DataTypes.STRING(240), allowNull: false },
  zona: { type: DataTypes.STRING(100), allowNull: false },
  precio: { type: DataTypes.INTEGER, allowNull: false, validate: { min: 1 } },
  tipoOperacion: { type: DataTypes.ENUM(...OPERATION_TYPES), allowNull: false, defaultValue: 'Venta' },
  estatus: { type: DataTypes.ENUM(...STATUSES), allowNull: false, defaultValue: 'Disponible' },
  publicada: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  fotoPrincipal: { type: DataTypes.TEXT, allowNull: true },
  tieneFotoPrincipal: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  recamaras: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, validate: { min: 0 } },
  banos: { type: DataTypes.DECIMAL(3, 1), allowNull: false, defaultValue: 0 },
  metrosCuadrados: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 },
  superficieTerreno: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 },
  superficieConstruccion: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 },
  cocheras: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  visitas: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  ofertas: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
}, { tableName: 'Propiedads', defaultScope: { attributes: { exclude: ['fotoPrincipal'] } } });

const Tramite = sequelize.define('Tramite', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  estado: { type: DataTypes.ENUM('Pendiente Aprobación', 'Aprobado', 'Rechazado'), allowNull: false, defaultValue: 'Pendiente Aprobación' },
  comprobanteNombre: { type: DataTypes.STRING(180), allowNull: false },
  comprobanteDatos: { type: DataTypes.TEXT, allowNull: false },
  montoApartado: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 50000 },
  esquemaPago: { type: DataTypes.ENUM(...PAYMENT_SCHEMES), allowNull: false, defaultValue: 'Contado' },
  nombreComprador: { type: DataTypes.STRING(120), allowNull: true },
  correoComprador: { type: DataTypes.STRING(160), allowNull: true },
  telefonoComprador: { type: DataTypes.STRING(40), allowNull: true },
  propuestaEconomica: { type: DataTypes.INTEGER, allowNull: true },
  metodoPago: { type: DataTypes.STRING(40), allowNull: true },
  estadoFinanciamiento: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'Pendiente' },
  documentosComprador: { type: DataTypes.TEXT, allowNull: true },
  documentosCompradorResumen: { type: DataTypes.TEXT, allowNull: true },
  estadoDocumentacion: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'Pendiente' },
  comentariosDocumentacion: { type: DataTypes.STRING(1000), allowNull: true },
  fechaFirma: { type: DataTypes.DATEONLY, allowNull: true },
  horaFirma: { type: DataTypes.STRING(5), allowNull: true },
  estadoFirma: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'Pendiente' },
  fechaResultadoFirma: { type: DataTypes.DATEONLY, allowNull: true },
  notaria: { type: DataTypes.STRING(180), allowNull: true },
  progreso: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 20 },
  observacion: { type: DataTypes.STRING(300), allowNull: true },
}, { tableName: 'Apartados' });

const VisitaPropiedad = sequelize.define('VisitaPropiedad', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  fechaCita: { type: DataTypes.DATEONLY, allowNull: false },
  horaCita: { type: DataTypes.STRING(5), allowNull: false },
  telefono: { type: DataTypes.STRING(40), allowNull: false },
  notas: { type: DataTypes.STRING(500), allowNull: true },
  estado: { type: DataTypes.ENUM('Solicitada', 'Confirmada', 'Rechazada'), allowNull: false, defaultValue: 'Solicitada' },
  clienteDescarto: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
}, { tableName: 'VisitasPropiedad' });

const ExpedienteLegal = sequelize.define('ExpedienteLegal', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  propiedadId: { type: DataTypes.STRING(24), allowNull: false, unique: true },
  estatusPredial: { type: DataTypes.ENUM('Pendiente', 'Aprobado', 'Rechazado'), allowNull: false, defaultValue: 'Pendiente' },
  estatusEscrituras: { type: DataTypes.ENUM('Pendiente', 'En Revisión', 'Libre de Gravamen', 'Observado'), allowNull: false, defaultValue: 'Pendiente' },
  estatusDictamenGeneral: { type: DataTypes.ENUM('En Auditoría', 'Aprobado para Notaría', 'Rechazado'), allowNull: false, defaultValue: 'En Auditoría' },
  comentariosJuridicos: { type: DataTypes.TEXT, allowNull: true },
}, { tableName: 'ExpedientesLegales' });

const SolicitudVenta = sequelize.define('SolicitudVenta', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  telefono: { type: DataTypes.STRING(40), allowNull: false },
  tipoOperacion: { type: DataTypes.ENUM(...OPERATION_TYPES), allowNull: false, defaultValue: 'Venta' },
  direccion: { type: DataTypes.STRING(240), allowNull: false },
  zona: { type: DataTypes.STRING(100), allowNull: false },
  tipoPropiedad: { type: DataTypes.STRING(60), allowNull: false },
  fechaCita: { type: DataTypes.DATEONLY, allowNull: false },
  horaCita: { type: DataTypes.STRING(5), allowNull: false },
  notas: { type: DataTypes.STRING(500), allowNull: true },
  estado: {
    type: DataTypes.ENUM('Pendiente de asignación', 'Asignada', 'Inspección completada'),
    allowNull: false,
    defaultValue: 'Pendiente de asignación',
  },
  titulo: { type: DataTypes.STRING(160), allowNull: true },
  precio: { type: DataTypes.INTEGER, allowNull: true },
  recamaras: { type: DataTypes.INTEGER, allowNull: true },
  banos: { type: DataTypes.FLOAT, allowNull: true },
  metrosCuadrados: { type: DataTypes.FLOAT, allowNull: true },
  superficieTerreno: { type: DataTypes.FLOAT, allowNull: true },
  superficieConstruccion: { type: DataTypes.FLOAT, allowNull: true },
  cocheras: { type: DataTypes.INTEGER, allowNull: true },
  detallesInspeccion: { type: DataTypes.STRING(1000), allowNull: true },
  propiedadCodigo: { type: DataTypes.STRING(24), allowNull: true },
  galeriaNombres: { type: DataTypes.TEXT, allowNull: true },
  galeriaDatos: { type: DataTypes.TEXT, allowNull: true },
  escriturasNombre: { type: DataTypes.STRING(180), allowNull: true },
  escriturasDatos: { type: DataTypes.TEXT, allowNull: true },
  predialNombre: { type: DataTypes.STRING(180), allowNull: true },
  predialDatos: { type: DataTypes.TEXT, allowNull: true },
  revisionAdministrativa: { type: DataTypes.STRING(60), allowNull: true },
}, { tableName: 'SolicitudesVenta' });

const ChatConversacion = sequelize.define('ChatConversacion', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  tipo: { type: DataTypes.ENUM('comprador', 'vendedor'), allowNull: false },
  referencia: { type: DataTypes.STRING(80), allowNull: false },
  clienteId: { type: DataTypes.INTEGER, allowNull: false },
  asesorId: { type: DataTypes.INTEGER, allowNull: false },
  propiedadCodigo: { type: DataTypes.STRING(24), allowNull: true },
  solicitudVentaId: { type: DataTypes.INTEGER, allowNull: true },
  titulo: { type: DataTypes.STRING(240), allowNull: false },
}, {
  tableName: 'ChatConversaciones',
  indexes: [{ unique: true, fields: ['tipo', 'referencia', 'clienteId', 'asesorId'] }],
});

const ChatMensaje = sequelize.define('ChatMensaje', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  texto: { type: DataTypes.STRING(2000), allowNull: false },
}, { tableName: 'ChatMensajes' });

Propiedad.belongsTo(Usuario, { as: 'asesor', foreignKey: { name: 'asesorId', allowNull: true } });
Propiedad.belongsTo(Usuario, { as: 'propietario', foreignKey: { name: 'propietarioId', allowNull: true } });
Propiedad.belongsTo(Usuario, { as: 'comprador', foreignKey: { name: 'compradorId', allowNull: true } });
Usuario.hasMany(Propiedad, { as: 'propiedadesComoAsesor', foreignKey: 'asesorId' });
Usuario.hasMany(Propiedad, { as: 'propiedadesComoPropietario', foreignKey: 'propietarioId' });
VisitaPropiedad.belongsTo(Propiedad, { as: 'propiedad', foreignKey: { name: 'propiedadCodigo', allowNull: false } });
VisitaPropiedad.belongsTo(Usuario, { as: 'cliente', foreignKey: { name: 'clienteId', allowNull: false } });
Propiedad.hasMany(VisitaPropiedad, { as: 'visitasAgendadas', foreignKey: 'propiedadCodigo' });
Usuario.hasMany(VisitaPropiedad, { as: 'visitasPropiedad', foreignKey: 'clienteId' });
ExpedienteLegal.belongsTo(Propiedad, { as: 'propiedad', foreignKey: { name: 'propiedadId', allowNull: false } });
Propiedad.hasOne(ExpedienteLegal, { as: 'expedienteLegal', foreignKey: 'propiedadId' });
Tramite.belongsTo(Propiedad, { as: 'propiedad', foreignKey: { name: 'propiedadCodigo', allowNull: false } });
Tramite.belongsTo(Usuario, { as: 'comprador', foreignKey: { name: 'compradorId', allowNull: false } });
Tramite.belongsTo(Usuario, { as: 'asesor', foreignKey: { name: 'asesorId', allowNull: true } });
Propiedad.hasMany(Tramite, { as: 'tramites', foreignKey: 'propiedadCodigo' });
SolicitudVenta.belongsTo(Usuario, { as: 'propietario', foreignKey: { name: 'propietarioId', allowNull: false } });
SolicitudVenta.belongsTo(Usuario, { as: 'asesor', foreignKey: { name: 'asesorId', allowNull: true } });
SolicitudVenta.belongsTo(Propiedad, { as: 'propiedad', foreignKey: { name: 'propiedadCodigo', allowNull: true } });
ChatConversacion.belongsTo(Usuario, { as: 'cliente', foreignKey: 'clienteId' });
ChatConversacion.belongsTo(Usuario, { as: 'asesor', foreignKey: 'asesorId' });
ChatConversacion.hasMany(ChatMensaje, { as: 'mensajes', foreignKey: 'conversacionId' });
ChatMensaje.belongsTo(ChatConversacion, { as: 'conversacion', foreignKey: 'conversacionId' });
ChatMensaje.belongsTo(Usuario, { as: 'remitente', foreignKey: 'remitenteId' });

function hashPassword(password, salt) {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

function publicUser(user) {
  const rol = ['comprador', 'propietario'].includes(user.rol) ? 'cliente' : user.rol;
  return { id: user.id, nombre: user.nombre, email: user.email, rol, telefono: user.telefono };
}

function fail(res, status, message) {
  return res.status(status).json({ error: message });
}

async function authenticate(req, res, next) {
  const token = req.get('authorization')?.replace(/^Bearer\s+/i, '');
  const userId = token && tokens.get(token);
  if (!userId) return fail(res, 401, 'Inicia sesión para continuar.');
  const user = await Usuario.findByPk(userId);
  if (!user) return fail(res, 401, 'La sesión ya no es válida.');
  req.user = user;
  next();
}

function allow(...roles) {
  return (req, res, next) => roles.includes(req.user.rol)
    ? next()
    : fail(res, 403, 'Tu perfil no tiene permiso para esta acción.');
}

async function ensureChatConversation({ tipo, referencia, clienteId, asesorId, propiedadCodigo = null, solicitudVentaId = null, titulo }) {
  const [conversation, created] = await ChatConversacion.findOrCreate({
    where: { tipo, referencia, clienteId, asesorId },
    defaults: { tipo, referencia, clienteId, asesorId, propiedadCodigo, solicitudVentaId, titulo },
  });
  if (!created && (
    conversation.titulo !== titulo ||
    conversation.propiedadCodigo !== propiedadCodigo ||
    conversation.solicitudVentaId !== solicitudVentaId
  )) {
    await conversation.update({ titulo, propiedadCodigo, solicitudVentaId });
  }
  return conversation;
}

async function canAccessChatConversation(conversation, user) {
  if (!conversation || !['comprador', 'propietario', 'asesor'].includes(user.rol)) return false;
  if (user.id !== conversation.clienteId && user.id !== conversation.asesorId) return false;

  if (conversation.tipo === 'vendedor') {
    return Boolean(await SolicitudVenta.findOne({
      where: {
        id: conversation.solicitudVentaId,
        propietarioId: conversation.clienteId,
        asesorId: conversation.asesorId,
      },
      attributes: ['id'],
    }));
  }

  const [property, visit, reservation] = await Promise.all([
    Propiedad.findByPk(conversation.propiedadCodigo, { attributes: ['codigo', 'asesorId'] }),
    VisitaPropiedad.findOne({
      where: { clienteId: conversation.clienteId, propiedadCodigo: conversation.propiedadCodigo },
      attributes: ['id'],
    }),
    Tramite.findOne({
      where: {
        compradorId: conversation.clienteId,
        propiedadCodigo: conversation.propiedadCodigo,
        asesorId: conversation.asesorId,
      },
      attributes: ['id'],
    }),
  ]);
  return Boolean(property && (
    (property.asesorId === conversation.asesorId && visit) ||
    (property.asesorId === conversation.asesorId && reservation) ||
    reservation
  ));
}

const propertyIncludes = [
  { model: Usuario, as: 'asesor', attributes: ['id', 'nombre', 'rol'] },
  { model: Usuario, as: 'propietario', attributes: ['id', 'nombre', 'rol'] },
  { model: Usuario, as: 'comprador', attributes: ['id', 'nombre', 'rol'] },
];

function decodeBase64DataUrl(dataUrl) {
  if (typeof dataUrl !== 'string') return null;
  const match = dataUrl.match(/^data:([a-z0-9.+-]+\/[a-z0-9.+-]+);base64,([A-Za-z0-9+/=_-]+)$/i);
  if (!match) return null;
  const base64 = match[2].replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.length % 4 === 0 ? base64 : base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
  try {
    const buffer = Buffer.from(padded, 'base64');
    return buffer.length > 0 ? buffer : null;
  } catch {
    return null;
  }
}

function validReceipt(name, data) {
  if (typeof name !== 'string' || name.length < 1 || name.length > 180) return false;
  if (typeof data !== 'string' || data.length > 2_800_000) return false;
  const match = data.match(/^data:(application\/pdf|image\/(jpeg|png));base64,/i);
  if (!match) return false;
  const buffer = decodeBase64DataUrl(data);
  return !!buffer && buffer.length <= 2_000_000;
}

function validReservationDetails(details) {
  return !!details &&
    typeof details.nombreComprador === 'string' &&
    details.nombreComprador.trim().length > 0 &&
    details.nombreComprador.length <= 120 &&
    typeof details.correoComprador === 'string' &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(details.correoComprador.trim()) &&
    details.correoComprador.length <= 160 &&
    typeof details.telefonoComprador === 'string' &&
    details.telefonoComprador.trim().length >= 7 &&
    details.telefonoComprador.length <= 40 &&
    Number.isSafeInteger(details.propuestaEconomica) &&
    details.propuestaEconomica > 0;
}

function validBuyerDocuments(documents) {
  if (!Array.isArray(documents) || documents.length < 2 || documents.length > 6) return false;
  const identityDocuments = documents.filter((file) => file?.tipo === 'Identificación oficial');
  const financialDocuments = documents.filter((file) => file?.tipo === 'Documento financiero');
  if (identityDocuments.length !== 1 || financialDocuments.length < 1 ||
    identityDocuments.length + financialDocuments.length !== documents.length) return false;
  const acceptedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
  if (!documents.every((file) => validUploadedFile(file, acceptedTypes, MAX_LEGAL_FILE_BYTES))) return false;
  const totalBytes = documents.reduce((total, file) => total + Buffer.from(file.data.split(',')[1], 'base64').length, 0);
  return totalBytes <= 20_000_000;
}

function canAdvisorRecordFinancing(tramite, asesorId) {
  return tramite.asesorId === asesorId &&
    tramite.estado === 'Aprobado' &&
    CREDIT_METHODS.includes(tramite.metodoPago) &&
    tramite.estadoDocumentacion === 'Aprobado' &&
    tramite.estadoFinanciamiento === 'Pendiente';
}

function canAdvisorScheduleSigning(tramite, asesorId) {
  const financingResolved = tramite.metodoPago === 'Contado'
    ? tramite.estadoFinanciamiento === 'No requerido'
    : CREDIT_METHODS.includes(tramite.metodoPago) && tramite.estadoFinanciamiento === 'Aprobado';
  return tramite.asesorId === asesorId &&
    tramite.estado === 'Aprobado' &&
    tramite.estadoDocumentacion === 'Aprobado' &&
    financingResolved;
}

function canAdvisorRecordSigningOutcome(tramite, asesorId) {
  return canAdvisorScheduleSigning(tramite, asesorId) &&
    validDateOnly(tramite.fechaFirma) &&
    tramite.estadoFirma !== 'Firmada';
}

function validDateOnly(date) {
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const [year, month, day] = date.split('-').map(Number);
  const normalizedDate = new Date(Date.UTC(year, month - 1, day));
  return normalizedDate.getUTCFullYear() === year &&
    normalizedDate.getUTCMonth() === month - 1 &&
    normalizedDate.getUTCDate() === day;
}

function validSigningOutcomeDate(date, scheduledDate) {
  if (!validDateOnly(date) || (scheduledDate && (!validDateOnly(scheduledDate) || date < scheduledDate))) return false;
  const today = new Date();
  const todayDate = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, '0'),
    String(today.getDate()).padStart(2, '0'),
  ].join('-');
  return date <= todayDate;
}

function validFutureAppointment(date, time) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) return false;
  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  const normalizedDate = new Date(Date.UTC(year, month - 1, day));
  if (
    normalizedDate.getUTCFullYear() !== year ||
    normalizedDate.getUTCMonth() !== month - 1 ||
    normalizedDate.getUTCDate() !== day ||
    hour > 23 ||
    minute > 59
  ) return false;
  return new Date(year, month - 1, day, hour, minute) > new Date();
}

function validUploadedFile(file, acceptedTypes, maxBytes) {
  const name = file?.name ?? file?.nombre;
  if (typeof name !== 'string' || !name.trim() || name.length > 180) return false;
  if (typeof file.data !== 'string') return false;
  const match = file.data.match(/^data:([a-z0-9.+-]+\/[a-z0-9.+-]+);base64,/i);
  if (!match || !acceptedTypes.includes(match[1].toLowerCase())) return false;
  const bytes = decodeBase64DataUrl(file.data);
  return !!bytes && bytes.length > 0 && bytes.length <= maxBytes;
}

function validInspectionFiles(gallery, escrituras, predial) {
  if (!Array.isArray(gallery) || gallery.length < 1 || gallery.length > MAX_PHOTOS) return false;
  const imageTypes = ['image/jpeg', 'image/png', 'image/webp'];
  const legalTypes = ['application/pdf', 'image/jpeg', 'image/png'];
  if (!gallery.every((file) => validUploadedFile(file, imageTypes, MAX_PHOTO_BYTES))) return false;
  if (!validUploadedFile(escrituras, legalTypes, MAX_LEGAL_FILE_BYTES)) return false;
  if (!validUploadedFile(predial, ['application/pdf'], MAX_LEGAL_FILE_BYTES)) return false;
  const totalBytes = [
    ...gallery.map((file) => Buffer.from(file.data.split(',')[1], 'base64').length),
    Buffer.from(escrituras.data.split(',')[1], 'base64').length,
    Buffer.from(predial.data.split(',')[1], 'base64').length,
  ].reduce((total, size) => total + size, 0);
  return totalBytes <= 20_000_000;
}

async function changeReservation(codigo, accion, user, comprobanteNombre, comprobanteDatos, reservationDetails) {
  return sequelize.transaction(async (transaction) => {
    const propiedad = await Propiedad.findByPk(codigo, { transaction, lock: true });
    if (!propiedad) {
      const error = new Error('No se encontró la propiedad.');
      error.status = 404;
      throw error;
    }

    if (accion === 'solicitar') {
      if (!['comprador', 'propietario'].includes(user.rol)) {
        const error = new Error('Solo una cuenta de cliente puede solicitar un apartado.');
        error.status = 403;
        throw error;
      }
      if (propiedad.tipoOperacion === 'Renta') {
        const error = new Error('Las propiedades en renta no admiten apartado en línea. Solicita una visita para conocerlas.');
        error.status = 409;
        throw error;
      }
      if (!propiedad.publicada || propiedad.estatus !== 'Disponible') {
        const error = new Error('Esta propiedad ya no está disponible.');
        error.status = 409;
        throw error;
      }
      if (comprobanteNombre || comprobanteDatos) {
        const error = new Error('El comprobante del anticipo debe ser cargado por el asesor.');
        error.status = 400;
        throw error;
      }
      if (!validReservationDetails(reservationDetails)) {
        const error = new Error('Revisa tus datos de contacto y la propuesta económica.');
        error.status = 400;
        throw error;
      }
      const tramite = await Tramite.create({
        propiedadCodigo: codigo,
        compradorId: user.id,
        asesorId: propiedad.asesorId,
        comprobanteNombre: 'Pendiente de carga por el asesor',
        comprobanteDatos: '',
        nombreComprador: reservationDetails.nombreComprador.trim(),
        correoComprador: reservationDetails.correoComprador.trim(),
        telefonoComprador: reservationDetails.telefonoComprador.trim(),
        propuestaEconomica: reservationDetails.propuestaEconomica,
      }, { transaction });
      await propiedad.update({ estatus: 'Pendiente Aprobación', compradorId: user.id }, { transaction });
      return tramite;
    }

    if (user.rol !== 'gerente') {
      const error = new Error('Solo el gerente puede aprobar o rechazar apartados.');
      error.status = 403;
      throw error;
    }
    const tramite = await Tramite.findOne({
      where: { propiedadCodigo: codigo, estado: 'Pendiente Aprobación' },
      order: [['createdAt', 'DESC']],
      transaction,
    });
    if (!tramite || propiedad.estatus !== 'Pendiente Aprobación') {
      const error = new Error('No hay un apartado pendiente para esta propiedad.');
      error.status = 409;
      throw error;
    }
    const aprobar = accion === 'aprobar';
    if (aprobar) {
      if (!validReceipt(tramite.comprobanteNombre, tramite.comprobanteDatos)) {
        const error = new Error('El asesor debe cargar el comprobante del anticipo antes de aprobar el apartado.');
        error.status = 409;
        throw error;
      }
      const expediente = await ExpedienteLegal.findOne({
        where: { propiedadId: codigo },
        transaction,
        lock: true,
      });
      if (expediente?.estatusDictamenGeneral !== 'Aprobado para Notaría') {
        const error = new Error('El apartado no puede aprobarse hasta que Responsable Legal apruebe el expediente para notaría.');
        error.status = 409;
        throw error;
      }
    }
    await tramite.update({
      estado: aprobar ? 'Aprobado' : 'Rechazado',
      progreso: aprobar ? 40 : 0,
      notaria: null,
    }, { transaction });
    await propiedad.update({
      estatus: aprobar ? 'Apartado' : 'Disponible',
      compradorId: aprobar ? tramite.compradorId : null,
    }, { transaction });
    return tramite;
  });
}

app.get('/api/health', (req, res) => res.json({ ok: true, service: 'CASAFAST API' }));

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (typeof email !== 'string' || typeof password !== 'string') return fail(res, 400, 'Correo y contraseña son obligatorios.');
  const user = await Usuario.unscoped().findOne({ where: { email: email.trim().toLowerCase() } });
  if (!user || hashPassword(password, user.email) !== user.passwordHash) return fail(res, 401, 'Correo o contraseña incorrectos.');
  const token = crypto.randomBytes(32).toString('hex');
  tokens.set(token, user.id);
  return res.json({ token, usuario: publicUser(user) });
});

app.get('/api/me', authenticate, (req, res) => res.json({ usuario: publicUser(req.user) }));

app.get('/api/chat/conversaciones', authenticate, allow('comprador', 'propietario', 'asesor'), async (req, res) => {
  const conversations = new Map();
  const addConversation = async (data) => {
    const conversation = await ensureChatConversation(data);
    conversations.set(conversation.id, conversation);
  };

  if (['comprador', 'propietario'].includes(req.user.rol)) {
    const saleRequests = await SolicitudVenta.findAll({
      where: { propietarioId: req.user.id, asesorId: { [Op.ne]: null } },
      include: [{ model: Propiedad, as: 'propiedad', attributes: ['codigo', 'titulo'] }],
    });
    for (const requestItem of saleRequests) {
      await addConversation({
        tipo: 'vendedor',
        referencia: `solicitud:${requestItem.id}`,
        clienteId: requestItem.propietarioId,
        asesorId: requestItem.asesorId,
        propiedadCodigo: requestItem.propiedadCodigo,
        solicitudVentaId: requestItem.id,
        titulo: requestItem.propiedad?.titulo || `${requestItem.direccion}, ${requestItem.zona}`,
      });
    }

    const visits = await VisitaPropiedad.findAll({
      where: { clienteId: req.user.id },
      include: [{
        model: Propiedad,
        as: 'propiedad',
        required: true,
        where: { asesorId: { [Op.ne]: null } },
        attributes: ['codigo', 'titulo', 'asesorId'],
      }],
    });
    for (const visit of visits) {
      await addConversation({
        tipo: 'comprador',
        referencia: `propiedad:${visit.propiedad.codigo}`,
        clienteId: req.user.id,
        asesorId: visit.propiedad.asesorId,
        propiedadCodigo: visit.propiedad.codigo,
        titulo: visit.propiedad.titulo,
      });
    }

    const reservations = await Tramite.findAll({
      where: { compradorId: req.user.id },
      include: [{ model: Propiedad, as: 'propiedad', attributes: ['codigo', 'titulo', 'asesorId'] }],
    });
    for (const reservation of reservations) {
      const advisorId = reservation.asesorId || reservation.propiedad?.asesorId;
      if (!advisorId || !reservation.propiedad) continue;
      await addConversation({
        tipo: 'comprador',
        referencia: `propiedad:${reservation.propiedadCodigo}`,
        clienteId: req.user.id,
        asesorId: advisorId,
        propiedadCodigo: reservation.propiedadCodigo,
        titulo: reservation.propiedad.titulo,
      });
    }
  } else {
    const saleRequests = await SolicitudVenta.findAll({
      where: { asesorId: req.user.id },
      include: [{ model: Propiedad, as: 'propiedad', attributes: ['codigo', 'titulo'] }],
    });
    for (const requestItem of saleRequests) {
      await addConversation({
        tipo: 'vendedor',
        referencia: `solicitud:${requestItem.id}`,
        clienteId: requestItem.propietarioId,
        asesorId: req.user.id,
        propiedadCodigo: requestItem.propiedadCodigo,
        solicitudVentaId: requestItem.id,
        titulo: requestItem.propiedad?.titulo || `${requestItem.direccion}, ${requestItem.zona}`,
      });
    }

    const visits = await VisitaPropiedad.findAll({
      include: [
        { model: Usuario, as: 'cliente', attributes: ['id'] },
        {
          model: Propiedad,
          as: 'propiedad',
          required: true,
          where: { asesorId: req.user.id },
          attributes: ['codigo', 'titulo'],
        },
      ],
    });
    for (const visit of visits) {
      await addConversation({
        tipo: 'comprador',
        referencia: `propiedad:${visit.propiedad.codigo}`,
        clienteId: visit.clienteId,
        asesorId: req.user.id,
        propiedadCodigo: visit.propiedad.codigo,
        titulo: visit.propiedad.titulo,
      });
    }

    const reservations = await Tramite.findAll({
      where: { asesorId: req.user.id },
      include: [
        { model: Usuario, as: 'comprador', attributes: ['id'] },
        { model: Propiedad, as: 'propiedad', attributes: ['codigo', 'titulo'] },
      ],
    });
    for (const reservation of reservations) {
      await addConversation({
        tipo: 'comprador',
        referencia: `propiedad:${reservation.propiedadCodigo}`,
        clienteId: reservation.compradorId,
        asesorId: req.user.id,
        propiedadCodigo: reservation.propiedadCodigo,
        titulo: reservation.propiedad.titulo,
      });
    }
  }

  const ids = [...conversations.keys()];
  if (!ids.length) return res.json([]);
  const [savedConversations, latestMessageIds] = await Promise.all([
    ChatConversacion.findAll({
      where: { id: { [Op.in]: ids } },
      include: [
        { model: Usuario, as: 'cliente', attributes: ['id', 'nombre'] },
        { model: Usuario, as: 'asesor', attributes: ['id', 'nombre'] },
      ],
    }),
    ChatMensaje.findAll({
      attributes: [[sequelize.fn('MAX', sequelize.col('id')), 'id']],
      where: { conversacionId: { [Op.in]: ids } },
      group: ['conversacionId'],
      raw: true,
    }),
  ]);
  const messages = latestMessageIds.length
    ? await ChatMensaje.findAll({ where: { id: { [Op.in]: latestMessageIds.map((message) => message.id) } } })
    : [];
  const latestMessages = new Map();
  for (const message of messages) {
    if (!latestMessages.has(message.conversacionId)) latestMessages.set(message.conversacionId, message);
  }
  const result = savedConversations.map((conversation) => {
    const lastMessage = latestMessages.get(conversation.id);
    return {
      id: conversation.id,
      tipo: conversation.tipo,
      titulo: conversation.titulo,
      cliente: conversation.cliente,
      asesor: conversation.asesor,
      ultimoMensaje: lastMessage ? {
        texto: lastMessage.texto,
        remitenteId: lastMessage.remitenteId,
        createdAt: lastMessage.createdAt,
      } : null,
      updatedAt: lastMessage?.createdAt || conversation.updatedAt,
    };
  });
  result.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  return res.json(result);
});

app.get('/api/chat/conversaciones/:id/mensajes', authenticate, allow('comprador', 'propietario', 'asesor'), async (req, res) => {
  const conversation = await ChatConversacion.findByPk(req.params.id);
  if (!await canAccessChatConversation(conversation, req.user)) return fail(res, 404, 'No se encontró la conversación.');
  const messages = await ChatMensaje.findAll({
    where: { conversacionId: conversation.id },
    include: [{ model: Usuario, as: 'remitente', attributes: ['id', 'nombre'] }],
    order: [['createdAt', 'DESC'], ['id', 'DESC']],
    limit: 100,
  });
  return res.json(messages.reverse().map((message) => ({
    id: message.id,
    texto: message.texto,
    remitenteId: message.remitenteId,
    remitenteNombre: message.remitente.nombre,
    createdAt: message.createdAt,
  })));
});

app.post('/api/chat/conversaciones/:id/mensajes', authenticate, allow('comprador', 'propietario', 'asesor'), async (req, res) => {
  const texto = req.body?.texto;
  if (typeof texto !== 'string' || !texto.trim() || texto.trim().length > 2000) {
    return fail(res, 400, 'Escribe un mensaje de hasta 2000 caracteres.');
  }
  const conversation = await ChatConversacion.findByPk(req.params.id);
  if (!await canAccessChatConversation(conversation, req.user)) return fail(res, 404, 'No se encontró la conversación.');
  const message = await ChatMensaje.create({
    conversacionId: conversation.id,
    remitenteId: req.user.id,
    texto: texto.trim(),
  });
  return res.status(201).json({
    id: message.id,
    texto: message.texto,
    remitenteId: req.user.id,
    remitenteNombre: req.user.nombre,
    createdAt: message.createdAt,
  });
});

app.post('/api/logout', authenticate, (req, res) => {
  const token = req.get('authorization').replace(/^Bearer\s+/i, '');
  tokens.delete(token);
  res.json({ ok: true });
});

app.get('/api/propiedades', async (req, res) => {
  const where = { publicada: true };
  if (req.query.q) {
    const term = String(req.query.q).trim();
    where[Op.or] = [
      { titulo: { [Op.like]: `%${term}%` } },
      { zona: { [Op.like]: `%${term}%` } },
      { direccion: { [Op.like]: `%${term}%` } },
    ];
  }
  const propiedades = await Propiedad.findAll({ where, include: propertyIncludes, order: [['createdAt', 'DESC']] });
  res.json(propiedades);
});

app.get('/api/propiedades/:codigo/foto-principal', async (req, res) => {
  const propiedad = await Propiedad.unscoped().findByPk(req.params.codigo, {
    attributes: ['codigo', 'publicada', 'fotoPrincipal'],
  });
  if (!propiedad?.publicada || !propiedad.fotoPrincipal) return fail(res, 404, 'No se encontró la fotografía principal.');
  const match = propiedad.fotoPrincipal.match(/^data:(image\/(?:jpeg|png|webp));base64,/i);
  const image = decodeBase64DataUrl(propiedad.fotoPrincipal);
  if (!match || !image) return fail(res, 500, 'No se pudo leer la fotografía principal.');
  res.set('Cache-Control', 'public, max-age=3600');
  return res.type(match[1]).send(image);
});

app.get('/api/propiedades/:codigo', authenticate, async (req, res) => {
  const propiedad = await Propiedad.findByPk(req.params.codigo, { include: propertyIncludes });
  if (!propiedad) return fail(res, 404, 'No se encontró la propiedad.');
  if (!propiedad.publicada && req.user.rol !== 'responsable_legal') return fail(res, 404, 'No se encontró la propiedad.');
  const solicitud = await SolicitudVenta.findOne({
    where: { propiedadCodigo: propiedad.codigo, estado: 'Inspección completada' },
    attributes: ['galeriaNombres', 'galeriaDatos', 'revisionAdministrativa'],
  });
  const data = propiedad.get({ plain: true });
  data.galeria = solicitud
    ? JSON.parse(solicitud.galeriaDatos || '[]').map((photo, index) => ({
      nombre: JSON.parse(solicitud.galeriaNombres || '[]')[index],
      data: photo,
    }))
    : [];
  const expediente = await ExpedienteLegal.findOne({ where: { propiedadId: propiedad.codigo } });
  data.expedienteLegal = expediente ? {
    estatusPredial: expediente.estatusPredial,
    estatusEscrituras: expediente.estatusEscrituras,
    estatusDictamenGeneral: expediente.estatusDictamenGeneral,
  } : null;
  return res.json(data);
});

app.get('/api/asesor/propiedades', authenticate, allow('asesor'), async (req, res) => {
  const propiedades = await Propiedad.findAll({
    where: { asesorId: req.user.id },
    attributes: ['codigo', 'titulo', 'direccion', 'zona', 'precio', 'tipoOperacion', 'estatus', 'publicada', 'recamaras', 'banos', 'metrosCuadrados', 'superficieTerreno', 'superficieConstruccion', 'cocheras'],
    include: [{ model: ExpedienteLegal, as: 'expedienteLegal', attributes: ['estatusPredial', 'estatusEscrituras', 'estatusDictamenGeneral'] }],
    order: [['updatedAt', 'DESC']],
  });
  return res.json(propiedades);
});

app.post('/api/propiedades', authenticate, allow('asesor'), async (req, res) => {
  const { titulo, direccion, zona, precio, recamaras, banos, metrosCuadrados, propietarioId } = req.body || {};
  const tipoOperacion = req.body?.tipoOperacion || 'Venta';
  if (!titulo?.trim() || !direccion?.trim() || !zona?.trim() || !Number.isFinite(Number(precio)) || Number(precio) <= 0) {
    return fail(res, 400, 'Título, dirección, zona y precio válido son obligatorios.');
  }
  if (!OPERATION_TYPES.includes(tipoOperacion)) return fail(res, 400, 'Selecciona si la propiedad se ofrecerá en venta o renta.');
  if (propietarioId && !(await Usuario.findOne({ where: { id: propietarioId, rol: { [Op.in]: ['comprador', 'propietario'] } } }))) {
    return fail(res, 400, 'El propietario seleccionado no es válido.');
  }
  const codigo = `CF-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
  const propiedad = await Propiedad.create({
    codigo, titulo: titulo.trim(), direccion: direccion.trim(), zona: zona.trim(),
    precio: Number(precio), tipoOperacion, recamaras: Math.max(0, Number(recamaras) || 0),
    banos: Math.max(0, Number(banos) || 0), metrosCuadrados: Math.max(0, Number(metrosCuadrados) || 0),
    estatus: 'Disponible',
    publicada: false,
    asesorId: req.user.id,
    propietarioId: propietarioId || null,
  });
  await ExpedienteLegal.findOrCreate({ where: { propiedadId: propiedad.codigo } });
  res.status(201).json(await Propiedad.findByPk(propiedad.codigo, { include: propertyIncludes }));
});

app.get('/api/expedientes-legales', authenticate, allow('responsable_legal'), async (req, res) => {
  const expedientes = await ExpedienteLegal.findAll({
    include: [{ model: Propiedad, as: 'propiedad', attributes: ['codigo', 'titulo', 'direccion', 'zona', 'precio', 'tipoOperacion', 'estatus', 'publicada'] }],
    order: [['updatedAt', 'ASC']],
  });
  const propiedades = expedientes.map((item) => item.propiedadId);
  const solicitudes = propiedades.length
    ? await SolicitudVenta.findAll({
      where: { propiedadCodigo: { [Op.in]: propiedades }, estado: 'Inspección completada' },
      attributes: ['propiedadCodigo', 'escriturasNombre', 'predialNombre', 'predialDatos'],
    })
    : [];
  const filesByProperty = new Map(solicitudes.map((item) => [item.propiedadCodigo, item]));
  return res.json(expedientes.map((item) => {
    const data = item.get({ plain: true });
    const files = filesByProperty.get(item.propiedadId);
    data.documentos = {
      escrituras: files?.escriturasNombre || null,
      predial: files?.predialNombre || null,
      predialOficialPdf: files?.predialDatos?.startsWith('data:application/pdf;base64,') || false,
    };
    return data;
  }));
});

app.get('/api/expedientes-legales/:id', authenticate, allow('responsable_legal'), async (req, res) => {
  const expediente = await ExpedienteLegal.findByPk(req.params.id, {
    include: [{ model: Propiedad, as: 'propiedad', include: propertyIncludes }],
  });
  if (!expediente) return fail(res, 404, 'No se encontró el expediente legal.');
  const solicitud = await SolicitudVenta.findOne({
    where: { propiedadCodigo: expediente.propiedadId, estado: 'Inspección completada' },
    attributes: ['escriturasNombre', 'escriturasDatos', 'predialNombre', 'predialDatos'],
  });
  const tramite = await Tramite.findOne({
    where: { propiedadCodigo: expediente.propiedadId },
    include: [{ model: Usuario, as: 'comprador', attributes: ['id', 'nombre', 'email'] }],
    order: [['createdAt', 'DESC']],
  });
  return res.json({
    ...expediente.get({ plain: true }),
    archivos: {
      escrituras: solicitud?.escriturasDatos ? { nombre: solicitud.escriturasNombre, data: solicitud.escriturasDatos } : null,
      estadoCuentaCatastral: solicitud?.predialDatos ? { nombre: solicitud.predialNombre, data: solicitud.predialDatos } : null,
      comprobanteComprador: tramite ? { nombre: tramite.comprobanteNombre, data: tramite.comprobanteDatos, comprador: tramite.comprador } : null,
    },
  });
});

app.put('/api/expedientes-legales/:id/dictamen', authenticate, allow('responsable_legal'), async (req, res) => {
  const {
    estatusPredial, estatusEscrituras, estatusDictamenGeneral,
    comentariosJuridicos, confirmoNoAdeudo5Anos,
  } = req.body || {};
  const predialStatuses = ['Pendiente', 'Aprobado', 'Rechazado'];
  const deedStatuses = ['Pendiente', 'En Revisión', 'Libre de Gravamen', 'Observado'];
  const decisionStatuses = ['En Auditoría', 'Aprobado para Notaría', 'Rechazado'];
  if (
    !predialStatuses.includes(estatusPredial) ||
    !deedStatuses.includes(estatusEscrituras) ||
    !decisionStatuses.includes(estatusDictamenGeneral) ||
    (comentariosJuridicos != null && (typeof comentariosJuridicos !== 'string' || comentariosJuridicos.length > 5000))
  ) return fail(res, 400, 'Revisa los estados y las observaciones jurídicas.');

  const requiereMotivo = estatusDictamenGeneral === 'Rechazado'
    || estatusPredial === 'Rechazado'
    || estatusEscrituras === 'Observado';
  if (requiereMotivo && !comentariosJuridicos?.trim()) {
    return fail(res, 400, 'Registra el motivo del rechazo u observación en los comentarios jurídicos.');
  }
  const expediente = await ExpedienteLegal.findByPk(req.params.id);
  if (!expediente) return fail(res, 404, 'No se encontró el expediente legal.');

  const solicitud = await SolicitudVenta.findOne({
    where: { propiedadCodigo: expediente.propiedadId, estado: 'Inspección completada' },
    attributes: ['escriturasDatos', 'predialDatos'],
  });
  if (estatusPredial === 'Aprobado') {
    if (!solicitud?.predialDatos?.startsWith('data:application/pdf;base64,')) {
      return fail(res, 409, 'Para aprobar el predial se requiere el Estado de Cuenta Catastral Oficial en PDF.');
    }
    if (confirmoNoAdeudo5Anos !== true) {
      return fail(res, 400, 'Confirma que el estado de cuenta oficial acredita no adeudo municipal de los últimos cinco años.');
    }
  }
  if (estatusEscrituras === 'Libre de Gravamen' && !solicitud?.escriturasDatos) {
    return fail(res, 409, 'Para dictaminar las escrituras se requiere el documento cargado en el expediente.');
  }
  if (
    estatusDictamenGeneral === 'Aprobado para Notaría' &&
    (estatusPredial !== 'Aprobado' || estatusEscrituras !== 'Libre de Gravamen')
  ) return fail(res, 409, 'Aprueba primero el predial y confirma que las escrituras están libres de gravamen.');

  await sequelize.transaction(async (transaction) => {
    const propiedad = await Propiedad.findByPk(expediente.propiedadId, { transaction, lock: true });
    await expediente.update({
      estatusPredial,
      estatusEscrituras,
      estatusDictamenGeneral,
      comentariosJuridicos: comentariosJuridicos?.trim() || null,
    }, { transaction });
    await propiedad.update({
      publicada: estatusDictamenGeneral === 'Aprobado para Notaría',
    }, { transaction });
  });
  return res.json(expediente);
});

app.get('/api/visitas', authenticate, allow('comprador', 'propietario', 'asesor'), async (req, res) => {
  const isAdvisor = req.user.rol === 'asesor';
  const propertyInclude = {
    model: Propiedad,
    as: 'propiedad',
    attributes: ['codigo', 'titulo', 'direccion', 'zona', 'precio', 'tipoOperacion', 'estatus'],
    ...(isAdvisor ? { where: { asesorId: req.user.id }, required: true } : {}),
  };
  const include = [propertyInclude];
  if (isAdvisor) include.push({ model: Usuario, as: 'cliente', attributes: ['id', 'nombre'] });
  const visitas = await VisitaPropiedad.findAll({
    where: isAdvisor ? {} : { clienteId: req.user.id, clienteDescarto: false },
    include,
    order: [['fechaCita', 'ASC'], ['horaCita', 'ASC']],
  });
  return res.json(visitas);
});

app.post('/api/visitas', authenticate, allow('comprador', 'propietario'), async (req, res) => {
  const { propiedadCodigo, fechaCita, horaCita, telefono, notas } = req.body || {};
  if (
    typeof propiedadCodigo !== 'string' || !propiedadCodigo.trim() ||
    typeof fechaCita !== 'string' || typeof horaCita !== 'string' ||
    !validFutureAppointment(fechaCita, horaCita) ||
    typeof telefono !== 'string' || telefono.trim().length < 7 || telefono.trim().length > 40 ||
    (notas != null && (typeof notas !== 'string' || notas.length > 500))
  ) {
    return fail(res, 400, 'Revisa tus datos de contacto y elige una fecha y hora futuras para la visita.');
  }
  const propiedad = await Propiedad.findByPk(propiedadCodigo.trim());
  if (!propiedad) return fail(res, 404, 'No se encontró la propiedad.');
  if (!propiedad.publicada || propiedad.estatus !== 'Disponible') return fail(res, 409, 'Esta propiedad todavía no está publicada o ya no está disponible para agendar visitas.');
  const visita = await VisitaPropiedad.create({
    clienteId: req.user.id,
    propiedadCodigo: propiedad.codigo,
    fechaCita,
    horaCita,
    telefono: telefono.trim(),
    notas: notas?.trim() || null,
  });
  const saved = await VisitaPropiedad.findByPk(visita.id, {
    include: [{ model: Propiedad, as: 'propiedad', attributes: ['codigo', 'titulo', 'direccion', 'zona', 'precio', 'tipoOperacion'] }],
  });
  return res.status(201).json(saved);
});

app.put('/api/visitas/:id', authenticate, allow('asesor'), async (req, res) => {
  const { estado } = req.body || {};
  if (!['Confirmada', 'Rechazada'].includes(estado)) {
    return fail(res, 400, 'El estado de la cita debe ser Confirmada o Rechazada.');
  }
  const visita = await VisitaPropiedad.findByPk(req.params.id);
  if (!visita) return fail(res, 404, 'No se encontró la cita.');
  const assignedProperty = await Propiedad.findOne({
    where: { codigo: visita.propiedadCodigo, asesorId: req.user.id },
    attributes: ['codigo'],
  });
  if (!assignedProperty) return fail(res, 404, 'No se encontró la cita.');
  if (visita.clienteDescarto) return fail(res, 409, 'El cliente ya descartó esta propiedad.');
  if (visita.estado !== 'Solicitada') return fail(res, 409, 'Solo se pueden responder citas que estén solicitadas.');
  await visita.update({ estado });
  return res.json(visita);
});

app.put('/api/visitas/:id/decision', authenticate, allow('comprador', 'propietario'), async (req, res) => {
  if (req.body?.decision !== 'descartar') return fail(res, 400, 'La decisión debe ser descartar.');
  const visita = await VisitaPropiedad.findOne({
    where: { id: req.params.id, clienteId: req.user.id },
    include: [{ model: Propiedad, as: 'propiedad', attributes: ['codigo', 'tipoOperacion'] }],
  });
  if (!visita) return fail(res, 404, 'No se encontró la cita.');
  if (visita.estado === 'Rechazada') return fail(res, 409, 'El asesor rechazó esta cita.');
  if (visita.estado !== 'Confirmada' && validFutureAppointment(visita.fechaCita, visita.horaCita)) {
    return fail(res, 409, 'Podrás descartar la propiedad cuando el asesor confirme la visita.');
  }
  const apartadoActivo = await Tramite.findOne({
    where: {
      propiedadCodigo: visita.propiedadCodigo,
      compradorId: req.user.id,
      estado: { [Op.in]: ['Pendiente Aprobación', 'Aprobado'] },
    },
    attributes: ['id'],
  });
  if (apartadoActivo) return fail(res, 409, 'Ya tienes un apartado activo para esta propiedad.');
  if (visita.clienteDescarto) return fail(res, 409, 'Ya descartaste esta propiedad.');
  await visita.update({ clienteDescarto: true });
  return res.json({ ok: true });
});

app.get('/api/usuarios/propietarios', authenticate, allow('asesor', 'gerente'), async (req, res) => {
  const propietarios = await Usuario.findAll({ where: { rol: { [Op.in]: ['comprador', 'propietario'] } }, order: [['nombre', 'ASC']] });
  res.json(propietarios.map(publicUser));
});

app.get('/api/usuarios/asesores', authenticate, allow('gerente'), async (req, res) => {
  const asesores = await Usuario.findAll({ where: { rol: 'asesor' }, order: [['nombre', 'ASC']] });
  res.json(asesores.map(publicUser));
});

app.get('/api/solicitudes-venta', authenticate, async (req, res) => {
  const where = {};
  if (['comprador', 'propietario'].includes(req.user.rol)) where.propietarioId = req.user.id;
  if (req.user.rol === 'asesor') where.asesorId = req.user.id;
  const solicitudes = await SolicitudVenta.findAll({
    where,
    attributes: {
      exclude: ['galeriaDatos', 'escriturasDatos', 'predialDatos'],
    },
    include: [
      { model: Usuario, as: 'propietario', attributes: ['id', 'nombre', 'email', 'telefono'] },
      { model: Usuario, as: 'asesor', attributes: ['id', 'nombre', 'email', 'telefono'] },
      {
        model: Propiedad,
        as: 'propiedad',
        attributes: ['codigo', 'titulo', 'tipoOperacion', 'estatus', 'publicada'],
        include: [{ model: ExpedienteLegal, as: 'expedienteLegal', attributes: ['estatusDictamenGeneral'] }],
      },
    ],
    order: [['createdAt', 'DESC']],
  });
  res.json(solicitudes.map((solicitud) => {
    const data = solicitud.get({ plain: true });
    data.galeriaCantidad = JSON.parse(data.galeriaNombres || '[]').length;
    if (req.user.rol === 'gerente') {
      delete data.galeriaNombres;
      delete data.escriturasNombre;
      delete data.predialNombre;
    }
    return data;
  }));
});

app.post('/api/solicitudes-venta', authenticate, allow('comprador', 'propietario'), async (req, res) => {
  const { telefono, direccion, zona, tipoPropiedad, fechaCita, horaCita, notas } = req.body || {};
  const tipoOperacion = req.body?.tipoOperacion || 'Venta';
  if (
    !OPERATION_TYPES.includes(tipoOperacion) ||
    typeof telefono !== 'string' || telefono.trim().length < 7 || telefono.trim().length > 40 ||
    typeof direccion !== 'string' || !direccion.trim() || direccion.trim().length > 240 ||
    typeof zona !== 'string' || !zona.trim() || zona.trim().length > 100 ||
    typeof tipoPropiedad !== 'string' || !tipoPropiedad.trim() || tipoPropiedad.trim().length > 60 ||
    typeof fechaCita !== 'string' || typeof horaCita !== 'string' ||
    !validFutureAppointment(fechaCita, horaCita) ||
    (notas != null && (typeof notas !== 'string' || notas.length > 500))
  ) {
    return fail(res, 400, 'Revisa tus datos y elige una fecha y hora futuras para la visita.');
  }
  const solicitud = await SolicitudVenta.create({
    propietarioId: req.user.id,
    telefono: telefono.trim(),
    tipoOperacion,
    direccion: direccion.trim(),
    zona: zona.trim(),
    tipoPropiedad: tipoPropiedad.trim(),
    fechaCita,
    horaCita,
    notas: notas?.trim() || null,
  });
  const saved = await SolicitudVenta.findByPk(solicitud.id, {
    include: [{ model: Usuario, as: 'propietario', attributes: ['id', 'nombre', 'email', 'telefono'] }],
  });
  res.status(201).json(saved);
});

app.put('/api/solicitudes-venta/:id/asignacion', authenticate, allow('gerente'), async (req, res) => {
  const asesorId = Number(req.body?.asesorId);
  if (!Number.isInteger(asesorId) || asesorId < 1) return fail(res, 400, 'Selecciona un asesor válido.');
  const asesor = await Usuario.findOne({ where: { id: asesorId, rol: 'asesor' } });
  if (!asesor) return fail(res, 400, 'El usuario seleccionado no es asesor.');
  const solicitud = await SolicitudVenta.findByPk(req.params.id);
  if (!solicitud) return fail(res, 404, 'No se encontró la solicitud de venta.');
  if (solicitud.estado === 'Inspección completada') return fail(res, 409, 'La inspección de esta propiedad ya fue completada.');
  await solicitud.update({ asesorId, estado: 'Asignada' });
  return res.json({ ok: true });
});

app.put('/api/solicitudes-venta/:id/inspeccion', authenticate, allow('asesor'), async (req, res) => {
  const {
    titulo, zona, precio, recamaras, banos, superficieTerreno,
    superficieConstruccion, cocheras, detallesInspeccion, galeria, escrituras, predial,
  } = req.body || {};
  if (
    typeof titulo !== 'string' || !titulo.trim() || titulo.trim().length > 160 ||
    typeof zona !== 'string' || !zona.trim() || zona.trim().length > 100 ||
    !Number.isInteger(Number(precio)) || Number(precio) <= 0 ||
    !Number.isInteger(Number(recamaras)) || Number(recamaras) < 0 ||
    !Number.isFinite(Number(banos)) || Number(banos) < 0 ||
    !Number.isFinite(Number(superficieTerreno)) || Number(superficieTerreno) <= 0 ||
    !Number.isFinite(Number(superficieConstruccion)) || Number(superficieConstruccion) <= 0 ||
    !Number.isInteger(Number(cocheras)) || Number(cocheras) < 0 ||
    (detallesInspeccion != null && (typeof detallesInspeccion !== 'string' || detallesInspeccion.length > 1000)) ||
    !validInspectionFiles(galeria, escrituras, predial)
  ) {
    return fail(res, 400, 'Completa los datos técnicos y adjunta entre 1 y 8 fotos, las escrituras y el Estado de Cuenta Catastral oficial en PDF. Cada foto debe pesar hasta 1.5 MB y cada documento hasta 4 MB.');
  }
  try {
    const propiedad = await sequelize.transaction(async (transaction) => {
      const solicitud = await SolicitudVenta.findByPk(req.params.id, { transaction, lock: true });
      if (!solicitud) {
        const error = new Error('No se encontró la solicitud de venta.');
        error.status = 404;
        throw error;
      }
      if (solicitud.asesorId !== req.user.id) {
        const error = new Error('Solo el asesor asignado puede completar esta inspección.');
        error.status = 403;
        throw error;
      }
      if (solicitud.estado !== 'Asignada') {
        const error = new Error('La solicitud debe estar asignada y pendiente de inspección.');
        error.status = 409;
        throw error;
      }
      const codigo = `CF-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
      const creada = await Propiedad.create({
        codigo,
        titulo: titulo.trim(),
        direccion: solicitud.direccion,
        zona: zona.trim(),
        precio: Number(precio),
        tipoOperacion: solicitud.tipoOperacion,
        recamaras: Number(recamaras),
        banos: Number(banos),
        metrosCuadrados: Number(superficieConstruccion),
        superficieTerreno: Number(superficieTerreno),
        superficieConstruccion: Number(superficieConstruccion),
        cocheras: Number(cocheras),
        estatus: 'Disponible',
        publicada: false,
        fotoPrincipal: galeria[0].data,
        tieneFotoPrincipal: true,
        asesorId: req.user.id,
        propietarioId: solicitud.propietarioId,
      }, { transaction });
      await solicitud.update({
        estado: 'Inspección completada',
        titulo: titulo.trim(),
        zona: zona.trim(),
        precio: Number(precio),
        recamaras: Number(recamaras),
        banos: Number(banos),
        metrosCuadrados: Number(superficieConstruccion),
        superficieTerreno: Number(superficieTerreno),
        superficieConstruccion: Number(superficieConstruccion),
        cocheras: Number(cocheras),
        detallesInspeccion: detallesInspeccion?.trim() || null,
        propiedadCodigo: creada.codigo,
        galeriaNombres: JSON.stringify(galeria.map((file) => file.name.trim())),
        galeriaDatos: JSON.stringify(galeria.map((file) => file.data)),
        escriturasNombre: escrituras.name.trim(),
        escriturasDatos: escrituras.data,
        predialNombre: predial.name.trim(),
        predialDatos: predial.data,
        revisionAdministrativa: 'Pendiente de revisión administrativa',
      }, { transaction });
      await ExpedienteLegal.findOrCreate({
        where: { propiedadId: creada.codigo },
        transaction,
      });
      return creada;
    });
    return res.status(201).json({ ok: true, propiedad });
  } catch (error) {
    return fail(res, error.status || 500, error.status ? error.message : 'No se pudo guardar la inspección.');
  }
});

app.get('/api/solicitudes-venta/:id/archivos', authenticate, async (req, res) => {
  const solicitud = await SolicitudVenta.findByPk(req.params.id);
  if (!solicitud) return fail(res, 404, 'No se encontró la solicitud de venta.');
  const esPropietario = ['comprador', 'propietario'].includes(req.user.rol) && solicitud.propietarioId === req.user.id;
  const esAsesorAsignado = req.user.rol === 'asesor' && solicitud.asesorId === req.user.id;
  if (!esPropietario && !esAsesorAsignado) return fail(res, 403, 'No tienes permiso para consultar este expediente.');
  return res.json({
    galeria: JSON.parse(solicitud.galeriaDatos || '[]').map((data, index) => ({
      nombre: JSON.parse(solicitud.galeriaNombres || '[]')[index],
      data,
    })),
    escrituras: solicitud.escriturasDatos ? { nombre: solicitud.escriturasNombre, data: solicitud.escriturasDatos } : null,
    predial: solicitud.predialDatos ? { nombre: solicitud.predialNombre, data: solicitud.predialDatos } : null,
    revisionAdministrativa: solicitud.revisionAdministrativa,
  });
});

app.get('/api/tramites', authenticate, allow('comprador', 'propietario', 'asesor', 'gerente', 'responsable_legal'), async (req, res) => {
  const where = {};
  if (['comprador', 'propietario'].includes(req.user.rol)) where.compradorId = req.user.id;
  if (req.user.rol === 'asesor') where.asesorId = req.user.id;
  if (req.user.rol === 'responsable_legal') {
    where.estado = 'Aprobado';
    where.estadoDocumentacion = 'En Revisión';
  }
  if (req.query.estado) where.estado = String(req.query.estado);
  const tramites = await Tramite.findAll({
    where,
    attributes: {
      exclude: [
        'comprobanteDatos',
        'documentosComprador',
        ...(req.user.rol === 'asesor'
          ? [
            'esquemaPago',
            'nombreComprador',
            'correoComprador',
            'telefonoComprador',
            'propuestaEconomica',
            'documentosCompradorResumen',
            'comentariosDocumentacion',
          ]
          : []),
        ...(req.user.rol === 'responsable_legal'
          ? [
            'correoComprador',
            'telefonoComprador',
            'propuestaEconomica',
            'esquemaPago',
            'metodoPago',
            'estadoFinanciamiento',
            'fechaFirma',
            'horaFirma',
            'notaria',
            'estadoFirma',
            'fechaResultadoFirma',
          ]
          : []),
      ],
    },
    include: [
      {
        model: Propiedad,
        as: 'propiedad',
        include: [...propertyIncludes, { model: ExpedienteLegal, as: 'expedienteLegal', attributes: ['estatusDictamenGeneral'] }],
      },
      { model: Usuario, as: 'comprador', attributes: ['id', 'nombre', 'rol'] },
      { model: Usuario, as: 'asesor', attributes: ['id', 'nombre', 'rol'] },
    ],
    order: [['createdAt', 'DESC']],
  });
  res.json(tramites.map((tramite) => {
    const data = tramite.toJSON();
    data.documentosComprador = JSON.parse(data.documentosCompradorResumen || '[]');
    delete data.documentosCompradorResumen;
    data.comprobanteRecibido = Boolean(data.comprobanteNombre && data.comprobanteNombre !== 'Pendiente de carga por el asesor');
    delete data.comprobanteDatos;
    return data;
  }));
});

app.post('/api/apartados', authenticate, allow('comprador', 'propietario'), async (req, res) => {
  const { propiedadCodigo, nombreComprador, correoComprador, telefonoComprador, propuestaEconomica } = req.body || {};
  try {
    await changeReservation(propiedadCodigo, 'solicitar', req.user, null, null, {
      nombreComprador,
      correoComprador,
      telefonoComprador,
      propuestaEconomica,
    });
    const tramite = await Tramite.findOne({
      where: { propiedadCodigo, compradorId: req.user.id, estado: 'Pendiente Aprobación' },
      include: [{ model: Propiedad, as: 'propiedad', include: propertyIncludes }],
      order: [['createdAt', 'DESC']],
    });
    return res.status(201).json(tramite);
  } catch (error) {
    return fail(res, error.status || 500, error.status ? error.message : 'No se pudo registrar el apartado.');
  }
});

app.get('/api/tramites/:id/comprobante', authenticate, async (req, res) => {
  const tramite = await Tramite.findByPk(req.params.id);
  if (!tramite) return fail(res, 404, 'No se encontró el apartado.');
  const authorized = req.user.rol === 'gerente' ||
    (req.user.rol === 'asesor' && tramite.asesorId === req.user.id) ||
    (['comprador', 'propietario'].includes(req.user.rol) && tramite.compradorId === req.user.id);
  if (!authorized) return fail(res, 404, 'No se encontró el apartado.');
  if (!validReceipt(tramite.comprobanteNombre, tramite.comprobanteDatos)) return fail(res, 404, 'El asesor todavía no ha cargado el comprobante.');
  return res.json({ nombre: tramite.comprobanteNombre, data: tramite.comprobanteDatos });
});

app.put('/api/tramites/:id/comprobante', authenticate, allow('asesor'), async (req, res) => {
  const { comprobanteNombre, comprobanteDatos } = req.body || {};
  if (!validReceipt(comprobanteNombre, comprobanteDatos)) return fail(res, 400, 'Adjunta un comprobante PDF, JPG o PNG válido (máximo 2 MB).');
  const tramite = await Tramite.findByPk(req.params.id);
  if (!tramite || tramite.asesorId !== req.user.id) return fail(res, 404, 'No se encontró el apartado asignado.');
  if (tramite.estado !== 'Pendiente Aprobación') return fail(res, 409, 'El comprobante solo se puede cargar mientras el apartado está pendiente.');
  await tramite.update({ comprobanteNombre, comprobanteDatos });
  return res.json({ ok: true, comprobanteRecibido: true });
});

app.put('/api/tramites/:id/metodo-pago', authenticate, allow('comprador', 'propietario'), async (req, res) => {
  const { metodoPago } = req.body || {};
  if (!PURCHASE_METHODS.includes(metodoPago)) return fail(res, 400, 'Selecciona contado, crédito bancario, Infonavit o Credix SOFOM.');
  const tramite = await Tramite.findOne({ where: { id: req.params.id, compradorId: req.user.id } });
  if (!tramite) return fail(res, 404, 'No se encontró tu apartado.');
  if (tramite.estado !== 'Aprobado') return fail(res, 409, 'Elige el método de pago después de que gerencia valide el apartado.');
  if (tramite.documentosComprador) {
    return fail(res, 409, 'El método de pago ya no puede cambiarse después de enviar la documentación.');
  }
  await tramite.update({
    metodoPago,
    estadoFinanciamiento: metodoPago === 'Contado' ? 'No requerido' : 'Pendiente',
    progreso: 50,
  });
  return res.json({ ok: true });
});

app.put('/api/tramites/:id/documentos', authenticate, allow('comprador', 'propietario'), async (req, res) => {
  const { documentos } = req.body || {};
  if (!validBuyerDocuments(documentos)) {
    return fail(res, 400, 'Adjunta una identificación oficial y al menos un documento financiero válido (PDF/JPG/PNG, máximo 4 MB por archivo y 20 MB en total).');
  }
  const tramite = await Tramite.findOne({ where: { id: req.params.id, compradorId: req.user.id } });
  if (!tramite) return fail(res, 404, 'No se encontró tu apartado.');
  if (tramite.estado !== 'Aprobado' || !PURCHASE_METHODS.includes(tramite.metodoPago)) {
    return fail(res, 409, 'Primero espera la validación del apartado y selecciona el método de pago.');
  }
  if (!['Pendiente', 'Observado'].includes(tramite.estadoDocumentacion)) {
    return fail(res, 409, 'La documentación ya fue enviada y está en revisión.');
  }
  await tramite.update({
    documentosComprador: JSON.stringify(documentos),
    documentosCompradorResumen: JSON.stringify(documentos.map(({ tipo, nombre }) => ({ tipo, nombre }))),
    estadoDocumentacion: 'En Revisión',
    comentariosDocumentacion: null,
    progreso: Math.max(Number(tramite.progreso) || 0, 60),
  });
  return res.json({ ok: true });
});

app.get('/api/tramites/:id/documentos', authenticate, async (req, res) => {
  if (!['comprador', 'propietario', 'responsable_legal'].includes(req.user.rol)) return fail(res, 403, 'Tu perfil no tiene permiso para consultar estos documentos.');
  const where = { id: req.params.id };
  if (['comprador', 'propietario'].includes(req.user.rol)) where.compradorId = req.user.id;
  const tramite = await Tramite.findOne({ where });
  if (!tramite) return fail(res, 404, 'No se encontró el apartado.');
  if (req.user.rol === 'responsable_legal' && tramite.estadoDocumentacion !== 'En Revisión') {
    return fail(res, 404, 'No se encontró documentación pendiente de revisión.');
  }
  return res.json({ documentos: JSON.parse(tramite.documentosComprador || '[]') });
});

app.put('/api/tramites/:id/documentos/revision', authenticate, allow('responsable_legal'), async (req, res) => {
  const { decision, comentarios } = req.body || {};
  if (!['Aprobado', 'Observado'].includes(decision) ||
    (comentarios != null && (typeof comentarios !== 'string' || comentarios.length > 1000)) ||
    (decision === 'Observado' && !comentarios?.trim())) {
    return fail(res, 400, 'Indica si apruebas u observas los documentos; las observaciones requieren comentarios.');
  }
  const tramite = await Tramite.findByPk(req.params.id);
  if (!tramite) return fail(res, 404, 'No se encontró el apartado.');
  if (tramite.estado !== 'Aprobado' || !tramite.documentosComprador || tramite.estadoDocumentacion !== 'En Revisión') {
    return fail(res, 409, 'No hay documentación pendiente de revisión para este apartado.');
  }
  await tramite.update({
    estadoDocumentacion: decision,
    comentariosDocumentacion: comentarios?.trim() || null,
    progreso: decision === 'Aprobado' && (tramite.estadoFinanciamiento === 'No requerido' || tramite.estadoFinanciamiento === 'Aprobado')
      ? 80
      : tramite.progreso,
  });
  return res.json({ ok: true });
});

app.put('/api/tramites/:id/financiamiento', authenticate, allow('asesor'), async (req, res) => {
  const { estadoFinanciamiento } = req.body || {};
  if (!['Aprobado', 'Rechazado'].includes(estadoFinanciamiento)) return fail(res, 400, 'Indica si la institución aprobó o rechazó el financiamiento.');
  const tramite = await Tramite.findByPk(req.params.id);
  if (!tramite || tramite.asesorId !== req.user.id) return fail(res, 404, 'No se encontró el apartado asignado.');
  if (!canAdvisorRecordFinancing(tramite, req.user.id)) {
    return fail(res, 409, 'El apartado debe tener documentos aprobados y un financiamiento pendiente.');
  }
  await tramite.update({
    estadoFinanciamiento,
    progreso: estadoFinanciamiento === 'Aprobado' ? 80 : tramite.progreso,
  });
  return res.json({ ok: true });
});

app.put('/api/tramites/:id/firma', authenticate, allow('asesor'), async (req, res) => {
  const { notaria, fechaFirma, horaFirma } = req.body || {};
  if (typeof notaria !== 'string' || !notaria.trim() || notaria.trim().length > 180 ||
    typeof fechaFirma !== 'string' || typeof horaFirma !== 'string' ||
    !validFutureAppointment(fechaFirma, horaFirma)) {
    return fail(res, 400, 'Indica una notaría y una fecha y hora futuras válidas para la firma.');
  }
  const tramite = await Tramite.findByPk(req.params.id);
  if (!tramite || tramite.asesorId !== req.user.id) return fail(res, 404, 'No se encontró el apartado asignado.');
  if (tramite.estadoFirma === 'Firmada') return fail(res, 409, 'La firma ya fue registrada como realizada.');
  if (!canAdvisorScheduleSigning(tramite, req.user.id)) {
    return fail(res, 409, 'La documentación y el financiamiento deben estar aprobados antes de programar la firma.');
  }
  await tramite.update({
    notaria: notaria.trim(),
    fechaFirma,
    horaFirma,
    progreso: Math.max(Number(tramite.progreso) || 0, 90),
  });
  return res.json({ ok: true });
});

app.put('/api/tramites/:id/resultado-firma', authenticate, allow('asesor'), async (req, res) => {
  const { estadoFirma, fechaResultadoFirma } = req.body || {};
  if (!['Firmada', 'No realizada'].includes(estadoFirma) || !validSigningOutcomeDate(fechaResultadoFirma)) {
    return fail(res, 400, 'Indica si la firma se realizó y registra una fecha válida que no sea futura.');
  }
  const tramite = await Tramite.findByPk(req.params.id);
  if (!tramite || tramite.asesorId !== req.user.id) return fail(res, 404, 'No se encontró el apartado asignado.');
  if (!canAdvisorRecordSigningOutcome(tramite, req.user.id) ||
    !validSigningOutcomeDate(fechaResultadoFirma, tramite.fechaFirma)) {
    return fail(res, 409, 'Solo puedes registrar el resultado después de la cita de firma programada.');
  }
  await tramite.update({
    estadoFirma,
    fechaResultadoFirma,
    progreso: estadoFirma === 'Firmada' ? 100 : 90,
  });
  return res.json({ ok: true, estadoFirma, fechaResultadoFirma });
});

app.put('/api/propiedades/:codigo', authenticate, async (req, res) => {
  const { accion, comprobanteNombre, comprobanteDatos, esquemaPago, nombreComprador, correoComprador, telefonoComprador, propuestaEconomica } = req.body || {};
  if (!['solicitar', 'aprobar', 'rechazar'].includes(accion)) return fail(res, 400, 'La acción debe ser solicitar, aprobar o rechazar.');
  try {
    const tramite = await changeReservation(req.params.codigo, accion, req.user, comprobanteNombre, comprobanteDatos, {
      esquemaPago,
      nombreComprador,
      correoComprador,
      telefonoComprador,
      propuestaEconomica,
    });
    return res.json({ ok: true, tramite });
  } catch (error) {
    return fail(res, error.status || 500, error.status ? error.message : 'No se pudo actualizar la propiedad.');
  }
});

app.use((error, req, res, next) => {
  console.error(error);
  if (error.type === 'entity.too.large') return fail(res, 413, 'El archivo adjunto supera el máximo permitido.');
  if (error instanceof SyntaxError && 'body' in error) return fail(res, 400, 'El cuerpo JSON no es válido.');
  return fail(res, 500, 'Ocurrió un error inesperado en el servidor.');
});

async function seedData() {
  const initializeDemoData = (await Usuario.count()) === 0;
  const demoUsers = [
    { nombre: 'María Elena Ramos', email: 'cliente@casafast.mx', rol: 'comprador', telefono: '667 111 0201' },
    { nombre: 'Carlos Mendoza', email: 'asesor@casafast.mx', rol: 'asesor', telefono: '667 111 0203' },
    { nombre: 'Andrea López', email: 'gerente@casafast.mx', rol: 'gerente', telefono: '667 111 0204' },
    { nombre: 'Elena Cruz', email: 'legal@casafast.mx', rol: 'responsable_legal', telefono: '667 111 0205' },
  ];
  const users = {};
  for (const data of demoUsers) {
    let user = await Usuario.unscoped().findOne({ where: { email: data.email } });
    if (!user) user = await Usuario.create({ ...data, passwordHash: hashPassword(DEMO_PASSWORD, data.email) });
    else if (user.passwordHash === hashPassword(LEGACY_DEMO_PASSWORD, data.email)) {
      await user.update({ passwordHash: hashPassword(DEMO_PASSWORD, data.email) });
    }
    users[data.rol] = user;
  }
  const secondClientEmail = 'cliente2@casafast.mx';
  const secondClient = await Usuario.unscoped().findOne({ where: { email: secondClientEmail } });
  if (!secondClient) {
    await Usuario.create({
      nombre: 'Sofía Torres',
      email: secondClientEmail,
      passwordHash: hashPassword(DEMO_PASSWORD, secondClientEmail),
      rol: 'comprador',
      telefono: null,
    });
  }
  const legacyCustomers = await Usuario.unscoped().findAll({
    where: { email: { [Op.in]: ['comprador@casafast.mx', 'propietario@casafast.mx'] } },
  });
  const legacyCustomerIds = legacyCustomers
    .filter((user) => user.id !== users.comprador.id)
    .map((user) => user.id);
  if (legacyCustomerIds.length) {
    await sequelize.transaction(async (transaction) => {
      await Propiedad.update(
        { propietarioId: users.comprador.id },
        { where: { propietarioId: { [Op.in]: legacyCustomerIds } }, transaction },
      );
      await Propiedad.update(
        { compradorId: users.comprador.id },
        { where: { compradorId: { [Op.in]: legacyCustomerIds } }, transaction },
      );
      await Tramite.update(
        { compradorId: users.comprador.id },
        { where: { compradorId: { [Op.in]: legacyCustomerIds } }, transaction },
      );
      await Usuario.destroy({ where: { id: { [Op.in]: legacyCustomerIds } }, transaction });
    });
  }
  users.propietario = users.comprador;
  if (initializeDemoData && await Propiedad.count() === 0) {
    const listings = [
      { codigo: 'CF-1029', titulo: 'Residencial La Campiña Premium', direccion: 'Av. Los Laureles 1450, Culiacán, Sinaloa', zona: 'La Campiña', precio: 3450000, estatus: 'Apartado', recamaras: 3, banos: 2.5, metrosCuadrados: 185, visitas: 42, ofertas: 3, asesorId: users.asesor.id, propietarioId: users.propietario.id, compradorId: users.comprador.id },
      { codigo: 'CF-1030', titulo: 'Casa moderna en Tres Ríos', direccion: 'Blvd. Enrique Sánchez Alonso 820, Culiacán, Sinaloa', zona: 'Tres Ríos', precio: 2890000, estatus: 'Pendiente Aprobación', recamaras: 3, banos: 2, metrosCuadrados: 160, visitas: 31, ofertas: 2, asesorId: users.asesor.id, propietarioId: users.propietario.id, compradorId: users.comprador.id },
      { codigo: 'CF-1031', titulo: 'Departamento con terraza', direccion: 'Av. Álvaro Obregón 620, Culiacán, Sinaloa', zona: 'Centro', precio: 1950000, recamaras: 2, banos: 2, metrosCuadrados: 98, visitas: 18, ofertas: 1, asesorId: users.asesor.id, propietarioId: users.propietario.id },
      { codigo: 'CF-1032', titulo: 'Casa familiar Las Quintas', direccion: 'Río Fuerte 112, Culiacán, Sinaloa', zona: 'Las Quintas', precio: 4200000, recamaras: 4, banos: 3, metrosCuadrados: 240, visitas: 56, ofertas: 4, asesorId: users.asesor.id },
      { codigo: 'CF-1033', titulo: 'Residencia con jardín', direccion: 'Paseo del Roble 51, Culiacán, Sinaloa', zona: 'La Primavera', precio: 5150000, recamaras: 4, banos: 3.5, metrosCuadrados: 310, visitas: 24, ofertas: 2, asesorId: users.asesor.id },
    ];
    await Propiedad.bulkCreate(listings);
  }
  if (initializeDemoData && await Tramite.count() === 0) {
    await Tramite.bulkCreate([
      { propiedadCodigo: 'CF-1029', compradorId: users.comprador.id, asesorId: users.asesor.id, estado: 'Aprobado', comprobanteNombre: 'comprobante-apartado.pdf', comprobanteDatos: 'data:application/pdf;base64,JVBERi0xLjQ=', montoApartado: 50000, progreso: 60, notaria: 'Notaría Pública No. 142, Culiacán' },
      { propiedadCodigo: 'CF-1030', compradorId: users.comprador.id, asesorId: users.asesor.id, estado: 'Pendiente Aprobación', comprobanteNombre: 'comprobante-transferencia.png', comprobanteDatos: 'data:image/png;base64,aGVsbG8=', montoApartado: 50000, progreso: 20 },
    ]);
  }
}

async function ensureLegalExpedientes() {
  const propiedades = await Propiedad.findAll({ attributes: ['codigo'] });
  for (const propiedad of propiedades) {
    await ExpedienteLegal.findOrCreate({ where: { propiedadId: propiedad.codigo } });
  }
}

async function ensurePropertyColumns() {
  const columns = await sequelize.getQueryInterface().describeTable('Propiedads');
  const missingColumns = {
    zona: { type: DataTypes.STRING(100), allowNull: false, defaultValue: '' },
    recamaras: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    banos: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 },
    metrosCuadrados: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 },
    superficieTerreno: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 },
    superficieConstruccion: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 },
    cocheras: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    visitas: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    ofertas: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    tipoOperacion: { type: DataTypes.ENUM(...OPERATION_TYPES), allowNull: false, defaultValue: 'Venta' },
    publicada: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    fotoPrincipal: { type: DataTypes.TEXT, allowNull: true },
    tieneFotoPrincipal: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    asesorId: { type: DataTypes.INTEGER, allowNull: true },
    propietarioId: { type: DataTypes.INTEGER, allowNull: true },
    compradorId: { type: DataTypes.INTEGER, allowNull: true },
  };
  for (const [name, definition] of Object.entries(missingColumns)) {
    if (!columns[name]) await sequelize.getQueryInterface().addColumn('Propiedads', name, definition);
  }
}

async function backfillPropertyMainPhotos() {
  const propertiesWithoutPhoto = await Propiedad.unscoped().findAll({
    where: { fotoPrincipal: null },
    attributes: ['codigo'],
  });
  if (!propertiesWithoutPhoto.length) return;
  const propertyCodes = propertiesWithoutPhoto.map((property) => property.codigo);
  const requests = await SolicitudVenta.findAll({
    where: {
      propiedadCodigo: { [Op.in]: propertyCodes },
      estado: 'Inspección completada',
    },
    attributes: ['propiedadCodigo', 'galeriaDatos'],
    order: [['createdAt', 'DESC']],
  });
  const updatedProperties = new Set();
  for (const requestItem of requests) {
    if (updatedProperties.has(requestItem.propiedadCodigo)) continue;
    const firstPhoto = JSON.parse(requestItem.galeriaDatos || '[]')[0];
    if (typeof firstPhoto !== 'string') continue;
    await Propiedad.unscoped().update({
      fotoPrincipal: firstPhoto,
      tieneFotoPrincipal: true,
    }, { where: { codigo: requestItem.propiedadCodigo, fotoPrincipal: null } });
    updatedProperties.add(requestItem.propiedadCodigo);
  }
}

async function ensureReservationColumns() {
  const columns = await sequelize.getQueryInterface().describeTable('Apartados');
  const missingColumns = {
    esquemaPago: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'Contado' },
    nombreComprador: { type: DataTypes.STRING(120), allowNull: true },
    correoComprador: { type: DataTypes.STRING(160), allowNull: true },
    telefonoComprador: { type: DataTypes.STRING(40), allowNull: true },
    propuestaEconomica: { type: DataTypes.INTEGER, allowNull: true },
    metodoPago: { type: DataTypes.STRING(40), allowNull: true },
    estadoFinanciamiento: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'Pendiente' },
    documentosComprador: { type: DataTypes.TEXT, allowNull: true },
    documentosCompradorResumen: { type: DataTypes.TEXT, allowNull: true },
    estadoDocumentacion: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'Pendiente' },
    comentariosDocumentacion: { type: DataTypes.STRING(1000), allowNull: true },
    fechaFirma: { type: DataTypes.DATEONLY, allowNull: true },
    horaFirma: { type: DataTypes.STRING(5), allowNull: true },
    estadoFirma: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'Pendiente' },
    fechaResultadoFirma: { type: DataTypes.DATEONLY, allowNull: true },
  };
  for (const [name, definition] of Object.entries(missingColumns)) {
    if (!columns[name]) await sequelize.getQueryInterface().addColumn('Apartados', name, definition);
  }
  await Tramite.update({ estadoFirma: 'Pendiente' }, { where: { estadoFirma: null } });
  await Tramite.update({ progreso: 90 }, {
    where: {
      fechaFirma: { [Op.ne]: null },
      estadoFirma: 'Pendiente',
      progreso: 100,
    },
  });
}

async function ensureSaleRequestColumns() {
  const columns = await sequelize.getQueryInterface().describeTable('SolicitudesVenta');
  const missingColumns = {
    tipoOperacion: { type: DataTypes.ENUM(...OPERATION_TYPES), allowNull: false, defaultValue: 'Venta' },
    superficieTerreno: { type: DataTypes.FLOAT, allowNull: true },
    superficieConstruccion: { type: DataTypes.FLOAT, allowNull: true },
    cocheras: { type: DataTypes.INTEGER, allowNull: true },
    galeriaNombres: { type: DataTypes.TEXT, allowNull: true },
    galeriaDatos: { type: DataTypes.TEXT, allowNull: true },
    escriturasNombre: { type: DataTypes.STRING(180), allowNull: true },
    escriturasDatos: { type: DataTypes.TEXT, allowNull: true },
    predialNombre: { type: DataTypes.STRING(180), allowNull: true },
    predialDatos: { type: DataTypes.TEXT, allowNull: true },
    revisionAdministrativa: { type: DataTypes.STRING(60), allowNull: true },
  };
  for (const [name, definition] of Object.entries(missingColumns)) {
    if (!columns[name]) await sequelize.getQueryInterface().addColumn('SolicitudesVenta', name, definition);
  }
}

async function ensurePropertyVisitColumns() {
  const columns = await sequelize.getQueryInterface().describeTable('VisitasPropiedad');
  const missingColumns = {
    telefono: { type: DataTypes.STRING(40), allowNull: false, defaultValue: '' },
    notas: { type: DataTypes.STRING(500), allowNull: true },
    clienteDescarto: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  };
  for (const [name, definition] of Object.entries(missingColumns)) {
    if (!columns[name]) await sequelize.getQueryInterface().addColumn('VisitasPropiedad', name, definition);
  }
}

async function start() {
  try {
    await sequelize.sync();
    await ensurePropertyColumns();
    await ensureReservationColumns();
    await ensureSaleRequestColumns();
    await backfillPropertyMainPhotos();
    await ensurePropertyVisitColumns();
    await seedData();
    await ensureLegalExpedientes();
    const frontendDist = path.join(__dirname, '..', 'casafast', 'dist');
    app.use(express.static(frontendDist));
    app.use((req, res, next) => {
      if (req.method === 'GET' && req.accepts('html')) {
        return res.sendFile(path.join(frontendDist, 'index.html'));
      }
      return next();
    });
    app.listen(PORT, '0.0.0.0', () => console.log(`CASAFAST disponible en http://localhost:${PORT}`));
  } catch (error) {
    console.error('No fue posible iniciar CASAFAST:', error);
    process.exitCode = 1;
  }
}

if (require.main === module) start();

module.exports = {
  app,
  sequelize,
  start,
  validBuyerDocuments,
  canAdvisorRecordFinancing,
  canAdvisorScheduleSigning,
  canAdvisorRecordSigningOutcome,
  validSigningOutcomeDate,
};
