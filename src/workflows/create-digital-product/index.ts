/**import {
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
import { Modules } from "@medusajs/framework/utils"
import createDigitalProductOrderStep from "./steps/create-digital-product-order"
import { DIGITAL_PRODUCT_MODULE } from "../../modules/digital-product"

type WorkflowInput = {
  cart_id?: string
  order_id?: string
}

const createDigitalProductOrderWorkflow = createWorkflow<
  WorkflowInput,
  { cart: any; order: any; digital_product_order?: any },
  any>
  ("create-digital-product-order",
  (input) => {
    // --- Step 1: resolve order id ---
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
  
    // --- Step 2: query the order ---
    const digitalProductFetchOrdersStep = useQueryGraphStep({
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
    }).config({ name: "digital-product-fetch-orders" })

    const { data: orders } = digitalProductFetchOrdersStep

    // --- Step 2.5: query the cart if cart_id is provided ---
    let cart: any = undefined
    if (input.cart_id) {
      const digitalProductFetchCartsStep = useQueryGraphStep({
        entity: "cart",
        fields: ["*", "items.*"],
        filters: { id: input.cart_id },
        options: { throwIfKeyNotFound: false },
      }).config({ name: "digital-product-fetch-carts" })

      const { data: carts } = digitalProductFetchCartsStep

      cart = carts?.[0]
    }

    // --- Step 3: filter items with digital products ---
    const itemsWithDigitalProducts = transform({ orders }, (data) =>
      (data.orders?.[0]?.items ?? []).filter(
        (item) => item && item.variant && item.variant.digital_product !== undefined
      )
    )

    // --- Step 4: create digital product order if needed ---
    const digital_product_order = when(
      "create-digital-product-order-condition",
      itemsWithDigitalProducts,
      (items) => items.length > 0 //Boolean, not number
    ).then(() => {
      const { digital_product_order } = createDigitalProductOrderStep({
        items: (orders?.[0]?.items ?? []) as any,   // cast & null-guard
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
            (data.itemsWithDigitalProducts ?? [])
              .filter((i): i is NonNullable<typeof i> => !!i)
              .map((item) => ({
                id: item.id!,
                quantity: item.quantity!,
              }))
          ),
        },
      })

      emitEventStep({
        eventName: "digital_product_order.created",
        data: { id: digital_product_order.id },
      })

      return new WorkflowResponse({
        cart,
        order: orders[0],
        digital_product_order,
      })
    })

    return new WorkflowResponse({
      cart,
      order: orders[0],
      digital_product_order,
    })
  }
)
export default createDigitalProductOrderWorkflow

**/
//ORIGINAL BELOW - needs fixing
import { 
  createWorkflow,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import {
  CreateProductWorkflowInputDTO,
} from "@medusajs/framework/types"
import { 
  createProductsWorkflow,
  createRemoteLinkStep,
} from "@medusajs/medusa/core-flows"
import { 
  Modules,
} from "@medusajs/framework/utils"
import createDigitalProductStep, { 
  CreateDigitalProductStepInput,
} from "./steps/create-digital-product"
import createDigitalProductMediasStep, { 
  CreateDigitalProductMediaInput,
} from "./steps/create-digital-product-medias"
import { DIGITAL_PRODUCT_MODULE } from "../../modules/digital-product"

type CreateDigitalProductWorkflowInput = {
  digital_product: CreateDigitalProductStepInput & {
    medias: Omit<CreateDigitalProductMediaInput, "digital_product_id">[]
  }
  product: CreateProductWorkflowInputDTO
}

const createDigitalProductWorkflow = createWorkflow(
  "create-digital-product",
  (input: CreateDigitalProductWorkflowInput) => {
    const { medias, ...digitalProductData } = input.digital_product

    const product = createProductsWorkflow.runAsStep({
      input: {
        products: [input.product],
      },
    })

    const { digital_product } = createDigitalProductStep(
      digitalProductData
    )

    const { digital_product_medias } = createDigitalProductMediasStep(
      transform({
        digital_product,
        medias,
      },
      (data) => ({
        medias: data.medias.map((media) => ({
          ...media,
          digital_product_id: data.digital_product.id,
        })),
      })
      )
    )

    createRemoteLinkStep([{
      [DIGITAL_PRODUCT_MODULE]: {
        digital_product_id: digital_product.id,
      },
      [Modules.PRODUCT]: {
        product_variant_id: product[0].variants[0].id,
      },
    }])

    return new WorkflowResponse({
      digital_product: {
        ...digital_product,
        medias: digital_product_medias,
      },
    })
  }
)

export default createDigitalProductWorkflow
/* END OF ORIGINAL */