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

    const {
        data: planHistory,
        error: planHistoryError,
        count,
    } = await supabase
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
        <main className="min-h-screen bg-[#F4EFE5] px-4 py-6 text-slate-950 md:px-8 md:py-8">
            <div className="mx-auto max-w-7xl space-y-6 md:space-y-8">
                <header className="flex flex-col gap-5 border-b border-black/10 pb-6 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <p className="text-sm font-bold text-slate-500">
                            {business.name}
                        </p>

                        <h1 className="mt-1 text-4xl font-black tracking-tight text-slate-950 md:text-5xl">
                            Historial de planes
                        </h1>

                        <p className="mt-2 max-w-[720px] text-sm leading-6 text-slate-600 md:text-base md:leading-7">
                            Revisa los últimos cambios de plan registrados para este negocio.
                        </p>
                    </div>

                    <Link
                        href={`/admin/b/${business.slug}/plan`}
                        className="inline-flex h-11 w-fit items-center justify-center rounded-2xl border border-black/10 bg-white px-5 text-sm font-black text-slate-800 shadow-sm transition hover:-translate-y-0.5 hover:bg-[#FFFCF4] active:scale-[0.98]"
                    >
                        Volver a plan
                    </Link>
                </header>

                <section className="grid gap-4 md:grid-cols-3">
                    <article className="rounded-[26px] border border-black/10 bg-[#FFFCF4] p-5 shadow-[0_18px_45px_rgba(15,23,42,0.07)]">
                        <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-500">
                            Total cambios
                        </p>

                        <h2 className="mt-3 text-4xl font-black text-slate-950">
                            {totalItems}
                        </h2>

                        <p className="mt-2 text-sm leading-6 text-slate-500">
                            Movimientos registrados en la suscripción.
                        </p>
                    </article>

                    <article className="rounded-[26px] border border-black/10 bg-[#FFFCF4] p-5 shadow-[0_18px_45px_rgba(15,23,42,0.07)]">
                        <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-500">
                            Página actual
                        </p>

                        <h2 className="mt-3 text-4xl font-black text-slate-950">
                            {currentPage}
                        </h2>

                        <p className="mt-2 text-sm leading-6 text-slate-500">
                            De {totalPages} página{totalPages === 1 ? '' : 's'}.
                        </p>
                    </article>

                    <article className="rounded-[26px] border border-black/10 bg-[#FFFCF4] p-5 shadow-[0_18px_45px_rgba(15,23,42,0.07)]">
                        <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-500">
                            Por página
                        </p>

                        <h2 className="mt-3 text-4xl font-black text-slate-950">
                            {pageSize}
                        </h2>

                        <p className="mt-2 text-sm leading-6 text-slate-500">
                            Registros mostrados por página.
                        </p>
                    </article>
                </section>

                <section className="overflow-hidden rounded-[28px] border border-black/10 bg-[#FFFCF4] shadow-[0_18px_45px_rgba(15,23,42,0.07)]">
                    <div className="border-b border-black/10 px-5 py-5 md:px-6">
                        <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#C8942E]">
                            Movimientos
                        </p>

                        <h2 className="mt-1 text-2xl font-black text-slate-950">
                            Cambios registrados
                        </h2>

                        <p className="mt-1 text-sm leading-6 text-slate-500">
                            Lista paginada de cambios de plan.
                        </p>
                    </div>

                    <div className="p-4 md:p-6">
                        <PlanHistoryList items={history} />
                    </div>
                </section>

                <div className="flex flex-col gap-3 rounded-[24px] border border-black/10 bg-[#FFFCF4] p-4 shadow-[0_14px_38px_rgba(15,23,42,0.06)] sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm font-bold text-slate-600">
                        Página {currentPage} de {totalPages}
                    </p>

                    <div className="flex gap-2">
                        <Link
                            href={`/admin/b/${business.slug}/plan/historial?page=${Math.max(
                                currentPage - 1,
                                1
                            )}`}
                            className={`inline-flex h-11 items-center justify-center rounded-2xl border border-black/10 bg-white px-5 text-sm font-black text-slate-800 shadow-sm transition hover:-translate-y-0.5 hover:bg-[#FFFCF4] active:scale-[0.98] ${currentPage <= 1 ? 'pointer-events-none opacity-50' : ''
                                }`}
                        >
                            Anterior
                        </Link>

                        <Link
                            href={`/admin/b/${business.slug}/plan/historial?page=${Math.min(
                                currentPage + 1,
                                totalPages
                            )}`}
                            className={`inline-flex h-11 items-center justify-center rounded-2xl bg-[#C8942E] px-5 text-sm font-black text-white shadow-[0_14px_30px_rgba(200,148,46,0.24)] transition hover:-translate-y-0.5 hover:brightness-105 active:scale-[0.98] ${currentPage >= totalPages
                                ? 'pointer-events-none opacity-50'
                                : ''
                                }`}
                        >
                            Siguiente
                        </Link>
                    </div>
                </div>
            </div>
        </main>
    )
}