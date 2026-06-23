'use client'

import {
    useState,
    useTransition,
} from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
    Building2,
    Check,
    Mail,
    UserRound,
} from 'lucide-react'

import {
    createBusinessServer,
} from '@/src/features/business/api/create-business-server'
import {
    PLAN_LABELS,
    PLAN_LIMITS,
    PLAN_PRICES,
    type AllowedPlanSlug,
} from '@/src/features/business/utils/plan-config'

type TrialDays = 3 | 5 | 7

type FormState = {
    businessName: string
    businessSlug: string
    ownerFullName: string
    ownerEmail: string
    planSlug: AllowedPlanSlug
    trialDays: TrialDays
}

const PLAN_OPTIONS: AllowedPlanSlug[] = [
    'starter',
    'pro',
    'studio',
]

const TRIAL_OPTIONS: TrialDays[] = [
    3,
    5,
    7,
]

function createSlug(value: string) {
    return value
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(
            /[\u0300-\u036f]/g,
            ''
        )
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
}

function formatPrice(value: number) {
    if (value === 0) {
        return '$0'
    }

    return new Intl.NumberFormat(
        'es-CL',
        {
            style: 'currency',
            currency: 'CLP',
            maximumFractionDigits: 0,
        }
    ).format(value)
}

export function CreateBusinessForm() {
    const router = useRouter()

    const [
        isPending,
        startTransition,
    ] = useTransition()

    const [
        slugEdited,
        setSlugEdited,
    ] = useState(false)

    const [
        form,
        setForm,
    ] = useState<FormState>({
        businessName: '',
        businessSlug: '',
        ownerFullName: '',
        ownerEmail: '',
        planSlug: 'starter',
        trialDays: 5,
    })

    function updateField<
        K extends keyof FormState
    >(
        field: K,
        value: FormState[K]
    ) {
        setForm((previous) => ({
            ...previous,
            [field]: value,
        }))
    }

    function handleBusinessNameChange(
        value: string
    ) {
        setForm((previous) => ({
            ...previous,
            businessName: value,
            businessSlug:
                slugEdited
                    ? previous.businessSlug
                    : createSlug(value),
        }))
    }

    function handleSubmit(
        event:
            React.FormEvent<HTMLFormElement>
    ) {
        event.preventDefault()

        if (isPending) {
            return
        }

        startTransition(async () => {
            try {
                const result =
                    await createBusinessServer(
                        form
                    )

                if (!result.ok) {
                    toast.error(
                        result.message
                    )
                    return
                }

                toast.success(
                    result.message
                )

                router.push(
                    `/superadmin/businesses/${result.businessId}`
                )

                router.refresh()
            } catch (error) {
                console.error(
                    'Error creando negocio:',
                    error
                )

                toast.error(
                    'No se pudo crear el negocio'
                )
            }
        })
    }

    return (
        <form
            onSubmit={handleSubmit}
            className="space-y-5"
        >
            <section className="overflow-hidden rounded-[26px] border border-black/10 bg-[#FFFCF4] shadow-[0_16px_38px_rgba(15,23,42,0.07)]">
                <div className="border-b border-black/10 px-5 py-4">
                    <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#C8942E]/10 text-[#8A5D16]">
                            <Building2 className="h-5 w-5" />
                        </span>

                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#C8942E]">
                                Barbería
                            </p>

                            <h2 className="text-lg font-black text-slate-950">
                                Información del negocio
                            </h2>
                        </div>
                    </div>
                </div>

                <div className="grid gap-4 p-5 md:grid-cols-2">
                    <div className="md:col-span-2">
                        <label
                            htmlFor="businessName"
                            className="mb-2 block text-sm font-black text-slate-700"
                        >
                            Nombre del negocio
                        </label>

                        <input
                            id="businessName"
                            name="businessName"
                            type="text"
                            value={
                                form.businessName
                            }
                            onChange={(event) =>
                                handleBusinessNameChange(
                                    event.target.value
                                )
                            }
                            maxLength={120}
                            autoComplete="organization"
                            placeholder="Ej: Barbería Los Leones"
                            disabled={isPending}
                            className="h-12 w-full rounded-2xl border border-black/10 bg-white px-4 text-sm font-bold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#C8942E] focus:ring-4 focus:ring-[#C8942E]/10 disabled:opacity-60"
                        />
                    </div>

                    <div className="md:col-span-2">
                        <label
                            htmlFor="businessSlug"
                            className="mb-2 block text-sm font-black text-slate-700"
                        >
                            Dirección pública
                        </label>

                        <div className="flex overflow-hidden rounded-2xl border border-black/10 bg-white focus-within:border-[#C8942E] focus-within:ring-4 focus-within:ring-[#C8942E]/10">
                            <span className="flex h-12 items-center border-r border-black/10 bg-[#FBF7EE] px-4 text-sm font-bold text-slate-400">
                                /b/
                            </span>

                            <input
                                id="businessSlug"
                                name="businessSlug"
                                type="text"
                                value={
                                    form.businessSlug
                                }
                                onChange={(event) => {
                                    setSlugEdited(
                                        true
                                    )

                                    updateField(
                                        'businessSlug',
                                        createSlug(
                                            event
                                                .target
                                                .value
                                        )
                                    )
                                }}
                                maxLength={100}
                                placeholder="barberia-los-leones"
                                disabled={isPending}
                                className="h-12 min-w-0 flex-1 bg-transparent px-4 text-sm font-bold text-slate-900 outline-none placeholder:text-slate-400 disabled:opacity-60"
                            />
                        </div>

                        <p className="mt-2 text-xs font-semibold text-slate-500">
                            Página pública:
                            {' '}
                            /b/
                            {form.businessSlug ||
                                'nombre-del-negocio'}
                        </p>
                    </div>
                </div>
            </section>

            <section className="overflow-hidden rounded-[26px] border border-black/10 bg-[#FFFCF4] shadow-[0_16px_38px_rgba(15,23,42,0.07)]">
                <div className="border-b border-black/10 px-5 py-4">
                    <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#C8942E]/10 text-[#8A5D16]">
                            <UserRound className="h-5 w-5" />
                        </span>

                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#C8942E]">
                                Propietario
                            </p>

                            <h2 className="text-lg font-black text-slate-950">
                                Cuenta principal
                            </h2>
                        </div>
                    </div>
                </div>

                <div className="grid gap-4 p-5 md:grid-cols-2">
                    <div>
                        <label
                            htmlFor="ownerFullName"
                            className="mb-2 block text-sm font-black text-slate-700"
                        >
                            Nombre completo
                        </label>

                        <input
                            id="ownerFullName"
                            name="ownerFullName"
                            type="text"
                            value={
                                form.ownerFullName
                            }
                            onChange={(event) =>
                                updateField(
                                    'ownerFullName',
                                    event.target.value
                                )
                            }
                            maxLength={120}
                            autoComplete="name"
                            placeholder="Ej: Martín Vergara"
                            disabled={isPending}
                            className="h-12 w-full rounded-2xl border border-black/10 bg-white px-4 text-sm font-bold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#C8942E] focus:ring-4 focus:ring-[#C8942E]/10 disabled:opacity-60"
                        />
                    </div>

                    <div>
                        <label
                            htmlFor="ownerEmail"
                            className="mb-2 block text-sm font-black text-slate-700"
                        >
                            Correo electrónico
                        </label>

                        <div className="relative">
                            <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                            <input
                                id="ownerEmail"
                                name="ownerEmail"
                                type="email"
                                value={
                                    form.ownerEmail
                                }
                                onChange={(event) =>
                                    updateField(
                                        'ownerEmail',
                                        event
                                            .target
                                            .value
                                    )
                                }
                                maxLength={254}
                                autoComplete="email"
                                placeholder="propietario@correo.cl"
                                disabled={isPending}
                                className="h-12 w-full rounded-2xl border border-black/10 bg-white pl-11 pr-4 text-sm font-bold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#C8942E] focus:ring-4 focus:ring-[#C8942E]/10 disabled:opacity-60"
                            />
                        </div>
                    </div>

                    <p className="md:col-span-2 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-xs font-bold leading-5 text-blue-800">
                        Se enviará una invitación a este
                        correo. El propietario definirá su
                        propia contraseña.
                    </p>
                </div>
            </section>

            <section className="overflow-hidden rounded-[26px] border border-black/10 bg-[#FFFCF4] shadow-[0_16px_38px_rgba(15,23,42,0.07)]">
                <div className="border-b border-black/10 px-5 py-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#C8942E]">
                        Configuración comercial
                    </p>

                    <h2 className="text-lg font-black text-slate-950">
                        Plan inicial
                    </h2>
                </div>

                <div className="grid gap-3 p-5 lg:grid-cols-3">
                    {PLAN_OPTIONS.map(
                        (planSlug) => {
                            const selected =
                                form.planSlug ===
                                planSlug

                            const limits =
                                PLAN_LIMITS[
                                planSlug
                                ]

                            return (
                                <button
                                    key={
                                        planSlug
                                    }
                                    type="button"
                                    onClick={() =>
                                        updateField(
                                            'planSlug',
                                            planSlug
                                        )
                                    }
                                    disabled={
                                        isPending
                                    }
                                    className={`relative rounded - [22px] border p - 4 text - left transition active: scale - [0.99] ${selected
                                        ? 'border-[#C8942E] bg-[#FFF7E8] shadow-[0_14px_30px_rgba(200,148,46,0.14)]'
                                        : 'border-black/10 bg-white hover:-translate-y-0.5 hover:border-[#C8942E]/50'
                                        } `}
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <p className="text-lg font-black text-slate-950">
                                                {
                                                    PLAN_LABELS[
                                                    planSlug
                                                    ]
                                                }
                                            </p>

                                            <p className="mt-1 text-sm font-black text-[#8A5D16]">
                                                {formatPrice(
                                                    PLAN_PRICES[
                                                    planSlug
                                                    ]
                                                )}
                                                <span className="text-xs text-slate-400">
                                                    /mes
                                                </span>
                                            </p>
                                        </div>

                                        <span
                                            className={`flex h - 6 w - 6 items - center justify - center rounded - full border ${selected
                                                ? 'border-[#C8942E] bg-[#C8942E] text-white'
                                                : 'border-black/10 bg-[#FBF7EE] text-transparent'
                                                } `}
                                        >
                                            <Check className="h-4 w-4" />
                                        </span>
                                    </div>

                                    <div className="mt-4 space-y-1.5 text-xs font-bold text-slate-600">
                                        <p>
                                            {
                                                limits.maxBarbers
                                            }{' '}
                                            barbero
                                            {limits.maxBarbers ===
                                                1
                                                ? ''
                                                : 's'}
                                        </p>

                                        <p>
                                            {
                                                limits.maxServices
                                            }{' '}
                                            servicios
                                        </p>

                                        <p>
                                            Reservas públicas
                                        </p>
                                    </div>
                                </button>
                            )
                        }
                    )}
                </div>

                <div className="border-t border-black/10 p-5">
                    <p className="mb-3 text-sm font-black text-slate-700">
                        Días de prueba
                    </p>

                    <div className="grid grid-cols-3 gap-3 sm:max-w-sm">
                        {TRIAL_OPTIONS.map(
                            (days) => (
                                <button
                                    key={days}
                                    type="button"
                                    onClick={() =>
                                        updateField(
                                            'trialDays',
                                            days
                                        )
                                    }
                                    disabled={
                                        isPending
                                    }
                                    className={`h - 11 rounded - 2xl border text - sm font - black transition ${form.trialDays ===
                                        days
                                        ? 'border-[#C8942E] bg-[#C8942E] text-white'
                                        : 'border-black/10 bg-white text-slate-700 hover:bg-[#FBF7EE]'
                                        } `}
                                >
                                    {days} días
                                </button>
                            )
                        )}
                    </div>
                </div>
            </section>

            <div className="sticky bottom-0 z-20 -mx-4 border-t border-black/10 bg-[#F4EFE5]/95 px-4 py-4 backdrop-blur md:-mx-8 md:px-8">
                <div className="mx-auto flex max-w-5xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs font-bold leading-5 text-slate-500">
                        Se creará el negocio, su suscripción
                        y la cuenta owner.
                    </p>

                    <button
                        type="submit"
                        disabled={
                            isPending
                        }
                        className="inline-flex h-12 items-center justify-center rounded-2xl bg-[#C8942E] px-6 text-sm font-black text-white shadow-[0_14px_30px_rgba(200,148,46,0.24)] transition hover:-translate-y-0.5 hover:brightness-105 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {isPending
                            ? 'Creando negocio...'
                            : 'Crear negocio e invitar owner'}
                    </button>
                </div>
            </div>
        </form>
    )
}

