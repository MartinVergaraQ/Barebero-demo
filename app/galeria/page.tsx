import { getBusinessBySlug } from '@/src/features/business/api/get-business-by-slug'
import { getActiveGalleryItems } from '@/src/features/gallery/api/get-gallery-items'

export default async function GaleriaPage({
    params,
}: {
    params: Promise<{ slug: string }>
}) {
    const { slug } = await params
    const business = await getBusinessBySlug(slug)
    const data = await getActiveGalleryItems(business.id)

    return (
        <main className="p-8">
            <h1 className="mb-6 text-3xl font-bold">Galería</h1>

            {!data || data.length === 0 ? (
                <p>No hay imágenes para mostrar.</p>
            ) : (
                <div className="grid gap-4 md:grid-cols-3">
                    {data.map((item) => (
                        <article key={item.id} className="rounded-xl border p-4">
                            <img
                                src={item.media_url}
                                alt={item.title || 'Imagen de galería'}
                                className="mb-3 h-64 w-full rounded-lg object-cover"
                            />
                            <p className="font-medium">{item.title || 'Sin título'}</p>
                        </article>
                    ))}
                </div>
            )}
        </main>
    )
}