import { redirect } from 'next/navigation'
import { createClient } from '@/src/lib/supabase/server'
import { getBusinessBySlug } from '@/src/features/business/api/get-business-by-slug'
import { getBarbersAdmin } from '@/src/features/barbers/api/get-barbers-admin'
import { AdminTimeOffForm } from '@/src/features/time-off/components/admin-time-off-form'
import { canManageAppointments } from '@/src/features/auth/utils/admin-access'
import {
    isBarberRole,
    isFullAdminRole,
} from '@/src/features/auth/utils/admin-scope'
import { getBarberByProfile } from '@/src/features/barbers/api/get-barber-by-profile'

type AdminBloqueosPageProps = {
    params: Promise<{
        slug: string
    }>
}

export default async function AdminBloqueosPage({
    params,
}: AdminBloqueosPageProps) {
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
        ? await getBarbersAdmin()
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
            : business.subscription_status === 'cancelled'
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
                            Bloqueos
                        </h1>

                        <p className="mt-2 max-w-[680px] text-sm leading-6 text-slate-600">
                            Bloquea tramos puntuales donde un barbero no estará disponible. Esos horarios no aparecerán para reservas públicas.
                        </p>
                    </div>

                    <div
                        className={`flex w-fit items-center gap-2 rounded-full px-4 py-2 text-xs font-black ${canEdit
                            ? 'bg-[#C8942E]/10 text-[#8A5D16]'
                            : 'border border-slate-200 bg-slate-100 text-slate-500'
                            }`}
                    >
                        <span>{isBarber ? 'Mis bloqueos' : 'Equipo'}</span>

                        <span
                            className={`h-1 w-1 rounded-full ${canEdit ? 'bg-[#C8942E]' : 'bg-slate-400'
                                }`}
                        />

                        <span>{canEdit ? 'Edición habilitada' : 'Solo lectura'}</span>
                    </div>
                </header>

                {barbers.length === 0 ? (
                    <section className="rounded-[26px] border border-black/10 bg-[#FFFCF4] px-5 py-12 text-center shadow-[0_14px_35px_rgba(15,23,42,0.06)]">
                        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F4E7C7] text-2xl">
                            🚫
                        </div>

                        <h2 className="mt-4 text-2xl font-black text-slate-950">
                            No hay barberos creados todavía
                        </h2>

                        <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">
                            Primero crea al menos un barbero para registrar bloqueos.
                        </p>
                    </section>
                ) : (
                    <section className="overflow-hidden rounded-[26px] border border-black/10 bg-[#FFFCF4] p-4 shadow-[0_14px_35px_rgba(15,23,42,0.06)] md:p-5">
                        <AdminTimeOffForm
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
                    </section>
                )}
            </div>
        </main>
    )
}