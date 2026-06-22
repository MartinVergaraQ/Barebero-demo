import { redirect } from 'next/navigation'
import { createClient } from '@/src/lib/supabase/server'
import { getBusinessBySlug } from '@/src/features/business/api/get-business-by-slug'
import { getGalleryItemsAdmin } from '@/src/features/gallery/api/get-gallery-items-admin'
import { AdminGalleryForm } from '@/src/features/gallery/components/admin-gallery-form'
import { AdminGalleryEditForm } from '@/src/features/gallery/components/admin-gallery-edit-form'
import { DeleteGalleryItemButton } from '@/src/features/gallery/components/delete-gallery-item-button'
import { canManageAppointments } from '@/src/features/auth/utils/admin-access'
import { getBarberByProfile } from '@/src/features/barbers/api/get-barber-by-profile'
import {
    isBarberRole,
    isFullAdminRole,
} from '@/src/features/auth/utils/admin-scope'
import { getBarbersAdmin } from '@/src/features/barbers/api/get-barbers-admin'
import { getActiveServices } from '@/src/features/services/api/get-services'
import { AlertTriangle } from 'lucide-react'

type AdminGaleriaPageProps = {
    params: Promise<{
        slug: string
    }>
}

export default async function AdminGaleriaPage({
    params,
}: AdminGaleriaPageProps) {
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

    if (
        profileError ||
        !profile?.business_id ||
        !canManageAppointments(profile.role)
    ) {
        redirect('/admin')
    }

    const business = await getBusinessBySlug(slug)

    if (profile.business_id !== business.id) {
        redirect('/admin')
    }

    const isBarber = isBarberRole(profile.role)
    const isFullAdmin = isFullAdminRole(profile.role)

    const ownBarber = isBarber
        ? await getBarberByProfile(profile.id)
        : null

    if (
        isBarber &&
        (!ownBarber || ownBarber.business_id !== business.id)
    ) {
        redirect('/admin')
    }

    const [items, barbers, services] = await Promise.all([
        getGalleryItemsAdmin(),
        isFullAdmin
            ? getBarbersAdmin()
            : Promise.resolve([]),
        getActiveServices(business.id),
    ])

    const activeItems = items.filter((item) => item.is_active).length
    const inactiveItems = items.length - activeItems
    const withService = items.filter((item) => !!item.service_id).length

    const canEdit =
        business.subscription_status === 'trialing' ||
        business.subscription_status === 'active'

    const subscriptionBlockReason = canEdit
        ? undefined
        : business.subscription_status === 'past_due'
            ? 'Tu negocio está en modo solo lectura porque existe un pago pendiente.'
            : business.subscription_status === 'cancelled'
                ? 'La suscripción está cancelada. Reactívala para modificar la galería.'
                : 'La suscripción actual no permite modificar la galería.'

    return (
        <main className="min-h-screen px-4 py-6 text-slate-950 md:px-8 md:py-8">
            <div className="mx-auto max-w-7xl space-y-6 md:space-y-8">
                <header className="flex flex-col gap-5 border-b border-black/10 pb-6 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <p className="text-sm font-bold text-slate-500">
                            {business.name}
                        </p>

                        <h1 className="mt-1 text-4xl font-black tracking-tight text-slate-950 md:text-5xl">
                            {isBarber ? 'Mi galería' : 'Galería'}
                        </h1>

                        <p className="mt-2 max-w-[720px] text-sm leading-6 text-slate-600 md:text-base md:leading-7">
                            Administra fotos reales de trabajos terminados. Estas imágenes ayudan a que los clientes elijan servicio antes de reservar.
                        </p>
                    </div>

                    <div className="grid w-fit grid-cols-3 overflow-hidden rounded-2xl border border-black/10 bg-[#FFFCF4] shadow-sm">
                        <div className="px-4 py-2 text-center">
                            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                                Visibles
                            </p>
                            <p className="text-sm font-black text-[#8A5D16]">
                                {activeItems}
                            </p>
                        </div>

                        <div className="border-x border-black/10 px-4 py-2 text-center">
                            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                                Ocultas
                            </p>
                            <p className="text-sm font-black text-[#8A5D16]">
                                {inactiveItems}
                            </p>
                        </div>

                        <div className="px-4 py-2 text-center">
                            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                                Servicio
                            </p>
                            <p className="text-sm font-black text-[#8A5D16]">
                                {withService}
                            </p>
                        </div>
                    </div>
                </header>

                {!canEdit && subscriptionBlockReason && (
                    <div className="inline-flex max-w-2xl items-start gap-3 rounded-2xl border border-amber-200/80 bg-amber-50/70 px-4 py-3 shadow-sm">
                        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                            <AlertTriangle className="h-4 w-4" />
                        </div>

                        <div>
                            <p className="text-sm font-black text-amber-950">
                                Galería en modo solo lectura
                            </p>

                            <p className="mt-0.5 text-xs font-semibold leading-5 text-amber-800/80">
                                {subscriptionBlockReason}
                            </p>
                        </div>
                    </div>
                )}

                <AdminGalleryForm
                    barberId={isBarber ? ownBarber!.id : undefined}
                    barbers={barbers}
                    services={services}
                    allowBarberAssignment={isFullAdmin}
                    canCreate={canEdit}
                    subscriptionBlockReason={subscriptionBlockReason}
                />

                <section className="overflow-hidden rounded-[28px] border border-black/10 bg-[#FFFCF4] shadow-[0_18px_45px_rgba(15,23,42,0.07)]">
                    <div className="flex flex-col gap-2 border-b border-black/10 px-5 py-5 md:flex-row md:items-center md:justify-between md:px-6">
                        <div>
                            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#C8942E]">
                                Trabajos
                            </p>

                            <h2 className="mt-1 text-2xl font-black text-slate-950">
                                {isBarber ? 'Mis trabajos' : 'Trabajos publicados'}
                            </h2>

                            <p className="mt-1 text-sm leading-6 text-slate-500">
                                Revisa, edita u oculta las imágenes visibles para tus clientes.
                            </p>
                        </div>

                        <span className="w-fit rounded-full bg-[#C8942E]/10 px-4 py-2 text-xs font-black text-[#8A5D16]">
                            {items.length} registro{items.length === 1 ? '' : 's'}
                        </span>
                    </div>

                    {items.length === 0 ? (
                        <div className="px-5 py-14 text-center">
                            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-2xl">
                                🖼️
                            </div>

                            <h3 className="mt-4 text-xl font-black text-slate-950">
                                No hay imágenes todavía
                            </h3>

                            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">
                                Sube tu primer trabajo para mostrar resultados reales en la página pública.
                            </p>
                        </div>
                    ) : (
                        <div className="grid gap-4 p-4 sm:grid-cols-2 xl:grid-cols-3">
                            {items.map((item) => (
                                <article
                                    key={item.id}
                                    className="group overflow-hidden rounded-[26px] border border-black/10 bg-white shadow-[0_14px_38px_rgba(15,23,42,0.07)] transition hover:-translate-y-0.5 hover:shadow-[0_22px_55px_rgba(15,23,42,0.12)]"
                                >
                                    <div className="relative h-48 overflow-hidden bg-slate-100">
                                        <img
                                            src={item.media_url}
                                            alt={item.title || 'Imagen de galería'}
                                            className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                                        />

                                        <div className="absolute inset-0 bg-gradient-to-b from-black/5 via-transparent to-black/65" />

                                        <div className="absolute left-3 top-3 flex flex-wrap gap-2">
                                            <span
                                                className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] backdrop-blur ${item.is_active
                                                    ? 'bg-emerald-50/95 text-emerald-700 ring-1 ring-emerald-200'
                                                    : 'bg-amber-50/95 text-amber-800 ring-1 ring-amber-200'
                                                    }`}
                                            >
                                                {item.is_active ? 'Visible' : 'Oculta'}
                                            </span>

                                            {item.service_id && (
                                                <span className="rounded-full bg-[#C8942E]/95 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-white">
                                                    Servicio
                                                </span>
                                            )}
                                        </div>

                                        <div className="absolute bottom-3 left-3 right-3">
                                            <h3 className="line-clamp-1 text-xl font-black text-white drop-shadow">
                                                {item.title || 'Sin título'}
                                            </h3>

                                            <p className="mt-1 line-clamp-1 text-sm font-semibold text-white/85">
                                                Posición {item.display_order}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="p-4">
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between gap-3">
                                                <p className="min-w-0 truncate text-sm font-black text-slate-950">
                                                    {item.service?.name ?? 'Sin servicio'}
                                                </p>

                                                <span
                                                    className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${item.is_active
                                                        ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                                                        : 'bg-amber-50 text-amber-800 ring-1 ring-amber-200'
                                                        }`}
                                                >
                                                    {item.is_active ? 'Visible' : 'Oculta'}
                                                </span>
                                            </div>

                                            <p className="text-xs font-bold text-slate-400">
                                                Posición {item.display_order}
                                            </p>
                                        </div>

                                        <div className="mt-4 flex gap-2">
                                            <AdminGalleryEditForm
                                                item={{
                                                    id: item.id,
                                                    title: item.title,
                                                    display_order: item.display_order,
                                                    is_active: item.is_active,
                                                    barber_id: item.barber_id,
                                                    service_id: item.service_id,
                                                    media_url: item.media_url,
                                                    public_id: item.public_id,
                                                }}
                                                barbers={barbers}
                                                services={services}
                                                allowBarberAssignment={isFullAdmin}
                                                canEdit={canEdit}
                                                subscriptionBlockReason={subscriptionBlockReason}
                                            />

                                            <DeleteGalleryItemButton
                                                id={item.id}
                                                canDelete={canEdit}
                                                subscriptionBlockReason={subscriptionBlockReason}
                                            />
                                        </div>
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