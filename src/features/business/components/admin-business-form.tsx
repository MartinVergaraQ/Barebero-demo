'use client'

import { useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { updateBusiness } from '@/src/features/business/api/update-business'

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
        plan_slug: string
        subscription_status: 'trialing' | 'active' | 'past_due' | 'canceled'
        trial_ends_at: string | null
        max_barbers: number
        max_services: number
    }
}

function slugify(value: string) {
    return value
        .toLowerCase()
        .trim()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
}

export function AdminBusinessForm({ business }: Props) {
    const router = useRouter()
    const pathname = usePathname()

    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState('')
    const [errorMessage, setErrorMessage] = useState('')

    const [form, setForm] = useState({
        name: business.name ?? '',
        slug: business.slug ?? '',
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
        whatsapp_routing: business.whatsapp_routing ?? 'fallback',
        plan_slug: business.plan_slug ?? 'starter',
        subscription_status: business.subscription_status ?? 'trialing',
        trial_ends_at: business.trial_ends_at
            ? business.trial_ends_at.slice(0, 10)
            : '',
        max_barbers: String(business.max_barbers ?? 1),
        max_services: String(business.max_services ?? 3),
    })

    function handleChange(
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
    ) {
        const { name, value } = e.target

        setForm((prev) => {
            const next = {
                ...prev,
                [name]: value,
            }

            if (name === 'name' && !prev.slug) {
                next.slug = slugify(value)
            }

            return next
        })
    }

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setLoading(true)
        setMessage('')
        setErrorMessage('')

        try {
            if (!form.name.trim()) throw new Error('Ingresa el nombre del negocio')
            if (!form.slug.trim()) throw new Error('Ingresa el slug')

            const normalizedSlug = slugify(form.slug || form.name)

            await updateBusiness({
                id: business.id,
                name: form.name,
                slug: normalizedSlug,
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
                plan_slug: form.plan_slug,
                subscription_status: form.subscription_status,
                trial_ends_at: form.trial_ends_at || null,
                max_barbers: Number(form.max_barbers || 1),
                max_services: Number(form.max_services || 3),
            })

            const normalizedOldSlug = business.slug.trim()
            const normalizedNewSlug = normalizedSlug.trim()

            setMessage('Negocio actualizado correctamente')

            if (normalizedNewSlug !== normalizedOldSlug) {
                const nextPath = pathname.replace(
                    `/admin/b/${normalizedOldSlug}`,
                    `/admin/b/${normalizedNewSlug}`
                )

                router.replace(nextPath)
                return
            }

            router.refresh()
        } catch (error) {
            setErrorMessage(
                error instanceof Error ? error.message : 'Error actualizando negocio'
            )
        } finally {
            setLoading(false)
        }
    }

    return (
        <section className="rounded-xl border bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-xl font-semibold">Configuración del negocio</h2>

            {errorMessage && (
                <div className="mb-4 rounded-lg border border-red-300 bg-red-50 p-4 text-red-700">
                    {errorMessage}
                </div>
            )}

            {message && (
                <div className="mb-4 rounded-lg border border-green-300 bg-green-50 p-4 text-green-700">
                    {message}
                </div>
            )}

            <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                    <label className="mb-2 block font-medium">Nombre</label>
                    <input
                        name="name"
                        value={form.name}
                        onChange={handleChange}
                        className="w-full rounded-lg border p-3"
                        placeholder="Demo Barber Studio"
                    />
                </div>

                <div className="md:col-span-2">
                    <label className="mb-2 block font-medium">Slug</label>
                    <input
                        name="slug"
                        value={form.slug}
                        onChange={handleChange}
                        className="w-full rounded-lg border p-3"
                        placeholder="demo-barber-studio"
                    />
                    <p className="mt-1 text-xs text-slate-500">
                        Se convertirá automáticamente a formato URL válido al guardar.
                    </p>
                </div>

                <div>
                    <label className="mb-2 block font-medium">Teléfono</label>
                    <input
                        name="phone"
                        value={form.phone}
                        onChange={handleChange}
                        className="w-full rounded-lg border p-3"
                        placeholder="+56 9 1234 5678"
                    />
                </div>

                <div>
                    <label className="mb-2 block font-medium">Email</label>
                    <input
                        name="email"
                        type="email"
                        value={form.email}
                        onChange={handleChange}
                        className="w-full rounded-lg border p-3"
                        placeholder="contacto@negocio.cl"
                    />
                </div>

                <div className="md:col-span-2">
                    <label className="mb-2 block font-medium">Dirección</label>
                    <input
                        name="address"
                        value={form.address}
                        onChange={handleChange}
                        className="w-full rounded-lg border p-3"
                        placeholder="Los Boldos 10830"
                    />
                </div>

                <div>
                    <label className="mb-2 block font-medium">Ciudad</label>
                    <input
                        name="city"
                        value={form.city}
                        onChange={handleChange}
                        className="w-full rounded-lg border p-3"
                        placeholder="Santiago"
                    />
                </div>

                <div>
                    <label className="mb-2 block font-medium">País</label>
                    <input
                        name="country"
                        value={form.country}
                        onChange={handleChange}
                        className="w-full rounded-lg border p-3"
                        placeholder="Chile"
                    />
                </div>

                <div>
                    <label className="mb-2 block font-medium">WhatsApp del negocio</label>
                    <input
                        name="whatsapp_phone"
                        value={form.whatsapp_phone}
                        onChange={handleChange}
                        className="w-full rounded-lg border p-3"
                        placeholder="56912345678"
                    />
                    <p className="mt-1 text-xs text-slate-500">
                        Sin +, sin espacios ni guiones idealmente.
                    </p>
                </div>

                <div>
                    <label className="mb-2 block font-medium">Routing de WhatsApp</label>
                    <select
                        name="whatsapp_routing"
                        value={form.whatsapp_routing}
                        onChange={handleChange}
                        className="w-full rounded-lg border p-3"
                    >
                        <option value="fallback">Barbero primero, si no negocio</option>
                        <option value="business">Negocio primero</option>
                        <option value="barber">Barbero primero</option>
                    </select>
                </div>

                <div>
                    <label className="mb-2 block font-medium">Instagram URL</label>
                    <input
                        name="instagram_url"
                        value={form.instagram_url}
                        onChange={handleChange}
                        className="w-full rounded-lg border p-3"
                        placeholder="https://instagram.com/tu_negocio"
                    />
                </div>

                <div>
                    <label className="mb-2 block font-medium">Timezone</label>
                    <input
                        name="timezone"
                        value={form.timezone}
                        onChange={handleChange}
                        className="w-full rounded-lg border p-3"
                        placeholder="America/Santiago"
                    />
                </div>

                <div className="md:col-span-2">
                    <label className="mb-2 block font-medium">Logo URL</label>
                    <input
                        name="logo_url"
                        value={form.logo_url}
                        onChange={handleChange}
                        className="w-full rounded-lg border p-3"
                        placeholder="https://..."
                    />
                </div>

                <div className="md:col-span-2">
                    <label className="mb-2 block font-medium">Cover URL</label>
                    <input
                        name="cover_url"
                        value={form.cover_url}
                        onChange={handleChange}
                        className="w-full rounded-lg border p-3"
                        placeholder="https://..."
                    />
                </div>

                <div className="md:col-span-2">
                    <label className="mb-2 block font-medium">Descripción</label>
                    <textarea
                        name="description"
                        value={form.description}
                        onChange={handleChange}
                        className="w-full rounded-lg border p-3"
                        rows={5}
                        placeholder="Describe el negocio"
                    />
                </div>

                <div className="md:col-span-2 mt-4 border-t pt-4">
                    <h3 className="mb-4 text-lg font-semibold">Plan y suscripción</h3>
                </div>

                <div>
                    <label className="mb-2 block font-medium">Plan</label>
                    <select
                        name="plan_slug"
                        value={form.plan_slug}
                        onChange={handleChange}
                        className="w-full rounded-lg border p-3"
                    >
                        <option value="starter">Starter</option>
                        <option value="pro">Pro</option>
                        <option value="studio">Studio</option>
                    </select>
                </div>

                <div>
                    <label className="mb-2 block font-medium">Estado de suscripción</label>
                    <select
                        name="subscription_status"
                        value={form.subscription_status}
                        onChange={handleChange}
                        className="w-full rounded-lg border p-3"
                    >
                        <option value="trialing">Trialing</option>
                        <option value="active">Activa</option>
                        <option value="past_due">Pago pendiente</option>
                        <option value="canceled">Cancelada</option>
                    </select>
                </div>

                <div>
                    <label className="mb-2 block font-medium">Trial hasta</label>
                    <input
                        name="trial_ends_at"
                        type="date"
                        value={form.trial_ends_at}
                        onChange={handleChange}
                        className="w-full rounded-lg border p-3"
                    />
                </div>

                <div>
                    <label className="mb-2 block font-medium">Máximo de barberos</label>
                    <input
                        name="max_barbers"
                        type="number"
                        min={1}
                        value={form.max_barbers}
                        onChange={handleChange}
                        className="w-full rounded-lg border p-3"
                    />
                </div>

                <div>
                    <label className="mb-2 block font-medium">Máximo de servicios</label>
                    <input
                        name="max_services"
                        type="number"
                        min={1}
                        value={form.max_services}
                        onChange={handleChange}
                        className="w-full rounded-lg border p-3"
                    />
                </div>

                <div className="md:col-span-2">
                    <button
                        type="submit"
                        disabled={loading}
                        className="rounded-lg bg-black px-4 py-3 text-white disabled:opacity-50"
                    >
                        {loading ? 'Guardando...' : 'Guardar cambios'}
                    </button>
                </div>
            </form>
        </section>
    )
}