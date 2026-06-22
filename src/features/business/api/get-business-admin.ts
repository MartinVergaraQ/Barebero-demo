import 'server-only'

import { createClient } from '@/src/lib/supabase/server'
import { canManageBusiness } from '@/src/features/auth/utils/admin-access'

export type SubscriptionStatus =
    | 'trialing'
    | 'active'
    | 'past_due'
    | 'cancelled'

export type WhatsAppRouting =
    | 'business'
    | 'barber'
    | 'fallback'

export type BusinessAdminItem = {
    id: string
    name: string
    slug: string
    phone: string | null
    email: string | null
    address: string | null
    city: string | null
    country: string | null
    instagram_url: string | null
    logo_url: string | null
    cover_url: string | null
    description: string | null
    timezone: string
    whatsapp_phone: string | null
    whatsapp_routing: WhatsAppRouting | null
    plan_slug: string | null
    max_barbers: number | null
    max_services: number | null
    subscription_status: SubscriptionStatus
    trial_ends_at: string | null
}

export async function getBusinessAdmin(
    businessId: string
): Promise<BusinessAdminItem> {
    const normalizedBusinessId =
        typeof businessId === 'string'
            ? businessId.trim()
            : ''

    if (!normalizedBusinessId) {
        throw new Error(
            'El negocio solicitado no es válido'
        )
    }

    const supabase = await createClient()

    /*
     * 1. Validar sesión.
     */
    const {
        data: { user },
        error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
        throw new Error('No autorizado')
    }

    /*
     * 2. Obtener perfil y negocio real del usuario.
     */
    const { data: profile, error: profileError } =
        await supabase
            .from('profiles')
            .select('id, business_id, role')
            .eq('id', user.id)
            .maybeSingle()

    if (profileError) {
        console.error(
            'Error cargando perfil para consultar negocio:',
            profileError
        )

        throw new Error(
            'No se pudo verificar el perfil del usuario'
        )
    }

    if (!profile?.business_id) {
        throw new Error(
            'El usuario no tiene un negocio asignado'
        )
    }

    /*
     * 3. Solo owner/admin pueden acceder
     * a la configuración administrativa.
     */
    if (!canManageBusiness(profile.role)) {
        throw new Error(
            'No tienes permisos para administrar el negocio'
        )
    }

    /*
     * 4. Impedir consultar otro negocio
     * cambiando el identificador.
     */
    if (
        profile.business_id !==
        normalizedBusinessId
    ) {
        throw new Error(
            'No tienes acceso a este negocio'
        )
    }

    /*
     * La lectura no se bloquea por suscripción.
     * past_due y cancelled siguen pudiendo consultar.
     */
    const { data, error } = await supabase
        .from('businesses')
        .select(`
            id,
            name,
            slug,
            phone,
            email,
            address,
            city,
            country,
            instagram_url,
            logo_url,
            cover_url,
            description,
            timezone,
            whatsapp_phone,
            whatsapp_routing,
            plan_slug,
            max_barbers,
            max_services,
            subscription_status,
            trial_ends_at
        `)
        .eq('id', profile.business_id)
        .maybeSingle()

    if (error) {
        console.error(
            'Error cargando negocio administrativo:',
            error
        )

        throw new Error(
            'No se pudo cargar el negocio'
        )
    }

    if (!data) {
        throw new Error('Negocio no encontrado')
    }

    return data as BusinessAdminItem
}