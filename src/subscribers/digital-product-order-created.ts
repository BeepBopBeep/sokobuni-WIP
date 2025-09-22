import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { DIGITAL_PRODUCT_MODULE } from "../modules/digital-product"
import { fulfillDigitalOrderWorkflow } from "../workflows/fulfill-digital-order"

export default async function handleDigitalProductOrderCreated({
  event: { data },
  container,
}: SubscriberArgs<{
  id: string
  order_id: string
  items_count: number
}>) {
  try {
    console.log(`Processing digital product order ${data.id} for order ${data.order_id}`)
    
    // Execute the fulfillment workflow for digital products
    await fulfillDigitalOrderWorkflow(container).run({
      input: {
        id: data.id,
      },
    })

    console.log(`Successfully processed digital product order ${data.id}`)
  } catch (error) {
    console.error("Error processing digital product order created event:", error)
    throw error
  }
}

export const config: SubscriberConfig = {
  event: "digital_product_order.created",
}