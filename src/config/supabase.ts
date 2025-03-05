import { createClient } from "@supabase/supabase-js";

import { logger } from "../utils/logger";
import { Database } from "@/types/database.types";

// Ensure required environment variables are set
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
  logger.error("Missing Supabase environment variables");
  process.exit(1);
}

// Create a Supabase client with the anonymous key for client-side operations
export const supabaseClient = createClient<Database>(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Create a Supabase admin client with service role key for admin operations
// This should only be used server-side for operations requiring admin privileges
export const supabaseAdmin = process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient<Database>(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )
  : null;

// Function to get admin client or throw if not available
export function getAdminClient() {
  if (!supabaseAdmin) {
    throw new Error(
      "Supabase admin client not available. Missing SUPABASE_SERVICE_ROLE_KEY."
    );
  }
  return supabaseAdmin;
}

// Export a function that creates a client with user's JWT for RLS policies
export const createUserClient = (jwt: string) => {
  return createClient<Database>(
    process.env.SUPABASE_URL as string,
    process.env.SUPABASE_ANON_KEY as string,
    {
      global: {
        headers: {
          Authorization: `Bearer ${jwt}`,
        },
      },
    }
  );
};
