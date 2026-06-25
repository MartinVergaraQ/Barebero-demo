import Link from 'next/link'
import {
    redirect,
} from 'next/navigation'
import {
    ArrowLeft,
    ShieldCheck,
    UsersRound,
} from 'lucide-react'

import {
    createClient,
} from '@/src/lib/supabase/server'

import {
    getBusinessBySlug,
} from '@/src/features/business/api/get-business-by-slug'

import {
    AdminTeamManager,
} from '@/src/features/team/components/admin-team-manager'

type AdminTeamPageProps = {
    params: Promise<{
        slug: string
    }>
}

export default async function AdminTeamPage({
    params,
}: AdminTeamPageProps) {
    const {
        slug,
    } = await params

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
        redirect(
            '/admin/login'
        )
    }

    /*
     * 2. Cargar perfil.
     */
    const {
        data: profile,
        error: profileError,
    } = await supabase
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
        redirect('/admin')
    }

    /*
     * En esta primera versión solamente
     * el propietario administra accesos.
     */
    if (
        profile.role !== 'owner'
    ) {
        redirect(
            `/admin/b/${slug}`
        )
    }

    /*
     * 3. Validar aislamiento por negocio.
     */
    const business =
        await getBusinessBySlug(
            slug
        )

    if (
        business.id !==
        profile.business_id
    ) {
        redirect('/admin')
    }

    /*
     * 4. Cargar profesionales,
     * miembros e invitaciones.
     */
    const [
        barbersResult,
        membersResult,
        invitationsResult,
    ] = await Promise.all([
        supabase
            .from('barbers')
            .select(`
id,
    name,
    specialty,
    photo_url,
    profile_id,
    is_active
        `)
            .eq(
                'business_id',
                business.id
            )
            .order(
                'name',
                {
                    ascending: true,
                }
            ),

        supabase
            .from('profiles')
            .select(`
id,
    full_name,
    email,
    role
        `)
            .eq(
                'business_id',
                business.id
            )
            .in(
                'role',
                [
                    'owner',
                    'admin',
                    'barber',
                ]
            )
            .order(
                'full_name',
                {
                    ascending: true,
                    nullsFirst: false,
                }
            ),

        supabase
            .from(
                'business_invitations'
            )
            .select(`
id,
    email,
    full_name,
    role,
    status,
    barber_id,
    expires_at,
    created_at
        `)
            .eq(
                'business_id',
                business.id
            )
            .order(
                'created_at',
                {
                    ascending: false,
                }
            ),
    ])

    if (barbersResult.error) {
        console.error(
            'Error cargando barberos del equipo:',
            barbersResult.error
        )

        throw new Error(
            'No se pudieron cargar los profesionales'
        )
    }

    if (membersResult.error) {
        console.error(
            'Error cargando miembros del equipo:',
            membersResult.error
        )

        throw new Error(
            'No se pudieron cargar los miembros'
        )
    }

    if (
        invitationsResult.error
    ) {
        console.error(
            'Error cargando invitaciones:',
            invitationsResult.error
        )

        throw new Error(
            'No se pudieron cargar las invitaciones'
        )
    }

    /*
     * 5. En past_due/cancelled permitimos
     * lectura, pero bloqueamos nuevas invitaciones.
     */
    const canInvite =
        business.subscription_status ===
        'trialing' ||
        business.subscription_status ===
        'active'

    const subscriptionBlockReason =
        business.subscription_status ===
            'past_due'
            ? 'Tu negocio está en modo solo lectura porque existe un pago pendiente.'
            : business.subscription_status ===
                'cancelled'
                ? 'La suscripción está cancelada. Reactívala para invitar integrantes.'
                : ''

    return (
        <main className="min-h-screen px-4 py-5 text-slate-950 md:px-8 md:py-6">
            <div className="mx-auto max-w-7xl space-y-5">
                <header className="flex flex-col gap-4 border-b border-black/10 pb-5 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <Link
                            href={`/admin/b/${business.slug}`}
                            className="mb-3 inline-flex items-center gap-2 text-sm font-black text-[#8A5D16] transition hover:text-[#C8942E]"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Volver al dashboard
                        </Link>

                        <p className="text-sm font-bold text-slate-500">
                            {business.name}
                        </p>

                        <h1 className="mt-1 text-[42px] font-black leading-none tracking-tight text-slate-950 md:text-5xl">
                            Equipo y accesos
                        </h1>

                        <p className="mt-2 max-w-[720px] text-sm leading-6 text-slate-600">
                            Invita administradores y entrega acceso a los profesionales de tu barbería.
                        </p>
                    </div>

                    <div className="flex w-fit items-center gap-3 rounded-2xl border border-black/10 bg-white px-4 py-3 shadow-sm">
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F4E7C7] text-[#8A5D16]">
                            <UsersRound className="h-5 w-5" />
                        </span>

                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                                Control de acceso
                            </p>

                            <p className="mt-0.5 text-sm font-black text-slate-800">
                                Solo propietario
                            </p>
                        </div>

                        <ShieldCheck className="h-5 w-5 text-emerald-600" />
                    </div>
                </header>

                <AdminTeamManager
                    businessName={
                        business.name
                    }
                    canInvite={
                        canInvite
                    }
                    subscriptionBlockReason={
                        subscriptionBlockReason
                    }
                    barbers={
                        barbersResult.data ??
                        []
                    }
                    members={
                        membersResult.data ??
                        []
                    }
                    invitations={
                        invitationsResult.data ??
                        []
                    }
                />
            </div>
        </main>
    )
}

