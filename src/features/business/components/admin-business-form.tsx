'use client'

import {
    useCallback,
    useEffect,
    useRef,
    useState,
} from 'react'
import { useRouter } from 'next/navigation'
import { updateBusinessServer } from '@/src/features/business/api/update-business-server'
import type { BusinessAdminItem } from '@/src/features/business/api/get-business-admin'
import { AdminInput } from '@/src/features/admin/components/admin-input'
import { AdminSelect } from '@/src/features/admin/components/admin-select'
import { AdminAlert } from '@/src/features/admin/components/admin-alert'
import {
    Copy,
    ExternalLink,
    Globe2,
} from 'lucide-react'

type Props = {
    business: BusinessAdminItem
    canEdit: boolean
    subscriptionBlockReason?: string
    returnTo?: string
}

type UploadedBusinessAsset = {
    url: string
    path: string
}

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


export function AdminBusinessForm({
    business,
    canEdit,
    subscriptionBlockReason,
    returnTo,
}: Props) {
    const router = useRouter()

    const [loading, setLoading] = useState(false)
    const [uploadingLogo, setUploadingLogo] =
        useState(false)
    const [uploadingCover, setUploadingCover] =
        useState(false)

    const [message, setMessage] = useState('')
    const [errorMessage, setErrorMessage] =
        useState('')

    const showSuccess = useCallback((text: string) => {
        setErrorMessage('')
        setMessage(text)
    }, [])

    const showError = useCallback((text: string) => {
        setMessage('')
        setErrorMessage(text)
    }, [])

    const closeSuccessAlert = useCallback(() => {
        setMessage('')
    }, [])

    const closeErrorAlert = useCallback(() => {
        setErrorMessage('')
    }, [])

    const [activeTab, setActiveTab] =
        useState<BusinessTab>('general')

    const [logoPreview, setLogoPreview] =
        useState<string | null>(
            business.logo_url ?? null
        )

    const [coverPreview, setCoverPreview] =
        useState<string | null>(
            business.cover_url ?? null
        )

    const [tempLogoPreview, setTempLogoPreview] =
        useState<string | null>(null)

    const [tempCoverPreview, setTempCoverPreview] =
        useState<string | null>(null)

    const [form, setForm] = useState({
        name: business.name ?? '',
        phone: business.phone ?? '',
        email: business.email ?? '',
        address: business.address ?? '',
        city: business.city ?? '',
        country: business.country ?? 'Chile',
        instagram_url:
            business.instagram_url ?? '',
        logo_url: business.logo_url ?? '',
        cover_url: business.cover_url ?? '',
        description:
            business.description ?? '',
        timezone:
            business.timezone ??
            'America/Santiago',
        whatsapp_phone:
            business.whatsapp_phone ?? '',
        whatsapp_routing:
            business.whatsapp_routing ??
            'fallback',
    })

    const [
        temporaryLogoPath,
        setTemporaryLogoPath,
    ] = useState<string | null>(null)

    const [
        temporaryCoverPath,
        setTemporaryCoverPath,
    ] = useState<string | null>(null)

    const temporaryLogoPathRef =
        useRef<string | null>(null)

    const temporaryCoverPathRef =
        useRef<string | null>(null)

    const isBusy =
        loading ||
        uploadingLogo ||
        uploadingCover

    const publicPath = `/b/${business.slug}`

    const [publicUrl, setPublicUrl] =
        useState(publicPath)

    useEffect(() => {
        const configuredBaseUrl =
            process.env.NEXT_PUBLIC_APP_URL
                ?.trim()
                .replace(/\/$/, '')

        const baseUrl =
            configuredBaseUrl ||
            window.location.origin

        setPublicUrl(`${baseUrl}${publicPath}`)
    }, [publicPath])

    useEffect(() => {
        temporaryLogoPathRef.current =
            temporaryLogoPath
    }, [temporaryLogoPath])

    useEffect(() => {
        temporaryCoverPathRef.current =
            temporaryCoverPath
    }, [temporaryCoverPath])

    useEffect(() => {
        return () => {
            const paths = [
                temporaryLogoPathRef.current,
                temporaryCoverPathRef.current,
            ].filter(
                (path): path is string =>
                    Boolean(path)
            )

            for (const path of paths) {
                void fetch(
                    '/api/business/assets',
                    {
                        method: 'DELETE',
                        headers: {
                            'Content-Type':
                                'application/json',
                        },
                        body: JSON.stringify({
                            path,
                        }),
                        keepalive: true,
                    }
                )
            }
        }
    }, [])

    useEffect(() => {
        return () => {
            if (tempLogoPreview) URL.revokeObjectURL(tempLogoPreview)
            if (tempCoverPreview) URL.revokeObjectURL(tempCoverPreview)
        }
    }, [tempLogoPreview, tempCoverPreview])

    function updateField(field: keyof typeof form, value: string) {
        setForm((prev) => {
            const next = {
                ...prev,
                [field]: value,
            }

            return next
        })
    }

    async function handleCopyPublicUrl() {
        try {
            await navigator.clipboard.writeText(
                publicUrl
            )

            showSuccess(
                'Enlace público copiado'
            )
        } catch {
            showError(
                'No se pudo copiar el enlace público'
            )
        }
    }

    async function uploadBusinessImage(
        file: File,
        type: 'logo' | 'cover'
    ): Promise<UploadedBusinessAsset> {
        if (!canEdit) {
            throw new Error(
                subscriptionBlockReason ||
                'La suscripción actual no permite modificar imágenes.'
            )
        }

        const allowedTypes = new Set([
            'image/jpeg',
            'image/png',
            'image/webp',
        ])

        if (!allowedTypes.has(file.type)) {
            throw new Error(
                'Solo se permiten imágenes JPG, PNG o WEBP'
            )
        }

        const maxSize =
            type === 'logo'
                ? 3 * 1024 * 1024
                : 6 * 1024 * 1024

        if (file.size > maxSize) {
            throw new Error(
                type === 'logo'
                    ? 'El logo no puede superar los 3 MB'
                    : 'La portada no puede superar los 6 MB'
            )
        }

        const body = new FormData()
        body.append('file', file)
        body.append('type', type)

        const response = await fetch(
            '/api/business/assets',
            {
                method: 'POST',
                body,
            }
        )

        const result = (await response.json()) as {
            ok?: boolean
            url?: string
            path?: string
            message?: string
        }

        if (
            !response.ok ||
            !result.ok ||
            !result.url ||
            !result.path
        ) {
            throw new Error(
                result.message ||
                'No se pudo subir la imagen'
            )
        }

        return {
            url: result.url,
            path: result.path,
        }
    }

    async function deleteBusinessAsset(
        input: {
            path?: string | null
            url?: string | null
        }
    ) {
        const response = await fetch(
            '/api/business/assets',
            {
                method: 'DELETE',
                headers: {
                    'Content-Type':
                        'application/json',
                },
                body: JSON.stringify(input),
            }
        )

        if (!response.ok && response.status !== 404) {
            const result = await response
                .json()
                .catch(() => null)

            console.error(
                'No se pudo limpiar la imagen:',
                result
            )
        }
    }

    async function handleLogoUpload(
        e: React.ChangeEvent<HTMLInputElement>
    ) {
        const file = e.target.files?.[0]

        e.target.value = ''

        if (!file) return

        if (!canEdit) {
            showError(
                subscriptionBlockReason ||
                'La suscripción actual no permite modificar imágenes.'
            )
            return
        }

        let localPreview: string | null = null

        try {
            setErrorMessage('')
            setMessage('')
            setUploadingLogo(true)

            localPreview =
                URL.createObjectURL(file)

            setTempLogoPreview(localPreview)
            setLogoPreview(localPreview)

            const uploaded =
                await uploadBusinessImage(
                    file,
                    'logo'
                )

            const previousTemporaryPath =
                temporaryLogoPathRef.current

            setTemporaryLogoPath(uploaded.path)
            temporaryLogoPathRef.current =
                uploaded.path

            setForm((prev) => ({
                ...prev,
                logo_url: uploaded.url,
            }))

            setLogoPreview(uploaded.url)
            setTempLogoPreview(null)

            if (previousTemporaryPath) {
                await deleteBusinessAsset({
                    path: previousTemporaryPath,
                })
            }
        } catch (error) {
            showError(
                error instanceof Error
                    ? error.message
                    : 'Error subiendo logo'
            )

            setLogoPreview(
                form.logo_url ||
                business.logo_url ||
                null
            )
        } finally {
            if (localPreview) {
                URL.revokeObjectURL(
                    localPreview
                )
            }

            setUploadingLogo(false)
        }
    }

    async function handleCoverUpload(
        e: React.ChangeEvent<HTMLInputElement>
    ) {
        const file = e.target.files?.[0]

        e.target.value = ''

        if (!file) return

        if (!canEdit) {
            showError(
                subscriptionBlockReason ||
                'La suscripción actual no permite modificar imágenes.'
            )
            return
        }

        let localPreview: string | null = null

        try {
            setErrorMessage('')
            setMessage('')
            setUploadingCover(true)

            localPreview =
                URL.createObjectURL(file)

            setTempCoverPreview(localPreview)
            setCoverPreview(localPreview)

            const uploaded =
                await uploadBusinessImage(
                    file,
                    'cover'
                )

            const previousTemporaryPath =
                temporaryCoverPathRef.current

            setTemporaryCoverPath(
                uploaded.path
            )

            temporaryCoverPathRef.current =
                uploaded.path

            setForm((prev) => ({
                ...prev,
                cover_url: uploaded.url,
            }))

            setCoverPreview(uploaded.url)
            setTempCoverPreview(null)

            if (previousTemporaryPath) {
                await deleteBusinessAsset({
                    path: previousTemporaryPath,
                })
            }
        } catch (error) {
            showError(
                error instanceof Error
                    ? error.message
                    : 'Error subiendo portada'
            )

            setCoverPreview(
                form.cover_url ||
                business.cover_url ||
                null
            )
        } finally {
            if (localPreview) {
                URL.revokeObjectURL(
                    localPreview
                )
            }

            setUploadingCover(false)
        }
    }

    async function handleSubmit(
        event: React.FormEvent<HTMLFormElement>
    ) {
        event.preventDefault()

        if (!canEdit) {
            showError(
                subscriptionBlockReason ||
                'La suscripción actual no permite modificar el negocio.'
            )
            return
        }

        if (isBusy) return

        setLoading(true)
        setMessage('')
        setErrorMessage('')

        try {
            if (!form.name.trim()) {
                throw new Error(
                    'Ingresa el nombre del negocio'
                )
            }

            await updateBusinessServer({
                id: business.id,
                name: form.name,
                phone: form.phone,
                email: form.email,
                address: form.address,
                city: form.city,
                country: form.country,
                instagram_url: form.instagram_url,
                logo_url: form.logo_url,
                cover_url: form.cover_url,
                description: form.description,
                timezone: form.timezone,
                whatsapp_phone:
                    form.whatsapp_phone,
                whatsapp_routing:
                    form.whatsapp_routing,
            })

            temporaryLogoPathRef.current = null
            temporaryCoverPathRef.current = null

            setTemporaryLogoPath(null)
            setTemporaryCoverPath(null)

            if (
                business.logo_url &&
                business.logo_url !== form.logo_url
            ) {
                await deleteBusinessAsset({
                    url: business.logo_url,
                })
            }

            if (
                business.cover_url &&
                business.cover_url !== form.cover_url
            ) {
                await deleteBusinessAsset({
                    url: business.cover_url,
                })
            }


            if (returnTo) {
                window.location.assign(returnTo)
                return
            }

            showSuccess(
                'Negocio actualizado correctamente'
            )

            router.refresh()



        } catch (error) {
            showError(
                error instanceof Error
                    ? error.message
                    : 'Error actualizando negocio'
            )
        } finally {
            setLoading(false)
        }
    }

    return (
        <form
            onSubmit={handleSubmit}
            className="space-y-4"
        >
            <AdminAlert
                variant="success"
                title="Cambios guardados"
                message={message}
                floating
                onClose={closeSuccessAlert}
                autoClose
                duration={3500}
            />

            <AdminAlert
                variant="error"
                title="No se pudo completar la acción"
                message={errorMessage}
                floating
                onClose={closeErrorAlert}
                autoClose
                duration={5000}
            />

            {!canEdit && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">
                    {subscriptionBlockReason ||
                        'La configuración se encuentra en modo solo lectura.'}
                </div>
            )}

            <section className="overflow-hidden rounded-[24px] border border-black/10 bg-white">
                <nav
                    className="flex overflow-x-auto border-b border-black/10 bg-[#FBF7EE] px-2"
                    aria-label="Secciones del negocio"
                >
                    {BUSINESS_TABS.map((tab) => {
                        const selected =
                            activeTab === tab.id

                        return (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() =>
                                    setActiveTab(tab.id)
                                }
                                className={`relative min-w-fit px-5 py-4 text-left transition ${selected
                                    ? 'text-slate-950'
                                    : 'text-slate-500 hover:text-slate-800'
                                    }`}
                            >
                                <span className="block text-sm font-black">
                                    {tab.label}
                                </span>

                                <span className="mt-0.5 hidden text-xs font-semibold sm:block">
                                    {tab.description}
                                </span>

                                {selected && (
                                    <span className="absolute bottom-0 left-4 right-4 h-0.5 rounded-full bg-[#C8942E]" />
                                )}
                            </button>
                        )
                    })}
                </nav>

                <div className="p-4 md:p-6">
                    {activeTab === 'general' && (
                        <section className="mx-auto max-w-3xl">
                            <div className="mb-6">
                                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#C8942E]">
                                    Identidad
                                </p>

                                <h2 className="mt-1 text-2xl font-black text-slate-950">
                                    Información principal
                                </h2>

                                <p className="mt-1 text-sm leading-6 text-slate-500">
                                    Estos datos identifican al negocio en la página pública.
                                </p>
                            </div>

                            <div className="grid gap-5">
                                <AdminInput
                                    id="business-name"
                                    label="Nombre del negocio"
                                    value={form.name}
                                    onChange={(value) =>
                                        updateField(
                                            'name',
                                            value
                                        )
                                    }
                                    placeholder="Demo Barber Studio"
                                    disabled={
                                        !canEdit || isBusy
                                    }
                                />

                                <div>
                                    <p className="mb-2 text-sm font-black text-slate-700">
                                        Enlace público
                                    </p>

                                    <div className="overflow-hidden rounded-[22px] border border-black/10 bg-gradient-to-br from-[#FFFDF8] to-[#F8F2E7] shadow-[0_12px_30px_rgba(15,23,42,0.06)]">
                                        <div className="flex items-start gap-3 border-b border-black/5 px-4 py-4">
                                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#C8942E]/12 text-[#9A681B] ring-1 ring-[#C8942E]/20">
                                                <Globe2 className="h-5 w-5" />
                                            </div>

                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-black text-slate-950">
                                                    Sitio público del negocio
                                                </p>

                                                <p className="mt-0.5 text-xs font-semibold leading-5 text-slate-500">
                                                    Comparte este enlace con tus clientes para que puedan ver los servicios y reservar.
                                                </p>
                                            </div>

                                            <span className="hidden shrink-0 rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-emerald-700 ring-1 ring-emerald-200 sm:inline-flex">
                                                Activo
                                            </span>
                                        </div>

                                        <div className="p-4">
                                            <div className="flex min-h-12 items-center rounded-2xl border border-black/10 bg-white px-4 py-3 shadow-inner">
                                                <span className="min-w-0 break-all font-mono text-xs font-bold leading-5 text-slate-700 sm:text-sm">
                                                    {publicUrl}
                                                </span>
                                            </div>

                                            <div className="mt-3 grid gap-2 sm:grid-cols-2">
                                                <button
                                                    type="button"
                                                    onClick={handleCopyPublicUrl}
                                                    className="group inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-black/10 bg-white px-4 text-sm font-black text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-[#C8942E]/40 hover:bg-[#FFFDF8] hover:text-[#8A5D16] active:scale-[0.98]"
                                                >
                                                    <Copy className="h-4 w-4 transition group-hover:scale-110" />
                                                    Copiar enlace
                                                </button>

                                                <a
                                                    href={publicUrl}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="group inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#C8942E] px-4 text-sm font-black text-white shadow-[0_10px_24px_rgba(200,148,46,0.25)] transition hover:-translate-y-0.5 hover:brightness-105 active:scale-[0.98]"
                                                >
                                                    Ver sitio público
                                                    <ExternalLink className="h-4 w-4 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                                                </a>
                                            </div>
                                        </div>

                                        <div className="flex items-start gap-2 border-t border-black/5 bg-white/60 px-4 py-3">
                                            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#C8942E]" />

                                            <p className="text-xs font-semibold leading-5 text-slate-500">
                                                El enlace se mantiene estable aunque cambies el nombre del negocio.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <div className="mb-2 flex items-center justify-between gap-3">
                                        <label
                                            htmlFor="business-description"
                                            className="text-sm font-black text-slate-700"
                                        >
                                            Descripción
                                        </label>

                                        <span className="text-xs font-semibold text-slate-400">
                                            {form.description.length}/2000
                                        </span>
                                    </div>

                                    <textarea
                                        id="business-description"
                                        value={form.description}
                                        onChange={(event) =>
                                            updateField(
                                                'description',
                                                event.target.value
                                            )
                                        }
                                        disabled={
                                            !canEdit || isBusy
                                        }
                                        maxLength={2000}
                                        rows={5}
                                        placeholder="Describe brevemente tu negocio y la experiencia que ofreces."
                                        className="min-h-[130px] w-full resize-y rounded-2xl border border-black/10 bg-white px-4 py-3.5 text-sm font-semibold text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-[#C8942E] focus:shadow-[0_0_0_4px_rgba(200,148,46,0.12)] disabled:cursor-not-allowed disabled:bg-slate-100 disabled:opacity-70"
                                    />
                                </div>

                                <AdminSelect
                                    id="business-timezone"
                                    label="Zona horaria"
                                    value={form.timezone}
                                    onChange={(value) =>
                                        updateField(
                                            'timezone',
                                            value
                                        )
                                    }
                                    disabled={
                                        !canEdit || isBusy
                                    }
                                    options={[
                                        {
                                            value:
                                                'America/Santiago',
                                            label:
                                                'Chile — Santiago',
                                        },
                                    ]}
                                />
                            </div>
                        </section>
                    )}

                    {activeTab === 'contact' && (
                        <section className="mx-auto max-w-3xl">
                            <div className="mb-6">
                                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#C8942E]">
                                    Contacto
                                </p>

                                <h2 className="mt-1 text-2xl font-black text-slate-950">
                                    Contacto y ubicación
                                </h2>

                                <p className="mt-1 text-sm leading-6 text-slate-500">
                                    Información que verán los clientes y que se utilizará para confirmar reservas.
                                </p>
                            </div>

                            <div className="grid gap-5 md:grid-cols-2">
                                <AdminInput
                                    id="business-phone"
                                    label="Teléfono"
                                    value={form.phone}
                                    onChange={(value) =>
                                        updateField(
                                            'phone',
                                            value
                                        )
                                    }
                                    placeholder="+56 9 1234 5678"
                                    disabled={
                                        !canEdit || isBusy
                                    }
                                />

                                <AdminInput
                                    id="business-email"
                                    label="Correo electrónico"
                                    type="email"
                                    value={form.email}
                                    onChange={(value) =>
                                        updateField(
                                            'email',
                                            value
                                        )
                                    }
                                    placeholder="contacto@negocio.cl"
                                    disabled={
                                        !canEdit || isBusy
                                    }
                                />

                                <div className="md:col-span-2">
                                    <AdminInput
                                        id="business-address"
                                        label="Dirección"
                                        value={form.address}
                                        onChange={(value) =>
                                            updateField(
                                                'address',
                                                value
                                            )
                                        }
                                        placeholder="Los Boldos 10831"
                                        disabled={
                                            !canEdit ||
                                            isBusy
                                        }
                                    />
                                </div>

                                <AdminInput
                                    id="business-city"
                                    label="Ciudad"
                                    value={form.city}
                                    onChange={(value) =>
                                        updateField(
                                            'city',
                                            value
                                        )
                                    }
                                    placeholder="Santiago"
                                    disabled={
                                        !canEdit || isBusy
                                    }
                                />

                                <AdminInput
                                    id="business-country"
                                    label="País"
                                    value={form.country}
                                    onChange={(value) =>
                                        updateField(
                                            'country',
                                            value
                                        )
                                    }
                                    placeholder="Chile"
                                    disabled={
                                        !canEdit || isBusy
                                    }
                                />

                                <AdminInput
                                    id="business-whatsapp"
                                    label="WhatsApp"
                                    value={
                                        form.whatsapp_phone
                                    }
                                    onChange={(value) =>
                                        updateField(
                                            'whatsapp_phone',
                                            value
                                        )
                                    }
                                    placeholder="56912345678"
                                    hint="Sin +, espacios ni guiones."
                                    disabled={
                                        !canEdit || isBusy
                                    }
                                />

                                <AdminSelect
                                    id="business-whatsapp-routing"
                                    label="Destino de confirmación"
                                    value={
                                        form.whatsapp_routing
                                    }
                                    onChange={(value) =>
                                        updateField(
                                            'whatsapp_routing',
                                            value as typeof form.whatsapp_routing
                                        )
                                    }
                                    disabled={
                                        !canEdit || isBusy
                                    }
                                    options={[
                                        {
                                            value: 'fallback',
                                            label:
                                                'Barbero y luego negocio',
                                        },
                                        {
                                            value: 'business',
                                            label:
                                                'WhatsApp del negocio',
                                        },
                                        {
                                            value: 'barber',
                                            label:
                                                'WhatsApp del barbero',
                                        },
                                    ]}
                                />

                                <div className="md:col-span-2">
                                    <AdminInput
                                        id="business-instagram"
                                        label="Instagram"
                                        value={
                                            form.instagram_url
                                        }
                                        onChange={(value) =>
                                            updateField(
                                                'instagram_url',
                                                value
                                            )
                                        }
                                        placeholder="https://instagram.com/tu_negocio"
                                        disabled={
                                            !canEdit ||
                                            isBusy
                                        }
                                    />
                                </div>
                            </div>
                        </section>
                    )}

                    {activeTab === 'images' && (
                        <section className="mx-auto max-w-4xl">
                            <div className="mb-6">
                                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#C8942E]">
                                    Apariencia
                                </p>

                                <h2 className="mt-1 text-2xl font-black text-slate-950">
                                    Logo y portada
                                </h2>

                                <p className="mt-1 text-sm leading-6 text-slate-500">
                                    Selecciona las imágenes que representarán al negocio públicamente.
                                </p>
                            </div>

                            <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
                                <article className="rounded-[22px] border border-black/10 bg-[#FBF7EE] p-4">
                                    <div className="flex items-center justify-between gap-3">
                                        <div>
                                            <h3 className="font-black text-slate-950">
                                                Logo
                                            </h3>

                                            <p className="mt-1 text-xs font-semibold text-slate-500">
                                                Imagen cuadrada
                                            </p>
                                        </div>

                                        {uploadingLogo && (
                                            <span className="rounded-full bg-[#C8942E]/10 px-3 py-1 text-xs font-black text-[#8A5D16]">
                                                Subiendo
                                            </span>
                                        )}
                                    </div>

                                    <div className="mx-auto mt-5 h-36 w-36 overflow-hidden rounded-[28px] bg-slate-950 ring-1 ring-black/10">
                                        {logoPreview ? (
                                            <img
                                                src={logoPreview}
                                                alt="Logo del negocio"
                                                className="h-full w-full object-cover"
                                            />
                                        ) : (
                                            <div className="flex h-full items-center justify-center text-sm font-black text-white">
                                                Sin logo
                                            </div>
                                        )}
                                    </div>

                                    <label
                                        className={`mt-5 flex h-11 items-center justify-center rounded-xl border border-[#C8942E] px-4 text-sm font-black transition ${!canEdit || isBusy
                                            ? 'cursor-not-allowed bg-slate-100 text-slate-400'
                                            : 'cursor-pointer bg-[#C8942E] text-white hover:brightness-105'
                                            }`}
                                    >
                                        {uploadingLogo
                                            ? 'Subiendo...'
                                            : logoPreview
                                                ? 'Cambiar logo'
                                                : 'Subir logo'}

                                        <input
                                            type="file"
                                            accept="image/jpeg,image/png,image/webp"
                                            onChange={
                                                handleLogoUpload
                                            }
                                            disabled={
                                                !canEdit ||
                                                isBusy
                                            }
                                            className="sr-only"
                                        />
                                    </label>

                                    <p className="mt-3 text-center text-xs font-semibold text-slate-500">
                                        JPG, PNG o WEBP. Máximo 3 MB.
                                    </p>
                                </article>

                                <article className="rounded-[22px] border border-black/10 bg-[#FBF7EE] p-4">
                                    <div className="flex items-center justify-between gap-3">
                                        <div>
                                            <h3 className="font-black text-slate-950">
                                                Portada
                                            </h3>

                                            <p className="mt-1 text-xs font-semibold text-slate-500">
                                                Imagen horizontal para el encabezado público
                                            </p>
                                        </div>

                                        {uploadingCover && (
                                            <span className="rounded-full bg-[#C8942E]/10 px-3 py-1 text-xs font-black text-[#8A5D16]">
                                                Subiendo
                                            </span>
                                        )}
                                    </div>

                                    <div className="mt-5 overflow-hidden rounded-[20px] bg-slate-950">
                                        {coverPreview ? (
                                            <img
                                                src={
                                                    coverPreview
                                                }
                                                alt="Portada del negocio"
                                                className="h-52 w-full object-cover"
                                            />
                                        ) : (
                                            <div className="flex h-52 items-center justify-center text-sm font-black text-white">
                                                Sin portada
                                            </div>
                                        )}
                                    </div>

                                    <label
                                        className={`mt-5 flex h-11 items-center justify-center rounded-xl border border-[#C8942E] px-4 text-sm font-black transition ${!canEdit || isBusy
                                            ? 'cursor-not-allowed bg-slate-100 text-slate-400'
                                            : 'cursor-pointer bg-[#C8942E] text-white hover:brightness-105'
                                            }`}
                                    >
                                        {uploadingCover
                                            ? 'Subiendo...'
                                            : coverPreview
                                                ? 'Cambiar portada'
                                                : 'Subir portada'}

                                        <input
                                            type="file"
                                            accept="image/jpeg,image/png,image/webp"
                                            onChange={
                                                handleCoverUpload
                                            }
                                            disabled={
                                                !canEdit ||
                                                isBusy
                                            }
                                            className="sr-only"
                                        />
                                    </label>

                                    <p className="mt-3 text-center text-xs font-semibold text-slate-500">
                                        JPG, PNG o WEBP. Máximo 6 MB.
                                    </p>
                                </article>
                            </div>
                        </section>
                    )}
                </div>
            </section>

            <div className="sticky bottom-3 z-20 rounded-2xl border border-black/10 bg-[#FFFCF4]/95 px-4 py-3 shadow-[0_14px_40px_rgba(15,23,42,0.16)] backdrop-blur md:px-5">
                <div className="flex items-center justify-between gap-4">
                    <div className="hidden sm:block">
                        <p className="text-sm font-black text-slate-800">
                            Configuración del negocio
                        </p>

                        <p className="mt-0.5 text-xs font-semibold text-slate-500">
                            Guarda para publicar los cambios.
                        </p>
                    </div>

                    <button
                        type="submit"
                        disabled={!canEdit || isBusy}
                        className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-[#C8942E] px-6 text-sm font-black text-white shadow-[0_10px_24px_rgba(200,148,46,0.24)] transition hover:brightness-105 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 sm:ml-auto sm:w-auto"
                    >
                        {!canEdit
                            ? 'Solo lectura'
                            : loading
                                ? 'Guardando...'
                                : 'Guardar cambios'}
                    </button>
                </div>
            </div>
        </form>
    )
}