import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/src/lib/supabase/server'
import { getBusinessBySlug } from '@/src/features/business/api/get-business-by-slug'
import { canManageBusiness } from '@/src/features/auth/utils/admin-access'
import { PlanHistoryList } from '@/src/features/business/components/plan-history-list'

type PlanHistoryItem = {
    id: string
    previous_plan_slug: string
    next_plan_slug: string
    created_at: string
    changed_by: string | null
    profiles: {
        full_name: string | null
    }[] | null
}

type AdminPlanHistoryPageProps = {
    params: Promise<{
        slug: string
    }>
    searchParams: Promise<{
        page?: string
    }>
}

export default async function AdminPlanHistoryPage({
    params,
    searchParams,
}: AdminPlanHistoryPageProps) {
    const { slug } = await params
    const { page } = await searchParams

    const currentPage = Math.max(Number(page ?? '1') || 1, 1)
    const pageSize = 10
    const from = (currentPage - 1) * pageSize
    const to = from + pageSize - 1

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

    const { data: planHistory, error: planHistoryError, count } = await supabase
        .from('business_plan_history')
        .select(
            `
            id,
            previous_plan_slug,
            next_plan_slug,
            created_at,
            changed_by,
            profiles:changed_by (
                full_name
            )
        `,
            { count: 'exact' }
        )
        .eq('business_id', business.id)
        .order('created_at', { ascending: false })
        .range(from, to)

    if (planHistoryError) {
        redirect(`/admin/b/${business.slug}/plan`)
    }

    const history: PlanHistoryItem[] = (planHistory ?? []) as PlanHistoryItem[]
    const totalItems = count ?? 0
    const totalPages = Math.max(Math.ceil(totalItems / pageSize), 1)

    return (
        <main className="space-y-6">
            <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                    <p className="text-sm text-slate-500">{business.name}</p>
                    <h1 className="text-3xl font-bold">Historial de planes</h1>
                    <p className="mt-2 text-sm text-slate-600">
                        Revisa los últimos cambios de plan del negocio.
                    </p>
                </div>

                <Link
                    href={`/admin/b/${business.slug}/plan`}
                    className="inline-flex rounded-lg border px-4 py-2 text-sm font-medium"
                >
                    Volver a plan
                </Link>
            </header>

            <PlanHistoryList history={history} />

            <div className="flex items-center justify-between">
                <p className="text-sm text-slate-600">
                    Página {currentPage} de {totalPages}
                </p>

                <div className="flex gap-2">
                    <Link
                        href={`/admin/b/${business.slug}/plan/historial?page=${Math.max(
                            currentPage - 1,
                            1
                        )}`}
                        className={`rounded-lg border px-4 py-2 text-sm font-medium ${currentPage <= 1 ? 'pointer-events-none opacity-50' : ''
                            }`}
                    >
                        Anterior
                    </Link>

                    <Link
                        href={`/admin/b/${business.slug}/plan/historial?page=${Math.min(
                            currentPage + 1,
                            totalPages
                        )}`}
                        className={`rounded-lg border px-4 py-2 text-sm font-medium ${currentPage >= totalPages
                                ? 'pointer-events-none opacity-50'
                                : ''
                            }`}
                    >
                        Siguiente
                    </Link>
                </div>
            </div>
        </main>
    )
}