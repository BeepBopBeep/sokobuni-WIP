import { CreateProductWorkflowInputDTO } from "@medusajs/framework/types"
import { 
  createWorkflow, 
  transform, 
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { 
  createProductsWorkflow, 
  createRemoteLinkStep, 
  useQueryGraphStep,
} from "@medusajs/medusa/core-flows"
import { MARKETPLACE_MODULE } from "../../../modules/marketplace"
import { Modules } from "@medusajs/framework/utils"

type WorkflowInput = {
  vendor_admin_id: string
  product: CreateProductWorkflowInputDTO
}

const createVendorProductWorkflow = createWorkflow(
  "create-vendor-product",
  (input: WorkflowInput) => {
    // Retrieve default sales channel to make the product available in.
    // Alternatively, you can link sales channels to vendors and allow vendors
    // to manage sales channels
    const marketplaceVendorProductFetchStoresStep = useQueryGraphStep({
      entity: "store",
      fields: ["default_sales_channel_id"],
    }).config({ name: "marketplace-vendor-product-fetch-stores" })

    const { data: stores } = marketplaceVendorProductFetchStoresStep

    const productData = transform({
      input,
      stores,
    }, (data) => {
      return {
        products: [{
          ...data.input.product,
          sales_channels: [
            {
              id: data.stores[0].default_sales_channel_id,
            },
          ],
        }],
      }
    })

    const createdProducts = createProductsWorkflow.runAsStep({
      input: productData,

    })
    
    const marketplaceVendorProductFetchAdminsStep = useQueryGraphStep({
  entity: "vendor_admin",
  fields: ["vendor.id"],
  filters: {
    id: input.vendor_admin_id,
  },
}).config({ name: "marketplace-vendor-product-fetch-admins" })
const { data: vendorAdmins } = marketplaceVendorProductFetchAdminsStep

const linksToCreate = transform({
  input,
  createdProducts,
  vendorAdmins,
}, (data) => {
  return data.createdProducts.map((product) => {
    return {
      [MARKETPLACE_MODULE]: {
        vendor_id: data.vendorAdmins[0].vendor.id,
      },
      [Modules.PRODUCT]: {
        product_id: product.id,
      },
    }
  })
})

createRemoteLinkStep(linksToCreate)

const marketplaceVendorProductFetchProductsStep = useQueryGraphStep({
  entity: "product",
  fields: ["*", "variants.*"],
  filters: {
    id: createdProducts[0].id,
  },
}).config({ name: "marketplace-vendor-product-fetch-products" })

const { data: products } = marketplaceVendorProductFetchProductsStep

return new WorkflowResponse({
  product: products[0],
})
  }
)

export default createVendorProductWorkflow