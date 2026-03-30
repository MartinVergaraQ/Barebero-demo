import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/src/lib/supabase/server'
import { getSiteContentMap } from '@/src/features/site-content/api/get-site-content'
import { getActiveServices } from '@/src/features/services/api/get-services'
import { getActiveBarbers } from '@/src/features/barbers/api/get-barber'
import { getPublicReviews } from '@/src/features/reviews/api/get-public-reviews'
import { getActiveGalleryItems } from '@/src/features/gallery/api/get-gallery-items'
import { ReviewsSection } from '@/src/features/reviews/components/reviews-section'
import { PublicGallerySection } from '@/src/features/gallery/components/PublicGallerySection'

type BusinessRow = {
    id: string
    name: string
    slug: string
    phone: string | null
    email: string | null
    address: string | null
    city: string | null
    country: string | null
    instagram_url: string | null
    whatsapp_url: string | null
    logo_url: string | null
    cover_url: string | null
    description: string | null
    timezone: string | null
}

type BusinessPageProps = {
    params: Promise<{
        slug: string
    }>
    searchParams?: Promise<{
        tab?: string
    }>
}

const PRIMARY = '#B7791F'
const PRIMARY_SOFT = '#F4E7D3'

function formatPrice(price: number | string) {
    const numericPrice = typeof price === 'string' ? Number(price) : price
    if (Number.isNaN(numericPrice)) return '$0'

    return new Intl.NumberFormat('es-CL', {
        style: 'currency',
        currency: 'CLP',
        maximumFractionDigits: 0,
    }).format(numericPrice)
}

function getAverageRating(reviews: Array<{ rating: number }>) {
    if (!reviews.length) return '0.0'
    const avg = reviews.reduce((acc, review) => acc + review.rating, 0) / reviews.length
    return avg.toFixed(1)
}

function getInitials(name: string) {
    return name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join('')
}

