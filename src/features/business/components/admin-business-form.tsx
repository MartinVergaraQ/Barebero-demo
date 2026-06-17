'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { updateBusinessServer } from '@/src/features/business/api/update-business-server'
import { createClient } from '@/src/lib/supabase/browser'
import { AdminInput } from '@/src/features/admin/components/admin-input'
import { AdminSelect } from '@/src/features/admin/components/admin-select'

type Props = {
    business: {
        id: string
        name: string
        slug: string
        phone: string | null
        email: string | null
        address: string | null
        city: string | null
        country: string | null
        instagram_url: string | null
        logo_url: string | null
        cover_url: string | null
        description: string | null
        timezone: string
        whatsapp_phone: string | null
        whatsapp_routing: 'business' | 'barber' | 'fallback' | null

        // Solo lectura
        plan_slug: string
        subscription_status: 'trialing' | 'active' | 'past_due' | 'canceled'
        trial_ends_at: string | null
        max_barbers: number | null
        max_services: number | null
    }
}

function getFileExtension(fileName: string) {
    const parts = fileName.split('.')
    return parts.length > 1 ? parts.pop()?.toLowerCase() ?? 'jpg' : 'jpg'
}

function getPublicAssetPath(
    slug: string,
    type: 'logo' | 'cover',
    fileName: string
) {
    const ext = getFileExtension(fileName)
    const version = Date.now()
    return `businesses/${slug}/${type}-${version}.${ext}`
}

const BUCKET_NAME = 'business-assests'

