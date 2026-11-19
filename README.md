# CASAFAST

Aplicación local PropTech con React/Vite, Express, Sequelize y SQLite.

## Requisitos

- Node.js 20.19+ (Vite 8) o una versión compatible con la instalación de Vite.
- Dependencias instaladas en `backend` y `frontend`.

## Iniciar en Visual Studio Code

Abre dos terminales en la carpeta del proyecto:

```powershell
cd backend
npm run dev
```

```powershell
cd frontend
npm run dev
```

Abre la URL que indique Vite (normalmente `http://localhost:5173`). Vite reenvía `/api` al servidor Express en el puerto 5000. SQLite se crea y conserva en `backend/casafast_local.sqlite`.

## Cuentas de demostración

Las cuentas se crean automáticamente al arrancar el backend. Todas usan la contraseña `app123`.

| Perfil | Correo |
|---|---|
| Cliente (puede comprar, vender y ofrecer en renta) | `cliente@casafast.mx` |
| Cliente nuevo (sin propiedades ni trámites) | `cliente2@casafast.mx` |
| Asesor | `asesor@casafast.mx` |
| Gerente | `gerente@casafast.mx` |
| Responsable Legal | `legal@casafast.mx` |

En una base de datos nueva se crean inmuebles y trámites de demostración; si ya existen usuarios, una lista vacía se conserva al reiniciar. Los antiguos usuarios demo de comprador y propietario se consolidan en la cuenta `cliente@casafast.mx`; las propiedades y los trámites asociados se conservan. El cliente puede solicitar una visita para ofrecer su propiedad en venta o renta. El gerente asigna la solicitud a un asesor; después de la visita, el asesor registra los datos y documentos. Las propiedades, tanto en venta como en renta, permanecen ocultas hasta que el Responsable Legal apruebe el predial y las escrituras y emita el dictamen "Aprobado para Notaría".

El panel del gerente permite revisar solicitudes para venta o renta y asignar asesores. En la visita, el asesor registra superficie de terreno y construcción, recámaras, baños, cocheras, una galería de hasta 8 fotografías y los archivos de escrituras y predial. En el catálogo, la renta se muestra como precio mensual y los interesados pueden solicitar una visita; los apartados en línea solo están disponibles para propiedades en venta. El dictamen legal publica la propiedad únicamente cuando predial y escrituras estén aprobados; una auditoría pendiente o un rechazo la mantiene oculta. El cliente y el asesor asignado pueden consultar los archivos; el gerente solo recibe la información y el estado del dictamen.

Las fotos aceptan JPG, PNG o WebP (hasta 1.5 MB cada una); las escrituras aceptan PDF, JPG o PNG y el Estado de Cuenta Catastral oficial debe ser PDF (hasta 4 MB cada uno). El límite combinado es 20 MB. Estos archivos se guardan en la base SQLite local junto con la información de la solicitud. El Responsable Legal es el único perfil que puede aprobar el predial y las escrituras; se requiere dictamen "Aprobado para Notaría" para que el gerente apruebe un apartado.

En la compra, el cliente registra sus datos y una propuesta económica; el inmueble se bloquea como pendiente mientras el asesor carga el comprobante del anticipo y gerencia valida que el pago se recibió. Tras aprobar el apartado, el cliente elige contado, crédito bancario, Infonavit o Credix SOFOM y sube una identificación oficial y al menos un documento financiero (PDF/JPG/PNG, hasta 4 MB por archivo y 20 MB en total). Gerencia revisa el expediente y registra manualmente la respuesta de la institución financiera; no hay conexión automática con bancos, Infonavit ni Credix. Solo con documentos y financiamiento aprobados se puede programar notaría, fecha y hora de firma.

## API principal

- `POST /api/login`, `GET /api/me`, `POST /api/logout`
- `GET /api/propiedades`, `GET /api/propiedades/:codigo`, `POST /api/propiedades`
- `PUT /api/propiedades/:codigo` con `accion: solicitar | aprobar | rechazar`
- `POST /api/apartados` (cliente: datos de contacto y propuesta en MXN; bloquea la propiedad como `Pendiente Aprobación` en una transacción)
- `PUT /api/tramites/:id/comprobante` y `GET /api/tramites/:id/comprobante` (asesor: carga; asesor, cliente titular o gerente: consulta el comprobante)
- `PUT /api/tramites/:id/metodo-pago`, `PUT /api/tramites/:id/documentos` y `GET /api/tramites/:id/documentos` (cliente: selección de método y entrega de expediente después de validar el apartado)
- `PUT /api/tramites/:id/documentos/revision`, `PUT /api/tramites/:id/financiamiento` y `PUT /api/tramites/:id/firma` (gerente: revisión administrativa, captura del resultado financiero y programación de firma)
- `GET /api/visitas` (cliente: sus solicitudes; asesor: citas de propiedades asignadas), `POST /api/visitas`, `PUT /api/visitas/:id` (asesor: confirmar o rechazar cita) y `PUT /api/visitas/:id/decision` (cliente: descartar una visita confirmada o ya realizada)
- El cliente puede descartar una propiedad en cuanto el asesor confirma la visita; al solicitar un apartado, el asesor carga el comprobante del anticipo y gerencia valida el pago. Al descartar, la propiedad deja de aparecer en sus visitas del perfil.
- `GET /api/asesor/propiedades` (cartera asignada y estatus legal, solo asesor)
- `GET /api/tramites`
- `POST /api/solicitudes-venta` (`tipoOperacion: Venta | Renta`), `GET /api/solicitudes-venta`
- `PUT /api/solicitudes-venta/:id/asignacion` (gerente), `PUT /api/solicitudes-venta/:id/inspeccion` (asesor) y `GET /api/solicitudes-venta/:id/archivos` (propietario o asesor asignado)
- `GET /api/expedientes-legales`, `GET /api/expedientes-legales/:id`, `PUT /api/expedientes-legales/:id/dictamen` (Responsable Legal)

La autenticación de demostración usa tokens en memoria: al reiniciar el backend se deben iniciar sesiones de nuevo. Para producción, configura autenticación persistente, HTTPS, límites de carga, controles de acceso y almacenamiento protegido para comprobantes y documentos personales.
