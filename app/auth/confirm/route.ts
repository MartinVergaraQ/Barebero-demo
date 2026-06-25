import {
    type EmailOtpType,
} from '@supabase/supabase-js'

import {
    NextResponse,
    type NextRequest,
} from 'next/server'

import {
    createClient,
} from '@/src/lib/supabase/server'

function getDestination(
    type: EmailOtpType
) {
    if (type === 'recovery') {
        return '/auth/reset-password'
    }

    return '/auth/set-password'
}

function getErrorCode(
    type: EmailOtpType | null
) {
    if (type === 'recovery') {
        return 'invalid_recovery'
    }

    return 'invalid_invitation'
}

export async function GET(
    request: NextRequest
) {
    const tokenHash =
        request.nextUrl.searchParams.get(
            'token_hash'
        )

    const type =
        request.nextUrl.searchParams.get(
            'type'
        ) as EmailOtpType | null

    const supportedType =
        type === 'invite' ||
        type === 'recovery'

    if (
        tokenHash &&
        type &&
        supportedType
    ) {
        const supabase =
            await createClient()

        const {
            error,
        } = await supabase.auth.verifyOtp({
            type,
            token_hash: tokenHash,
        })

        if (!error) {
            return NextResponse.redirect(
                new URL(
                    getDestination(type),
                    request.url
                )
            )
        }

        console.error(
            `Error verificando enlace ${type}:`,
            error
        )
    }

    const errorUrl =
        new URL(
            '/admin/login',
            request.url
        )

    errorUrl.searchParams.set(
        'error',
        getErrorCode(type)
    )

    return NextResponse.redirect(
        errorUrl
    )
}