import 'server-only'

import {
    Environment,
    IntegrationApiKeys,
    IntegrationCommerceCodes,
    Options,
    WebpayPlus,
} from 'transbank-sdk'

export function getWebpayTransaction() {
    /*
     * Por ahora utilizamos el ambiente oficial
     * de integración de Transbank.
     *
     * Las credenciales reales de producción se
     * agregarán cuando el comercio sea habilitado.
     */
    return new WebpayPlus.Transaction(
        new Options(
            IntegrationCommerceCodes.WEBPAY_PLUS,
            IntegrationApiKeys.WEBPAY,
            Environment.Integration
        )
    )
}