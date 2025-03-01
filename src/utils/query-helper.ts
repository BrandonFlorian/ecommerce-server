import { SupabaseClient } from "@supabase/supabase-js";
import { logger } from "./logger";
import { AppError } from "./appError";

/**
 * Type for pagination parameters
 */
export interface PaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

/**
 * Type for pagination response
 */
export interface PaginationResponse<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

/**
 * Get paginated data with count from Supabase
 *
 * @param client Supabase client instance
 * @param table Table name
 * @param options Pagination options
 * @param select Select query (can include joins)
 * @param applyFilters Function to apply filters to both count and data queries
 * @returns Paginated data with count
 */
export async function getPaginatedData<T = any>({
  client,
  table,
  options = {},
  select = "*",
  applyFilters = (query) => query,
}: {
  client: SupabaseClient;
  table: string;
  options?: PaginationOptions;
  select?: string;
  applyFilters?: (query: any) => any;
}): Promise<PaginationResponse<T>> {
  try {
    const {
      page = 1,
      limit = 20,
      sortBy = "created_at",
      sortOrder = "desc",
    } = options;

    // Calculate offset for pagination
    const offset = (page - 1) * limit;

    // Get total count with same filters
    const countQuery = applyFilters(
      client.from(table).select("*", { count: "exact", head: true })
    );

    const { count, error: countError } = await countQuery;

    if (countError) {
      logger.error(`Error counting ${table}:`, countError);
      throw new AppError(`Failed to get ${table} count`, 500);
    }

    // Get data with same filters plus pagination
    let dataQuery = applyFilters(client.from(table).select(select));

    // Apply sorting and pagination
    dataQuery = dataQuery
      .order(sortBy, { ascending: sortOrder === "asc" })
      .range(offset, offset + limit - 1);

    const { data, error } = await dataQuery;

    if (error) {
      logger.error(`Error getting ${table}:`, error);
      throw new AppError(`Failed to get ${table}`, 500);
    }

    return {
      data: data || [],
      pagination: {
        total: count || 0,
        page,
        limit,
        pages: Math.ceil((count || 0) / limit),
      },
    };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    logger.error(`Unexpected error in getPaginatedData for ${table}:`, error);
    throw new AppError(`Failed to get ${table}`, 500);
  }
}

/**
 * Create filter conditions for a query based on an object of filters
 *
 * @param filters Object with field-value pairs for filtering
 * @returns Function that applies filters to a query
 */
export function createFilters(filters: Record<string, any> = {}) {
  return (query: any) => {
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        query = query.eq(key, value);
      }
    });
    return query;
  };
}

/**
 * Apply a filter only if condition is true
 *
 * @param query Supabase query
 * @param condition Boolean condition
 * @param filterFn Function to apply filter
 * @returns Modified query
 */
export function applyFilterIf<T>(
  query: T,
  condition: boolean,
  filterFn: (q: T) => T
): T {
  return condition ? filterFn(query) : query;
}
