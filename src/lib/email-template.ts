import { ItemPedido } from './types';

interface EmailData {
  codigoPedido: string;
  nombreUsuario: string;
  email: string;
  telefono: string;
  tipoDoc: string;
  nroDoc: string;
  comunidad: string;
  items: ItemPedido[];
  totalGeneral: string;
  tipoEntrega: string;
  marcaTemporal: string;
}

export function generarEmailHTML(d: EmailData): string {
  const filasLibros = d.items.map(i => `
    <tr style="border-bottom:1px solid #f0f0f0">
      <td style="font-size:13px;color:#1a1a1a;padding:8px 6px">${i.titulo}</td>
      <td style="font-size:13px;color:#555;padding:8px 6px;text-align:center">${i.cantidad}</td>
      <td style="font-size:13px;color:#1a1a1a;padding:8px 6px;text-align:right">
        S/ ${(i.cantidad * i.precioUnit).toFixed(2)}
      </td>
    </tr>`).join('');

  return `<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f2f2f2;font-family:Helvetica,Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f2f2f2;padding:20px 10px">
<tr><td align="center">
<table width="100%" style="max-width:580px;border-collapse:collapse">
  <tr><td style="background:#1a1a1a;padding:20px 28px;border-radius:10px 10px 0 0">
    <table width="100%"><tr>
      <td style="color:#fff;font-size:20px;font-weight:bold">Fondo Editorial</td>
      <td align="right" style="color:#aaa;font-size:12px">Universidad Continental</td>
    </tr></table>
  </td></tr>
  <tr><td style="background:#2d6a4f;padding:10px 28px">
    <span style="color:#fff;font-size:13px;font-weight:bold">Pedido N.° ${d.codigoPedido}</span>
    <span style="color:#a8d5b8;font-size:12px;margin-left:12px">${d.marcaTemporal}</span>
  </td></tr>
  <tr><td style="background:#fff;padding:28px">
    <p style="margin:0 0 18px;font-size:15px;color:#1a1a1a">
      Estimado(a) <strong>${d.nombreUsuario}</strong>, gracias por tu pedido.
    </p>
    <p style="margin:0 0 22px;font-size:13px;color:#555">
      Hemos registrado tu solicitud. El equipo del Fondo Editorial se comunicará contigo
      para confirmar el pago y coordinar la entrega.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:22px">
      <tr><td colspan="2" style="font-size:11px;font-weight:bold;color:#888;text-transform:uppercase;
          letter-spacing:1px;padding-bottom:8px;border-bottom:1px solid #eee">Datos del comprador</td></tr>
      <tr><td style="font-size:13px;color:#888;padding:6px 0;width:40%">Correo</td>
          <td style="font-size:13px;color:#1a1a1a;padding:6px 0">${d.email}</td></tr>
      <tr><td style="font-size:13px;color:#888;padding:4px 0">Teléfono</td>
          <td style="font-size:13px;color:#1a1a1a;padding:4px 0">${d.telefono}</td></tr>
      <tr><td style="font-size:13px;color:#888;padding:4px 0">${d.tipoDoc}</td>
          <td style="font-size:13px;color:#1a1a1a;padding:4px 0">${d.nroDoc}</td></tr>
      <tr><td style="font-size:13px;color:#888;padding:4px 0">Tipo cliente</td>
          <td style="font-size:13px;color:#1a1a1a;padding:4px 0">${d.comunidad}</td></tr>
    </table>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:22px">
      <tr><td colspan="3" style="font-size:11px;font-weight:bold;color:#888;text-transform:uppercase;
          letter-spacing:1px;padding-bottom:8px;border-bottom:1px solid #eee">Libros solicitados</td></tr>
      <tr style="background:#f9f9f9">
        <td style="font-size:11px;color:#888;padding:6px;font-weight:bold">Título</td>
        <td style="font-size:11px;color:#888;padding:6px;font-weight:bold;text-align:center">Cant.</td>
        <td style="font-size:11px;color:#888;padding:6px;font-weight:bold;text-align:right">Subtotal</td>
      </tr>
      ${filasLibros}
      <tr style="background:#f5f4f0">
        <td colspan="2" style="font-size:14px;font-weight:bold;color:#1a1a1a;padding:10px 6px">Total</td>
        <td style="font-size:14px;font-weight:bold;color:#1a1a1a;padding:10px 6px;text-align:right">
          S/ ${d.totalGeneral}
        </td>
      </tr>
    </table>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:22px">
      <tr><td style="font-size:11px;font-weight:bold;color:#888;text-transform:uppercase;
          letter-spacing:1px;padding-bottom:8px;border-bottom:1px solid #eee">Entrega</td></tr>
      <tr><td style="font-size:13px;color:#1a1a1a;padding:7px 0">${d.tipoEntrega}</td></tr>
    </table>
    <p style="margin:0;font-size:13px;color:#555;line-height:1.6">
      Para consultas: <a href="mailto:fondoeditorial@continental.edu.pe"
      style="color:#2d6a4f">fondoeditorial@continental.edu.pe</a> |
      064-481430 anexo 7863 | WhatsApp +51 989 149 400
    </p>
  </td></tr>
  <tr><td style="background:#1a1a1a;padding:14px 28px;border-radius:0 0 10px 10px;
      text-align:center;color:#666;font-size:11px">
    &copy; ${new Date().getFullYear()} Fondo Editorial — Universidad Continental
  </td></tr>
</table>
</td></tr></table>
</body></html>`;
}