export function AdminBusinessForm({ business }: Props) {
    const router = useRouter()
    const supabase = createClient()

    const [loading, setLoading] = useState(false)
    const [uploadingLogo, setUploadingLogo] = useState(false)
    const [uploadingCover, setUploadingCover] = useState(false)
    const [message, setMessage] = useState('')
    const [errorMessage, setErrorMessage] = useState('')

    const [logoPreview, setLogoPreview] = useState<string | null>(
        business.logo_url ?? null
    )
    const [coverPreview, setCoverPreview] = useState<string | null>(
        business.cover_url ?? null
    )

    const [tempLogoPreview, setTempLogoPreview] = useState<string | null>(null)
    const [tempCoverPreview, setTempCoverPreview] = useState<string | null>(null)

    const [form, setForm] = useState({
        name: business.name ?? '',
        phone: business.phone ?? '',
        email: business.email ?? '',
        address: business.address ?? '',
        city: business.city ?? '',
        country: business.country ?? 'Chile',
        instagram_url: business.instagram_url ?? '',
        logo_url: business.logo_url ?? '',
        cover_url: business.cover_url ?? '',
        description: business.description ?? '',
        timezone: business.timezone ?? 'America/Santiago',
        whatsapp_phone: business.whatsapp_phone ?? '',
        whatsapp_routing: business.whatsapp_routing ?? 'fallback'
    })

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

    async function uploadBusinessImage(file: File, type: 'logo' | 'cover') {
        const filePath = getPublicAssetPath(
            business.slug,
            type,
            file.name
        )

        const { error: uploadError } = await supabase.storage
            .from(BUCKET_NAME)
            .upload(filePath, file, {
                cacheControl: '3600',
                upsert: false,
                contentType: file.type,
            })

        if (uploadError) {
            console.error('Storage upload error:', {
                message: uploadError.message,
                name: uploadError.name,
                filePath,
                fileType: file.type,
                fileName: file.name,
            })

            throw new Error(uploadError.message)
        }

        const { data } = supabase.storage
            .from(BUCKET_NAME)
            .getPublicUrl(filePath)

        return data.publicUrl
    }

    async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        if (!file) return

        if (!file.type.startsWith('image/')) {
            setErrorMessage('El logo debe ser una imagen válida.')
            return
        }

        try {
            setErrorMessage('')
            setMessage('')
            setUploadingLogo(true)

            if (tempLogoPreview) {
                URL.revokeObjectURL(tempLogoPreview)
            }

            const localPreview = URL.createObjectURL(file)
            setTempLogoPreview(localPreview)
            setLogoPreview(localPreview)

            const publicUrl = await uploadBusinessImage(file, 'logo')

            setForm((prev) => ({
                ...prev,
                logo_url: publicUrl,
            }))

            setLogoPreview(publicUrl)
            URL.revokeObjectURL(localPreview)
            setTempLogoPreview(null)
        } catch (error) {
            setErrorMessage(
                error instanceof Error ? error.message : 'Error subiendo logo'
            )

            setLogoPreview(form.logo_url || business.logo_url || null)
        } finally {
            setUploadingLogo(false)
            e.target.value = ''
        }
    }

    async function handleCoverUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        if (!file) return

        if (!file.type.startsWith('image/')) {
            setErrorMessage('La portada debe ser una imagen válida.')
            return
        }

        try {
            setErrorMessage('')
            setMessage('')
            setUploadingCover(true)

            if (tempCoverPreview) {
                URL.revokeObjectURL(tempCoverPreview)
            }

            const localPreview = URL.createObjectURL(file)
            setTempCoverPreview(localPreview)
            setCoverPreview(localPreview)

            const publicUrl = await uploadBusinessImage(file, 'cover')

            setForm((prev) => ({
                ...prev,
                cover_url: publicUrl,
            }))

            setCoverPreview(publicUrl)
            URL.revokeObjectURL(localPreview)
            setTempCoverPreview(null)
        } catch (error) {
            setErrorMessage(
                error instanceof Error ? error.message : 'Error subiendo portada'
            )

            setCoverPreview(form.cover_url || business.cover_url || null)
        } finally {
            setUploadingCover(false)
            e.target.value = ''
        }
    }

    async function handleSubmit(
        e: React.FormEvent<HTMLFormElement>
    ) {
        e.preventDefault()
        setLoading(true)
        setMessage('')
        setErrorMessage('')

        try {
            if (!form.name.trim()) {
                throw new Error('Ingresa el nombre del negocio')
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
                whatsapp_phone: form.whatsapp_phone,
                whatsapp_routing: form.whatsapp_routing,
            })

            setMessage('Negocio actualizado correctamente')
            router.refresh()
        } catch (error) {
            setErrorMessage(
                error instanceof Error
                    ? error.message
                    : 'Error actualizando negocio'
            )
        } finally {
            setLoading(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {errorMessage && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
                    {errorMessage}
                </div>
            )}

            {message && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
                    {message}
                </div>
            )}

            <section className="grid gap-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
                <div className="space-y-5">
                    <div className="rounded-[26px] border border-black/10 bg-[#FBF7EE] p-4 md:p-5">
                        <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#C8942E]">
                            Identidad
                        </p>

                        <h3 className="mt-1 text-xl font-black text-slate-950">
                            Datos principales
                        </h3>

                        <div className="mt-5 grid gap-4">
                            <AdminInput
                                id="business-name"
                                label="Nombre"
                                value={form.name}
                                onChange={(value) => updateField('name', value)}
                                placeholder="Demo Barber Studio"
                                disabled={loading}
                            />

                            <div>
                                <p className="mb-2 block text-sm font-black text-slate-700">
                                    Slug
                                </p>

                                <div className="flex min-h-12 items-center rounded-2xl border border-black/10 bg-slate-100 px-4 py-3 text-sm font-bold text-slate-600">
                                    {business.slug}
                                </div>

                                <p className="mt-2 text-xs font-semibold leading-5 text-slate-500">
                                    El slug identifica la URL pública y no puede modificarse desde este panel.
                                </p>
                            </div>

                            <div>
                                <label
                                    htmlFor="business-description"
                                    className="mb-2 block text-sm font-black text-slate-700"
                                >
                                    Descripción
                                </label>

                                <textarea
                                    id="business-description"
                                    value={form.description}
                                    onChange={(event) =>
                                        updateField('description', event.target.value)
                                    }
                                    disabled={loading}
                                    rows={5}
                                    placeholder="Describe el negocio"
                                    className="min-h-[140px] w-full rounded-2xl border border-black/10 bg-white px-4 py-3.5 text-sm font-semibold text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-[#C8942E] focus:bg-white focus:shadow-[0_0_0_4px_rgba(200,148,46,0.12)] disabled:cursor-not-allowed disabled:opacity-60"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="rounded-[26px] border border-black/10 bg-[#FBF7EE] p-4 md:p-5">
                        <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#C8942E]">
                            Contacto
                        </p>

                        <h3 className="mt-1 text-xl font-black text-slate-950">
                            Teléfono, correo y ubicación
                        </h3>

                        <div className="mt-5 grid gap-4 md:grid-cols-2">
                            <AdminInput
                                id="business-phone"
                                label="Teléfono"
                                value={form.phone}
                                onChange={(value) => updateField('phone', value)}
                                placeholder="+56 9 1234 5678"
                                disabled={loading}
                            />

                            <AdminInput
                                id="business-email"
                                label="Email"
                                type="email"
                                value={form.email}
                                onChange={(value) => updateField('email', value)}
                                placeholder="contacto@negocio.cl"
                                disabled={loading}
                            />

                            <div className="md:col-span-2">
                                <AdminInput
                                    id="business-address"
                                    label="Dirección"
                                    value={form.address}
                                    onChange={(value) => updateField('address', value)}
                                    placeholder="Los Boldos 10830"
                                    disabled={loading}
                                />
                            </div>

                            <AdminInput
                                id="business-city"
                                label="Ciudad"
                                value={form.city}
                                onChange={(value) => updateField('city', value)}
                                placeholder="Santiago"
                                disabled={loading}
                            />

                            <AdminInput
                                id="business-country"
                                label="País"
                                value={form.country}
                                onChange={(value) => updateField('country', value)}
                                placeholder="Chile"
                                disabled={loading}
                            />
                        </div>
                    </div>

                    <div className="rounded-[26px] border border-black/10 bg-[#FBF7EE] p-4 md:p-5">
                        <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#C8942E]">
                            WhatsApp y redes
                        </p>

                        <h3 className="mt-1 text-xl font-black text-slate-950">
                            Confirmación y redes sociales
                        </h3>

                        <div className="mt-5 grid gap-4 md:grid-cols-2">
                            <div>
                                <AdminInput
                                    id="business-whatsapp"
                                    label="WhatsApp del negocio"
                                    value={form.whatsapp_phone}
                                    onChange={(value) =>
                                        updateField('whatsapp_phone', value)
                                    }
                                    placeholder="56912345678"
                                    disabled={loading}
                                />

                                <p className="mt-2 text-xs font-semibold leading-5 text-slate-500">
                                    Sin +, sin espacios ni guiones idealmente.
                                </p>
                            </div>

                            <AdminSelect
                                id="business-whatsapp-routing"
                                label="Routing de WhatsApp"
                                value={form.whatsapp_routing}
                                onChange={(value) =>
                                    updateField(
                                        'whatsapp_routing',
                                        value as typeof form.whatsapp_routing
                                    )
                                }
                                disabled={loading}
                                options={[
                                    {
                                        value: 'fallback',
                                        label: 'Barbero primero, si no negocio',
                                    },
                                    {
                                        value: 'business',
                                        label: 'Negocio primero',
                                    },
                                    {
                                        value: 'barber',
                                        label: 'Barbero primero',
                                    },
                                ]}
                            />

                            <div className="md:col-span-2">
                                <AdminInput
                                    id="business-instagram"
                                    label="Instagram URL"
                                    value={form.instagram_url}
                                    onChange={(value) =>
                                        updateField('instagram_url', value)
                                    }
                                    placeholder="https://instagram.com/tu_negocio"
                                    disabled={loading}
                                />

                                <p className="mt-2 text-xs font-semibold leading-5 text-slate-500">
                                    Este campo se mantiene como enlace manual.
                                </p>
                            </div>

                            <div className="md:col-span-2">
                                <AdminSelect
                                    id="business-timezone"
                                    label="Timezone"
                                    value={form.timezone}
                                    onChange={(value) => updateField('timezone', value)}
                                    disabled={loading}
                                    options={[
                                        {
                                            value: 'America/Santiago',
                                            label: 'America/Santiago',
                                        },
                                        {
                                            value: 'America/Bogota',
                                            label: 'America/Bogota',
                                        },
                                        {
                                            value: 'America/Lima',
                                            label: 'America/Lima',
                                        },
                                        {
                                            value: 'America/Mexico_City',
                                            label: 'America/Mexico_City',
                                        },
                                    ]}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-5">
                    <div className="rounded-[26px] border border-black/10 bg-[#FBF7EE] p-4 md:p-5">
                        <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#C8942E]">
                            Imágenes
                        </p>

                        <h3 className="mt-1 text-xl font-black text-slate-950">
                            Logo y portada
                        </h3>

                        <div className="mt-5 space-y-5">
                            <div>
                                <div className="mb-3 flex items-center justify-between gap-3">
                                    <div>
                                        <p className="text-sm font-black text-slate-700">
                                            Logo del negocio
                                        </p>

                                        <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
                                            PNG o JPG recomendado. Idealmente cuadrado.
                                        </p>
                                    </div>

                                    {uploadingLogo && (
                                        <span className="rounded-full bg-[#C8942E]/10 px-3 py-1 text-xs font-black text-[#8A5D16]">
                                            Subiendo...
                                        </span>
                                    )}
                                </div>

                                <div className="rounded-[24px] border border-black/10 bg-white p-4">
                                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                                        <div className="h-28 w-28 shrink-0 overflow-hidden rounded-[24px] bg-slate-950 ring-1 ring-black/10">
                                            {logoPreview ? (
                                                <img
                                                    src={logoPreview}
                                                    alt="Preview logo"
                                                    className="h-full w-full object-cover"
                                                />
                                            ) : (
                                                <div className="flex h-full w-full items-center justify-center text-sm font-black text-white">
                                                    Logo
                                                </div>
                                            )}
                                        </div>

                                        <div className="min-w-0 flex-1">
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={handleLogoUpload}
                                                disabled={
                                                    loading ||
                                                    uploadingLogo ||
                                                    uploadingCover
                                                }
                                                className="block w-full cursor-pointer rounded-2xl border border-black/10 bg-[#FBF7EE] text-sm font-semibold text-slate-700 file:mr-4 file:h-11 file:border-0 file:bg-[#C8942E] file:px-4 file:text-sm file:font-black file:text-white disabled:cursor-not-allowed disabled:opacity-60"
                                            />

                                            {form.logo_url && (
                                                <p className="mt-2 line-clamp-1 break-all text-xs font-semibold text-slate-500">
                                                    {form.logo_url}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <div className="mb-3 flex items-center justify-between gap-3">
                                    <div>
                                        <p className="text-sm font-black text-slate-700">
                                            Portada del negocio
                                        </p>

                                        <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
                                            Usa una imagen horizontal para el hero público.
                                        </p>
                                    </div>

                                    {uploadingCover && (
                                        <span className="rounded-full bg-[#C8942E]/10 px-3 py-1 text-xs font-black text-[#8A5D16]">
                                            Subiendo...
                                        </span>
                                    )}
                                </div>

                                <div className="overflow-hidden rounded-[24px] border border-black/10 bg-white p-4">
                                    <div className="overflow-hidden rounded-[20px] bg-slate-950">
                                        {coverPreview ? (
                                            <img
                                                src={coverPreview}
                                                alt="Preview portada"
                                                className="h-52 w-full object-cover"
                                            />
                                        ) : (
                                            <div className="flex h-52 w-full flex-col items-center justify-center text-center text-white">
                                                <p className="text-lg font-black">
                                                    Portada
                                                </p>
                                                <p className="mt-1 text-sm text-white/70">
                                                    Sin imagen cargada
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    <div className="mt-4">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleCoverUpload}
                                            disabled={
                                                loading ||
                                                uploadingLogo ||
                                                uploadingCover
                                            }
                                            className="block w-full cursor-pointer rounded-2xl border border-black/10 bg-[#FBF7EE] text-sm font-semibold text-slate-700 file:mr-4 file:h-11 file:border-0 file:bg-[#C8942E] file:px-4 file:text-sm file:font-black file:text-white disabled:cursor-not-allowed disabled:opacity-60"
                                        />

                                        {form.cover_url && (
                                            <p className="mt-2 line-clamp-1 break-all text-xs font-semibold text-slate-500">
                                                {form.cover_url}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-[26px] border border-black/10 bg-[#FBF7EE] p-4 md:p-5">
                        <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#C8942E]">
                            Plan y suscripción
                        </p>

                        <h3 className="mt-1 text-xl font-black text-slate-950">
                            Configuración comercial
                        </h3>

                        <div className="mt-5 grid gap-4 md:grid-cols-2">
                            <div className="rounded-2xl border border-black/10 bg-white px-4 py-3">
                                <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                                    Plan actual
                                </p>

                                <p className="mt-1 text-base font-black text-slate-950">
                                    {business.plan_slug === 'studio'
                                        ? 'Studio'
                                        : business.plan_slug === 'pro'
                                            ? 'Pro'
                                            : 'Starter'}
                                </p>
                            </div>

                            <div className="rounded-2xl border border-black/10 bg-white px-4 py-3">
                                <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                                    Estado
                                </p>

                                <p className="mt-1 text-base font-black text-slate-950">
                                    {business.subscription_status === 'active'
                                        ? 'Activa'
                                        : business.subscription_status === 'past_due'
                                            ? 'Pago pendiente'
                                            : business.subscription_status === 'canceled'
                                                ? 'Cancelada'
                                                : 'Período de prueba'}
                                </p>
                            </div>

                            <div className="rounded-2xl border border-black/10 bg-white px-4 py-3">
                                <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                                    Máximo de barberos
                                </p>

                                <p className="mt-1 text-base font-black text-slate-950">
                                    {business.max_barbers === null
                                        ? 'Ilimitado'
                                        : business.max_barbers}
                                </p>
                            </div>

                            <div className="rounded-2xl border border-black/10 bg-white px-4 py-3">
                                <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                                    Máximo de servicios
                                </p>

                                <p className="mt-1 text-base font-black text-slate-950">
                                    {business.max_services === null
                                        ? 'Ilimitado'
                                        : business.max_services}
                                </p>
                            </div>

                            <div className="rounded-2xl border border-black/10 bg-white px-4 py-3 md:col-span-2">
                                <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                                    Fin del período de prueba
                                </p>

                                <p className="mt-1 text-base font-black text-slate-950">
                                    {business.trial_ends_at
                                        ? new Date(
                                            business.trial_ends_at
                                        ).toLocaleDateString('es-CL')
                                        : 'No aplica'}
                                </p>
                            </div>
                        </div>

                        <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-bold leading-5 text-amber-800">
                            El plan, los límites y el estado de suscripción son administrados por la plataforma. Puedes solicitar un cambio desde la sección de planes.
                        </p>

                        <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-bold leading-5 text-amber-800">
                            Cambiar plan, límites o estado de suscripción desde aquí afecta directamente los permisos del negocio.
                        </p>
                    </div>
                </div>
            </section>

            <div className="sticky bottom-0 z-10 -mx-4 border-t border-black/10 bg-[#FFFCF4]/92 px-4 py-4 backdrop-blur md:-mx-6 md:px-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm font-semibold leading-6 text-slate-500">
                        Los cambios impactan la página pública y el flujo de reservas.
                    </p>

                    <button
                        type="submit"
                        disabled={loading || uploadingLogo || uploadingCover}
                        className="inline-flex h-12 w-full items-center justify-center rounded-2xl bg-[#C8942E] px-5 text-sm font-black text-white shadow-[0_14px_30px_rgba(200,148,46,0.24)] transition hover:-translate-y-0.5 hover:brightness-105 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-55 sm:w-auto"
                    >
                        {loading ? 'Guardando...' : 'Guardar cambios'}
                    </button>
                </div>
            </div>
        </form>
    )
}