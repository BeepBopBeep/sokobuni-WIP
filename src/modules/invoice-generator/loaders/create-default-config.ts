import {
  LoaderOptions,
  IMedusaInternalService,
} from "@medusajs/framework/types"
import { InvoiceConfig } from "../models/invoice-config"

export default async function createDefaultConfigLoader({
  container,
}: LoaderOptions) {
  const service: IMedusaInternalService<
    typeof InvoiceConfig
  > = container.resolve("invoiceConfigService")

  const [_, count] = await service.listAndCount()

  if (count > 0) {
    return
  }

  await service.create({
    company_name: "Kampuni Yangu",
    company_address: "123 Barabara, Pahali Pazuri, Nairobi",
    company_phone: "+254 1234 567 890",
    company_email: "admin@example.com",
    company_tax_id: "ABC1234567",
  })
}