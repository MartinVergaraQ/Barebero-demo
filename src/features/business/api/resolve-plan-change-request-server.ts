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

type Result =
    | {
        ok: true
    }
    | {
        ok: false
        message: string
    }

type ApprovePlanRpcRow = {
    request_id: string
    business_id: string
    business_slug: string
    previous_plan_slug: string
    next_plan_slug: string
}

type BusinessRelation = {
    id: string
    slug: string
}

function normalizeRequestId(
    value: unknown
) {
    return typeof value === 'string'
        ? value.trim()
        : ''
}

function getSingleRelation<T>(
    value: T | T[] | null
): T | null {
    if (Array.isArray(value)) {
        return value[0] ?? null
    }

    return value
}

function revalidatePlanViews({
    businessId,
    businessSlug,
}: {
    businessId: string
    businessSlug: string
}) {
    revalidatePath(
        '/superadmin/plan-requests'
    )

    revalidatePath(
        '/superadmin/businesses'
    )

    revalidatePath(
        `/superadmin/businesses/${businessId}`
    )

    revalidatePath(
        `/admin/b/${businessSlug}`
    )

    revalidatePath(
        `/admin/b/${businessSlug}/plan`
    )

    revalidatePath(
        `/admin/b/${businessSlug}/plan/cambiar`
    )

    revalidatePath(
        `/admin/b/${businessSlug}/plan/historial`
    )

    /*
     * Actualiza sidebar, dashboards y datos
     * compartidos del panel administrativo.
     */
    revalidatePath(
        '/admin',
        'layout'
    )
}

function getApproveErrorMessage(
    message?: string | null
) {

    if (
        message?.includes(
            'SUBSCRIPTION_OUT_OF_SYNC'
        )
    ) {
        return 'El plan del negocio y el plan de la suscripción no están sincronizados. Debes corregirlos antes de aprobar la solicitud.'
    }

    if (
        message?.includes(
            'BUSINESS_NOT_FOUND'
        )
    ) {
        return 'No se encontró el negocio asociado a la solicitud'
    }

    if (
        message?.includes(
            'REQUEST_NOT_FOUND'
        )
    ) {
        return 'Solicitud no encontrada'
    }

    if (
        message?.includes(
            'REQUEST_ALREADY_RESOLVED'
        )
    ) {
        return 'Esta solicitud ya fue resuelta'
    }

    if (
        message?.includes(
            'STALE_PLAN_REQUEST'
        )
    ) {
        return 'El plan del negocio cambió mientras la solicitud estaba pendiente. Debe crear una nueva solicitud.'
    }

    if (
        message?.includes(
            'PLAN_ALREADY_ACTIVE'
        )
    ) {
        return 'El negocio ya utiliza el plan solicitado'
    }

    if (
        message?.includes(
            'BARBER_LIMIT_EXCEEDED'
        )
    ) {
        return 'No se puede aprobar el cambio porque el negocio supera el límite de barberos del plan solicitado.'
    }

    if (
        message?.includes(
            'SERVICE_LIMIT_EXCEEDED'
        )
    ) {
        return 'No se puede aprobar el cambio porque el negocio supera el límite de servicios del plan solicitado.'
    }

    if (
        message?.includes(
            'INVALID_REQUESTED_PLAN'
        ) ||
        message?.includes(
            'INVALID_CURRENT_PLAN'
        )
    ) {
        return 'El plan asociado a la solicitud no es válido'
    }

    if (
        message?.includes(
            'SUBSCRIPTION_NOT_FOUND'
        )
    ) {
        return 'No se encontró la suscripción del negocio'
    }

    if (
        message?.includes(
            'PLATFORM_ADMIN_NOT_FOUND'
        )
    ) {
        return 'El administrador de plataforma no es válido'
    }

    return 'No se pudo aprobar la solicitud de cambio de plan'
}

