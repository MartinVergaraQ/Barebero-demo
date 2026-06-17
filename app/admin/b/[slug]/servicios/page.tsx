import { redirect } from 'next/navigation'
import { createClient } from '@/src/lib/supabase/server'
import { getBusinessBySlug } from '@/src/features/business/api/get-business-by-slug'
import { getServicesAdmin } from '@/src/features/services/api/get-services-admin'
import { AdminServiceForm } from '@/src/features/services/api/components/admin-service-form'
import { AdminServiceEditForm } from '@/src/features/services/api/components/admin-service-edit-form'
import { canManageCatalog } from '@/src/features/auth/utils/admin-access'
import {
    canCreateWithSubscription,
    canEditWithSubscription,
    getSubscriptionBlockReason,
    normalizeSubscriptionStatus,
} from '@/src/features/business/utils/subscription-rules'
import { SubscriptionRestrictedBanner } from '@/src/features/business/components/subscription-restricted-banner'

type AdminServiciosPageProps = {
    params: Promise<{
        slug: string
    }>
}

function formatPrice(price: number | string, currency = 'CLP') {
    const numericPrice = typeof price === 'string' ? Number(price) : price

    if (Number.isNaN(numericPrice)) return '$0'

    return new Intl.NumberFormat('es-CL', {
        style: 'currency',
        currency,
        maximumFractionDigits: 0,
    }).format(numericPrice)
}

