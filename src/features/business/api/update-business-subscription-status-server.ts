'use server'

import {
    revalidatePath,
} from 'next/cache'

import {
    supabaseAdmin,
} from '@/src/lib/supabase/admin'

import {
    getPlatformAdmin,
} from '@/src/features/auth/api/get-platform-admin'

type SubscriptionStatus =
    | 'active'
    | 'past_due'
    | 'cancelled'

type Input = {
    businessId: string
    status: SubscriptionStatus
}

type Result =
    | {
        ok: true
        previousStatus: string
        status: SubscriptionStatus
    }
    | {
        ok: false
        message: string
    }

type RpcResult = {
    businessId: string
    businessSlug: string
    subscriptionId: string
    planSlug: string
    previousStatus: string
    nextStatus: SubscriptionStatus
    currentPeriodStart: string | null
    currentPeriodEnd: string | null
}

const ALLOWED_STATUSES =
    new Set<SubscriptionStatus>([
        'active',
        'past_due',
        'cancelled',
    ])

function failure(
    message: string
): Result {
    return {
        ok: false,
        message,
    }
}

function isAllowedStatus(
    value: unknown
): value is SubscriptionStatus {
    return (
        typeof value === 'string' &&
        ALLOWED_STATUSES.has(
            value as SubscriptionStatus
        )
    )
}

export async function updateBusinessSubscriptionStatusServer({
    businessId,
    status,
}: Input): Promise<Result> {
    /*
     * 1. Validar sesión de superadmin.
     */
    const platformAdmin =
        await getPlatformAdmin()

    if (!platformAdmin) {
        return failure(
            'No autorizado como administrador de plataforma'
        )
    }

    /*
     * 2. Validar parámetros.
     */
    const normalizedBusinessId =
        typeof businessId === 'string'
            ? businessId.trim()
            : ''

    if (!normalizedBusinessId) {
        return failure(
            'Negocio no válido'
        )
    }

    if (!isAllowedStatus(status)) {
        return failure(
            'Estado de suscripción no válido'
        )
    }

    /*
     * 3. Ejecutar cambio atómico.
     */
    const {
        data,
        error,
    } = await supabaseAdmin.rpc(
        'apply_manual_subscription_status_change',
        {
            p_business_id:
                normalizedBusinessId,

            p_next_status:
                status,

            p_platform_admin_id:
                platformAdmin.id,
        }
    )

    if (error) {
        console.error(
            'Error aplicando cambio manual de suscripción:',
            error
        )

        const knownMessages = [
            'Negocio no encontrado',
            'Estado de suscripción no permitido',
            'Administrador de plataforma no válido',
            'La suscripción ya tiene el estado solicitado',
        ]

        const knownMessage =
            knownMessages.find(
                (message) =>
                    error.message.includes(
                        message
                    )
            )

        return failure(
            knownMessage ??
            'No se pudo actualizar la suscripción'
        )
    }

    const result =
        data as RpcResult | null

    if (!result) {
        return failure(
            'La operación no devolvió un resultado válido'
        )
    }

    /*
     * 4. Revalidar las pantallas relacionadas.
     */
    revalidatePath(
        '/superadmin/businesses'
    )

    revalidatePath(
        `/superadmin/businesses/${normalizedBusinessId}`
    )

    revalidatePath(
        '/admin',
        'layout'
    )

    revalidatePath(
        `/admin/b/${result.businessSlug}/plan`
    )

    revalidatePath(
        `/b/${result.businessSlug}`
    )

    return {
        ok: true,
        previousStatus:
            result.previousStatus,
        status,
    }
}