'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CheckCircle2, Loader2, Minus, Plus, ShoppingCart, AlertCircle } from 'lucide-react';

import { datosPedidoSchema } from '@/lib/validations';
import { Libro, SEDES } from '@/lib/types';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';

type FormValues = z.infer<typeof datosPedidoSchema>;

export function FormularioPedido() {
  const [catalogo, setCatalogo] = useState<Libro[]>([]);
  const [loadingCatalogo, setLoadingCatalogo] = useState(true);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccessCode, setSubmitSuccessCode] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(datosPedidoSchema as any),
    defaultValues: {
      comunidad: undefined,
      sede: '',
      nombres: '',
      apellidos: '',
      email: '',
      telefono: '',
      tipoDoc: undefined,
      nroDoc: '',
      libros: [],
      tipoEntrega: undefined,
      campusRecojo: '',
      direccion: '',
      ciudad: '',
      terminos1: false,
      terminos2: false,
    },
  });

  const { watch, handleSubmit, setValue, formState: { isSubmitting } } = form;

  const watchedComunidad = watch('comunidad');
  const watchedEntrega = watch('tipoEntrega');
  const watchedLibros = watch('libros');

  const calculateProgress = () => {
    const values = form.getValues();
    let filled = 0;
    const total = 5;
    if (values.comunidad) filled++;
    if (values.nombres && values.apellidos && values.email && values.telefono && values.nroDoc) filled++;
    if (values.libros.length > 0) filled++;
    if (values.tipoEntrega) filled++;
    if (values.terminos1 && values.terminos2) filled++;
    return (filled / total) * 100;
  };

  useEffect(() => {
    fetch('/api/catalogo')
      .then(res => res.json())
      .then((data: Libro[]) => {
        setCatalogo(Array.isArray(data) ? data : []);
        setLoadingCatalogo(false);
      })
      .catch(err => {
        console.error('Error fetching catalogo', err);
        setCatalogo([]);
        setLoadingCatalogo(false);
      });
  }, []);

  const onAddLibro = (libro: Libro) => {
    const current = form.getValues('libros');
    const existing = current.find(l => l.titulo === libro.titulo);
    
    if (existing) {
      if (existing.cantidad >= libro.stock) return;
      setValue('libros', current.map(l => 
        l.titulo === libro.titulo ? { ...l, cantidad: l.cantidad + 1 } : l
      ), { shouldValidate: true });
    } else {
      if (libro.stock === 0) return;
      setValue('libros', [...current, { 
        titulo: libro.titulo, 
        cantidad: 1, 
        precioUnit: libro.precioNormal
      }], { shouldValidate: true });
    }
  };

  const onRemoveLibro = (titulo: string) => {
    const current = form.getValues('libros');
    const existing = current.find(l => l.titulo === titulo);
    
    if (existing && existing.cantidad > 1) {
      setValue('libros', current.map(l => 
        l.titulo === titulo ? { ...l, cantidad: l.cantidad - 1 } : l
      ), { shouldValidate: true });
    } else {
      setValue('libros', current.filter(l => l.titulo !== titulo), { shouldValidate: true });
    }
  };

  const onSubmit = async (data: FormValues) => {
    setSubmitError(null);
    try {
      const res = await fetch('/api/pedido', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      
      if (result.ok) {
        setSubmitSuccessCode(result.codigo);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        setSubmitError(result.error || 'Error al procesar el pedido. Inténtalo de nuevo.');
      }
    } catch (e) {
      setSubmitError('Error de red. Verifica tu conexión e inténtalo de nuevo.');
    }
  };

  const totalCarrito = watchedLibros.reduce((acc, item) => acc + item.precioUnit * item.cantidad, 0);

  if (submitSuccessCode) {
    return (
      <Card className="max-w-xl mx-auto mt-10">
        <CardContent className="pt-10 flex flex-col items-center text-center space-y-6">
          <CheckCircle2 className="w-16 h-16 text-primary" />
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight">¡Pedido Registrado con Éxito!</h1>
            <p className="text-muted-foreground">
              Tu código de pedido es:
            </p>
          </div>
          <div className="bg-muted px-6 py-4 rounded-md">
            <span className="text-3xl font-mono font-bold tracking-wider">{submitSuccessCode}</span>
          </div>
          <p className="text-muted-foreground text-sm max-w-sm">
            Hemos enviado un correo con el detalle de tu solicitud. Nuestro equipo del Fondo Editorial se pondrá en contacto contigo para coordinar el pago y la entrega.
          </p>
          <Button onClick={() => window.location.reload()} variant="outline" className="mt-8">
            Realizar un nuevo pedido
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-16">
      
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm py-4 border-b">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">Progreso</span>
          <span className="text-xs font-medium text-muted-foreground">{Math.round(calculateProgress())}%</span>
        </div>
        <Progress value={calculateProgress()} className="h-1.5" />
      </div>

      <Form {...form}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-10">
          
          {/* SECCIÓN 1: COMUNIDAD */}
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium">1. Tipo de Cliente</h3>
              <p className="text-sm text-muted-foreground">Indica si formas parte de la Comunidad Continental.</p>
            </div>
            
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="comunidad"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vínculo con la universidad</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona tu vínculo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="si">Soy estudiante / docente / colaborador</SelectItem>
                        <SelectItem value="no">Público en general</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {watchedComunidad === 'si' && (
                <FormField
                  control={form.control}
                  name="sede"
                  render={({ field }) => (
                    <FormItem className="animate-in fade-in slide-in-from-top-2">
                      <FormLabel>Sede de procedencia</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Elige tu sede" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {SEDES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>
          </div>

          <div className="h-px bg-border" />

          {/* SECCIÓN 2: DATOS PERSONALES */}
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium">2. Datos de Contacto</h3>
              <p className="text-sm text-muted-foreground">Ingresa tus datos personales correctos para la facturación.</p>
            </div>
            
            <div className="grid gap-4 md:grid-cols-2">
              <FormField control={form.control} name="nombres" render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombres</FormLabel>
                  <FormControl><Input placeholder="Ej. Juan Carlos" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              
              <FormField control={form.control} name="apellidos" render={({ field }) => (
                <FormItem>
                  <FormLabel>Apellidos</FormLabel>
                  <FormControl><Input placeholder="Ej. Pérez Gómez" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              
              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem>
                  <FormLabel>Correo electrónico</FormLabel>
                  <FormControl><Input type="email" placeholder="correo@ejemplo.com" {...field} /></FormControl>
                  <FormDescription>
                    {watchedComunidad === 'si' ? 'Sugerimos usar tu correo @continental.edu.pe.' : 'Para enviarte la confirmación del pedido.'}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )} />
              
              <FormField control={form.control} name="telefono" render={({ field }) => (
                <FormItem>
                  <FormLabel>Teléfono / Celular</FormLabel>
                  <FormControl><Input type="tel" placeholder="999 999 999" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              
              <FormField control={form.control} name="tipoDoc" render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Documento</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Selecciona" /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="DNI">DNI</SelectItem>
                      <SelectItem value="Carné de extranjería">Carné de extranjería</SelectItem>
                      <SelectItem value="Pasaporte">Pasaporte</SelectItem>
                      <SelectItem value="RUC">RUC</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              
              <FormField control={form.control} name="nroDoc" render={({ field }) => (
                <FormItem>
                  <FormLabel>Número de Documento</FormLabel>
                  <FormControl><Input placeholder="Escribe aquí el número" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
          </div>

          <div className="h-px bg-border" />

          {/* SECCIÓN 3: LIBROS */}
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium">3. Publicaciones</h3>
              <p className="text-sm text-muted-foreground">Añade los libros que deseas adquirir a tu carrito.</p>
            </div>
            
            <Card>
              <CardContent className="p-0">
                {loadingCatalogo ? (
                  <div className="flex flex-col items-center justify-center p-10 text-muted-foreground">
                    <Loader2 className="w-8 h-8 animate-spin mb-4" />
                    <p className="text-sm">Cargando catálogo de libros...</p>
                  </div>
                ) : catalogo.length === 0 ? (
                  <div className="p-10 text-center space-y-2">
                    <AlertCircle className="w-10 h-10 text-muted-foreground mx-auto opacity-50" />
                    <p className="text-muted-foreground">No se encontraron libros disponibles.</p>
                    <p className="text-xs text-muted-foreground opacity-70">
                      (Si eres administrador, revisa que la hoja 'items' en Sheets tenga títulos y que la columna Estado no esté vacía).
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {catalogo.map((libro) => {
                      const enCarrito = watchedLibros.find(l => l.titulo === libro.titulo);
                      const cant = enCarrito?.cantidad || 0;
                      const agotado = libro.stock <= 0;

                      return (
                        <div key={libro.id} className="flex items-center justify-between p-4 sm:p-5">
                          <div className="pr-4 flex-1">
                            <h4 className="font-medium">{libro.titulo}</h4>
                            <div className="flex items-center gap-2 mt-1.5">
                              <span className="text-sm text-muted-foreground">S/ {libro.precioNormal.toFixed(2)}</span>
                              {agotado && <Badge variant="secondary" className="text-xs font-normal">Agotado</Badge>}
                              {!agotado && libro.stock <= 5 && <span className="text-xs text-orange-500">Solo quedan {libro.stock}</span>}
                            </div>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <Button 
                              type="button" 
                              variant="outline" 
                              size="icon" 
                              className="h-8 w-8 rounded-full"
                              disabled={cant === 0}
                              onClick={() => onRemoveLibro(libro.titulo)}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-4 text-center text-sm font-medium">{cant}</span>
                            <Button 
                              type="button" 
                              variant="outline" 
                              size="icon" 
                              className="h-8 w-8 rounded-full"
                              disabled={agotado || cant >= libro.stock}
                              onClick={() => onAddLibro(libro)}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                
                {form.formState.errors.libros && (
                  <div className="p-4 bg-destructive/5 text-destructive text-sm border-t border-destructive/10">
                    {form.formState.errors.libros.message}
                  </div>
                )}

                {watchedLibros.length > 0 && (
                  <div className="bg-muted/40 p-4 sm:p-5 border-t border-border flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <ShoppingCart className="w-4 h-4" /> 
                      Total: {watchedLibros.reduce((acc, i) => acc + i.cantidad, 0)} artículos
                    </div>
                    <div className="text-lg font-semibold">
                      S/ {totalCarrito.toFixed(2)}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="h-px bg-border" />

          {/* SECCIÓN 4: ENTREGA */}
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium">4. Modalidad de Entrega</h3>
              <p className="text-sm text-muted-foreground">Elige cómo recibirás tus libros.</p>
            </div>
            
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="tipoEntrega"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de entrega</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Selecciona..." /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="recojo">Recojo en Campus</SelectItem>
                        <SelectItem value="delivery">Envío / Delivery</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {watchedEntrega === 'recojo' && (
                <FormField
                  control={form.control}
                  name="campusRecojo"
                  render={({ field }) => (
                    <FormItem className="animate-in fade-in slide-in-from-top-2">
                      <FormLabel>Campus de recojo</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Selecciona campus" /></SelectTrigger></FormControl>
                        <SelectContent>
                          {SEDES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            {watchedEntrega === 'delivery' && (
              <div className="grid gap-4 md:grid-cols-2 animate-in fade-in slide-in-from-top-2 mt-4">
                <FormField control={form.control} name="direccion" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dirección exacta de entrega</FormLabel>
                    <FormControl><Input placeholder="Av. / Calle / Jr. Nro, Distrito" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="ciudad" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ciudad / Región</FormLabel>
                    <FormControl><Input placeholder="Ej. Huancayo, Junín" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
            )}
          </div>

          <div className="h-px bg-border" />

          {/* SECCIÓN 5: TÉRMINOS */}
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium">5. Términos Legales</h3>
            </div>
            
            <div className="space-y-4 bg-muted/30 p-5 rounded-lg border border-border">
              <FormField control={form.control} name="terminos1" render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="font-normal text-muted-foreground text-sm cursor-pointer">
                      Acepto haber leído y autorizo nuestra <a href="https://ucontinental.edu.pe/politica-de-privacidad/" target="_blank" rel="noreferrer" className="text-primary underline underline-offset-2">política de privacidad</a>.
                    </FormLabel>
                    <FormMessage />
                  </div>
                </FormItem>
              )} />

              <FormField control={form.control} name="terminos2" render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="font-normal text-muted-foreground text-sm cursor-pointer">
                      Acepto haber leído y autorizo nuestra <a href="https://ucontinental.edu.pe/politica-de-privacidad/" target="_blank" rel="noreferrer" className="text-primary underline underline-offset-2">Política de tratamiento de datos</a>.
                    </FormLabel>
                    <FormMessage />
                  </div>
                </FormItem>
              )} />
            </div>
          </div>

          {submitError && (
            <div className="p-4 bg-destructive/10 text-destructive text-sm rounded-md border border-destructive/20 flex gap-2">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <div>
                <p className="font-semibold">Ocurrió un problema</p>
                <p>{submitError}</p>
              </div>
            </div>
          )}

          <Button type="submit" size="lg" className="w-full text-base h-12" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Procesando Pedido...
              </>
            ) : (
              'Confirmar Pedido'
            )}
          </Button>

        </form>
      </Form>
    </div>
  );
}