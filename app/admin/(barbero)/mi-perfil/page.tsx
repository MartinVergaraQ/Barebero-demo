import { redirect } from 'next/navigation'
import { getCurrentBarber } from '@/src/features/barbers/api/get-current-barber'
import { BarberProfileForm } from '@/src/features/barbers/components/barber-profile-form'

export default async function MiPerfilPage() {
    const barber = await getCurrentBarber()

    if (!barber) {
        redirect('/admin')
    }

    return (
        <main className="space-y-6 p-8">
            <header>
                <p className="text-sm text-slate-500">Panel de barbero</p>
                <h1 className="text-3xl font-bold">Mi perfil</h1>
                <p className="mt-2 text-sm text-slate-600">
                    Aquí puedes ver y actualizar tu información dentro del negocio.
                </p>
            </header>

            <BarberProfileForm barber={barber} />
        </main>
    )
}