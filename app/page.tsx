import { supabase } from '../src/lib/supabase/client'

export default async function HomePage() {
  const { data: services, error } = await supabase
    .from('services')
    .select('*')
    .eq('is_active', true)
    .order('display_order', { ascending: true })

  if (error) {
    return (
      <main className="p-8">
        <h1 className="text-2xl font-bold">Error cargando servicios</h1>
        <pre className="mt-4 text-sm">{error.message}</pre>
      </main>
    )
  }

  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold mb-6">Servicios</h1>

      <div className="space-y-4">
        {services?.map((service) => (
          <div key={service.id} className="border rounded-xl p-4">
            <h2 className="text-lg font-semibold">{service.name}</h2>
            <p className="text-sm text-gray-600">{service.description}</p>
            <p className="mt-2">{service.duration_minutes} min</p>
            <p className="font-medium">${service.price}</p>
          </div>
        ))}
      </div>
    </main>
  )
}