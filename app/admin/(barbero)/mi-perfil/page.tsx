import {
    CircleUserRound,
    Clock3,
    LockKeyhole,
} from 'lucide-react'
import { redirect } from 'next/navigation'

import {
    createClient,
} from '@/src/lib/supabase/server'

import {
    getCurrentBarber,
} from '@/src/features/barbers/api/get-current-barber'

import {
    BarberProfileForm,
} from '@/src/features/barbers/components/barber-profile-form'

export default async function MiPerfilPage() {
    const supabase =
        await createClient()

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
        .single()

    if (
        profileError ||
        !profile?.business_id
    ) {
        redirect('/admin')
    }

    if (
        profile.role !== 'barber' &&
        profile.role !== 'owner' &&
        profile.role !== 'admin'
    ) {
        redirect('/admin')
    }

    const {
        data: business,
        error: businessError,
    } = await supabase
        .from('businesses')
        .select(`
id,
    name,
    subscription_status
        `)
        .eq(
            'id',
            profile.business_id
        )
        .single()

    if (
        businessError ||
        !business
    ) {
        redirect('/admin')
    }

    const barber =
        await getCurrentBarber()

    if (!barber) {
        redirect('/admin')
    }

    const canEdit =
        business.subscription_status ===
        'trialing' ||
        business.subscription_status ===
        'active'

    const subscriptionStatusLabel =
        business.subscription_status ===
            'past_due'
            ? 'Pago pendiente'
            : business
                .subscription_status ===
                'cancelled'
                ? 'Suscripción cancelada'
                : 'Solo lectura'

    const subscriptionBlockReason =
        canEdit
            ? undefined
            : business
                .subscription_status ===
                'past_due'
                ? 'Existe un pago pendiente. Regulariza tu plan para volver a editar tu perfil.'
                : business
                    .subscription_status ===
                    'cancelled'
                    ? 'La suscripción está cancelada. Reactívala para volver a editar tu perfil.'
                    : 'La suscripción actual no permite modificar el perfil.'

    return (
        <main className="space-y-4 sm:space-y-5">
            <section className="relative overflow-hidden rounded-[28px] border border-[#3D3424] bg-gradient-to-br from-[#171715] via-[#24211C] to-[#755010] px-5 py-5 text-white shadow-[0_22px_55px_rgba(15,23,42,0.20)] sm:px-6 sm:py-6">
                <div className="pointer-events-none absolute -right-14 -top-16 h-52 w-52 rounded-full bg-[#D7A32C]/20 blur-3xl" />

                <div className="relative flex items-start justify-between gap-4">
                    <div className="min-w-0">
                        <span className="inline-flex rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-[#F6D98E] backdrop-blur">
                            Identidad profesional
                        </span>

                        <h1 className="mt-4 text-3xl font-black tracking-[-0.04em] sm:text-4xl">
                            Mi perfil
                        </h1>

                        <p className="mt-2 max-w-xl text-sm font-medium leading-6 text-white/70">
                            Mantén actualizada la información que verán tus clientes al reservar.
                        </p>

                        <div className="mt-4 inline-flex max-w-full items-center gap-2 rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-xs font-bold text-white/80 backdrop-blur">
                            <CircleUserRound className="h-4 w-4 shrink-0 text-[#F6D98E]" />

                            <span className="truncate">
                                {business.name}
                            </span>
                        </div>
                    </div>

                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-[#F6D98E] backdrop-blur sm:h-14 sm:w-14">
                        <CircleUserRound className="h-6 w-6 sm:h-7 sm:w-7" />
                    </span>
                </div>
            </section>

            {!canEdit && (
                <section className="rounded-[20px] border border-amber-200 bg-amber-50 px-4 py-4 shadow-sm">
                    <div className="flex items-start gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                            <LockKeyhole className="h-5 w-5" />
                        </span>

                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                                <p className="text-sm font-black text-slate-900">
                                    Perfil en modo lectura
                                </p>

                                <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-amber-800">
                                    {subscriptionStatusLabel}
                                </span>
                            </div>

                            <p className="mt-1 text-xs font-semibold leading-5 text-slate-600 sm:text-sm sm:leading-6">
                                {subscriptionBlockReason}
                            </p>
                        </div>
                    </div>
                </section>
            )}

            <BarberProfileForm
                barber={barber}
                canEdit={canEdit}
                subscriptionBlockReason={
                    subscriptionBlockReason
                }
            />
        </main>
    )
}

