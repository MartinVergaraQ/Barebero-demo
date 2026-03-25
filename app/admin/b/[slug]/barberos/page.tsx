import { redirect } from 'next/navigation'
import { createClient } from '@/src/lib/supabase/server'
import { getBusinessBySlug } from '@/src/features/business/api/get-business-by-slug'
import { getBarbersAdmin } from '@/src/features/barbers/api/get-barbers-admin'
import { AdminBarberForm } from '@/src/features/barbers/components/admin-barber-form'
import { AdminBarberEditForm } from '@/src/features/barbers/components/admin-barber-edit-form'
import { canManageCatalog } from '@/src/features/auth/utils/admin-access'

type AdminBarberosPageProps = {
    params: Promise<{
        slug: string
    }>
}

export default async function AdminBarberosPage({
    params,
}: AdminBarberosPageProps) {
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

    const barbers = await getBarbersAdmin(business.id)

    return (
        <main className="p-8">
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <p className="text-sm text-slate-500">{business.name}</p>
                    <h1 className="mb-6 text-3xl font-bold">Barberos</h1>
                </div>
            </div>

            <AdminBarberForm businessId={business.id} />

            <section>
                <h2 className="mb-4 text-xl font-semibold">Lista de barberos</h2>

                {barbers.length === 0 ? (
                    <p>No hay barberos todavía.</p>
                ) : (
                    <div className="space-y-4">
                        {barbers.map((barber) => (
                            <article
                                key={barber.id}
                                className="rounded-xl border p-4 shadow-sm"
                            >
                                <h3 className="text-lg font-semibold">{barber.name}</h3>

                                <div className="mt-2 space-y-1 text-sm text-gray-700">
                                    <p><span className="font-medium">Slug:</span> {barber.slug}</p>
                                    <p><span className="font-medium">Especialidad:</span> {barber.specialty || '-'}</p>
                                    <p><span className="font-medium">Bio:</span> {barber.bio || '-'}</p>
                                    <p><span className="font-medium">Foto URL:</span> {barber.photo_url || '-'}</p>
                                    <p><span className="font-medium">Activo:</span> {barber.is_active ? 'Sí' : 'No'}</p>
                                    <p><span className="font-medium">Orden:</span> {barber.display_order}</p>
                                    <p><span className="font-medium">WhatsApp:</span> {barber.whatsapp_phone || '-'}</p>
                                </div>

                                <AdminBarberEditForm barber={barber} />
                            </article>
                        ))}
                    </div>
                )}
            </section>
        </main>
    )
}