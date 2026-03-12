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
        <div className="min-h-screen bg-gray-50 md:flex">
            <AdminNav />

            <section className="flex-1 p-4 md:p-8">
                {children}
            </section>
        </div>
    )
}