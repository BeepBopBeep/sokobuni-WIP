import { createWorkflow, transform, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import { validateVenueAvailabilityStep } from "./steps/validate-venue-availability"
import { createTicketProductsStep } from "./steps/create-ticket-products"
import { useQueryGraphStep, createProductsWorkflow, createRemoteLinkStep, createInventoryItemsWorkflow } from "@medusajs/medusa/core-flows"
import { CreateProductWorkflowInputDTO, CreateMoneyAmountDTO } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"
import { TICKET_BOOKING_MODULE } from "../modules/ticket-booking"
import { RowType } from "../modules/ticket-booking/models/venue-row"
import { createTicketProductVariantsStep } from "./steps/create-ticket-product-variants"
import ticketProduct from "../links/ticket-product"

export type CreateTicketProductWorkflowInput = {
  name: string
  venue_id: string
  dates: string[]
  variants: Array<{
    row_type: RowType
    seat_count: number
    prices: CreateMoneyAmountDTO[]
  }>
}

export const createTicketProductWorkflow = createWorkflow(
  "create-ticket-product",
  (input: CreateTicketProductWorkflowInput) => {
    validateVenueAvailabilityStep({
      venue_id: input.venue_id,
      dates: input.dates,
    })

    const fetchTicketProductStoresStep = useQueryGraphStep({
      entity: "store",
      fields: ["id", "default_location_id", "default_sales_channel_id"],
    }).config({ name: "ticket-product-fetch-stores" })

    const { data: stores } = fetchTicketProductStoresStep
    const inventoryItemsData = transform({
  input,
  stores,
}, (data) => {
  const inventoryItems: any[] = []
  
  for (const date of data.input.dates) {
    for (const variant of data.input.variants) {
      inventoryItems.push({
        sku: `${data.input.name}-${date}-${variant.row_type}`,
        title: `${data.input.name} - ${date} - ${variant.row_type}`,
        description: `Ticket for ${data.input.name} on ${date} in ${variant.row_type} seating`,
        location_levels: [{
          location_id: data.stores[0].default_location_id,
          stocked_quantity: variant.seat_count,
        }],
        requires_shipping: false,
      })
    }
  }
  
  return inventoryItems
})

const inventoryItems = createInventoryItemsWorkflow.runAsStep({
  input: {
    items: inventoryItemsData,
  },
})

const productData = transform({
  input,
  inventoryItems,
  stores,
}, (data) => {
  const rowTypes = [...new Set(
    data.input.variants.map((variant: any) => variant.row_type)
  )]
  
  const product: CreateProductWorkflowInputDTO = {
    title: data.input.name,
    status: "published",
    options: [
      {
        title: "Date",
        values: data.input.dates,
      },
      {
        title: "Row Type", 
        values: rowTypes,
      },
    ],
    variants: [] as any[],
  }

  if (data.stores[0].default_sales_channel_id) {
    product.sales_channels = [
      {
        id: data.stores[0].default_sales_channel_id,
      },
    ]
  }

  // Create variants for each date and row type combination
  let inventoryIndex = 0
  for (const date of data.input.dates) {
    for (const variant of data.input.variants) {
      product.variants!.push({
        title: `${data.input.name} - ${date} - ${variant.row_type}`,
        options: {
          Date: date,
          "Row Type": variant.row_type,
        },
        manage_inventory: true,
        inventory_items: [{
          inventory_item_id: data.inventoryItems[inventoryIndex].id,
        }],
        prices: variant.prices,
      })
      inventoryIndex++
    }
  }

  return [product]
})

const medusaProduct = createProductsWorkflow.runAsStep({
  input: {
    products: productData,
  },
})

const ticketProductData = transform({
  medusaProduct,
  input,
}, (data) => {
  return {
    ticket_products: data.medusaProduct.map((product: any) => ({
      product_id: product.id,
      venue_id: data.input.venue_id,
      dates: data.input.dates,
    })),
  }
})

const { ticket_products } = createTicketProductsStep(
  ticketProductData
)

const ticketVariantsData = transform({
  medusaProduct,
  ticket_products,
  input,
}, (data) => {
  return {
    variants: data.medusaProduct[0].variants.map((variant: any) => {
      const rowType = variant.options.find(
        (opt: any) => opt.option?.title === "Row Type"
      )?.value
      return {
        ticket_product_id: data.ticket_products[0].id,
        product_variant_id: variant.id,
        row_type: rowType,
      }
    }),
  }
})

const { ticket_product_variants } = createTicketProductVariantsStep(
  ticketVariantsData
)

const linksData = transform({
  medusaProduct,
  ticket_products,
  ticket_product_variants,
}, (data) => {
  // Create links between ticket product and Medusa product
  const productLinks = [{
    [TICKET_BOOKING_MODULE]: {
      ticket_product_id: data.ticket_products[0].id,
    },
    [Modules.PRODUCT]: {
      product_id: data.medusaProduct[0].id,
    },
  }]

  // Create links between ticket variants and Medusa variants
  const variantLinks = data.ticket_product_variants.map((variant) => ({
    [TICKET_BOOKING_MODULE]: {
      ticket_product_variant_id: variant.id,
    },
    [Modules.PRODUCT]: {
      product_variant_id: variant.product_variant_id,
    },
  }))

  return [...productLinks, ...variantLinks]
})

createRemoteLinkStep(linksData)

const ticketProductFetchFinalStep = useQueryGraphStep({
  entity: "ticket_product",
  fields: [
    "id",
    "product_id",
    "venue_id",
    "dates",
    "venue.*",
    "product.*",
    "variants.*",
  ],
  filters: {
    id: ticket_products[0].id,
  },
}).config({ name: "ticket-product-fetch-final" })

 const { data: finalTicketProduct } = ticketProductFetchFinalStep

return new WorkflowResponse({
  ticket_product: finalTicketProduct[0],
})
  }
)