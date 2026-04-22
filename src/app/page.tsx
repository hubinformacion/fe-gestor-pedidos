import { FormularioPedido } from '@/components/formulario/FormularioPedido';

export const metadata = {
  title: 'Pedido de Libros | Fondo Editorial UC',
  description: 'Formulario oficial de venta de libros del Fondo Editorial de la Universidad Continental.',
};

export default function HomePage() {
  return (
    <main className="min-h-screen font-sans">
      <FormularioPedido />
    </main>
  );
}