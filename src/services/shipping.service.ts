import { ShippingAddress, ShippingItem, ShippingRate, ShippingRateRequest } from "@/types/shipping";
import { AppError } from "../utils/appError";
import { logger } from "../utils/logger";
import { FREE_SHIPPING_CONFIG, FROM_ADDRESS, shippo } from "@/config/shippo";
import { supabaseClient, getAdminClient } from "@/config/supabase";
import { Rate } from "shippo";

// Interfaces


export const calculateShippingRates = async (
  request: ShippingRateRequest
): Promise<ShippingRate[]> => {
  try {
    const { address, items, orderValue = 0 } = request

    // Calculate parcel details
    const parcelDetails = calculateParcelDetails(items)

    // Create shipment with Shippo
    const shipment = await shippo.shipments.create({
      addressFrom: FROM_ADDRESS,
      addressTo: {
        name: address.name || 'Customer',
        street1: address.address_line1,
        street2: address.address_line2 || '',
        city: address.city,
        state: address.state,
        zip: address.postal_code,
        country: address.country || 'US',
        email: address.email || '',
        phone: address.phone || ''
      },
      parcels: [{
        length: parcelDetails.length.toString(),
        width: parcelDetails.width.toString(),
        height: parcelDetails.height.toString(),
        distanceUnit: 'cm',
        weight: parcelDetails.weight.toString(),
        massUnit: 'kg'
      }],
      async: false
    })

    if (!shipment.rates || shipment.rates.length === 0) {
      logger.warn('No rates returned from Shippo')
      throw new AppError('No shipping rates available for this address', 400)
    }

    // Process and filter rates
    const rates = shipment.rates as Rate[]
    const isDomestic = address.country === 'US' || !address.country
    
    // Check free shipping eligibility
    const freeShippingConfig = isDomestic ? FREE_SHIPPING_CONFIG.domestic : FREE_SHIPPING_CONFIG.international
    const eligibleForFreeShipping = orderValue >= freeShippingConfig.threshold

    // Transform Shippo rates to our format
    const transformedRates: ShippingRate[] = rates
      // Filter for rates that can be purchased through Shippo
      .filter(rate => typeof rate.objectId === 'string') 
      .map(rate => {
      
        // Check if this service is eligible for free shipping
        const serviceToken = rate.servicelevel?.token || '';
        const isFreeShippingMethod = freeShippingConfig.methods.includes(serviceToken);
        const finalRate = eligibleForFreeShipping && isFreeShippingMethod ? 0 : Math.round(parseFloat(rate.amount) * 100);
        
        return {
          rate_id: rate.objectId,
          service_code: `${rate.provider}_${rate.servicelevel.token}`,
          service_name: formatServiceName(rate, eligibleForFreeShipping && isFreeShippingMethod),
          carrier: rate.provider,
          rate: finalRate, // Convert to cents
          estimated_days: rate.estimatedDays || 5,
          zone: rate.zone
        }
      })
      .sort((a, b) => {
        // Sort by: Free shipping first, then by price
        if (a.rate === 0 && b.rate !== 0) return -1
        if (a.rate !== 0 && b.rate === 0) return 1
        return a.rate - b.rate
      })

    console.log("calculateShippingRates transformedRates", transformedRates);

    // Log rates for debugging
    logger.info(`Calculated ${transformedRates.length} shipping rates for ${address.city}, ${address.state}`)

    return transformedRates
  } catch (error: any) {
    logger.error("Error calculating shipping rates with Shippo:", error)
    
    // If Shippo fails, throw error so frontend knows
    if (error.message?.includes('Invalid API key')) {
      throw new AppError('Shipping service configuration error', 500)
    }
    
    throw new AppError(error.message || 'Failed to calculate shipping rates', 500)
  }
}

export const validateAddress = async (
  address: ShippingAddress
): Promise<{ 
  valid: boolean 
  suggestions?: ShippingAddress[] 
  validation_results?: any 
}> => {
  try {
    const response = await shippo.addresses.create({
      name: address.name || 'Customer',
      street1: address.address_line1,
      street2: address.address_line2 || '',
      city: address.city,
      state: address.state,
      zip: address.postal_code,
      country: address.country || 'US',
      validate: true
    })

    const isValid = response.validationResults?.isValid || false
    
    if (isValid) {
      return { valid: true, validation_results: response.validationResults }
    }

    // Parse validation messages for user feedback
    const messages = response.validationResults?.messages || []
    const suggestions: ShippingAddress[] = []

    // If Shippo provides a suggested address, use it
    if (response.validationResults && response.validationResults.messages && response.validationResults.messages.length > 0) {
      // Extract suggested addresses from messages
      for (const message of response.validationResults.messages) {
        if (message.text && typeof message.text === 'string' && message.text.includes('suggested address')) {
          // Create a suggested address based on the validated response
          suggestions.push({
            address_line1: response.street1 || '',
            address_line2: response.street2 || null,
            city: response.city || '',
            state: response.state || '',
            postal_code: response.zip || '',
            country: response.country || '',
            name: address.name,
            email: address.email,
            phone: address.phone
          });
          break; // Only add one suggestion from validation results
        }
      }
    }

    return { 
      valid: false, 
      suggestions,
      validation_results: response.validationResults 
    }
  } catch (error: any) {
    logger.error("Error validating address with Shippo:", error)
    
    // Don't block checkout on validation errors
    return { valid: true }
  }
}

