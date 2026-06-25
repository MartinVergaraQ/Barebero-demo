'use server'

import {
    randomUUID,
} from 'node:crypto'

import {
    createClient,
} from '@/src/lib/supabase/server'

import {
    supabaseAdmin,
} from '@/src/lib/supabase/admin'

import {
    getWebpayEnvironment,
    getWebpayTransaction,
} from '@/src/lib/transbank/webpay'

import {
    PLAN_PRICES,
} from '@/src/features/business/utils/plan-config'

type PlanSlug =
    keyof typeof PLAN_PRICES

type Input = {
    businessSlug: string
}

type Result =
    | {
        ok: true
        url: string
        token: string
        transactionId: string
    }
    | {
        ok: false
        message: string
    }

type WebpayCreateResponse = {
    token?: unknown
    url?: unknown
}

function failure(
    message: string
): Result {
    return {
        ok: false,
        message,
    }
}

function normalizeSlug(
    value: unknown
) {
    return typeof value === 'string'
        ? value.trim()
        : ''
}

function isPlanSlug(
    value: unknown
): value is PlanSlug {
    return (
        value === 'starter' ||
        value === 'pro' ||
        value === 'studio'
    )
}

function getApplicationUrl() {
    const value =
        process.env
            .NEXT_PUBLIC_APP_URL
            ?.trim()
            .replace(/\/+$/, '')

    if (!value) {
        throw new Error(
            'APPLICATION_URL_MISSING'
        )
    }

    return value
}

function createBuyOrder() {
    const timestamp =
        Date.now()
            .toString(36)
            .toUpperCase()

    const random =
        randomUUID()
            .replaceAll('-', '')
            .slice(0, 8)
            .toUpperCase()

    return `BT${timestamp}${random}`
}

function createSessionId(
    profileId: string
) {
    const profilePart =
        profileId
            .replaceAll('-', '')
            .slice(0, 12)

    const randomPart =
        randomUUID()
            .replaceAll('-', '')
            .slice(0, 16)

    return `S${profilePart}${randomPart}`
}

function serializeForJson(
    value: unknown
): Record<string, unknown> {
    try {
        return JSON.parse(
            JSON.stringify(value)
        ) as Record<string, unknown>
    } catch {
        return {}
    }
}

