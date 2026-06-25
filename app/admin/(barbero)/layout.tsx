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
        <div className="min-h-screen bg-[#F6F3E8] text-[#1F1F1F]">
            <AdminNav
                businessSlug={
                    business.slug
                }
                businessName={
                    business.name
                }
                role={
                    profile.role
                }
            />

            <section className="min-w-0 md:ml-[248px]">
                <div className="mx-auto w-full max-w-6xl px-4 pb-28 pt-4 sm:px-5 sm:pt-5 md:px-8 md:pb-8 md:pt-8">
                    {children}
                </div>
            </section>
        </div>
    )
}