import {
    NextRequest,
    NextResponse,
} from 'next/server'

import {
    supabaseAdmin,
} from '@/src/lib/supabase/admin'

import {
    getWebpayTransaction,
} from '@/src/lib/transbank/webpay'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type WebpayCommitResponse = {
    status?: unknown
    buy_order?: unknown
    session_id?: unknown
    amount?: unknown
    response_code?: unknown
    authorization_code?: unknown
    payment_type_code?: unknown
    installments_number?: unknown
    accounting_date?: unknown
    transaction_date?: unknown
    card_detail?: {
        card_number?: unknown
    } | null
}

function getString(
    value: unknown
) {
    return typeof value === 'string'
        ? value.trim()
        : ''
}

function getInteger(
    value: unknown
): number | null {
    const parsed =
        typeof value === 'number'
            ? value
            : typeof value === 'string'
                ? Number(value)
                : Number.NaN

    return Number.isSafeInteger(parsed)
        ? parsed
        : null
}

function serializeJson(
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

function getAppUrl(
    request: NextRequest
) {
    return (
        process.env
            .NEXT_PUBLIC_APP_URL
            ?.trim()
            .replace(/\/+$/, '') ||
        request.nextUrl.origin
    )
}

function redirectResult({
    request,
    slug,
    result,
}: {
    request: NextRequest
    slug?: string | null
    result:
    | 'success'
    | 'failed'
    | 'aborted'
    | 'review'
}) {
    const appUrl =
        getAppUrl(request)

    if (!slug) {
        return NextResponse.redirect(
            `${appUrl}/admin?webpay=${result}`,
            303
        )
    }

    const path =
        result === 'success'
            ? `/admin/b/${slug}/plan`
            : `/admin/b/${slug}/plan/regularizar`

    return NextResponse.redirect(
        `${appUrl}${path}?webpay=${result}`,
        303
    )
}

async function getBusinessSlug(
    businessId: string
) {
    const {
        data,
    } = await supabaseAdmin
        .from('businesses')
        .select('slug')
        .eq('id', businessId)
        .maybeSingle()

    return data?.slug ?? null
}

async function handleAbortedReturn({
    request,
    formData,
}: {
    request: NextRequest
    formData: FormData
}) {
    const buyOrder =
        getString(
            formData.get(
                'TBK_ORDEN_COMPRA'
            )
        )

    const tbkToken =
        getString(
            formData.get(
                'TBK_TOKEN'
            )
        )

    const sessionId =
        getString(
            formData.get(
                'TBK_ID_SESION'
            )
        )

    let query =
        supabaseAdmin
            .from(
                'webpay_transactions'
            )
            .select(`
                id,
                business_id,
                status
            `)

    if (buyOrder) {
        query =
            query.eq(
                'buy_order',
                buyOrder
            )
    } else if (tbkToken) {
        query =
            query.eq(
                'token_ws',
                tbkToken
            )
    } else if (sessionId) {
        query =
            query.eq(
                'session_id',
                sessionId
            )
    } else {
        return redirectResult({
            request,
            result:
                'aborted',
        })
    }

    const {
        data: attempt,
    } = await query.maybeSingle()

    if (!attempt) {
        return redirectResult({
            request,
            result:
                'aborted',
        })
    }

    /*
     * Nunca sobrescribir un pago ya autorizado.
     */
    if (
        attempt.status !==
        'authorized'
    ) {
        await supabaseAdmin
            .from(
                'webpay_transactions'
            )
            .update({
                status:
                    'aborted',

                error_message:
                    'Pago cancelado o abandonado por el usuario',

                updated_at:
                    new Date()
                        .toISOString(),
            })
            .eq(
                'id',
                attempt.id
            )
            .neq(
                'status',
                'authorized'
            )
    }

    const slug =
        await getBusinessSlug(
            attempt.business_id
        )

    return redirectResult({
        request,
        slug,
        result:
            attempt.status ===
                'authorized'
                ? 'success'
                : 'aborted',
    })
}

export async function POST(
    request: NextRequest
) {
    let formData: FormData

    try {
        formData =
            await request.formData()
    } catch {
        return redirectResult({
            request,
            result:
                'failed',
        })
    }

    const tokenWs =
        getString(
            formData.get(
                'token_ws'
            )
        )

    /*
     * Cuando el usuario cancela o abandona,
     * Webpay puede volver con los campos TBK_*,
     * sin token_ws.
     */
    if (!tokenWs) {
        return handleAbortedReturn({
            request,
            formData,
        })
    }

    const {
        data: attempt,
        error: attemptError,
    } = await supabaseAdmin
        .from(
            'webpay_transactions'
        )
        .select(`
            id,
            business_id,
            subscription_id,
            buy_order,
            session_id,
            amount,
            token_ws,
            status,
            payment_id
        `)
        .eq(
            'token_ws',
            tokenWs
        )
        .maybeSingle()

    if (
        attemptError ||
        !attempt
    ) {
        console.error(
            'Intento Webpay no encontrado:',
            attemptError
        )

        return redirectResult({
            request,
            result:
                'failed',
        })
    }

    const slug =
        await getBusinessSlug(
            attempt.business_id
        )

    /*
     * Callback repetido después de un pago
     * ya procesado.
     */
    if (
        attempt.status ===
        'authorized' &&
        attempt.payment_id
    ) {
        return redirectResult({
            request,
            slug,
            result:
                'success',
        })
    }

    try {
        const transaction =
            getWebpayTransaction()

        const rawCommit =
            await transaction.commit(
                tokenWs
            )

        const commit =
            rawCommit as
            WebpayCommitResponse

        const status =
            getString(
                commit.status
            ).toUpperCase()

        const buyOrder =
            getString(
                commit.buy_order
            )

        const sessionId =
            getString(
                commit.session_id
            )

        const amount =
            getInteger(
                commit.amount
            )

        const responseCode =
            getInteger(
                commit.response_code
            )

        const authorizationCode =
            getString(
                commit.authorization_code
            )

        const paymentTypeCode =
            getString(
                commit.payment_type_code
            )

        const installmentsNumber =
            getInteger(
                commit.installments_number
            )

        const accountingDate =
            getString(
                commit.accounting_date
            )

        const transactionDate =
            getString(
                commit.transaction_date
            )

        const cardNumber =
            getString(
                commit.card_detail
                    ?.card_number
            )

        const commitJson =
            serializeJson(
                rawCommit
            )

        const identifiersMatch =
            buyOrder ===
            attempt.buy_order &&
            sessionId ===
            attempt.session_id &&
            amount ===
            attempt.amount

        const paymentApproved =
            status ===
            'AUTHORIZED' &&
            responseCode ===
            0

        /*
         * Transacción rechazada por Webpay.
         */
        if (!paymentApproved) {
            await supabaseAdmin
                .from(
                    'webpay_transactions'
                )
                .update({
                    status:
                        'failed',

                    response_code:
                        responseCode,

                    authorization_code:
                        authorizationCode ||
                        null,

                    payment_type_code:
                        paymentTypeCode ||
                        null,

                    installments_number:
                        installmentsNumber,

                    card_number_masked:
                        cardNumber ||
                        null,

                    accounting_date:
                        accountingDate ||
                        null,

                    transaction_date:
                        transactionDate ||
                        null,

                    commit_response:
                        commitJson,

                    committed_at:
                        new Date()
                            .toISOString(),

                    error_message:
                        `Transacción no autorizada. Estado: ${status || 'desconocido'}`,

                    updated_at:
                        new Date()
                            .toISOString(),
                })
                .eq(
                    'id',
                    attempt.id
                )

            return redirectResult({
                request,
                slug,
                result:
                    'failed',
            })
        }

        /*
         * Webpay autorizó, pero los datos no
         * coinciden con la orden local.
         *
         * Requiere revisión; no debemos activar
         * automáticamente la suscripción.
         */
        if (!identifiersMatch) {
            await supabaseAdmin
                .from(
                    'webpay_transactions'
                )
                .update({
                    status:
                        'review_required',

                    response_code:
                        responseCode,

                    authorization_code:
                        authorizationCode ||
                        null,

                    payment_type_code:
                        paymentTypeCode ||
                        null,

                    commit_response:
                        commitJson,

                    error_message:
                        'Webpay autorizó el pago, pero los datos no coinciden con el intento local',

                    committed_at:
                        new Date()
                            .toISOString(),

                    updated_at:
                        new Date()
                            .toISOString(),
                })
                .eq(
                    'id',
                    attempt.id
                )

            return redirectResult({
                request,
                slug,
                result:
                    'review',
            })
        }

        /*
         * Confirmación y actualización local
         * completamente atómica.
         */
        const {
            data,
            error,
        } = await supabaseAdmin.rpc(
            'finalize_webpay_subscription_payment',
            {
                p_webpay_transaction_id:
                    attempt.id,

                p_token_ws:
                    tokenWs,

                p_commit_status:
                    status,

                p_buy_order:
                    buyOrder,

                p_session_id:
                    sessionId,

                p_amount:
                    amount,

                p_response_code:
                    responseCode,

                p_authorization_code:
                    authorizationCode ||
                    null,

                p_payment_type_code:
                    paymentTypeCode ||
                    null,

                p_installments_number:
                    installmentsNumber,

                p_card_number_masked:
                    cardNumber ||
                    null,

                p_accounting_date:
                    accountingDate ||
                    null,

                p_transaction_date:
                    transactionDate ||
                    null,

                p_commit_response:
                    commitJson,
            }
        )

        if (error) {
            console.error(
                'Error finalizando pago Webpay:',
                error
            )

            await supabaseAdmin
                .from(
                    'webpay_transactions'
                )
                .update({
                    status:
                        'review_required',

                    commit_response:
                        commitJson,

                    error_message:
                        error.message.slice(
                            0,
                            1000
                        ),

                    committed_at:
                        new Date()
                            .toISOString(),

                    updated_at:
                        new Date()
                            .toISOString(),
                })
                .eq(
                    'id',
                    attempt.id
                )
                .neq(
                    'status',
                    'authorized'
                )

            return redirectResult({
                request,
                slug,
                result:
                    'review',
            })
        }

        const result =
            Array.isArray(data)
                ? data[0]
                : data

        if (!result) {
            return redirectResult({
                request,
                slug,
                result:
                    'review',
            })
        }

        return redirectResult({
            request,
            slug,
            result:
                'success',
        })
    } catch (error) {
        console.error(
            'Error ejecutando commit Webpay:',
            error
        )

        /*
         * Una excepción de red no confirma que
         * Transbank haya rechazado el pago.
         * Lo dejamos para revisión.
         */
        await supabaseAdmin
            .from(
                'webpay_transactions'
            )
            .update({
                status:
                    'review_required',

                error_message:
                    (
                        error instanceof Error
                            ? error.message
                            : 'Error desconocido durante commit'
                    ).slice(
                        0,
                        1000
                    ),

                updated_at:
                    new Date()
                        .toISOString(),
            })
            .eq(
                'id',
                attempt.id
            )
            .neq(
                'status',
                'authorized'
            )

        return redirectResult({
            request,
            slug,
            result:
                'review',
        })
    }
}