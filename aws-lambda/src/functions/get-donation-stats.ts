import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { getSupabaseService } from '../utils/supabase';

/**
 * Get donation statistics Lambda function
 * Provides various donation analytics and reporting
 */
export const handler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  console.log('Processing donation stats request:', {
    requestId: context.awsRequestId,
    queryParams: event.queryStringParameters
  });

  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
    'Access-Control-Allow-Methods': 'GET,OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  try {
    // Validate request method
    if (event.httpMethod !== 'GET') {
      return {
        statusCode: 405,
        headers,
        body: JSON.stringify({ error: 'Method not allowed' })
      };
    }

    // Parse query parameters
    const queryParams = event.queryStringParameters || {};
    const {
      start_date,
      end_date,
      store_id,
      status,
      group_by = 'day', // day, week, month, year
      include_details = 'false',
      stats_type = 'overview' // overview, detailed, trends, stores
    } = queryParams;

    // Validate date parameters
    let startDate: Date;
    let endDate: Date;

    if (start_date) {
      startDate = new Date(start_date);
      if (isNaN(startDate.getTime())) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Invalid start_date format. Use YYYY-MM-DD' })
        };
      }
    } else {
      // Default to last 30 days
      startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
    }

    if (end_date) {
      endDate = new Date(end_date);
      if (isNaN(endDate.getTime())) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Invalid end_date format. Use YYYY-MM-DD' })
        };
      }
    } else {
      endDate = new Date();
    }

    // Ensure start_date is before end_date
    if (startDate >= endDate) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'start_date must be before end_date' })
      };
    }

    // Initialize Supabase service
    const supabaseService = await getSupabaseService();
    const client = supabaseService.publicClient;

    let statsData: any = {};

    switch (stats_type) {
      case 'overview':
        statsData = await getOverviewStats(client, startDate, endDate, store_id, status);
        break;
      case 'detailed':
        statsData = await getDetailedStats(client, startDate, endDate, store_id, status, group_by);
        break;
      case 'trends':
        statsData = await getTrendStats(client, startDate, endDate, store_id, group_by);
        break;
      case 'stores':
        statsData = await getStoreStats(client, startDate, endDate, status);
        break;
      default:
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Invalid stats_type. Use: overview, detailed, trends, stores' })
        };
    }

    // Include additional details if requested
    if (include_details === 'true') {
      statsData.request_info = {
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        store_id: store_id || 'all',
        status: status || 'all',
        group_by,
        stats_type,
        generated_at: new Date().toISOString()
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: statsData
      })
    };

  } catch (error) {
    console.error('Error getting donation stats:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: 'Failed to retrieve donation statistics',
        requestId: context.awsRequestId
      })
    };
  }
};

/**
 * Get overview statistics
 */
