'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateCurrentBarberProfile } from '@/src/features/barbers/api/update-current-barber-profile'
import { uploadBarberPhoto } from '@/src/features/barbers/api/upload-barber-photo'
import { deleteTemporaryBarberPhoto } from '@/src/features/barbers/api/delete-temporary-barber-photo'

type Props = {
    barber: {
        name: string
        slug: string
        specialty: string | null
        bio: string | null
        whatsapp_phone: string | null
        photo_url: string | null
        rating_avg: string | number | null
        is_active: boolean
        display_order: number
    }
    canEdit?: boolean
    subscriptionBlockReason?: string
}

type FormState = {
    name: string
    specialty: string
    bio: string
    whatsapp_phone: string
    photo_url: string
}

function getInitialForm(barber: Props['barber']): FormState {
    return {
        name: barber.name ?? '',
        specialty: barber.specialty ?? '',
        bio: barber.bio ?? '',
        whatsapp_phone: barber.whatsapp_phone ?? '',
        photo_url: barber.photo_url ?? '',
    }
}

export function BarberProfileForm({
    barber,
    canEdit = true,
    subscriptionBlockReason,
}: Props) {
    const router = useRouter()

    const [isPending, startTransition] = useTransition()
    const [success, setSuccess] = useState('')
    const [error, setError] = useState('')
    const [uploadingImage, setUploadingImage] =
        useState(false)

    const [savedForm, setSavedForm] = useState<FormState>(
        getInitialForm(barber)
    )

    const [form, setForm] = useState<FormState>(
        getInitialForm(barber)
    )

    const [
        temporaryPhotoPublicId,
        setTemporaryPhotoPublicId,
    ] = useState<string | null>(null)

    const hasChanges = useMemo(() => {
        return (
            form.name !== savedForm.name ||
            form.specialty !== savedForm.specialty ||
            form.bio !== savedForm.bio ||
            form.whatsapp_phone !==
            savedForm.whatsapp_phone ||
            form.photo_url !== savedForm.photo_url
        )
    }, [form, savedForm])

    function showBlockedMessage() {
        setSuccess('')
        setError(
            subscriptionBlockReason ||
            'La suscripción actual no permite modificar el perfil.'
        )
    }

    function handleChange(
        event: React.ChangeEvent<
            HTMLInputElement | HTMLTextAreaElement
        >
    ) {
        if (!canEdit || isPending || uploadingImage) {
            return
        }

        const { name, value } = event.target

        setSuccess('')
        setError('')

        setForm((previous) => ({
            ...previous,
            [name]: value,
        }))
    }

    async function removeTemporaryPhoto() {
        if (!temporaryPhotoPublicId) {
            return
        }

        await deleteTemporaryBarberPhoto(
            temporaryPhotoPublicId
        )

        setTemporaryPhotoPublicId(null)
    }

    async function handleImageChange(
        event: React.ChangeEvent<HTMLInputElement>
    ) {
        if (!canEdit) {
            showBlockedMessage()
            event.target.value = ''
            return
        }

        if (uploadingImage || isPending) {
            event.target.value = ''
            return
        }

        const file = event.target.files?.[0]

        if (!file) {
            event.target.value = ''
            return
        }

        const allowedTypes = new Set([
            'image/jpeg',
            'image/png',
            'image/webp',
            'image/avif',
        ])

        if (!allowedTypes.has(file.type)) {
            setError(
                'Usa una imagen JPG, PNG, WEBP o AVIF'
            )
            event.target.value = ''
            return
        }

        if (file.size <= 0) {
            setError('El archivo está vacío')
            event.target.value = ''
            return
        }

        if (file.size > 5 * 1024 * 1024) {
            setError(
                'La imagen no puede superar los 5 MB'
            )
            event.target.value = ''
            return
        }

        setError('')
        setSuccess('')
        setUploadingImage(true)

        try {
            /*
             * Eliminamos una foto temporal anterior
             * antes de subir la nueva.
             */
            if (temporaryPhotoPublicId) {
                await deleteTemporaryBarberPhoto(
                    temporaryPhotoPublicId
                )
            }

            const result = await uploadBarberPhoto(file)

            setForm((previous) => ({
                ...previous,
                photo_url: result.secure_url,
            }))

            setTemporaryPhotoPublicId(result.public_id)
            setSuccess(
                'Foto cargada. Guarda los cambios para aplicarla.'
            )
        } catch (uploadError) {
            setError(
                uploadError instanceof Error
                    ? uploadError.message
                    : 'No se pudo subir la imagen'
            )
        } finally {
            setUploadingImage(false)
            event.target.value = ''
        }
    }

    async function handleRemovePhoto() {
        if (!canEdit) {
            showBlockedMessage()
            return
        }

        if (isPending || uploadingImage) {
            return
        }

        setError('')
        setSuccess('')

        try {
            /*
             * Si era una foto recién subida, la eliminamos
             * de Cloudinary porque todavía no está guardada.
             */
            await removeTemporaryPhoto()

            setForm((previous) => ({
                ...previous,
                photo_url: '',
            }))
        } catch (removeError) {
            setError(
                removeError instanceof Error
                    ? removeError.message
                    : 'No se pudo eliminar la fotografía temporal'
            )
        }
    }

    async function handleDiscardChanges() {
        if (isPending || uploadingImage) {
            return
        }

        setError('')
        setSuccess('')

        try {
            await removeTemporaryPhoto()
            setForm(savedForm)
        } catch (discardError) {
            setError(
                discardError instanceof Error
                    ? discardError.message
                    : 'No se pudieron descartar los cambios'
            )
        }
    }

    function handleSubmit() {
        if (!canEdit) {
            showBlockedMessage()
            return
        }

        if (
            isPending ||
            uploadingImage ||
            !hasChanges
        ) {
            return
        }

        setError('')
        setSuccess('')

        startTransition(async () => {
            try {
                const result =
                    await updateCurrentBarberProfile({
                        name: form.name,
                        specialty: form.specialty,
                        bio: form.bio,
                        whatsapp_phone:
                            form.whatsapp_phone,
                        photo_url:
                            form.photo_url || null,
                    })

                if (!result.ok) {
                    throw new Error(result.message)
                }

                /*
                 * La foto nueva quedó asociada al perfil;
                 * ya no debe considerarse temporal.
                 */
                setTemporaryPhotoPublicId(null)
                setSavedForm(form)

                setSuccess(
                    'Perfil actualizado correctamente'
                )

                router.refresh()
            } catch (submitError) {
                setError(
                    submitError instanceof Error
                        ? submitError.message
                        : 'No se pudo actualizar el perfil'
                )
            }
        })
    }

    const fieldsDisabled =
        !canEdit || isPending || uploadingImage

    return (
        <div className="space-y-6">
            <section className="rounded-xl border bg-white p-5 shadow-sm">
                <h2 className="text-lg font-semibold">
                    Datos del barbero
                </h2>

                <div className="mt-4 space-y-3 text-sm text-slate-700">
                    <p>
                        <span className="font-medium">
                            Nombre:
                        </span>{' '}
                        {barber.name}
                    </p>

                    <p>
                        <span className="font-medium">
                            Slug:
                        </span>{' '}
                        {barber.slug}
                    </p>

                    <p>
                        <span className="font-medium">
                            Rating promedio:
                        </span>{' '}
                        {barber.rating_avg ?? '-'}
                    </p>

                    <p>
                        <span className="font-medium">
                            Activo:
                        </span>{' '}
                        {barber.is_active ? 'Sí' : 'No'}
                    </p>

                    <p>
                        <span className="font-medium">
                            Orden:
                        </span>{' '}
                        {barber.display_order}
                    </p>
                </div>
            </section>

            <section className="rounded-xl border bg-white p-5 shadow-sm">
                <h2 className="text-lg font-semibold">
                    Editar perfil
                </h2>

                <div className="mt-4 space-y-4">
                    <div>
                        <label className="mb-2 block text-sm font-medium">
                            Nombre
                        </label>

                        <input
                            name="name"
                            value={form.name}
                            onChange={handleChange}
                            disabled={fieldsDisabled}
                            maxLength={80}
                            className="w-full rounded-lg border p-3 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:opacity-70"
                            placeholder="Nombre visible del barbero"
                        />
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-medium">
                            Especialidad
                        </label>

                        <input
                            name="specialty"
                            value={form.specialty}
                            onChange={handleChange}
                            disabled={fieldsDisabled}
                            maxLength={120}
                            className="w-full rounded-lg border p-3 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:opacity-70"
                            placeholder="Ej: Fade, barba, perfilado"
                        />
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-medium">
                            Bio
                        </label>

                        <textarea
                            name="bio"
                            value={form.bio}
                            onChange={handleChange}
                            disabled={fieldsDisabled}
                            rows={4}
                            maxLength={1000}
                            className="w-full rounded-lg border p-3 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:opacity-70"
                            placeholder="Cuéntale a los clientes sobre ti"
                        />

                        <p className="mt-1 text-right text-xs font-semibold text-slate-400">
                            {form.bio.length}/1000
                        </p>
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-medium">
                            WhatsApp
                        </label>

                        <input
                            name="whatsapp_phone"
                            value={form.whatsapp_phone}
                            onChange={handleChange}
                            disabled={fieldsDisabled}
                            className="w-full rounded-lg border p-3 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:opacity-70"
                            placeholder="+56912345678"
                        />
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-medium">
                            Foto de perfil
                        </label>

                        <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/avif"
                            onChange={handleImageChange}
                            disabled={fieldsDisabled}
                            className="w-full rounded-lg border p-3 disabled:cursor-not-allowed disabled:opacity-60"
                        />

                        {uploadingImage && (
                            <p className="mt-2 text-sm text-slate-600">
                                Subiendo imagen...
                            </p>
                        )}
                    </div>

                    {form.photo_url && (
                        <div>
                            <p className="mb-2 text-sm font-medium text-slate-700">
                                Vista previa
                            </p>

                            <img
                                src={form.photo_url}
                                alt={
                                    form.name ||
                                    'Foto de perfil'
                                }
                                className="h-32 w-32 rounded-lg border object-cover"
                            />
                        </div>
                    )}

                    {form.photo_url && (
                        <button
                            type="button"
                            onClick={() => {
                                void handleRemovePhoto()
                            }}
                            disabled={fieldsDisabled}
                            className="rounded-lg border border-red-300 px-4 py-3 text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            Eliminar foto
                        </button>
                    )}

                    <div className="flex flex-wrap gap-3">
                        <button
                            type="button"
                            disabled={
                                fieldsDisabled ||
                                !hasChanges
                            }
                            onClick={handleSubmit}
                            className="rounded-lg bg-black px-4 py-3 text-white disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {uploadingImage
                                ? 'Subiendo foto...'
                                : isPending
                                    ? 'Guardando...'
                                    : 'Guardar cambios'}
                        </button>

                        <button
                            type="button"
                            disabled={
                                isPending ||
                                uploadingImage ||
                                !hasChanges
                            }
                            onClick={() => {
                                void handleDiscardChanges()
                            }}
                            className="rounded-lg border border-slate-300 bg-white px-4 py-3 font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            Descartar cambios
                        </button>
                    </div>

                    {success && (
                        <p className="text-sm font-semibold text-green-600">
                            {success}
                        </p>
                    )}

                    {error && (
                        <p className="text-sm font-semibold text-red-600">
                            {error}
                        </p>
                    )}
                </div>
            </section>
        </div>
    )
}