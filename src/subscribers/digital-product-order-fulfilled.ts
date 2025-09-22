import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { DIGITAL_PRODUCT_MODULE } from "../modules/digital-product"

export default async function handleDigitalOrderFulfilled({
  event: { data },
  container,
}: SubscriberArgs<{
  id: string
  order_id: string
  status: string
}>) {
  const digitalProductModuleService = container.resolve(DIGITAL_PRODUCT_MODULE)
  const notificationModuleService = container.resolve("notification")
  
  try {
    console.log(`Digital order ${data.id} fulfilled for order ${data.order_id}`)
    
    // Update digital product order status
    await digitalProductModuleService.updateDigitalProductOrders(data.id, {
      status: data.status === "delivered" ? "sent" : "pending"
    })

    // Send confirmation notification
    if (data.status === "delivered") {
      // Get order details to send email
      const query = container.resolve("query")
      const { data: orders } = await query.graph({
        entity: "order",
        fields: [
          "id",
          "email",
          "customer.*",
          "digital_product_orders.*",
          "digital_product_orders.products.*"
        ],
        filters: { id: data.order_id },
      })

      const order = orders[0]
      if (order && order.email) {
        await notificationModuleService.createNotifications({
          to: order.email,
          channel: "email",
          template: "digital_order.delivered",
          data: {
            order_id: order.id,
            digital_order_id: data.id,
            customer_name: order.customer?.first_name || "Customer"
          },
        })
      }
    }

    console.log(`Successfully processed digital order fulfillment for ${data.id}`)
  } catch (error) {
    console.error("Error processing digital order fulfilled event:", error)
    throw error
  }
}

export const config: SubscriberConfig = {
  event: "digital_order.fulfilled", // You may need to emit this event in your workflow
}