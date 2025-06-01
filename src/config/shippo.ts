import * as shippoLib from "shippo";

// Initialize client with API key using the Shippo constructor
export const shippo = new shippoLib.Shippo({ apiKeyHeader: process.env.SHIPPO_API_KEY! });

export const FROM_ADDRESS = {
    name: process.env.COMPANY_NAME || 'Your Company',
    street1: process.env.WAREHOUSE_ADDRESS1 || '123 Main St',
    street2: process.env.WAREHOUSE_ADDRESS2 || '',
    city: process.env.WAREHOUSE_CITY || 'San Francisco',
    state: process.env.WAREHOUSE_STATE || 'CA',
    zip: process.env.WAREHOUSE_ZIP || '94105',
    country: process.env.WAREHOUSE_COUNTRY || 'US',
    phone: process.env.WAREHOUSE_PHONE || '+1 555 123 4567',
    email: process.env.WAREHOUSE_EMAIL || 'shipping@example.com'
  }
  
  // Free shipping configuration
export const FREE_SHIPPING_CONFIG = {
    domestic: {
      threshold: 75.00, // $75 USD
      methods: ['usps_priority', 'usps_ground_advantage'] // Which methods qualify
    },
    international: {
      threshold: 150.00, // $150 USD
      methods: ['usps_priority_mail_international']
    }
  }