export default async function AdminServiciosPage({
    params,
}: AdminServiciosPageProps) {
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

    const services = await getServicesAdmin(business.id)

    const activeServices = services.filter((service) => service.is_active).length
    const popularServices = services.filter((service) => service.is_popular).length
    const canCreate = canCreateWithSubscription(subscriptionStatus)
    const canEdit = canEditWithSubscription(subscriptionStatus)
    const maxServices = business.max_services
    const hasUnlimitedServices = maxServices === null
    const reachedServiceLimit =
        !hasUnlimitedServices && activeServices >= maxServices

    const createDisabledReason = !canCreate
        ? getSubscriptionBlockReason(subscriptionStatus)
        : reachedServiceLimit
            ? `Este plan permite ${maxServices} servicio${maxServices === 1 ? '' : 's'} activo${maxServices === 1 ? '' : 's'}. Puedes ocultar uno existente o cambiar de plan para agregar más.`
            : ''

    const canCreateService = canCreate && !reachedServiceLimit

    const serviceLimitLabel = hasUnlimitedServices
        ? `${activeServices}/∞ activos`
        : `${activeServices}/${maxServices} activos`

    return (
        <main className="min-h-screen px-4 py-5 text-slate-950 md:px-8 md:py-6">
            <div className="mx-auto max-w-7xl space-y-5">
                <header className="flex flex-col gap-4 border-b border-black/10 pb-5 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <p className="text-sm font-bold text-slate-500">
                            {business.name}
                        </p>

                        <h1 className="mt-1 text-[42px] font-black leading-none tracking-tight text-slate-950 md:text-5xl">
                            Servicios
                        </h1>

                        <p className="mt-2 max-w-[680px] text-sm leading-6 text-slate-600">
                            Administra precios, duración, orden y visibilidad de los servicios que aparecen en la reserva pública.
                        </p>
                    </div>

                    <div className="flex w-fit flex-wrap items-center gap-2 rounded-full bg-[#C8942E]/10 px-4 py-2 text-xs font-black text-[#8A5D16]">
                        <span>{services.length} servicio{services.length === 1 ? '' : 's'}</span>
                        <span className="h-1 w-1 rounded-full bg-[#C8942E]" />
                        <span>{activeServices} activo{activeServices === 1 ? '' : 's'}</span>
                        <span className="h-1 w-1 rounded-full bg-[#C8942E]" />
                        <span>{popularServices} popular{popularServices === 1 ? '' : 'es'}</span>
                    </div>
                </header>

                {!canCreate && (
                    <SubscriptionRestrictedBanner
                        message={getSubscriptionBlockReason(subscriptionStatus)}
                    />
                )}

                <AdminServiceForm
                    businessId={business.id}
                    canCreate={canCreateService}
                    disabledReason={createDisabledReason}
                />

                <section className="overflow-hidden rounded-[26px] border border-black/10 bg-[#FFFCF4] shadow-[0_14px_35px_rgba(15,23,42,0.06)]">
                    <div className="flex flex-col gap-3 border-b border-black/10 px-5 py-3.5 md:flex-row md:items-center md:justify-between md:px-6">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#C8942E]">
                                Catálogo
                            </p>

                            <h2 className="mt-1 text-xl font-black text-slate-950">
                                Lista de servicios
                            </h2>

                            <p className="mt-1 text-sm leading-6 text-slate-500">
                                Revisa precios, duración, orden y visibilidad.
                            </p>
                        </div>

                        <span className="w-fit rounded-full bg-[#F4E7C7] px-4 py-2 text-xs font-black text-[#8A5D16]">
                            {services.length} registro{services.length === 1 ? '' : 's'}
                        </span>
                    </div>

                    {services.length === 0 ? (
                        <div className="px-5 py-12 text-center">
                            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F4E7C7] text-2xl">
                                ✂️
                            </div>

                            <h3 className="mt-4 text-xl font-black text-slate-950">
                                No hay servicios todavía
                            </h3>

                            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">
                                Crea tu primer servicio para que los clientes puedan reservar online.
                            </p>
                        </div>
                    ) : (
                        <div className="divide-y divide-black/10">
                            {services.map((service) => (
                                <article
                                    key={service.id}
                                    className="group grid gap-4 px-5 py-4 transition hover:bg-[#FBF7EE] md:grid-cols-[minmax(0,1fr)_160px_120px] md:items-center md:px-6"
                                >
                                    <div className="flex min-w-0 items-start gap-4">
                                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#C8942E]/10 text-sm font-black text-[#8A5D16] ring-1 ring-[#C8942E]/15">
                                            #{service.display_order || 0}
                                        </div>

                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <h3 className="truncate text-lg font-black leading-tight text-slate-950">
                                                    {service.name}
                                                </h3>

                                                {service.is_popular && (
                                                    <span className="rounded-full bg-[#F4E7C7] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-[#8A5D16]">
                                                        Popular
                                                    </span>
                                                )}

                                                <span
                                                    className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] ring-1 ${service.is_active
                                                        ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                                                        : 'bg-slate-100 text-slate-500 ring-slate-200'
                                                        }`}
                                                >
                                                    {service.is_active ? 'Activo' : 'Oculto'}
                                                </span>
                                            </div>

                                            <p className="mt-1 line-clamp-1 text-sm font-medium leading-6 text-slate-500">
                                                {service.description || 'Sin descripción.'}
                                            </p>

                                            <div className="mt-2 flex flex-wrap gap-2">
                                                <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-600 ring-1 ring-black/5">
                                                    {service.duration_minutes} min
                                                </span>

                                                <span className="max-w-full truncate rounded-full bg-white px-3 py-1 text-xs font-black text-slate-600 ring-1 ring-black/5">
                                                    {service.slug}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="rounded-2xl  px-4 py-3 md:text-right">
                                        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#8A5D16]/70">
                                            Precio
                                        </p>

                                        <p className="mt-0.5 text-2xl font-black leading-none text-[#C8942E]">
                                            {formatPrice(service.price, service.currency)}
                                        </p>

                                        <p className="mt-1 text-[10px] font-black uppercase tracking-[0.16em] text-[#8A5D16]/60">
                                            {service.currency}
                                        </p>
                                    </div>

                                    <div className="md:justify-self-end">
                                        <AdminServiceEditForm
                                            service={service}
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