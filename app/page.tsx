import Image from 'next/image'
import Link from 'next/link'

export default function HomePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0F1115] px-5 text-white">
      <section className="w-full max-w-3xl text-center">
        <Image
          src="/brand/barberturn-logo.png"
          alt="BarberTurn"
          width={420}
          height={160}
          priority
          className="mx-auto h-auto w-[280px] object-contain md:w-[380px]"
        />

        <h1 className="mt-8 text-4xl font-black tracking-tight md:text-6xl">
          Organiza tu barbería
          <span className="block text-[#C8942E]">
            desde un solo lugar
          </span>
        </h1>

        <p className="mx-auto mt-5 max-w-xl text-base font-medium leading-7 text-slate-300 md:text-lg">
          Reservas online, gestión de equipo, horarios y
          recordatorios automáticos para barberías.
        </p>

        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href="/b/demo-barber-studio"
            className="inline-flex h-12 items-center justify-center rounded-2xl bg-[#C8942E] px-6 text-sm font-black text-white transition hover:brightness-110"
          >
            Ver demostración
          </Link>

          <Link
            href="/admin/login"
            className="inline-flex h-12 items-center justify-center rounded-2xl border border-white/15 bg-white/[0.05] px-6 text-sm font-black text-white transition hover:bg-white/[0.10]"
          >
            Ingresar al panel
          </Link>
        </div>

        <p className="mt-7 text-sm font-semibold text-slate-500">
          14 días de prueba · Configuración acompañada
        </p>
      </section>
    </main>
  )
} 