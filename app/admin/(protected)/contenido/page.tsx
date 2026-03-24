import { getSiteContentMap } from '@/src/features/site-content/api/get-site-content'
import { AdminSiteContentForm } from '@/src/features/site-content/components/admin-site-content-form'
import { getBusinessId } from '@/src/features/business/api/get-business-id'

export default async function AdminContenidoPage() {
    const businessId = await getBusinessId()

    if (!businessId) {
        return (
            <main>
                <h1 className="mb-6 text-3xl font-bold">Contenido</h1>
                <div className="rounded-lg border border-yellow-300 bg-yellow-50 p-4 text-yellow-800">
                    No se encontró business_id base.
                </div>
            </main>
        )
    }

    const contentMap = await getSiteContentMap(businessId)

    return (
        <main>
            <h1 className="mb-6 text-3xl font-bold">Contenido</h1>

            <AdminSiteContentForm
                businessId={businessId}
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