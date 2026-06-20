'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/src/lib/supabase/server'

export type BarberServiceInput = {
    service_id: string
    custom_price?: number | null
    custom_duration_minutes?: number | null
}

type SavedBarberService = {
    barber_id: string
    service_id: string
    custom_price: number | null
    custom_duration_minutes: number | null
}

type UpsertBarberServicesResult =
    | {
        ok: true
        data: SavedBarberService[]
    }
    | {
        ok: false
        message: string
    }

function failure(message: string): UpsertBarberServicesResult {
    return {
        ok: false,
        message,
    }
}

export async function upsertBarberServices(
    barberId: string,
    services: BarberServiceInput[]
): Promise<UpsertBarberServicesResult> {
    const supabase = await createClient()

    /*
     * 1. Validar sesión.
     */
    const {
        data: { user },
        error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
        return failure('No autorizado')
    }

    /*
     * 2. Obtener negocio y rol desde el servidor.
     */
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, business_id, role')
        .eq('id', user.id)
        .single()

    if (profileError || !profile?.business_id) {
        return failure('No se pudo cargar el perfil del usuario')
    }

    if (profile.role !== 'owner' && profile.role !== 'admin') {
        return failure(
            'No tienes permisos para modificar los servicios del barbero'
        )
    }

    /*
     * 3. Validar suscripción.
     */
    const { data: business, error: businessError } = await supabase
        .from('businesses')
        .select('id, slug, subscription_status')
        .eq('id', profile.business_id)
        .single()

    if (businessError || !business) {
        return failure('Negocio no encontrado')
    }

    if (
        business.subscription_status !== 'trialing' &&
        business.subscription_status !== 'active'
    ) {
        return failure(
            business.subscription_status === 'past_due'
                ? 'Tu negocio está en modo lectura porque existe un pago pendiente.'
                : business.subscription_status === 'canceled'
                    ? 'La suscripción está cancelada. Reactívala para modificar servicios.'
                    : 'La suscripción actual no permite modificar servicios.'
        )
    }

    /*
     * 4. Validar ID del barbero.
     *
     * Aunque TypeScript declare barberId como string, una Server Action
     * sigue recibiendo datos externos que deben validarse en runtime.
     */
    const normalizedBarberId =
        typeof barberId === 'string' ? barberId.trim() : ''

    if (!normalizedBarberId) {
        return failure('El barbero no es válido')
    }

    /*
     * Nunca confiamos solamente en barberId.
     * Comprobamos que pertenezca al negocio autenticado.
     */
    const { data: barber, error: barberError } = await supabase
        .from('barbers')
        .select('id, business_id')
        .eq('id', normalizedBarberId)
        .eq('business_id', profile.business_id)
        .maybeSingle()

    if (barberError) {
        console.error(
            'Error verificando barbero antes de asignar servicios:',
            barberError
        )

        return failure('No se pudo verificar el barbero')
    }

    if (!barber) {
        return failure(
            'El barbero no existe o no pertenece a tu negocio'
        )
    }

    /*
     * 5. Validar entrada.
     */
    if (!Array.isArray(services)) {
        return failure('La lista de servicios no es válida')
    }

    if (services.length > 100) {
        return failure(
            'No puedes asignar más de 100 servicios a un barbero'
        )
    }

    const normalizedServices: BarberServiceInput[] = []
    const serviceIds = new Set<string>()

    for (const service of services) {
        /*
         * Evita errores si alguien invoca la Server Action enviando
         * null, un string u otro valor que no respete el tipo declarado.
         */
        if (!service || typeof service !== 'object') {
            return failure('Uno de los servicios no es válido')
        }

        if (typeof service.service_id !== 'string') {
            return failure('Uno de los servicios no es válido')
        }

        const serviceId = service.service_id.trim()

        if (!serviceId) {
            return failure('Uno de los servicios no es válido')
        }

        if (serviceIds.has(serviceId)) {
            return failure(
                'La lista contiene servicios duplicados'
            )
        }

        const customPrice = service.custom_price ?? null
        const customDuration =
            service.custom_duration_minutes ?? null

        /*
         * El precio se almacena en pesos chilenos:
         * - solo enteros;
         * - permite cero;
         * - máximo defensivo de $100.000.000.
         */
        if (
            customPrice !== null &&
            (!Number.isInteger(customPrice) ||
                customPrice < 0 ||
                customPrice > 100_000_000)
        ) {
            return failure(
                'El precio personalizado debe ser un número entero entre 0 y 100.000.000'
            )
        }

        if (
            customDuration !== null &&
            (!Number.isInteger(customDuration) ||
                customDuration < 1 ||
                customDuration > 1440)
        ) {
            return failure(
                'La duración personalizada debe ser un número entero entre 1 y 1440 minutos'
            )
        }

        serviceIds.add(serviceId)

        normalizedServices.push({
            service_id: serviceId,
            custom_price: customPrice,
            custom_duration_minutes: customDuration,
        })
    }

    /*
     * 6. Comprobar que todos los servicios pertenezcan
     * al mismo negocio del usuario autenticado.
     */
    if (serviceIds.size > 0) {
        const { data: validServices, error: servicesError } =
            await supabase
                .from('services')
                .select('id')
                .eq('business_id', profile.business_id)
                .in('id', Array.from(serviceIds))

        if (servicesError) {
            console.error(
                'Error verificando servicios del negocio:',
                servicesError
            )

            return failure(
                'No se pudieron verificar los servicios seleccionados'
            )
        }

        if ((validServices?.length ?? 0) !== serviceIds.size) {
            return failure(
                'Uno o más servicios no existen o pertenecen a otro negocio'
            )
        }
    }

    /*
     * 7. Cargar las asignaciones actuales.
     *
     * Se usan para calcular cuáles servicios fueron retirados.
     * Ya no se eliminan todas las asignaciones antes de insertar.
     */
    const {
        data: previousServices,
        error: previousServicesError,
    } = await supabase
        .from('barber_services')
        .select(`
            barber_id,
            service_id,
            custom_price,
            custom_duration_minutes
        `)
        .eq('barber_id', normalizedBarberId)

    if (previousServicesError) {
        console.error(
            'Error cargando asignaciones anteriores:',
            previousServicesError
        )

        return failure(
            'No se pudieron cargar los servicios actuales del barbero'
        )
    }

    /*
     * 8. Preparar las asignaciones deseadas.
     */
    const payload = normalizedServices.map((service) => ({
        barber_id: normalizedBarberId,
        service_id: service.service_id,
        custom_price: service.custom_price ?? null,
        custom_duration_minutes:
            service.custom_duration_minutes ?? null,
    }))

    let savedServices: SavedBarberService[] = []

    /*
     * 9. Insertar o actualizar primero.
     *
     * Si este paso falla, los servicios anteriores continúan intactos.
     */
    if (payload.length > 0) {
        const { data, error: upsertError } = await supabase
            .from('barber_services')
            .upsert(payload, {
                onConflict: 'barber_id,service_id',
            })
            .select(`
                barber_id,
                service_id,
                custom_price,
                custom_duration_minutes
            `)

        if (upsertError) {
            console.error(
                'Error guardando servicios del barbero:',
                upsertError
            )

            return failure(
                'No se pudieron guardar los servicios del barbero'
            )
        }

        savedServices = (data ?? []) as SavedBarberService[]
    }

    /*
     * 10. Calcular los servicios que fueron retirados.
     *
     * Set evita enviar identificadores repetidos al delete en caso
     * de que existan datos duplicados históricos.
     */
    const desiredServiceIds = new Set(
        normalizedServices.map((service) => service.service_id)
    )

    const removedServiceIds = Array.from(
        new Set(
            (previousServices ?? [])
                .map((service) => service.service_id)
                .filter(
                    (serviceId) =>
                        !desiredServiceIds.has(serviceId)
                )
        )
    )

    /*
     * 11. Eliminar solamente las asignaciones retiradas.
     *
     * Cuando normalizedServices está vacío, removedServiceIds contiene
     * todos los servicios anteriores y el barbero queda sin servicios.
     */
    if (removedServiceIds.length > 0) {
        const { error: deleteError } = await supabase
            .from('barber_services')
            .delete()
            .eq('barber_id', normalizedBarberId)
            .in('service_id', removedServiceIds)

        if (deleteError) {
            console.error(
                'Error eliminando servicios retirados:',
                deleteError
            )

            return failure(
                'Los nuevos servicios se guardaron, pero no fue posible retirar los servicios anteriores'
            )
        }
    }

    /*
     * 12. Actualizar panel y página pública.
     */
    revalidatePath(`/admin/b/${business.slug}/barberos`)
    revalidatePath(`/b/${business.slug}`)

    return {
        ok: true,
        data: savedServices,
    }
}