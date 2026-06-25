'use server'

import { revalidatePath } from 'next/cache'

import { createClient } from '@/src/lib/supabase/server'
import { supabaseAdmin } from '@/src/lib/supabase/admin'

type CancelInvitationResult =
    | {
        ok: true
        message: string
    }
    | {
        ok: false
        message: string
    }

function failure(
    message: string
): CancelInvitationResult {
    return {
        ok: false,
        message,
    }
}

export async function cancelBusinessInvitationServer(
    invitationIdInput: string
): Promise<CancelInvitationResult> {
    const invitationId =
        typeof invitationIdInput === 'string'
            ? invitationIdInput.trim()
            : ''

    if (!invitationId) {
        return failure(
            'La invitación no es válida'
        )
    }

    const supabase =
        await createClient()

    /*
     * 1. Validar sesión.
     */
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
            'No autorizado'
        )
    }

    /*
     * 2. Solo el owner puede cancelar
     * invitaciones de su negocio.
     */
    const {
        data: profile,
        error: profileError,
    } = await supabase
        .from('profiles')
        .select(
            'id, business_id, role'
        )
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
            'No se pudo cargar tu perfil'
        )
    }

    if (
        profile.role !== 'owner'
    ) {
        return failure(
            'Solo el propietario puede cancelar invitaciones'
        )
    }

    /*
 * 3. Validar negocio y estado
 * de la suscripción.
 */
    const {
        data: business,
        error: businessError,
    } = await supabaseAdmin
        .from('businesses')
        .select(`
        slug,
        subscription_status
    `)
        .eq(
            'id',
            profile.business_id
        )
        .maybeSingle()

    if (
        businessError ||
        !business
    ) {
        console.error(
            'Error cargando negocio:',
            businessError
        )

        return failure(
            'No se pudo cargar el negocio'
        )
    }

    if (
        business.subscription_status !== 'trialing' &&
        business.subscription_status !== 'active'
    ) {
        return failure(
            business.subscription_status === 'past_due'
                ? 'Tu negocio está en modo solo lectura porque existe un pago pendiente.'
                : business.subscription_status === 'cancelled'
                    ? 'La suscripción está cancelada. Reactívala para administrar invitaciones.'
                    : 'La suscripción actual no permite administrar el equipo.'
        )
    }

    /*
     * 3. Obtener la invitación aislada
     * dentro del negocio del owner.
     */
    const {
        data: invitation,
        error: invitationError,
    } = await supabaseAdmin
        .from(
            'business_invitations'
        )
        .select(`
id,
    business_id,
    status,
    invited_user_id
        `)
        .eq(
            'id',
            invitationId
        )
        .eq(
            'business_id',
            profile.business_id
        )
        .maybeSingle()

    if (invitationError) {
        console.error(
            'Error cargando invitación:',
            invitationError
        )

        return failure(
            'No se pudo cargar la invitación'
        )
    }

    if (!invitation) {
        return failure(
            'La invitación no existe'
        )
    }

    if (
        invitation.status !==
        'pending'
    ) {
        return failure(
            'La invitación ya no está pendiente'
        )
    }

    /*
     * 4. Marcar primero como cancelada.
     *
     * Aunque falle la eliminación del usuario Auth,
     * la RPC impedirá aceptar esta invitación.
     */
    const {
        error: cancelError,
    } = await supabaseAdmin
        .from(
            'business_invitations'
        )
        .update({
            status:
                'cancelled',
            cancelled_at:
                new Date()
                    .toISOString(),
        })
        .eq(
            'id',
            invitation.id
        )
        .eq(
            'status',
            'pending'
        )

    if (cancelError) {
        console.error(
            'Error cancelando invitación:',
            cancelError
        )

        return failure(
            'No se pudo cancelar la invitación'
        )
    }

    /*
     * 5. Si Supabase Auth había creado
     * un usuario todavía sin profile,
     * lo eliminamos para invalidar también
     * el enlace recibido por correo.
     */
    if (
        invitation.invited_user_id
    ) {
        const {
            data: existingProfile,
            error: existingProfileError,
        } = await supabaseAdmin
            .from('profiles')
            .select('id')
            .eq(
                'id',
                invitation
                    .invited_user_id
            )
            .maybeSingle()

        if (existingProfileError) {
            console.error(
                'Error comprobando profile antes de cancelar:',
                existingProfileError
            )
        }

        if (!existingProfile) {
            const {
                error: deleteUserError,
            } =
                await supabaseAdmin
                    .auth
                    .admin
                    .deleteUser(
                        invitation
                            .invited_user_id
                    )

            if (deleteUserError) {
                /*
                 * La invitación ya quedó cancelada.
                 * Este error no revierte la operación.
                 */
                console.error(
                    'No se pudo eliminar el usuario Auth cancelado:',
                    deleteUserError
                )
            }
        }
    }


    if (business?.slug) {
        revalidatePath(
            `/admin/b/${business.slug}/equipo`
        )
    }

    return {
        ok: true,
        message:
            'Invitación cancelada correctamente',
    }
}

