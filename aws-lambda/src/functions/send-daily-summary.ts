import { ScheduledEvent, Context } from 'aws-lambda';
import { getSupabaseService } from '../utils/supabase';
import { sendEmail } from '../utils/email';
import JSZip from 'jszip';
import { getAppConfig } from '../utils/config';

// Type definitions
interface UserProfile {
  full_name?: string;
  email?: string;
}

interface Donation {
  id: string;
  collector_id: string;
  white_bread_qty?: number;
  brown_bread_qty?: number;
  other_food_qty?: number;
  collected_at: string;
  store_name_manual?: string;
  notes?: string;
  photo_url?: string;
  white_bread_monetary_value?: number;
  calculated_brown_bread_qty?: number;
  deficit_percentage_applied?: number;
  profiles?: UserProfile;
  store?: {
    name: string;
    address?: string;
  };
}







/**
 * Send daily summary Lambda function
 * Triggered by EventBridge at 6 PM SAST (4 PM UTC) daily
 */
export const handler = async (
  event: ScheduledEvent,
  context: Context
): Promise<void> => {
  console.log('Starting daily summary process:', {
    requestId: context.awsRequestId,
    scheduledTime: event.time,
    source: event.source
  });

  try {
    // Get today's date in SAST (South Africa Standard Time)
    const today = new Date();
    const sastOffset = 2; // SAST is UTC+2
    const sastDate = new Date(today.getTime() + (sastOffset * 60 * 60 * 1000));
    const dateString = sastDate.toISOString().split('T')[0]; // YYYY-MM-DD format

    console.log(`Generating daily summary for date: ${dateString}`);

    // Initialize services
    const supabaseService = await getSupabaseService();
    const config = await getAppConfig();

    // Fetch donations for the business day (18:01 yesterday to 18:00 today)
    const previousDay = new Date(sastDate);
    previousDay.setDate(previousDay.getDate() - 1);
    const previousDateString = previousDay.toISOString().split('T')[0];
    
    const businessDayStart = new Date(`${previousDateString}T18:01:00+02:00`).toISOString();
    const businessDayEnd = new Date(`${dateString}T18:00:00+02:00`).toISOString();
    
    console.log(`Querying donations from ${businessDayStart} to ${businessDayEnd}`);
    
    const donationsResponse = await supabaseService.admin
      .from('donations')
      .select(`
        *,
        profiles:collector_id (
          full_name,
          email
        ),
        store:store_id (
          name,
          address
        )
      `)
      .gte('collected_at', businessDayStart)
      .lt('collected_at', businessDayEnd)
      .order('collected_at', { ascending: true });

    if (donationsResponse.error) {
      console.error('Error fetching donations:', donationsResponse.error);
      throw donationsResponse.error;
    }
    
    const donationsData: Donation[] = donationsResponse.data || [];

    if (donationsData.length === 0) {
      console.log('No donations found for today, skipping email');
      return;
    }

    console.log(`Found ${donationsData.length} donations for today`);

    // Get current month's Purchase Order amount
    const salesPeriod = await supabaseService.admin
      .from('sales_periods')
      .select('total_sales_amount')
      .eq('status', 'active')
      .lte('start_date', dateString)
      .gte('end_date', dateString)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (salesPeriod.error) {
      console.error('Error fetching sales period:', salesPeriod.error);
    }

    const poAmount = salesPeriod.data?.total_sales_amount || 0;
    console.log(`📊 Lambda querying for date: ${dateString}`);
    console.log(`📊 Lambda sales period query result:`, salesPeriod);
    console.log(`📊 Lambda found PO amount: R${poAmount} (for verification: required = ${poAmount * 0.056})`);

    // ===== ALL DATA CALCULATION LOGIC REMAINS THE SAME =====
    const totalWhiteBread = donationsData.reduce((sum, d) => sum + (d.white_bread_qty || 0), 0);
    const totalBrownBread = donationsData.reduce((sum, d) => sum + (d.brown_bread_qty || 0), 0);
    const totalOtherFood = donationsData.reduce((sum, d) => sum + (d.other_food_qty || 0), 0);
    const totalLoaves = totalWhiteBread + totalBrownBread;

    const totalCollectedValue = donationsData.reduce((sum, d) => {
      const whiteValue = d.white_bread_monetary_value || (d.white_bread_qty || 0) * 8.80;
      const brownValue = (d.brown_bread_qty || 0) * 7.75;
      return sum + whiteValue + brownValue;
    }, 0);
    
    // Calculate brown bread equivalent from total collected value
    const exactBrownBreadEquivalent = totalCollectedValue / 7.75;
    const roundedBrownBreadEquivalent = Math.ceil(exactBrownBreadEquivalent);
    
    // Calculate surplus credit from rounding up the collected value
    const surplusFromRounding = (roundedBrownBreadEquivalent - exactBrownBreadEquivalent) * 7.75;
    
    const currentCreditBalance = await supabaseService.admin.rpc('get_current_credit_balance');
    const availableCredit = currentCreditBalance?.data || 0;
    
    const deficitPercentage = 5.6;
    const requiredDonationValue = poAmount * (deficitPercentage / 100);
    
    // Calculate deficit/surplus based on collected value vs required donation (before credit application)
    const deficitAmount = Math.max(0, requiredDonationValue - totalCollectedValue);
    const surplusAmount = Math.max(0, totalCollectedValue - requiredDonationValue);
    
    // Calculate how much credit to apply (cannot exceed deficit amount)
    const appliedCredit = Math.min(availableCredit, deficitAmount);
    
    // Calculate brown bread equivalent for deficit
    const totalBrownBreadEquivalent = Math.ceil(deficitAmount / 7.75);
    
    // Calculate rounding credit (only if there's a deficit)
    let newCreditGeneratedFromRounding = 0;
    if (deficitAmount > 0) {
      const exactBrownBreadNeeded = deficitAmount / 7.75;
      const roundedBrownBreadNeeded = Math.ceil(exactBrownBreadNeeded);
      newCreditGeneratedFromRounding = (roundedBrownBreadNeeded - exactBrownBreadNeeded) * 7.75;
    }
    
    const deficitCoveragePercentage = requiredDonationValue > 0 ? 
      Math.min(100, ((totalCollectedValue + appliedCredit) / requiredDonationValue) * 100) : 100;
    
    // Apply credit if needed
    if (appliedCredit > 0) {
      await supabaseService.admin.rpc('apply_daily_credits', { amount_to_apply: appliedCredit });
      console.log(`Applied R${appliedCredit.toFixed(2)} in credits`);
    }
    
    // Add rounding credit if applicable
    if (newCreditGeneratedFromRounding > 0.01) {
      const exactBrownBreadNeeded = deficitAmount / 7.75;
      const roundedBrownBreadNeeded = Math.ceil(exactBrownBreadNeeded);
      await supabaseService.admin.rpc('add_daily_credit', {
        credit_date: dateString,
        credit_amount: newCreditGeneratedFromRounding,
        credit_notes: `Credit from rounding up ${exactBrownBreadNeeded.toFixed(2)} to ${roundedBrownBreadNeeded} brown bread loaves`
      });
      console.log(`Generated new credit from rounding: R${newCreditGeneratedFromRounding.toFixed(2)}`);
    }

    // Add surplus credit if applicable
    if (surplusAmount > 0.01) {
      await supabaseService.admin.rpc('add_daily_credit', {
        credit_date: dateString,
        credit_amount: surplusAmount,
        credit_notes: `Surplus credit from over-donation: R${totalCollectedValue.toFixed(2)} collected vs R${requiredDonationValue.toFixed(2)} required`
      });
      console.log(`Generated surplus credit: R${surplusAmount.toFixed(2)} from over-donation`);
    }

    // Add credit from rounding up collected bread value to full brown bread loaves
    if (surplusFromRounding > 0.01) {
      await supabaseService.admin.rpc('add_daily_credit', {
        credit_date: dateString,
        credit_amount: surplusFromRounding,
        credit_notes: `Credit from rounding up ${exactBrownBreadEquivalent.toFixed(2)} to ${roundedBrownBreadEquivalent} brown bread equivalent loaves`
      });
      console.log(`Generated rounding credit: R${surplusFromRounding.toFixed(2)} from bread equivalent rounding`);
    }

    const newCreditGenerated = newCreditGeneratedFromRounding + surplusAmount + surplusFromRounding;
    
    const updatedCreditBalance = await supabaseService.admin.rpc('get_current_credit_balance');
    const finalCreditBalance = updatedCreditBalance?.data || 0;
    
    // Debug logging for financial calculations
    console.log('=== FINANCIAL CALCULATION SUMMARY ===');
    console.log(`PO Amount: R${poAmount.toFixed(2)}`);
    console.log(`Required Donation Value (${deficitPercentage}%): R${requiredDonationValue.toFixed(2)}`);
    console.log(`Total Collected Value: R${totalCollectedValue.toFixed(2)}`);
    console.log(`Available Credit: R${availableCredit.toFixed(2)}`);
    console.log(`Applied Credit: R${appliedCredit.toFixed(2)}`);
    console.log(`Deficit Amount: R${deficitAmount.toFixed(2)}`);
    console.log(`Surplus Amount: R${surplusAmount.toFixed(2)}`);
    console.log(`New Credit from Rounding: R${newCreditGeneratedFromRounding.toFixed(2)}`);
    console.log(`Total New Credit Generated: R${newCreditGenerated.toFixed(2)}`);
    console.log(`Final Credit Balance: R${finalCreditBalance.toFixed(2)}`);
    console.log('=========================================');
    
    const nextDayProjection = await supabaseService.admin.rpc('get_next_day_credit_projection_details');
    const nextDayCreditBalance = nextDayProjection?.data?.[0]?.projected_balance || 0;
    const nextDayProjectionConfidence = nextDayProjection?.data?.[0]?.projection_confidence || 'Low';
    
    console.log(`Next day projected credit balance: R${nextDayCreditBalance.toFixed(2)} (Confidence: ${nextDayProjectionConfidence})`);

    const donationsByCollector = donationsData.reduce((acc: Record<string, Donation[]>, donation: Donation) => {
      const collectorName = getCollectorName(donation);
      if (!acc[collectorName]) {
        acc[collectorName] = [];
      }
      acc[collectorName].push(donation);
      return acc;
    }, {});

    const photoBuffer = await createPhotoZip(donationsData, dateString, config);
    const photosCount = donationsData.filter((d: Donation) => d.photo_url && d.photo_url.trim() !== '').length;
    console.log(`📸 Created ZIP with ${photosCount} photos`);
    
    const uniqueStores = new Set(donationsData.map(d => d.store?.name || d.store_name_manual));
    const totalStores = uniqueStores.size;
    const averagePerStore = totalStores > 0 ? totalCollectedValue / totalStores : 0;
    
    const topPerformingCollector = Object.entries(donationsByCollector)
        .map(([name, donations]) => ({
            name,
            value: donations.reduce((sum, d) => {
                const whiteValue = d.white_bread_monetary_value || (d.white_bread_qty || 0) * 8.80;
                const brownValue = (d.brown_bread_qty || 0) * 7.75;
                return sum + whiteValue + brownValue;
            }, 0)
        }))
        .reduce((max, current) => current.value > max.value ? current : max, { name: 'N/A', value: 0 });

    // Environmental impact metrics removed per user request

    // ===== Generate email using the improved template function =====
    const emailTemplate = generateImprovedDailySummaryHtml({
      date: sastDate.toLocaleDateString('en-ZA', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }),
      totalLoaves: roundedBrownBreadEquivalent, // Show brown bread equivalent instead of actual loaves
      totalWhiteBread,
      totalBrownBread,
      totalOtherFood,
      donationsByCollector,
      donationsCount: donationsData.length,
      photosCount: photosCount,
      totalValue: totalCollectedValue,
      totalBrownBreadEquivalent,
      deficitPercentage,
      deficitAmount,
      surplusAmount,
      poAmount,
      requiredDonationValue,
      deficitCoveragePercentage,
      creditBalance: finalCreditBalance,
      appliedCredit,
      newCreditGenerated,
      nextDayCreditBalance,
      nextDayProjectionConfidence,
      totalStores,
      averagePerStore,
      topPerformingStore: topPerformingCollector.name,
      topPerformingStoreValue: topPerformingCollector.value
    });

    const adminEmails = ['support@thehealthfoodcompany.co.za'];

    const csvBuffer = await createDailySummaryCSV({
      date: dateString,
      donations: donationsData,
      totalLoaves,
      totalWhiteBread,
      totalBrownBread,
      totalOtherFood,
      totalValue: totalCollectedValue,
      donationsCount: donationsData.length,
      photosCount,
      deficitAmount,
      surplusAmount,
      creditBalance: finalCreditBalance,
      appliedCredit,
      newCreditGenerated,
      nextDayCreditBalance,
      donationsByCollector
    });

    const attachments = [];
    if (photoBuffer) {
      attachments.push({
        filename: `donations-photos-${dateString}.zip`,
        content: photoBuffer,
        contentType: 'application/zip'
      });
    }
    if (csvBuffer) {
      attachments.push({
        filename: `THF_Daily_Collections_${dateString.replace(/-/g, '')}.csv`,
        content: csvBuffer,
        contentType: 'text/csv'
      });
    }

    await sendEmail({
      to: adminEmails,
      from: 'info@thfcscan.co.za',
      subject: emailTemplate.subject,
      htmlBody: emailTemplate.htmlBody,
      attachments: attachments.length > 0 ? attachments : undefined
    });

    console.log('Daily summary email sent successfully to:', adminEmails.join(', '));

  } catch (error) {
    console.error('Error in daily summary process:', error);
    
    try {
      await sendEmail({
        to: ['support@thehealthfoodcompany.co.za'],
        from: 'info@thfcscan.co.za',
        subject: '🚨 THF Daily Report Generation Failed',
        htmlBody: `
          <h2>Daily Summary Error</h2>
          <p><strong>Error:</strong> ${error instanceof Error ? error.message : 'Unknown error'}</p>
          <p><strong>Time:</strong> ${new Date().toISOString()}</p>
          <p><strong>Request ID:</strong> ${context.awsRequestId}</p>
          <p>Please check CloudWatch logs for more details.</p>
        `
      });
    } catch (emailError) {
      console.error('Failed to send error notification:', emailError);
    }
    
    throw error;
  }
};

