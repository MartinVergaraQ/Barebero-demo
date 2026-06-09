import { redirect } from 'next/navigation'
import { createClient } from '@/src/lib/supabase/server'
import { getBusinessBySlug } from '@/src/features/business/api/get-business-by-slug'
import { getGalleryItemsAdmin } from '@/src/features/gallery/api/get-gallery-items-admin'
import { getGalleryItemsByBarber } from '@/src/features/gallery/api/get-gallery-items-by-barber'
import { AdminGalleryForm } from '@/src/features/gallery/components/admin-gallery-form'
import { AdminGalleryEditForm } from '@/src/features/gallery/components/admin-gallery-edit-form'
import { DeleteGalleryItemButton } from '@/src/features/gallery/components/delete-gallery-item-button'
import { canManageCatalog } from '@/src/features/auth/utils/admin-access'
import { getBarberByProfile } from '@/src/features/barbers/api/get-barber-by-profile'
import {
    isBarberRole,
    isFullAdminRole,
} from '@/src/features/auth/utils/admin-scope'
import { getBarbersAdmin } from '@/src/features/barbers/api/get-barbers-admin'
import { getActiveServices } from '@/src/features/services/api/get-services'

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

    if (profileError || !profile || !canManageCatalog(profile.role)) {
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

    const isBarber = isBarberRole(profile.role)
    const isFullAdmin = isFullAdminRole(profile.role)

    const [items, barbers, services] = await Promise.all([
        isFullAdmin
            ? getGalleryItemsAdmin(business.id)
            : getGalleryItemsByBarber(ownBarber!.id),
        isFullAdmin ? getBarbersAdmin(business.id) : Promise.resolve([]),
        getActiveServices(business.id),
    ])

    const activeItems = items.filter((item) => item.is_active).length
    const inactiveItems = items.length - activeItems
    const withService = items.filter((item) => !!item.service_id).length

    return (
        <main className="min-h-screen bg-[#F4EFE5] px-4 py-6 text-slate-950 md:px-8 md:py-8">
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
                            Administra imágenes de trabajos realizados. Estas fotos ayudan a que el cliente vea la calidad del servicio antes de reservar.
                        </p>
                    </div>

                    <div className="w-fit rounded-full bg-[#C8942E]/10 px-4 py-2 text-xs font-black text-[#8A5D16]">
                        {items.length} imagen{items.length === 1 ? '' : 'es'}
                    </div>
                </header>

                <section className="grid gap-4 md:grid-cols-3">
                    <article className="rounded-[26px] border border-black/10 bg-[#FFFCF4] p-5 shadow-[0_18px_45px_rgba(15,23,42,0.07)]">
                        <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-500">
                            Activas
                        </p>

                        <h2 className="mt-3 text-4xl font-black text-slate-950">
                            {activeItems}
                        </h2>

                        <p className="mt-2 text-sm leading-6 text-slate-500">
                            Imágenes visibles en la galería pública.
                        </p>
                    </article>

                    <article className="rounded-[26px] border border-black/10 bg-[#FFFCF4] p-5 shadow-[0_18px_45px_rgba(15,23,42,0.07)]">
                        <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-500">
                            Inactivas
                        </p>

                        <h2 className="mt-3 text-4xl font-black text-slate-950">
                            {inactiveItems}
                        </h2>

                        <p className="mt-2 text-sm leading-6 text-slate-500">
                            Ocultas temporalmente del sitio público.
                        </p>
                    </article>

                    <article className="rounded-[26px] border border-black/10 bg-[#FFFCF4] p-5 shadow-[0_18px_45px_rgba(15,23,42,0.07)]">
                        <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-500">
                            Con servicio
                        </p>

                        <h2 className="mt-3 text-4xl font-black text-slate-950">
                            {withService}
                        </h2>

                        <p className="mt-2 text-sm leading-6 text-slate-500">
                            Fotos asociadas a un servicio del catálogo.
                        </p>
                    </article>
                </section>

                <AdminGalleryForm
                    businessId={business.id}
                    barberId={isBarber ? ownBarber!.id : undefined}
                    barbers={barbers}
                    services={services}
                    allowBarberAssignment={isFullAdmin}
                />

                <section className="overflow-hidden rounded-[28px] border border-black/10 bg-[#FFFCF4] shadow-[0_18px_45px_rgba(15,23,42,0.07)]">
                    <div className="flex flex-col gap-2 border-b border-black/10 px-5 py-5 md:flex-row md:items-center md:justify-between md:px-6">
                        <div>
                            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#C8942E]">
                                Trabajos
                            </p>

                            <h2 className="mt-1 text-2xl font-black text-slate-950">
                                {isBarber ? 'Mis trabajos' : 'Items de galería'}
                            </h2>

                            <p className="mt-1 text-sm leading-6 text-slate-500">
                                Revisa, edita y elimina las imágenes publicadas.
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
                                    <div className="relative h-56 overflow-hidden bg-slate-100">
                                        <img
                                            src={item.media_url}
                                            alt={item.title || 'Imagen de galería'}
                                            className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                                        />

                                        <div className="absolute inset-0 bg-gradient-to-b from-black/5 via-transparent to-black/55" />

                                        <div className="absolute left-3 top-3 flex flex-wrap gap-2">
                                            <span
                                                className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] backdrop-blur ${item.is_active
                                                        ? 'bg-emerald-50/95 text-emerald-700 ring-1 ring-emerald-200'
                                                        : 'bg-white/90 text-slate-600 ring-1 ring-white/70'
                                                    }`}
                                            >
                                                {item.is_active ? 'Activa' : 'Inactiva'}
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
                                                Orden {item.display_order}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="p-4">
                                        <div className="space-y-2">
                                            {isFullAdmin && (
                                                <div className="rounded-2xl bg-[#FBF7EE] px-4 py-3 ring-1 ring-black/5">
                                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                                                        Servicio
                                                    </p>

                                                    <p className="mt-1 line-clamp-1 text-sm font-black text-slate-950">
                                                        {item.service?.name ?? 'Sin servicio asignado'}
                                                    </p>
                                                </div>
                                            )}

                                            <div className="rounded-2xl bg-[#FBF7EE] px-4 py-3 ring-1 ring-black/5">
                                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                                                    URL
                                                </p>

                                                <p className="mt-1 line-clamp-1 break-all text-xs font-semibold text-slate-500">
                                                    {item.media_url}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                                            <AdminGalleryEditForm
                                                item={{
                                                    id: item.id,
                                                    title: item.title,
                                                    display_order: item.display_order,
                                                    is_active: item.is_active,
                                                    barber_id: item.barber_id,
                                                    service_id: item.service_id,
                                                }}
                                                barbers={barbers}
                                                services={services}
                                                allowBarberAssignment={isFullAdmin}
                                            />

                                            <DeleteGalleryItemButton
                                                id={item.id}
                                                publicId={item.public_id}
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