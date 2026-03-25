import { getBusinessBySlug } from '@/src/features/business/api/get-business-by-slug'
import { getBusinessAdmin } from '@/src/features/business/api/get-business-admin'
import { AdminBusinessForm } from '@/src/features/business/components/admin-business-form'

type AdminNegocioPageProps = {
    params: Promise<{
        slug: string
    }>
}

export default async function AdminNegocioPage({
    params,
}: AdminNegocioPageProps) {
    const { slug } = await params
    const business = await getBusinessBySlug(slug)
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