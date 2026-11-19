import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity, ArrowRight, BadgeCheck, BedDouble, Building2, CheckCircle2,
  CalendarDays, Clock3, FileCheck2, FileText, House, LayoutDashboard, LogOut, MapPin,
  Search, ShieldCheck, SlidersHorizontal, UserRound, Wallet, X, Bath, Ruler,
  UploadCloud, Eye, ChartNoAxesCombined, ChevronLeft, ChevronRight,
} from 'lucide-react';

const API = '/api';
const MAX_INSPECTION_PHOTOS = 8;
const MAX_INSPECTION_PHOTO_BYTES = 1_500_000;
const MAX_LEGAL_FILE_BYTES = 4_000_000;
const CREDIT_PURCHASE_METHODS = ['Crédito bancario', 'Infonavit', 'Credix SOFOM'];
const ROLE_INFO = {
  cliente: { title: 'Cliente', icon: UserRound, color: 'bg-cyan-100 text-cyan-800' },
  asesor: { title: 'Asesor inmobiliario', icon: UserRound, email: 'asesor@casafast.mx', color: 'bg-violet-100 text-violet-700' },
  gerente: { title: 'Gerente comercial', icon: ChartNoAxesCombined, email: 'gerente@casafast.mx', color: 'bg-amber-100 text-amber-700' },
  responsable_legal: { title: 'Responsable Legal', icon: ShieldCheck, email: 'legal@casafast.mx', color: 'bg-emerald-100 text-emerald-800' },
};
const money = (value) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(Number(value) || 0);
const surfaceSummary = (property) => property.superficieTerreno > 0 || property.superficieConstruccion > 0
  ? `Terreno ${property.superficieTerreno || 0} m² · Construcción ${property.superficieConstruccion || 0} m²`
  : `${property.metrosCuadrados} m²`;
const inspectedProperty = (property) => property.superficieTerreno > 0 || property.superficieConstruccion > 0;

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('No se pudo leer el archivo.'));
    reader.onerror = () => reject(new Error(`No se pudo leer ${file.name}.`));
    reader.readAsDataURL(file);
  });
}

async function request(path, { token, ...options } = {}) {
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || 'No se pudo completar la solicitud.');
  return payload;
}

function Toast({ message, type = 'success', onClose }) {
  if (!message) return null;
  const Icon = type === 'error' ? X : CheckCircle2;
  return (
    <div role="status" className={`fixed right-4 top-4 z-[80] flex max-w-sm items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-white shadow-xl ${type === 'error' ? 'bg-rose-600' : 'bg-slate-950'}`}>
      <Icon size={19} className="shrink-0" />
      <span>{message}</span>
      <button onClick={onClose} aria-label="Cerrar notificación" className="ml-2 rounded-lg p-1 hover:bg-white/15"><X size={15} /></button>
    </div>
  );
}

function Brand({ compact = false, dark = false }) {
  return (
    <div className="flex items-center gap-3">
      <div className={`flex h-11 w-11 items-center justify-center rounded-2xl shadow-lg ${dark ? 'bg-cyan-500 text-white shadow-cyan-900/20' : 'bg-cyan-700 text-white shadow-cyan-900/20'}`}><House size={23} /></div>
      <div>
        <div className={`text-xl font-black tracking-tight ${dark ? 'text-white' : 'text-slate-950'}`}>
          CASA<span className={dark ? 'text-cyan-300' : 'text-cyan-700'}>FAST</span>
        </div>
        {!compact && <div className={`text-[11px] font-medium ${dark ? 'text-slate-300' : 'text-slate-500'}`}>Tu próximo hogar, más cerca</div>}
      </div>
    </div>
  );
}