export default async function BusinessPage({
    params,
    searchParams,
}: BusinessPageProps) {
    const { slug } = await params
    const query = await searchParams
    const tab = query?.tab ?? 'services'

    const supabase = await createClient()

    const { data: business, error: businessError } = await supabase
        .from('businesses')
        .select(`
      id,
      name,
      slug,
      phone,
      email,
      address,
      city,
      country,
      instagram_url,
      whatsapp_url,
      logo_url,
      cover_url,
      description,
      timezone
    `)
        .eq('slug', slug)
        .single()

    if (businessError || !business) {
        notFound()
    }

    const typedBusiness = business as BusinessRow
    const businessId = typedBusiness.id
    const businessSlug = typedBusiness.slug

    const [contentMap, services, barbers, reviews, galleryItems] = await Promise.all([
        getSiteContentMap(businessId),
        getActiveServices(businessId),
        getActiveBarbers(businessId),
        getPublicReviews(businessId),
        getActiveGalleryItems(businessId),
    ])

    const businessName =
        (contentMap.business_name as string) ||
        typedBusiness.name ||
        'The Gentry Barbería'

    const businessCategory =
        (contentMap.business_category as string) ||
        'Barbería Premium'

    const businessAddress =
        (contentMap.business_address as string) ||
        typedBusiness.address ||
        'Av. Providencia 1234, Santiago'

    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        businessAddress
    )}`

    const aboutText =
        (contentMap.about_text as string) ||
        typedBusiness.description ||
        'Somos una barbería moderna enfocada en entregar una experiencia profesional, cercana y fácil de reservar.'

    const heroImage =
        (contentMap.hero_image_url as string) ||
        typedBusiness.cover_url ||
        'https://images.unsplash.com/photo-1621605815971-fbc98d665033?auto=format&fit=crop&w=1200&q=80'

    const averageRating = getAverageRating(reviews)

    const tabs = [
        { key: 'services', label: 'Servicios' },
        { key: 'gallery', label: 'Trabajos' },
        { key: 'reviews', label: 'Reseñas' },
        { key: 'details', label: 'Detalles' },
    ]

    return (
        <main className="min-h-screen bg-[#f8f6f6] text-slate-900">
            <div className="mx-auto w-full max-w-7xl bg-[#f8f6f6] pb-28">
                <section className="relative h-64 w-full overflow-hidden bg-slate-900 md:h-80 lg:h-[420px]">
                    <div
                        className="absolute inset-0 bg-cover bg-center"
                        style={{ backgroundImage: `url('${heroImage}')` }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-black/40 to-transparent" />

                    <div className="absolute left-4 right-4 top-4 flex items-center justify-between md:left-6 md:right-6 lg:left-8 lg:right-8">
                        <Link
                            href={`/b/${businessSlug}?tab=services`}
                            className="flex h-11 w-11 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur"
                        >
                            ←
                        </Link>
                    </div>
                </section>

                <section className="relative -mt-12 px-4 md:px-6 lg:px-8">
                    <div className="mx-auto max-w-5xl rounded-[24px] border border-slate-100 bg-white p-6 shadow-xl md:p-8">
                        <div className="text-center">
                            <h1 className="text-3xl font-black md:text-4xl">{businessName}</h1>
                            <p
                                className="mt-2 text-sm font-bold uppercase tracking-[0.18em] md:text-base"
                                style={{ color: PRIMARY }}
                            >
                                {businessCategory}
                            </p>
                            <p className="mt-3 text-sm text-slate-500 md:text-base">{businessAddress}</p>
                        </div>

                        <div className="mt-6 grid grid-cols-3 border-t border-slate-100 pt-6 text-center">
                            <div>
                                <p className="text-2xl font-black md:text-3xl">{averageRating}</p>
                                <p className="text-xs uppercase tracking-wide text-slate-400 md:text-sm">Rating</p>
                            </div>
                            <div className="border-x border-slate-100">
                                <p className="text-2xl font-black md:text-3xl">{services.length}</p>
                                <p className="text-xs uppercase tracking-wide text-slate-400 md:text-sm">Servicios</p>
                            </div>
                            <div>
                                <p className="text-2xl font-black md:text-3xl">{reviews.length}</p>
                                <p className="text-xs uppercase tracking-wide text-slate-400 md:text-sm">Reseñas</p>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="sticky top-0 z-20 mt-4 border-b border-slate-200 bg-[#f8f6f6]">
                    <div className="mx-auto flex max-w-6xl px-2 md:px-6">
                        {tabs.map((item) => {
                            const active = tab === item.key

                            return (
                                <Link
                                    key={item.key}
                                    href={`/b/${businessSlug}?tab=${item.key}`}
                                    scroll
                                    className={`flex-1 border-b-2 py-4 text-center text-sm font-bold transition md:text-base ${active ? 'text-slate-900' : 'border-transparent text-slate-500'
                                        }`}
                                    style={{
                                        borderBottomColor: active ? PRIMARY : 'transparent',
                                        color: active ? PRIMARY : undefined,
                                    }}
                                >
                                    {item.label}
                                </Link>
                            )
                        })}
                    </div>
                </section>

                <section className="px-4 pt-5 md:px-6 lg:px-8">
                    <div className="mx-auto max-w-6xl">
                        {tab === 'services' && (
                            <div className="space-y-5">
                                <div className="relative">
                                    <input
                                        type="text"
                                        placeholder="Buscar un servicio..."
                                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm outline-none md:text-base"
                                    />
                                </div>

                                <div className="flex gap-2 overflow-x-auto pb-1">
                                    <button
                                        className="rounded-full px-5 py-2 text-sm font-semibold text-white"
                                        style={{ backgroundColor: PRIMARY }}
                                    >
                                        Todos
                                    </button>
                                    <button className="rounded-full border border-slate-200 bg-white px-5 py-2 text-sm font-semibold text-slate-600">
                                        Corte
                                    </button>
                                    <button className="rounded-full border border-slate-200 bg-white px-5 py-2 text-sm font-semibold text-slate-600">
                                        Barba
                                    </button>
                                    <button className="rounded-full border border-slate-200 bg-white px-5 py-2 text-sm font-semibold text-slate-600">
                                        Combos
                                    </button>
                                </div>

                                {services.length === 0 ? (
                                    <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-500">
                                        No hay servicios activos.
                                    </div>
                                ) : (
                                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                                        {services.map((service) => (
                                            <article
                                                key={service.id}
                                                className="flex h-full flex-col justify-between rounded-[24px] border border-slate-100 bg-white p-5 shadow-sm"
                                            >
                                                <div>
                                                    <h2 className="text-xl font-black leading-tight">{service.name}</h2>
                                                    <p className="mt-1 line-clamp-2 text-sm text-slate-500">
                                                        {service.description || 'Servicio profesional de barbería.'}
                                                    </p>

                                                    <div className="mt-3 flex items-center gap-3">
                                                        <span className="text-sm text-slate-400">
                                                            {service.duration_minutes} min
                                                        </span>
                                                        <span className="text-xl font-black" style={{ color: PRIMARY }}>
                                                            {formatPrice(service.price)}
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="mt-5">
                                                    <Link
                                                        href={`/b/${businessSlug}/reservar?serviceId=${service.id}`}
                                                        className="inline-flex w-full items-center justify-center rounded-2xl px-5 py-3 text-sm font-bold text-white shadow-lg"
                                                        style={{ backgroundColor: PRIMARY }}
                                                    >
                                                        Reservar
                                                    </Link>
                                                </div>
                                            </article>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {tab === 'gallery' && (
                            <PublicGallerySection
                                items={galleryItems}
                                barbers={barbers.map((barber) => ({
                                    id: barber.id,
                                    name: barber.name,
                                }))}
                            />
                        )}

                        {tab === 'reviews' && (
                            <ReviewsSection
                                reviews={reviews}
                                averageRating={averageRating}
                                businessId={businessId}
                                primary={PRIMARY}
                                primarySoft={PRIMARY_SOFT}
                            />
                        )}

                        {tab === 'details' && (
                            <div className="mx-auto max-w-5xl pb-8 md:pb-4 xl:max-w-[1100px]">
                                <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_420px] xl:gap-9">
                                    <div className="space-y-8">
                                        <div className="rounded-[24px] border border-slate-100 bg-white p-5 shadow-sm md:p-6">
                                            <div className="mb-3 flex items-center justify-between">
                                                <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">
                                                    Abierto ahora
                                                </span>
                                                <span className="text-sm font-bold text-slate-700">
                                                    {averageRating} ★ ({reviews.length})
                                                </span>
                                            </div>

                                            <h2 className="text-2xl font-black md:text-3xl">{businessName}</h2>
                                            <p className="mt-1 text-sm text-slate-500">{businessCategory}</p>

                                            <Link
                                                href={`/b/${businessSlug}/reservar`}
                                                className="mt-5 inline-flex w-full items-center justify-center rounded-2xl px-4 py-4 text-base font-bold text-white"
                                                style={{ backgroundColor: PRIMARY }}
                                            >
                                                Reservar ahora
                                            </Link>
                                        </div>

                                        <section>
                                            <h3 className="text-xl font-black">Sobre nosotros</h3>
                                            <p className="mt-3 max-w-2xl leading-7 text-slate-600">{aboutText}</p>
                                        </section>

                                        <section>
                                            <div className="flex items-center justify-between gap-3">
                                                <h3 className="text-xl font-black">Ubicación</h3>

                                                <a
                                                    href={mapsUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="hidden rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 md:inline-flex md:items-center md:justify-center"
                                                >
                                                    Cómo llegar
                                                </a>
                                            </div>

                                            <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                                                <div className="h-64 w-full bg-slate-100 md:h-72">
                                                    <iframe
                                                        title={`Mapa de ${businessName}`}
                                                        src={`https://www.google.com/maps?q=${encodeURIComponent(
                                                            businessAddress
                                                        )}&z=15&output=embed`}
                                                        className="h-full w-full border-0"
                                                        loading="lazy"
                                                        referrerPolicy="no-referrer-when-downgrade"
                                                    />
                                                </div>

                                                <div className="border-t border-slate-100 px-5 py-4">
                                                    <p className="text-sm font-bold uppercase tracking-[0.16em] text-slate-400">
                                                        Dirección
                                                    </p>
                                                    <p className="mt-2 text-lg font-bold text-slate-900">
                                                        {businessAddress}
                                                    </p>
                                                    <p className="mt-1 text-sm text-slate-500">
                                                        Atención presencial y reserva online
                                                    </p>

                                                    <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                                                        <a
                                                            href={mapsUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="inline-flex flex-1 items-center justify-center rounded-2xl px-4 py-3 text-sm font-bold text-white shadow-sm"
                                                            style={{ backgroundColor: PRIMARY }}
                                                        >
                                                            Cómo llegar
                                                        </a>

                                                        <Link
                                                            href={`/b/${businessSlug}/reservar`}
                                                            className="inline-flex flex-1 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-800"
                                                        >
                                                            Reservar cita
                                                        </Link>
                                                    </div>
                                                </div>
                                            </div>
                                        </section>
                                    </div>

                                    <div className="space-y-8">
                                        <section className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm md:p-6">
                                            <div className="mb-5 max-w-md">
                                                <p
                                                    className="text-xs font-bold uppercase tracking-[0.18em]"
                                                    style={{ color: PRIMARY }}
                                                >
                                                    Equipo
                                                </p>
                                                <h3 className="mt-2 text-xl font-black md:text-2xl">
                                                    Elige tu barbero
                                                </h3>
                                                <p className="mt-2 text-sm text-slate-500 md:text-base">
                                                    Reserva directamente con el profesional que prefieras.
                                                </p>
                                            </div>

                                            {barbers.length === 0 ? (
                                                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                                                    No hay barberos activos por ahora.
                                                </div>
                                            ) : (
                                                <div className="space-y-4 2xl:grid 2xl:grid-cols-2 2xl:gap-4 2xl:space-y-0">
                                                    {barbers.slice(0, 4).map((barber) => (
                                                        <article
                                                            key={barber.id}
                                                            className="mx-auto w-full max-w-[360px] overflow-hidden rounded-[24px] border border-slate-100 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md xl:max-w-[380px]"
                                                        >
                                                            <div className="relative h-40 w-full overflow-hidden bg-slate-100 lg:h-[120px] xl:h-[130px] 2xl:h-[140px]">
                                                                {barber.photo_url ? (
                                                                    <img
                                                                        src={barber.photo_url}
                                                                        alt={barber.name}
                                                                        className="h-full w-full object-cover object-center"
                                                                    />
                                                                ) : (
                                                                    <div className="flex h-full w-full items-center justify-center text-2xl font-black text-slate-500">
                                                                        {getInitials(barber.name)}
                                                                    </div>
                                                                )}
                                                            </div>

                                                            <div className="p-4 lg:p-3 xl:p-4">
                                                                <p className="text-lg font-black text-slate-900 lg:text-base xl:text-lg">
                                                                    {barber.name}
                                                                </p>
                                                                <p className="mt-1 text-sm text-slate-500">
                                                                    {barber.specialty || 'Barbero profesional'}
                                                                </p>

                                                                <Link
                                                                    href={`/b/${businessSlug}/reservar?barberId=${barber.id}`}
                                                                    className="mt-3 inline-flex w-full items-center justify-center rounded-2xl px-4 py-2 text-sm font-bold text-white"
                                                                    style={{ backgroundColor: PRIMARY }}
                                                                >
                                                                    Reservar con {barber.name.split(' ')[0]}
                                                                </Link>
                                                            </div>
                                                        </article>
                                                    ))}
                                                </div>
                                            )}
                                        </section>

                                        <section>
                                            <h3 className="text-xl font-black">Horarios</h3>
                                            <div className="mt-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                                                {[
                                                    ['Lunes', '09:00 - 20:00'],
                                                    ['Martes', '09:00 - 20:00'],
                                                    ['Miércoles', '09:00 - 20:00'],
                                                    ['Jueves', '09:00 - 20:00'],
                                                    ['Viernes', '09:00 - 21:00'],
                                                    ['Sábado', '10:00 - 15:00'],
                                                    ['Domingo', 'Cerrado'],
                                                ].map(([day, hours]) => (
                                                    <div
                                                        key={day}
                                                        className="flex items-center justify-between border-b border-slate-100 py-3 last:border-b-0"
                                                    >
                                                        <span className="text-slate-600">{day}</span>
                                                        <span
                                                            className={`font-medium ${day === 'Domingo' ? 'text-slate-400' : ''
                                                                }`}
                                                        >
                                                            {hours}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </section>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </section>

                <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-200 bg-white/90 backdrop-blur md:hidden">
                    <div className="mx-auto flex max-w-md items-center justify-around px-4 py-3">
                        <Link
                            href={`/b/${businessSlug}?tab=services`}
                            className="flex flex-col items-center gap-1"
                            style={{ color: PRIMARY }}
                        >
                            <span className="text-lg">⌕</span>
                            <span className="text-[10px] font-bold uppercase tracking-wider">Explorar</span>
                        </Link>

                        <Link
                            href={`/b/${businessSlug}/reservar`}
                            className="flex flex-col items-center gap-1 text-slate-400"
                        >
                            <span className="text-lg">◫</span>
                            <span className="text-[10px] font-bold uppercase tracking-wider">Citas</span>
                        </Link>
                    </div>
                </nav>
            </div>
        </main>
    )
}