'use server'

import { revalidatePath } from 'next/cache'

import { getPlatformAdmin } from '@/src/features/auth/api/get-platform-admin'
import { supabaseAdmin } from '@/src/lib/supabase/admin'
import {
    DEFAULT_TRIAL_DAYS,
    isAllowedPlanSlug,
    type AllowedPlanSlug,
} from '@/src/features/business/utils/plan-config'

const ALLOWED_TRIAL_DAYS = [
    3,
    5,
    7,
] as const

type AllowedTrialDays =
    (typeof ALLOWED_TRIAL_DAYS)[number]

export type CreateBusinessInput = {
    businessName: string
    businessSlug: string
    ownerFullName: string
    ownerEmail: string
    planSlug: AllowedPlanSlug
    trialDays?: AllowedTrialDays
}

type CreateBusinessSuccess = {
    ok: true
    message: string
    businessId: string
    businessSlug: string
    ownerUserId: string
}

type CreateBusinessFailure = {
    ok: false
    message: string
}

export type CreateBusinessResult =
    | CreateBusinessSuccess
    | CreateBusinessFailure

type CreatedBusinessRow = {
    business_id: string
    business_slug: string
    owner_profile_id: string
    trial_ends_at: string
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

function normalizeSlug(
    value: unknown
): string {
    if (typeof value !== 'string') {
        return ''
    }

    return value
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(
            /[\u0300-\u036f]/g,
            ''
        )
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
}

function isValidEmail(
    value: string
): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        value
    )
}

function isAllowedTrialDays(
    value: unknown
): value is AllowedTrialDays {
    return (
        typeof value === 'number' &&
        ALLOWED_TRIAL_DAYS.includes(
            value as AllowedTrialDays
        )
    )
}

function mapInviteError(
    message?: string | null
): string {
    const normalizedMessage =
        message?.toLowerCase() ?? ''

    if (
        normalizedMessage.includes(
            'already'
        ) ||
        normalizedMessage.includes(
            'registered'
        ) ||
        normalizedMessage.includes(
            'exists'
        )
    ) {
        return 'Ya existe una cuenta registrada con el correo del propietario'
    }

    if (
        normalizedMessage.includes(
            'rate limit'
        )
    ) {
        return 'Se alcanzó temporalmente el límite de invitaciones. Intenta nuevamente más tarde.'
    }

    return 'No se pudo enviar la invitación al propietario'
}

function mapDatabaseError(
    message?: string | null,
    code?: string | null
): string {
    const normalizedMessage =
        message?.toLowerCase() ?? ''

    if (
        code === '23505' ||
        normalizedMessage.includes(
            'slug'
        )
    ) {
        return 'Ya existe un negocio con ese slug'
    }

    if (
        normalizedMessage.includes(
            'correo ya está asociado'
        ) ||
        normalizedMessage.includes(
            'usuario ya tiene un perfil'
        )
    ) {
        return 'El propietario ya está asociado a otro negocio'
    }

    if (
        normalizedMessage.includes(
            'plan seleccionado'
        )
    ) {
        return 'El plan seleccionado no es válido'
    }

    if (
        normalizedMessage.includes(
            'administrador de plataforma'
        )
    ) {
        return 'No tienes permisos para crear negocios'
    }

    return 'No se pudo crear el negocio'
}

