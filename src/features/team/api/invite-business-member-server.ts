'use server'

import { revalidatePath } from 'next/cache'

import { createClient } from '@/src/lib/supabase/server'
import { supabaseAdmin } from '@/src/lib/supabase/admin'

export type BusinessInvitationRole =
    | 'admin'
    | 'barber'

export type InviteBusinessMemberInput = {
    email: string
    fullName: string
    role: BusinessInvitationRole

    /*
     * Obligatorio cuando role = barber.
     * Debe corresponder a un barbero existente
     * del mismo negocio y sin cuenta vinculada.
     */
    barberId?: string | null
}

type InviteBusinessMemberSuccess = {
    ok: true
    message: string
    invitationId: string
    invitedUserId: string
    email: string
    role: BusinessInvitationRole
    barberId: string | null
}

type InviteBusinessMemberFailure = {
    ok: false
    message: string
}

export type InviteBusinessMemberResult =
    | InviteBusinessMemberSuccess
    | InviteBusinessMemberFailure

type BarberRow = {
    id: string
    business_id: string
    name: string
    profile_id: string | null
    is_active: boolean
}

type InvitationRow = {
    id: string
    expires_at: string
}

function failure(
    message: string
): InviteBusinessMemberFailure {
    return {
        ok: false,
        message,
    }
}

function normalizeWhitespace(
    value: unknown
): string {
    if (typeof value !== 'string') {
        return ''
    }

    return value
        .trim()
        .replace(/\s+/g, ' ')
}

function normalizeEmail(
    value: unknown
): string {
    if (typeof value !== 'string') {
        return ''
    }

    return value
        .trim()
        .toLowerCase()
}

function normalizeUuid(
    value: unknown
): string {
    if (typeof value !== 'string') {
        return ''
    }

    return value.trim()
}

function isValidEmail(
    value: string
): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        value
    )
}

function isInvitationRole(
    value: unknown
): value is BusinessInvitationRole {
    return (
        value === 'admin' ||
        value === 'barber'
    )
}

function mapInviteError(
    message?: string | null
): string {
    const normalized =
        message?.toLowerCase() ?? ''

    if (
        normalized.includes(
            'rate limit'
        ) ||
        normalized.includes(
            'too many requests'
        )
    ) {
        return 'Se alcanzó temporalmente el límite de invitaciones. Intenta nuevamente en unos minutos.'
    }

    if (
        normalized.includes(
            'already'
        ) ||
        normalized.includes(
            'registered'
        ) ||
        normalized.includes(
            'exists'
        )
    ) {
        return 'Ese correo ya tiene una cuenta registrada. En esta primera versión debes utilizar un correo que todavía no pertenezca a otro usuario.'
    }

    if (
        normalized.includes(
            'smtp'
        ) ||
        normalized.includes(
            'email'
        )
    ) {
        return 'No se pudo enviar el correo de invitación. Revisa la configuración SMTP.'
    }

    return 'No se pudo enviar la invitación'
}

async function cleanupFailedInvitation({
    invitationId,
    invitedUserId,
}: {
    invitationId: string
    invitedUserId?: string | null
}) {
    if (invitedUserId) {
        const {
            error: deleteUserError,
        } =
            await supabaseAdmin.auth.admin
                .deleteUser(
                    invitedUserId
                )

        if (deleteUserError) {
            console.error(
                'Error eliminando usuario Auth durante rollback:',
                deleteUserError
            )
        }
    }

    const {
        error: deleteInvitationError,
    } = await supabaseAdmin
        .from(
            'business_invitations'
        )
        .delete()
        .eq(
            'id',
            invitationId
        )

    if (deleteInvitationError) {
        console.error(
            'Error eliminando invitación durante rollback:',
            deleteInvitationError
        )
    }
}

