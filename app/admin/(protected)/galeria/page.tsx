import { getBusinessId } from '@/src/features/business/api/get-business-id'
import { getGalleryItemsAdmin } from '@/src/features/gallery/api/get-gallery-items-admin'
import { AdminGalleryForm } from '@/src/features/gallery/components/admin-gallery-form'
import { AdminGalleryEditForm } from '@/src/features/gallery/components/admin-gallery-edit-form'
import { DeleteGalleryItemButton } from '@/src/features/gallery/components/delete-gallery-item-button'

export default async function AdminGaleriaPage() {
    const businessId = await getBusinessId()

    if (!businessId) {
        return (
            <main>
                <h1 className="mb-6 text-3xl font-bold">Galería</h1>
                <div className="mb-8 rounded-lg border border-yellow-300 bg-yellow-50 p-4 text-yellow-800">
                    No se encontró business_id base.
                </div>
            </main>
        )
    }

    const items = await getGalleryItemsAdmin(businessId)

    return (
        <main>
            <h1 className="mb-6 text-3xl font-bold">Galería</h1>

            <AdminGalleryForm businessId={businessId} />

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