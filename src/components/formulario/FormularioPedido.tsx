'use client';

import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CheckCircle2, Loader2, Minus, Plus, ShoppingCart, Info } from 'lucide-react';

import { datosPedidoSchema } from '@/lib/validations';
import { Libro, SEDES } from '@/lib/types';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';

type FormValues = z.infer<typeof datosPedidoSchema>;

export function FormularioPedido() {
  const [catalogo, setCatalogo] = useState<Libro[]>([]);
  const [loadingCatalogo, setLoadingCatalogo] = useState(true);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccessCode, setSubmitSuccessCode] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(datosPedidoSchema),
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

  const { register, control, watch, handleSubmit, setValue, formState: { errors, isSubmitting } } = form;

  const watchedComunidad = watch('comunidad');
  const watchedEntrega = watch('tipoEntrega');
  const watchedLibros = watch('libros');

  // Calcular progreso (básico) basado en campos requeridos llenos
  const calculateProgress = () => {
    const values = form.getValues();
    let filled = 0;
    const total = 5; // 5 secciones clave

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
        setCatalogo(data);
        setLoadingCatalogo(false);
      })
      .catch(err => {
        console.error(err);
        setLoadingCatalogo(false);
      });
  }, []);

  const onAddLibro = (libro: Libro) => {
    const current = form.getValues('libros');
    const existing = current.find(l => l.titulo === libro.titulo);
    
    if (existing) {
      if (existing.cantidad >= libro.stock) return; // No superar stock
      setValue('libros', current.map(l => 
        l.titulo === libro.titulo ? { ...l, cantidad: l.cantidad + 1 } : l
      ), { shouldValidate: true });
    } else {
      if (libro.stock === 0) return;
      setValue('libros', [...current, { 
        titulo: libro.titulo, 
        cantidad: 1, 
        precioUnit: libro.precioNormal // Siempre mostramos precio normal en el front
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
      <div className="max-w-2xl mx-auto p-6 text-center space-y-6 bg-white rounded-xl shadow-sm border border-border">
        <div className="flex justify-center">
          <CheckCircle2 className="w-20 h-20 text-green-500" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-primary">¡Pedido Registrado!</h1>
        <p className="text-muted-foreground text-lg">
          Tu código de pedido es:
        </p>
        <div className="bg-muted p-4 rounded-lg inline-block">
          <span className="text-3xl font-mono font-bold text-foreground">{submitSuccessCode}</span>
        </div>
        <p className="text-muted-foreground">
          Hemos enviado un correo con el detalle de tu solicitud. Nuestro equipo del Fondo Editorial se pondrá en contacto contigo para coordinar el pago y la entrega.
        </p>
        <Button onClick={() => window.location.reload()} variant="outline" className="mt-4">
          Realizar otro pedido
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto pb-12">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur py-4 border-b border-border mb-8">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Progreso del Formulario</h2>
          <span className="text-sm font-medium">{Math.round(calculateProgress())}%</span>
        </div>
        <Progress value={calculateProgress()} className="h-2" />
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        
        {/* SECCIÓN 1: COMUNIDAD */}
        <Card className="border-border shadow-sm">
          <CardHeader>
            <CardTitle>1. Tipo de Cliente</CardTitle>
            <CardDescription>Indica si formas parte de la Comunidad Continental.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>¿Eres estudiante, docente o colaborador de la Universidad Continental?</Label>
              <Controller
                control={control}
                name="comunidad"
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger className={errors.comunidad ? "border-destructive" : ""}>
                      <SelectValue placeholder="Selecciona una opción" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="si">Sí, soy de la Comunidad Continental</SelectItem>
                      <SelectItem value="no">No, soy público en general</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.comunidad && <p className="text-sm text-destructive">{errors.comunidad.message}</p>}
            </div>

            {watchedComunidad === 'si' && (
              <div className="space-y-2 pt-2 animate-in fade-in slide-in-from-top-4">
                <Label>Sede / Campus Continental</Label>
                <Controller
                  control={control}
                  name="sede"
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger className={errors.sede ? "border-destructive" : ""}>
                        <SelectValue placeholder="Selecciona tu sede" />
                      </SelectTrigger>
                      <SelectContent>
                        {SEDES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.sede && <p className="text-sm text-destructive">{errors.sede.message}</p>}
              </div>
            )}
          </CardContent>
        </Card>

        {/* SECCIÓN 2: DATOS PERSONALES */}
        <Card className="border-border shadow-sm">
          <CardHeader>
            <CardTitle>2. Datos Personales</CardTitle>
            <CardDescription>Ingresa tus datos de contacto.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nombres</Label>
              <Input {...register('nombres')} placeholder="Ej. Juan Pérez" className={errors.nombres ? "border-destructive" : ""} />
              {errors.nombres && <p className="text-sm text-destructive">{errors.nombres.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Apellidos</Label>
              <Input {...register('apellidos')} placeholder="Ej. Pérez Gómez" className={errors.apellidos ? "border-destructive" : ""} />
              {errors.apellidos && <p className="text-sm text-destructive">{errors.apellidos.message}</p>}
            </div>
            
            <div className="space-y-2">
              <Label>Correo electrónico</Label>
              <Input type="email" {...register('email')} placeholder="correo@ejemplo.com" className={errors.email ? "border-destructive" : ""} />
              {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
              {watchedComunidad === 'si' && <p className="text-xs text-muted-foreground">Sugerimos usar tu correo institucional (@continental.edu.pe).</p>}
            </div>
            <div className="space-y-2">
              <Label>Teléfono / Celular</Label>
              <Input type="tel" {...register('telefono')} placeholder="999 999 999" className={errors.telefono ? "border-destructive" : ""} />
              {errors.telefono && <p className="text-sm text-destructive">{errors.telefono.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>Tipo de Documento</Label>
              <Controller
                control={control}
                name="tipoDoc"
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger className={errors.tipoDoc ? "border-destructive" : ""}>
                      <SelectValue placeholder="Selecciona" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DNI">DNI</SelectItem>
                      <SelectItem value="Carné de extranjería">Carné de extranjería</SelectItem>
                      <SelectItem value="Pasaporte">Pasaporte</SelectItem>
                      <SelectItem value="RUC">RUC</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.tipoDoc && <p className="text-sm text-destructive">{errors.tipoDoc.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Número de Documento</Label>
              <Input {...register('nroDoc')} placeholder="Número" className={errors.nroDoc ? "border-destructive" : ""} />
              {errors.nroDoc && <p className="text-sm text-destructive">{errors.nroDoc.message}</p>}
            </div>
          </CardContent>
        </Card>

        {/* SECCIÓN 3: LIBROS */}
        <Card className="border-border shadow-sm overflow-hidden">
          <CardHeader className="bg-muted/50 pb-4">
            <CardTitle>3. Selección de Libros</CardTitle>
            <CardDescription>Escoge los títulos que deseas adquirir.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {loadingCatalogo ? (
              <div className="flex justify-center p-8">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="divide-y divide-border max-h-[400px] overflow-y-auto">
                {catalogo.length === 0 ? (
                  <p className="p-6 text-center text-muted-foreground">No hay libros disponibles en este momento.</p>
                ) : catalogo.map((libro) => {
                  const enCarrito = watchedLibros.find(l => l.titulo === libro.titulo);
                  const cant = enCarrito?.cantidad || 0;
                  const agotado = libro.stock <= 0;

                  return (
                    <div key={libro.id} className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
                      <div className="pr-4">
                        <h4 className="font-medium text-foreground">{libro.titulo}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className="font-mono bg-primary/10 text-primary">S/ {libro.precioNormal.toFixed(2)}</Badge>
                          {agotado && <Badge variant="destructive">Agotado</Badge>}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="icon" 
                          className="h-8 w-8 rounded-full"
                          disabled={cant === 0}
                          onClick={() => onRemoveLibro(libro.titulo)}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <span className="w-4 text-center font-medium">{cant}</span>
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="icon" 
                          className="h-8 w-8 rounded-full"
                          disabled={agotado || cant >= libro.stock}
                          onClick={() => onAddLibro(libro)}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            
            {errors.libros && (
              <div className="p-4 bg-destructive/10 text-destructive text-sm font-medium flex items-center gap-2">
                <Info className="w-4 h-4" />
                {errors.libros.message}
              </div>
            )}

            {/* RESUMEN DEL CARRITO INLINE */}
            {watchedLibros.length > 0 && (
              <div className="bg-primary/5 p-4 border-t border-border">
                <div className="flex items-center justify-between font-semibold text-lg text-primary">
                  <span className="flex items-center gap-2">
                    <ShoppingCart className="w-5 h-5" /> Total ({watchedLibros.reduce((acc, i) => acc + i.cantidad, 0)} ítems)
                  </span>
                  <span>S/ {totalCarrito.toFixed(2)}</span>
                </div>
                {watchedComunidad === 'si' && (
                  <p className="text-xs text-muted-foreground mt-1">
                    * Eres miembro de la Comunidad Continental. Si aplica algún descuento adicional, 
                    este será calculado internamente por el área encargada y se reflejará en el correo final.
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* SECCIÓN 4: ENTREGA */}
        <Card className="border-border shadow-sm">
          <CardHeader>
            <CardTitle>4. Datos de Entrega</CardTitle>
            <CardDescription>¿Cómo te gustaría recibir tus libros?</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Modalidad de entrega</Label>
              <Controller
                control={control}
                name="tipoEntrega"
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger className={errors.tipoEntrega ? "border-destructive" : ""}>
                      <SelectValue placeholder="Selecciona modalidad" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="recojo">Recojo en Campus</SelectItem>
                      <SelectItem value="delivery">Envío / Delivery</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.tipoEntrega && <p className="text-sm text-destructive">{errors.tipoEntrega.message}</p>}
            </div>

            {watchedEntrega === 'recojo' && (
              <div className="space-y-2 pt-2 animate-in fade-in slide-in-from-top-4">
                <Label>¿En qué campus realizarás el recojo?</Label>
                <Controller
                  control={control}
                  name="campusRecojo"
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger className={errors.campusRecojo ? "border-destructive" : ""}>
                        <SelectValue placeholder="Selecciona campus" />
                      </SelectTrigger>
                      <SelectContent>
                        {SEDES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.campusRecojo && <p className="text-sm text-destructive">{errors.campusRecojo.message}</p>}
              </div>
            )}

            {watchedEntrega === 'delivery' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 animate-in fade-in slide-in-from-top-4">
                <div className="space-y-2">
                  <Label>Dirección exacta</Label>
                  <Input {...register('direccion')} placeholder="Av. / Calle / Jr. Nro, Distrito" className={errors.direccion ? "border-destructive" : ""} />
                  {errors.direccion && <p className="text-sm text-destructive">{errors.direccion.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Ciudad / Región</Label>
                  <Input {...register('ciudad')} placeholder="Ej. Huancayo, Junín" className={errors.ciudad ? "border-destructive" : ""} />
                  {errors.ciudad && <p className="text-sm text-destructive">{errors.ciudad.message}</p>}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* SECCIÓN 5: TÉRMINOS */}
        <Card className="border-border shadow-sm">
          <CardHeader>
            <CardTitle>5. Términos y Condiciones</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-row items-start space-x-3 space-y-0">
              <Controller
                control={control}
                name="terminos1"
                render={({ field }) => (
                  <Checkbox 
                    id="term1" 
                    checked={field.value} 
                    onCheckedChange={field.onChange} 
                    className={errors.terminos1 ? "border-destructive" : ""}
                  />
                )}
              />
              <div className="space-y-1 leading-none">
                <Label htmlFor="term1" className="text-sm font-normal text-muted-foreground cursor-pointer">
                  Acepto haber leído y autorizo nuestra <a href="https://ucontinental.edu.pe/politica-de-privacidad/" target="_blank" rel="noreferrer" className="text-primary underline underline-offset-4 hover:text-primary/80">política de privacidad</a>.
                </Label>
                {errors.terminos1 && <p className="text-sm text-destructive">{errors.terminos1.message}</p>}
              </div>
            </div>

            <div className="flex flex-row items-start space-x-3 space-y-0">
              <Controller
                control={control}
                name="terminos2"
                render={({ field }) => (
                  <Checkbox 
                    id="term2" 
                    checked={field.value} 
                    onCheckedChange={field.onChange} 
                    className={errors.terminos2 ? "border-destructive" : ""}
                  />
                )}
              />
              <div className="space-y-1 leading-none">
                <Label htmlFor="term2" className="text-sm font-normal text-muted-foreground cursor-pointer">
                  Al presionar Enviar, acepto haber leído y autorizo nuestra <a href="https://ucontinental.edu.pe/politica-de-privacidad/" target="_blank" rel="noreferrer" className="text-primary underline underline-offset-4 hover:text-primary/80">Política de tratamiento de datos</a>.
                </Label>
                {errors.terminos2 && <p className="text-sm text-destructive">{errors.terminos2.message}</p>}
              </div>
            </div>
          </CardContent>
        </Card>

        {submitError && (
          <div className="p-4 bg-destructive/10 text-destructive text-sm font-medium rounded-lg border border-destructive/20 flex items-start gap-2">
            <Info className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Error al enviar</p>
              <p>{submitError}</p>
            </div>
          </div>
        )}

        <Button type="submit" size="lg" className="w-full text-lg h-14" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Enviando y Procesando...
            </>
          ) : (
            'Finalizar y Enviar Pedido'
          )}
        </Button>
      </form>
    </div>
  );
}