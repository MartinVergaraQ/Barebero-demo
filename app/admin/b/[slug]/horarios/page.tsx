import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/src/lib/supabase/server'
import { getBusinessBySlug } from '@/src/features/business/api/get-business-by-slug'
import { getBarbersAdmin } from '@/src/features/barbers/api/get-barbers-admin'
import { AdminWorkingHoursForm } from '@/src/features/working-hours/components/admin-working-hours-form'
import { canManageAppointments } from '@/src/features/auth/utils/admin-access'
import { getBarberByProfile } from '@/src/features/barbers/api/get-barber-by-profile'
import {
    isBarberRole,
    isFullAdminRole,
} from '@/src/features/auth/utils/admin-scope'


type AdminHorariosPageProps = {
    params: Promise<{
        slug: string
    }>
    searchParams: Promise<{
        from?: string
    }>
}

export default async function AdminHorariosPage({
    params,
    searchParams,
}: AdminHorariosPageProps) {
    const [
        { slug },
        query,
    ] = await Promise.all([
        params,
        searchParams,
    ])

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

    if (userError || !user) {
        redirect('/admin/login')
    }

    /*
     * 2. Validar perfil y permisos.
     */
    const {
        data: profile,
        error: profileError,
    } = await supabase
        .from('profiles')
        .select(
            'id, business_id, role'
        )
        .eq('id', user.id)
        .single()

    if (
        profileError ||
        !profile ||
        !canManageAppointments(
            profile.role
        )
    ) {
        redirect('/admin')
    }

    /*
     * 3. Validar negocio y aislamiento.
     */
    const business =
        await getBusinessBySlug(slug)

    if (
        profile.business_id !==
        business.id
    ) {
        redirect('/admin')
    }

    /*
     * 4. Resolver el perfil profesional
     * vinculado al usuario actual.
     */
    const ownBarber =
        await getBarberByProfile(
            profile.id
        )

    if (
        isBarberRole(profile.role) &&
        (
            !ownBarber ||
            ownBarber.business_id !==
            business.id
        )
    ) {
        redirect('/admin')
    }

    /*
     * Owner y admin administran al equipo.
     * Barber solo administra su perfil.
     */
    const barbers =
        isFullAdminRole(profile.role)
            ? await getBarbersAdmin()
            : [
                {
                    id: ownBarber!.id,
                    business_id:
                        ownBarber!
                            .business_id,
                    name:
                        ownBarber!.name,
                    photo_url:
                        ownBarber!
                            .photo_url ??
                        null,
                    specialty:
                        ownBarber!
                            .specialty ??
                        null,
                },
            ]

    const isBarber =
        isBarberRole(profile.role)

    /*
     * 5. Detectar si viene desde
     * el checklist del dashboard.
     */
    const isSetupFlow =
        query.from === 'setup'

    const returnTo =
        isSetupFlow
            ? `/admin/b/${business.slug}`
            : undefined

    /*
     * 6. Suscripción.
     */
    const canEdit =
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
                ? 'Tu negocio está en modo solo lectura porque la suscripción está cancelada.'
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
                            {isSetupFlow
                                ? 'Configura tu disponibilidad'
                                : 'Horarios'}
                        </h1>

                        <p className="mt-2 max-w-[680px] text-sm leading-6 text-slate-600">
                            {isSetupFlow
                                ? 'Define los días y horas en que podrán reservar contigo.'
                                : 'Ajusta los días y horas de atención de cada barbero para calcular correctamente la disponibilidad de reservas.'}
                        </p>
                    </div>

                    <div className="flex w-fit items-center gap-2 rounded-full bg-[#C8942E]/10 px-4 py-2 text-xs font-black text-[#8A5D16]">
                        <span>
                            {isBarber
                                ? 'Mi disponibilidad'
                                : 'Equipo'}
                        </span>

                        <span className="h-1 w-1 rounded-full bg-[#C8942E]" />

                        <span>
                            {barbers.length}{' '}
                            barbero
                            {barbers.length === 1
                                ? ''
                                : 's'}
                        </span>
                    </div>
                </header>

                {isSetupFlow && (
                    <section className="rounded-2xl border border-[#dfcda8] bg-[#fffaf0] px-4 py-3 text-sm font-semibold leading-6 text-[#6f5018]">
                        Seleccionamos automáticamente
                        a tu primer profesional.
                        Mantén activo al menos un día
                        y guarda los horarios para
                        completar este paso.
                    </section>
                )}

                {barbers.length === 0 ? (
                    <section className="rounded-[26px] border border-black/10 bg-[#FFFCF4] px-5 py-12 text-center shadow-[0_14px_35px_rgba(15,23,42,0.06)]">
                        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F4E7C7] text-2xl">
                            ⏰
                        </div>

                        <h2 className="mt-4 text-2xl font-black text-slate-950">
                            No hay barberos creados
                            todavía
                        </h2>

                        <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">
                            Primero crea al menos un
                            profesional para configurar
                            sus horarios de atención.
                        </p>
                    </section>
                ) : (
                    <section className="overflow-hidden rounded-[26px] border border-black/10 bg-[#FFFCF4] shadow-[0_14px_35px_rgba(15,23,42,0.06)]">
                        <div className="border-b border-black/10 px-5 py-4 md:px-6">
                            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#C8942E]">
                                        Configuración
                                    </p>

                                    <h2 className="mt-1 text-2xl font-black text-slate-950">
                                        Horarios de atención
                                    </h2>

                                    <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
                                        Define los días
                                        activos y las horas
                                        de apertura y cierre.
                                    </p>
                                </div>

                                <div
                                    className={`rounded-full px-4 py-2 text-xs font-black ${canEdit
                                        ? 'bg-[#F4E7C7] text-[#8A5D16]'
                                        : 'border border-slate-200 bg-slate-100 text-slate-500'
                                        }`}
                                >
                                    {canEdit
                                        ? 'Edición habilitada'
                                        : 'Solo lectura'}
                                </div>
                            </div>
                        </div>

                        <div className="p-4 md:p-5">
                            <AdminWorkingHoursForm
                                canEdit={canEdit}
                                subscriptionBlockReason={
                                    subscriptionBlockReason
                                }
                                setupMode={
                                    isSetupFlow
                                }
                                returnTo={
                                    returnTo
                                }
                                barbers={barbers.map(
                                    (barber) => ({
                                        id: barber.id,
                                        business_id:
                                            barber.business_id,
                                        name: barber.name,
                                        photo_url:
                                            barber.photo_url ??
                                            null,
                                        specialty:
                                            barber.specialty ??
                                            null,
                                    })
                                )}
                            />
                        </div>
                    </section>
                )}
            </div>
        </main>
    )
}