export async function createBusinessServer(
    input: CreateBusinessInput
): Promise<CreateBusinessResult> {
    /*
     * 1. Verificar permisos.
     */
    const platformAdmin =
        await getPlatformAdmin()

    if (!platformAdmin) {
        return {
            ok: false,
            message:
                'No tienes permisos para crear negocios',
        }
    }

    /*
     * 2. Normalizar datos.
     */
    const businessName =
        normalizeWhitespace(
            input.businessName
        )

    const businessSlug =
        normalizeSlug(
            input.businessSlug
        )

    const ownerFullName =
        normalizeWhitespace(
            input.ownerFullName
        )

    const ownerEmail =
        normalizeEmail(
            input.ownerEmail
        )

    const planSlug =
        input.planSlug

    const trialDays =
        input.trialDays ??
        DEFAULT_TRIAL_DAYS

    /*
     * Esta variable debe existir antes de utilizarla
     * en inviteUserByEmail.
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

        return {
            ok: false,
            message:
                'La URL de la aplicación no está configurada',
        }
    }

    let inviteRedirectUrl: string

    try {
        inviteRedirectUrl =
            new URL(
                '/auth/confirm',
                `${appUrl}/`
            ).toString()
    } catch (error) {
        console.error(
            'NEXT_PUBLIC_APP_URL no es válida:',
            error
        )

        return {
            ok: false,
            message:
                'La URL de la aplicación no es válida',
        }
    }

    /*
     * 3. Validar formulario antes de crear
     * usuarios o modificar la base de datos.
     */
    if (
        businessName.length < 2 ||
        businessName.length > 120
    ) {
        return {
            ok: false,
            message:
                'El nombre del negocio debe tener entre 2 y 120 caracteres',
        }
    }

    if (
        businessSlug.length < 2 ||
        businessSlug.length > 100
    ) {
        return {
            ok: false,
            message:
                'El slug debe tener entre 2 y 100 caracteres',
        }
    }

    if (
        !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(
            businessSlug
        )
    ) {
        return {
            ok: false,
            message:
                'El slug solo puede contener letras, números y guiones',
        }
    }

    if (
        ownerFullName.length < 2 ||
        ownerFullName.length > 120
    ) {
        return {
            ok: false,
            message:
                'El nombre del propietario debe tener entre 2 y 120 caracteres',
        }
    }

    if (
        !isValidEmail(ownerEmail) ||
        ownerEmail.length > 254
    ) {
        return {
            ok: false,
            message:
                'Ingresa un correo válido para el propietario',
        }
    }

    if (!isAllowedPlanSlug(planSlug)) {
        return {
            ok: false,
            message:
                'El plan seleccionado no es válido',
        }
    }

    if (!isAllowedTrialDays(trialDays)) {
        return {
            ok: false,
            message:
                'Los días de prueba permitidos son 3, 5 o 7',
        }
    }

    /*
     * 4. Comprobar duplicados antes de enviar
     * la invitación.
     */
    const {
        data: existingBusiness,
        error: existingBusinessError,
    } = await supabaseAdmin
        .from('businesses')
        .select('id')
        .eq('slug', businessSlug)
        .maybeSingle()

    if (existingBusinessError) {
        console.error(
            'Error comprobando slug del negocio:',
            existingBusinessError
        )

        return {
            ok: false,
            message:
                'No se pudo validar el negocio',
        }
    }

    if (existingBusiness) {
        return {
            ok: false,
            message:
                'Ya existe un negocio con ese slug',
        }
    }

    const {
        data: existingProfile,
        error: existingProfileError,
    } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .ilike('email', ownerEmail)
        .maybeSingle()

    if (existingProfileError) {
        console.error(
            'Error comprobando correo del propietario:',
            existingProfileError
        )

        return {
            ok: false,
            message:
                'No se pudo validar el correo del propietario',
        }
    }

    if (existingProfile) {
        return {
            ok: false,
            message:
                'El correo ya está asociado a otro negocio',
        }
    }

    /*
     * 5. Crear usuario Auth y enviar invitación.
     */
    const {
        data: inviteData,
        error: inviteError,
    } =
        await supabaseAdmin.auth.admin
            .inviteUserByEmail(
                ownerEmail,
                {
                    redirectTo:
                        inviteRedirectUrl,

                    data: {
                        full_name:
                            ownerFullName,
                        intended_role:
                            'owner',
                    },
                }
            )

    if (
        inviteError ||
        !inviteData.user?.id
    ) {
        console.error(
            'Error invitando al propietario:',
            inviteError
        )

        return {
            ok: false,
            message: mapInviteError(
                inviteError?.message
            ),
        }
    }

    const ownerUserId =
        inviteData.user.id

    /*
     * 6. Crear negocio, suscripción y perfil owner
     * dentro de la RPC transaccional.
     */
    const {
        data: createdRows,
        error: rpcError,
    } = await supabaseAdmin.rpc(
        'create_business_with_owner',
        {
            p_platform_admin_id:
                platformAdmin.id,
            p_owner_user_id:
                ownerUserId,
            p_owner_full_name:
                ownerFullName,
            p_owner_email:
                ownerEmail,
            p_business_name:
                businessName,
            p_business_slug:
                businessSlug,
            p_plan_slug:
                planSlug,
            p_trial_days:
                trialDays,
        }
    )

    const createdBusiness =
        (
            createdRows as
            | CreatedBusinessRow[]
            | null
        )?.[0]

    /*
     * 7. Si falla PostgreSQL, borrar el usuario
     * Auth recién creado.
     */
    if (
        rpcError ||
        !createdBusiness
    ) {
        console.error(
            'Error creando negocio y perfil owner:',
            rpcError
        )

        const {
            error: rollbackError,
        } =
            await supabaseAdmin.auth.admin
                .deleteUser(
                    ownerUserId
                )

        if (rollbackError) {
            console.error(
                'Error eliminando usuario Auth durante rollback:',
                rollbackError
            )
        }

        return {
            ok: false,
            message: mapDatabaseError(
                rpcError?.message,
                rpcError?.code
            ),
        }
    }

    revalidatePath(
        '/superadmin/businesses'
    )

    return {
        ok: true,
        message:
            'Negocio creado e invitación enviada correctamente',
        businessId:
            createdBusiness.business_id,
        businessSlug:
            createdBusiness.business_slug,
        ownerUserId,
    }
}



