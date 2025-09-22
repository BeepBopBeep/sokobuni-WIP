 
import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { TICKET_BOOKING_MODULE } from "../modules/ticket-booking"

export default async function ticketPurchasesCreatedHandler({
  event: { data },
  container,
}: SubscriberArgs<{ 
    id: string
    order_id: string
    purchase_count: number
    ticket_purchases: Array<{ id: string }>
 }>) {
    console.log(`Ticket purchases created for order ${data.order_id}`)
    console.log(`Number of purchases: ${data.purchase_count}`)
    const query = container.resolve("query")
    const notificationModuleService = container.resolve("notification")
    const ticketBookingModuleService = container.resolve(TICKET_BOOKING_MODULE)


 try {
    const { data: orders } = await query.graph({
      entity: "order",
      fields: [
        "id", 
        "email", 
        "created_at",
        "items.*",
        "ticket_purchases.*",
        "ticket_purchases.ticket_product.*",
        "ticket_purchases.ticket_product.product.*",
        "ticket_purchases.ticket_product.venue.*",
        "ticket_purchases.venue_row.*",
        "customer.*",
        "billing_address.*",
      ],
      filters: {
        id: data.id,
      },
    })

    const order = orders[0]
    if (!order) {
      console.warn(`Order ${data.id} not found`)
      return
    }

    const ticketPurchaseIds: string[] = order.ticket_purchases
      ?.map((purchase: any) => purchase?.id)
      .filter(Boolean) as string[] || []

    let qrCodes: Record<string, string> = {}
    if (ticketPurchaseIds.length > 0) {
      qrCodes = await ticketBookingModuleService.generateTicketQRCodes(
        ticketPurchaseIds
      )
    }

    const firstTicketPurchase = order.ticket_purchases?.[0]

    await notificationModuleService.createNotifications({
      to: order.email || "",
      channel: "feed",
      template: "order.placed",
      data: {
        customer: {
          first_name: order.customer?.first_name || 
            order.billing_address?.first_name,
          last_name: order.customer?.last_name || 
            order.billing_address?.last_name,
        },
        order: {
          display_id: order.id,
          created_at: order.created_at,
          email: order.email,
        },
        show: {
          name: firstTicketPurchase?.ticket_product?.product?.title || 
            "Your Event",
          date: firstTicketPurchase?.show_date?.toLocaleString() || "",
          venue: firstTicketPurchase?.ticket_product?.venue?.name || 
            "Venue Name",
        },
        tickets: order.ticket_purchases?.map((purchase: any) => ({
          label: purchase?.venue_row?.row_type?.toUpperCase() || "TICKET",
          seat: purchase?.seat_number || "",
          row: purchase?.venue_row?.row_number || "",
          qr: qrCodes[purchase?.id || ""] || "",
        })) || [],
        billing_address: order.billing_address,
      },
    })

    console.log(`Successfully processed order ${order.id} with ${ticketPurchaseIds.length} tickets`)
  } catch (error) {
    console.error("Error processing order placed event:", error)
    throw error
  }
}

export const config: SubscriberConfig = {
  event: "ticket_purchases.created",
}