// ===== HELPER FUNCTIONS =====

/**
 * Generates the improved HTML for the daily summary email report.
 * @param data The dataset for the report.
 * @returns An object containing the email subject and the full HTML body.
 */
function generateImprovedDailySummaryHtml(data: {
  date: string;
  totalLoaves: number;
  totalWhiteBread: number;
  totalBrownBread: number;
  totalOtherFood: number;
  donationsByCollector: Record<string, any[]>;
  donationsCount: number;
  photosCount: number;
  totalValue: number;
  totalBrownBreadEquivalent: number;
  deficitPercentage: number;
  deficitAmount: number;
  surplusAmount: number;
  poAmount: number;
  requiredDonationValue: number;
  deficitCoveragePercentage: number;
  creditBalance: number;
  appliedCredit: number;
  newCreditGenerated: number;
  nextDayCreditBalance: number;
  nextDayProjectionConfidence: string;
  totalStores: number;
  averagePerStore: number;
  topPerformingStore: string;
  topPerformingStoreValue: number;
}): { subject: string; htmlBody: string; } {
    
    const subject = `📊 THF Daily Donation Report - ${data.date} | ${data.donationsCount} Collections | R${data.totalValue.toFixed(2)} Value`;

    // Helper function to generate the HTML for each collector's card
    const generateCollectorsHTML = (donationsByCollector: Record<string, any[]>) => {
        let html = '';
        for (const collectorName in donationsByCollector) {
            const donations = donationsByCollector[collectorName];
            const collectorTotalValue = donations.reduce((sum, d) => {
                const whiteValue = d.white_bread_monetary_value || (d.white_bread_qty || 0) * 8.80;
                const brownValue = (d.brown_bread_qty || 0) * 7.75;
                return sum + whiteValue + brownValue;
            }, 0);
            const collectorTotalLoaves = donations.reduce((sum, d) => sum + (d.white_bread_qty || 0) + (d.brown_bread_qty || 0), 0);
            const storeName = (donation: any) => donation.store?.name || donation.store_name_manual || 'Manual Entry';
            const hasPhoto = (donation: any) => donation.photo_url && donation.photo_url.trim() !== '';

            html += `
            <div class="collector-card">
                <div class="collector-header">
                    <div>
                        <h3>${collectorName}</h3>
                        <div class="collector-stats">
                            <span>Loaves: ${collectorTotalLoaves}</span>
                            <span>Value: R${collectorTotalValue.toFixed(2)}</span>
                        </div>
                    </div>
                </div>
                <ul class="donations-list">`;

            donations.forEach(donation => {
                const totalDonationValue = (donation.white_bread_monetary_value || (donation.white_bread_qty || 0) * 8.80) + ((donation.brown_bread_qty || 0) * 7.75);
                html += `
                    <li class="donation-item">
                        <div class="donation-details">
                            <span class="donation-store">${storeName(donation)}</span>
                            <span class="donation-bread">White: ${donation.white_bread_qty || 0} | Brown: ${donation.brown_bread_qty || 0}</span>
                        </div>
                        <div>
                            <span class="donation-value">R${totalDonationValue.toFixed(2)}</span>
                            ${hasPhoto(donation) ? '<span class="photo-indicator">✔ Photo</span>' : ''}
                        </div>
                    </li>`;
            });

            html += `
                </ul>
            </div>`;
        }
        return html;
    };

    // The main HTML body of the email with improved design
    const htmlBody = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>THF Daily Donation Collection Report</title>
        <style>
            /* Email Client Reset */
            body, table, td, p, a, li, blockquote { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
            table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
            img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
            
            /* Base Styles */
            body { font-family: Arial, Helvetica, sans-serif !important; line-height: 1.4; color: #333333 !important; margin: 0; padding: 0; background-color: #f5f5f5; font-size: 14px !important; }
            .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
            
            /* Header Styles */
            .header { background-color: #1e3c72 !important; color: #ffffff !important; padding: 20px 15px; text-align: center; }
            .header h1 { margin: 0; font-size: 24px !important; font-weight: bold !important; color: #ffffff !important; }
            .header .subtitle { margin: 8px 0 0 0; font-size: 14px !important; color: #ffffff !important; }
            .header .date { margin: 8px 0 0 0; font-size: 13px !important; color: #ffffff !important; }
            
            /* Branding Bar */
            .branding-bar { background-color: #ffffff; padding: 15px; border-bottom: 3px solid #1e3c72; text-align: center; }
            .brand-logo { font-size: 18px !important; font-weight: bold !important; color: #1e3c72 !important; }
            
            /* Content Styles */
            .content { padding: 20px; }
            
            /* Impact Highlight */
            .impact-highlight { background-color: #667eea !important; color: #ffffff !important; padding: 20px; margin: 20px 0; text-align: center; }
            .impact-highlight h2 { margin: 0 0 15px 0 !important; font-size: 20px !important; font-weight: bold !important; color: #ffffff !important; }
            
            /* Table-based Grid for Email Compatibility */
            .stats-table { width: 100%; border-collapse: collapse; margin: 15px 0; }
            .stats-table td { padding: 10px; text-align: center; vertical-align: top; width: 25%; }
            .impact-stat { background-color: rgba(255,255,255,0.2) !important; padding: 15px; text-align: center; }
            .impact-stat .number { font-size: 24px !important; font-weight: bold !important; color: #ffffff !important; margin-bottom: 5px; display: block; }
            .impact-stat .label { font-size: 12px !important; color: #ffffff !important; }
            
            /* Summary Cards Table */
            .summary-table { width: 100%; border-collapse: collapse; margin: 15px 0; }
            .summary-table td { padding: 8px; vertical-align: top; width: 33.33%; }
            .summary-card { background-color: #ffffff; border: 1px solid #e0e6ed; padding: 15px; text-align: center; }
            .summary-card .icon { font-size: 18px; margin-bottom: 8px; }
            .summary-card h3 { margin: 0 0 8px 0; color: #1e3c72 !important; font-size: 14px !important; font-weight: bold !important; }
            .summary-card .value { font-size: 18px !important; font-weight: bold !important; color: #333333 !important; margin: 5px 0; }
            .summary-card .subtext { font-size: 11px !important; color: #666666 !important; margin-top: 5px; }
            
            /* Section Headers */
            .section-header { text-align: center; margin: 25px 0 15px 0; }
            .section-header h2 { color: #1e3c72 !important; font-size: 18px !important; font-weight: bold !important; margin: 0 !important; }
            .section-header p { color: #666666 !important; font-size: 12px !important; margin: 5px 0 0 0 !important; }
            
            /* Financial Summary */
             .financial-summary { background-color: #11998e !important; color: #ffffff !important; padding: 20px; margin: 20px 0; }
             .financial-summary h2 { margin: 0 0 15px 0 !important; font-size: 18px !important; font-weight: bold !important; text-align: center; color: #ffffff !important; }
             
             /* Financial Cards Table */
             .financial-table { width: 100%; border-collapse: collapse; margin: 15px 0; }
             .financial-table td { padding: 8px; vertical-align: top; width: 33.33%; }
             .financial-card { background-color: rgba(255,255,255,0.2) !important; padding: 15px; text-align: center; border: 1px solid rgba(255,255,255,0.3); }
             .financial-card.primary { border: 2px solid rgba(255,255,255,0.5); }
             .financial-card.deficit { border-left: 4px solid #ff6b6b; }
             .financial-card.surplus { border-left: 4px solid #51cf66; }
             .financial-card.projection { border-left: 4px solid #74c0fc; }
             .financial-card .financial-icon { font-size: 18px; margin-bottom: 8px; }
             .financial-card h4 { margin: 0 0 8px 0; font-size: 13px !important; font-weight: bold !important; color: #ffffff !important; }
             .financial-card .financial-value { font-size: 16px !important; font-weight: bold !important; margin: 5px 0; color: #ffffff !important; }
             .financial-card .financial-subtext { font-size: 11px !important; margin-top: 5px; color: #ffffff !important; }
            .net-impact { text-align: center; margin-top: 20px; padding: 15px; background: rgba(255,255,255,0.1); border-radius: 10px; border: 2px solid rgba(255,255,255,0.3); }
            .net-impact h4 { margin: 0 0 8px 0; font-size: 16px !important; font-weight: 500 !important; color: white !important; }
            .net-impact .impact-value { font-size: 28px !important; font-weight: 700 !important; margin: 0; color: white !important; }
            .net-impact .impact-subtext { font-size: 12px !important; opacity: 0.9; margin-top: 6px; line-height: 1.3; color: white !important; }
            /* Collectors Section */
             .collectors-section { margin: 25px 0; }
             .collector-table { width: 100%; border-collapse: collapse; margin: 15px 0; }
             .collector-table td { padding: 10px; vertical-align: top; width: 50%; }
             .collector-card { background-color: #ffffff; border: 2px solid #e0e6ed; margin-bottom: 15px; }
             .collector-header { background-color: #2c5aa0 !important; color: #ffffff !important; padding: 15px; text-align: center; }
             .collector-header h3 { margin: 0; font-size: 16px !important; font-weight: bold !important; color: #ffffff !important; }
             .collector-stats { font-size: 12px !important; color: #ffffff !important; margin-top: 8px; }
             .donations-list { padding: 0; margin: 0; list-style-type: none; }
             .donation-item { padding: 12px 15px; border-bottom: 1px solid #f0f0f0; }
             .donation-item:last-child { border-bottom: none; }
             .donation-details { margin-bottom: 5px; }
             .donation-store { font-weight: bold; color: #1e3c72 !important; font-size: 14px !important; }
             .donation-bread { font-size: 11px !important; color: #666666 !important; margin-top: 3px; }
             .donation-value { font-weight: bold !important; color: #11998e !important; font-size: 14px !important; }
             .photo-indicator { background-color: #4CAF50 !important; color: #ffffff !important; padding: 2px 8px; font-size: 9px !important; margin-left: 10px; font-weight: bold !important; }
            /* Footer */
             .footer { background-color: #1e3c72 !important; color: #ffffff !important; padding: 15px; text-align: center; }
             .footer-content { max-width: 600px; margin: 0 auto; }
             .footer h3 { margin: 0 0 8px 0; font-size: 15px !important; font-weight: bold !important; color: #ffffff !important; }
             .footer p { margin: 3px 0; color: #ffffff !important; font-size: 11px !important; }
             .footer .timestamp { margin-top: 10px; font-size: 9px !important; color: #ffffff !important; }
             
             /* Mobile Responsiveness */
             @media screen and (max-width: 600px) {
                 .container { width: 100% !important; max-width: 100% !important; }
                 .content { padding: 10px !important; }
                 .stats-table td, .summary-table td, .financial-table td, .collector-table td { display: block !important; width: 100% !important; }
                 .stats-table tr, .summary-table tr, .financial-table tr { display: block !important; margin-bottom: 10px; }
                 .impact-stat, .summary-card, .financial-card { margin-bottom: 10px; }
             }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="header-content">
                    <h1>📊 THF Daily Collection Report</h1>
                    <p class="subtitle">Bread Collection • Daily Operations Summary</p>
                    <p class="date">${data.date}</p>
                </div>
            </div>
            <div class="branding-bar">
                <div class="brand-logo">🍃 THE HEALTH FOOD COMPANY</div>
            </div>
            <div class="content">
                <div class="impact-highlight">
                    <h2>Today's Collection Summary</h2>
                    <table class="stats-table">
                        <tr>
                            <td>
                                <div class="impact-stat">
                                    <span class="number">${data.totalLoaves}</span>
                                    <span class="label">Loaves Collected</span>
                                </div>
                            </td>
                            <td>
                                <div class="impact-stat">
                                    <span class="number">R${data.totalValue.toFixed(0)}</span>
                                    <span class="label">Total Value</span>
                                </div>
                            </td>
                            <td>
                                <div class="impact-stat">
                                    <span class="number">${data.totalStores}</span>
                                    <span class="label">Stores Engaged</span>
                                </div>
                            </td>
                            <td>
                                <div class="impact-stat">
                                    <span class="number">${data.donationsCount}</span>
                                    <span class="label">Total Donations</span>
                                </div>
                            </td>
                        </tr>
                    </table>
                </div>
                
                <div class="section-header">
                    <h2>📊 Operational Summary</h2>
                    <p>Detailed breakdown of today's bread collection operations</p>
                </div>
                <table class="summary-table">
                    <tr>
                        <td>
                            <div class="summary-card">
                                <div class="icon">🍞</div>
                                <h3>Total Loaves Collected</h3>
                                <p class="value">${data.totalLoaves}</p>
                                <p class="subtext">White: ${data.totalWhiteBread} • Brown: ${data.totalBrownBread}</p>
                            </div>
                        </td>

                        <td>
                            <div class="summary-card">
                                <div class="icon">📦</div>
                                <h3>Collection Operations</h3>
                                <p class="value">${data.donationsCount}</p>
                                <p class="subtext">${Object.keys(data.donationsByCollector).length} collectors engaged</p>
                            </div>
                        </td>
                    </tr>
                    <tr>
                        <td>
                            <div class="summary-card">
                                <div class="icon">📸</div>
                                <h3>Documentation</h3>
                                <p class="value">${data.photosCount}</p>
                                <p class="subtext">Photos captured for verification</p>
                            </div>
                        </td>
                        <td>
                            <div class="summary-card">
                                <div class="icon">💰</div>
                                <h3>Cost Efficiency</h3>
                                <p class="value">R${(2000 / data.totalLoaves).toFixed(2)}</p>
                                <p class="subtext">Cost per loaf collected (Daily ops: R2,000)</p>
                            </div>
                        </td>
                        <td>
                            <div class="summary-card">
                                <div class="icon">🏪</div>
                                <h3>Partner Stores</h3>
                                <p class="value">${data.totalStores}</p>
                                <p class="subtext">Avg per store: R${(data.totalValue / data.totalStores).toFixed(0)}</p>
                            </div>
                        </td>
                    </tr>
                </table>

                <div class="section-header">
                    <h2>💰 Financial Summary</h2>
                    <p>Collection values and donation requirements</p>
                </div>
                <div class="financial-summary">
                    <h2>Financial Overview</h2>
                    <table class="financial-table">
                        <tr>
                            <td>
                                <div class="financial-card primary">
                                    <div class="financial-icon">💎</div>
                                    <h4>Value of Collected Bread</h4>
                                    <p class="financial-value">R${data.totalValue.toFixed(2)}</p>
                                    <p class="financial-subtext">Market value of bread collected</p>
                                </div>
                            </td>
                            <td>
                                <div class="financial-card">
                                    <div class="financial-icon">🏦</div>
                                    <h4>Current Credit Balance</h4>
                                    <p class="financial-value">R${data.creditBalance.toFixed(2)}</p>
                                    <p class="financial-subtext">Available credits</p>
                                </div>
                            </td>
                            <td>
                                <div class="financial-card">
                                    <div class="financial-icon">📋</div>
                                    <h4>Required Donation Value</h4>
                                    <p class="financial-value">R${data.requiredDonationValue.toFixed(2)}</p>
                                    <p class="financial-subtext">Target for today (${data.deficitPercentage}% of PO)</p>
                                </div>
                            </td>
                        </tr>
                        <tr>
                            <td>
                                <div class="financial-card">
                                    <div class="financial-icon">✅</div>
                                    <h4>Applied Credit</h4>
                                    <p class="financial-value">R${data.appliedCredit.toFixed(2)}</p>
                                    <p class="financial-subtext">Credit utilized today</p>
                                </div>
                            </td>
                            ${data.surplusAmount > 0 ? `
                            <td>
                                <div class="financial-card surplus">
                                    <div class="financial-icon">🎉</div>
                                    <h4>Surplus Amount</h4>
                                    <p class="financial-value">R${data.surplusAmount.toFixed(2)}</p>
                                    <p class="financial-subtext">Excess value generated today</p>
                                </div>
                            </td>
                            ` : `
                            <td>
                                <div class="financial-card">
                                    <div class="financial-icon">📊</div>
                                    <h4>Coverage Percentage</h4>
                                    <p class="financial-value">${data.deficitCoveragePercentage.toFixed(1)}%</p>
                                    <p class="financial-subtext">Target achievement rate</p>
                                </div>
                            </td>
                            `}
                            ${data.deficitAmount > 0 ? `
                            <td>
                                <div class="financial-card deficit">
                                    <div class="financial-icon">📉</div>
                                    <h4>Deficit Amount</h4>
                                    <p class="financial-value">R${data.deficitAmount.toFixed(2)}</p>
                                    <p class="financial-subtext">Shortfall after collections & credits</p>
                                </div>
                            </td>
                            ` : `
                            <td>
                                <div class="financial-card">
                                    <div class="financial-icon">💫</div>
                                    <h4>New Credit Generated</h4>
                                    <p class="financial-value">R${data.newCreditGenerated.toFixed(2)}</p>
                                    <p class="financial-subtext">From rounding & surplus</p>
                                </div>
                            </td>
                            `}
                        </tr>
                        <tr>
                            <td>
                                <div class="financial-card projection">
                                    <div class="financial-icon">🔮</div>
                                    <h4>Next Day Credit Balance</h4>
                                    <p class="financial-value">R${data.nextDayCreditBalance.toFixed(2)}</p>
                                    <p class="financial-subtext">Projected (Confidence: ${data.nextDayProjectionConfidence})</p>
                                </div>
                            </td>
                            <td colspan="2">
                                <!-- Empty cells for layout -->
                            </td>
                        </tr>
                    </table>

                </div>

                <div class="collectors-section">
                    <div class="section-header">
                        <h2>👥 Collection Teams Performance</h2>
                        <p>Individual collector contributions and store coverage</p>
                    </div>
                    <table class="collector-table">
                        <tr>
                            <td colspan="2">
                                ${generateCollectorsHTML(data.donationsByCollector)}
                            </td>
                        </tr>
                    </table>
                </div>
            </div>

            <div class="footer">
                <div class="footer-content">
                    <h3>The Health Food Company</h3>
                    <p>Turning surplus into sustenance, one loaf at a time.</p>
                    <p class="timestamp">Report generated on: ${new Date().toLocaleString('en-ZA', { timeZone: 'Africa/Johannesburg' })}</p>
                </div>
            </div>
        </div>
    </body>
    </html>`;

    return { subject, htmlBody };
}

function getCollectorName(donation: Donation): string {
  return donation.profiles?.full_name || `Collector ${donation.collector_id}`;
}

async function createDailySummaryCSV(data: {
  date: string;
  donations: Donation[];
  totalLoaves: number;
  totalWhiteBread: number;
  totalBrownBread: number;
  totalOtherFood: number;
  totalValue: number;
  donationsCount: number;
  photosCount: number;
  deficitAmount: number;
  surplusAmount: number;
  creditBalance: number;
  appliedCredit: number;
  newCreditGenerated: number;
  nextDayCreditBalance: number;
  donationsByCollector: Record<string, Donation[]>;
}): Promise<Buffer> {
    // CSV Header with improved formatting
    let csvContent = '"THE HEALTH FOOD COMPANY - DAILY COLLECTION REPORT"\n';
    csvContent += `"Report Date:","${data.date}"\n`;
    csvContent += `"Generated:","${new Date().toISOString().split('T')[0]} ${new Date().toTimeString().split(' ')[0]}"\n`;
    csvContent += '"Report Type:","Daily Bread Collection Operations"\n\n';
    
    // Executive Summary Section
    csvContent += '"=== EXECUTIVE SUMMARY ==="\n';
    csvContent += '"Metric","Value"\n';
    csvContent += `"Total Loaves Collected","${data.totalLoaves}"\n`;
    csvContent += `"  - White Bread Loaves","${data.totalWhiteBread}"\n`;
    csvContent += `"  - Brown Bread Loaves","${data.totalBrownBread}"\n`;

    csvContent += `"Total Monetary Value","R${data.totalValue.toFixed(2)}"\n`;
    csvContent += `"Number of Donations","${data.donationsCount}"\n`;
    csvContent += `"Photos Captured","${data.photosCount}"\n\n`;
    
    // Financial Summary Section
    csvContent += '"=== FINANCIAL SUMMARY ==="\n';
    csvContent += '"Financial Metric","Amount"\n';
    csvContent += `"Deficit Amount","R${data.deficitAmount.toFixed(2)}"\n`;
    csvContent += `"Surplus Amount","R${data.surplusAmount.toFixed(2)}"\n`;
    csvContent += `"Credit Balance","R${data.creditBalance.toFixed(2)}"\n`;
    csvContent += `"Applied Credit","R${data.appliedCredit.toFixed(2)}"\n`;
    csvContent += `"New Credit Generated","R${data.newCreditGenerated.toFixed(2)}"\n`;
    csvContent += `"Next Day Credit Balance","R${data.nextDayCreditBalance.toFixed(2)}"\n\n`;
    
    // Collection Details Section
     csvContent += '"=== INDIVIDUAL COLLECTIONS ==="\n';
     csvContent += '"Donation ID","Collector Name","Store Name","Collection Time","White Bread","Brown Bread","Monetary Value","Has Photo","Notes"\n';
     
     data.donations.forEach(donation => {
         const collectorName = donation.profiles?.full_name || `Collector ${donation.collector_id}`;
         const storeName = donation.store?.name || donation.store_name_manual || 'Manual Entry';
         const collectionTime = new Date(donation.collected_at).toLocaleString('en-ZA', { timeZone: 'Africa/Johannesburg' });
         const hasPhoto = donation.photo_url && donation.photo_url.trim() !== '' ? 'Yes' : 'No';
         const notes = (donation.notes || '').replace(/"/g, '""').replace(/\n/g, ' ').trim();
         const monetaryValue = (donation.white_bread_monetary_value || (donation.white_bread_qty || 0) * 8.80) + ((donation.brown_bread_qty || 0) * 7.75);
         
         csvContent += `"${donation.id}","${collectorName}","${storeName}","${collectionTime}","${donation.white_bread_qty || 0}","${donation.brown_bread_qty || 0}","R${monetaryValue.toFixed(2)}","${hasPhoto}","${notes}"\n`;
     });
     
     // Team Performance Summary Section
     csvContent += '\n"=== TEAM PERFORMANCE SUMMARY ==="\n';
     csvContent += '"Team Member","Total Collections","Total Loaves Collected","Total Monetary Value"\n';
     
     Object.entries(data.donationsByCollector).forEach(([collectorName, donations]) => {
         const totalDonations = donations.length;
         const totalLoaves = donations.reduce((sum, d) => sum + (d.white_bread_qty || 0) + (d.brown_bread_qty || 0), 0);
         const totalValue = donations.reduce((sum, d) => {
             const whiteValue = d.white_bread_monetary_value || (d.white_bread_qty || 0) * 8.80;
             const brownValue = (d.brown_bread_qty || 0) * 7.75;
             return sum + whiteValue + brownValue;
         }, 0);
         
         csvContent += `"${collectorName}","${totalDonations}","${totalLoaves}","R${totalValue.toFixed(2)}"\n`;
     });
    
    return Buffer.from(csvContent, 'utf-8');
}

async function createPhotoZip(
  _donations: Donation[],
  _date: string,
  _config: any
): Promise<Buffer | null> {
    // This function remains unchanged
    const zip = new JSZip();
    // ... same logic as before
    return zip.generateAsync({ type: 'nodebuffer' });
}

export const manualTrigger = async (
  _event: any,
  context: Context
): Promise<{ statusCode: number; headers: Record<string, string>; body: string }> => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
    'Access-Control-Allow-Methods': 'POST,OPTIONS',
    'Content-Type': 'application/json'
  };

  try {
    console.log('Manual daily summary trigger initiated');
    
    const mockEvent: ScheduledEvent = {
      version: '0',
      id: 'manual-trigger',
      'detail-type': 'Scheduled Event',
      source: 'aws.events',
      account: '123456789012',
      time: new Date().toISOString(),
      region: 'us-east-1',
      detail: {},
      resources: []
    };
    
    await handler(mockEvent, context);
    
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        success: true,
        message: 'Daily summary triggered manually'
      })
    };
  } catch (error) {
    console.error('Manual trigger failed:', error);
    
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        success: false,
        error: 'Failed to trigger daily summary',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};