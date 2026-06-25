'use server'

import { revalidatePath } from 'next/cache'
import { supabaseAdmin } from '@/src/lib/supabase/admin'
import { getPlatformAdmin } from '@/src/features/auth/api/get-platform-admin'

type Result =
    | {
        ok: true
    }
    | {
        ok: false
        message: string
    }

type ManualPaymentRpcRow = {
    payment_id: string
    business_id: string
    business_slug: string
    subscription_id: string
    previous_status: string
    next_status: string
    period_start: string
    period_end: string
}

function getPaymentErrorMessage(
    errorMessage?: string | null
) {
    if (
        errorMessage?.includes(
            'BUSINESS_ID_REQUIRED'
        )
    ) {
        return 'Negocio no válido'
    }

    if (
        errorMessage?.includes(
            'PLATFORM_ADMIN_NOT_FOUND'
        )
    ) {
        return 'El administrador de plataforma no es válido'
    }

    if (
        errorMessage?.includes(
            'SUBSCRIPTION_OUT_OF_SYNC'
        )
    ) {
        return 'El plan del negocio y la suscripción no están sincronizados'
    }
    if (
        errorMessage?.includes(
            'BUSINESS_NOT_FOUND'
        )
    ) {
        return 'Negocio no encontrado'
    }

    if (
        errorMessage?.includes(
            'INVALID_PAYMENT_AMOUNT'
        )
    ) {
        return 'El monto debe ser mayor a 0'
    }

    if (
        errorMessage?.includes(
            'INVALID_BUSINESS_PLAN'
        )
    ) {
        return 'El negocio no tiene un plan válido'
    }

    return 'No se pudo registrar el pago manual'
}

export async function registerManualPaymentServer({
    businessId,
    amount,
}: {
    businessId: string
    amount: number
}): Promise<Result> {
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

    /*
     * CLP normalmente se maneja sin decimales.
     * También evitamos Infinity y números inseguros.
     */
    if (
        !Number.isSafeInteger(amount) ||
        amount <= 0
    ) {
        return {
            ok: false,
            message:
                'El monto debe ser un número entero mayor a 0',
        }
    }

    const platformAdmin =
        await getPlatformAdmin()

    if (!platformAdmin) {
        return {
            ok: false,
            message:
                'No autorizado como administrador de plataforma',
        }
    }

    const {
        data,
        error,
    } = await supabaseAdmin.rpc(
        'register_manual_subscription_payment',
        {
            p_business_id:
                normalizedBusinessId,

            p_amount:
                amount,

            p_platform_admin_id:
                platformAdmin.id,
        }
    )

    if (error) {
        console.error(
            'Error registrando pago manual:',
            error
        )

        return {
            ok: false,
            message:
                getPaymentErrorMessage(
                    error.message
                ),
        }
    }

    const rawResult =
        Array.isArray(data)
            ? data[0]
            : data

    const result =
        rawResult as
        | ManualPaymentRpcRow
        | null

    if (
        !result?.payment_id ||
        !result.business_id ||
        !result.business_slug ||
        !result.subscription_id
    ) {
        console.error(
            'La función de pago manual no devolvió un resultado válido:',
            data
        )

        return {
            ok: false,
            message:
                'El pago se procesó sin una respuesta válida',
        }
    }

    revalidatePath(
        '/superadmin/businesses'
    )

    revalidatePath(
        `/superadmin/businesses/${result.business_id}`
    )

    revalidatePath(
        `/admin/b/${result.business_slug}`
    )

    revalidatePath(
        `/admin/b/${result.business_slug}/plan`
    )

    revalidatePath(
        `/admin/b/${result.business_slug}/plan/historial`
    )

    revalidatePath(
        '/admin',
        'layout'
    )

    return {
        ok: true,
    }
}