function Login({ onLogin, busy, error }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  return (
    <main className="login-shell min-h-screen px-4 py-8 sm:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl overflow-hidden rounded-[2rem] bg-white shadow-2xl shadow-slate-950/20 lg:grid-cols-[1.05fr_.95fr]">
        <section className="relative flex flex-col justify-between overflow-hidden bg-slate-950 p-8 text-white sm:p-12">
          <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'radial-gradient(#67e8f9 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
          <div className="relative"><Brand dark /></div>
          <div className="relative my-16 max-w-lg">
            <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-cyan-300/25 bg-cyan-300/10 px-3 py-1.5 text-xs font-bold text-cyan-200"><ShieldCheck size={15} /> Plataforma inmobiliaria integral</span>
            <h1 className="text-4xl font-black leading-tight sm:text-5xl">Todas tus operaciones, <span className="text-cyan-300">en un solo lugar.</span></h1>
            <p className="mt-5 max-w-md text-sm leading-6 text-slate-300">Compra, vende o renta con seguimiento transparente y el respaldo de un equipo experto.</p>
          </div>
          <div className="relative flex items-center gap-3 text-xs text-slate-400"><CheckCircle2 size={16} className="text-cyan-300" /> Información protegida y procesos claros.</div>
        </section>
        <section className="flex items-center justify-center p-6 sm:p-12">
          <div className="w-full max-w-md">
            <h2 className="text-2xl font-black text-slate-950">Iniciar sesión</h2>
            <p className="mt-2 text-sm text-slate-500">Ingresa con tu correo y contraseña. CASAFAST identificará tu perfil automáticamente.</p>
            <form className="mt-7 space-y-4" onSubmit={(event) => { event.preventDefault(); onLogin(email, password); }}>
              <label className="block text-xs font-bold text-slate-700">Correo electrónico<input required type="email" autoComplete="username" placeholder="nombre@correo.com" value={email} onChange={(event) => setEmail(event.target.value)} className="form-input mt-2" /></label>
              <label className="block text-xs font-bold text-slate-700">Contraseña<input required type="password" autoComplete="current-password" placeholder="Ingresa tu contraseña" value={password} onChange={(event) => setPassword(event.target.value)} className="form-input mt-2" /></label>
              {error && <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">{error}</p>}
              <button disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-800 py-3.5 text-sm font-bold text-white transition hover:bg-cyan-900 disabled:opacity-60">{busy ? 'Validando…' : 'Entrar'} <ArrowRight size={17} /></button>
            </form>
            <details className="mt-5 rounded-xl bg-slate-50 p-3 text-[11px] leading-5 text-slate-500">
              <summary className="cursor-pointer text-center font-semibold">Cuentas de demostración</summary>
              <p className="mt-2 text-center">Contraseña: <b>app123</b><br />Cliente: cliente@casafast.mx<br />Asesor: asesor@casafast.mx<br />Gerente: gerente@casafast.mx<br />Responsable Legal: legal@casafast.mx</p>
            </details>
          </div>
        </section>
      </div>
    </main>
  );
}

function StatusBadge({ status }) {
  const style = ['Disponible', 'Aprobado para Notaría', 'Aprobado'].includes(status)
    ? 'bg-emerald-50 text-emerald-700'
    : ['Apartado', 'Confirmada'].includes(status)
      ? 'bg-blue-50 text-blue-700'
      : ['Rechazado', 'Rechazada'].includes(status)
        ? 'bg-rose-50 text-rose-700'
        : 'bg-amber-50 text-amber-800';
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${style}`}><span className="h-1.5 w-1.5 rounded-full bg-current" />{status}</span>;
}

function Stat({ icon: Icon, label, value, note, color = 'cyan' }) {
  const iconStyle = {
    cyan: 'bg-cyan-50 text-cyan-700',
    violet: 'bg-violet-50 text-violet-700',
    emerald: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
  }[color] || 'bg-cyan-50 text-cyan-700';
  return <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-start justify-between"><span className="text-xs font-semibold text-slate-500">{label}</span><span className={`rounded-xl p-2 ${iconStyle}`}><Icon size={18} /></span></div><div className="mt-3 text-2xl font-black text-slate-950">{value}</div>{note && <div className="mt-1 text-[11px] text-slate-500">{note}</div>}</div>;
}

function PropertyCard({ property, onReserve, onDetails, onSchedule, reserveDisabled }) {
  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
      <div className="property-art relative flex h-44 items-end p-4">
        <span className="absolute left-4 top-4 flex items-center gap-2"><StatusBadge status={property.estatus} /><span className="rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-bold text-slate-700">{property.tipoOperacion === 'Renta' ? 'RENTA' : 'VENTA'}</span></span>
        <span className="absolute right-4 top-4 rounded-lg bg-white/90 px-2.5 py-1 text-[10px] font-bold text-slate-700">{property.codigo}</span>
        <div className="relative z-10 rounded-xl bg-slate-950/70 px-3 py-2 text-white backdrop-blur"><div className="text-lg font-black">{money(property.precio)}{property.tipoOperacion === 'Renta' && <span className="ml-1 text-[10px] font-semibold">/ mes</span>}</div><div className="text-[10px] text-slate-200">{property.zona}</div></div>
      </div>
      <div className="p-5">
        <h3 className="font-extrabold text-slate-950">{property.titulo}</h3>
        <p className="mt-1 flex items-start gap-1.5 text-xs leading-5 text-slate-500"><MapPin size={14} className="mt-0.5 shrink-0 text-cyan-700" />{property.direccion}</p>
        <div className="mt-4 flex flex-wrap gap-4 border-t border-slate-100 pt-4 text-xs font-semibold text-slate-600"><span className="flex items-center gap-1"><BedDouble size={15} />{property.recamaras} rec.</span><span className="flex items-center gap-1"><Bath size={15} />{Number(property.banos)} baños</span><span className="flex items-center gap-1"><Ruler size={15} />{surfaceSummary(property)}</span>{inspectedProperty(property) && <span>{Number(property.cocheras) || 0} cocheras</span>}</div>
        <div className="mt-4 flex items-center justify-between gap-2">
          {property.asesor?.nombre && <span className="truncate text-[11px] text-slate-500">Asesor: {property.asesor.nombre}</span>}
          <div className="ml-auto flex gap-2">
            <button onClick={() => onDetails(property)} className="rounded-xl border border-cyan-800 px-3.5 py-2 text-xs font-bold text-cyan-900 hover:bg-cyan-50">Ver detalle</button>
            {property.estatus === 'Disponible' && (property.tipoOperacion === 'Renta'
              ? <button disabled={reserveDisabled} onClick={() => onSchedule(property)} className="rounded-xl bg-cyan-800 px-3.5 py-2 text-xs font-bold text-white hover:bg-cyan-900 disabled:bg-slate-300">Agendar visita</button>
              : <button disabled={reserveDisabled} onClick={() => onReserve(property)} className="rounded-xl bg-cyan-800 px-3.5 py-2 text-xs font-bold text-white hover:bg-cyan-900 disabled:bg-slate-300">Apartar</button>)}
          </div>
        </div>
      </div>
    </article>
  );
}

function Modal({ title, onClose, children, wide = false, subtitle = 'Completa los datos para continuar.' }) {
  return <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/55 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section role="dialog" aria-modal="true" aria-label={title} className={`max-h-[92vh] w-full ${wide ? 'max-w-5xl' : 'max-w-xl'} overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl sm:p-8`}><div className="mb-6 flex items-start justify-between gap-4"><div><h2 className="text-xl font-black text-slate-950">{title}</h2><p className="mt-1 text-xs text-slate-500">{subtitle}</p></div><button onClick={onClose} aria-label="Cerrar" className="rounded-xl bg-slate-100 p-2 text-slate-600 hover:bg-slate-200"><X size={18} /></button></div>{children}</section></div>;
}

function PropertyDetailModal({ property, loading, canAct, onClose, onSchedule, onReserve }) {
  const [activePhoto, setActivePhoto] = useState(0);
  const gallery = property?.galeria || [];
  const photo = gallery[activePhoto];
  const nextPhoto = (offset) => setActivePhoto((index) => (index + offset + gallery.length) % gallery.length);
  if (loading || !property) {
    return <Modal title="Detalle de la propiedad" onClose={onClose} wide subtitle="Ficha técnica, galería y estatus de revisión."><div className="py-16 text-center text-sm text-slate-500">Cargando ficha y documentos disponibles…</div></Modal>;
  }
  return <Modal title="Detalle de la propiedad" onClose={onClose} wide subtitle="Ficha técnica, galería y estatus de revisión.">
    <div className="grid gap-6 lg:grid-cols-[1.15fr_.85fr]">
      <section>
        <div className="relative flex h-64 items-center justify-center overflow-hidden rounded-2xl bg-slate-100 sm:h-80">
          {photo
            ? <img src={photo.data} alt={photo.nombre || property.titulo} className="h-full w-full object-contain" />
            : <div className="property-art flex h-full w-full flex-col items-center justify-center gap-3 text-white"><House size={48} /><span className="text-sm font-bold">Aún no hay fotografías publicadas</span></div>}
          {gallery.length > 1 && <>
            <button aria-label="Fotografía anterior" onClick={() => nextPhoto(-1)} className="absolute left-3 rounded-full bg-white/90 p-2 text-slate-900 shadow"><ChevronLeft size={20} /></button>
            <button aria-label="Fotografía siguiente" onClick={() => nextPhoto(1)} className="absolute right-3 rounded-full bg-white/90 p-2 text-slate-900 shadow"><ChevronRight size={20} /></button>
            <span className="absolute bottom-3 right-3 rounded-full bg-slate-950/75 px-3 py-1 text-xs font-bold text-white">{activePhoto + 1} / {gallery.length}</span>
          </>}
        </div>
        {gallery.length > 1 && <div className="mt-3 flex gap-2 overflow-x-auto">{gallery.map((item, index) => <button key={`${item.nombre}-${index}`} aria-label={`Ver fotografía ${index + 1}`} onClick={() => setActivePhoto(index)} className={`h-16 w-20 shrink-0 overflow-hidden rounded-lg bg-slate-100 border-2 ${activePhoto === index ? 'border-cyan-700' : 'border-transparent'}`}><img src={item.data} alt="" className="h-full w-full object-contain" /></button>)}</div>}
        <div className="mt-5 flex flex-wrap items-start justify-between gap-3">
          <div><h3 className="text-xl font-black text-slate-950">{property.titulo}</h3><p className="mt-1 flex items-start gap-1.5 text-sm text-slate-500"><MapPin size={16} className="mt-0.5 shrink-0 text-cyan-700" />{property.direccion}, {property.zona}</p></div>
          <StatusBadge status={property.estatus} />
        </div>
        <div className="mt-4 text-3xl font-black text-cyan-900">{money(property.precio)}<span className="ml-2 text-xs font-semibold text-slate-500">{property.tipoOperacion === 'Renta' ? 'MXN / mes' : 'MXN'}</span></div>
        <section className="mt-6">
          <h4 className="font-extrabold text-slate-950">Ficha técnica</h4>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {[['Terreno', `${Number(property.superficieTerreno) || 0} m²`], ['Construcción', `${Number(property.superficieConstruccion) || Number(property.metrosCuadrados) || 0} m²`], ['Recámaras', Number(property.recamaras) || 0], ['Baños', Number(property.banos) || 0], ['Cocheras', Number(property.cocheras) || 0], ['Clave', property.codigo]].map(([label, value]) => <div key={label} className="rounded-xl bg-slate-50 p-3"><div className="text-[11px] font-semibold text-slate-500">{label}</div><div className="mt-1 text-sm font-bold text-slate-900">{value}</div></div>)}
          </div>
        </section>
        <section className="mt-5 rounded-2xl border border-slate-200 p-4">
          <h4 className="flex items-center gap-2 font-extrabold text-slate-950"><ShieldCheck size={18} className="text-cyan-800" /> Estado de revisión legal</h4>
          <div className="mt-2 space-y-1 text-sm font-semibold text-slate-800">
            <p>Dictamen: {property.expedienteLegal?.estatusDictamenGeneral || 'En Auditoría'}</p>
            <p className="text-xs text-slate-600">Predial: {property.expedienteLegal?.estatusPredial || 'Pendiente'} · Escrituras: {property.expedienteLegal?.estatusEscrituras || 'Pendiente'}</p>
          </div>
          <p className="mt-1 text-xs leading-5 text-slate-500">Este estado refleja la información registrada en CASAFAST; no sustituye la revisión de documentos oficiales.</p>
        </section>
      </section>
      <aside className="space-y-4">
        {property.tipoOperacion === 'Renta' ? <section className="rounded-2xl border border-cyan-100 bg-cyan-50 p-5">
          <div className="flex items-center gap-2 font-extrabold text-cyan-950"><CalendarDays size={19} /> Renta mensual</div>
          <p className="mt-3 text-sm leading-6 text-slate-700">Agenda una visita para conocer la propiedad. El equipo CASAFAST confirmará la disponibilidad; las solicitudes de renta se gestionan después de la visita.</p>
        </section> : <section className="rounded-2xl border border-cyan-100 bg-cyan-50 p-5">
          <div className="flex items-center gap-2 font-extrabold text-cyan-950"><Wallet size={19} /> Financiamiento preferente</div>
          <div className="mt-3 text-lg font-black text-slate-950">Credix SOFOM</div>
          <p className="mt-2 text-sm leading-6 text-slate-700">Solicita orientación sobre opciones de financiamiento para esta propiedad. Tasas, plazos, CAT y aprobación deben confirmarse con Credix SOFOM y dependen de la evaluación de tu perfil.</p>
          <div className="mt-3 rounded-xl bg-white/80 p-3 text-xs leading-5 text-slate-600">La información de esta ficha no constituye una oferta ni una aprobación de crédito.</div>
        </section>}
        {property.asesor?.nombre && <section className="rounded-2xl border border-slate-200 p-4"><div className="text-xs font-semibold text-slate-500">Asesor inmobiliario</div><div className="mt-1 font-bold text-slate-900">{property.asesor.nombre}</div></section>}
        {canAct && property.estatus === 'Disponible' && <div className="grid gap-3">
          <button onClick={() => onSchedule(property)} className="flex items-center justify-center gap-2 rounded-xl border border-cyan-800 py-3 text-sm font-bold text-cyan-900 hover:bg-cyan-50"><CalendarDays size={17} /> Agendar una visita</button>
          {property.tipoOperacion !== 'Renta' && <button onClick={() => onReserve(property)} className="rounded-xl bg-cyan-800 py-3 text-sm font-bold text-white hover:bg-cyan-900">Iniciar apartado</button>}
        </div>}
      </aside>
    </div>
  </Modal>;
}

function PropertyVisitModal({ property, user, busy, onClose, onSubmit }) {
  const [form, setForm] = useState({ fechaCita: '', horaCita: '10:00', telefono: user.telefono || '', notas: '' });
  const [minDate] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  });
  const change = (event) => setForm((value) => ({ ...value, [event.target.name]: event.target.value }));
  return <Modal title="Agendar visita a la propiedad" onClose={onClose}>
    <form onSubmit={(event) => { event.preventDefault(); onSubmit({ ...form, propiedadCodigo: property.codigo }); }} className="grid gap-4">
      <div className="rounded-xl bg-slate-50 p-4"><div className="font-extrabold text-slate-950">{property.titulo}</div><div className="mt-1 text-xs text-slate-500">{property.direccion}, {property.zona} · {money(property.precio)}{property.tipoOperacion === 'Renta' ? ' MXN al mes' : ' MXN'}</div></div>
      <p className="text-sm leading-6 text-slate-600">Comparte tus datos y el horario que prefieres. El equipo CASAFAST confirmará la disponibilidad de la visita.</p>
      <label className="form-label">Teléfono de contacto<input className="form-input mt-2" name="telefono" type="tel" value={form.telefono} onChange={change} minLength="7" maxLength="40" required /></label>
      <label className="form-label">Fecha preferida<input className="form-input mt-2" name="fechaCita" type="date" min={minDate} value={form.fechaCita} onChange={change} required /></label>
      <label className="form-label">Hora preferida<input className="form-input mt-2" name="horaCita" type="time" value={form.horaCita} onChange={change} required /></label>
      <label className="form-label">Notas (opcional)<textarea className="form-input mt-2" name="notas" value={form.notas} onChange={change} maxLength="500" rows="3" /></label>
      <button disabled={busy} className="rounded-xl bg-cyan-800 py-3 text-sm font-bold text-white hover:bg-cyan-900 disabled:opacity-50">{busy ? 'Enviando solicitud…' : 'Solicitar visita'}</button>
    </form>
  </Modal>;
}

function ReservationModal({ property, user, onClose, onSubmit, busy }) {
  const [form, setForm] = useState({
    nombreComprador: user.nombre || '',
    correoComprador: user.email || '',
    telefonoComprador: user.telefono || '',
    propuestaEconomica: String(property.precio || ''),
  });
  const change = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  const submit = (event) => {
    event.preventDefault();
    onSubmit({
      propiedadCodigo: property.codigo,
      ...form,
      propuestaEconomica: Number(form.propuestaEconomica),
    });
  };
  return <Modal title="Solicitar apartado" onClose={onClose} subtitle="Registra tus datos y propuesta. El asesor documentará el anticipo para validación gerencial."><form onSubmit={submit} className="space-y-5">
    <div className="rounded-2xl bg-slate-50 p-4"><div className="text-sm font-extrabold text-slate-900">{property.titulo}</div><div className="mt-1 text-xs text-slate-500">{property.zona} · Precio publicado: {money(property.precio)}</div><div className="mt-3 text-xs text-slate-600">Realiza el anticipo de <b>{money(50000)}</b> y entrega el comprobante a tu asesor. Cuando gerencia valide el pago, podrás elegir cómo pagar el resto de la compra.</div></div>
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="form-label sm:col-span-2">Nombre completo<input className="form-input mt-2" name="nombreComprador" value={form.nombreComprador} onChange={change} maxLength="120" autoComplete="name" required /></label>
      <label className="form-label">Correo electrónico<input className="form-input mt-2" name="correoComprador" type="email" value={form.correoComprador} onChange={change} maxLength="160" autoComplete="email" required /></label>
      <label className="form-label">Teléfono<input className="form-input mt-2" name="telefonoComprador" type="tel" value={form.telefonoComprador} onChange={change} minLength="7" maxLength="40" autoComplete="tel" required /></label>
      <label className="form-label sm:col-span-2">Propuesta económica (MXN)<input className="form-input mt-2" name="propuestaEconomica" type="number" min="1" step="1" value={form.propuestaEconomica} onChange={change} required /></label>
    </div>
    <p className="rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-900">Al enviar la solicitud, el inmueble se apartará temporalmente para impedir nuevas solicitudes mientras el asesor carga el comprobante y gerencia valida el pago.</p>
    <button disabled={busy} className="w-full rounded-xl bg-cyan-800 py-3 text-sm font-bold text-white hover:bg-cyan-900 disabled:opacity-50">{busy ? 'Enviando solicitud…' : 'Enviar propuesta y solicitar apartado'}</button>
  </form></Modal>;
}

function AdvisorReservationProof({ tramite, onUpload, onView, busy }) {
  const [error, setError] = useState('');
  const upload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 2_000_000) {
      setError('El comprobante no puede superar 2 MB.');
      return;
    }
    try {
      const data = await readFileAsDataUrl(file);
      setError('');
      await onUpload(tramite.id, { comprobanteNombre: file.name, comprobanteDatos: data });
    } catch (uploadError) {
      setError(uploadError.message);
    } finally {
      event.target.value = '';
    }
  };
  return <article className="rounded-xl border border-slate-200 p-4">
    <div className="font-bold">{tramite.propiedad?.titulo}</div>
    <div className="mt-1 text-xs text-slate-500">{tramite.nombreComprador || tramite.comprador?.nombre} · {money(tramite.montoApartado)} de anticipo</div>
    {tramite.comprobanteRecibido
      ? <div className="mt-3 flex flex-wrap items-center gap-3"><span className="text-xs font-semibold text-amber-800">Comprobante cargado: {tramite.comprobanteNombre}. Pendiente de validación gerencial.</span><button onClick={() => onView(tramite.id)} className="text-xs font-bold text-cyan-800 hover:underline">Ver comprobante</button></div>
      : <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-lg bg-cyan-800 px-3 py-2 text-xs font-bold text-white hover:bg-cyan-900"><UploadCloud size={15} />{busy ? 'Enviando…' : 'Cargar comprobante recibido'}<input type="file" accept="application/pdf,image/jpeg,image/png" className="sr-only" disabled={busy} onChange={upload} /></label>}
    {error && <p role="alert" className="mt-2 text-xs text-rose-700">{error}</p>}
  </article>;
}

function AdvisorReservationQueue({ tramites, onUpload, onView, busy }) {
  const pending = tramites.filter((item) => item.estado === 'Pendiente Aprobación');
  return <section className="rounded-2xl border border-slate-200 bg-white p-5">
    <h3 className="font-extrabold">Apartados: comprobantes de anticipo</h3>
    <p className="mt-1 text-xs text-slate-500">Carga el comprobante después de recibirlo del comprador; gerencia validará el pago antes de aprobar el apartado.</p>
    {pending.length ? <div className="mt-4 space-y-3">{pending.map((tramite) => <AdvisorReservationProof key={tramite.id} tramite={tramite} onUpload={onUpload} onView={onView} busy={busy} />)}</div> : <p className="mt-4 text-sm text-slate-500">No hay apartados pendientes de comprobante.</p>}
  </section>;
}

function BuyerDocumentsForm({ onSubmit, busy }) {
  const [identification, setIdentification] = useState(null);
  const [financialFiles, setFinancialFiles] = useState([]);
  const [error, setError] = useState('');
  const submit = async (event) => {
    event.preventDefault();
    const files = [identification, ...financialFiles].filter(Boolean);
    if (!identification || !financialFiles.length) return setError('Adjunta una identificación oficial y al menos un documento financiero.');
    if (files.some((file) => file.size > MAX_LEGAL_FILE_BYTES) ||
      files.reduce((total, file) => total + file.size, 0) > 20_000_000) {
      return setError('Cada archivo debe pesar hasta 4 MB y el total no debe superar 20 MB.');
    }
    try {
      const documentos = await Promise.all(files.map(async (file, index) => ({
        tipo: index === 0 ? 'Identificación oficial' : 'Documento financiero',
        nombre: file.name,
        data: await readFileAsDataUrl(file),
      })));
      await onSubmit(documentos);
    } catch (uploadError) {
      setError(uploadError.message);
    }
  };
  return <form onSubmit={submit} className="mt-4 grid gap-3 sm:grid-cols-2">
    <label className="form-label">Identificación oficial<input className="form-input mt-2" type="file" accept="application/pdf,image/jpeg,image/png" onChange={(event) => { setIdentification(event.target.files?.[0] || null); setError(''); }} required /><span className="mt-1 block text-[11px] font-normal text-slate-500">PDF, JPG o PNG · hasta 4 MB</span></label>
    <label className="form-label">Documentos financieros<input className="form-input mt-2" type="file" accept="application/pdf,image/jpeg,image/png" multiple onChange={(event) => { const selected = Array.from(event.target.files || []); if (selected.length > 5) { setError('Adjunta hasta 5 documentos financieros.'); setFinancialFiles([]); return; } setFinancialFiles(selected); setError(''); }} required /><span className="mt-1 block text-[11px] font-normal text-slate-500">Adjunta comprobantes de ingresos o estados de cuenta · hasta 5 archivos</span></label>
    {error && <p role="alert" className="text-sm text-rose-700 sm:col-span-2">{error}</p>}
    <button disabled={busy || !identification || !financialFiles.length} className="rounded-xl bg-cyan-800 px-4 py-3 text-sm font-bold text-white hover:bg-cyan-900 disabled:opacity-50 sm:col-span-2">{busy ? 'Enviando expediente…' : 'Enviar documentos para revisión administrativa'}</button>
  </form>;
}

function BuyerPurchaseActions({ tramite, onChoosePayment, onUploadDocuments, onViewDocuments, busy }) {
  const [method, setMethod] = useState(tramite.metodoPago || 'Contado');
  const documents = tramite.documentosComprador || [];
  if (tramite.estado === 'Rechazado') {
    return <p className="mt-3 rounded-xl bg-rose-50 p-3 text-xs leading-5 text-rose-900">Gerencia rechazó este apartado y la propiedad volvió a estar disponible. Contacta a tu asesor si necesitas más información.</p>;
  }
  if (tramite.estado !== 'Aprobado') {
    return <p className="mt-3 rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-900">Gerencia debe validar el comprobante del anticipo antes de elegir el método de pago e integrar tu expediente.</p>;
  }
  return <div className="mt-4 space-y-4">
    {!tramite.metodoPago
      ? <form onSubmit={(event) => { event.preventDefault(); onChoosePayment(tramite.id, method); }} className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
        <label className="form-label">Método de pago<select className="form-input mt-2" value={method} onChange={(event) => setMethod(event.target.value)}><option>Contado</option><option>Crédito bancario</option><option>Infonavit</option><option>Credix SOFOM</option></select></label>
        <button disabled={busy} className="rounded-xl bg-cyan-800 px-4 py-3 text-sm font-bold text-white hover:bg-cyan-900 disabled:opacity-50">{busy ? 'Guardando…' : 'Confirmar método'}</button>
      </form>
      : <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-700"><b>Método elegido:</b> {tramite.metodoPago}. {tramite.metodoPago !== 'Contado' && <span>El financiamiento está {tramite.estadoFinanciamiento === 'Aprobado' ? 'aprobado' : tramite.estadoFinanciamiento === 'Rechazado' ? 'rechazado' : 'pendiente de respuesta de la institución'}.</span>}</div>}
    {tramite.metodoPago && <>
      {tramite.estadoDocumentacion === 'En Revisión' && <p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-900">Tus documentos están en revisión administrativa.</p>}
      {tramite.estadoDocumentacion === 'Aprobado' && <p className="rounded-xl bg-emerald-50 p-3 text-xs text-emerald-900">Tu expediente de comprador fue aprobado.</p>}
      {tramite.estadoDocumentacion === 'Observado' && <p className="rounded-xl bg-rose-50 p-3 text-xs text-rose-900">Documentación observada: {tramite.comentariosDocumentacion}. Adjunta nuevamente los documentos corregidos.</p>}
      {documents.length > 0 && <button onClick={() => onViewDocuments(tramite.id)} className="text-xs font-bold text-cyan-800 hover:underline">Consultar documentos enviados ({documents.length})</button>}
      {['Pendiente', 'Observado'].includes(tramite.estadoDocumentacion) && <div><h4 className="text-sm font-bold text-slate-900">Integra tu expediente</h4><p className="mt-1 text-xs text-slate-500">Sube una identificación oficial y uno o más documentos financieros. La revisión se registra en el sistema.</p><BuyerDocumentsForm onSubmit={(items) => onUploadDocuments(tramite.id, items)} busy={busy} /></div>}
    </>}
    {tramite.fechaFirma && <p className="rounded-xl bg-emerald-50 p-3 text-xs leading-5 text-emerald-900">Firma programada en <b>{tramite.notaria}</b> el <b>{new Date(`${tramite.fechaFirma}T00:00:00`).toLocaleDateString('es-MX')}</b> a las <b>{tramite.horaFirma}</b>.</p>}
  </div>;
}

function ManagerPurchaseCard({ tramite, onViewDocuments, onReviewDocuments, onReviewFinancing, onScheduleSigning, busy }) {
  const [comments, setComments] = useState('');
  const [notaria, setNotaria] = useState(tramite.notaria || '');
  const [fechaFirma, setFechaFirma] = useState(tramite.fechaFirma || '');
  const [horaFirma, setHoraFirma] = useState(tramite.horaFirma || '');
  const docs = tramite.documentosComprador || [];
  const financingResolved = tramite.metodoPago === 'Contado'
    ? tramite.estadoFinanciamiento === 'No requerido'
    : CREDIT_PURCHASE_METHODS.includes(tramite.metodoPago) && tramite.estadoFinanciamiento === 'Aprobado';
  const canSchedule = tramite.estadoDocumentacion === 'Aprobado' && financingResolved;
  const reviewDocuments = (decision) => onReviewDocuments(tramite.id, { decision, comentarios: comments });
  return <article className="rounded-xl border border-slate-200 p-4">
    <div className="flex flex-wrap items-start justify-between gap-2"><div><h4 className="font-bold">{tramite.propiedad?.titulo}</h4><p className="mt-1 text-xs text-slate-500">{tramite.nombreComprador || tramite.comprador?.nombre} · {tramite.metodoPago || 'Pendiente de método de pago'} · Propuesta {tramite.propuestaEconomica ? money(tramite.propuestaEconomica) : '—'}</p></div><StatusBadge status={tramite.estadoDocumentacion} /></div>
    <div className="mt-3 grid gap-2 text-xs text-slate-600 sm:grid-cols-2"><span>Documentación: <b>{tramite.estadoDocumentacion}</b> ({docs.length} archivos)</span><span>Financiamiento: <b>{tramite.estadoFinanciamiento}</b></span></div>
    {docs.length > 0 && <button onClick={() => onViewDocuments(tramite.id)} className="mt-3 text-xs font-bold text-cyan-800 hover:underline">Revisar identificación y documentos financieros</button>}
    {tramite.estadoDocumentacion === 'En Revisión' && <div className="mt-3 space-y-2"><textarea className="form-input" placeholder="Comentarios para el comprador (obligatorios si observas)" maxLength="1000" rows="2" value={comments} onChange={(event) => setComments(event.target.value)} /><div className="flex flex-wrap gap-2"><button disabled={busy} onClick={() => reviewDocuments('Observado')} className="rounded-lg border border-rose-200 px-3 py-2 text-xs font-bold text-rose-700 disabled:opacity-50">Observar documentos</button><button disabled={busy} onClick={() => reviewDocuments('Aprobado')} className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">Aprobar documentos</button></div></div>}
    {CREDIT_PURCHASE_METHODS.includes(tramite.metodoPago) && tramite.estadoDocumentacion === 'Aprobado' && tramite.estadoFinanciamiento === 'Pendiente' && <div className="mt-3 rounded-xl bg-cyan-50 p-3"><p className="text-xs text-cyan-950">Registra la respuesta recibida de {tramite.metodoPago}; la decisión no se envía automáticamente a la institución.</p><div className="mt-2 flex gap-2"><button disabled={busy} onClick={() => onReviewFinancing(tramite.id, 'Rechazado')} className="rounded-lg border border-rose-200 px-3 py-2 text-xs font-bold text-rose-700 disabled:opacity-50">Financiamiento rechazado</button><button disabled={busy} onClick={() => onReviewFinancing(tramite.id, 'Aprobado')} className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">Financiamiento aprobado</button></div></div>}
    {tramite.estadoFinanciamiento === 'Rechazado' && <p className="mt-3 text-xs font-semibold text-rose-700">El financiamiento fue rechazado; no se puede programar la firma.</p>}
    {canSchedule && <form onSubmit={(event) => { event.preventDefault(); onScheduleSigning(tramite.id, { notaria, fechaFirma, horaFirma }); }} className="mt-4 grid gap-3 sm:grid-cols-3">
      <label className="form-label">Notaría<input className="form-input mt-2" value={notaria} onChange={(event) => setNotaria(event.target.value)} maxLength="180" required /></label>
      <label className="form-label">Fecha de firma<input className="form-input mt-2" type="date" min={new Date(Date.now() - new Date().getTimezoneOffset() * 60_000).toISOString().slice(0, 10)} value={fechaFirma} onChange={(event) => setFechaFirma(event.target.value)} required /></label>
      <label className="form-label">Hora<input className="form-input mt-2" type="time" value={horaFirma} onChange={(event) => setHoraFirma(event.target.value)} required /></label>
      <button disabled={busy} className="rounded-xl bg-cyan-800 px-4 py-3 text-xs font-bold text-white hover:bg-cyan-900 disabled:opacity-50 sm:col-span-3">{busy ? 'Guardando…' : tramite.fechaFirma ? 'Actualizar cita de firma' : 'Programar firma en notaría'}</button>
    </form>}
    {tramite.fechaFirma && <p className="mt-3 text-xs font-semibold text-emerald-800">Firma programada: {tramite.notaria} · {new Date(`${tramite.fechaFirma}T00:00:00`).toLocaleDateString('es-MX')} · {tramite.horaFirma}</p>}
  </article>;
}

function ManagerPurchaseWorkflow({ tramites, onViewDocuments, onReviewDocuments, onReviewFinancing, onScheduleSigning, busy }) {
  const cases = tramites.filter((item) => item.estado === 'Aprobado');
  return <section className="rounded-2xl border border-slate-200 bg-white p-5">
    <h2 className="font-extrabold">Expediente del comprador y escrituración</h2>
    <p className="mt-1 text-xs text-slate-500">Revisa los documentos, registra la respuesta del financiamiento y programa la firma cuando los requisitos estén aprobados.</p>
    {cases.length ? <div className="mt-4 space-y-3">{cases.map((tramite) => <ManagerPurchaseCard key={tramite.id} tramite={tramite} onViewDocuments={onViewDocuments} onReviewDocuments={onReviewDocuments} onReviewFinancing={onReviewFinancing} onScheduleSigning={onScheduleSigning} busy={busy} />)}</div> : <p className="mt-4 text-sm text-slate-500">Los apartados aparecerán aquí después de validar el anticipo.</p>}
  </section>;
}

function ManagerReservationApprovals({ approvals, onAction, onViewReceipt, busy }) {
  return <section className="rounded-2xl border border-slate-200 bg-white p-5">
    <div className="mb-4 flex items-center justify-between"><div><h2 className="font-extrabold">Validación del apartado</h2><p className="mt-1 text-xs text-slate-500">Verifica el comprobante cargado por el asesor antes de aprobar el pago.</p></div><span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800">{approvals.length} pendientes</span></div>
    {approvals.length ? <div className="space-y-3">{approvals.map((item) => <article key={item.id} className="flex flex-col gap-4 rounded-2xl border border-slate-200 p-4 sm:flex-row sm:items-center"><div className="min-w-0 flex-1"><div className="text-sm font-extrabold">{item.propiedad?.titulo}</div><div className="mt-1 text-xs text-slate-500">{item.propiedad?.zona} · {item.nombreComprador || item.comprador?.nombre} · Anticipo {money(item.montoApartado)}</div><div className="mt-2 grid gap-1 text-xs text-slate-600 sm:grid-cols-2"><span>Propuesta: <b>{item.propuestaEconomica ? money(item.propuestaEconomica) : 'No capturada'}</b></span><span>Correo: {item.correoComprador || 'No capturado'}</span><span>Teléfono: {item.telefonoComprador || 'No capturado'}</span><span>Comprobante: <b>{item.comprobanteRecibido ? 'Cargado por el asesor' : 'Pendiente del asesor'}</b></span></div>{item.comprobanteRecibido && <button onClick={() => onViewReceipt(item.id)} className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-cyan-800 hover:underline"><FileText size={14} /> Ver comprobante ({item.comprobanteNombre})</button>}</div><div className="flex gap-2"><button disabled={busy} onClick={() => onAction(item.propiedadCodigo, 'rechazar')} className="rounded-xl border border-rose-200 px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-50 disabled:opacity-50">Rechazar</button><button disabled={busy || !item.comprobanteRecibido} onClick={() => onAction(item.propiedadCodigo, 'aprobar')} className="rounded-xl bg-emerald-700 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-800 disabled:opacity-50">Validar y apartar</button></div></article>)}</div> : <EmptyState text="No hay apartados pendientes de validación." />}
  </section>;
}

function SellAppointmentModal({ user, onClose, onSubmit, busy }) {
  const [form, setForm] = useState({
    telefono: user.telefono || '',
    tipoOperacion: 'Venta',
    direccion: '',
    zona: '',
    tipoPropiedad: 'Casa',
    fechaCita: '',
    horaCita: '10:00',
    notas: '',
  });
  const change = (event) => setForm((value) => ({ ...value, [event.target.name]: event.target.value }));
  const [minDate] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  });
  return <Modal title="Ofrece tu propiedad" onClose={onClose}><form onSubmit={(event) => { event.preventDefault(); onSubmit(form); }} className="grid gap-4 sm:grid-cols-2">
    <p className="text-sm leading-6 text-slate-600 sm:col-span-2">Un asesor visitará tu propiedad y te ayudará a ofrecerla en {form.tipoOperacion.toLowerCase()}. Se publicará en el catálogo después de la revisión legal.</p>
    <label className="form-label">Nombre<input className="form-input mt-2" value={user.nombre} readOnly /></label>
    <label className="form-label">Teléfono de contacto<input className="form-input mt-2" name="telefono" type="tel" value={form.telefono} onChange={change} minLength="7" maxLength="40" required /></label>
    <label className="form-label">¿Qué deseas hacer?<select className="form-input mt-2" name="tipoOperacion" value={form.tipoOperacion} onChange={change}><option value="Venta">Vender</option><option value="Renta">Rentar</option></select></label>
    <label className="form-label sm:col-span-2">Dirección de la propiedad<input className="form-input mt-2" name="direccion" value={form.direccion} onChange={change} maxLength="240" required /></label>
    <label className="form-label">Colonia o zona<input className="form-input mt-2" name="zona" value={form.zona} onChange={change} maxLength="100" required /></label>
    <label className="form-label">Tipo de propiedad<select className="form-input mt-2" name="tipoPropiedad" value={form.tipoPropiedad} onChange={change}><option>Casa</option><option>Departamento</option><option>Terreno</option><option>Otro</option></select></label>
    <label className="form-label">Fecha preferida<input className="form-input mt-2" name="fechaCita" type="date" min={minDate} value={form.fechaCita} onChange={change} required /></label>
    <label className="form-label">Hora preferida<input className="form-input mt-2" name="horaCita" type="time" value={form.horaCita} onChange={change} required /></label>
    <label className="form-label sm:col-span-2">Notas para el asesor (opcional)<textarea className="form-input mt-2" name="notas" value={form.notas} onChange={change} maxLength="500" rows="3" /></label>
    <button disabled={busy} className="rounded-xl bg-cyan-800 py-3 text-sm font-bold text-white hover:bg-cyan-900 disabled:opacity-50 sm:col-span-2">{busy ? 'Enviando…' : 'Solicitar cita'}</button>
  </form></Modal>;
}

function InspectionModal({ solicitud, onClose, onSubmit, busy }) {
  const [form, setForm] = useState({
    titulo: `Casa en ${solicitud.zona}`,
    zona: solicitud.zona,
    precio: '',
    recamaras: 3,
    banos: 2,
    superficieTerreno: '',
    superficieConstruccion: '',
    cocheras: 1,
    detallesInspeccion: '',
  });
  const [galeria, setGaleria] = useState([]);
  const [escrituras, setEscrituras] = useState(null);
  const [predial, setPredial] = useState(null);
  const [error, setError] = useState('');
  const change = (event) => setForm((value) => ({ ...value, [event.target.name]: event.target.value }));
  const uploadPhotos = async (event) => {
    const selected = Array.from(event.target.files || []);
    event.target.value = '';
    if (!selected.length) return;
    if (selected.length > MAX_INSPECTION_PHOTOS) return setError(`Selecciona hasta ${MAX_INSPECTION_PHOTOS} fotografías.`);
    if (selected.some((file) => !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > MAX_INSPECTION_PHOTO_BYTES)) {
      return setError('Las fotografías deben ser JPG, PNG o WebP y pesar hasta 1.5 MB cada una.');
    }
    try {
      const loaded = await Promise.all(selected.map(async (file) => ({ name: file.name, size: file.size, data: await readFileAsDataUrl(file) })));
      setGaleria(loaded);
      setError('');
    } catch (readError) {
      setError(readError.message);
    }
  };
  const uploadDocument = async (event, setter, acceptedTypes = ['application/pdf', 'image/jpeg', 'image/png']) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!acceptedTypes.includes(file.type) || file.size > MAX_LEGAL_FILE_BYTES) {
      return setError(acceptedTypes.length === 1
        ? 'El Estado de Cuenta Catastral oficial debe ser PDF y pesar hasta 4 MB.'
        : 'Las escrituras deben ser PDF, JPG o PNG y pesar hasta 4 MB.');
    }
    try {
      setter({ name: file.name, data: await readFileAsDataUrl(file) });
      setError('');
    } catch (readError) {
      setError(readError.message);
    }
  };
  const submit = async (event) => {
    event.preventDefault();
    if (!galeria.length || !escrituras || !predial) return setError('Adjunta al menos una fotografía, las escrituras y el Estado de Cuenta Catastral oficial en PDF.');
    const totalBytes = galeria.reduce((total, file) => total + file.size, 0)
      + Math.ceil(escrituras.data.split(',')[1].length * 3 / 4)
      + Math.ceil(predial.data.split(',')[1].length * 3 / 4);
    if (totalBytes > 20_000_000) return setError('El tamaño total de los archivos no puede superar 20 MB.');
    onSubmit(solicitud.id, {
      ...form,
      precio: Number(form.precio),
      recamaras: Number(form.recamaras),
      banos: Number(form.banos),
      superficieTerreno: Number(form.superficieTerreno),
      superficieConstruccion: Number(form.superficieConstruccion),
      cocheras: Number(form.cocheras),
      galeria: galeria.map(({ name, data }) => ({ name, data })),
      escrituras,
      predial,
    });
  };
  return <Modal title="Registrar inspección y expediente" onClose={onClose}><form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
    <div className="rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-600 sm:col-span-2"><b>{solicitud.propietario?.nombre}</b> · {solicitud.tipoOperacion === 'Renta' ? 'Renta' : 'Venta'} · {solicitud.direccion}, {solicitud.zona}<br />Cita: {new Date(`${solicitud.fechaCita}T00:00:00`).toLocaleDateString('es-MX')} · {solicitud.horaCita}</div>
    <label className="form-label sm:col-span-2">Nombre para publicar<input className="form-input mt-2" name="titulo" value={form.titulo} onChange={change} maxLength="160" required /></label>
    <label className="form-label">Zona<input className="form-input mt-2" name="zona" value={form.zona} onChange={change} maxLength="100" required /></label>
    <label className="form-label">{solicitud.tipoOperacion === 'Renta' ? 'Renta mensual (MXN)' : 'Precio de venta (MXN)'}<input className="form-input mt-2" name="precio" type="number" min="1" value={form.precio} onChange={change} required /></label>
    <label className="form-label">Superficie de terreno (m²)<input className="form-input mt-2" name="superficieTerreno" type="number" min="0.01" step="0.01" value={form.superficieTerreno} onChange={change} required /></label>
    <label className="form-label">Superficie de construcción (m²)<input className="form-input mt-2" name="superficieConstruccion" type="number" min="0.01" step="0.01" value={form.superficieConstruccion} onChange={change} required /></label>
    <label className="form-label">Recámaras<input className="form-input mt-2" name="recamaras" type="number" min="0" value={form.recamaras} onChange={change} required /></label>
    <label className="form-label">Baños<input className="form-input mt-2" name="banos" type="number" step="0.5" min="0" value={form.banos} onChange={change} required /></label>
    <label className="form-label">Cocheras<input className="form-input mt-2" name="cocheras" type="number" min="0" value={form.cocheras} onChange={change} required /></label>
    <label className="form-label sm:col-span-2">Fotografías de la visita<input className="form-input mt-2" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={uploadPhotos} /><span className="mt-1 block text-[11px] font-normal text-slate-500">JPG, PNG o WebP · hasta 8 fotos · 1.5 MB por foto. {galeria.length} seleccionadas.</span></label>
    {galeria.length > 0 && <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:col-span-2">{galeria.map((photo) => <img key={photo.name} src={photo.data} alt={`Vista previa: ${photo.name}`} className="h-24 w-full rounded-lg bg-slate-100 p-1 object-contain" />)}</div>}
    <label className="form-label">Escrituras<input className="form-input mt-2" type="file" accept="application/pdf,image/jpeg,image/png" onChange={(event) => uploadDocument(event, setEscrituras)} /><span className="mt-1 block truncate text-[11px] font-normal text-slate-500">{escrituras?.name || 'PDF, JPG o PNG · hasta 4 MB'}</span></label>
    <label className="form-label">Estado de Cuenta Catastral<input className="form-input mt-2" type="file" accept="application/pdf" onChange={(event) => uploadDocument(event, setPredial, ['application/pdf'])} /><span className="mt-1 block truncate text-[11px] font-normal text-slate-500">{predial?.name || 'PDF oficial · hasta 4 MB'}</span></label>
    <label className="form-label sm:col-span-2">Notas de inspección<textarea className="form-input mt-2" name="detallesInspeccion" value={form.detallesInspeccion} onChange={change} maxLength="1000" rows="3" /></label>
    <p className="text-xs text-amber-800 sm:col-span-2">Al completar el registro, la propiedad quedará sin publicar hasta que el Responsable Legal audite y apruebe las escrituras y el Estado de Cuenta Catastral de los últimos cinco años.</p>
    {error && <p role="alert" className="text-sm text-rose-700 sm:col-span-2">{error}</p>}
    <button disabled={busy} className="rounded-xl bg-cyan-800 py-3 text-sm font-bold text-white hover:bg-cyan-900 disabled:opacity-50 sm:col-span-2">{busy ? 'Guardando expediente…' : 'Guardar inspección e iniciar dictamen'}</button>
  </form></Modal>;
}

function ClientSalesRequests({ requests, onViewFiles }) {
  return <section className="rounded-2xl border border-slate-200 bg-white p-5">
    <h2 className="mb-3 font-extrabold">Mis solicitudes para vender o rentar</h2>
    {requests.length ? <div className="space-y-3">{requests.map((item) => <article key={item.id} className="rounded-xl border border-slate-100 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2"><div className="font-bold">{item.tipoOperacion === 'Renta' ? 'Renta' : 'Venta'} · {item.tipoPropiedad} · {item.zona}</div><StatusBadge status={item.estado} /></div>
      <p className="mt-1 text-xs text-slate-500">{item.direccion}</p>
      <p className="mt-2 text-xs text-slate-600">Cita solicitada: {new Date(`${item.fechaCita}T00:00:00`).toLocaleDateString('es-MX')} · {item.horaCita}</p>
      <p className="mt-1 text-xs text-slate-600">{item.asesor ? `Asesor asignado: ${item.asesor.nombre}` : 'El gerente asignará un asesor.'}</p>
      {item.propiedad && <p className={`mt-1 text-xs font-semibold ${item.propiedad.publicada ? 'text-emerald-700' : 'text-amber-700'}`}>Propiedad registrada: {item.propiedad.titulo} ({item.propiedad.codigo}) · {item.propiedad.publicada ? 'Publicada' : 'Pendiente de revisión legal; aún no publicada'}</p>}
      {item.estado === 'Inspección completada' && <>
        <p className="mt-1 text-xs font-semibold text-amber-700">Dictamen: {item.revisionAdministrativa || 'Pendiente de integrar expediente'}</p>
        {(item.galeriaCantidad > 0 || item.escriturasNombre || item.predialNombre) && <button onClick={() => onViewFiles(item)} className="mt-2 text-xs font-bold text-cyan-800 hover:underline">Ver fotos y documentos del expediente</button>}
      </>}
    </article>)}</div> : <EmptyState text="Aún no has solicitado una visita para vender o rentar una propiedad." />}
  </section>;
}

function InspectionFilesModal({ solicitud, files, onClose }) {
  return <Modal title="Expediente de inspección" onClose={onClose}>
    <div className="space-y-5">
      <div className="rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-600">{solicitud.propiedad?.titulo} · {solicitud.direccion}, {solicitud.zona}<br />Dictamen: <b>{files.revisionAdministrativa}</b></div>
      <section><h3 className="mb-2 text-sm font-extrabold">Fotografías de la visita</h3><div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{files.galeria.map((photo) => <a key={photo.nombre} href={photo.data} download={photo.nombre} className="overflow-hidden rounded-xl border border-slate-200"><img src={photo.data} alt={photo.nombre} className="h-32 w-full bg-slate-100 object-contain" /><span className="block truncate p-2 text-[11px] font-semibold">{photo.nombre}</span></a>)}</div></section>
      <section><h3 className="mb-2 text-sm font-extrabold">Documentación legal</h3><div className="grid gap-2 sm:grid-cols-2">{[['Escrituras', files.escrituras], ['Recibo predial', files.predial]].filter(([, file]) => file).map(([label, file]) => <a key={label} href={file.data} download={file.nombre} className="flex items-center gap-2 rounded-xl border border-slate-200 p-3 text-xs font-semibold text-cyan-800 hover:bg-cyan-50"><FileText size={17} />{label}: {file.nombre}</a>)}</div><p className="mt-2 text-[11px] text-amber-700">La documentación está protegida y solo disponible para el propietario y el asesor asignado.</p></section>
    </div>
  </Modal>;
}

function AdvisorAgenda({ visits, requests, onInspect, onViewFiles, onUpdateVisit, busy }) {
  const events = [
    ...visits.map((item) => ({ id: `visit-${item.id}`, type: 'propertyVisit', item })),
    ...requests.map((item) => ({ id: `capture-${item.id}`, type: 'capture', item })),
  ].sort((first, second) => `${first.item.fechaCita} ${first.item.horaCita}`.localeCompare(`${second.item.fechaCita} ${second.item.horaCita}`));
  return <section className="rounded-2xl border border-slate-200 bg-white p-5">
    <div className="mb-4"><h3 className="font-extrabold">Agenda de citas</h3><p className="mt-1 text-xs text-slate-500">Consulta las visitas a propiedades y las citas de captación asignadas a tu cartera.</p></div>
    {events.length ? <div className="space-y-3">{events.map(({ id, type, item }) => {
      const isCapture = type === 'capture';
      const title = isCapture ? `${item.tipoOperacion === 'Renta' ? 'Captación para renta' : 'Captación para venta'} · ${item.tipoPropiedad}` : item.propiedad?.titulo;
      const location = isCapture ? `${item.direccion}, ${item.zona}` : `${item.propiedad?.direccion}, ${item.propiedad?.zona}`;
      const contactName = isCapture ? item.propietario?.nombre : item.cliente?.nombre || 'Cliente';
      return <article key={id} className="rounded-xl border border-slate-100 p-4">
        <div className="flex flex-wrap items-start justify-between gap-2"><div><span className="text-[10px] font-bold uppercase tracking-wide text-cyan-800">{isCapture ? 'Captación' : 'Visita a propiedad'}</span><h4 className="mt-1 font-bold text-slate-900">{title}</h4><p className="mt-1 text-xs text-slate-500">{location}</p></div><StatusBadge status={item.estado} /></div>
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-600"><span className="inline-flex items-center gap-1.5"><UserRound size={14} />{contactName}</span><span className="inline-flex items-center gap-1.5"><CalendarDays size={14} />{new Date(`${item.fechaCita}T00:00:00`).toLocaleDateString('es-MX')}</span><span className="inline-flex items-center gap-1.5"><Clock3 size={14} />{item.horaCita}</span><span>Tel. {item.telefono}</span></div>
        {item.notas && <p className="mt-2 text-xs text-slate-600">{isCapture ? 'Nota del cliente' : 'Notas'}: {item.notas}</p>}
        {!isCapture && item.clienteDescarto && <p className="mt-3 text-xs font-semibold text-slate-500">El cliente decidió no continuar con esta propiedad.</p>}
        {!isCapture && !item.clienteDescarto && item.estado === 'Solicitada' && <div className="mt-3 flex gap-2"><button disabled={busy} onClick={() => onUpdateVisit(item.id, 'Confirmada')} className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-800 disabled:opacity-50">Confirmar cita</button><button disabled={busy} onClick={() => onUpdateVisit(item.id, 'Rechazada')} className="rounded-lg border border-rose-200 px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-50 disabled:opacity-50">Rechazar</button></div>}
        {isCapture && item.estado === 'Asignada' && <button onClick={() => onInspect(item)} className="mt-3 rounded-lg bg-cyan-800 px-3 py-2 text-xs font-bold text-white hover:bg-cyan-900">Registrar inmueble inspeccionado</button>}
        {isCapture && item.estado === 'Inspección completada' && <><p className="mt-2 text-xs font-semibold text-amber-700">Dictamen: {item.propiedad?.expedienteLegal?.estatusDictamenGeneral || 'En Auditoría'} · {item.propiedad?.publicada ? 'Publicada' : 'Pendiente de aprobación legal'}</p>{(item.galeriaCantidad > 0 || item.escriturasNombre || item.predialNombre) && <button onClick={() => onViewFiles(item)} className="mt-2 text-xs font-bold text-cyan-800 hover:underline">Ver fotos y documentos</button>}</>}
      </article>;
    })}</div> : <EmptyState text="Aún no tienes visitas ni captaciones asignadas en tu agenda." />}
  </section>;
}

function ManagerSalesDashboard({ requests, advisors, onAssign }) {
  const [assignmentByRequest, setAssignmentByRequest] = useState({});
  const pending = requests.filter((item) => item.estado === 'Pendiente de asignación').length;
  const assigned = requests.filter((item) => item.estado !== 'Pendiente de asignación').length;
  return <div className="space-y-6">
    <div><h2 className="text-xl font-black text-slate-950">Solicitudes para vender o rentar</h2><p className="mt-1 text-sm text-slate-500">Revisa la información y asigna cada visita a un asesor.</p></div>
    <div className="grid gap-4 sm:grid-cols-2"><Stat icon={Clock3} label="Pendientes de asignar" value={pending} color="amber" /><Stat icon={Building2} label="Visitas asignadas o completadas" value={assigned} color="emerald" /></div>
    {requests.length ? <div className="space-y-4">{requests.map((item) => <article key={item.id} className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-extrabold">{item.propietario?.nombre} · {item.tipoOperacion === 'Renta' ? 'Renta' : 'Venta'} · {item.tipoPropiedad}</h3><p className="mt-1 text-xs text-slate-500">{item.direccion}, {item.zona}</p></div><StatusBadge status={item.estado} /></div>
      <div className="mt-3 grid gap-1 text-xs text-slate-600 sm:grid-cols-2"><span>Contacto: {item.telefono} · {item.propietario?.email}</span><span>Visita solicitada: {new Date(`${item.fechaCita}T00:00:00`).toLocaleDateString('es-MX')} · {item.horaCita}</span><span>Dictamen legal: <b>{item.propiedad?.expedienteLegal?.estatusDictamenGeneral || 'En Auditoría'}</b></span>{item.notas && <span className="sm:col-span-2">Notas: {item.notas}</span>}</div>
      {item.propiedad && <p className={`mt-3 text-xs font-semibold ${item.propiedad.publicada ? 'text-emerald-700' : 'text-amber-700'}`}>Propiedad registrada: {item.propiedad.titulo} ({item.propiedad.codigo}) · {item.propiedad.publicada ? 'Publicada' : 'No publicada hasta aprobación legal'}</p>}
      {item.estado !== 'Inspección completada' && <div className="mt-4 flex flex-wrap gap-2">
        <select className="form-input min-w-56 flex-1" aria-label={`Asesor para ${item.propietario?.nombre}`} value={assignmentByRequest[item.id] ?? item.asesor?.id ?? ''} onChange={(event) => setAssignmentByRequest((values) => ({ ...values, [item.id]: event.target.value }))}>
          <option value="">Selecciona un asesor</option>{advisors.map((advisor) => <option key={advisor.id} value={advisor.id}>{advisor.nombre}</option>)}
        </select>
        <button disabled={!advisors.length || !(assignmentByRequest[item.id] ?? item.asesor?.id)} onClick={() => onAssign(item.id, Number(assignmentByRequest[item.id] ?? item.asesor?.id))} className="rounded-xl bg-cyan-800 px-4 py-2 text-xs font-bold text-white hover:bg-cyan-900 disabled:opacity-50">{item.asesor ? 'Actualizar asesor' : 'Asignar asesor'}</button>
      </div>}
    </article>)}</div> : <EmptyState text="Todavía no hay solicitudes de venta o renta." />}
    {!advisors.length && <p className="text-xs text-amber-700">No hay asesores registrados para asignar.</p>}
  </div>;
}

function LegalReviewDashboard({ expedientes, onReview, loading }) {
  const pending = expedientes.filter((item) => item.estatusDictamenGeneral === 'En Auditoría').length;
  const approved = expedientes.filter((item) => item.estatusDictamenGeneral === 'Aprobado para Notaría').length;
  return <div className="space-y-6">
    <div><h2 className="text-xl font-black text-slate-950">Auditoría legal y fiscal</h2><p className="mt-1 text-sm text-slate-500">Solo Responsable Legal puede validar el predial y dictaminar las escrituras.</p></div>
    <div className="grid gap-4 sm:grid-cols-3"><Stat icon={Clock3} label="En auditoría" value={loading ? '...' : pending} color="amber" /><Stat icon={ShieldCheck} label="Aprobados para notaría" value={loading ? '...' : approved} color="emerald" /><Stat icon={Building2} label="Expedientes" value={loading ? '...' : expedientes.length} /></div>
    {loading
      ? <EmptyState text="Cargando expedientes legales…" />
      : expedientes.length ? <div className="space-y-3">{expedientes.map((item) => <article key={item.id} className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-extrabold text-slate-950">{item.propiedad?.titulo || item.propiedadId}</h3><p className="mt-1 text-xs text-slate-500">{item.propiedad?.direccion}, {item.propiedad?.zona} · {money(item.propiedad?.precio)}</p></div><StatusBadge status={item.estatusDictamenGeneral} /></div>
      <div className="mt-3 grid gap-2 text-xs text-slate-600 sm:grid-cols-2"><span>Predial: <b>{item.estatusPredial}</b></span><span>Escrituras: <b>{item.estatusEscrituras}</b></span><span>Estado: <b>{item.propiedad?.estatus}</b></span><span>Publicación: <b>{item.propiedad?.publicada ? 'Publicada' : 'No publicada hasta aprobar el expediente'}</b></span></div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-slate-500">Estado de cuenta catastral: {item.documentos?.predial || 'No cargado'}{item.documentos?.predial && !item.documentos.predialOficialPdf ? ' · requiere PDF oficial' : ''}</p><button onClick={() => onReview(item)} className="rounded-xl bg-cyan-800 px-4 py-2 text-xs font-bold text-white hover:bg-cyan-900">Abrir expediente y dictaminar</button></div>
      {item.comentariosJuridicos && <p className="mt-3 rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-900">{item.comentariosJuridicos}</p>}
    </article>)}</div> : <EmptyState text="No hay expedientes pendientes. Cuando un asesor complete la inspección de una propiedad, aparecerá aquí." />}
  </div>;
}

function LegalReviewModal({ expediente, busy, onClose, onSubmit, onOpenDocument }) {
  const [form, setForm] = useState({
    estatusPredial: expediente.estatusPredial,
    estatusEscrituras: expediente.estatusEscrituras,
    estatusDictamenGeneral: expediente.estatusDictamenGeneral,
    comentariosJuridicos: expediente.comentariosJuridicos || '',
  });
  const [confirmoNoAdeudo5Anos, setConfirmoNoAdeudo5Anos] = useState(expediente.estatusPredial === 'Aprobado');
  const files = expediente.archivos || {};
  const needsReason = form.estatusDictamenGeneral === 'Rechazado'
    || form.estatusPredial === 'Rechazado'
    || form.estatusEscrituras === 'Observado';
  const change = (event) => setForm((value) => ({ ...value, [event.target.name]: event.target.value }));
  const documentLink = (label, file) => file
    ? <a key={label} href={file.data} onClick={(event) => onOpenDocument(event, file)} className="flex items-center gap-2 rounded-xl border border-slate-200 p-3 text-xs font-semibold text-cyan-800 hover:bg-cyan-50"><FileText size={17} />{label}: {file.nombre}</a>
    : <div key={label} className="rounded-xl bg-slate-50 p-3 text-xs text-slate-500">{label}: documento no cargado.</div>;
  return <Modal title="Dictamen del Responsable Legal" onClose={onClose} wide subtitle="Revisa los documentos oficiales y registra la decisión jurídica.">
    <div className="space-y-5">
      <div className="rounded-xl bg-slate-50 p-4 text-sm"><div className="font-extrabold text-slate-950">{expediente.propiedad?.titulo}</div><div className="mt-1 text-xs text-slate-600">{expediente.propiedad?.direccion}, {expediente.propiedad?.zona} · {money(expediente.propiedad?.precio)}</div></div>
      <section><h3 className="mb-2 text-sm font-extrabold">Documentos de la propiedad y comprador</h3><div className="grid gap-2 sm:grid-cols-2">
        {documentLink('Escrituras', files.escrituras)}
        {documentLink('Estado de Cuenta Catastral (5 años)', files.estadoCuentaCatastral)}
        {files.comprobanteComprador && documentLink(`Comprobante de apartado · ${files.comprobanteComprador.comprador?.nombre || 'Comprador'}`, files.comprobanteComprador)}
      </div><p className="mt-2 text-[11px] leading-5 text-slate-500">El visto bueno del predial requiere revisar el documento oficial de Tesorería Municipal y confirmar que no haya adeudo de los últimos cinco años.</p></section>
      <form onSubmit={(event) => { event.preventDefault(); onSubmit(expediente.id, { ...form, confirmoNoAdeudo5Anos }); }} className="grid gap-4 sm:grid-cols-2">
        <label className="form-label">Estatus predial<select className="form-input mt-2" name="estatusPredial" value={form.estatusPredial} onChange={change}><option>Pendiente</option><option>Aprobado</option><option>Rechazado</option></select></label>
        <label className="form-label">Estatus de escrituras<select className="form-input mt-2" name="estatusEscrituras" value={form.estatusEscrituras} onChange={change}><option>Pendiente</option><option>En Revisión</option><option>Libre de Gravamen</option><option>Observado</option></select></label>
        {form.estatusPredial === 'Aprobado' && <label className="flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-950 sm:col-span-2"><input type="checkbox" checked={confirmoNoAdeudo5Anos} onChange={(event) => setConfirmoNoAdeudo5Anos(event.target.checked)} required /><span>Confirmo que revisé el Estado de Cuenta Catastral oficial y acredita no adeudo municipal de los últimos cinco años.</span></label>}
        <label className="form-label sm:col-span-2">Dictamen general<select className="form-input mt-2" name="estatusDictamenGeneral" value={form.estatusDictamenGeneral} onChange={change}><option>En Auditoría</option><option>Aprobado para Notaría</option><option>Rechazado</option></select></label>
        <label className="form-label sm:col-span-2">Comentarios jurídicos {needsReason ? '(motivo obligatorio)' : '(opcional)'}<textarea className="form-input mt-2" name="comentariosJuridicos" value={form.comentariosJuridicos} onChange={change} maxLength="5000" rows="4" required={needsReason} /></label>
        <div className="rounded-xl bg-rose-50 p-3 text-xs leading-5 text-rose-900 sm:col-span-2">Sin dictamen “Aprobado para Notaría”, CASAFAST no permite aprobar el apartado ni avanzar a notaría.</div>
        <button disabled={busy} className="rounded-xl bg-cyan-800 py-3 text-sm font-bold text-white hover:bg-cyan-900 disabled:opacity-50 sm:col-span-2">{busy ? 'Guardando dictamen…' : 'Guardar dictamen jurídico'}</button>
      </form>
    </div>
  </Modal>;
}

function ClientPropertyVisits({ visits, tramites, onReserve, onDismiss, busy }) {
  const [now, setNow] = useState(0);
  useEffect(() => {
    const updateTime = () => setNow(Date.now());
    updateTime();
    const interval = window.setInterval(updateTime, 6000);
    return () => window.clearInterval(interval);
  }, []);
  if (!visits.length) return null;
  return <section className="rounded-2xl border border-slate-200 bg-white p-5">
    <h2 className="mb-3 font-extrabold">Mis visitas a propiedades</h2>
    <div className="space-y-3">{visits.map((visit) => {
      const property = visit.propiedad;
      const appointmentTime = new Date(`${visit.fechaCita}T${visit.horaCita}:00`).getTime();
      const appointmentPassed = now > 0 && Number.isFinite(appointmentTime) && appointmentTime <= now;
      const canDecide = visit.estado === 'Confirmada' || appointmentPassed;
      const activeReservation = tramites.find((item) => item.propiedadCodigo === property?.codigo && ['Pendiente Aprobación', 'Aprobado'].includes(item.estado));
      const canReserve = property?.tipoOperacion !== 'Renta' && property?.estatus === 'Disponible';
      return <article key={visit.id} className="rounded-xl bg-slate-50 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2"><div><div className="text-sm font-bold text-slate-900">{property?.titulo}</div><div className="mt-1 text-xs text-slate-500">{property?.direccion} · {new Date(`${visit.fechaCita}T00:00:00`).toLocaleDateString('es-MX')} · {visit.horaCita}</div></div><StatusBadge status={visit.estado} /></div>
        {activeReservation
          ? <p className="mt-3 text-xs font-semibold text-amber-800">{activeReservation.estado === 'Aprobado' ? 'Tu apartado fue aprobado.' : 'Comprobante enviado; el apartado está pendiente de aprobación gerencial.'}</p>
          : visit.estado === 'Rechazada'
            ? <p className="mt-3 text-xs text-slate-600">El asesor no pudo confirmar esta visita.</p>
            : canDecide
              ? <div className="mt-3 rounded-xl border border-cyan-100 bg-white p-3">
                <p className="text-xs font-bold text-slate-800">{appointmentPassed ? '¿Qué deseas hacer después de la visita?' : 'Tu visita está confirmada.'}</p>
                {!appointmentPassed && <p className="mt-1 text-xs text-slate-500">Si ya no te interesa, puedes ocultarla ahora. El apartado estará disponible después de la visita.</p>}
                <div className="mt-3 flex flex-wrap gap-2">
                  {appointmentPassed && canReserve
                    ? <button disabled={busy} onClick={() => onReserve(property)} className="rounded-lg bg-cyan-800 px-3 py-2 text-xs font-bold text-white hover:bg-cyan-900 disabled:opacity-50">Subir comprobante de transferencia</button>
                    : appointmentPassed && property?.tipoOperacion === 'Renta'
                      ? <p className="self-center text-xs text-slate-500">Las propiedades en renta no admiten apartado en línea.</p>
                      : appointmentPassed
                        ? <p className="self-center text-xs text-slate-500">Esta propiedad ya no está disponible para apartado.</p>
                        : null}
                  <button disabled={busy} onClick={() => onDismiss(visit.id)} className="rounded-lg border border-rose-200 px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-50 disabled:opacity-50">No me interesa; ocultar de mi perfil</button>
                </div>
              </div>
              : <p className="mt-3 text-xs text-slate-500">El asesor debe confirmar la visita para que puedas descartar esta propiedad.</p>}
      </article>;
    })}</div>
  </section>;
}

function AdvisorPropertyPortfolio({ properties }) {
  return <section className="rounded-2xl border border-slate-200 bg-white p-5">
    <h3 className="mb-4 font-extrabold">Estatus de mis propiedades asignadas</h3>
    {properties.length ? <div className="space-y-3">{properties.map((property) => <article key={property.codigo} className="rounded-xl border border-slate-100 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2"><div><h4 className="font-bold text-slate-900">{property.titulo} · {property.tipoOperacion === 'Renta' ? 'Renta' : 'Venta'}</h4><p className="mt-1 text-xs text-slate-500">{property.direccion}, {property.zona} · {money(property.precio)}{property.tipoOperacion === 'Renta' ? ' al mes' : ''}</p></div><StatusBadge status={property.estatus} /></div>
      <div className="mt-3 grid gap-2 text-xs text-slate-600 sm:grid-cols-2"><span>Dictamen legal: <b>{property.expedienteLegal?.estatusDictamenGeneral || 'Pendiente de expediente'}</b></span><span>Publicación: <b className={property.publicada ? 'text-emerald-700' : 'text-amber-700'}>{property.publicada ? 'Publicada' : 'Oculta hasta aprobación legal'}</b></span><span>Predial: <b>{property.expedienteLegal?.estatusPredial || 'Pendiente'}</b></span><span>Escrituras: <b>{property.expedienteLegal?.estatusEscrituras || 'Pendiente'}</b></span></div>
    </article>)}</div> : <EmptyState text="Las propiedades inspeccionadas aparecerán aquí mientras avanzan por revisión administrativa y legal." />}
  </section>;
}

function Dashboard({ user, properties, advisorProperties = [], tramites, solicitudesVenta, advisorRequests = [], propertyVisits, onAction, onBrowse, onSell, onViewFiles, onInspect, onUpdateVisit, onDismissVisit, onReserve, onUploadReservationReceipt, onViewReceipt, onChoosePayment, onUploadBuyerDocuments, onViewBuyerDocuments, onReviewBuyerDocuments, onReviewFinancing, onScheduleSigning, busy }) {
  const ownProperties = properties.filter((property) => property.propietarioId === user.id);
  const approvals = tramites.filter((item) => item.estado === 'Pendiente Aprobación');
  const myTramites = tramites.filter((item) => item.compradorId === user.id);
  if (user.rol === 'cliente') {
    const latest = myTramites.find((item) => item.estado !== 'Rechazado') || myTramites[0];
    const progress = latest ? Math.min(Number(latest.progreso) || 0, 100) : 0;
    const uploadedBuyerDocuments = latest?.documentosComprador || [];
    const documents = latest ? [
      { name: 'Comprobante del anticipo', status: latest.comprobanteRecibido ? 'Recibido' : 'Pendiente del asesor' },
      ...uploadedBuyerDocuments.map((file) => ({ name: file.nombre, status: latest.estadoDocumentacion })),
    ] : [];
    const stages = ['Solicitud y anticipo', 'Validación gerencial', 'Expediente y financiamiento', 'Firma programada'];
    const currentStage = progress >= 100 ? 3 : progress >= 60 ? 2 : progress >= 40 ? 1 : 0;
    return <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6">
        <h2 className="text-lg font-black text-slate-950">¿Qué quieres hacer hoy?</h2>
        <p className="mt-1 text-sm text-slate-500">Explora propiedades o agenda una visita para vender la tuya.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <button onClick={onBrowse} className="flex items-center justify-between rounded-2xl border border-cyan-100 bg-cyan-50 p-4 text-left transition hover:border-cyan-300 hover:bg-cyan-100">
            <span><span className="block text-sm font-extrabold text-slate-900">Quiero comprar</span><span className="mt-1 block text-xs text-slate-600">Explorar propiedades disponibles</span></span><Search className="text-cyan-800" size={20} />
          </button>
          <button onClick={onSell} className="flex items-center justify-between rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-left transition hover:border-emerald-300 hover:bg-emerald-100">
            <span><span className="block text-sm font-extrabold text-slate-900">Vender o rentar mi propiedad</span><span className="mt-1 block text-xs text-slate-600">Agendar una visita con un asesor</span></span><CalendarDays className="text-emerald-800" size={20} />
          </button>
        </div>
      </section>
      <section className="grid gap-4 sm:grid-cols-3">
        <Stat icon={House} label="Mis propiedades anunciadas" value={ownProperties.length} />
        <Stat icon={Eye} label="Visitas a mis propiedades" value={ownProperties.reduce((sum, item) => sum + item.visitas, 0)} color="violet" />
        <Stat icon={Activity} label="Ofertas recibidas" value={ownProperties.reduce((sum, item) => sum + item.ofertas, 0)} color="emerald" />
      </section>
      {ownProperties.length > 0 && <section className="rounded-2xl border border-slate-200 bg-white p-5"><h2 className="mb-3 font-extrabold">Mis propiedades</h2><PropertyList properties={ownProperties} /></section>}
      <ClientPropertyVisits visits={propertyVisits} tramites={myTramites} onReserve={onReserve} onDismiss={onDismissVisit} busy={busy} />
      <ClientSalesRequests requests={solicitudesVenta} onViewFiles={onViewFiles} />
      <section className="rounded-3xl bg-slate-950 p-6 text-white sm:p-8"><div className="flex flex-wrap items-start justify-between gap-4"><div><div className="text-xs font-bold uppercase tracking-widest text-cyan-300">Mi compra</div><h2 className="mt-2 text-2xl font-black">{latest?.propiedad?.titulo || 'Aún no tienes una propiedad apartada'}</h2><p className="mt-2 text-sm text-slate-300">{latest?.propiedad?.direccion || 'Cuando apartes una propiedad, podrás seguir aquí el avance.'}</p></div>{latest && <StatusBadge status={latest.estado === 'Aprobado' ? 'Apartado' : latest.estado} />}</div>
        {latest && <><p className="mt-3 text-xs text-slate-300">Propuesta: <b>{latest.propuestaEconomica ? money(latest.propuestaEconomica) : 'Pendiente de registro'}</b> · Pago: <b>{latest.metodoPago || 'Pendiente de selección'}</b> · Anticipo: <b>{money(latest.montoApartado)}</b></p><div className="mt-7 flex items-center justify-between text-xs font-bold"><span>Avance del proceso</span><span>{progress}%</span></div><div className="mt-2 h-2.5 overflow-hidden rounded-full bg-white/15"><div className="h-full rounded-full bg-cyan-300 transition-all" style={{ width: `${progress}%` }} /></div><div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">{stages.map((stage, index) => <div key={stage} className={`rounded-xl border p-3 text-xs ${index <= currentStage ? 'border-cyan-300/40 bg-cyan-300/10 text-cyan-100' : 'border-white/10 text-slate-400'}`}><div className="mb-2">{index < currentStage ? <CheckCircle2 size={17} /> : <Clock3 size={17} />}</div>{stage}</div>)}</div></>}
      </section>
      {latest && <section className="rounded-2xl border border-slate-200 bg-white p-5"><h3 className="font-extrabold">Siguiente paso de tu compra</h3><BuyerPurchaseActions tramite={latest} onChoosePayment={onChoosePayment} onUploadDocuments={onUploadBuyerDocuments} onViewDocuments={onViewBuyerDocuments} busy={busy} /></section>}
      {latest && <div className="grid gap-5 lg:grid-cols-2"><section className="rounded-2xl border border-slate-200 bg-white p-5"><h3 className="flex items-center gap-2 font-extrabold"><FileCheck2 size={18} className="text-cyan-800" /> Estado del expediente</h3><div className="mt-3 divide-y divide-slate-100">{documents.map((document) => <div key={document.name} className="flex items-center justify-between gap-3 py-3"><span className="flex min-w-0 items-center gap-2 text-xs font-semibold"><FileText size={16} className="shrink-0 text-cyan-800" /><span className="truncate">{document.name}</span></span><span className={`shrink-0 text-[10px] font-bold ${['Validado', 'Aprobado', 'Recibido'].includes(document.status) ? 'text-emerald-700' : document.status === 'En Revisión' ? 'text-amber-700' : document.status === 'Observado' ? 'text-rose-700' : 'text-slate-400'}`}>{document.status}</span></div>)}</div></section><section className="rounded-2xl border border-slate-200 bg-white p-5"><h3 className="flex items-center gap-2 font-extrabold"><Building2 size={18} className="text-cyan-800" /> Firma en notaría</h3>{latest.fechaFirma ? <p className="mt-4 text-sm font-bold text-slate-800">{latest.notaria} · {new Date(`${latest.fechaFirma}T00:00:00`).toLocaleDateString('es-MX')} · {latest.horaFirma}</p> : <p className="mt-4 text-sm font-bold text-slate-800">Pendiente de revisión administrativa y financiamiento.</p>}<p className="mt-1 text-xs text-slate-500">La fecha se programa cuando el expediente del comprador y, si aplica, el financiamiento estén aprobados.</p></section></div>}
    </div>;
  }
  if (user.rol === 'asesor') {
    const pending = tramites.filter((item) => item.estado === 'Pendiente Aprobación').length;
    const value = advisorProperties.filter((item) => item.tipoOperacion !== 'Renta').reduce((sum, item) => sum + Number(item.precio), 0);
    const appointments = propertyVisits.filter((item) => item.estado !== 'Rechazada' && !item.clienteDescarto).length + advisorRequests.filter((item) => item.estado === 'Asignada').length;
    return <div className="space-y-6"><div><h2 className="text-xl font-black text-slate-950">Panel de Inicio del Asesor Inmobiliario</h2><p className="mt-1 text-sm text-slate-500">Gestiona tu agenda, las captaciones, los anticipos y el estatus de tus propiedades.</p></div><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><Stat icon={Building2} label="Propiedades asignadas" value={advisorProperties.length} /><Stat icon={CalendarDays} label="Citas en agenda" value={appointments} color="violet" /><Stat icon={Wallet} label="Comisión estimada" value={money(value * 0.03)} note="Estimación demostrativa al 3% en ventas" color="emerald" /><Stat icon={Clock3} label="Apartados por aprobar" value={pending} color="amber" /></div><AdvisorAgenda visits={propertyVisits} requests={advisorRequests} onInspect={onInspect} onViewFiles={onViewFiles} onUpdateVisit={onUpdateVisit} busy={busy} /><AdvisorReservationQueue tramites={tramites} onUpload={onUploadReservationReceipt} onView={onViewReceipt} busy={busy} /><AdvisorPropertyPortfolio properties={advisorProperties} /></div>;
  }
  return <div className="space-y-6">
    <div className="grid gap-4 sm:grid-cols-3"><Stat icon={Clock3} label="Solicitudes pendientes" value={approvals.length} color="amber" /><Stat icon={BadgeCheck} label="Apartados aprobados" value={tramites.filter((item) => item.estado === 'Aprobado').length} color="emerald" /><Stat icon={Building2} label="Inventario" value={properties.length} /></div>
    <ManagerReservationApprovals approvals={approvals} onAction={onAction} onViewReceipt={onViewReceipt} busy={busy} />
    <ManagerPurchaseWorkflow tramites={tramites} onViewDocuments={onViewBuyerDocuments} onReviewDocuments={onReviewBuyerDocuments} onReviewFinancing={onReviewFinancing} onScheduleSigning={onScheduleSigning} busy={busy} />
  </div>;
}

function PropertyList({ properties }) {
  return <div className="divide-y divide-slate-100">{properties.map((property) => <div key={property.codigo} className="flex flex-wrap items-center justify-between gap-3 py-3"><div><div className="text-sm font-bold text-slate-900">{property.titulo} · {property.tipoOperacion === 'Renta' ? 'Renta' : 'Venta'}</div><div className="mt-1 text-xs text-slate-500">{property.zona} · {money(property.precio)}{property.tipoOperacion === 'Renta' ? ' al mes' : ''} · {surfaceSummary(property)} · {property.recamaras} rec. · {Number(property.banos)} baños{inspectedProperty(property) ? ` · ${Number(property.cocheras) || 0} cocheras` : ''}</div></div><StatusBadge status={property.estatus} /></div>)}</div>;
}

function EmptyState({ text }) {
  return <div className="rounded-xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">{text}</div>;
}

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem('casafast-token') || '');
  const [user, setUser] = useState(null);
  const [properties, setProperties] = useState([]);
  const [advisorProperties, setAdvisorProperties] = useState([]);
  const [tramites, setTramites] = useState([]);
  const [solicitudesVenta, setSolicitudesVenta] = useState([]);
  const [propertyVisits, setPropertyVisits] = useState([]);
  const [legalExpedientes, setLegalExpedientes] = useState([]);
  const [legalLoading, setLegalLoading] = useState(true);
  const [advisors, setAdvisors] = useState([]);
  const [query, setQuery] = useState('');
  const [operationFilter, setOperationFilter] = useState('Todas');
  const [view, setView] = useState('dashboard');
  const [modal, setModal] = useState(null);
  const [busy, setBusy] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [toast, setToast] = useState({ message: '', type: 'success' });

  const notify = useCallback((message, type = 'success') => {
    setToast({ message, type });
    window.setTimeout(() => setToast({ message: '', type: 'success' }), 3800);
  }, []);

  const refresh = useCallback(async (activeToken = token) => {
    if (!activeToken) return;
    try {
      const [propertyData, advisorPropertyData, tramiteData, salesData, visitData, legalData] = await Promise.all([
        request('/propiedades', { token: activeToken }),
        user?.rol === 'asesor' ? request('/asesor/propiedades', { token: activeToken }) : Promise.resolve([]),
        user?.rol === 'responsable_legal' ? Promise.resolve([]) : request('/tramites', { token: activeToken }),
        user?.rol === 'responsable_legal' ? Promise.resolve([]) : request('/solicitudes-venta', { token: activeToken }),
        ['cliente', 'asesor'].includes(user?.rol) ? request('/visitas', { token: activeToken }) : Promise.resolve([]),
        user?.rol === 'responsable_legal' ? request('/expedientes-legales', { token: activeToken }) : Promise.resolve([]),
      ]);
      setProperties(propertyData);
      setAdvisorProperties(advisorPropertyData);
      setTramites(tramiteData);
      setSolicitudesVenta(salesData);
      setPropertyVisits(visitData);
      setLegalExpedientes(legalData);
    } catch (error) {
      notify(error.message, 'error');
    } finally {
      if (user?.rol === 'responsable_legal') setLegalLoading(false);
    }
  }, [token, user, notify]);

  useEffect(() => {
    if (!token) return;
    request('/me', { token }).then(({ usuario }) => setUser(usuario)).catch(() => {
      localStorage.removeItem('casafast-token');
      setToken('');
    });
  }, [token]);

  useEffect(() => {
    if (!user || !token) return;
    const initialLoad = window.setTimeout(() => {
      refresh(token);
      if (user.rol === 'gerente') {
        request('/usuarios/asesores', { token }).then(setAdvisors).catch((error) => notify(error.message, 'error'));
      }
    }, 0);
    const interval = window.setInterval(() => refresh(token), 6000);
    return () => {
      window.clearTimeout(initialLoad);
      window.clearInterval(interval);
    };
  }, [user, token, refresh, notify]);

  const login = async (email, password) => {
    setBusy(true); setLoginError('');
    try {
      const data = await request('/login', { method: 'POST', body: JSON.stringify({ email, password }) });
      localStorage.setItem('casafast-token', data.token);
      setToken(data.token); setUser(data.usuario); setView('dashboard');
      notify(`Sesión iniciada como ${ROLE_INFO[data.usuario.rol].title}.`);
    } catch (error) { setLoginError(error.message); }
    finally { setBusy(false); }
  };

  const logout = async () => {
    try { await request('/logout', { token }); } catch { /* La sesión local siempre debe cerrarse. */ }
    localStorage.removeItem('casafast-token');
    setToken(''); setUser(null); setProperties([]); setAdvisorProperties([]); setTramites([]); setSolicitudesVenta([]); setPropertyVisits([]); setLegalExpedientes([]); setLegalLoading(true); setAdvisors([]); setView('dashboard');
    notify('Sesión cerrada.');
  };

  const reserve = async (data) => {
    setBusy(true);
    try {
      await request('/apartados', { method: 'POST', token, body: JSON.stringify(data) });
      setModal(null); await refresh(token); notify('Solicitud enviada. El asesor cargará el comprobante del anticipo para validación gerencial.');
    } catch (error) { notify(error.message, 'error'); }
    finally { setBusy(false); }
  };

  const uploadReservationReceipt = async (id, data) => {
    setBusy(true);
    try {
      await request(`/tramites/${id}/comprobante`, { method: 'PUT', token, body: JSON.stringify(data) });
      await refresh(token);
      notify('Comprobante cargado para validación gerencial.');
    } catch (error) { notify(error.message, 'error'); }
    finally { setBusy(false); }
  };

  const updatePurchaseStep = async (id, step, data, successMessage) => {
    setBusy(true);
    try {
      await request(`/tramites/${id}/${step}`, { method: 'PUT', token, body: JSON.stringify(data) });
      await refresh(token);
      notify(successMessage);
    } catch (error) { notify(error.message, 'error'); }
    finally { setBusy(false); }
  };

  const openReservationReceipt = async (id) => {
    try {
      const receipt = await request(`/tramites/${id}/comprobante`, { token });
      setModal({ type: 'purchaseFiles', title: 'Comprobante del anticipo', files: [receipt] });
    } catch (error) { notify(error.message, 'error'); }
  };

  const openBuyerDocuments = async (id) => {
    try {
      const { documentos } = await request(`/tramites/${id}/documentos`, { token });
      setModal({ type: 'purchaseFiles', title: 'Documentos del comprador', files: documentos });
    } catch (error) { notify(error.message, 'error'); }
  };

  const choosePurchaseMethod = (id, metodoPago) => updatePurchaseStep(id, 'metodo-pago', { metodoPago }, 'Método de pago guardado.');
  const uploadBuyerDocuments = (id, documentos) => updatePurchaseStep(id, 'documentos', { documentos }, 'Documentos enviados para revisión administrativa.');
  const reviewBuyerDocuments = (id, data) => updatePurchaseStep(id, 'documentos/revision', data, data.decision === 'Aprobado' ? 'Documentación aprobada.' : 'Se registraron observaciones para el comprador.');
  const reviewFinancing = (id, estadoFinanciamiento) => updatePurchaseStep(id, 'financiamiento', { estadoFinanciamiento }, 'Resultado de financiamiento actualizado.');
  const scheduleSigning = (id, data) => updatePurchaseStep(id, 'firma', data, 'Firma en notaría programada.');

  const openPropertyDetails = async (property) => {
    setModal({ type: 'propertyDetail', property, loading: true });
    try {
      const detail = await request(`/propiedades/${encodeURIComponent(property.codigo)}`, { token });
      setModal((current) => current?.type === 'propertyDetail' && current.property.codigo === property.codigo
        ? { type: 'propertyDetail', property: detail, loading: false }
        : current);
    } catch (error) {
      setModal(null);
      notify(error.message, 'error');
    }
  };

  const schedulePropertyVisit = async (data) => {
    setBusy(true);
    try {
      await request('/visitas', { method: 'POST', token, body: JSON.stringify(data) });
      setModal(null);
      await refresh(token);
      notify('Tu solicitud de visita fue enviada. CASAFAST confirmará el horario.');
    } catch (error) {
      notify(error.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const dismissPropertyVisit = async (id) => {
    setBusy(true);
    try {
      await request(`/visitas/${id}/decision`, { method: 'PUT', token, body: JSON.stringify({ decision: 'descartar' }) });
      await refresh(token);
      notify('La propiedad se ocultó de tu perfil; seguirá disponible en el catálogo si aún está publicada.');
    } catch (error) {
      notify(error.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const updatePropertyVisit = async (id, estado) => {
    setBusy(true);
    try {
      await request(`/visitas/${id}`, { method: 'PUT', token, body: JSON.stringify({ estado }) });
      await refresh(token);
      notify(estado === 'Confirmada' ? 'Cita confirmada.' : 'Cita rechazada.');
    } catch (error) {
      notify(error.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const openLegalReview = async (expediente) => {
    setModal({ type: 'legalReviewLoading', expediente });
    try {
      const detail = await request(`/expedientes-legales/${expediente.id}`, { token });
      setModal((current) => current?.type === 'legalReviewLoading' && current.expediente.id === expediente.id
        ? { type: 'legalReview', expediente: detail }
        : current);
    } catch (error) {
      setModal((current) => current?.type === 'legalReviewLoading' && current.expediente.id === expediente.id ? null : current);
      notify(error.message, 'error');
    }
  };

  const openLegalDocument = (event, file) => {
    event.preventDefault();
    try {
      const [metadata, encodedData] = file.data.split(',', 2);
      const mimeType = metadata.match(/^data:([^;]+);base64$/i)?.[1];
      if (!mimeType || !encodedData) throw new Error('El documento no tiene un formato que se pueda abrir.');
      const decoded = window.atob(encodedData);
      const bytes = Uint8Array.from(decoded, (character) => character.charCodeAt(0));
      const objectUrl = window.URL.createObjectURL(new Blob([bytes], { type: mimeType }));
      window.location.assign(objectUrl);
    } catch (error) {
      notify(error.message || 'No se pudo abrir el documento.', 'error');
    }
  };

  const saveLegalReview = async (id, data) => {
    setBusy(true);
    try {
      await request(`/expedientes-legales/${id}/dictamen`, { method: 'PUT', token, body: JSON.stringify(data) });
      setModal(null);
      await refresh(token);
      notify('Dictamen jurídico guardado.');
    } catch (error) {
      notify(error.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const submitSaleRequest = async (data) => {
    setBusy(true);
    try {
      await request('/solicitudes-venta', { method: 'POST', token, body: JSON.stringify(data) });
      setModal(null);
      await refresh(token);
      notify('Tu solicitud de visita fue enviada. El gerente asignará un asesor.');
    } catch (error) {
      notify(error.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const assignSaleRequest = async (id, asesorId) => {
    try {
      await request(`/solicitudes-venta/${id}/asignacion`, { method: 'PUT', token, body: JSON.stringify({ asesorId }) });
      await refresh(token);
      notify('Asesor asignado a la visita para venta o renta.');
    } catch (error) {
      notify(error.message, 'error');
    }
  };

  const completeSaleInspection = async (id, data) => {
    setBusy(true);
    try {
      await request(`/solicitudes-venta/${id}/inspeccion`, { method: 'PUT', token, body: JSON.stringify(data) });
      setModal(null);
      await refresh(token);
      notify('Inspección guardada y propiedad publicada en el catálogo.');
    } catch (error) {
      notify(error.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const viewInspectionFiles = async (solicitud) => {
    try {
      const files = await request(`/solicitudes-venta/${solicitud.id}/archivos`, { token });
      setModal({ type: 'files', solicitud, files });
    } catch (error) {
      notify(error.message, 'error');
    }
  };

  const actOnReservation = async (codigo, accion) => {
    try {
      await request(`/propiedades/${encodeURIComponent(codigo)}`, { method: 'PUT', token, body: JSON.stringify({ accion }) });
      await refresh(token);
      notify(accion === 'aprobar' ? 'Apartado aprobado y propiedad reservada.' : 'Apartado rechazado; propiedad disponible.');
    } catch (error) { notify(error.message, 'error'); }
  };

  const visibleProperties = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('es-MX');
    return properties.filter((property) => (
      (operationFilter === 'Todas' || (property.tipoOperacion || 'Venta') === operationFilter) &&
      `${property.titulo} ${property.zona} ${property.direccion}`.toLocaleLowerCase('es-MX').includes(normalized)
    ));
  }, [properties, query, operationFilter]);

  if (!user) return <><Login onLogin={login} busy={busy} error={loginError} /><Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'success' })} /></>;

  const role = ROLE_INFO[user.rol];
  return <div className="min-h-screen bg-slate-50 text-slate-900">
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-[76px] max-w-7xl items-center justify-between px-4 sm:px-7">
        <Brand compact />
        {!['gerente', 'responsable_legal'].includes(user.rol) && <nav className="hidden items-center gap-1 md:flex">
          <button onClick={() => setView('dashboard')} className={`nav-link ${view === 'dashboard' ? 'nav-active' : ''}`}><LayoutDashboard size={16} /> Mi panel</button>
          <button onClick={() => setView('catalog')} className={`nav-link ${view === 'catalog' ? 'nav-active' : ''}`}><Search size={16} /> Propiedades</button>
        </nav>}
        <div className="flex items-center gap-2 sm:gap-3">
          <span className={`hidden rounded-full px-3 py-1.5 text-[11px] font-bold sm:inline-flex ${role.color}`}>{role.title}</span>
          <div className="hidden text-right sm:block"><div className="text-xs font-bold">{user.nombre}</div><div className="text-[10px] text-slate-500">{user.email}</div></div>
          <button onClick={logout} title="Cerrar sesión" className="rounded-xl border border-slate-200 p-2.5 text-slate-600 hover:bg-slate-50"><LogOut size={17} /></button>
        </div>
      </div>
      {!['gerente', 'responsable_legal'].includes(user.rol) && <div className="flex border-t border-slate-100 px-4 py-2 md:hidden"><button onClick={() => setView('dashboard')} className={`nav-link flex-1 justify-center ${view === 'dashboard' ? 'nav-active' : ''}`}>Mi panel</button><button onClick={() => setView('catalog')} className={`nav-link flex-1 justify-center ${view === 'catalog' ? 'nav-active' : ''}`}>Propiedades</button></div>}
    </header>
    <main className="mx-auto max-w-7xl space-y-7 px-4 py-7 sm:px-7 sm:py-9">
      <section className="flex flex-wrap items-end justify-between gap-4"><div><div className="text-xs font-bold uppercase tracking-[.18em] text-cyan-800">Sucursal Culiacán Tres Ríos</div><h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">{view === 'catalog' ? 'Catálogo de propiedades' : `Hola, ${user.nombre.split(' ')[0]}`}</h1><p className="mt-1 text-sm text-slate-500">{view === 'catalog' ? 'Encuentra propiedades en venta o renta en Culiacán.' : user.rol === 'gerente' ? 'Administra solicitudes de venta y renta y asigna las visitas a los asesores.' : user.rol === 'responsable_legal' ? 'Audita los expedientes fiscales y jurídicos de los inmuebles.' : 'Aquí tienes un resumen actualizado de tu actividad.'}</p></div></section>
      {view === 'dashboard' && user.rol === 'gerente'
        ? <ManagerSalesDashboard requests={solicitudesVenta} advisors={advisors} onAssign={assignSaleRequest} />
        : view === 'dashboard' && user.rol === 'responsable_legal'
          ? <LegalReviewDashboard expedientes={legalExpedientes} loading={legalLoading} onReview={openLegalReview} />
        : view === 'dashboard'
          ? <Dashboard
            user={user}
            properties={properties}
            advisorProperties={advisorProperties}
            tramites={tramites}
            solicitudesVenta={solicitudesVenta.filter((item) => item.propietarioId === user.id)}
            advisorRequests={user.rol === 'asesor' ? solicitudesVenta : []}
            propertyVisits={propertyVisits}
            onAction={actOnReservation}
            onBrowse={() => setView('catalog')}
            onSell={() => setModal('sell')}
            onReserve={(property) => setModal({ type: 'reserve', property })}
            onDismissVisit={dismissPropertyVisit}
            onViewFiles={viewInspectionFiles}
            onInspect={(item) => setModal({ type: 'inspection', solicitud: item })}
            onUpdateVisit={updatePropertyVisit}
            onUploadReservationReceipt={uploadReservationReceipt}
            onViewReceipt={openReservationReceipt}
            onChoosePayment={choosePurchaseMethod}
            onUploadBuyerDocuments={uploadBuyerDocuments}
            onViewBuyerDocuments={openBuyerDocuments}
            onReviewBuyerDocuments={reviewBuyerDocuments}
            onReviewFinancing={reviewFinancing}
            onScheduleSigning={scheduleSigning}
            busy={busy}
          />
          : <section>
            <div className="mb-5 flex flex-col gap-3 sm:flex-row">
              <label className="relative flex-1"><Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} /><input className="form-input pl-10" placeholder="Buscar por zona, nombre o dirección…" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
              <select aria-label="Filtrar por operación" className="form-input sm:w-44" value={operationFilter} onChange={(event) => setOperationFilter(event.target.value)}><option value="Todas">Venta y renta</option><option value="Venta">Venta</option><option value="Renta">Renta</option></select>
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-600"><SlidersHorizontal size={16} /> {visibleProperties.length} inmuebles</div>
            </div>
            {visibleProperties.length ? <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{visibleProperties.map((property) => <PropertyCard key={property.codigo} property={property} onDetails={openPropertyDetails} onSchedule={(item) => setModal({ type: 'propertyVisit', property: item })} onReserve={(item) => setModal({ type: 'reserve', property: item })} reserveDisabled={user.rol !== 'cliente'} />)}</div> : <EmptyState text="No encontramos propiedades con esos términos." />}
            {user.rol !== 'cliente' && <p className="mt-4 text-xs text-slate-500">Las visitas pueden agendarse desde el detalle; los apartados en línea son solo para propiedades en venta y clientes.</p>}
          </section>}
    </main>
    <footer className="mt-12 border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">© 2026 CASAFAST · Plataforma inmobiliaria</footer>
    {modal === 'sell' && <SellAppointmentModal user={user} onClose={() => setModal(null)} onSubmit={submitSaleRequest} busy={busy} />}
    {modal?.type === 'propertyDetail' && <PropertyDetailModal property={modal.property} loading={modal.loading} canAct={user.rol === 'cliente'} onClose={() => setModal(null)} onSchedule={(property) => setModal({ type: 'propertyVisit', property })} onReserve={(property) => setModal({ type: 'reserve', property })} />}
    {modal?.type === 'legalReviewLoading' && <Modal title="Expediente legal" onClose={() => setModal(null)} subtitle="Consultando los documentos de la propiedad."><div className="py-16 text-center text-sm text-slate-500">Cargando expediente legal…</div></Modal>}
    {modal?.type === 'propertyVisit' && <PropertyVisitModal property={modal.property} user={user} onClose={() => setModal(null)} onSubmit={schedulePropertyVisit} busy={busy} />}
    {modal?.type === 'inspection' && <InspectionModal solicitud={modal.solicitud} onClose={() => setModal(null)} onSubmit={completeSaleInspection} busy={busy} />}
    {modal?.type === 'files' && <InspectionFilesModal solicitud={modal.solicitud} files={modal.files} onClose={() => setModal(null)} />}
    {modal?.type === 'reserve' && <ReservationModal property={modal.property} user={user} onClose={() => setModal(null)} onSubmit={reserve} busy={busy} />}
    {modal?.type === 'purchaseFiles' && <Modal title={modal.title} onClose={() => setModal(null)}><div className="space-y-2">{modal.files.map((file, index) => <a key={`${file.tipo || 'receipt'}-${file.nombre}-${index}`} href={file.data} download={file.nombre} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-xl border border-slate-200 p-3 text-xs font-semibold text-cyan-800 hover:bg-cyan-50"><FileText size={16} />{file.tipo ? `${file.tipo}: ` : ''}{file.nombre}</a>)}</div></Modal>}
    {modal?.type === 'legalReview' && <LegalReviewModal expediente={modal.expediente} onClose={() => setModal(null)} onSubmit={saveLegalReview} onOpenDocument={openLegalDocument} busy={busy} />}
    <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'success' })} />
  </div>;
}
