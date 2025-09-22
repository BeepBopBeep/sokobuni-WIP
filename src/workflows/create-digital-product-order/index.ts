import {
  createWorkflow,
  transform,
  when,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import {
  completeCartWorkflow,
  useQueryGraphStep,
  createRemoteLinkStep,
  createOrderFulfillmentWorkflow,
  emitEventStep,
} from "@medusajs/medusa/core-flows"
import {
  Modules,
} from "@medusajs/framework/utils"
import createDigitalProductOrderStep from "./steps/create-digital-product-order"

import { DIGITAL_PRODUCT_MODULE } from "../../modules/digital-product"

type WorkflowInput = {
  cart_id?: string // optional cart_id if order_id is provided
  order_id?: string // optional order_id to skip cart completion
}

const createDigitalProductOrderWorkflow = createWorkflow(
  "create-digital-product-order",
  (input: WorkflowInput) => {
    // --- Step 1: get order id from cart or directly ---
    let id: string

    if (input.order_id) {
      id = input.order_id
    } else if (input.cart_id) {
      const { id: createdOrderId } = completeCartWorkflow.runAsStep({
        input: { id: input.cart_id },
      })
      id = createdOrderId
    } else {
      throw new Error("Either cart_id or order_id must be provided")
    }
    // --- Step 2: query order + digital product relations ---
    const digitalProductOrderFetchOrdersStep = useQueryGraphStep({
      entity: "order",
      fields: [
        "*",
        "items.*",
        "items.variant.*",
        "items.variant.digital_product.*",
        "shipping_address.*",
      ],
      filters: { id },
      options: { throwIfKeyNotFound: true },
    }).config({ name: "digital-product-order-fetch-orders-1" })

    const { data: orders } = digitalProductOrderFetchOrdersStep

    /** --- Step 3: filter digital items ---
    const itemsWithDigitalProducts = transform({ orders }, (data) => {
      const order = data.orders?.[0]
      if (!order || !order.items) {
        return []
      }
      return order.items.filter((item) => item && item.variant?.digital_product !== undefined)
    })
  */
    const itemsWithDigitalProducts = transform({
      orders,
    },
    (data) => {
        return data.orders[0].items.filter((item) => item.variant.digital_product !== undefined)
      }
    )


    // --- Step 4: create digital product order if needed -

    ///END OF COPIED IN
    const digital_product_order = when(
      "create-digital-product-order-condition",
      itemsWithDigitalProducts,
      (itemsWithDigitalProducts) => itemsWithDigitalProducts.length > 0
    ).then(() => {
      const orderItems =
        orders && orders[0] && Array.isArray(orders[0].items)
          ? orders[0].items.filter(
              (item) =>
                item &&
                item.variant &&
                item.variant.digital_product !== undefined
            )
          : []

      const { digital_product_order } = createDigitalProductOrderStep({
        items: orderItems as any, // Consider refining the type if possible
      })

      createRemoteLinkStep([
        {
          [DIGITAL_PRODUCT_MODULE]: {
            digital_product_order_id: digital_product_order.id,
          },
          [Modules.ORDER]: {
            order_id: id,
          },
        },
      ])

      createOrderFulfillmentWorkflow.runAsStep({
        input: {
          order_id: id,
          items: transform({ itemsWithDigitalProducts }, (data) =>
            data.itemsWithDigitalProducts
              .filter((item) => item != null)
              .map((item) => ({
                id: item!.id,
                quantity: item!.quantity,
              }))
          ),
        },
      })

      emitEventStep({
        eventName: "digital_product_order.created",
        data: { id: digital_product_order.id },
      })

      return digital_product_order
    })

    return new WorkflowResponse({
      order: orders[0],
      digital_product_order,
    })
  }
)

export default createDigitalProductOrderWorkflow