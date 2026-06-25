import { redirect } from 'next/navigation'
import { createClient } from '@/src/lib/supabase/server'
import { getBusinessBySlug } from '@/src/features/business/api/get-business-by-slug'
import { getBusinessAdmin } from '@/src/features/business/api/get-business-admin'
import { AdminBusinessForm } from '@/src/features/business/components/admin-business-form'
import { canManageBusiness } from '@/src/features/auth/utils/admin-access'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

type AdminNegocioPageProps = {
    params: Promise<{
        slug: string
    }>
    searchParams: Promise<{
        from?: string
    }>
}

export default async function AdminNegocioPage({
    params,
    searchParams,
}: AdminNegocioPageProps) {
    const [
        { slug },
        query,
    ] = await Promise.all([
        params,
        searchParams,
    ])

    const supabase =
        await createClient()

    /*
     * 1. Validar sesión.
     */
    const {
        data: { user },
        error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
        redirect('/admin/login')
    }

    /*
     * 2. Cargar perfil y validar rol.
     */
    const { data: profile, error: profileError } =
        await supabase
            .from('profiles')
            .select('id, business_id, role')
            .eq('id', user.id)
            .maybeSingle()

    if (
        profileError ||
        !profile?.business_id ||
        !canManageBusiness(profile.role)
    ) {
        redirect('/admin')
    }

    /*
     * 3. Validar que el slug corresponda
     * al negocio del usuario.
     */
    const business = await getBusinessBySlug(slug)

    const returnTo =
        query.from === 'setup'
            ? `/admin/b/${business.slug}`
            : undefined

    if (profile.business_id !== business.id) {
        redirect('/admin')
    }

    /*
     * 4. Obtener información administrativa.
     * getBusinessAdmin vuelve a validar sesión,
     * rol y pertenencia al negocio.
     */
    const businessData =
        await getBusinessAdmin(business.id)

    /*
     * past_due y cancelled pueden leer,
     * pero no modificar.
     */
    const canEdit =
        businessData.subscription_status === 'trialing' ||
        businessData.subscription_status === 'active'

    const subscriptionBlockReason =
        businessData.subscription_status === 'past_due'
            ? 'Tu negocio está en modo solo lectura porque existe un pago pendiente.'
            : businessData.subscription_status === 'cancelled'
                ? 'Tu negocio está en modo solo lectura porque la suscripción está cancelada.'
                : ''

    return (
        <main className="min-h-screen px-4 py-6 text-slate-950 md:px-8 md:py-8">
            <div className="mx-auto max-w-7xl space-y-6 md:space-y-8">
                <header className="flex flex-col gap-5 border-b border-black/10 pb-6 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        ```tsx
                        <Link
                            href={`/admin/b/${business.slug}`}
                            className="mb-3 inline-flex items-center gap-2 text-sm font-black text-[#8A5D16] transition hover:text-[#C8942E]"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Volver al dashboard
                        </Link>
                        ```

                        <p className="text-sm font-bold text-slate-500">
                            {businessData.name}
                        </p>

                        <h1 className="mt-1 text-4xl font-black tracking-tight text-slate-950 md:text-5xl">
                            Negocio
                        </h1>

                        <p className="mt-2 max-w-[720px] text-sm leading-6 text-slate-600 md:text-base md:leading-7">
                            Administra los datos públicos del negocio:
                            nombre, contacto, redes, dirección,
                            imágenes y configuración general.
                        </p>
                    </div>

                    <div
                        className={`w-fit rounded-full px-4 py-2 text-xs font-black ${canEdit
                            ? 'bg-[#C8942E]/10 text-[#8A5D16]'
                            : 'border border-slate-200 bg-slate-100 text-slate-500'
                            }`}
                    >
                        {canEdit
                            ? 'Edición habilitada'
                            : 'Solo lectura'}
                    </div>
                </header>

                {!canEdit && (
                    <section className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">
                        {subscriptionBlockReason ||
                            'La configuración del negocio se encuentra en modo solo lectura.'}
                    </section>
                )}

                <section className="rounded-[28px] border border-black/10 bg-[#FFFCF4] p-4 shadow-[0_18px_45px_rgba(15,23,42,0.07)] md:p-6">
                    <AdminBusinessForm
                        business={businessData}
                        canEdit={canEdit}
                        subscriptionBlockReason={
                            subscriptionBlockReason
                        }
                        returnTo={returnTo}
                    />
                </section>
            </div>
        </main>
    )
}
