import { redirect } from 'next/navigation'
import { createClient } from '@/src/lib/supabase/server'
import { getBusinessBySlug } from '@/src/features/business/api/get-business-by-slug'
import { getGalleryItemsAdmin } from '@/src/features/gallery/api/get-gallery-items-admin'
import { AdminGalleryForm } from '@/src/features/gallery/components/admin-gallery-form'
import { AdminGalleryEditForm } from '@/src/features/gallery/components/admin-gallery-edit-form'
import { DeleteGalleryItemButton } from '@/src/features/gallery/components/delete-gallery-item-button'
import { canManageCatalog } from '@/src/features/auth/utils/admin-access'

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

    const items = await getGalleryItemsAdmin(business.id)

    return (
        <main>
            <div className="mb-6">
                <p className="text-sm text-slate-500">{business.name}</p>
                <h1 className="text-3xl font-bold">Galería</h1>
            </div>

            <AdminGalleryForm businessId={business.id} />

            <section>
                <h2 className="mb-4 text-xl font-semibold">Items de galería</h2>

                {items.length === 0 ? (
                    <p>No hay imágenes todavía.</p>
                ) : (
                    <div className="grid gap-4 md:grid-cols-3">
                        {items.map((item) => (
                            <article key={item.id} className="rounded-xl border p-4">
                                <img
                                    src={item.media_url}
                                    alt={item.title || 'Imagen de galería'}
                                    className="mb-3 h-48 w-full rounded-lg object-cover"
                                />
                                <p className="font-medium">{item.title || 'Sin título'}</p>
                                <p className="text-sm text-gray-600">Orden: {item.display_order}</p>
                                <p className="text-sm text-gray-600">
                                    Activa: {item.is_active ? 'Sí' : 'No'}
                                </p>

                                <AdminGalleryEditForm
                                    item={{
                                        id: item.id,
                                        title: item.title,
                                        display_order: item.display_order,
                                        is_active: item.is_active,
                                    }}
                                />

                                <DeleteGalleryItemButton
                                    id={item.id}
                                    publicId={item.public_id}
                                />
                            </article>
                        ))}
                    </div>
                )}
            </section>
        </main>
    )
}