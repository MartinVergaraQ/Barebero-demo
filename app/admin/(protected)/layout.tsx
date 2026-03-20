import { redirect } from 'next/navigation'
import { createClient } from '@/src/lib/supabase/server'
import { AdminNav } from '@/src/features/admin/components/admin-nav'

export default async function AdminLayout({
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

    return (
        <div className="min-h-screen bg-[#f6f3e8] text-[#1f1f1f]">
            <AdminNav />

            <section className="min-w-0 md:ml-[254px]">
                <div className="w-full px-4 py-5 sm:px-5 md:px-10 md:py-8">
                    {children}
                </div>
            </section>
        </div>
    )
}