export const trackShipment = async (
  carrier: string, 
  trackingNumber: string
): Promise<{
  tracking_number: string
  carrier: string
  status: string
  status_details: string
  estimated_delivery: string | null
  tracking_events: Array<{
    date: string
    description: string
    location: string
    status: string
  }>
}> => {
  try {
    // Using any type because the SDK types don't match the actual API responses
    const tracking = await shippo.trackingStatus.get(trackingNumber, carrier) as any;
    
    // Map Shippo statuses to our statuses
    const statusMap: Record<string, string> = {
      'UNKNOWN': 'unknown',
      'PRE_TRANSIT': 'pre_transit',
      'TRANSIT': 'in_transit',
      'DELIVERED': 'delivered',
      'RETURNED': 'returned',
      'FAILURE': 'failed'
    };

    // Format response
    return {
      tracking_number: trackingNumber,
      carrier: carrier,
      status: statusMap[tracking.status as string] || 'unknown',
      status_details: (tracking.status_details as string) || '',
      estimated_delivery: tracking.eta ? new Date(tracking.eta).toISOString() : null,
      tracking_events: (tracking.tracking_history || []).map((event: any) => ({
        date: event.status_date || '',
        description: event.status_description || '',
        location: event.location || '',
        status: statusMap[event.status] || 'unknown'
      }))
    };
  } catch (error: any) {
    logger.error(`Error tracking shipment: ${error.message}`, error);
    throw new AppError('Unable to track shipment', 500);
  }
}

export const generateShippingLabel = async (
  orderId: string,
  rateId: string,
  orderNotes?: string
): Promise<{ 
  trackingNumber: string 
  labelUrl: string 
  carrier: string 
  cost: number 
}> => {
  try {
    // Create the transaction (purchase the label)
    // Using any type because the SDK types don't match the actual API responses
    const transaction = await shippo.transactions.create({
      rate: rateId,
      labelFileType: 'PDF',
      async: false,
      metadata: orderNotes ? `Order notes: ${orderNotes}` : undefined
    }) as any;

    if (transaction.status !== 'SUCCESS') {
      logger.error(`Failed to create shipping label: ${transaction.messages}`);
      throw new AppError('Failed to create shipping label', 500);
    }

    // Update the order with tracking and label information
    const adminClient = getAdminClient();
    const { error: updateError } = await adminClient
      .from("orders")
      .update({
        tracking_number: transaction.tracking_number || '',
        label_url: transaction.label_url || '',
        carrier: transaction.carrier || '',
        shipping_label_created_at: new Date().toISOString(),
        status: 'ready_to_ship',
        updated_at: new Date().toISOString()
      })
      .eq("id", orderId);

    if (updateError) {
      logger.error(`Error updating order with tracking info: ${updateError.message}`);
    }

    return {
      trackingNumber: transaction.tracking_number || '',
      labelUrl: transaction.label_url || '',
      carrier: transaction.carrier || 'unknown',
      cost: parseFloat(transaction.amount || '0') || 0
    };
  } catch (error: any) {
    logger.error(`Error generating shipping label: ${error.message}`, error);
    throw new AppError('Failed to generate shipping label', 500);
  }
}


function calculateParcelDetails(items: ShippingItem[]) {
  let totalWeight = 0
  let totalVolume = 0
  let maxLength = 0
  let maxWidth = 0
  let maxHeight = 0

  for (const item of items) {
    totalWeight += item.weight * item.quantity
    
    // For multiple items, we'll use box packing logic
    // For now, use the max dimensions as a simple approach
    maxLength = Math.max(maxLength, item.dimensions.length)
    maxWidth = Math.max(maxWidth, item.dimensions.width)
    maxHeight = Math.max(maxHeight, item.dimensions.height)
    
    // Calculate volume for better box sizing
    totalVolume += (item.dimensions.length * item.dimensions.width * item.dimensions.height) * item.quantity
  }

  // If multiple items, estimate a box size
  if (items.length > 1 || items[0]?.quantity > 1) {
    // Simple box packing: assume we can pack efficiently
    const estimatedBoxVolume = totalVolume * 1.2 // 20% packing inefficiency
    const cubeRoot = Math.cbrt(estimatedBoxVolume)
    
    return {
      length: Math.max(maxLength, Math.ceil(cubeRoot)),
      width: Math.max(maxWidth, Math.ceil(cubeRoot * 0.8)),
      height: Math.max(maxHeight, Math.ceil(cubeRoot * 0.6)),
      weight: totalWeight
    }
  }

  return {
    length: maxLength,
    width: maxWidth,
    height: maxHeight,
    weight: totalWeight
  }
}

// Format service names to be user-friendly
function formatServiceName(rate: any, isFree: boolean): string {
  const provider = rate.provider.toUpperCase()
  const service = rate.servicelevel.name
  
  // Add "Free" prefix if applicable
  const prefix = isFree ? 'FREE - ' : ''
  
  // Clean up common service names
  const cleanedService = service
    .replace(/USPS/, '')
    .replace(/FedEx/, '')
    .replace(/UPS/, '')
    .trim()
  
  return `${prefix}${provider} ${cleanedService}`
}

export const getAvailableCarriers = async (
  fromCountry: string = 'US',
  toCountry: string = 'US'
): Promise<string[]> => {
  try {
    // This is a simplified version - Shippo will return available carriers
    // based on the route when you create a shipment
    const carriers = ['usps', 'ups', 'fedex']
    
    if (fromCountry !== toCountry) {
      carriers.push('dhl_express')
    }
    
    return carriers
  } catch (error) {
    logger.error("Error getting available carriers:", error)
    return ['usps'] // Default to USPS
  }
}