export async function createWebpayPaymentServer({
    businessSlug,
}: Input): Promise<Result> {
    const normalizedSlug =
        normalizeSlug(
            businessSlug
        )

    if (!normalizedSlug) {
        return failure(
            'Negocio no válido'
        )
    }

    /*
     * 1. Validar la sesión real.
     */
    const supabase =
        await createClient()

    const {
        data: {
            user,
        },
        error: userError,
    } = await supabase.auth.getUser()

    if (
        userError ||
        !user
    ) {
        return failure(
            'Debes iniciar sesión nuevamente'
        )
    }

    /*
     * 2. Validar perfil owner.
     */
    const {
        data: profile,
        error: profileError,
    } = await supabaseAdmin
        .from('profiles')
        .select(`
            id,
            business_id,
            role
        `)
        .eq(
            'id',
            user.id
        )
        .maybeSingle()

    if (
        profileError ||
        !profile?.business_id
    ) {
        return failure(
            'No se encontró tu perfil'
        )
    }

    if (profile.role !== 'owner') {
        return failure(
            'Solo el propietario puede pagar la suscripción'
        )
    }

    /*
     * 3. Cargar el negocio usando a la vez
     * business_id y slug para mantener aislamiento.
     */
    const {
        data: business,
        error: businessError,
    } = await supabaseAdmin
        .from('businesses')
        .select(`
            id,
            name,
            slug,
            plan_slug,
            subscription_status
        `)
        .eq(
            'id',
            profile.business_id
        )
        .eq(
            'slug',
            normalizedSlug
        )
        .maybeSingle()

    if (
        businessError ||
        !business
    ) {
        return failure(
            'Negocio no encontrado'
        )
    }

    /*
     * 4. Esta acción es únicamente para
     * regularización o reactivación.
     */
    if (
        business.subscription_status !==
        'past_due' &&
        business.subscription_status !==
        'cancelled'
    ) {
        return failure(
            'La suscripción no necesita regularización'
        )
    }

    if (
        !isPlanSlug(
            business.plan_slug
        )
    ) {
        return failure(
            'El plan del negocio no es válido'
        )
    }

    /*
     * 5. Cargar y validar la suscripción.
     */
    const {
        data: subscription,
        error: subscriptionError,
    } = await supabaseAdmin
        .from(
            'business_subscriptions'
        )
        .select(`
            id,
            business_id,
            plan_slug,
            status,
            price_monthly,
            currency
        `)
        .eq(
            'business_id',
            business.id
        )
        .maybeSingle()

    if (
        subscriptionError ||
        !subscription
    ) {
        return failure(
            'No se encontró la suscripción del negocio'
        )
    }

    if (
        subscription.plan_slug !==
        business.plan_slug
    ) {
        return failure(
            'El plan del negocio y la suscripción no están sincronizados'
        )
    }

    if (
        subscription.status !==
        business.subscription_status
    ) {
        return failure(
            'El estado del negocio y la suscripción no están sincronizados'
        )
    }

    /*
     * El monto se calcula en servidor.
     * Nunca se recibe desde el navegador.
     */
    const amount =
        PLAN_PRICES[
        business.plan_slug
        ]

    if (
        !Number.isSafeInteger(amount) ||
        amount <= 0
    ) {
        return failure(
            'Este plan no posee un monto pagable mediante Webpay'
        )
    }

    let applicationUrl: string

    try {
        applicationUrl =
            getApplicationUrl()
    } catch {
        return failure(
            'La URL pública de la aplicación no está configurada'
        )
    }

    const buyOrder =
        createBuyOrder()

    const sessionId =
        createSessionId(
            profile.id
        )

    const returnUrl =
        `${applicationUrl}/api/webpay/return`

    const environment =
        getWebpayEnvironment()

    /*
     * 6. Crear primero el intento local.
     */
    const {
        data: transactionAttempt,
        error: attemptError,
    } = await supabaseAdmin
        .from(
            'webpay_transactions'
        )
        .insert({
            business_id:
                business.id,

            subscription_id:
                subscription.id,

            initiated_by_profile:
                profile.id,

            buy_order:
                buyOrder,

            session_id:
                sessionId,

            plan_slug:
                business.plan_slug,

            amount,

            currency:
                'CLP',

            environment,

            status:
                'created',

            return_url:
                returnUrl,
        })
        .select(
            'id'
        )
        .single()

    if (
        attemptError ||
        !transactionAttempt
    ) {
        console.error(
            'Error creando intento Webpay:',
            attemptError
        )

        return failure(
            'No se pudo preparar el pago'
        )
    }

    /*
     * 7. Crear la transacción en Transbank.
     */
    try {
        const webpayTransaction =
            getWebpayTransaction()

        const rawResponse =
            await webpayTransaction.create(
                buyOrder,
                sessionId,
                amount,
                returnUrl
            )

        const response =
            rawResponse as
            WebpayCreateResponse

        const token =
            typeof response.token ===
                'string'
                ? response.token.trim()
                : ''

        const url =
            typeof response.url ===
                'string'
                ? response.url.trim()
                : ''

        if (!token || !url) {
            throw new Error(
                'INVALID_WEBPAY_CREATE_RESPONSE'
            )
        }

        /*
         * 8. Guardar token y URL devueltos
         * por Webpay.
         */
        const {
            error: updateError,
        } = await supabaseAdmin
            .from(
                'webpay_transactions'
            )
            .update({
                token_ws:
                    token,

                webpay_url:
                    url,

                status:
                    'redirected',

                create_response:
                    serializeForJson(
                        rawResponse
                    ),

                updated_at:
                    new Date()
                        .toISOString(),
            })
            .eq(
                'id',
                transactionAttempt.id
            )

        if (updateError) {
            console.error(
                'Error guardando respuesta Webpay:',
                updateError
            )

            throw new Error(
                'WEBPAY_RESPONSE_SAVE_FAILED'
            )
        }

        return {
            ok: true,
            url,
            token,
            transactionId:
                transactionAttempt.id,
        }
    } catch (error) {
        const errorMessage =
            error instanceof Error
                ? error.message
                : 'UNKNOWN_WEBPAY_ERROR'

        console.error(
            'Error creando transacción Webpay:',
            error
        )

        await supabaseAdmin
            .from(
                'webpay_transactions'
            )
            .update({
                status:
                    'failed',

                error_message:
                    errorMessage.slice(
                        0,
                        1000
                    ),

                updated_at:
                    new Date()
                        .toISOString(),
            })
            .eq(
                'id',
                transactionAttempt.id
            )

        return failure(
            'Webpay no pudo iniciar el pago. Inténtalo nuevamente.'
        )
    }
}