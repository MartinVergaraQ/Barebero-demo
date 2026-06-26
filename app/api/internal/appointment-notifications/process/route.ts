import {
    NextRequest,
    NextResponse,
} from 'next/server'

import {
    processAppointmentNotificationJobs,
} from '@/src/features/booking/api/process-appointment-notification-jobs'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function handleRequest(
    request: NextRequest
) {
    const expectedSecret =
        process.env
            .CRON_SECRET
            ?.trim()

    const authorization =
        request.headers.get(
            'authorization'
        )

    if (
        !expectedSecret ||
        authorization !==
        `Bearer ${expectedSecret}`
    ) {
        return NextResponse.json(
            {
                ok: false,
                message:
                    'No autorizado',
            },
            {
                status: 401,
            }
        )
    }

    const requestedLimit =
        Number(
            request.nextUrl
                .searchParams
                .get('limit') ??
            '10'
        )

    const limit =
        Number.isInteger(
            requestedLimit
        )
            ? Math.min(
                Math.max(
                    requestedLimit,
                    1
                ),
                20
            )
            : 10

    try {
        const result =
            await processAppointmentNotificationJobs(
                limit
            )

        return NextResponse.json({
            ok: true,
            ...result,
        })
    } catch (error) {
        console.error(
            '[notifications] error general del procesador',
            error
        )

        return NextResponse.json(
            {
                ok: false,
                message:
                    error instanceof Error
                        ? error.message
                        : 'No se pudieron procesar las notificaciones',
            },
            {
                status: 500,
            }
        )
    }
}

export const POST = handleRequest
export const GET = handleRequest