'use client'

import {
    FormEvent,
    useMemo,
    useState,
} from 'react'
import {
    BadgeCheck,
    Mail,
    Check,
    ShieldCheck,
    UserRound,
    UserRoundPlus,
    UsersRound,
    X,
} from 'lucide-react'
import {
    useRouter,
} from 'next/navigation'
import { toast } from 'sonner'

import {
    inviteBusinessMemberServer,
    type BusinessInvitationRole,
} from '@/src/features/team/api/invite-business-member-server'

import {
    cancelBusinessInvitationServer,
} from '@/src/features/team/api/cancel-business-invitation-server'
import { AdminSelect } from '@/src/features/admin/components/admin-select'
import { AdminInput } from '@/src/features/admin/components/admin-input'

type TeamBarber = {
    id: string
    name: string
    specialty: string | null
    photo_url: string | null
    profile_id: string | null
    is_active: boolean
}

type TeamMember = {
    id: string
    full_name: string | null
    email: string | null
    role: string
}

type TeamInvitation = {
    id: string
    email: string
    full_name: string | null
    role: string
    status: string
    barber_id: string | null
    expires_at: string
    created_at: string
}

type AdminTeamManagerProps = {
    businessName: string
    canInvite: boolean
    subscriptionBlockReason: string
    barbers: TeamBarber[]
    members: TeamMember[]
    invitations: TeamInvitation[]
}

function formatRole(
    role: string
) {
    if (role === 'owner') {
        return 'Propietario'
    }

    if (role === 'admin') {
        return 'Administrador'
    }

    if (role === 'barber') {
        return 'Barbero'
    }

    return role
}

function formatDate(
    value: string
) {
    const date =
        new Date(value)

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return value
    }

    return new Intl.DateTimeFormat(
        'es-CL',
        {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        }
    )
        .format(date)
        .replace('.', '')
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