async function getOverviewStats(client: any, startDate: Date, endDate: Date, storeId?: string, status?: string) {
  const baseQuery = client
    .from('donations')
    .select('amount, status, created_at, store_id')
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString());

  if (storeId) {
    baseQuery.eq('store_id', storeId);
  }

  if (status) {
    baseQuery.eq('status', status);
  }

  const { data: donations, error } = await baseQuery;

  if (error) {
    throw new Error(`Failed to fetch donations: ${error.message}`);
  }

  // Calculate overview statistics
  const totalDonations = donations.length;
  const totalAmount = donations.reduce((sum: number, d: any) => sum + (d.amount || 0), 0);
  const averageAmount = totalDonations > 0 ? totalAmount / totalDonations : 0;

  // Status breakdown
  const statusBreakdown = donations.reduce((acc: any, d: any) => {
    acc[d.status] = (acc[d.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Amount by status
  const amountByStatus = donations.reduce((acc: any, d: any) => {
    acc[d.status] = (acc[d.status] || 0) + (d.amount || 0);
    return acc;
  }, {} as Record<string, number>);

  // Get unique stores count
  const uniqueStores = new Set(donations.map((d: any) => d.store_id)).size;

  return {
    summary: {
      total_donations: totalDonations,
      total_amount: Math.round(totalAmount * 100) / 100,
      average_amount: Math.round(averageAmount * 100) / 100,
      unique_stores: uniqueStores
    },
    status_breakdown: {
      counts: statusBreakdown,
      amounts: Object.fromEntries(
        Object.entries(amountByStatus).map(([status, amount]) => [
          status,
          Math.round((amount as number) * 100) / 100
        ])
      )
    }
  };
}

/**
 * Get detailed statistics with grouping
 */
async function getDetailedStats(client: any, startDate: Date, endDate: Date, storeId?: string, status?: string, groupBy: string = 'day') {
  const baseQuery = client
    .from('donations')
    .select('amount, status, created_at, store_id')
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString())
    .order('created_at', { ascending: true });

  if (storeId) {
    baseQuery.eq('store_id', storeId);
  }

  if (status) {
    baseQuery.eq('status', status);
  }

  const { data: donations, error } = await baseQuery;

  if (error) {
    throw new Error(`Failed to fetch donations: ${error.message}`);
  }

  // Group donations by specified period
  const groupedData = groupDonationsByPeriod(donations, groupBy);

  return {
    grouped_data: groupedData,
    total_periods: Object.keys(groupedData).length,
    group_by: groupBy
  };
}

/**
 * Get trend statistics
 */
async function getTrendStats(client: any, startDate: Date, endDate: Date, storeId?: string, groupBy: string = 'day') {
  const baseQuery = client
    .from('donations')
    .select('amount, status, created_at, store_id')
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString())
    .order('created_at', { ascending: true });

  if (storeId) {
    baseQuery.eq('store_id', storeId);
  }

  const { data: donations, error } = await baseQuery;

  if (error) {
    throw new Error(`Failed to fetch donations: ${error.message}`);
  }

  // Group donations by period
  const groupedData = groupDonationsByPeriod(donations, groupBy);
  
  // Calculate trends
  const periods = Object.keys(groupedData).sort();
  const trends = [];

  for (let i = 0; i < periods.length; i++) {
    const period = periods[i];
    const data = groupedData[period];
    
    let previousPeriodData = null;
    if (i > 0) {
      previousPeriodData = groupedData[periods[i - 1]];
    }

    const trend = {
      period,
      count: data.count,
      amount: data.amount,
      average: data.average,
      growth: {
        count_change: previousPeriodData ? data.count - previousPeriodData.count : 0,
        amount_change: previousPeriodData ? data.amount - previousPeriodData.amount : 0,
        count_percentage: previousPeriodData && previousPeriodData.count > 0 
          ? Math.round(((data.count - previousPeriodData.count) / previousPeriodData.count) * 100 * 100) / 100
          : 0,
        amount_percentage: previousPeriodData && previousPeriodData.amount > 0
          ? Math.round(((data.amount - previousPeriodData.amount) / previousPeriodData.amount) * 100 * 100) / 100
          : 0
      }
    };

    trends.push(trend);
  }

  return {
    trends,
    summary: {
      total_periods: periods.length,
      overall_growth: trends.length > 1 ? {
        count_change: trends[trends.length - 1].count - trends[0].count,
        amount_change: trends[trends.length - 1].amount - trends[0].amount
      } : null
    }
  };
}

/**
 * Get store-specific statistics
 */
async function getStoreStats(client: any, startDate: Date, endDate: Date, status?: string) {
  // Get store information
  const { data: stores, error: storesError } = await client
    .from('stores')
    .select('id, name, location, is_active');

  if (storesError) {
    throw new Error(`Failed to fetch stores: ${storesError.message}`);
  }

  // Get donations with store information
  const donationsQuery = client
    .from('donations')
    .select('amount, status, created_at, store_id')
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString());

  if (status) {
    donationsQuery.eq('status', status);
  }

  const { data: donations, error: donationsError } = await donationsQuery;

  if (donationsError) {
    throw new Error(`Failed to fetch donations: ${donationsError.message}`);
  }

  // Group donations by store
  const storeStats = stores.map((store: any) => {
    const storeDonations = donations.filter((d: any) => d.store_id === store.id);
    const totalAmount = storeDonations.reduce((sum: number, d: any) => sum + (d.amount || 0), 0);
    const averageAmount = storeDonations.length > 0 ? totalAmount / storeDonations.length : 0;

    // Status breakdown for this store
    const statusBreakdown = storeDonations.reduce((acc: any, d: any) => {
      acc[d.status] = (acc[d.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      store: {
        id: store.id,
        name: store.name,
        location: store.location,
        is_active: store.is_active
      },
      stats: {
        total_donations: storeDonations.length,
        total_amount: Math.round(totalAmount * 100) / 100,
        average_amount: Math.round(averageAmount * 100) / 100,
        status_breakdown: statusBreakdown
      }
    };
  });

  // Sort by total amount descending
  storeStats.sort((a: any, b: any) => b.stats.total_amount - a.stats.total_amount);

  return {
    store_stats: storeStats,
    summary: {
      total_stores: stores.length,
      active_stores: stores.filter((s: any) => s.is_active).length,
      stores_with_donations: storeStats.filter((s: any) => s.stats.total_donations > 0).length
    }
  };
}

/**
 * Group donations by time period
 */
function groupDonationsByPeriod(donations: any[], groupBy: string) {
  const grouped: Record<string, { count: number; amount: number; average: number; donations: any[] }> = {};

  donations.forEach(donation => {
    const date = new Date(donation.created_at);
    let periodKey: string;

    switch (groupBy) {
      case 'hour':
        periodKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:00`;
        break;
      case 'day':
        periodKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        break;
      case 'week':
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        periodKey = `${weekStart.getFullYear()}-W${String(Math.ceil((weekStart.getDate()) / 7)).padStart(2, '0')}`;
        break;
      case 'month':
        periodKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        break;
      case 'year':
        periodKey = `${date.getFullYear()}`;
        break;
      default:
        periodKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    }

    if (!grouped[periodKey]) {
      grouped[periodKey] = {
        count: 0,
        amount: 0,
        average: 0,
        donations: []
      };
    }

    grouped[periodKey].count++;
    grouped[periodKey].amount += donation.amount || 0;
    grouped[periodKey].donations.push(donation);
  });

  // Calculate averages and round amounts
  Object.keys(grouped).forEach(key => {
    const group = grouped[key];
    group.average = group.count > 0 ? group.amount / group.count : 0;
    group.amount = Math.round(group.amount * 100) / 100;
    group.average = Math.round(group.average * 100) / 100;
  });

  return grouped;
}

/**
 * Get real-time dashboard stats
 */
export const getDashboardStats = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
    'Access-Control-Allow-Methods': 'GET,OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const supabaseService = await getSupabaseService();
    const client = supabaseService.publicClient;

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisWeek = new Date(today);
    thisWeek.setDate(today.getDate() - today.getDay());
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisYear = new Date(now.getFullYear(), 0, 1);

    // Get various time period stats in parallel
    const [todayStats, weekStats, monthStats, yearStats, recentDonations] = await Promise.all([
      getOverviewStats(client, today, now),
      getOverviewStats(client, thisWeek, now),
      getOverviewStats(client, thisMonth, now),
      getOverviewStats(client, thisYear, now),
      getRecentDonations(client, 10)
    ]);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: {
          today: todayStats.summary,
          this_week: weekStats.summary,
          this_month: monthStats.summary,
          this_year: yearStats.summary,
          recent_donations: recentDonations,
          last_updated: now.toISOString()
        }
      })
    };

  } catch (error) {
    console.error('Error getting dashboard stats:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: 'Failed to retrieve dashboard statistics',
        requestId: context.awsRequestId
      })
    };
  }
};

/**
 * Get recent donations for dashboard
 */
async function getRecentDonations(client: any, limit: number = 10) {
  const { data: donations, error } = await client
    .from('donations')
    .select(`
      id,
      amount,
      status,
      created_at,
      donor_name,
      stores!inner(name, location)
    `)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to fetch recent donations: ${error.message}`);
  }

  return donations.map((d: any) => ({
    id: d.id,
    amount: d.amount,
    status: d.status,
    created_at: d.created_at,
    donor_name: d.donor_name,
    store_name: d.stores?.name,
    store_location: d.stores?.location
  }));
}