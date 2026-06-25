'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateCurrentBarberProfile } from '@/src/features/barbers/api/update-current-barber-profile'
import { uploadBarberPhoto } from '@/src/features/barbers/api/upload-barber-photo'
import { deleteTemporaryBarberPhoto } from '@/src/features/barbers/api/delete-temporary-barber-photo'
import {
    BadgeCheck,
    Camera,
    Check,
    CircleUserRound,
    ImagePlus,
    MessageCircle,
    Save,
    Scissors,
    Sparkles,
    Trash2,
    Undo2,
} from 'lucide-react'

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

function getInitials(
    value: string
) {
    return value
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map(
            (part) =>
                part[0]
                    ?.toUpperCase()
        )
        .join('')
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

    const completedFields = [
        form.name,
        form.specialty,
        form.bio,
        form.whatsapp_phone,
        form.photo_url,
    ].filter(
        (value) =>
            value.trim().length > 0
    ).length

    const completionPercentage =
        Math.round(
            (
                completedFields /
                5
            ) *
            100
        )

    const profileComplete =
        completionPercentage === 100

    return (
        <div className="space-y-4 sm:space-y-5">
            <section className="overflow-hidden rounded-[26px] border border-[#E5DAC5] bg-[#FFFCF7] shadow-[0_16px_42px_rgba(15,23,42,0.07)]">
                <div className="relative bg-gradient-to-br from-[#FFF8E8] via-[#FFFCF7] to-[#F2E0B5] px-5 py-5 sm:px-6 sm:py-6">
                    <div className="pointer-events-none absolute -right-10 -top-14 h-44 w-44 rounded-full bg-[#C8942E]/15 blur-3xl" />

                    <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
                        <div className="relative mx-auto shrink-0 sm:mx-0">
                            <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-[28px] border-4 border-white bg-[#EADBB9] text-2xl font-black text-[#8A5D16] shadow-[0_16px_34px_rgba(15,23,42,0.16)] sm:h-32 sm:w-32">
                                {form.photo_url ? (
                                    <img
                                        src={form.photo_url}
                                        alt={
                                            form.name ||
                                            'Foto de perfil'
                                        }
                                        className="h-full w-full object-cover"
                                    />
                                ) : (
                                    getInitials(
                                        form.name
                                    ) || (
                                        <CircleUserRound className="h-12 w-12" />
                                    )
                                )}
                            </div>

                            {canEdit && (
                                <label
                                    htmlFor="barber-photo"
                                    className="absolute -bottom-2 -right-2 flex h-11 w-11 cursor-pointer items-center justify-center rounded-2xl border-4 border-[#FFFCF7] bg-[#C8942E] text-white shadow-[0_10px_22px_rgba(200,148,46,0.30)] transition hover:brightness-105 active:scale-95"
                                    aria-label="Cambiar foto de perfil"
                                >
                                    {uploadingImage ? (
                                        <Sparkles className="h-5 w-5 animate-pulse" />
                                    ) : (
                                        <Camera className="h-5 w-5" />
                                    )}
                                </label>
                            )}

                            <input
                                id="barber-photo"
                                type="file"
                                accept="image/jpeg,image/png,image/webp,image/avif"
                                onChange={handleImageChange}
                                disabled={fieldsDisabled}
                                className="sr-only"
                            />
                        </div>

                        <div className="min-w-0 flex-1 text-center sm:text-left">
                            <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                                <span
                                    className={`rounded-full px - 3 py - 1 text - [10px] font - black uppercase tracking - [0.12em] ${barber.is_active
                                        ? 'bg-emerald-100 text-emerald-700'
                                        : 'bg-slate-200 text-slate-600'
                                        } `}
                                >
                                    {barber.is_active
                                        ? 'Perfil activo'
                                        : 'Perfil inactivo'}
                                </span>

                                {profileComplete && (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-[#F4E7C7] px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-[#8A5D16]">
                                        <BadgeCheck className="h-3.5 w-3.5" />
                                        Completo
                                    </span>
                                )}
                            </div>

                            <h2 className="mt-3 truncate text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                                {form.name ||
                                    'Tu nombre profesional'}
                            </h2>

                            <p className="mt-1 truncate text-sm font-bold text-[#A87408]">
                                {form.specialty ||
                                    'Agrega tu especialidad'}
                            </p>

                            <p className="mt-3 text-xs font-semibold text-slate-500">
                                Tu perfil está al{' '}
                                <span className="font-black text-[#8A5D16]">
                                    {completionPercentage}%
                                </span>
                            </p>

                            <div className="mx-auto mt-2 h-2 max-w-md overflow-hidden rounded-full bg-[#E8DFC9] sm:mx-0">
                                <div
                                    className="h-full rounded-full bg-gradient-to-r from-[#A87408] to-[#D5A73A] transition-all duration-500"
                                    style={{
                                        width: `${completionPercentage}% `,
                                    }}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="relative mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
                        <div className="rounded-2xl border border-black/5 bg-white/70 px-3 py-3">
                            <p className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-400">
                                Slug
                            </p>

                            <p className="mt-1 truncate text-xs font-black text-slate-700">
                                {barber.slug}
                            </p>
                        </div>

                        <div className="rounded-2xl border border-black/5 bg-white/70 px-3 py-3">
                            <p className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-400">
                                Valoración
                            </p>

                            <p className="mt-1 text-xs font-black text-slate-700">
                                {barber.rating_avg ?? 'Sin reseñas'}
                            </p>
                        </div>

                        <div className="rounded-2xl border border-black/5 bg-white/70 px-3 py-3">
                            <p className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-400">
                                Orden
                            </p>

                            <p className="mt-1 text-xs font-black text-slate-700">
                                #{barber.display_order}
                            </p>
                        </div>

                        <div className="rounded-2xl border border-black/5 bg-white/70 px-3 py-3">
                            <p className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-400">
                                Campos
                            </p>

                            <p className="mt-1 text-xs font-black text-slate-700">
                                {completedFields} de 5
                            </p>
                        </div>
                    </div>

                    {form.photo_url && canEdit && (
                        <div className="relative mt-4 flex justify-center sm:justify-start">
                            <button
                                type="button"
                                onClick={() => {
                                    void handleRemovePhoto()
                                }}
                                disabled={fieldsDisabled}
                                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-4 text-xs font-black text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <Trash2 className="h-4 w-4" />
                                Eliminar foto
                            </button>
                        </div>
                    )}

                    {uploadingImage && (
                        <p className="relative mt-3 text-center text-xs font-black text-[#8A5D16] sm:text-left">
                            Subiendo imagen...
                        </p>
                    )}
                </div>
            </section>

            {(success || error) && (
                <section
                    className={`rounded - [18px] border px - 4 py - 3 ${error
                        ? 'border-red-200 bg-red-50 text-red-700'
                        : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                        } `}
                >
                    <div className="flex items-start gap-3">
                        <span
                            className={`flex h - 8 w - 8 shrink - 0 items - center justify - center rounded - xl ${error
                                ? 'bg-red-100'
                                : 'bg-emerald-100'
                                } `}
                        >
                            {error ? (
                                <CircleUserRound className="h-4 w-4" />
                            ) : (
                                <Check className="h-4 w-4" />
                            )}
                        </span>

                        <p className="pt-1 text-xs font-black leading-5 sm:text-sm">
                            {error || success}
                        </p>
                    </div>
                </section>
            )}

            <section className="rounded-[26px] border border-[#E5DAC5] bg-[#FFFCF7] p-4 shadow-[0_14px_38px_rgba(15,23,42,0.06)] sm:p-6">
                <header className="mb-5 flex items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#F4E7C7] text-[#8A5D16]">
                        <Scissors className="h-5 w-5" />
                    </span>

                    <div>
                        <h2 className="text-lg font-black text-slate-950 sm:text-xl">
                            Información profesional
                        </h2>

                        <p className="mt-1 text-xs font-medium leading-5 text-slate-500 sm:text-sm">
                            Estos datos ayudan a que los clientes te conozcan antes de reservar.
                        </p>
                    </div>
                </header>

                <div className="grid gap-4 md:grid-cols-2">
                    <div>
                        <label
                            htmlFor="barber-name"
                            className="mb-2 block text-sm font-black text-slate-700"
                        >
                            Nombre visible
                        </label>

                        <input
                            id="barber-name"
                            name="name"
                            value={form.name}
                            onChange={handleChange}
                            disabled={fieldsDisabled}
                            maxLength={80}
                            placeholder="Nombre visible del barbero"
                            className="h-12 w-full rounded-2xl border border-black/10 bg-[#FBF7EE] px-4 text-sm font-semibold text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-[#C8942E] focus:bg-white focus:shadow-[0_0_0_4px_rgba(200,148,46,0.12)] disabled:cursor-not-allowed disabled:opacity-60"
                        />
                    </div>

                    <div>
                        <label
                            htmlFor="barber-specialty"
                            className="mb-2 block text-sm font-black text-slate-700"
                        >
                            Especialidad
                        </label>

                        <input
                            id="barber-specialty"
                            name="specialty"
                            value={form.specialty}
                            onChange={handleChange}
                            disabled={fieldsDisabled}
                            maxLength={120}
                            placeholder="Ej: Fade, barba y perfilado"
                            className="h-12 w-full rounded-2xl border border-black/10 bg-[#FBF7EE] px-4 text-sm font-semibold text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-[#C8942E] focus:bg-white focus:shadow-[0_0_0_4px_rgba(200,148,46,0.12)] disabled:cursor-not-allowed disabled:opacity-60"
                        />
                    </div>

                    <div className="md:col-span-2">
                        <label
                            htmlFor="barber-bio"
                            className="mb-2 block text-sm font-black text-slate-700"
                        >
                            Presentación
                        </label>

                        <textarea
                            id="barber-bio"
                            name="bio"
                            value={form.bio}
                            onChange={handleChange}
                            disabled={fieldsDisabled}
                            rows={5}
                            maxLength={1000}
                            placeholder="Cuéntale a tus clientes sobre tu experiencia, estilo y especialidades."
                            className="min-h-32 w-full resize-none rounded-2xl border border-black/10 bg-[#FBF7EE] px-4 py-3 text-sm font-semibold leading-6 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-[#C8942E] focus:bg-white focus:shadow-[0_0_0_4px_rgba(200,148,46,0.12)] disabled:cursor-not-allowed disabled:opacity-60"
                        />

                        <div className="mt-1.5 flex items-center justify-between gap-3">
                            <p className="text-[11px] font-semibold text-slate-500">
                                Una descripción clara genera más confianza.
                            </p>

                            <p className="shrink-0 text-[11px] font-black text-slate-400">
                                {form.bio.length}/1000
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            <section className="rounded-[26px] border border-[#E5DAC5] bg-[#FFFCF7] p-4 shadow-[0_14px_38px_rgba(15,23,42,0.06)] sm:p-6">
                <header className="mb-5 flex items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                        <MessageCircle className="h-5 w-5" />
                    </span>

                    <div>
                        <h2 className="text-lg font-black text-slate-950 sm:text-xl">
                            Contacto
                        </h2>

                        <p className="mt-1 text-xs font-medium leading-5 text-slate-500 sm:text-sm">
                            Número utilizado para comunicaciones relacionadas con las reservas.
                        </p>
                    </div>
                </header>

                <div>
                    <label
                        htmlFor="barber-whatsapp"
                        className="mb-2 block text-sm font-black text-slate-700"
                    >
                        WhatsApp
                    </label>

                    <input
                        id="barber-whatsapp"
                        name="whatsapp_phone"
                        type="tel"
                        value={form.whatsapp_phone}
                        onChange={handleChange}
                        disabled={fieldsDisabled}
                        placeholder="+56912345678"
                        className="h-12 w-full rounded-2xl border border-black/10 bg-[#FBF7EE] px-4 text-sm font-semibold text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-[#C8942E] focus:bg-white focus:shadow-[0_0_0_4px_rgba(200,148,46,0.12)] disabled:cursor-not-allowed disabled:opacity-60"
                    />

                    <p className="mt-1.5 text-[11px] font-semibold text-slate-500">
                        Incluye el código del país, por ejemplo +56.
                    </p>
                </div>
            </section>

            <div className="sticky bottom-[84px] z-30 md:bottom-4">
                <div className="rounded-[22px] border border-black/10 bg-[#FFFCF7]/95 p-3 shadow-[0_18px_50px_rgba(15,23,42,0.18)] backdrop-blur-xl">
                    <div className="flex items-center gap-2">
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
                            className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-2xl border border-black/10 bg-white px-4 text-sm font-black text-slate-700 transition hover:bg-slate-50 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            <Undo2 className="h-4 w-4" />

                            <span className="hidden sm:inline">
                                Descartar
                            </span>
                        </button>

                        <button
                            type="button"
                            disabled={
                                fieldsDisabled ||
                                !hasChanges
                            }
                            onClick={handleSubmit}
                            className="inline-flex h-12 min-w-0 flex-1 items-center justify-center gap-2 rounded-2xl bg-[#C8942E] px-5 text-sm font-black text-white shadow-[0_12px_26px_rgba(200,148,46,0.28)] transition hover:brightness-105 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45"
                        >
                            {uploadingImage ? (
                                <ImagePlus className="h-4 w-4 animate-pulse" />
                            ) : (
                                <Save className="h-4 w-4" />
                            )}

                            {uploadingImage
                                ? 'Subiendo foto...'
                                : isPending
                                    ? 'Guardando...'
                                    : hasChanges
                                        ? 'Guardar cambios'
                                        : 'Perfil actualizado'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )


}