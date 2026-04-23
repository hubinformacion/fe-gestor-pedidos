'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CheckCircle2, Loader2, Minus, Plus, ShoppingCart, AlertCircle, ChevronRight, ChevronLeft, Search } from 'lucide-react';

import { datosPedidoSchema } from '@/lib/validations';
import { Libro, SEDES, CAMPUS_INFO, DELIVERY_PRECIO_LIMA, DELIVERY_PRECIO_PROVINCIA } from '@/lib/types';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';

type FormValues = z.infer<typeof datosPedidoSchema>;

export function FormularioPedido() {
  const [catalogo, setCatalogo] = useState<Libro[]>([]);
  const [loadingCatalogo, setLoadingCatalogo] = useState(true);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccessCode, setSubmitSuccessCode] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const form = useForm<FormValues>({
    resolver: zodResolver(datosPedidoSchema as any),
    defaultValues: {
      comunidad: '' as any, sede: '', nombres: '', apellidos: '',
      email: '', telefono: '', tipoDoc: '' as any, nroDoc: '',
      libros: [], tipoEntrega: '' as any, campusRecojo: '',
      direccion: '', zonaDelivery: '' as any, departamento: '',
      referenciaDelivery: '', receptorTipo: '' as any,
      receptorNombre: '', receptorDocumento: '',
      terminos1: false, terminos2: false,
    },
  });

  const { watch, handleSubmit, setValue, trigger, formState: { isSubmitting } } = form;
  const [currentStep, setCurrentStep] = useState(0);

  const watchedComunidad = watch('comunidad');
  const watchedEntrega = watch('tipoEntrega');
  const watchedLibros = watch('libros');
  const watchedZonaDelivery = watch('zonaDelivery');
  const watchedReceptorTipo = watch('receptorTipo');

  // 4 steps: Publicaciones → Datos del comprador → Entrega → Confirmación
  const steps = [
    { title: "Publicaciones", fields: ['libros'] },
    { title: "Datos del comprador", fields: ['comunidad', 'sede', 'nombres', 'apellidos', 'email', 'telefono', 'tipoDoc', 'nroDoc'] },
    { title: "Entrega", fields: ['tipoEntrega', 'campusRecojo', 'direccion', 'zonaDelivery', 'departamento', 'referenciaDelivery', 'receptorTipo', 'receptorNombre', 'receptorDocumento'] },
    { title: "Confirmación", fields: ['terminos1', 'terminos2'] }
  ];

  const handleNext = async () => {
    const fieldsToValidate = steps[currentStep].fields as (keyof FormValues)[];
    const isStepValid = await trigger(fieldsToValidate);
    if (isStepValid) {
      setSubmitError(null);
      setCurrentStep(prev => Math.min(prev + 1, steps.length - 1));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrev = () => {
    setSubmitError(null);
    setCurrentStep(prev => Math.max(prev - 1, 0));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    fetch('/api/catalogo')
      .then(res => res.json())
      .then((data: Libro[]) => { setCatalogo(Array.isArray(data) ? data : []); setLoadingCatalogo(false); })
      .catch(() => { setCatalogo([]); setLoadingCatalogo(false); });
  }, []);

  const onAddLibro = (libro: Libro) => {
    const current = form.getValues('libros');
    const existing = current.find(l => l.titulo === libro.titulo);
    if (existing) {
      if (existing.cantidad >= libro.stock) return;
      setValue('libros', current.map(l => l.titulo === libro.titulo ? { ...l, cantidad: l.cantidad + 1 } : l), { shouldValidate: true });
    } else {
      if (libro.stock === 0) return;
      setValue('libros', [...current, { titulo: libro.titulo, cantidad: 1, precioUnit: libro.precioNormal }], { shouldValidate: true });
    }
  };

  const onRemoveLibro = (titulo: string) => {
    const current = form.getValues('libros');
    const existing = current.find(l => l.titulo === titulo);
    if (existing && existing.cantidad > 1) {
      setValue('libros', current.map(l => l.titulo === titulo ? { ...l, cantidad: l.cantidad - 1 } : l), { shouldValidate: true });
    } else {
      setValue('libros', current.filter(l => l.titulo !== titulo), { shouldValidate: true });
    }
  };

  const onSubmit = async (data: FormValues) => {
    setSubmitError(null);
    try {
      const res = await fetch('/api/pedido', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      const result = await res.json();
      if (result.ok) { setSubmitSuccessCode(result.codigo); window.scrollTo({ top: 0, behavior: 'smooth' }); }
      else { setSubmitError(result.error || 'Error al procesar el pedido.'); }
    } catch (e) { setSubmitError('Error de red. Verifica tu conexión.'); }
  };

  const handleFinalSubmit = async () => {
    setSubmitError(null);
    // Validate ALL fields across ALL steps
    const isValid = await trigger();
    if (!isValid) {
      const errors = form.formState.errors;
      const errorFields = Object.keys(errors);
      for (let i = 0; i < steps.length; i++) {
        if (errorFields.some(f => steps[i].fields.includes(f))) {
          setCurrentStep(i);
          setSubmitError(`Hay campos pendientes en "${steps[i].title}".`);
          window.scrollTo({ top: 0, behavior: 'smooth' });
          return;
        }
      }
      setSubmitError('Hay campos obligatorios sin completar.');
      return;
    }
    // If valid, submit
    handleSubmit(onSubmit)();
  };

  const subtotalLibros = watchedLibros.reduce((acc, item) => acc + item.precioUnit * item.cantidad, 0);
  const totalItems = watchedLibros.reduce((acc, i) => acc + i.cantidad, 0);
  const costoDelivery = watchedEntrega === 'Envío / Delivery'
    ? (watchedZonaDelivery === 'Provincia' ? DELIVERY_PRECIO_PROVINCIA : DELIVERY_PRECIO_LIMA)
    : 0;
  const totalCarrito = subtotalLibros + (watchedEntrega === 'Envío / Delivery' ? costoDelivery : 0);

  // ── Success ──
  const whatsappNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '51989149400';

  if (submitSuccessCode) {
    const waMessage = encodeURIComponent(`Hola, necesito ayuda con mi pedido #${submitSuccessCode}`);
    const waLink = `https://wa.me/${whatsappNumber}?text=${waMessage}`;
    return (
      <div className="flex items-center justify-center min-h-[70vh] px-4 py-12">
        <div className="w-full max-w-md text-center space-y-8 step-animate">
          <div className="mx-auto w-20 h-20 rounded-full bg-green-50 flex items-center justify-center">
            <CheckCircle2 className="w-10 h-10 text-green-600" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight">¡Pedido registrado!</h1>
            <p className="text-muted-foreground text-sm">Tu código de seguimiento es:</p>
          </div>
          <div className="bg-muted/60 border border-border px-8 py-5 rounded-lg inline-block">
            <span className="text-3xl font-mono font-bold tracking-widest text-primary">{submitSuccessCode}</span>
          </div>
          <p className="text-muted-foreground text-sm max-w-xs mx-auto leading-relaxed">
            Hemos enviado un correo con el detalle de tu solicitud. Nuestro equipo se pondrá en contacto contigo.
          </p>
          <div className="flex flex-col gap-3 items-center">
            <a href={waLink} target="_blank" rel="noreferrer">
              <Button size="lg" className="bg-[#25D366] hover:bg-[#1da851] text-white gap-2">
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                Contactar por WhatsApp
              </Button>
            </a>
            <Button onClick={() => window.location.reload()} variant="outline" size="lg">
              Realizar un nuevo pedido
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ── Main Form ──
  return (
    <div className="max-w-2xl mx-auto px-4 py-8 pb-24">

      {/* Step indicator */}
      <div className="mb-8">
        <p className="text-xs font-semibold tracking-widest uppercase text-muted-foreground mb-3">
          {currentStep + 1}/{steps.length} — {steps[currentStep].title}
        </p>
        <div className="flex gap-1.5">
          {steps.map((_, i) => (
            <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-500 ${i <= currentStep ? 'bg-primary' : 'bg-border'}`} />
          ))}
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={(e) => e.preventDefault()}>

          {/* ── STEP 1: Publicaciones ── */}
          <div className={currentStep === 0 ? "block step-animate" : "hidden"}>
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-bold tracking-tight">Elige tus publicaciones</h2>
                <p className="text-sm text-muted-foreground mt-1">Selecciona los títulos y cantidades que deseas adquirir.</p>
              </div>
              <div className="border rounded-lg overflow-hidden">
                {loadingCatalogo ? (
                  <div className="flex flex-col items-center justify-center p-16 text-muted-foreground">
                    <Loader2 className="w-6 h-6 animate-spin mb-3 text-primary/40" />
                    <p className="text-sm">Cargando catálogo...</p>
                  </div>
                ) : catalogo.length === 0 ? (
                  <div className="p-16 text-center space-y-2">
                    <AlertCircle className="w-8 h-8 text-muted-foreground mx-auto opacity-30" />
                    <p className="text-muted-foreground text-sm">No se encontraron libros disponibles.</p>
                  </div>
                ) : (
                  <>
                    <div className="p-3 border-b">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          type="text"
                          placeholder="Buscar por título..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-9 h-9 border-0 bg-muted/40 focus-visible:ring-1"
                        />
                      </div>
                    </div>
                    <div className="divide-y divide-border max-h-[380px] overflow-y-auto">
                    {catalogo
                      .filter(libro => libro.titulo.toLowerCase().includes(searchQuery.toLowerCase()))
                      .map((libro) => {
                      const enCarrito = watchedLibros.find(l => l.titulo === libro.titulo);
                      const cant = enCarrito?.cantidad || 0;
                      const agotado = libro.stock <= 0;
                      return (
                        <div key={libro.id} className={`flex items-center justify-between p-4 transition-colors ${cant > 0 ? 'bg-primary/4' : 'bg-background hover:bg-muted/30'}`}>
                          <div className="pr-4 flex-1 min-w-0">
                            <h4 className="font-medium text-sm leading-snug">{libro.titulo}</h4>
                            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                              <span className="text-sm font-semibold text-foreground/80">S/ {libro.precioNormal.toFixed(2)}</span>
                              {agotado && <Badge variant="secondary" className="text-[10px] px-1.5 h-4">Agotado</Badge>}
                              {!agotado && libro.stock <= 5 && (
                                <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded-full font-medium">Quedan {libro.stock}</span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Button type="button" variant="outline" size="icon" className="h-8 w-8 rounded-full" disabled={cant === 0} onClick={() => onRemoveLibro(libro.titulo)}>
                              <Minus className="h-3.5 w-3.5" />
                            </Button>
                            <span className={`w-5 text-center text-sm font-semibold ${cant > 0 ? 'text-primary' : 'text-muted-foreground'}`}>{cant}</span>
                            <Button type="button" variant="outline" size="icon" className="h-8 w-8 rounded-full" disabled={agotado || cant >= libro.stock} onClick={() => onAddLibro(libro)}>
                              <Plus className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                    {catalogo.filter(libro => libro.titulo.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
                      <div className="p-8 text-center text-sm text-muted-foreground">No se encontraron resultados para "{searchQuery}"</div>
                    )}
                    </div>
                  </>
                )}
                {form.formState.errors.libros && (
                  <div className="px-4 py-3 bg-destructive/10 text-destructive text-sm font-medium border-t border-destructive/20">{form.formState.errors.libros.message}</div>
                )}
                {watchedLibros.length > 0 && (
                  <div className="bg-muted/40 p-4 border-t flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <ShoppingCart className="w-4 h-4 text-primary" />
                      <span className="font-medium">{totalItems} artículos</span>
                    </div>
                    <span className="text-lg font-bold text-primary">S/ {totalCarrito.toFixed(2)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── STEP 2: Datos del comprador (fusionado) ── */}
          <div className={currentStep === 1 ? "block step-animate" : "hidden"}>
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold tracking-tight">Datos del comprador</h2>
                <p className="text-sm text-muted-foreground mt-1">Indica tu vínculo con la universidad y completa tus datos personales.</p>
              </div>

              {/* Tipo de cliente */}
              <div className="grid gap-5 md:grid-cols-2">
                <FormField control={form.control} name="comunidad" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vínculo con la universidad</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Selecciona tu vínculo" /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="Comunidad Continental">Comunidad Continental</SelectItem>
                        <SelectItem value="Público en general">Público en general</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                {watchedComunidad === 'Comunidad Continental' && (
                  <FormField control={form.control} name="sede" render={({ field }) => (
                    <FormItem className="step-animate">
                      <FormLabel>Sede de procedencia</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Elige tu sede" /></SelectTrigger></FormControl>
                        <SelectContent>{SEDES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                )}
              </div>

              {/* Datos personales */}
              <div className="border-t pt-5">
                <div className="grid gap-5 md:grid-cols-2">
                  <FormField control={form.control} name="nombres" render={({ field }) => (
                    <FormItem><FormLabel>Nombres</FormLabel><FormControl><Input placeholder="Ej. Juan Carlos" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="apellidos" render={({ field }) => (
                    <FormItem><FormLabel>Apellidos</FormLabel><FormControl><Input placeholder="Ej. Pérez Gómez" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="email" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Correo electrónico</FormLabel>
                      <FormControl><Input type="email" placeholder="correo@ejemplo.com" {...field} /></FormControl>
                      <FormDescription className="text-xs">{watchedComunidad === 'Comunidad Continental' ? 'Sugerimos usar tu correo @continental.edu.pe.' : 'Para enviarte la confirmación del pedido.'}</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="telefono" render={({ field }) => (
                    <FormItem><FormLabel>Teléfono / Celular</FormLabel><FormControl><Input type="tel" placeholder="999 999 999" {...field} /></FormControl><FormMessage /></FormItem>
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
                    <FormItem><FormLabel>Número de Documento</FormLabel><FormControl><Input placeholder="Escribe aquí el número" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
              </div>
            </div>
          </div>

          {/* ── STEP 3: Entrega ── */}
          <div className={currentStep === 2 ? "block step-animate" : "hidden"}>
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-bold tracking-tight">Modalidad de entrega</h2>
                <p className="text-sm text-muted-foreground mt-1">Elige cómo recibirás tus libros.</p>
              </div>
              <div className="grid gap-5 md:grid-cols-2">
                <FormField control={form.control} name="tipoEntrega" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de entrega</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Selecciona..." /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="Recojo en campus">Recojo en campus</SelectItem>
                        <SelectItem value="Envío / Delivery">Envío / Delivery</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                {watchedEntrega === 'Recojo en campus' && (
                  <FormField control={form.control} name="campusRecojo" render={({ field }) => (
                    <FormItem className="step-animate">
                      <FormLabel>Campus de recojo</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Selecciona campus" /></SelectTrigger></FormControl>
                        <SelectContent>{SEDES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                      </Select>
                      {field.value && CAMPUS_INFO[field.value] && (
                        <div className="text-xs text-muted-foreground mt-1.5 bg-muted/40 rounded-md px-3 py-2 leading-relaxed">
                          📍 {CAMPUS_INFO[field.value].direccion}
                          {CAMPUS_INFO[field.value].piso && <><br/>🏢 {CAMPUS_INFO[field.value].piso}</>}
                        </div>
                      )}
                      <FormMessage />
                    </FormItem>
                  )} />
                )}
              </div>
              {watchedEntrega === 'Envío / Delivery' && (
                <div className="space-y-5 step-animate border-t pt-5">
                  <div className="grid gap-5 md:grid-cols-2">
                    <FormField control={form.control} name="zonaDelivery" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Zona de envío</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Selecciona zona" /></SelectTrigger></FormControl>
                          <SelectContent>
                            <SelectItem value="Lima/Callao">Lima / Callao — S/ {DELIVERY_PRECIO_LIMA.toFixed(2)}</SelectItem>
                            <SelectItem value="Provincia">Provincia — S/ {DELIVERY_PRECIO_PROVINCIA.toFixed(2)}</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                    {watchedZonaDelivery === 'Provincia' && (
                      <FormField control={form.control} name="departamento" render={({ field }) => (
                        <FormItem className="step-animate"><FormLabel>Departamento / Ciudad</FormLabel><FormControl><Input placeholder="Ej. Junín, Huancayo" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                    )}
                  </div>
                  <div className="grid gap-5 md:grid-cols-2">
                    <FormField control={form.control} name="direccion" render={({ field }) => (
                      <FormItem><FormLabel>Dirección exacta de entrega</FormLabel><FormControl><Input placeholder="Av. / Calle / Jr. Nro, Distrito" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="referenciaDelivery" render={({ field }) => (
                      <FormItem><FormLabel>Referencia de la dirección</FormLabel><FormControl><Input placeholder="Ej. Frente al parque, edificio azul" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                  </div>
                  <div className="grid gap-5 md:grid-cols-2">
                    <FormField control={form.control} name="receptorTipo" render={({ field }) => (
                      <FormItem>
                        <FormLabel>¿Quién recibirá el pedido?</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Selecciona..." /></SelectTrigger></FormControl>
                          <SelectContent>
                            <SelectItem value="Yo mismo(a)">Yo mismo(a)</SelectItem>
                            <SelectItem value="Otra persona">Otra persona (familiar, conocido)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                  {watchedReceptorTipo === 'Otra persona' && (
                    <div className="grid gap-5 md:grid-cols-2 step-animate">
                      <FormField control={form.control} name="receptorNombre" render={({ field }) => (
                        <FormItem><FormLabel>Nombre del receptor</FormLabel><FormControl><Input placeholder="Nombre completo" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="receptorDocumento" render={({ field }) => (
                        <FormItem><FormLabel>DNI / Documento del receptor</FormLabel><FormControl><Input placeholder="N° de documento" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ── STEP 4: Confirmación ── */}
          <div className={currentStep === 3 ? "block step-animate" : "hidden"}>
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-bold tracking-tight">Confirma tu pedido</h2>
                <p className="text-sm text-muted-foreground mt-1">Revisa y acepta las políticas para finalizar.</p>
              </div>

              {/* Order summary */}
              <div className="bg-muted/40 rounded-lg border p-5 space-y-3">
                <h4 className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">Resumen del pedido</h4>
                {watchedLibros.map((item, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-foreground/80">{item.titulo} <span className="text-muted-foreground">×{item.cantidad}</span></span>
                    <span className="font-medium">S/ {(item.precioUnit * item.cantidad).toFixed(2)}</span>
                  </div>
                ))}
                {costoDelivery > 0 && (
                  <div className="flex justify-between text-sm text-muted-foreground border-t pt-2">
                    <span>Envío ({watchedZonaDelivery})</span>
                    <span className="font-medium text-foreground">S/ {costoDelivery.toFixed(2)}</span>
                  </div>
                )}
                <div className="border-t pt-3 flex justify-between font-bold text-base">
                  <span>Total estimado</span>
                  <span className="text-primary">S/ {totalCarrito.toFixed(2)}</span>
                </div>
              </div>

              <div className="space-y-4 bg-card border rounded-lg p-5">
                <FormField control={form.control} name="terminos1" render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="font-normal text-muted-foreground text-sm">
                        Acepto haber leído y autorizo nuestra <a href="https://ucontinental.edu.pe/politica-de-privacidad/" target="_blank" rel="noreferrer" className="text-primary font-medium underline underline-offset-4 decoration-primary/30 hover:decoration-primary">política de privacidad</a>.
                      </FormLabel>
                      <FormMessage />
                    </div>
                  </FormItem>
                )} />
                <FormField control={form.control} name="terminos2" render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="font-normal text-muted-foreground text-sm">
                        Al presionar Enviar, acepto haber leído y autorizo la <a href="https://ucontinental.edu.pe/politica-de-privacidad/" target="_blank" rel="noreferrer" className="text-primary font-medium underline underline-offset-4 decoration-primary/30 hover:decoration-primary">Política de tratamiento de datos</a>.
                      </FormLabel>
                      <FormMessage />
                    </div>
                  </FormItem>
                )} />
              </div>

              {submitError && (
                <div className="p-4 bg-destructive/10 text-destructive text-sm rounded-lg border border-destructive/20 flex gap-3">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <div><p className="font-semibold mb-1">Ocurrió un problema</p><p>{submitError}</p></div>
                </div>
              )}
            </div>
          </div>

          {/* ── Navigation ── */}
          <div className="flex items-center justify-between pt-8">
            <Button type="button" variant="ghost" onClick={handlePrev}
              disabled={currentStep === 0 || isSubmitting}
              className={currentStep === 0 ? 'invisible' : ''}>
              <ChevronLeft className="mr-1 h-4 w-4" /> Anterior
            </Button>
            {currentStep < steps.length - 1 ? (
              <Button type="button" onClick={handleNext} disabled={loadingCatalogo} size="lg">
                Siguiente <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            ) : (
              <Button type="button" onClick={handleFinalSubmit} disabled={isSubmitting || loadingCatalogo} size="lg" className="min-w-[200px]">
                {isSubmitting ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Procesando...</>
                ) : (
                  'Finalizar Pedido'
                )}
              </Button>
            )}
          </div>

        </form>
      </Form>
    </div>
  );
}