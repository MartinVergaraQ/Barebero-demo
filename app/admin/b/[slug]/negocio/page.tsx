import { redirect } from 'next/navigation'
import { createClient } from '@/src/lib/supabase/server'
import { getBusinessBySlug } from '@/src/features/business/api/get-business-by-slug'
import { getBusinessAdmin } from '@/src/features/business/api/get-business-admin'
import { AdminBusinessForm } from '@/src/features/business/components/admin-business-form'
import { canManageBusiness } from '@/src/features/auth/utils/admin-access'

type AdminNegocioPageProps = {
    params: Promise<{
        slug: string
    }>
}

export default async function AdminNegocioPage({
    params,
}: AdminNegocioPageProps) {
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

    if (profileError || !profile || !canManageBusiness(profile.role)) {
        redirect('/admin')
    }

    const business = await getBusinessBySlug(slug)

    if (profile.business_id !== business.id) {
        redirect('/admin')
    }

    const businessData = await getBusinessAdmin(business.id)

    return (
        <main className="space-y-6">
            <header>
                <p className="text-sm text-slate-500">{business.name}</p>
                <h1 className="text-3xl font-bold">Negocio</h1>
            </header>

            <AdminBusinessForm business={businessData} />
        </main>
    )
}