import { AdminNav } from '@/src/features/admin/components/admin-nav'
import { getAdminBusinessAccess } from '@/src/features/business/api/get-admin-business-access'

export default async function AdminBusinessLayout({
    children,
    params,
}: Readonly<{
    children: React.ReactNode
    params: Promise<{ slug: string }>
}>) {
    const { slug } = await params
    const access = await getAdminBusinessAccess(slug)

    return (
        <div className="min-h-screen bg-[#f6f3e8] text-[#1f1f1f]">
            <AdminNav
                businessSlug={access.businessSlug}
                businessName={access.businessName}
            />

            <section className="min-w-0 md:ml-[254px]">
                <div className="w-full px-4 py-5 sm:px-5 md:px-10 md:py-8">
                    {children}
                </div>
            </section>
        </div>
    )
}