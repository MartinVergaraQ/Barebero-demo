'use server'

import { createClient } from '@/src/lib/supabase/server'
import { canManageSubscription } from '@/src/features/auth/utils/admin-access'
import {
    PLAN_LIMITS,
    type AllowedPlanSlug,
} from '@/src/features/business/utils/plan-config'

type Input = {
    businessId: string
    requestedPlanSlug: AllowedPlanSlug
}

type Result =
    | {
        ok: true
        currentPlanSlug: string
        requestedPlanSlug: AllowedPlanSlug
    }
    | {
        ok: false
        message: string
    }

function isAllowedPlanSlug(
    value: unknown
): value is AllowedPlanSlug {
    return (
        value === 'starter' ||
        value === 'pro' ||
        value === 'studio'
    )
}

export async function createPlanChangeRequestServer({
    businessId,
    requestedPlanSlug,
}: Input): Promise<Result> {
    const normalizedBusinessId =
        typeof businessId === 'string'
            ? businessId.trim()
            : ''

    if (!normalizedBusinessId) {
        return {
            ok: false,
            message: 'Negocio no válido',
        }
    }

    if (!isAllowedPlanSlug(requestedPlanSlug)) {
        return {
            ok: false,
            message: 'Plan solicitado no válido',
        }
    }

    const supabase = await createClient()

    const {
        data: { user },
        error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
        return {
            ok: false,
            message: 'No autorizado',
        }
    }

    const {
        data: profile,
        error: profileError,
    } = await supabase
        .from('profiles')
        .select('id, business_id, role')
        .eq('id', user.id)
        .maybeSingle()

    if (
        profileError ||
        !profile?.business_id
    ) {
        return {
            ok: false,
            message:
                'No se pudo cargar el perfil del usuario',
        }
    }

    if (
        !canManageSubscription(
            profile.role
        )
    ) {
        return {
            ok: false,
            message:
                'No tienes permisos para solicitar cambios de plan',
        }
    }

    if (
        profile.business_id !==
        normalizedBusinessId
    ) {
        return {
            ok: false,
            message:
                'No autorizado para este negocio',
        }
    }

    const {
        data: business,
        error: businessError,
    } = await supabase
        .from('businesses')
        .select('id, plan_slug')
        .eq('id', normalizedBusinessId)
        .maybeSingle()

    if (businessError || !business) {
        return {
            ok: false,
            message: 'Negocio no encontrado',
        }
    }

    if (
        business.plan_slug ===
        requestedPlanSlug
    ) {
        return {
            ok: false,
            message:
                'Ese ya es tu plan actual',
        }
    }

    /*
     * La lectura también actúa como validación
     * defensiva de que el plan existe.
     */
    const requestedLimits =
        PLAN_LIMITS[requestedPlanSlug]

    if (!requestedLimits) {
        return {
            ok: false,
            message:
                'Plan solicitado no válido',
        }
    }

    const {
        data: pendingRequest,
        error: pendingError,
    } = await supabase
        .from('plan_change_requests')
        .select(
            'id, requested_plan_slug, status'
        )
        .eq(
            'business_id',
            normalizedBusinessId
        )
        .eq('status', 'pending')
        .maybeSingle()

    if (pendingError) {
        console.error(
            'Error consultando solicitudes pendientes:',
            pendingError
        )

        return {
            ok: false,
            message:
                'No se pudo comprobar si existe una solicitud pendiente',
        }
    }

    if (pendingRequest) {
        return {
            ok: false,
            message:
                'Ya existe una solicitud de cambio de plan pendiente para este negocio',
        }
    }

    const { error: insertError } =
        await supabase
            .from('plan_change_requests')
            .insert({
                business_id:
                    normalizedBusinessId,
                requested_by:
                    profile.id,
                current_plan_slug:
                    business.plan_slug,
                requested_plan_slug:
                    requestedPlanSlug,
                status: 'pending',
            })

    if (insertError) {
        console.error(
            'Error creando solicitud de plan:',
            insertError
        )

        /*
         * Requiere el índice único parcial para una
         * solicitud pending por negocio.
         */
        if (insertError.code === '23505') {
            return {
                ok: false,
                message:
                    'Ya existe una solicitud de cambio de plan pendiente para este negocio',
            }
        }

        return {
            ok: false,
            message:
                'No se pudo enviar la solicitud de cambio de plan',
        }
    }

    return {
        ok: true,
        currentPlanSlug:
            business.plan_slug,
        requestedPlanSlug,
    }
}