export async function inviteBusinessMemberServer(
    input: InviteBusinessMemberInput
): Promise<InviteBusinessMemberResult> {
    /*
     * 1. Validar estructura básica.
     */
    if (
        !input ||
        typeof input !== 'object'
    ) {
        return failure(
            'Los datos de la invitación no son válidos'
        )
    }

    const email =
        normalizeEmail(
            input.email
        )

    let fullName =
        normalizeWhitespace(
            input.fullName
        )

    const role =
        input.role

    const barberId =
        normalizeUuid(
            input.barberId
        )

    if (
        !isValidEmail(email) ||
        email.length > 254
    ) {
        return failure(
            'Ingresa un correo electrónico válido'
        )
    }

    if (!isInvitationRole(role)) {
        return failure(
            'El rol seleccionado no es válido'
        )
    }

    if (
        fullName &&
        (
            fullName.length < 2 ||
            fullName.length > 120
        )
    ) {
        return failure(
            'El nombre debe tener entre 2 y 120 caracteres'
        )
    }

    if (
        role === 'barber' &&
        !barberId
    ) {
        return failure(
            'Selecciona el profesional que recibirá acceso'
        )
    }

    if (
        role === 'admin' &&
        barberId
    ) {
        return failure(
            'Una invitación de administrador no debe vincular un barbero'
        )
    }

    /*
     * 2. Validar la sesión mediante
     * el cliente SSR del usuario.
     */
    const supabase =
        await createClient()

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
            'No autorizado'
        )
    }

    /*
     * 3. Solamente el owner puede
     * administrar invitaciones.
     */
    const {
        data: profile,
        error: profileError,
    } = await supabase
        .from('profiles')
        .select(
            'id, business_id, role, email'
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
            'No se pudo cargar el perfil del usuario'
        )
    }

    if (
        profile.role !== 'owner'
    ) {
        return failure(
            'Solo el propietario puede invitar integrantes al equipo'
        )
    }

    /*
     * No permitimos que el owner se invite
     * nuevamente a sí mismo.
     */
    if (
        normalizeEmail(
            profile.email
        ) === email
    ) {
        return failure(
            'Tu cuenta ya pertenece a este negocio'
        )
    }

    /*
     * 4. Validar negocio y suscripción.
     */
    const {
        data: business,
        error: businessError,
    } = await supabase
        .from('businesses')
        .select(`
id,
    name,
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
        return failure(
            'Negocio no encontrado'
        )
    }

    if (
        business.subscription_status !==
        'trialing' &&
        business.subscription_status !==
        'active'
    ) {
        return failure(
            business.subscription_status ===
                'past_due'
                ? 'Tu negocio está en modo solo lectura porque existe un pago pendiente.'
                : business.subscription_status ===
                    'cancelled'
                    ? 'La suscripción está cancelada. Reactívala para invitar integrantes.'
                    : 'La suscripción actual no permite administrar el equipo.'
        )
    }

    /*
     * 5. Verificar que el correo no tenga
     * ya un profile dentro del sistema.
     *
     * El modelo actual admite un negocio
     * por cuenta.
     */
    const {
        data: existingProfile,
        error: existingProfileError,
    } = await supabaseAdmin
        .from('profiles')
        .select(
            'id, business_id, role'
        )
        .ilike(
            'email',
            email
        )
        .maybeSingle()

    if (existingProfileError) {
        console.error(
            'Error comprobando perfil existente:',
            existingProfileError
        )

        return failure(
            'No se pudo comprobar el correo invitado'
        )
    }

    if (existingProfile) {
        return failure(
            existingProfile.business_id ===
                business.id
                ? 'Ese correo ya pertenece al equipo de este negocio'
                : 'Ese correo ya está asociado a otro negocio'
        )
    }

    /*
     * 6. Para role barber, validar el
     * profesional que será vinculado.
     */
    let barber:
        | BarberRow
        | null = null

    if (role === 'barber') {
        const {
            data,
            error,
        } = await supabaseAdmin
            .from('barbers')
            .select(`
id,
    business_id,
    name,
    profile_id,
    is_active
        `)
            .eq(
                'id',
                barberId
            )
            .eq(
                'business_id',
                business.id
            )
            .maybeSingle()

        if (error) {
            console.error(
                'Error comprobando barbero invitado:',
                error
            )

            return failure(
                'No se pudo comprobar el profesional seleccionado'
            )
        }

        if (!data) {
            return failure(
                'El profesional no existe o no pertenece a tu negocio'
            )
        }

        barber =
            data as BarberRow

        if (!barber.is_active) {
            return failure(
                'El profesional debe estar activo antes de recibir acceso'
            )
        }

        if (barber.profile_id) {
            return failure(
                'El profesional ya está vinculado a una cuenta'
            )
        }

        /*
         * Para un barbero utilizamos el nombre
         * operativo cuando el formulario no
         * envía uno.
         */
        if (!fullName) {
            fullName =
                barber.name
        }
    }

    if (
        role === 'admin' &&
        !fullName
    ) {
        return failure(
            'Ingresa el nombre del administrador'
        )
    }

    /*
     * 7. Comprobar invitación pendiente
     * para entregar mensajes claros antes
     * de que actúe el índice único.
     */
    const {
        data: pendingByEmail,
        error: pendingByEmailError,
    } = await supabaseAdmin
        .from(
            'business_invitations'
        )
        .select(
            'id, role, barber_id'
        )
        .eq(
            'business_id',
            business.id
        )
        .eq(
            'status',
            'pending'
        )
        .ilike(
            'email',
            email
        )
        .maybeSingle()

    if (pendingByEmailError) {
        console.error(
            'Error comprobando invitación pendiente:',
            pendingByEmailError
        )

        return failure(
            'No se pudo comprobar si existe una invitación pendiente'
        )
    }

    if (pendingByEmail) {
        return failure(
            'Ese correo ya tiene una invitación pendiente'
        )
    }

    if (
        role === 'barber' &&
        barber
    ) {
        const {
            data: pendingByBarber,
            error: pendingByBarberError,
        } = await supabaseAdmin
            .from(
                'business_invitations'
            )
            .select('id')
            .eq(
                'barber_id',
                barber.id
            )
            .eq(
                'status',
                'pending'
            )
            .maybeSingle()

        if (pendingByBarberError) {
            console.error(
                'Error comprobando invitación del barbero:',
                pendingByBarberError
            )

            return failure(
                'No se pudo comprobar el estado de acceso del profesional'
            )
        }

        if (pendingByBarber) {
            return failure(
                'El profesional ya tiene una invitación pendiente'
            )
        }
    }

    /*
     * 8. Validar URL de la aplicación.
     */
    const appUrl =
        process.env
            .NEXT_PUBLIC_APP_URL
            ?.trim()
            .replace(/\/+$/, '')

    if (!appUrl) {
        console.error(
            'Falta NEXT_PUBLIC_APP_URL'
        )

        return failure(
            'La URL de la aplicación no está configurada'
        )
    }

    let redirectUrl: string

    try {
        redirectUrl =
            new URL(
                '/auth/confirm',
                `${appUrl}/`
            ).toString()
    } catch (error) {
        console.error(
            'NEXT_PUBLIC_APP_URL no es válida:',
            error
        )

        return failure(
            'La URL de la aplicación no es válida'
        )
    }

    /*
     * 9. Crear primero la invitación con
     * un ID conocido. Ese ID se incorpora
     * después a los metadatos de Auth.
     */
    const invitationId =
        crypto.randomUUID()

    const now =
        new Date()

    const expiresAt =
        new Date(
            now.getTime() +
            7 *
            24 *
            60 *
            60 *
            1000
        )

    const {
        data: invitation,
        error: invitationError,
    } = await supabaseAdmin
        .from(
            'business_invitations'
        )
        .insert({
            id:
                invitationId,
            business_id:
                business.id,
            barber_id:
                role === 'barber'
                    ? barber!.id
                    : null,
            email,
            full_name:
                fullName,
            role,
            status:
                'pending',
            invited_by:
                profile.id,
            expires_at:
                expiresAt.toISOString(),
            last_sent_at:
                now.toISOString(),
            send_count:
                1,
        })
        .select(
            'id, expires_at'
        )
        .single()

    if (
        invitationError ||
        !invitation
    ) {
        console.error(
            'Error creando invitación:',
            invitationError
        )

        if (
            invitationError?.code ===
            '23505'
        ) {
            return failure(
                'Ya existe una invitación pendiente para ese correo o profesional'
            )
        }

        return failure(
            'No se pudo registrar la invitación'
        )
    }

    const savedInvitation =
        invitation as InvitationRow

    /*
     * 10. Crear usuario Auth y enviar correo.
     *
     * business_invitation_id permitirá
     * aceptar la invitación después de
     * crear la contraseña.
     */
    const {
        data: inviteData,
        error: inviteError,
    } =
        await supabaseAdmin.auth.admin
            .inviteUserByEmail(
                email,
                {
                    redirectTo:
                        redirectUrl,

                    data: {
                        full_name:
                            fullName,
                        intended_role:
                            role,
                        business_invitation_id:
                            savedInvitation.id,
                        business_id:
                            business.id,
                        business_slug:
                            business.slug,
                        barber_id:
                            role ===
                                'barber'
                                ? barber!.id
                                : null,
                    },
                }
            )

    if (
        inviteError ||
        !inviteData.user?.id
    ) {
        console.error(
            'Error enviando invitación de equipo:',
            inviteError
        )

        await cleanupFailedInvitation({
            invitationId:
                savedInvitation.id,
        })

        return failure(
            mapInviteError(
                inviteError?.message
            )
        )
    }

    const invitedUserId =
        inviteData.user.id

    /*
     * 11. Vincular la invitación con
     * el usuario Auth recién creado.
     */
    const {
        error: updateInvitationError,
    } = await supabaseAdmin
        .from(
            'business_invitations'
        )
        .update({
            invited_user_id:
                invitedUserId,
        })
        .eq(
            'id',
            savedInvitation.id
        )
        .eq(
            'status',
            'pending'
        )

    if (updateInvitationError) {
        console.error(
            'Error vinculando usuario Auth con invitación:',
            updateInvitationError
        )

        /*
         * Conservamos consistencia total:
         * eliminamos Auth y la invitación.
         *
         * El correo ya pudo haber sido enviado,
         * pero el usuario eliminado no podrá
         * completar ese enlace.
         */
        await cleanupFailedInvitation({
            invitationId:
                savedInvitation.id,
            invitedUserId,
        })

        return failure(
            'No se pudo completar el registro de la invitación'
        )
    }

    /*
     * 12. Actualizar la futura pantalla
     * de Equipo.
     */
    revalidatePath(
        `/admin/b/${business.slug}/equipo`
    )

    return {
        ok: true,
        message:
            role === 'barber'
                ? `Invitación enviada a ${fullName}`
                : `Administrador invitado correctamente`,
        invitationId:
            savedInvitation.id,
        invitedUserId,
        email,
        role,
        barberId:
            role === 'barber'
                ? barber!.id
                : null,
    }
}

