import {
    NextRequest,
    NextResponse,
} from 'next/server'

import {
    verifySmtpConnection,
} from '@/src/lib/email/smtp'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(
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

    try {
        await verifySmtpConnection()

        return NextResponse.json({
            ok: true,
            message:
                'Conexión SMTP verificada',
        })
    } catch (error) {
        console.error(
            '[smtp] error verificando conexión',
            error
        )

        return NextResponse.json(
            {
                ok: false,
                message:
                    error instanceof Error
                        ? error.message
                        : 'No se pudo verificar SMTP',
            },
            {
                status: 500,
            }
        )
    }
}