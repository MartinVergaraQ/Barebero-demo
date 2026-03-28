import { redirect } from 'next/navigation'
import { createClient } from '@/src/lib/supabase/server'
import { AdminNav } from '@/src/features/admin/components/admin-nav'
import { getCurrentBarber } from '@/src/features/barbers/api/get-current-barber'
import { canManageCatalog } from '@/src/features/auth/utils/admin-access'
import { isBarberRole } from '@/src/features/auth/utils/admin-scope'

export default async function BarberLayout({
    children,
}: Readonly<{
    children: React.ReactNode
}>) {
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

    if (
        profileError ||
        !profile ||
        (!canManageCatalog(profile.role) && !isBarberRole(profile.role))
    ) {
        redirect('/admin')
    }

    const barber = await getCurrentBarber()

    if (!barber) {
        redirect('/admin')
    }

    const { data: business, error: businessError } = await supabase
        .from('businesses')
        .select('id, name, slug')
        .eq('id', barber.business_id)
        .single()

    if (businessError || !business) {
        redirect('/admin')
    }

    return (
        <div className="min-h-screen bg-[#f6f3e8] text-[#1f1f1f]">
            <AdminNav
                businessSlug={business.slug}
                businessName={business.name}
                role={profile.role}
            />

            <section className="min-w-0 md:ml-[254px]">
                <div className="w-full px-4 py-5 sm:px-5 md:px-10 md:py-8">
                    {children}
                </div>
            </section>
        </div>
    )
}