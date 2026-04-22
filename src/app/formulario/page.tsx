import { FormularioPedido } from '@/components/formulario/FormularioPedido';

export const metadata = {
  title: 'Pedido de Libros | Fondo Editorial UC',
  description: 'Formulario oficial de venta de libros del Fondo Editorial de la Universidad Continental.',
};

export default function FormularioPage() {
  return (
    <main className="min-h-screen bg-background py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-3xl mx-auto mb-10 space-y-3">
        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Fondo Editorial
        </h1>
        <p className="text-lg text-muted-foreground">
          Adquiere nuestras publicaciones completando el siguiente formulario.
        </p>
      </div>

      <FormularioPedido />
    </main>
  );
}