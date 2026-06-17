import { redirect } from 'next/navigation'
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
}

export default async function AdminHorariosPage({
    params,
}: AdminHorariosPageProps) {
    const { slug } = await params
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        redirect('/admin/login')
    }

    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, business_id, role')
        .eq('id', user.id)
        .single()

    if (profileError || !profile || !canManageAppointments(profile.role)) {
        redirect('/admin')
    }

    const business = await getBusinessBySlug(slug)

    if (profile.business_id !== business.id) {
        redirect('/admin')
    }

    const ownBarber = await getBarberByProfile(profile.id)

    if (
        isBarberRole(profile.role) &&
        (!ownBarber || ownBarber.business_id !== business.id)
    ) {
        redirect('/admin')
    }

    const barbers = isFullAdminRole(profile.role)
        ? await getBarbersAdmin(business.id)
        : [
            {
                id: ownBarber!.id,
                business_id: ownBarber!.business_id,
                name: ownBarber!.name,
                photo_url: ownBarber!.photo_url ?? null,
                specialty: ownBarber!.specialty ?? null,
            },
        ]

    const isBarber = isBarberRole(profile.role)

    const canEdit =
        business.subscription_status === 'trialing' ||
        business.subscription_status === 'active'

    const subscriptionBlockReason =
        business.subscription_status === 'past_due'
            ? 'Tu negocio está en modo solo lectura porque existe un pago pendiente.'
            : business.subscription_status === 'canceled'
                ? 'Tu negocio está en modo solo lectura porque la suscripción está cancelada.'
                : ''

    return (
        <main className="min-h-screen px-4 py-5 text-slate-950 md:px-8 md:py-6">
            <div className="mx-auto max-w-7xl space-y-5">
                <header className="flex flex-col gap-4 border-b border-black/10 pb-5 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <p className="text-sm font-bold text-slate-500">
                            {business.name}
                        </p>

                        <h1 className="mt-1 text-[42px] font-black leading-none tracking-tight text-slate-950 md:text-5xl">
                            Horarios
                        </h1>

                        <p className="mt-2 max-w-[640px] text-sm leading-6 text-slate-600">
                            Ajusta los días y horas de atención de cada barbero para calcular correctamente la disponibilidad de reservas.
                        </p>
                    </div>

                    <div className="flex w-fit items-center gap-2 rounded-full bg-[#C8942E]/10 px-4 py-2 text-xs font-black text-[#8A5D16]">
                        <span>{isBarber ? 'Mi disponibilidad' : 'Equipo'}</span>
                        <span className="h-1 w-1 rounded-full bg-[#C8942E]" />
                        <span>
                            {barbers.length} barbero{barbers.length === 1 ? '' : 's'}
                        </span>
                    </div>
                </header>

                {barbers.length === 0 ? (
                    <section className="rounded-[26px] border border-black/10 bg-[#FFFCF4] px-5 py-12 text-center shadow-[0_14px_35px_rgba(15,23,42,0.06)]">
                        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F4E7C7] text-2xl">
                            ⏰
                        </div>

                        <h2 className="mt-4 text-2xl font-black text-slate-950">
                            No hay barberos creados todavía
                        </h2>

                        <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">
                            Primero crea al menos un barbero para configurar sus horarios de atención.
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
                                        Selecciona un profesional y define sus bloques de atención por día.
                                    </p>
                                </div>

                                <div
                                    className={`rounded-full px-4 py-2 text-xs font-black ${canEdit
                                            ? 'bg-[#F4E7C7] text-[#8A5D16]'
                                            : 'border border-slate-200 bg-slate-100 text-slate-500'
                                        }`}
                                >
                                    {canEdit ? 'Edición habilitada' : 'Solo lectura'}
                                </div>
                            </div>
                        </div>

                        <div className="p-4 md:p-5">
                            <AdminWorkingHoursForm
                                canEdit={canEdit}
                                subscriptionBlockReason={subscriptionBlockReason}
                                barbers={barbers.map((barber) => ({
                                    id: barber.id,
                                    business_id: barber.business_id,
                                    name: barber.name,
                                    photo_url: barber.photo_url ?? null,
                                    specialty: barber.specialty ?? null,
                                }))}
                            />
                        </div>
                    </section>
                )}
            </div>
        </main>
    )
}