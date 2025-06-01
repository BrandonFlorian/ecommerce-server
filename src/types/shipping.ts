export interface ShippingAddress {
    name?: string
    email?: string
    phone?: string
    address_line1: string
    address_line2?: string | null
    city: string
    state: string
    postal_code: string
    country: string
  }
  
  export interface ShippingItem {
    product_id: string
    quantity: number
    weight: number // in kg
    dimensions: {
      length: number // in cm
      width: number  // in cm
      height: number // in cm
    }
  }
  
  export interface ShippingRateRequest {
    address: ShippingAddress
    items: ShippingItem[]
    orderValue?: number // For free shipping calculations
  }
  
  export interface ShippingRate {
    rate_id: string // Shippo rate ID for purchasing labels
    service_code: string
    service_name: string
    carrier: string
    rate: number // in cents
    estimated_days: number
    zone?: string
  }

  // export interface ShippingAddress {
  //   address_line1: string;
  //   address_line2?: string | null;
  //   city: string;
  //   state: string;
  //   postal_code: string;
  //   country: string;
  // }
  
