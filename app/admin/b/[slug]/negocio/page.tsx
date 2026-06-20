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
     * past_due y canceled pueden leer,
     * pero no modificar.
     */
    const canEdit =
        businessData.subscription_status === 'trialing' ||
        businessData.subscription_status === 'active'

    const subscriptionBlockReason =
        businessData.subscription_status === 'past_due'
            ? 'Tu negocio está en modo solo lectura porque existe un pago pendiente.'
            : businessData.subscription_status === 'canceled'
                ? 'Tu negocio está en modo solo lectura porque la suscripción está cancelada.'
                : ''

    const hasLogo = Boolean(
        businessData.logo_url?.trim()
    )

    const hasCover = Boolean(
        businessData.cover_url?.trim()
    )

    const hasWhatsApp = Boolean(
        businessData.whatsapp_phone?.trim()
    )

    const hasAddress = Boolean(
        businessData.address?.trim()
    )
    type BusinessTab =
        | 'general'
        | 'contact'
        | 'images'

    const BUSINESS_TABS: Array<{
        id: BusinessTab
        label: string
        description: string
    }> = [
            {
                id: 'general',
                label: 'General',
                description: 'Nombre e información pública',
            },
            {
                id: 'contact',
                label: 'Contacto',
                description: 'Ubicación, WhatsApp y redes',
            },
            {
                id: 'images',
                label: 'Imágenes',
                description: 'Logo y portada',
            },
        ]

    return (
        <main className="min-h-screenpx-4 py-6 text-slate-950 md:px-8 md:py-8">
            <div className="mx-auto max-w-7xl space-y-6 md:space-y-8">
                <header className="flex flex-col gap-5 border-b border-black/10 pb-6 lg:flex-row lg:items-end lg:justify-between">
                    <div>
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
                        subscriptionBlockReason={subscriptionBlockReason}
                    />
                </section>
            </div>
        </main>
    )
}

type StatusCardProps = {
    label: string
    ready: boolean
    description: string
}

function StatusCard({
    label,
    ready,
    description,
}: StatusCardProps) {
    return (
        <article className="rounded-[26px] border border-black/10 bg-[#FFFCF4] p-5 shadow-[0_18px_45px_rgba(15,23,42,0.07)]">
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-500">
                {label}
            </p>

            <h2
                className={`mt-3 text-2xl font-black ${ready
                    ? 'text-emerald-700'
                    : 'text-slate-950'
                    }`}
            >
                {ready ? 'Listo' : 'Pendiente'}
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-500">
                {description}
            </p>
        </article>
    )
}