import { formatInTimeZone, fromZonedTime } from 'date-fns-tz'

export const BUSINESS_TIME_ZONE = 'America/Santiago'

export function businessLocalToUtcIso(date: string, time: string) {
    const utcDate = fromZonedTime(`${date} ${time}`, BUSINESS_TIME_ZONE)
    return utcDate.toISOString()
}

export function utcToBusinessTime(isoString: string) {
    return formatInTimeZone(isoString, BUSINESS_TIME_ZONE, 'HH:mm')
}

export function utcToBusinessDate(isoString: string) {
    return formatInTimeZone(isoString, BUSINESS_TIME_ZONE, 'yyyy-MM-dd')
}