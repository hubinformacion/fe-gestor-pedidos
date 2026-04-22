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
      <td style="font-size:13px;color:#1a1a1a;padding:10px 8px">${i.titulo}</td>
      <td style="font-size:13px;color:#555;padding:10px 8px;text-align:center">${i.cantidad}</td>
      <td style="font-size:13px;color:#1a1a1a;padding:10px 8px;text-align:right;white-space:nowrap;min-width:100px">
        S/ ${(i.cantidad * i.precioUnit).toFixed(2)}
      </td>
    </tr>`).join('');

  return `<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f4f2f7;font-family:Helvetica,Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f2f7;padding:24px 10px">
<tr><td align="center">
<table width="100%" style="max-width:580px;border-collapse:collapse">
  <!-- Header with logo -->
  <tr><td style="background:#ffffff;padding:20px 28px;border-radius:12px 12px 0 0;border-bottom:3px solid #6802C1">
    <table width="100%" cellpadding="0" cellspacing="0"><tr>
      <td style="font-size:20px;font-weight:bold;color:#1a1a1a">Fondo Editorial</td>
      <td align="right"><img src="https://gallery.mailchimp.com/656fbe8d69172395c3bfc518a/images/1aef640b-0bc8-4eea-84d5-74078777589a.png" alt="Universidad Continental" style="max-height:45px;width:auto" /></td>
    </tr></table>
  </td></tr>
  <!-- Order badge -->
  <tr><td style="background:#6802C1;padding:12px 28px">
    <span style="color:#fff;font-size:14px;font-weight:bold">Pedido N.° ${d.codigoPedido}</span>
    <span style="color:rgba(255,255,255,0.7);font-size:12px;margin-left:12px">${d.marcaTemporal}</span>
  </td></tr>
  <!-- Body -->
  <tr><td style="background:#fff;padding:28px">
    <p style="margin:0 0 18px;font-size:15px;color:#1a1a1a">
      Estimado(a) <strong>${d.nombreUsuario}</strong>, gracias por tu pedido.
    </p>
    <p style="margin:0 0 24px;font-size:13px;color:#555;line-height:1.6">
      Hemos registrado tu solicitud. El equipo del Fondo Editorial se comunicará contigo
      para confirmar el pago y coordinar la entrega.
    </p>
    <!-- Buyer info -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px">
      <tr><td colspan="2" style="font-size:11px;font-weight:bold;color:#6802C1;text-transform:uppercase;
          letter-spacing:1px;padding-bottom:8px;border-bottom:2px solid #f0ecf5">Datos del comprador</td></tr>
      <tr><td style="font-size:13px;color:#888;padding:6px 0;width:40%">Correo</td>
          <td style="font-size:13px;color:#1a1a1a;padding:6px 0">${d.email}</td></tr>
      <tr><td style="font-size:13px;color:#888;padding:4px 0">Teléfono</td>
          <td style="font-size:13px;color:#1a1a1a;padding:4px 0">${d.telefono}</td></tr>
      <tr><td style="font-size:13px;color:#888;padding:4px 0">${d.tipoDoc}</td>
          <td style="font-size:13px;color:#1a1a1a;padding:4px 0">${d.nroDoc}</td></tr>
      <tr><td style="font-size:13px;color:#888;padding:4px 0">Tipo cliente</td>
          <td style="font-size:13px;color:#1a1a1a;padding:4px 0">${d.comunidad}</td></tr>
    </table>
    <!-- Books table -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px">
      <tr><td colspan="3" style="font-size:11px;font-weight:bold;color:#6802C1;text-transform:uppercase;
          letter-spacing:1px;padding-bottom:8px;border-bottom:2px solid #f0ecf5">Libros solicitados</td></tr>
      <tr style="background:#f9f7fc">
        <td style="font-size:11px;color:#888;padding:8px;font-weight:bold">Título</td>
        <td style="font-size:11px;color:#888;padding:8px;font-weight:bold;text-align:center">Cant.</td>
        <td style="font-size:11px;color:#888;padding:8px;font-weight:bold;text-align:right;min-width:100px">Subtotal</td>
      </tr>
      ${filasLibros}
      <tr style="background:#f0ecf5">
        <td colspan="2" style="font-size:14px;font-weight:bold;color:#1a1a1a;padding:12px 8px">Total</td>
        <td style="font-size:14px;font-weight:bold;color:#6802C1;padding:12px 8px;text-align:right;white-space:nowrap">
          S/ ${d.totalGeneral}
        </td>
      </tr>
    </table>
    <!-- Delivery -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px">
      <tr><td style="font-size:11px;font-weight:bold;color:#6802C1;text-transform:uppercase;
          letter-spacing:1px;padding-bottom:8px;border-bottom:2px solid #f0ecf5">Entrega</td></tr>
      <tr><td style="font-size:13px;color:#1a1a1a;padding:8px 0">${d.tipoEntrega}</td></tr>
    </table>
    <p style="margin:0;font-size:13px;color:#555;line-height:1.6">
      Cualquier duda o consulta escríbenos al correo fondoeditorial@continental.edu.pe o
      contáctanos al teléfono 064-481430 anexo: 7863 o vía WhatsApp +51 989 149 400.
    </p>
  </td></tr>
  <!-- Footer -->
  <tr><td style="background:#6802C1;padding:16px 28px;border-radius:0 0 12px 12px;
      text-align:center;color:rgba(255,255,255,0.7);font-size:11px">
    &copy; ${new Date().getFullYear()} Fondo Editorial — Universidad Continental
  </td></tr>
</table>
</td></tr></table>
</body></html>`;
}