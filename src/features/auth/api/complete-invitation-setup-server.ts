'use server'

import { createClient } from '@/src/lib/supabase/server'

type CompleteInvitationSetupSuccess = {
    ok: true
    message: string
    destination: string
    teamInvitationAccepted: boolean
}

type CompleteInvitationSetupFailure = {
    ok: false
    message: string
}

export type CompleteInvitationSetupResult =
    | CompleteInvitationSetupSuccess
    | CompleteInvitationSetupFailure

function failure(
    message: string
): CompleteInvitationSetupFailure {
    return {
        ok: false,
        message,
    }
}

function normalizePassword(
    value: unknown
): string {
    if (typeof value !== 'string') {
        return ''
    }

    return value
}

function isValidPassword(
    password: string
): boolean {
    return (
        password.length >= 8 &&
        password.length <= 72 &&
        /[a-z]/.test(password) &&
        /[A-Z]/.test(password) &&
        /[0-9]/.test(password)
    )
}

function getInvitationId(
    metadata: Record<
        string,
        unknown
    > | undefined
): string | null {
    const value =
        metadata
            ?.business_invitation_id

    if (
        typeof value !== 'string'
    ) {
        return null
    }

    const invitationId =
        value.trim()

    return invitationId || null
}

function mapInvitationError(
    message: string | undefined
): string {
    const normalized =
        message
            ?.toLowerCase() ??
        ''

    if (
        normalized.includes(
            'venció'
        ) ||
        normalized.includes(
            'expired'
        )
    ) {
        return 'La invitación venció. Solicita al propietario que envíe una nueva.'
    }

    if (
        normalized.includes(
            'otro correo'
        )
    ) {
        return 'Esta invitación pertenece a otro correo electrónico.'
    }

    if (
        normalized.includes(
            'otro negocio'
        )
    ) {
        return 'Esta cuenta ya pertenece a otro negocio.'
    }

    if (
        normalized.includes(
            'otro profesional'
        ) ||
        normalized.includes(
            'otra cuenta'
        )
    ) {
        return 'El profesional ya está vinculado a otra cuenta.'
    }

    if (
        normalized.includes(
            'ya fue utilizada'
        ) ||
        normalized.includes(
            'ya no está disponible'
        )
    ) {
        return 'La invitación ya no está disponible.'
    }

    return 'La contraseña se guardó, pero no se pudo activar el acceso al negocio. Vuelve a intentarlo.'
}

export async function completeInvitationSetupServer(
    passwordInput: string
): Promise<CompleteInvitationSetupResult> {
    const password =
        normalizePassword(
            passwordInput
        )

    if (!isValidPassword(password)) {
        return failure(
            'La contraseña debe tener entre 8 y 72 caracteres e incluir una mayúscula, una minúscula y un número.'
        )
    }

    const supabase =
        await createClient()

    /*
     * 1. Leer al usuario desde la sesión real.
     * No confiamos en información enviada
     * desde el navegador.
     */
    const {
        data: {
            user,
        },
        error: userError,
    } =
        await supabase.auth
            .getUser()

    if (
        userError ||
        !user
    ) {
        return failure(
            'La sesión de invitación venció. Abre nuevamente el enlace recibido por correo.'
        )
    }

    /*
     * 2. Guardar contraseña.
     *
     * Esto se hace primero porque, si la RPC
     * falla, el usuario puede volver a intentar
     * la aceptación sin perder su contraseña.
     */
    const {
        error: passwordError,
    } =
        await supabase.auth
            .updateUser({
                password,
            })

    if (passwordError) {
        console.error(
            'Error creando contraseña:',
            passwordError
        )

        return failure(
            'No se pudo guardar la contraseña. La invitación puede haber vencido.'
        )
    }

    /*
     * 3. Las invitaciones antiguas de owner
     * no utilizan business_invitations.
     *
     * En ese caso conservamos exactamente
     * el comportamiento que ya funcionaba.
     */
    const invitationId =
        getInvitationId(
            user.user_metadata
        )

    if (!invitationId) {
        return {
            ok: true,
            message:
                'Contraseña creada correctamente',
            destination:
                '/admin',
            teamInvitationAccepted:
                false,
        }
    }

    /*
     * 4. Para invitaciones de equipo,
     * aceptar transaccionalmente:
     *
     * - creación del profile;
     * - vinculación con barber;
     * - actualización de la invitación.
     */
    const {
        error: invitationError,
    } = await supabase.rpc(
        'accept_business_invitation',
        {
            p_invitation_id:
                invitationId,
        }
    )

    if (invitationError) {
        console.error(
            'Error aceptando invitación de equipo:',
            invitationError
        )

        return failure(
            mapInvitationError(
                invitationError.message
            )
        )
    }

    /*
     * /admin ya posee la lógica centralizada
     * que envía a cada rol a su destino:
     *
     * owner/admin → negocio
     * barber      → agenda propia
     * superadmin  → plataforma
     */
    return {
        ok: true,
        message:
            'Tu cuenta fue activada correctamente',
        destination:
            '/admin',
        teamInvitationAccepted:
            true,
    }
}

