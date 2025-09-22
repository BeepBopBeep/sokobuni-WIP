import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { Container, Heading, Text } from "@medusajs/ui"
import { AdminOrder, DetailWidgetProps } from "@medusajs/framework/types"

type TicketLineItemMeta = {
  is_ticket?: boolean
  attendee_name?: string
  attendee_email?: string
  seat?: string
  event_date?: string
  ticket_id?: string
}

const TicketOrderItemsWidget = ({
  data: order,
}: DetailWidgetProps<AdminOrder>) => {
  // Identify ticket items using strict flag checks
  const ticketItems =
    order.items?.filter((item) => {
      const productIsTicket =
        (item.variant?.product?.metadata as Record<string, unknown> | undefined)
          ?.is_ticket === true
      const lineItemIsTicket =
        (item.metadata as Record<string, unknown> | undefined)?.is_ticket === true
      return productIsTicket || lineItemIsTicket
    }) ?? []

  // Early return if nothing to show (same style as personalized example).
  if (!ticketItems.length) {
    return <></>
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">Ticketed Order Items</Heading>
      </div>

      <div className="divide-y">
        {ticketItems.flatMap((item) => {
          const meta = (item.metadata ?? {}) as TicketLineItemMeta
          const thumbnail = item.variant?.product?.thumbnail
          const alt =
            item.variant?.title ||
            item.variant?.product?.title ||
            "Ticketed Product"

          // Render each ticket standalone
          return Array.from({ length: item.quantity }).map((_, idx) => (
            <div
              key={`${item.id}-${idx}`}
              className="flex gap-4 px-6 py-4"
            >
              {thumbnail && (
                <img
                  src={thumbnail}
                  alt={alt}
                  className="h-8 w-6 object-cover rounded border border-ui-border"
                />
              )}

              <div className="flex flex-col">
                <Text size="small" weight="plus">
                  {item.variant?.product?.title || "Product"}:{" "}
                  {item.variant?.title || "Variant"} — Ticket {idx + 1} of{" "}
                  {item.quantity}
                </Text>
                <Text size="small" className="text-ui-fg-subtle">
                  Attendee: {meta.attendee_name || "N/A"}
                </Text>
                <Text size="small" className="text-ui-fg-subtle">
                  Email: {meta.attendee_email || "N/A"}
                </Text>
                <Text size="small" className="text-ui-fg-subtle">
                  Seat: {meta.seat || "Unassigned"}
                </Text>
                <Text size="small" className="text-ui-fg-subtle">
                  Event Date: {meta.event_date || "TBD"}
                </Text>
                {meta.ticket_id && (
                  <Text size="small" className="text-ui-fg-subtle">
                    Ticket ID: {meta.ticket_id}
                  </Text>
                )}
              </div>
            </div>
          ))
        })}
      </div>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "order.details.after",
})

export default TicketOrderItemsWidget