export async function rejectPlanChangeRequestServer(
    requestId: string,
    adminNote?: string
): Promise<Result> {
    const normalizedRequestId =
        normalizeRequestId(
            requestId
        )

    if (!normalizedRequestId) {
        return {
            ok: false,
            message:
                'Solicitud no válida',
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
        data: request,
        error: requestError,
    } = await supabaseAdmin
        .from(
            'plan_change_requests'
        )
        .select(`
            id,
            status,
            businesses:business_id (
                id,
                slug
            )
        `)
        .eq(
            'id',
            normalizedRequestId
        )
        .maybeSingle()

    if (
        requestError ||
        !request
    ) {
        console.error(
            'Error cargando solicitud para rechazo:',
            requestError
        )

        return {
            ok: false,
            message:
                'Solicitud no encontrada',
        }
    }

    if (
        request.status !==
        'pending'
    ) {
        return {
            ok: false,
            message:
                'Esta solicitud ya fue resuelta',
        }
    }

    const business =
        getSingleRelation(
            request.businesses as
            | BusinessRelation
            | BusinessRelation[]
            | null
        )

    if (
        !business?.id ||
        !business.slug
    ) {
        return {
            ok: false,
            message:
                'No se encontró el negocio asociado',
        }
    }

    const normalizedAdminNote =
        typeof adminNote === 'string'
            ? adminNote
                .trim()
                .slice(0, 500)
            : ''

    /*
     * La condición status=pending evita que dos
     * administradores resuelvan la solicitud.
     */
    const {
        data: rejectedRequest,
        error: rejectError,
    } = await supabaseAdmin
        .from(
            'plan_change_requests'
        )
        .update({
            status:
                'rejected',

            admin_note:
                normalizedAdminNote ||
                null,

            resolved_at:
                new Date()
                    .toISOString(),

            resolved_by:
                null,

            resolved_by_platform_admin:
                platformAdmin.id,
        })
        .eq(
            'id',
            request.id
        )
        .eq(
            'status',
            'pending'
        )
        .select(
            'id'
        )
        .maybeSingle()

    if (rejectError) {
        console.error(
            'Error rechazando solicitud de plan:',
            rejectError
        )

        return {
            ok: false,
            message:
                'No se pudo rechazar la solicitud',
        }
    }

    if (!rejectedRequest) {
        return {
            ok: false,
            message:
                'La solicitud ya fue resuelta por otro administrador',
        }
    }

    /*
     * Un rechazo no modifica la suscripción,
     * por lo que no inserta historial de cambios.
     */
    revalidatePlanViews({
        businessId:
            business.id,
        businessSlug:
            business.slug,
    })

    return {
        ok: true,
    }
}

export async function approvePlanChangeRequestServer(
    requestId: string
): Promise<Result> {
    const normalizedRequestId =
        normalizeRequestId(
            requestId
        )

    if (!normalizedRequestId) {
        return {
            ok: false,
            message:
                'Solicitud no válida',
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

    /*
     * La aprobación completa debe ocurrir dentro
     * de la RPC para que sea transaccional.
     */
    const {
        data,
        error,
    } = await supabaseAdmin.rpc(
        'approve_plan_change_request',
        {
            p_request_id:
                normalizedRequestId,

            p_platform_admin_id:
                platformAdmin.id,
        }
    )

    if (error) {
        console.error(
            'Error aprobando cambio de plan:',
            error
        )

        return {
            ok: false,
            message:
                getApproveErrorMessage(
                    error.message
                ),
        }
    }

    /*
     * Soporta una RPC que retorne TABLE
     * o un único objeto JSON.
     */
    const rawResult =
        Array.isArray(data)
            ? data[0]
            : data

    const result =
        rawResult as
        | ApprovePlanRpcRow
        | null

    if (
        !result?.request_id ||
        !result.business_id ||
        !result.business_slug
    ) {
        console.error(
            'El RPC de aprobación no devolvió un resultado válido:',
            data
        )

        return {
            ok: false,
            message:
                'La solicitud se procesó sin una respuesta válida',
        }
    }

    revalidatePlanViews({
        businessId:
            result.business_id,

        businessSlug:
            result.business_slug,
    })

    return {
        ok: true,
    }
}