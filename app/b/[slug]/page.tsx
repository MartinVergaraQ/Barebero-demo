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
import { formatInTimeZone } from 'date-fns-tz'
import { BUSINESS_TIME_ZONE } from '@/src/features/booking/utils/datetime'
import { PublicServicesExplorer } from './components/public-services-explorer'


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
    updated_at: string | null
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
    timezone,
    updated_at
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

    const averageRating = getAverageRating(reviews)

    const tabs = [
        { key: 'services', label: 'Servicios' },
        { key: 'gallery', label: 'Trabajos' },
        { key: 'reviews', label: 'Reseñas' },
        { key: 'details', label: 'Detalles' },
    ]

    const schedule = [
        { dayKey: 'monday', label: 'Lunes', open: '09:00', close: '20:00', closed: false },
        { dayKey: 'tuesday', label: 'Martes', open: '09:00', close: '20:00', closed: false },
        { dayKey: 'wednesday', label: 'Miércoles', open: '09:00', close: '20:00', closed: false },
        { dayKey: 'thursday', label: 'Jueves', open: '09:00', close: '20:00', closed: false },
        { dayKey: 'friday', label: 'Viernes', open: '09:00', close: '21:00', closed: false },
        { dayKey: 'saturday', label: 'Sábado', open: '10:00', close: '15:00', closed: false },
        { dayKey: 'sunday', label: 'Domingo', open: null, close: null, closed: true },
    ] as const

    const weekdayMap: Record<string, string> = {
        Monday: 'monday',
        Tuesday: 'tuesday',
        Wednesday: 'wednesday',
        Thursday: 'thursday',
        Friday: 'friday',
        Saturday: 'saturday',
        Sunday: 'sunday',
    }

    function toMinutes(time: string) {
        const [hours, minutes] = time.split(':').map(Number)
        return hours * 60 + minutes
    }

    const now = new Date()
    const currentWeekday = weekdayMap[
        formatInTimeZone(now, BUSINESS_TIME_ZONE, 'EEEE')
    ]
    const currentTime = formatInTimeZone(now, BUSINESS_TIME_ZONE, 'HH:mm')
    const currentMinutes = toMinutes(currentTime)

    const todaySchedule = schedule.find((item) => item.dayKey === currentWeekday)

    const isOpenNow =
        !!todaySchedule &&
        !todaySchedule.closed &&
        !!todaySchedule.open &&
        !!todaySchedule.close &&
        currentMinutes >= toMinutes(todaySchedule.open) &&
        currentMinutes < toMinutes(todaySchedule.close)

    const hoursStatus = !todaySchedule
        ? 'Horarios no disponibles'
        : todaySchedule.closed
            ? 'Hoy está cerrado'
            : isOpenNow
                ? `Abierto ahora · Cierra a las ${todaySchedule.close}`
                : currentMinutes < toMinutes(todaySchedule.open!)
                    ? `Cerrado ahora · Abre hoy a las ${todaySchedule.open}`
                    : 'Cerrado por hoy'

    const FALLBACK_HERO_IMAGE =
        'https://images.unsplash.com/photo-1621605815971-fbc98d665033?auto=format&fit=crop&w=1600&q=85'

    function withCacheBuster(url: string, version?: string | null) {
        if (!version) return url

        const separator = url.includes('?') ? '&' : '?'
        return `${url}${separator}v=${encodeURIComponent(version)}`
    }

    const rawHeroImage = typedBusiness.cover_url || FALLBACK_HERO_IMAGE
    const heroImage = withCacheBuster(rawHeroImage, typedBusiness.updated_at)

    function getBarberWorkCount(barberId: string) {
        return galleryItems.filter((item) => item.barber_id === barberId).length
    }

    return (

        <main className="min-h-screen bg-[#f8f6f6] text-slate-900">
            <div className="mx-auto w-full max-w-7xl bg-[#f8f6f6] pb-28">
                <section className="relative -mt-[env(safe-area-inset-top)] h-[calc(235px+env(safe-area-inset-top))] w-full overflow-hidden bg-[#0b0907] pt-[env(safe-area-inset-top)] md:mt-0 md:h-80 md:pt-0 lg:h-[420px]">
                    <img
                        src={heroImage}
                        alt={businessName}
                        className="absolute inset-0 h-full w-full object-cover object-top"
                    />

                    <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/15 to-black/55" />

                    <div className="absolute left-4 right-4 top-[calc(0.85rem+env(safe-area-inset-top))] z-10 flex items-center justify-end md:left-6 md:right-6 md:top-6 lg:left-8 lg:right-8">
                        <a
                            href={mapsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-black/35 text-white shadow-[0_14px_34px_rgba(0,0,0,0.35)] backdrop-blur-md transition duration-300 hover:-translate-y-0.5 hover:border-white/35 hover:bg-white active:translate-y-0 active:scale-95 md:h-12 md:w-auto md:px-4"
                            aria-label="Abrir ubicación en Google Maps"
                        >
                            <span className="hidden text-sm font-black uppercase tracking-[0.16em] text-white transition group-hover:text-slate-950 md:inline">
                                Mapa
                            </span>

                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="24"
                                height="24"
                                viewBox="0 0 24 24"
                                fill="none"
                                className="md:ml-2"
                            >
                                <path
                                    d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"
                                    fill="#EA4335"
                                />
                                <circle cx="12" cy="9" r="2.5" fill="white" />
                            </svg>
                        </a>
                    </div>
                </section>

                <section className="relative z-10 -mt-7 px-4 md:-mt-12 md:px-6 lg:px-8">
                    <div className="mx-auto max-w-5xl">
                        <div className="group overflow-hidden rounded-[26px] border border-white/70 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.13)] transition duration-500 motion-safe:animate-[heroCardIn_700ms_ease-out] md:rounded-[34px]">
                            <div className="relative">
                                <div
                                    className="pointer-events-none absolute inset-0"
                                    style={{
                                        background:
                                            'radial-gradient(circle at top left, rgba(183,121,31,0.14), transparent 32%), linear-gradient(135deg, rgba(255,255,255,0.96), rgba(250,247,241,0.78))',
                                    }}
                                />

                                <div className="relative px-4 py-4 text-center md:px-10 md:py-8">
                                    <div className="flex justify-center">
                                        <div
                                            className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 shadow-sm ring-1 ${isOpenNow
                                                ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                                                : 'bg-slate-100 text-slate-600 ring-slate-200'
                                                }`}
                                        >
                                            <span className="relative flex h-2 w-2">
                                                {isOpenNow && (
                                                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                                                )}

                                                <span
                                                    className={`relative inline-flex h-2 w-2 rounded-full ${isOpenNow ? 'bg-emerald-500' : 'bg-slate-400'
                                                        }`}
                                                />
                                            </span>

                                            <span className="text-[9px] font-black uppercase tracking-[0.22em]">
                                                {isOpenNow ? 'Abierto ahora' : 'Cerrado ahora'}
                                            </span>
                                        </div>
                                    </div>

                                    <p
                                        className="mt-3 text-[10px] font-black uppercase tracking-[0.32em]"
                                        style={{ color: PRIMARY }}
                                    >
                                        {businessCategory}
                                    </p>

                                    <h1 className="mt-1.5 text-[22px] font-black leading-tight tracking-tight text-slate-950 md:mt-3 md:text-4xl">
                                        {businessName}
                                    </h1>

                                    <div className="mt-1.5 flex items-center justify-center gap-2 text-xs font-bold text-slate-500 md:text-sm">
                                        <span
                                            className="h-1.5 w-1.5 rounded-full"
                                            style={{ backgroundColor: PRIMARY }}
                                        />
                                        <span className="line-clamp-1">{businessAddress}</span>
                                    </div>

                                    <div className="mt-4 grid grid-cols-3 gap-1.5 md:mt-5 md:gap-4">
                                        <div className="rounded-2xl bg-white/70 px-2 py-2.5 ring-1 ring-slate-100/80 md:px-3 md:py-3">
                                            <div className="flex items-center justify-center gap-1">
                                                <p className="text-lg font-black leading-none text-slate-950 md:text-3xl">
                                                    {averageRating}
                                                </p>
                                                <span
                                                    className="text-sm leading-none md:text-base"
                                                    style={{ color: PRIMARY }}
                                                >
                                                    ★
                                                </span>
                                            </div>
                                            <p className="mt-1 text-[8px] font-black uppercase tracking-[0.18em] text-slate-400 md:text-[10px]">
                                                Rating
                                            </p>
                                        </div>

                                        <div className="rounded-2xl bg-white/70 px-2 py-2.5 ring-1 ring-slate-100/80 md:px-3 md:py-3">
                                            <p className="text-lg font-black leading-none text-slate-950 md:text-3xl">
                                                {services.length}
                                            </p>
                                            <p className="mt-1 text-[8px] font-black uppercase tracking-[0.18em] text-slate-400 md:text-[10px]">
                                                Servicios
                                            </p>
                                        </div>

                                        <div className="rounded-2xl bg-white/70 px-2 py-2.5 ring-1 ring-slate-100/80 md:px-3 md:py-3">
                                            <p className="text-lg font-black leading-none text-slate-950 md:text-3xl">
                                                {reviews.length}
                                            </p>
                                            <p className="mt-1 text-[8px] font-black uppercase tracking-[0.18em] text-slate-400 md:text-[10px]">
                                                Reseñas
                                            </p>
                                        </div>
                                    </div>

                                    <div className="mt-4 md:mt-6">
                                        <Link
                                            href={`/b/${businessSlug}/reservar`}
                                            className="inline-flex h-12 w-full items-center justify-center rounded-2xl px-5 text-sm font-black uppercase tracking-wide text-white shadow-[0_14px_32px_rgba(183,121,31,0.28)] transition duration-300 hover:-translate-y-0.5 hover:brightness-105 active:translate-y-0 active:scale-[0.99] md:h-14"
                                            style={{ backgroundColor: PRIMARY }}
                                        >
                                            Reservar ahora
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="sticky top-0 z-20 mt-4 border-b border-slate-200 bg-[#f8f6f6]/95 backdrop-blur">
                    <div className="mx-auto flex max-w-6xl px-2 md:px-6">
                        {tabs.map((item) => {
                            const active = tab === item.key

                            return (
                                <Link
                                    key={item.key}
                                    href={`/b/${businessSlug}?tab=${item.key}`}
                                    scroll
                                    className={`relative flex-1 py-4 text-center text-sm font-bold transition md:text-base ${active ? 'text-slate-900' : 'text-slate-500'
                                        }`}
                                    style={{
                                        color: active ? PRIMARY : undefined,
                                    }}
                                >
                                    {item.label}

                                    <span
                                        className={`absolute bottom-0 left-1/2 h-0.5 -translate-x-1/2 rounded-full transition-all ${active ? 'w-20 opacity-100' : 'w-0 opacity-0'
                                            }`}
                                        style={{ backgroundColor: PRIMARY }}
                                    />
                                </Link>
                            )
                        })}
                    </div>
                </section>

                <section className="px-4 pt-5 md:px-6 lg:px-8">
                    <div className="mx-auto max-w-6xl">
                        {tab === 'services' && (
                            <PublicServicesExplorer
                                services={services}
                                businessSlug={businessSlug}
                                primary={PRIMARY}
                            />
                        )}

                        {tab === 'gallery' && (
                            <PublicGallerySection
                                items={galleryItems}
                                businessSlug={businessSlug}
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
                            <div className="mx-auto max-w-6xl pb-24">
                                <div className="space-y-5 md:space-y-7">
                                    <section className="relative overflow-hidden rounded-[28px] border border-white bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.09)] md:rounded-[32px] md:p-7">
                                        <div
                                            className="pointer-events-none absolute inset-0"
                                            style={{
                                                background:
                                                    'radial-gradient(circle at top left, rgba(183,121,31,0.12), transparent 32%), linear-gradient(135deg, rgba(255,255,255,0.96), rgba(250,247,241,0.72))',
                                            }}
                                        />

                                        <div className="relative">
                                            <div
                                                className={`inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-[10px] font-black uppercase tracking-[0.18em] ring-1 md:text-xs ${isOpenNow
                                                    ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                                                    : 'bg-slate-100 text-slate-600 ring-slate-200'
                                                    }`}
                                            >
                                                <span className="relative flex h-2.5 w-2.5">
                                                    {isOpenNow && (
                                                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                                                    )}

                                                    <span
                                                        className={`relative inline-flex h-2.5 w-2.5 rounded-full ${isOpenNow ? 'bg-emerald-500' : 'bg-slate-400'
                                                            }`}
                                                    />
                                                </span>

                                                {isOpenNow ? 'Abierto ahora' : 'Cerrado ahora'}
                                            </div>

                                            <p
                                                className="mt-5 text-[11px] font-black uppercase tracking-[0.28em] md:text-xs"
                                                style={{ color: PRIMARY }}
                                            >
                                                {businessCategory}
                                            </p>

                                            <h2 className="mt-2 text-[30px] font-black leading-tight tracking-tight text-slate-950 md:text-4xl">
                                                {businessName}
                                            </h2>

                                            <p className="mt-3 text-base font-semibold leading-6 text-slate-600 md:text-lg">
                                                {hoursStatus}
                                            </p>

                                            <div className="mt-4 rounded-[20px] border border-slate-100 bg-white/75 px-4 py-3 text-center shadow-sm">
                                                <div className="flex items-center justify-center gap-2">
                                                    <p className="text-4xl font-black leading-none text-slate-950 md:text-5xl">
                                                        {averageRating}
                                                    </p>

                                                    <span
                                                        className="text-4xl leading-none md:text-5xl"
                                                        style={{ color: PRIMARY }}
                                                    >
                                                        ★
                                                    </span>
                                                </div>

                                                <p className="mt-2 text-xs font-black uppercase tracking-[0.22em] text-slate-400">
                                                    {reviews.length} reseña{reviews.length === 1 ? '' : 's'}
                                                </p>
                                            </div>

                                            <div className="mt-5 grid gap-3 sm:grid-cols-2">
                                                <Link
                                                    href={`/b/${businessSlug}/reservar`}
                                                    className="inline-flex w-full items-center justify-center rounded-2xl px-5 py-4 text-sm font-black uppercase tracking-wide text-white shadow-[0_14px_32px_rgba(183,121,31,0.26)] transition duration-300 hover:-translate-y-0.5 hover:brightness-105 active:scale-[0.98]"
                                                    style={{ backgroundColor: PRIMARY }}
                                                >
                                                    Reservar ahora
                                                </Link>

                                                <a
                                                    href="#horarios"
                                                    className="inline-flex w-full items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-black uppercase tracking-wide text-slate-800 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:border-amber-200 active:scale-[0.98]"
                                                >
                                                    Ver horarios
                                                </a>
                                            </div>
                                        </div>
                                    </section>

                                    <section className="rounded-[28px] border border-white bg-white p-5 shadow-[0_16px_45px_rgba(15,23,42,0.08)] md:rounded-[32px] md:p-7">
                                        <div className="mb-3 flex items-center gap-3">
                                            <span
                                                className="h-px w-10"
                                                style={{ backgroundColor: PRIMARY }}
                                            />

                                            <p
                                                className="text-[11px] font-black uppercase tracking-[0.28em] md:text-xs"
                                                style={{ color: PRIMARY }}
                                            >
                                                Experiencia
                                            </p>
                                        </div>

                                        <h3 className="text-[28px] font-black leading-tight text-slate-950 md:text-4xl">
                                            Sobre nosotros
                                        </h3>

                                        <p className="mt-3 text-sm font-medium leading-6 text-slate-600 md:max-w-3xl md:text-lg md:leading-8">
                                            {aboutText}
                                        </p>
                                    </section>

                                    <section
                                        id="horarios"
                                        className="rounded-[28px] border border-white bg-white p-5 shadow-[0_16px_45px_rgba(15,23,42,0.08)] md:rounded-[32px] md:p-7"
                                    >
                                        <div className="mb-4 flex items-start justify-between gap-3">
                                            <div>
                                                <p
                                                    className="text-[11px] font-black uppercase tracking-[0.28em] md:text-xs"
                                                    style={{ color: PRIMARY }}
                                                >
                                                    Atención
                                                </p>

                                                <h3 className="mt-2 text-[28px] font-black leading-tight text-slate-950 md:text-4xl">
                                                    Horarios
                                                </h3>

                                                <p className="mt-2 text-sm font-medium leading-6 text-slate-500 md:text-base">
                                                    {hoursStatus}
                                                </p>
                                            </div>

                                            <span
                                                className={`shrink-0 rounded-full px-3 py-2 text-[11px] font-black uppercase tracking-[0.12em] ${isOpenNow
                                                    ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                                                    : 'bg-slate-100 text-slate-600 ring-1 ring-slate-200'
                                                    }`}
                                            >
                                                {isOpenNow ? 'Abierto' : 'Cerrado'}
                                            </span>
                                        </div>

                                        <div className="overflow-hidden rounded-[22px] border border-slate-100 bg-white">
                                            <div className="grid grid-cols-[1.25fr_1fr_1fr] bg-slate-50 px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.14em] text-slate-400 md:text-xs">
                                                <span>Día</span>
                                                <span className="text-center">Abre</span>
                                                <span className="text-center">Cierra</span>
                                            </div>

                                            {schedule.map((item) => {
                                                const isToday = item.dayKey === currentWeekday

                                                return (
                                                    <div
                                                        key={item.dayKey}
                                                        className={`grid grid-cols-[1.25fr_1fr_1fr] items-center border-t border-slate-100 px-4 py-3 text-sm md:py-4 ${isToday ? 'bg-amber-50/70' : 'bg-white'
                                                            }`}
                                                    >
                                                        <div className="flex min-w-0 items-center gap-2">
                                                            <span
                                                                className={`truncate ${isToday
                                                                    ? 'font-black text-slate-950'
                                                                    : 'font-medium text-slate-600'
                                                                    }`}
                                                            >
                                                                {item.label}
                                                            </span>

                                                            {isToday && (
                                                                <span
                                                                    className="rounded-full px-2 py-0.5 text-[10px] font-black uppercase"
                                                                    style={{
                                                                        backgroundColor: PRIMARY_SOFT,
                                                                        color: PRIMARY,
                                                                    }}
                                                                >
                                                                    Hoy
                                                                </span>
                                                            )}
                                                        </div>

                                                        <span className="text-center font-bold text-slate-700">
                                                            {item.closed ? '—' : item.open}
                                                        </span>

                                                        <span
                                                            className={`text-center font-bold ${item.closed ? 'text-slate-400' : 'text-slate-950'
                                                                }`}
                                                        >
                                                            {item.closed ? 'Cerrado' : item.close}
                                                        </span>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </section>

                                    <section className="rounded-[28px] border border-white bg-white p-5 shadow-[0_16px_45px_rgba(15,23,42,0.08)] md:rounded-[32px] md:p-7">
                                        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                                            <div>
                                                <p
                                                    className="text-[11px] font-black uppercase tracking-[0.28em] md:text-xs"
                                                    style={{ color: PRIMARY }}
                                                >
                                                    Ubicación
                                                </p>

                                                <h3 className="mt-2 text-[28px] font-black leading-tight text-slate-950 md:text-4xl">
                                                    Cómo llegar
                                                </h3>

                                                <p className="mt-2 text-sm leading-6 text-slate-500 md:text-base">
                                                    Encuéntranos fácilmente y reserva tu próxima cita en pocos pasos.
                                                </p>
                                            </div>

                                        </div>

                                        <div className="relative overflow-hidden rounded-[24px] border border-slate-100 bg-slate-100 shadow-inner">
                                            <div className="absolute left-3 top-3 z-10 rounded-full border border-white/70 bg-white/90 px-3 py-2 text-xs font-black text-slate-800 shadow-[0_10px_30px_rgba(15,23,42,0.12)] backdrop-blur md:left-4 md:top-4 md:px-4">
                                                📍 {businessAddress}
                                            </div>

                                            <iframe
                                                title={`Mapa de ${businessName}`}
                                                src={`https://www.google.com/maps?q=${encodeURIComponent(
                                                    businessAddress
                                                )}&z=15&output=embed`}
                                                className="h-[230px] w-full border-0 md:h-[340px]"
                                                loading="lazy"
                                                referrerPolicy="no-referrer-when-downgrade"
                                            />
                                        </div>

                                        <div className="mt-4 rounded-[22px] border border-slate-100 bg-slate-50/80 p-4 md:p-5">
                                            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400 md:text-xs">
                                                Dirección
                                            </p>

                                            <h4 className="mt-2 text-xl font-black text-slate-950 md:text-2xl">
                                                {businessAddress}
                                            </h4>

                                            <p className="mt-2 text-sm leading-6 text-slate-500 md:text-base">
                                                Atención presencial, reserva online y confirmación rápida para tu cita.
                                            </p>

                                            <div className="mt-4 flex flex-wrap gap-2">
                                                <span className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-slate-600 ring-1 ring-slate-100">
                                                    Reserva online
                                                </span>

                                                <span className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-slate-600 ring-1 ring-slate-100">
                                                    Atención presencial
                                                </span>

                                                <span
                                                    className="rounded-full px-3 py-1.5 text-xs font-bold"
                                                    style={{
                                                        backgroundColor: PRIMARY_SOFT,
                                                        color: PRIMARY,
                                                    }}
                                                >
                                                    Ubicación verificada
                                                </span>
                                            </div>
                                        </div>

                                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                            <a
                                                href={mapsUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex w-full items-center justify-center rounded-2xl px-5 py-4 text-sm font-black text-white shadow-[0_14px_32px_rgba(183,121,31,0.24)] transition duration-300 hover:-translate-y-0.5 hover:brightness-105 active:scale-[0.98]"
                                                style={{ backgroundColor: PRIMARY }}
                                            >
                                                Cómo llegar
                                            </a>

                                            <Link
                                                href={`/b/${businessSlug}/reservar`}
                                                className="inline-flex w-full items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-black text-slate-900 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:border-amber-200 active:scale-[0.98]"
                                            >
                                                Reservar cita
                                            </Link>
                                        </div>
                                    </section>

                                    <section className="rounded-[28px] border border-white bg-white p-5 shadow-[0_16px_45px_rgba(15,23,42,0.08)] md:rounded-[32px] md:p-7">
                                        <div className="mb-5 flex items-end justify-between gap-4">
                                            <div>
                                                <p
                                                    className="text-[11px] font-black uppercase tracking-[0.28em] md:text-xs"
                                                    style={{ color: PRIMARY }}
                                                >
                                                    Equipo
                                                </p>

                                                <h3 className="mt-2 text-2xl font-black leading-tight text-slate-950 md:text-4xl">
                                                    Elige tu barbero
                                                </h3>

                                                <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-slate-500 md:text-base">
                                                    Reserva con el profesional que prefieras y revisa sus trabajos recientes.
                                                </p>
                                            </div>

                                            {barbers.length > 0 && (
                                                <span className="hidden rounded-full bg-slate-50 px-4 py-2 text-xs font-black text-slate-600 ring-1 ring-slate-100 md:inline-flex">
                                                    {barbers.length} barbero{barbers.length === 1 ? '' : 's'}
                                                </span>
                                            )}
                                        </div>

                                        {barbers.length === 0 ? (
                                            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-sm font-medium text-slate-500">
                                                No hay barberos activos por ahora.
                                            </div>
                                        ) : (
                                            <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto pl-3 pr-5 pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:grid md:grid-cols-2 md:gap-4 md:overflow-visible md:px-0 md:pb-0 xl:grid-cols-3">
                                                {barbers.slice(0, 6).map((barber) => {
                                                    const workCount = getBarberWorkCount(barber.id)

                                                    return (
                                                        <article
                                                            key={barber.id}
                                                            className="group w-[calc(100vw-88px)] max-w-[310px] snap-start shrink-0 overflow-hidden rounded-[24px] border border-slate-100 bg-white shadow-[0_12px_32px_rgba(15,23,42,0.08)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_22px_55px_rgba(15,23,42,0.14)] md:w-auto md:max-w-none"
                                                        >
                                                            <div className="relative h-[230px] overflow-hidden bg-slate-100 md:h-[270px]">
                                                                {barber.photo_url ? (
                                                                    <img
                                                                        src={barber.photo_url}
                                                                        alt={barber.name}
                                                                        className="h-full w-full object-cover object-center transition duration-700 group-hover:scale-105"
                                                                    />
                                                                ) : (
                                                                    <div className="flex h-full w-full items-center justify-center bg-slate-900 text-4xl font-black text-white">
                                                                        {getInitials(barber.name)}
                                                                    </div>
                                                                )}

                                                                <div className="absolute inset-0 bg-gradient-to-b from-black/5 via-transparent to-black/75" />

                                                                <div className="absolute left-3 top-3">
                                                                    <span
                                                                        className="rounded-full bg-white/95 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.16em] shadow-sm backdrop-blur"
                                                                        style={{ color: PRIMARY }}
                                                                    >
                                                                        Profesional
                                                                    </span>
                                                                </div>

                                                                <div className="absolute bottom-3 left-3 right-3">
                                                                    <h4 className="line-clamp-1 text-2xl font-black leading-tight text-white drop-shadow">
                                                                        {barber.name}
                                                                    </h4>

                                                                    <p className="mt-1 line-clamp-1 text-sm font-semibold text-white/85">
                                                                        {barber.specialty || 'Barbero profesional'}
                                                                    </p>
                                                                </div>
                                                            </div>

                                                            <div className="p-3.5">
                                                                <div className="mb-3 flex items-center justify-between gap-2">
                                                                    <div className="rounded-2xl bg-slate-50 px-3 py-2 ring-1 ring-slate-100">
                                                                        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                                                                            Trabajos
                                                                        </p>

                                                                        <p className="mt-0.5 text-sm font-black text-slate-950">
                                                                            {workCount}
                                                                        </p>
                                                                    </div>

                                                                    <div
                                                                        className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-black text-white shadow-[0_10px_22px_rgba(183,121,31,0.22)]"
                                                                        style={{ backgroundColor: PRIMARY }}
                                                                    >
                                                                        {getInitials(barber.name)}
                                                                    </div>
                                                                </div>

                                                                <Link
                                                                    href={`/b/${businessSlug}/reservar?barberId=${barber.id}`}
                                                                    className="inline-flex h-11 w-full items-center justify-center rounded-2xl px-4 text-sm font-black text-white shadow-[0_12px_28px_rgba(183,121,31,0.22)] transition duration-300 hover:-translate-y-0.5 hover:brightness-105 active:scale-[0.98]"
                                                                    style={{ backgroundColor: PRIMARY }}
                                                                >
                                                                    Reservar con {barber.name.split(' ')[0]}
                                                                </Link>
                                                            </div>
                                                        </article>
                                                    )
                                                })}
                                            </div>
                                        )}
                                    </section>
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
                            <span className="text-[10px] font-bold uppercase tracking-wider">
                                Explorar
                            </span>
                        </Link>

                        <Link
                            href={`/b/${businessSlug}/reservar`}
                            className="flex flex-col items-center gap-1 text-slate-400"
                        >
                            <span className="text-lg">◫</span>
                            <span className="text-[10px] font-bold uppercase tracking-wider">
                                Citas
                            </span>
                        </Link>
                    </div>
                </nav>
            </div>
        </main>
    )
}