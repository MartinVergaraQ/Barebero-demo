import { redirect } from 'next/navigation'
import { createClient } from '@/src/lib/supabase/server'
import { getBusinessBySlug } from '@/src/features/business/api/get-business-by-slug'
import { getBarbersAdmin } from '@/src/features/barbers/api/get-barbers-admin'
import { AdminBarberForm } from '@/src/features/barbers/components/admin-barber-form'
import { AdminBarberEditForm } from '@/src/features/barbers/components/admin-barber-edit-form'
import { canManageCatalog } from '@/src/features/auth/utils/admin-access'
import { getServicesAdmin } from '@/src/features/services/api/get-services-admin'
import {
    canCreateWithSubscription,
    canEditWithSubscription,
    getSubscriptionBlockReason,
    normalizeSubscriptionStatus,
} from '@/src/features/business/utils/subscription-rules'
import { SubscriptionRestrictedBanner } from '@/src/features/business/components/subscription-restricted-banner'

type AdminBarberosPageProps = {
    params: Promise<{
        slug: string
    }>
}

function getInitials(name: string) {
    return name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join('')
}

function formatChileWhatsapp(value?: string | null) {
    if (!value) return 'Sin WhatsApp'

    const digits = value.replace(/\D/g, '')

    let phone = digits

    if (phone.startsWith('56')) {
        phone = phone.slice(2)
    }

    if (phone.startsWith('9')) {
        phone = phone.slice(1)
    }

    phone = phone.slice(0, 8)

    if (phone.length <= 4) {
        return `+56 9 ${phone}`
    }

    return `+56 9 ${phone.slice(0, 4)} ${phone.slice(4)}`
}

