import { supabase } from '@/src/lib/supabase/client'

export default async function GaleriaPage() {
    const { data, error } = await supabase
        .from('gallery_items')
        .select('id, title, media_url, display_order')
        .eq('is_active', true)
        .eq('type', 'image')
        .order('display_order', { ascending: true })

    if (error) {
        return (
            <main className="p-8">
                <h1 className="text-3xl font-bold">Galería</h1>
                <p className="mt-4 text-red-600">{error.message}</p>
            </main>
        )
    }

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