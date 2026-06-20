import { redirect } from 'next/navigation'
import { createClient } from '@/src/lib/supabase/server'
import { getCurrentBarber } from '@/src/features/barbers/api/get-current-barber'
import { BarberProfileForm } from '@/src/features/barbers/components/barber-profile-form'

export default async function MiPerfilPage() {
    const supabase = await createClient()

    const {
        data: { user },
        error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
        redirect('/admin/login')
    }

    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, business_id, role')
        .eq('id', user.id)
        .single()

    if (profileError || !profile?.business_id) {
        redirect('/admin')
    }

    if (
        profile.role !== 'barber' &&
        profile.role !== 'owner' &&
        profile.role !== 'admin'
    ) {
        redirect('/admin')
    }

    const { data: business, error: businessError } = await supabase
        .from('businesses')
        .select('id, subscription_status')
        .eq('id', profile.business_id)
        .single()

    if (businessError || !business) {
        redirect('/admin')
    }

    const barber = await getCurrentBarber()

    if (!barber) {
        redirect('/admin')
    }

    const canEdit =
        business.subscription_status === 'trialing' ||
        business.subscription_status === 'active'

    const subscriptionStatusLabel =
        business.subscription_status === 'past_due'
            ? 'Pago pendiente'
            : business.subscription_status === 'canceled'
                ? 'Suscripción cancelada'
                : 'Solo lectura'

    const subscriptionBlockReason = canEdit
        ? undefined
        : business.subscription_status === 'past_due'
            ? 'Existe un pago pendiente. Regulariza tu plan para volver a editar tu perfil.'
            : business.subscription_status === 'canceled'
                ? 'La suscripción está cancelada. Reactívala para volver a editar tu perfil.'
                : 'La suscripción actual no permite modificar el perfil.'

    return (
        <main className="space-y-6 p-8">
            <header>
                <p className="text-sm font-semibold text-slate-500">
                    Panel de barbero
                </p>

                <h1 className="text-3xl font-black tracking-tight text-slate-950">
                    Mi perfil
                </h1>

                <p className="mt-2 text-sm leading-6 text-slate-600">
                    Aquí puedes ver y actualizar tu información dentro del negocio.
                </p>
            </header>

            {!canEdit && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50/70 px-4 py-4">
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-black text-slate-900">
                                Perfil en modo lectura
                            </p>

                            <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-amber-800">
                                {subscriptionStatusLabel}
                            </span>
                        </div>

                        <p className="mt-1 text-sm font-semibold leading-6 text-slate-600">
                            {subscriptionBlockReason}
                        </p>
                    </div>
                </div>
            )}

            <BarberProfileForm
                barber={barber}
                canEdit={canEdit}
                subscriptionBlockReason={subscriptionBlockReason}
            />
        </main>
    )
}