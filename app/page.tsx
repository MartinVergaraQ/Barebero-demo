import Link from 'next/link'
import { getSiteContentMap } from '@/src/features/site-content/api/get-site-content'
import { getActiveServices } from '@/src/features/services/api/get-services'
import { getActiveBarbers } from '@/src/features/barbers/api/get-barber'
import { getPublicReviews } from '@/src/features/reviews/api/get-public-reviews'

type DemoPageProps = {
  searchParams?: Promise<{
    tab?: string
  }>
}

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

function getStars(rating: number) {
  return Array.from({ length: 5 }, (_, index) => index < rating)
}

export default async function DemoPage({ searchParams }: DemoPageProps) {
  const params = await searchParams
  const tab = params?.tab ?? 'services'

  const [contentMap, services, barbers, reviews] = await Promise.all([
    getSiteContentMap(),
    getActiveServices(),
    getActiveBarbers(),
    getPublicReviews(),
  ])

  const businessName = (contentMap.business_name as string) || 'The Gentry Barbería'
  const businessCategory = (contentMap.business_category as string) || 'Barbería Premium'
  const businessAddress =
    (contentMap.business_address as string) || 'Av. Providencia 1234, Santiago'
  const aboutText =
    (contentMap.about_text as string) ||
    'Somos una barbería moderna enfocada en entregar una experiencia profesional, cercana y fácil de reservar.'
  const heroImage =
    (contentMap.hero_image_url as string) ||
    'https://images.unsplash.com/photo-1621605815971-fbc98d665033?auto=format&fit=crop&w=1200&q=80'

  const averageRating = getAverageRating(reviews)

  const tabs = [
    { key: 'services', label: 'Servicios' },
    { key: 'details', label: 'Detalles' },
    { key: 'reviews', label: 'Reseñas' },
  ]

  return (
    <main className="min-h-screen bg-[#f8f6f6] text-slate-900">
      <div className="mx-auto w-full max-w-md bg-[#f8f6f6] pb-28">
        <section className="relative h-64 w-full overflow-hidden bg-slate-900">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url('${heroImage}')` }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 to-transparent" />

          <div className="absolute left-4 right-4 top-4 flex items-center justify-between">
            <Link
              href="/"
              className="flex h-11 w-11 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur"
            >
              ←
            </Link>

            <div className="flex items-center gap-2">
              <button className="flex h-11 w-11 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur">
                ♥
              </button>
              <button className="flex h-11 w-11 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur">
                ↗
              </button>
            </div>
          </div>
        </section>

        <section className="relative -mt-12 px-4">
          <div className="rounded-[24px] border border-slate-100 bg-white p-6 shadow-xl">
            <div className="text-center">
              <h1 className="text-3xl font-black">{businessName}</h1>
              <p className="mt-2 text-sm font-bold uppercase tracking-[0.18em] text-[#ec5b13]">
                {businessCategory}
              </p>
              <p className="mt-3 text-sm text-slate-500">{businessAddress}</p>
            </div>

            <div className="mt-6 grid grid-cols-3 border-t border-slate-100 pt-6 text-center">
              <div>
                <p className="text-2xl font-black">{averageRating}</p>
                <p className="text-xs uppercase tracking-wide text-slate-400">Rating</p>
              </div>
              <div className="border-x border-slate-100">
                <p className="text-2xl font-black">{services.length}</p>
                <p className="text-xs uppercase tracking-wide text-slate-400">Servicios</p>
              </div>
              <div>
                <p className="text-2xl font-black">{reviews.length}</p>
                <p className="text-xs uppercase tracking-wide text-slate-400">Reseñas</p>
              </div>
            </div>
          </div>
        </section>

        <section className="sticky top-0 z-20 mt-4 border-b border-slate-200 bg-[#f8f6f6]">
          <div className="flex px-4">
            {tabs.map((item) => {
              const active = tab === item.key

              return (
                <Link
                  key={item.key}
                  href={`/?tab=${item.key}`}
                  className={`flex-1 border-b-2 py-4 text-center text-sm font-bold transition ${active
                    ? 'border-[#ec5b13] text-[#ec5b13]'
                    : 'border-transparent text-slate-500'
                    }`}
                >
                  {item.label}
                </Link>
              )
            })}
          </div>
        </section>

        <section className="px-4 pt-5">
          {tab === 'services' && (
            <div className="space-y-5">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Buscar un servicio..."
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm outline-none"
                />
              </div>

              <div className="flex gap-2 overflow-x-auto pb-1">
                <button className="rounded-full bg-[#ec5b13] px-5 py-2 text-sm font-semibold text-white">
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

              <div className="space-y-4">
                {services.length === 0 ? (
                  <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-500">
                    No hay servicios activos.
                  </div>
                ) : (
                  services.map((service) => (
                    <article
                      key={service.id}
                      className="flex items-center justify-between gap-4 rounded-[24px] border border-slate-100 bg-white p-4 shadow-sm"
                    >
                      <div className="min-w-0 flex-1">
                        <h2 className="text-xl font-black leading-tight">{service.name}</h2>
                        <p className="mt-1 line-clamp-1 text-sm text-slate-500">
                          {service.description || 'Servicio profesional de barbería.'}
                        </p>

                        <div className="mt-3 flex items-center gap-3">
                          <span className="text-sm text-slate-400">
                            {service.duration_minutes} min
                          </span>
                          <span className="text-xl font-black text-[#ec5b13]">
                            {formatPrice(service.price)}
                          </span>
                        </div>
                      </div>

                      <Link
                        href={`/reservar?serviceId=${service.id}`}
                        className="shrink-0 rounded-2xl bg-[#ec5b13] px-5 py-3 text-sm font-bold text-white shadow-lg shadow-orange-200"
                      >
                        Reservar
                      </Link>
                    </article>
                  ))
                )}
              </div>
            </div>
          )}

          {tab === 'details' && (
            <div className="space-y-8 pb-4">
              <div className="rounded-[24px] border border-slate-100 bg-white p-5 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                  <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">
                    Abierto ahora
                  </span>
                  <span className="text-sm font-bold text-slate-700">
                    {averageRating} ★ ({reviews.length})
                  </span>
                </div>

                <h2 className="text-2xl font-black">{businessName}</h2>
                <p className="mt-1 text-sm text-slate-500">{businessCategory}</p>

                <Link
                  href="/reservar"
                  className="mt-5 inline-flex w-full items-center justify-center rounded-2xl bg-[#ec5b13] px-4 py-4 text-base font-bold text-white"
                >
                  Reservar cita
                </Link>
              </div>

              <section>
                <h3 className="text-xl font-black">Sobre nosotros</h3>
                <p className="mt-3 leading-7 text-slate-600">{aboutText}</p>
              </section>

              <section>
                <h3 className="text-xl font-black">Ubicación</h3>
                <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-white">
                  <div className="h-44 bg-slate-200">
                    <img
                      src="https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&w=1200&q=80"
                      alt="Mapa de ubicación"
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="p-4">
                    <p className="font-bold">{businessAddress}</p>
                    <p className="mt-1 text-sm text-slate-500">Atención presencial y reserva online</p>
                  </div>
                </div>
              </section>

              <section>
                <h3 className="text-xl font-black">Barberos</h3>
                {barbers.length === 0 ? (
                  <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
                    No hay barberos activos.
                  </div>
                ) : (
                  <div className="mt-3 space-y-3">
                    {barbers.slice(0, 4).map((barber) => (
                      <article
                        key={barber.id}
                        className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-white p-4"
                      >
                        <div className="h-14 w-14 overflow-hidden rounded-full bg-slate-200">
                          {barber.photo_url ? (
                            <img
                              src={barber.photo_url}
                              alt={barber.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-sm font-bold text-slate-500">
                              {getInitials(barber.name)}
                            </div>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="font-bold">{barber.name}</p>
                          <p className="text-sm text-slate-500">
                            {barber.specialty || 'Barbero profesional'}
                          </p>
                        </div>

                        <Link
                          href="/reservar"
                          className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold"
                        >
                          Ver
                        </Link>
                      </article>
                    ))}
                  </div>
                )}
              </section>

              <section>
                <h3 className="text-xl font-black">Horarios</h3>
                <div className="mt-3 rounded-2xl border border-slate-100 bg-white p-4">
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
                      <span className={`font-medium ${day === 'Domingo' ? 'text-slate-400' : ''}`}>
                        {hours}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}

          {tab === 'reviews' && (
            <div className="space-y-5 pb-4">
              <div className="flex items-center justify-between rounded-[24px] border border-slate-100 bg-white p-5 shadow-sm">
                <div>
                  <p className="text-5xl font-black">{averageRating}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    Basado en {reviews.length} opiniones
                  </p>
                </div>

                <button className="rounded-2xl bg-[#ec5b13]/10 px-4 py-3 text-sm font-bold text-[#ec5b13]">
                  Escribir reseña
                </button>
              </div>

              {reviews.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-500">
                  No hay reseñas publicadas todavía.
                </div>
              ) : (
                reviews.slice(0, 6).map((review) => (
                  <article
                    key={review.id}
                    className="rounded-[24px] border border-slate-100 bg-white p-5 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-orange-100 font-bold text-[#ec5b13]">
                          {getInitials(review.client_name)}
                        </div>

                        <div>
                          <p className="font-bold">{review.client_name}</p>
                          <p className="text-xs uppercase tracking-widest text-slate-400">
                            Cliente verificado
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-0.5 text-yellow-500">
                        {getStars(review.rating).map((filled, index) => (
                          <span key={index}>{filled ? '★' : '☆'}</span>
                        ))}
                      </div>
                    </div>

                    <p className="mt-4 text-sm leading-7 text-slate-600">
                      {review.comment || 'Sin comentario.'}
                    </p>
                  </article>
                ))
              )}
            </div>
          )}
        </section>

        <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-200 bg-white/90 backdrop-blur">
          <div className="mx-auto flex max-w-md items-center justify-around px-4 py-3">
            <Link href="/?tab=services" className="flex flex-col items-center gap-1 text-[#ec5b13]">
              <span className="text-lg">⌕</span>
              <span className="text-[10px] font-bold uppercase tracking-wider">Explorar</span>
            </Link>

            <Link href="/reservar" className="flex flex-col items-center gap-1 text-slate-400">
              <span className="text-lg">◫</span>
              <span className="text-[10px] font-bold uppercase tracking-wider">Citas</span>
            </Link>

            <button className="flex flex-col items-center gap-1 text-slate-400">
              <span className="text-lg">♥</span>
              <span className="text-[10px] font-bold uppercase tracking-wider">Favoritos</span>
            </button>

            <button className="flex flex-col items-center gap-1 text-slate-400">
              <span className="text-lg">◉</span>
              <span className="text-[10px] font-bold uppercase tracking-wider">Perfil</span>
            </button>
          </div>
        </nav>
      </div>
    </main>
  )
}