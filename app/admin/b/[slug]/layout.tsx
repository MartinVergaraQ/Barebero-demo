import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/src/lib/supabase/server'
import { AdminNav } from '@/src/features/admin/components/admin-nav'
import { canAccessAdmin } from '@/src/features/auth/utils/admin-access'

export default async function AdminBusinessLayout({
    children,
    params,
}: Readonly<{
    children: React.ReactNode
    params: Promise<{ slug: string }>
}>) {
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
        .select('id, business_id, role, full_name')
        .eq('id', user.id)
        .single()

    if (profileError || !profile || !canAccessAdmin(profile.role)) {
        redirect('/admin/login')
    }

    const { data: business, error: businessError } = await supabase
        .from('businesses')
        .select('id, name, slug')
        .eq('slug', slug)
        .single()

    if (businessError || !business) {
        notFound()
    }

    if (profile.business_id !== business.id) {
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