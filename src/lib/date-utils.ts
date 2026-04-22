import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import customParseFormat from 'dayjs/plugin/customParseFormat';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(customParseFormat);

export const TIMEZONE = 'America/Lima';

export function obtenerMarcaTemporalActual() {
  return dayjs().tz(TIMEZONE).format('DD/MM/YYYY HH:mm');
}

export function parsearFecha(fechaStr: string) {
  return dayjs.tz(fechaStr, 'DD/MM/YYYY HH:mm', TIMEZONE);
}

export function calcularSLA(inicioStr: string, finStr: string) {
  if (!inicioStr || !finStr) return null;
  const inicio = parsearFecha(inicioStr);
  const fin = parsearFecha(finStr);

  if (!inicio.isValid() || !fin.isValid()) return null;

  const diffMinutos = fin.diff(inicio, 'minute');
  const horas = Math.floor(diffMinutos / 60);
  const minutos = diffMinutos % 60;

  if (horas === 0) return `${minutos} min`;
  return `${horas}h ${minutos}m`;
}
