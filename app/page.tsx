import Link from 'next/link'
import { getSiteContentMap } from '@/src/features/site-content/api/get-site-content'
import { getActiveServices } from '@/src/features/services/api/get-services'
import { getActiveBarbers } from '@/src/features/barbers/api/get-barber'

export default async function HomePage() {
  const [contentMap, services, barbers] = await Promise.all([
    getSiteContentMap(),
    getActiveServices(),
    getActiveBarbers(),
  ])

  const heroTitle =
    (contentMap.hero_title as string) || 'Barbería moderna con reservas online'

  const heroSubtitle =
    (contentMap.hero_subtitle as string) ||
    'Reserva tu corte o barba en pocos pasos.'

  const heroCtaText =
    (contentMap.hero_cta_text as string) || 'Reservar ahora'

  const servicesTitle =
    (contentMap.services_section_title as string) || 'Nuestros servicios'

  const barbersTitle =
    (contentMap.barbers_section_title as string) || 'Nuestro equipo'

  const aboutText =
    (contentMap.about_text as string) ||
    'Barbería profesional con atención personalizada.'

  return (
    <main className="p-8 space-y-12">
      <section className="rounded-2xl border p-8">
        <h1 className="text-4xl font-bold">{heroTitle}</h1>
        <p className="mt-4 max-w-2xl text-gray-600">{heroSubtitle}</p>

        <Link
          href="/reservar"
          className="mt-6 inline-block rounded-lg bg-black px-5 py-3 text-white"
        >
          {heroCtaText}
        </Link>
      </section>

      <section>
        <h2 className="mb-4 text-2xl font-bold">{servicesTitle}</h2>

        {services.length === 0 ? (
          <p>No hay servicios disponibles.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {services.slice(0, 4).map((service) => (
              <article key={service.id} className="rounded-xl border p-4">
                <h3 className="text-lg font-semibold">{service.name}</h3>
                <p className="text-sm text-gray-600">
                  {service.description || 'Sin descripción'}
                </p>
                <p className="mt-2">{service.duration_minutes} min</p>
                <p className="font-medium">${service.price}</p>
              </article>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-4 text-2xl font-bold">{barbersTitle}</h2>

        {barbers.length === 0 ? (
          <p>No hay barberos disponibles.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {barbers.slice(0, 4).map((barber) => (
              <article key={barber.id} className="rounded-xl border p-4">
                {barber.photo_url && (
                  <img
                    src={barber.photo_url}
                    alt={barber.name}
                    className="mb-4 h-48 w-full rounded-xl object-cover"
                  />
                )}

                <h3 className="text-lg font-semibold">{barber.name}</h3>
                <p className="text-sm text-gray-600">
                  {barber.bio || 'Sin biografía'}
                </p>
                <p className="mt-2 font-medium">
                  {barber.specialty || 'Sin especialidad'}
                </p>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-xl border p-6">
        <h2 className="mb-3 text-2xl font-bold">Sobre nosotros</h2>
        <p className="text-gray-600">{aboutText}</p>
      </section>
    </main>
  )
}