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

function getSafeNextPath(
    value: string | null
) {
    if (
        !value ||
        !value.startsWith('/') ||
        value.startsWith('//')
    ) {
        return '/auth/set-password'
    }

    return value
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

    const nextPath =
        getSafeNextPath(
            request.nextUrl.searchParams.get(
                'next'
            )
        )

    if (
        tokenHash &&
        type === 'invite'
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
                    nextPath,
                    request.url
                )
            )
        }

        console.error(
            'Error verificando invitación:',
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
        'invalid_invitation'
    )

    return NextResponse.redirect(
        errorUrl
    )
}