export default async function AdminBarberosPage({
    params,
}: AdminBarberosPageProps) {
    const { slug } = await params
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

    if (profileError || !profile || !canManageCatalog(profile.role)) {
        redirect('/admin')
    }

    const business = await getBusinessBySlug(slug)

    if (profile.business_id !== business.id) {
        redirect('/admin')
    }
    const subscriptionStatus = normalizeSubscriptionStatus(
        business.subscription_status
    )

    const [barbers, services] = await Promise.all([
        getBarbersAdmin(),
        getServicesAdmin(business.id),
    ])

    const serviceOptions = services.map((service) => ({
        id: service.id,
        name: service.name,
        price: service.price,
        duration_minutes: service.duration_minutes,
    }))

    const activeBarbers = barbers.filter((barber) => barber.is_active).length
    const withPhoto = barbers.filter((barber) => !!barber.photo_url).length

    const canCreate =
        canCreateWithSubscription(subscriptionStatus)

    const canEdit =
        canEditWithSubscription(subscriptionStatus)

    const subscriptionBlockReason =
        getSubscriptionBlockReason(subscriptionStatus)

    const isSubscriptionReadOnly =
        !canCreate || !canEdit

    const maxBarbers = business.max_barbers
    const hasUnlimitedBarbers = maxBarbers === null
    const reachedBarberLimit =
        !hasUnlimitedBarbers && activeBarbers >= maxBarbers

    const canCreateBarber = canCreate && !reachedBarberLimit

    const barberLimitLabel = hasUnlimitedBarbers
        ? `${activeBarbers}/∞ activos`
        : `${activeBarbers}/${maxBarbers} activos`

    const createDisabledReason = !canCreate
        ? subscriptionBlockReason
        : reachedBarberLimit
            ? `Este plan permite ${maxBarbers} barbero${maxBarbers === 1 ? '' : 's'
            } activo${maxBarbers === 1 ? '' : 's'
            }. Puedes ocultar uno existente o cambiar de plan para agregar más.`
            : ''

    return (
        <main className="min-h-screen px-4 py-5 text-slate-950 md:px-8 md:py-6">
            <div className="mx-auto max-w-7xl space-y-5">
                <header className="flex flex-col gap-4 border-b border-black/10 pb-5 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <p className="text-sm font-bold text-slate-500">
                            {business.name}
                        </p>

                        <h1 className="mt-1 text-4xl font-black tracking-tight text-slate-950 md:text-5xl">
                            Barberos
                        </h1>

                        <p className="mt-2 max-w-[700px] text-sm leading-6 text-slate-600 md:text-base md:leading-7">
                            Administra los profesionales del negocio, sus perfiles, WhatsApp, orden de aparición y servicios disponibles.
                        </p>
                    </div>

                    <div className="grid w-fit grid-cols-3 overflow-hidden rounded-2xl border border-black/10 bg-[#FFFCF4] shadow-sm">
                        <div className="px-4 py-2 text-center">
                            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                                Uso
                            </p>
                            <p className="text-sm font-black text-[#8A5D16]">
                                {barberLimitLabel}
                            </p>
                        </div>

                        <div className="border-x border-black/10 px-4 py-2 text-center">
                            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                                Activos
                            </p>
                            <p className="text-sm font-black text-[#8A5D16]">
                                {activeBarbers}
                            </p>
                        </div>

                        <div className="px-4 py-2 text-center">
                            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                                Fotos
                            </p>
                            <p className="text-sm font-black text-[#8A5D16]">
                                {withPhoto}
                            </p>
                        </div>
                    </div>
                </header>

                {isSubscriptionReadOnly && (
                    <SubscriptionRestrictedBanner
                        message={subscriptionBlockReason}
                    />
                )}

                <AdminBarberForm
                    services={serviceOptions}
                    canCreate={canCreateBarber}
                    disabledReason={createDisabledReason}
                />

                <section className="overflow-hidden rounded-[28px] border border-black/10 bg-[#FFFCF4] shadow-[0_18px_45px_rgba(15,23,42,0.07)]">
                    <div className="flex flex-col gap-2 border-b border-black/10 px-5 py-5 md:flex-row md:items-center md:justify-between md:px-6">
                        <div>
                            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#C8942E]">
                                Equipo
                            </p>

                            <h2 className="mt-1 text-2xl font-black text-slate-950">
                                Lista de barberos
                            </h2>

                            <p className="mt-1 text-sm leading-6 text-slate-500">
                                Revisa y edita la información visible de cada profesional.
                            </p>
                        </div>

                        <span className="w-fit rounded-full bg-[#C8942E]/10 px-4 py-2 text-xs font-black text-[#8A5D16]">
                            {barbers.length} registro{barbers.length === 1 ? '' : 's'}
                        </span>
                    </div>

                    {barbers.length === 0 ? (
                        <div className="px-5 py-14 text-center">
                            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-2xl">
                                💈
                            </div>

                            <h3 className="mt-4 text-xl font-black text-slate-950">
                                No hay barberos todavía
                            </h3>

                            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">
                                Crea tu primer barbero para asignar servicios, horarios y recibir reservas.
                            </p>
                        </div>
                    ) : (
                        <div className="divide-y divide-black/10">
                            {barbers.map((barber) => (
                                <article
                                    key={barber.id}
                                    className="grid gap-4 px-5 py-5 transition hover:bg-[#FBF7EE] lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)_auto] lg:items-center md:px-6"
                                >
                                    <div className="flex min-w-0 items-start gap-4">
                                        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-slate-950 ring-1 ring-black/10">
                                            {barber.photo_url ? (
                                                <img
                                                    src={barber.photo_url}
                                                    alt={barber.name}
                                                    className="h-full w-full object-cover"
                                                />
                                            ) : (
                                                <div className="flex h-full w-full items-center justify-center text-sm font-black text-white">
                                                    {getInitials(barber.name)}
                                                </div>
                                            )}
                                        </div>

                                        <div className="min-w-0">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <h3 className="line-clamp-1 text-lg font-black text-slate-950">
                                                    {barber.name}
                                                </h3>

                                                <span
                                                    className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${barber.is_active
                                                        ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                                                        : 'bg-slate-100 text-slate-500 ring-1 ring-slate-200'
                                                        }`}
                                                >
                                                    {barber.is_active ? 'Visible' : 'Oculto'}
                                                </span>
                                            </div>

                                            <p className="mt-1 line-clamp-1 text-sm font-bold text-slate-500">
                                                {barber.specialty || 'Sin especialidad definida'}
                                            </p>

                                            <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-500">
                                                {barber.bio || 'Sin biografía.'}
                                            </p>

                                            <div className="mt-3 flex flex-wrap gap-2">
                                                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                                                    {barber.slug}
                                                </span>

                                                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                                                    Orden {barber.display_order}
                                                </span>

                                                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                                                    {formatChileWhatsapp(barber.whatsapp_phone)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="rounded-[22px] border border-black/10 bg-[#FBF7EE] px-4 py-3 lg:text-right">
                                        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
                                            Perfil público
                                        </p>

                                        <p className="mt-1 text-sm font-black text-slate-950">
                                            {barber.photo_url ? 'Foto configurada' : 'Sin foto'}
                                        </p>

                                        <p className="mt-1 text-xs font-semibold text-slate-500">
                                            {barber.whatsapp_phone
                                                ? 'Contacto listo'
                                                : 'WhatsApp pendiente'}
                                        </p>
                                    </div>

                                    <div className="lg:justify-self-end">
                                        <AdminBarberEditForm
                                            barber={barber}
                                            services={serviceOptions}
                                            canEdit={canEdit}
                                        />
                                    </div>
                                </article>
                            ))}
                        </div>
                    )}
                </section>
            </div>
        </main>
    )
}