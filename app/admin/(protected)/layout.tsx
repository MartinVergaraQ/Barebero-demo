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
        <div className="min-h-screen bg-[#f6f3e8] text-[#1f1f1f] md:flex">
            <AdminNav />

            <section className="min-w-0 flex-1 md:ml-[254px]">
                <div className="w-full px-5 py-5 md:px-12 md:py-8">
                    {children}
                </div>
            </section>
        </div>
    )
}