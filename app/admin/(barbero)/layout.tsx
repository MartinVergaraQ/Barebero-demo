import { redirect } from 'next/navigation'
import { createClient } from '@/src/lib/supabase/server'
import { AdminNav } from '@/src/features/admin/components/admin-nav'
import { getCurrentBarber } from '@/src/features/barbers/api/get-current-barber'

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
        .select('id, business_id, role, full_name')
        .eq('id', user.id)
        .single()

    if (profileError || !profile || profile.role !== 'barber') {
        redirect('/admin')
    }

    const barber = await getCurrentBarber()

    if (!barber) {
        redirect('/admin')
    }

    return (
        <div className="min-h-screen bg-[#f6f3e8] text-[#1f1f1f]">
            <AdminNav
                businessSlug={barber.slug}
                businessName={barber.name}
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