export function AdminTeamManager({
    canInvite,
    subscriptionBlockReason,
    barbers,
    members,
    invitations,
}: AdminTeamManagerProps) {
    const router =
        useRouter()

    const [
        role,
        setRole,
    ] =
        useState<BusinessInvitationRole>(
            'barber'
        )

    const [
        barberId,
        setBarberId,
    ] = useState('')

    const [
        fullName,
        setFullName,
    ] = useState('')

    const [
        email,
        setEmail,
    ] = useState('')

    const [
        sending,
        setSending,
    ] = useState(false)

    const [
        cancellingId,
        setCancellingId,
    ] =
        useState<string | null>(
            null
        )

    const availableBarbers =
        useMemo(
            () =>
                barbers.filter(
                    (barber) =>
                        barber.is_active &&
                        !barber.profile_id
                ),
            [barbers]
        )

    const barberOptions = useMemo(
        () =>
            [
                {
                    value: '',
                    label: availableBarbers.length > 0
                        ? 'Selecciona un barbero'
                        : 'No hay profesionales disponibles',
                },
                ...availableBarbers.map((barber) => ({
                    value: barber.id,
                    label: barber.specialty
                        ? `${barber.name} — ${barber.specialty}`
                        : barber.name,
                })),
            ],
        [availableBarbers]
    )

    const pendingInvitations =
        invitations.filter(
            (invitation) =>
                invitation.status ===
                'pending'
        )

    function handleRoleChange(
        nextRole: BusinessInvitationRole
    ) {
        if (
            sending ||
            !canInvite
        ) {
            return
        }

        setRole(nextRole)

        if (nextRole === 'admin') {
            setBarberId('')
            return
        }

        setFullName('')
    }


    async function handleInvite(
        event:
            FormEvent<HTMLFormElement>
    ) {
        event.preventDefault()

        if (
            !canInvite ||
            sending
        ) {
            return
        }

        if (
            role === 'barber' &&
            !barberId
        ) {
            toast.error(
                'Selecciona el profesional que recibirá acceso'
            )
            return
        }

        if (
            role === 'admin' &&
            !fullName.trim()
        ) {
            toast.error(
                'Ingresa el nombre del administrador'
            )
            return
        }

        if (!email.trim()) {
            toast.error(
                'Ingresa el correo electrónico'
            )
            return
        }

        setSending(true)

        try {
            const result =
                await inviteBusinessMemberServer({
                    email,
                    fullName:
                        role === 'admin'
                            ? fullName
                            : '',
                    role,
                    barberId:
                        role === 'barber'
                            ? barberId
                            : null,
                })

            if (!result.ok) {
                toast.error(
                    result.message
                )
                return
            }

            toast.success(
                result.message
            )

            setEmail('')
            setFullName('')
            setBarberId('')

            router.refresh()
        } catch (error) {
            console.error(
                'Error enviando invitación:',
                error
            )

            toast.error(
                'No se pudo enviar la invitación'
            )
        } finally {
            setSending(false)
        }
    }

    async function handleCancel(
        invitationId: string
    ) {
        if (cancellingId) {
            return
        }

        const confirmed =
            window.confirm(
                '¿Deseas cancelar esta invitación? El enlace enviado dejará de ser válido.'
            )

        if (!confirmed) {
            return
        }

        setCancellingId(
            invitationId
        )

        try {
            const result =
                await cancelBusinessInvitationServer(
                    invitationId
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

            router.refresh()
        } catch (error) {
            console.error(
                'Error cancelando invitación:',
                error
            )

            toast.error(
                'No se pudo cancelar la invitación'
            )
        } finally {
            setCancellingId(
                null
            )
        }
    }

    return (
        <div className="space-y-5">
            {!canInvite && (
                <section className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold leading-6 text-amber-800">
                    {subscriptionBlockReason ||
                        'La suscripción actual no permite invitar integrantes.'}
                </section>
            )}


            <section className="grid gap-5 xl:grid-cols-[minmax(0,520px)_minmax(0,1fr)] xl:items-start">
                <article className="self-start overflow-hidden rounded-[26px] border border-black/10 bg-[#FFFCF4] shadow-[0_16px_40px_rgba(15,23,42,0.07)]">
                    <header className="flex items-start gap-3 border-b border-black/10 px-5 py-4">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#F4E7C7] text-[#8A5D16]">
                            <UserRoundPlus className="h-5 w-5" />
                        </div>

                        <div className="min-w-0">
                            <h2 className="text-xl font-black leading-tight text-slate-950">
                                Invitar integrante
                            </h2>

                            <p className="mt-1 text-sm font-medium leading-5 text-slate-500">
                                Entrega acceso administrativo o vincula una cuenta a un profesional.
                            </p>
                        </div>
                    </header>

                    <form
                        onSubmit={handleInvite}
                        className="space-y-4 p-5"
                    >

                        <div>
                            <div className="mb-2">
                                <p className="text-sm font-black text-slate-800">
                                    Tipo de acceso
                                </p>

                                <p className="mt-0.5 text-xs font-medium text-slate-500">
                                    Selecciona los permisos que tendrá la persona.
                                </p>
                            </div>

                            <div className="grid gap-3 sm:grid-cols-2">
                                <button
                                    type="button"
                                    disabled={
                                        !canInvite ||
                                        sending
                                    }
                                    onClick={() =>
                                        handleRoleChange(
                                            'barber'
                                        )
                                    }
                                    aria-pressed={
                                        role === 'barber'
                                    }
                                    className={`group relative min-h-[88px] rounded-[18px] border p-3.5 text-left transition duration-200 ${role === 'barber'
                                        ? 'border-[#C8942E] bg-gradient-to-br from-[#FFF8E8] to-[#F8E7BC] shadow-[0_10px_22px_rgba(200,148,46,0.14)] ring-1 ring-[#C8942E]/20'
                                        : 'border-black/10 bg-white hover:-translate-y-0.5 hover:border-[#D7BA76] hover:bg-[#FFFCF5] hover:shadow-sm'
                                        } disabled:cursor-not-allowed disabled:opacity-50`}
                                >
                                    <div className="flex items-center gap-3">
                                        <span
                                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition ${role === 'barber'
                                                ? 'bg-[#C8942E] text-white'
                                                : 'bg-[#F4EFE5] text-[#8A5D16]'
                                                }`}
                                        >
                                            <UserRound className="h-5 w-5" />
                                        </span>

                                        <div className="min-w-0">
                                            <p
                                                className={`text-sm font-black ${role === 'barber'
                                                    ? 'text-[#7A4F0D]'
                                                    : 'text-slate-900'
                                                    }`}
                                            >
                                                Barbero
                                            </p>

                                            <p className="mt-0.5 text-[11px] font-medium leading-4 text-slate-500">
                                                Solo su agenda y operación.
                                            </p>
                                        </div>
                                    </div>

                                    {role === 'barber' && (
                                        <span className="absolute right-2.5 top-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#C8942E] text-white">
                                            <Check className="h-3 w-3 stroke-[3]" />
                                        </span>
                                    )}
                                </button>

                                <button
                                    type="button"
                                    disabled={
                                        !canInvite ||
                                        sending
                                    }
                                    onClick={() =>
                                        handleRoleChange(
                                            'admin'
                                        )
                                    }
                                    aria-pressed={
                                        role === 'admin'
                                    }
                                    className={`group relative min-h-[88px] rounded-[18px] border p-3.5 text-left transition duration-200 ${role === 'admin'
                                        ? 'border-[#C8942E] bg-gradient-to-br from-[#FFF8E8] to-[#F8E7BC] shadow-[0_10px_22px_rgba(200,148,46,0.14)] ring-1 ring-[#C8942E]/20'
                                        : 'border-black/10 bg-white hover:-translate-y-0.5 hover:border-[#D7BA76] hover:bg-[#FFFCF5] hover:shadow-sm'
                                        } disabled:cursor-not-allowed disabled:opacity-50`}
                                >
                                    <div className="flex items-center gap-3">
                                        <span
                                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition ${role === 'admin'
                                                ? 'bg-[#C8942E] text-white'
                                                : 'bg-[#F4EFE5] text-[#8A5D16]'
                                                }`}
                                        >
                                            <ShieldCheck className="h-5 w-5" />
                                        </span>

                                        <div className="min-w-0">
                                            <p
                                                className={`text-sm font-black ${role === 'admin'
                                                    ? 'text-[#7A4F0D]'
                                                    : 'text-slate-900'
                                                    }`}
                                            >
                                                Administrador
                                            </p>

                                            <p className="mt-0.5 text-[11px] font-medium leading-4 text-slate-500">
                                                Gestiona el negocio, sin plan.
                                            </p>
                                        </div>
                                    </div>

                                    {role === 'admin' && (
                                        <span className="absolute right-2.5 top-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#C8942E] text-white">
                                            <Check className="h-3 w-3 stroke-[3]" />
                                        </span>
                                    )}
                                </button>
                            </div>

                            <p className="mt-2 px-1 text-[11px] font-semibold leading-4 text-slate-500">
                                {role === 'barber'
                                    ? 'Se vinculará con un profesional existente y verá únicamente su información.'
                                    : 'Podrá gestionar reservas, servicios, profesionales y horarios, pero no la suscripción.'}
                            </p>
                        </div>

                        {role ===
                            'barber' ? (
                            <div>

                                <AdminSelect
                                    id="barberId"
                                    label="Profesional"
                                    value={barberId}
                                    onChange={setBarberId}
                                    options={barberOptions}
                                    disabled={
                                        !canInvite ||
                                        sending ||
                                        availableBarbers.length ===
                                        0
                                    }
                                    maxMenuHeight={240}
                                />

                                {availableBarbers.length ===
                                    0 && (
                                        <p className="mt-2 text-xs font-bold leading-5 text-slate-500">
                                            Todos los profesionales activos ya tienen acceso o no existen profesionales disponibles.
                                        </p>
                                    )}
                            </div>
                        ) : (
                            <div>

                                <AdminInput
                                    id="fullName"
                                    label="Nombre completo"
                                    value={fullName}
                                    onChange={setFullName}
                                    placeholder="Ej: Camila González"
                                    disabled={
                                        !canInvite ||
                                        sending
                                    }
                                />
                            </div>
                        )}

                        <div>

                            <AdminInput
                                id="email"
                                label="Correo electrónico"
                                type="email"
                                value={email}
                                onChange={setEmail}
                                placeholder="correo@ejemplo.cl"
                                disabled={
                                    !canInvite ||
                                    sending
                                }
                                hint="La persona recibirá un enlace para crear su contraseña."
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={
                                !canInvite ||
                                sending ||
                                (
                                    role ===
                                    'barber' &&
                                    !barberId
                                )
                            }
                            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#C8942E] px-5 text-sm font-black text-white shadow-[0_14px_30px_rgba(200,148,46,0.24)] transition hover:brightness-105 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <Mail className="h-4 w-4" />

                            {sending
                                ? 'Enviando invitación...'
                                : 'Enviar invitación'}
                        </button>
                    </form>
                </article>

                <article className="self-start overflow-hidden rounded-[26px] border border-black/10 bg-[#FFFCF4] shadow-[0_16px_40px_rgba(15,23,42,0.07)]">
                    <header className="flex items-center justify-between gap-4 border-b border-black/10 px-5 py-5">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#C8942E]">
                                Acceso activo
                            </p>

                            <h2 className="mt-1 text-2xl font-black text-slate-950">
                                Miembros del equipo
                            </h2>
                        </div>

                        <span className="rounded-full bg-[#F4E7C7] px-3 py-1.5 text-xs font-black text-[#8A5D16]">
                            {members.length}
                        </span>
                    </header>

                    <div className="divide-y divide-black/10">
                        {members.map(
                            (member) => {
                                const linkedBarber =
                                    barbers.find(
                                        (
                                            barber
                                        ) =>
                                            barber.profile_id ===
                                            member.id
                                    )

                                const displayName =
                                    member.full_name ||
                                    linkedBarber?.name ||
                                    member.email ||
                                    'Integrante'

                                return (
                                    <div
                                        key={
                                            member.id
                                        }
                                        className="flex items-center gap-4 px-5 py-4"
                                    >
                                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-sm font-black text-slate-700">
                                            {getInitials(
                                                displayName
                                            ) ||
                                                'U'}
                                        </div>

                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <p className="truncate text-sm font-black text-slate-950">
                                                    {
                                                        displayName
                                                    }
                                                </p>

                                                {member.role ===
                                                    'owner' && (
                                                        <BadgeCheck className="h-4 w-4 text-[#C8942E]" />
                                                    )}
                                            </div>

                                            <p className="mt-1 truncate text-xs font-medium text-slate-500">
                                                {member.email ||
                                                    'Sin correo registrado'}
                                            </p>
                                        </div>

                                        <span className="shrink-0 rounded-full border border-black/10 bg-white px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-slate-600">
                                            {formatRole(
                                                member.role
                                            )}
                                        </span>
                                    </div>
                                )
                            }
                        )}
                    </div>
                </article>
            </section>

            <section className="overflow-hidden rounded-[26px] border border-black/10 bg-[#FFFCF4] shadow-[0_16px_40px_rgba(15,23,42,0.07)]">
                <header className="flex items-center justify-between gap-4 border-b border-black/10 px-5 py-5">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#C8942E]">
                            Pendientes
                        </p>

                        <h2 className="mt-1 text-2xl font-black text-slate-950">
                            Invitaciones enviadas
                        </h2>
                    </div>

                    <span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-black text-blue-700 ring-1 ring-blue-200">
                        {
                            pendingInvitations.length
                        }
                    </span>
                </header>

                {pendingInvitations.length ===
                    0 ? (
                    <div className="px-5 py-12 text-center">
                        <UsersRound className="mx-auto h-9 w-9 text-slate-300" />

                        <p className="mt-3 text-sm font-black text-slate-700">
                            No hay invitaciones pendientes
                        </p>

                        <p className="mt-1 text-xs font-medium text-slate-500">
                            Las nuevas invitaciones aparecerán aquí.
                        </p>
                    </div>
                ) : (
                    <div className="divide-y divide-black/10">
                        {pendingInvitations.map(
                            (
                                invitation
                            ) => (
                                <div
                                    key={
                                        invitation.id
                                    }
                                    className="flex flex-col gap-4 px-5 py-4 md:flex-row md:items-center"
                                >
                                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                                        {invitation.role ===
                                            'admin' ? (
                                            <ShieldCheck className="h-5 w-5" />
                                        ) : (
                                            <UserRound className="h-5 w-5" />
                                        )}
                                    </div>

                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-black text-slate-950">
                                            {invitation.full_name ||
                                                invitation.email}
                                        </p>

                                        <p className="mt-1 truncate text-xs font-medium text-slate-500">
                                            {
                                                invitation.email
                                            }
                                        </p>
                                    </div>

                                    <div className="text-xs font-bold text-slate-500 md:text-right">
                                        <p>
                                            {formatRole(
                                                invitation.role
                                            )}
                                        </p>

                                        <p className="mt-1">
                                            Vence{' '}
                                            {formatDate(
                                                invitation.expires_at
                                            )}
                                        </p>
                                    </div>

                                    <button
                                        type="button"
                                        disabled={
                                            !canInvite ||
                                            cancellingId === invitation.id
                                        }
                                        onClick={() =>
                                            handleCancel(
                                                invitation.id
                                            )
                                        }
                                        className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 text-xs font-black text-red-700 transition hover:bg-red-100 disabled:opacity-50"
                                    >
                                        <X className="h-4 w-4" />

                                        {cancellingId ===
                                            invitation.id
                                            ? 'Cancelando...'
                                            : 'Cancelar'}
                                    </button>
                                </div>
                            )
                        )}
                    </div>
                )}
            </section>
        </div>
    )
}

