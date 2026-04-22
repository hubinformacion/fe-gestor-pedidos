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
      comunidad: '' as any,
      sede: '',
      nombres: '',
      apellidos: '',
      email: '',
      telefono: '',
      tipoDoc: '' as any,
      nroDoc: '',
      libros: [],
      tipoEntrega: '' as any,
      campusRecojo: '',
      direccion: '',
      ciudad: '',
      terminos1: false,
      terminos2: false,
    },
  });

  const { watch, handleSubmit, setValue, trigger, formState: { isSubmitting } } = form;

  const [currentStep, setCurrentStep] = useState(0);

  const watchedComunidad = watch('comunidad');
  const watchedEntrega = watch('tipoEntrega');
  const watchedLibros = watch('libros');

  const steps = [
    { title: "Tipo de Cliente", fields: ['comunidad', 'sede'] },
    { title: "Datos de Contacto", fields: ['nombres', 'apellidos', 'email', 'telefono', 'tipoDoc', 'nroDoc'] },
    { title: "Publicaciones", fields: ['libros'] },
    { title: "Modalidad de Entrega", fields: ['tipoEntrega', 'campusRecojo', 'direccion', 'ciudad'] },
    { title: "Términos Legales", fields: ['terminos1', 'terminos2'] }
  ];

  const handleNext = async () => {
    const fieldsToValidate = steps[currentStep].fields as (keyof FormValues)[];
    const isStepValid = await trigger(fieldsToValidate);
    
    if (isStepValid) {
      setCurrentStep(prev => Math.min(prev + 1, steps.length - 1));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrev = () => {
    setCurrentStep(prev => Math.max(prev - 1, 0));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const calculateProgress = () => {
    return ((currentStep + 1) / steps.length) * 100;
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
    <div className="max-w-2xl mx-auto space-y-6 pb-16">
      
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm py-4 border-b">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            Paso {currentStep + 1} de {steps.length}: {steps[currentStep].title}
          </span>
          <span className="text-xs font-medium text-muted-foreground">{Math.round(calculateProgress())}%</span>
        </div>
        <Progress value={calculateProgress()} className="h-1.5" />
      </div>

      <Form {...form}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          
          <Card className="border shadow-sm">
            <CardContent className="pt-6">
            
            {/* --- PASO 1 --- */}
            <div className={currentStep === 0 ? "block animate-in fade-in" : "hidden"}>
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold tracking-tight text-foreground">1. Tipo de Cliente</h3>
                  <p className="text-sm text-muted-foreground">Indica si formas parte de la Comunidad Continental.</p>
                </div>
                <div className="grid gap-6 md:grid-cols-2">
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
            </div>

            {/* --- PASO 2 --- */}
            <div className={currentStep === 1 ? "block animate-in fade-in" : "hidden"}>
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold tracking-tight text-foreground">2. Datos de Contacto</h3>
                  <p className="text-sm text-muted-foreground">Ingresa tus datos personales correctos para la facturación.</p>
                </div>
                <div className="grid gap-6 md:grid-cols-2">
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
                      <FormDescription className="text-xs">
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
            </div>

            {/* --- PASO 3 --- */}
            <div className={currentStep === 2 ? "block animate-in fade-in" : "hidden"}>
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold tracking-tight text-foreground">3. Publicaciones</h3>
                  <p className="text-sm text-muted-foreground">Añade los libros que deseas adquirir a tu carrito.</p>
                </div>
                
                <div className="border rounded-md overflow-hidden bg-card">
                  {loadingCatalogo ? (
                    <div className="flex flex-col items-center justify-center p-12 text-muted-foreground">
                      <Loader2 className="w-6 h-6 animate-spin mb-3 text-primary/50" />
                      <p className="text-sm">Cargando catálogo...</p>
                    </div>
                  ) : catalogo.length === 0 ? (
                    <div className="p-12 text-center space-y-2">
                      <AlertCircle className="w-8 h-8 text-muted-foreground mx-auto opacity-30" />
                      <p className="text-muted-foreground text-sm">No se encontraron libros disponibles.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-border max-h-[380px] overflow-y-auto">
                      {catalogo.map((libro) => {
                        const enCarrito = watchedLibros.find(l => l.titulo === libro.titulo);
                        const cant = enCarrito?.cantidad || 0;
                        const agotado = libro.stock <= 0;

                        return (
                          <div key={libro.id} className="flex items-center justify-between p-4 bg-background">
                            <div className="pr-4 flex-1">
                              <h4 className="font-medium text-sm leading-tight text-foreground">{libro.titulo}</h4>
                              <div className="flex items-center gap-2 mt-1.5">
                                <span className="text-sm text-muted-foreground font-medium">S/ {libro.precioNormal.toFixed(2)}</span>
                                {agotado && <Badge variant="secondary" className="text-[10px] font-normal px-1.5 h-4 text-muted-foreground">Agotado</Badge>}
                                {!agotado && libro.stock <= 5 && <span className="text-[10px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded font-medium">Quedan {libro.stock}</span>}
                              </div>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              <Button 
                                type="button" 
                                variant="outline" 
                                size="icon" 
                                className="h-8 w-8 rounded-full border-border hover:bg-muted"
                                disabled={cant === 0}
                                onClick={() => onRemoveLibro(libro.titulo)}
                              >
                                <Minus className="h-3.5 w-3.5" />
                              </Button>
                              <span className="w-4 text-center text-sm font-medium">{cant}</span>
                              <Button 
                                type="button" 
                                variant="outline" 
                                size="icon" 
                                className="h-8 w-8 rounded-full border-border hover:bg-muted"
                                disabled={agotado || cant >= libro.stock}
                                onClick={() => onAddLibro(libro)}
                              >
                                <Plus className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  
                  {form.formState.errors.libros && (
                    <div className="px-4 py-3 bg-destructive/10 text-destructive text-sm font-medium border-t border-destructive/20">
                      {form.formState.errors.libros.message}
                    </div>
                  )}

                  {watchedLibros.length > 0 && (
                    <div className="bg-primary/[0.03] p-4 border-t border-border flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                        <ShoppingCart className="w-4 h-4 text-primary" /> 
                        {watchedLibros.reduce((acc, i) => acc + i.cantidad, 0)} artículos
                      </div>
                      <div className="text-lg font-semibold text-primary">
                        S/ {totalCarrito.toFixed(2)}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* --- PASO 4 --- */}
            <div className={currentStep === 3 ? "block animate-in fade-in" : "hidden"}>
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold tracking-tight text-foreground">4. Modalidad de Entrega</h3>
                  <p className="text-sm text-muted-foreground">Elige cómo recibirás tus libros.</p>
                </div>
                <div className="grid gap-6 md:grid-cols-2">
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
                  <div className="grid gap-6 md:grid-cols-2 animate-in fade-in slide-in-from-top-2 border-t pt-4">
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
            </div>

            {/* --- PASO 5 --- */}
            <div className={currentStep === 4 ? "block animate-in fade-in" : "hidden"}>
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold tracking-tight text-foreground">5. Términos Legales</h3>
                  <p className="text-sm text-muted-foreground">Por favor, acepta nuestras políticas para finalizar.</p>
                </div>
                
                <div className="space-y-5 bg-muted/40 p-6 rounded-lg border border-border">
                  <FormField control={form.control} name="terminos1" render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                      <div className="space-y-1.5 leading-none">
                        <FormLabel className="font-normal text-muted-foreground text-sm cursor-pointer">
                          Acepto haber leído y autorizo nuestra <a href="https://ucontinental.edu.pe/politica-de-privacidad/" target="_blank" rel="noreferrer" className="text-primary font-medium underline underline-offset-4 decoration-primary/30 hover:decoration-primary">política de privacidad</a>.
                        </FormLabel>
                        <FormMessage />
                      </div>
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="terminos2" render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                      <div className="space-y-1.5 leading-none">
                        <FormLabel className="font-normal text-muted-foreground text-sm cursor-pointer">
                          Al presionar Enviar, acepto haber leído y autorizo la <a href="https://ucontinental.edu.pe/politica-de-privacidad/" target="_blank" rel="noreferrer" className="text-primary font-medium underline underline-offset-4 decoration-primary/30 hover:decoration-primary">Política de tratamiento de datos</a>.
                        </FormLabel>
                        <FormMessage />
                      </div>
                    </FormItem>
                  )} />
                </div>

                {submitError && (
                  <div className="p-4 bg-destructive/10 text-destructive text-sm rounded-md border border-destructive/20 flex gap-3">
                    <AlertCircle className="w-5 h-5 shrink-0" />
                    <div>
                      <p className="font-semibold mb-1">Ocurrió un problema</p>
                      <p>{submitError}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            </CardContent>
          </Card>

          {/* Navegación del Wizard */}
          <div className="flex items-center justify-between pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={handlePrev} 
              disabled={currentStep === 0 || isSubmitting}
            >
              Anterior
            </Button>
            
            {currentStep < steps.length - 1 ? (
              <Button type="button" onClick={handleNext} disabled={loadingCatalogo}>
                Siguiente
              </Button>
            ) : (
              <Button type="submit" disabled={isSubmitting || loadingCatalogo}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Procesando...
                  </>
                ) : (
                  'Finalizar y Enviar Pedido'
                )}
              </Button>
            )}
          </div>

        </form>
      </Form>
    </div>
  );
}