import { FormularioPedido } from '@/components/formulario/FormularioPedido';

export const metadata = {
  title: 'Pedido de Libros | Fondo Editorial UC',
  description: 'Formulario oficial de venta de libros del Fondo Editorial de la Universidad Continental.',
};

export default function FormularioPage() {
  return (
    <main className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto mb-8 text-center space-y-4">
        <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">
          Fondo Editorial
        </h1>
        <p className="text-lg text-slate-600">
          Adquiere nuestras publicaciones completando el siguiente formulario.
        </p>
      </div>

      <FormularioPedido />
    </main>
  );
}