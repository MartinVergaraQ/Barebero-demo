'use client'

import { useState } from 'react'
import { upsertSiteContent } from '@/src/features/site-content/api/upsert-site-content'

type Props = {
    businessId: string
    initialValues?: {
        hero_title?: string
        hero_subtitle?: string
        hero_cta_text?: string
        services_section_title?: string
        barbers_section_title?: string
        about_text?: string
    }
}

export function AdminSiteContentForm({ businessId, initialValues }: Props) {
    const [form, setForm] = useState({
        hero_title: initialValues?.hero_title ?? 'Barbería moderna con reservas online',
        hero_subtitle:
            initialValues?.hero_subtitle ??
            'Reserva tu corte o barba en pocos pasos.',
        hero_cta_text: initialValues?.hero_cta_text ?? 'Reservar ahora',
        services_section_title:
            initialValues?.services_section_title ?? 'Nuestros servicios',
        barbers_section_title:
            initialValues?.barbers_section_title ?? 'Nuestro equipo',
        about_text:
            initialValues?.about_text ??
            'Barbería profesional con atención personalizada.',
    })

    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState('')
    const [errorMessage, setErrorMessage] = useState('')

    function handleChange(
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) {
        const { name, value } = e.target
        setForm((prev) => ({
            ...prev,
            [name]: value,
        }))
    }

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setLoading(true)
        setMessage('')
        setErrorMessage('')

        try {
            await Promise.all([
                upsertSiteContent({
                    business_id: businessId,
                    key: 'hero_title',
                    value_json: form.hero_title,
                }),
                upsertSiteContent({
                    business_id: businessId,
                    key: 'hero_subtitle',
                    value_json: form.hero_subtitle,
                }),
                upsertSiteContent({
                    business_id: businessId,
                    key: 'hero_cta_text',
                    value_json: form.hero_cta_text,
                }),
                upsertSiteContent({
                    business_id: businessId,
                    key: 'services_section_title',
                    value_json: form.services_section_title,
                }),
                upsertSiteContent({
                    business_id: businessId,
                    key: 'barbers_section_title',
                    value_json: form.barbers_section_title,
                }),
                upsertSiteContent({
                    business_id: businessId,
                    key: 'about_text',
                    value_json: form.about_text,
                }),
            ])

            setMessage('Contenido actualizado correctamente')
        } catch (error) {
            setErrorMessage(
                error instanceof Error ? error.message : 'Error actualizando contenido'
            )
        } finally {
            setLoading(false)
        }
    }

    return (
        <section className="rounded-xl border p-4">
            <h2 className="mb-4 text-xl font-semibold">Contenido del landing</h2>

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

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="mb-2 block font-medium">Hero title</label>
                    <input
                        name="hero_title"
                        value={form.hero_title}
                        onChange={handleChange}
                        className="w-full rounded-lg border p-3"
                    />
                </div>

                <div>
                    <label className="mb-2 block font-medium">Hero subtitle</label>
                    <textarea
                        name="hero_subtitle"
                        value={form.hero_subtitle}
                        onChange={handleChange}
                        className="w-full rounded-lg border p-3"
                        rows={3}
                    />
                </div>

                <div>
                    <label className="mb-2 block font-medium">Texto botón hero</label>
                    <input
                        name="hero_cta_text"
                        value={form.hero_cta_text}
                        onChange={handleChange}
                        className="w-full rounded-lg border p-3"
                    />
                </div>

                <div>
                    <label className="mb-2 block font-medium">Título sección servicios</label>
                    <input
                        name="services_section_title"
                        value={form.services_section_title}
                        onChange={handleChange}
                        className="w-full rounded-lg border p-3"
                    />
                </div>

                <div>
                    <label className="mb-2 block font-medium">Título sección barberos</label>
                    <input
                        name="barbers_section_title"
                        value={form.barbers_section_title}
                        onChange={handleChange}
                        className="w-full rounded-lg border p-3"
                    />
                </div>

                <div>
                    <label className="mb-2 block font-medium">Texto about</label>
                    <textarea
                        name="about_text"
                        value={form.about_text}
                        onChange={handleChange}
                        className="w-full rounded-lg border p-3"
                        rows={4}
                    />
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="rounded-lg bg-black px-4 py-3 text-white disabled:opacity-50"
                >
                    {loading ? 'Guardando...' : 'Guardar contenido'}
                </button>
            </form>
        </section>
    )
}