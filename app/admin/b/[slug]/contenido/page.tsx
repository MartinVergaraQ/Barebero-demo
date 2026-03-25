import { redirect } from 'next/navigation'
import { createClient } from '@/src/lib/supabase/server'
import { getBusinessBySlug } from '@/src/features/business/api/get-business-by-slug'
import { getSiteContentMap } from '@/src/features/site-content/api/get-site-content'
import { AdminSiteContentForm } from '@/src/features/site-content/components/admin-site-content-form'
import { canManageCatalog } from '@/src/features/auth/utils/admin-access'

type AdminContenidoPageProps = {
    params: Promise<{
        slug: string
    }>
}

export default async function AdminContenidoPage({
    params,
}: AdminContenidoPageProps) {
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

    if (profileError || !profile || !canManageCatalog(profile.role)) {
        redirect('/admin')
    }

    const business = await getBusinessBySlug(slug)

    if (profile.business_id !== business.id) {
        redirect('/admin')
    }

    const contentMap = await getSiteContentMap(business.id)

    return (
        <main>
            <div className="mb-6">
                <p className="text-sm text-slate-500">{business.name}</p>
                <h1 className="text-3xl font-bold">Contenido</h1>
            </div>

            <AdminSiteContentForm
                businessId={business.id}
                initialValues={{
                    hero_title: (contentMap.hero_title as string) ?? '',
                    hero_subtitle: (contentMap.hero_subtitle as string) ?? '',
                    hero_cta_text: (contentMap.hero_cta_text as string) ?? '',
                    services_section_title:
                        (contentMap.services_section_title as string) ?? '',
                    barbers_section_title:
                        (contentMap.barbers_section_title as string) ?? '',
                    about_text: (contentMap.about_text as string) ?? '',
                }}
            />
        </main>
    )
}