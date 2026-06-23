'use server'

import { createClient } from '@/src/lib/supabase/server'
import { getPlatformAdmin } from '@/src/features/auth/api/get-platform-admin'
import { canAccessAdmin } from '@/src/features/auth/utils/admin-access'

type LoginDestinationSuccess = {
    ok: true
    href: string
}

type LoginDestinationFailure = {
    ok: false
    message: string
}

export type LoginDestinationResult =
    | LoginDestinationSuccess
    | LoginDestinationFailure

export async function getLoginDestination(): Promise<LoginDestinationResult> {
    const supabase = await createClient()

    /*
     * No confiamos en un ID entregado por el navegador.
     * Obtenemos la cuenta directamente desde la sesión.
     */
    const {
        data: {
            user,
        },
        error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
        return {
            ok: false,
            message:
                'No se pudo validar la sesión iniciada',
        }
    }

    /*
     * Una cuenta puede ser owner de un negocio
     * y además administradora de la plataforma.
     *
     * En ese caso priorizamos el panel superadmin.
     */
    const platformAdmin =
        await getPlatformAdmin()

    if (platformAdmin) {
        return {
            ok: true,
            href:
                '/superadmin/businesses',
        }
    }

    const {
        data: profile,
        error: profileError,
    } = await supabase
        .from('profiles')
        .select(
            'business_id, role'
        )
        .eq('id', user.id)
        .single()

    if (
        profileError ||
        !profile ||
        !canAccessAdmin(profile.role)
    ) {
        console.error(
            'Error obteniendo perfil después del login:',
            profileError
        )

        return {
            ok: false,
            message:
                'No se encontró un perfil autorizado para esta cuenta',
        }
    }

    if (profile.role === 'barber') {
        return {
            ok: true,
            href:
                '/admin/mi-agenda',
        }
    }

    const {
        data: business,
        error: businessError,
    } = await supabase
        .from('businesses')
        .select('slug')
        .eq(
            'id',
            profile.business_id
        )
        .single()

    if (
        businessError ||
        !business?.slug
    ) {
        console.error(
            'Error obteniendo negocio después del login:',
            businessError
        )

        return {
            ok: false,
            message:
                'No se encontró el negocio asociado a esta cuenta',
        }
    }

    return {
        ok: true,
        href:
            `/admin/b/${business.slug}`,
    }
}

