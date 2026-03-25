import { redirect } from 'next/navigation'
import { createClient } from '@/src/lib/supabase/server'
import { getBusinessBySlug } from '@/src/features/business/api/get-business-by-slug'
import { getBarbersAdmin } from '@/src/features/barbers/api/get-barbers-admin'
import { AdminTimeOffForm } from '@/src/features/time-off/components/admin-time-off-form'
import { canManageAppointments } from '@/src/features/auth/utils/admin-access'
import {
    canAccessBusiness,
    isBarberRole,
    isFullAdminRole,
} from '@/src/features/auth/utils/admin-scope'
import { getBarberByProfile } from '@/src/features/barbers/api/get-barber-by-profile'

type AdminBloqueosPageProps = {
    params: Promise<{
        slug: string
    }>
}

export default async function AdminBloqueosPage({
    params,
}: AdminBloqueosPageProps) {
    const { slug } = await params
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        redirect('/admin/login')
    }

    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, business_id, role')
        .eq('id', user.id)
        .single()

    if (profileError || !profile || !canManageAppointments(profile.role)) {
        redirect('/admin')
    }

    const business = await getBusinessBySlug(slug)

    if (profile.business_id !== business.id) {
        redirect('/admin')
    }

    const ownBarber = await getBarberByProfile(profile.id)

    if (
        isBarberRole(profile.role) &&
        (!ownBarber || ownBarber.business_id !== business.id)
    ) {
        redirect('/admin')
    }

    const barbers = isFullAdminRole(profile.role)
        ? await getBarbersAdmin(business.id)
        : [
            {
                id: ownBarber!.id,
                business_id: ownBarber!.business_id,
                name: ownBarber!.name,
            },
        ]

    return (
        <main className="p-8">
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <p className="text-sm text-slate-500">{business.name}</p>
                    <h1 className="mb-6 text-3xl font-bold">Bloqueos</h1>
                </div>
            </div>

            {barbers.length === 0 ? (
                <p>No hay barberos creados todavía.</p>
            ) : (
                <AdminTimeOffForm
                    barbers={barbers.map((barber) => ({
                        id: barber.id,
                        business_id: barber.business_id,
                        name: barber.name,
                    }))}
                />
            )}
        </main>
    )
}