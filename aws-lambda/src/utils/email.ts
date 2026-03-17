import { SESClient, SendEmailCommand, SendRawEmailCommand } from '@aws-sdk/client-ses';
import { getAppConfig } from './config';

let sesClient: SESClient | null = null;

/**
 * Get SES client
 */
export async function getSESClient(): Promise<SESClient> {
  if (sesClient) {
    return sesClient;
  }

  const config = await getAppConfig();
  
  sesClient = new SESClient({
    region: config.aws.ses.region,
    credentials: {
      accessKeyId: config.aws.ses.accessKeyId,
      secretAccessKey: config.aws.ses.secretAccessKey
    }
  });

  return sesClient;
}

/**
 * Email template types
 */
export interface EmailTemplate {
  subject: string;
  htmlBody: string;
  textBody?: string;
}

/**
 * Send email using AWS SES
 */
export async function sendEmail({
  to,
  from,
  subject,
  htmlBody,
  textBody,
  attachments
}: {
  to: string | string[];
  from: string;
  subject: string;
  htmlBody: string;
  textBody?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer;
    contentType: string;
  }>;
}): Promise<void> {
  const client = await getSESClient();
  
  const recipients = Array.isArray(to) ? to : [to];

  try {
    if (attachments && attachments.length > 0) {
      // Use SendRawEmail for attachments
      const rawMessage = createRawEmailMessage({
        to: recipients,
        from,
        subject,
        htmlBody,
        textBody: textBody || '',
        attachments
      });

      const command = new SendRawEmailCommand({
        RawMessage: {
          Data: rawMessage
        }
      });

      await client.send(command);
    } else {
      // Use SendEmail for simple emails
      const command = new SendEmailCommand({
        Source: from,
        Destination: {
          ToAddresses: recipients
        },
        Message: {
          Subject: {
            Data: subject,
            Charset: 'UTF-8'
          },
          Body: {
            Html: {
              Data: htmlBody,
              Charset: 'UTF-8'
            },
            ...(textBody && {
              Text: {
                Data: textBody,
                Charset: 'UTF-8'
              }
            })
          }
        }
      });

      await client.send(command);
    }

    console.log(`Email sent successfully to: ${recipients.join(', ')}`);
  } catch (error) {
    console.error('Failed to send email:', error);
    throw error;
  }
}

/**
 * Create raw email message with attachments
 */
function createRawEmailMessage({
  to,
  from,
  subject,
  htmlBody,
  textBody,
  attachments
}: {
  to: string[];
  from: string;
  subject: string;
  htmlBody: string;
  textBody?: string;
  attachments: Array<{
    filename: string;
    content: Buffer;
    contentType: string;
  }>;
}): Buffer {
  const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const attachmentBoundary = `----=_Attachment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  let rawMessage = '';

  // Headers
  rawMessage += `From: ${from}\r\n`;
  rawMessage += `To: ${to.join(', ')}\r\n`;
  rawMessage += `Subject: ${subject}\r\n`;
  rawMessage += `MIME-Version: 1.0\r\n`;
  rawMessage += `Content-Type: multipart/mixed; boundary="${boundary}"\r\n`;
  rawMessage += `\r\n`;

  // Message body
  rawMessage += `--${boundary}\r\n`;
  rawMessage += `Content-Type: multipart/alternative; boundary="${attachmentBoundary}"\r\n`;
  rawMessage += `\r\n`;

  // Text part
  if (textBody) {
    rawMessage += `--${attachmentBoundary}\r\n`;
    rawMessage += `Content-Type: text/plain; charset=UTF-8\r\n`;
    rawMessage += `Content-Transfer-Encoding: 7bit\r\n`;
    rawMessage += `\r\n`;
    rawMessage += `${textBody}\r\n`;
  }

  // HTML part
  rawMessage += `--${attachmentBoundary}\r\n`;
  rawMessage += `Content-Type: text/html; charset=UTF-8\r\n`;
  rawMessage += `Content-Transfer-Encoding: 7bit\r\n`;
  rawMessage += `\r\n`;
  rawMessage += `${htmlBody}\r\n`;
  rawMessage += `--${attachmentBoundary}--\r\n`;

  // Attachments
  attachments.forEach(attachment => {
    rawMessage += `--${boundary}\r\n`;
    rawMessage += `Content-Type: ${attachment.contentType}\r\n`;
    rawMessage += `Content-Disposition: attachment; filename="${attachment.filename}"\r\n`;
    rawMessage += `Content-Transfer-Encoding: base64\r\n`;
    rawMessage += `\r\n`;
    rawMessage += `${attachment.content.toString('base64')}\r\n`;
  });

  rawMessage += `--${boundary}--\r\n`;

  return Buffer.from(rawMessage);
}

/**
 * Email templates
 */
export const emailTemplates = {
  donationConfirmation: (data: {
    donorName: string;
    amount: number;
    storeName: string;
    donationId: string;
  }): EmailTemplate => ({
    subject: `Thank you for your donation - R${data.amount}`,
    htmlBody: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Donation Confirmation</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .footer { padding: 20px; text-align: center; color: #666; }
          .amount { font-size: 24px; font-weight: bold; color: #4CAF50; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Thank You for Your Donation!</h1>
          </div>
          <div class="content">
            <p>Dear ${data.donorName},</p>
            <p>Thank you for your generous donation to <strong>${data.storeName}</strong>.</p>
            <p>Donation Details:</p>
            <ul>
              <li><strong>Amount:</strong> <span class="amount">R${data.amount}</span></li>
              <li><strong>Store:</strong> ${data.storeName}</li>
              <li><strong>Donation ID:</strong> ${data.donationId}</li>
              <li><strong>Date:</strong> ${new Date().toLocaleDateString()}</li>
            </ul>
            <p>Your contribution makes a real difference in our community. Thank you for your support!</p>
          </div>
          <div class="footer">
            <p>Best regards,<br>The THFCScan Team</p>
          </div>
        </div>
      </body>
      </html>
    `,
    textBody: `
      Thank You for Your Donation!
      
      Dear ${data.donorName},
      
      Thank you for your generous donation to ${data.storeName}.
      
      Donation Details:
      - Amount: R${data.amount}
      - Store: ${data.storeName}
      - Donation ID: ${data.donationId}
      - Date: ${new Date().toLocaleDateString()}
      
      Your contribution makes a real difference in our community. Thank you for your support!
      
      Best regards,
      The THFCScan Team
    `
  }),

  dailySummary: (data: {
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
    environmentalImpact: {
      co2Saved: number;
      wasteReduced: number;
      mealsProvided: number;
    };
  }): EmailTemplate => ({
    subject: `🍞 The Health Food Company Impact Report - ${data.date}`,
    htmlBody: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>The Health Food Company Impact Report</title>
        <style>
          /* --- EMAIL CLIENT FIXES & DEFAULTS --- */
          body, * { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif !important; 
            -webkit-text-size-adjust: 100% !important;
            -ms-text-size-adjust: 100% !important;
          }
          body { line-height: 1.4; color: #333 !important; margin: 0; padding: 0; background-color: #f5f5f5; font-size: 14px !important; }
          h1, h2, h3, h4, h5, h6 { color: inherit !important; }
          table { border-collapse: collapse !important; mso-table-lspace: 0pt !important; mso-table-rspace: 0pt !important; }
          .container { max-width: 800px; margin: 0 auto; background-color: white; }
          
          /* --- HEADER & BRANDING --- */
          .header { background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%); color: white !important; padding: 30px 20px; text-align: center; }
          .header h1 { margin: 0; font-size: 28px !important; font-weight: 600 !important; }
          .header .subtitle { margin: 8px 0 0 0; font-size: 16px !important; opacity: 0.9; }
          .header .date { margin: 12px 0 0 0; font-size: 14px !important; opacity: 0.8; }
          .branding-bar { background: #fff; padding: 15px 20px; text-align: center; border-bottom: 1px solid #e5e7eb; }
          .brand-logo { font-size: 18px !important; font-weight: 600 !important; color: #2563eb !important; }
          .content { padding: 0; }

          /* --- HIGHLIGHT & STATS SECTIONS --- */
          .impact-highlight { background: linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%); color: white !important; padding: 25px 20px; margin: 0; text-align: center; }
          .impact-highlight h2 { margin: 0 0 20px 0 !important; font-size: 24px !important; font-weight: 600 !important; }
          .impact-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin: 0; }
          .impact-stat { text-align: center; padding: 15px 10px; background: rgba(255,255,255,0.15); border-radius: 12px; }
          .impact-stat .number { font-size: 32px !important; font-weight: 700 !important; display: block; margin-bottom: 8px; line-height: 1 !important; }
          .impact-stat .label { font-size: 13px !important; opacity: 0.95; line-height: 1.2; font-weight: 500 !important; }
          .section-header { text-align: left; margin: 30px 20px 20px 20px; }
          .section-header h2 { color: #1f2937 !important; font-size: 22px !important; font-weight: 600 !important; margin: 0 !important; }
          .section-header p { color: #6b7280 !important; font-size: 14px !important; margin: 5px 0 0 0 !important; }

          /* --- CARDS & GRIDS --- */
          .summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin: 20px; }
          .summary-card { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); transition: all 0.2s ease; color: #333 !important; }
          .summary-card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
          .summary-card .icon { font-size: 24px; margin-bottom: 12px; }
          .summary-card h3 { margin: 0 0 8px 0; color: #374151 !important; font-size: 14px !important; font-weight: 600 !important; }
          .summary-card .value { font-size: 28px !important; font-weight: 700 !important; color: #1f2937 !important; margin: 0; line-height: 1 !important; }
          .summary-card .subtext { font-size: 12px !important; color: #6b7280 !important; margin-top: 8px; line-height: 1.3; }
          
          /* --- FINANCIAL SECTION --- */
          .financial-summary { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white !important; padding: 30px 20px; margin: 0; }
          .financial-summary h2 { margin: 0 0 25px 0 !important; font-size: 24px !important; font-weight: 600 !important; text-align: center; }
          .financial-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; }
          .financial-card { background: rgba(255,255,255,0.15); padding: 20px; border-radius: 12px; backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.2); }
          .financial-card.primary { border: 2px solid rgba(255,255,255,0.4); }
          .financial-card.deficit { border-left: 4px solid #ef4444; }
          .financial-card.surplus { border-left: 4px solid #22c55e; }
          .financial-card.projection { border-left: 4px solid #3b82f6; }
          .financial-card .financial-icon { font-size: 24px; margin-bottom: 12px; display: block; }
          .financial-card h4 { margin: 0 0 8px 0; font-size: 14px !important; font-weight: 600 !important; opacity: 0.95; }
          .financial-card .financial-value { font-size: 24px !important; font-weight: 700 !important; margin: 0; line-height: 1 !important; }
          .financial-card .financial-subtext { font-size: 12px !important; opacity: 0.9; margin-top: 8px; line-height: 1.3; }
          .net-impact { text-align: center; margin-top: 25px; padding: 20px; background: rgba(255,255,255,0.1); border-radius: 12px; border: 2px solid rgba(255,255,255,0.3); }
          .net-impact h4 { margin: 0 0 12px 0; font-size: 18px !important; font-weight: 600 !important; }
          .net-impact .impact-value { font-size: 32px !important; font-weight: 700 !important; margin: 0; }
          .net-impact .impact-subtext { font-size: 14px !important; opacity: 0.9; margin-top: 8px; line-height: 1.4; }

          /* --- COLLECTORS SECTION --- */
          .collectors-section { margin: 25px 0; }
          .collectors-section h2 { margin: 0 0 25px 0 !important; font-size: 24px !important; font-weight: 600 !important; text-align: center; color: #1f2937 !important; }
          .collector-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; }
          .collector-card { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); color: #333 !important; }
          .collector-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; padding-bottom: 15px; border-bottom: 1px solid #e5e7eb; }
          .collector-header h4 { margin: 0; color: #1f2937 !important; font-size: 16px !important; font-weight: 600 !important; }
          .collector-badge { background: #dbeafe; color: #1e40af !important; padding: 4px 8px; border-radius: 6px; font-size: 12px !important; font-weight: 500 !important; }
          .collector-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; }
          .collector-stats .stat { text-align: center; }
          .collector-stats .stat-label { display: block; font-size: 12px !important; color: #6b7280 !important; margin-bottom: 4px; }
          .collector-stats .stat-value { display: block; font-size: 16px !important; font-weight: 600 !important; color: #1f2937 !important; }
          
          /* --- FOOTER --- */
          .footer { background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%); color: white !important; padding: 12px; text-align: center; }
          .footer-content { max-width: 600px; margin: 0 auto; }
          .footer h3 { margin: 0 0 8px 0; font-size: 15px !important; font-weight: 300 !important; }
          .footer p { margin: 3px 0; opacity: 0.9; font-size: 11px !important; }
          .footer .timestamp { margin-top: 10px; font-size: 9px !important; opacity: 0.7; }
          
          /* --- MOBILE OPTIMIZATIONS --- */
          @media (max-width: 600px) {
            .container { margin: 0 !important; width: 100% !important; }
            .content { padding: 10px !important; }
            .impact-highlight, .financial-summary { margin: 15px 0 !important; padding: 15px !important; }
            .impact-stats { grid-template-columns: repeat(2, 1fr); }
            .summary-grid, .financial-grid, .collector-grid { grid-template-columns: 1fr; }
            .impact-stat .number { font-size: 22px !important; }
            .financial-value, .summary-card .value { font-size: 18px !important; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="header-content">
              <h1>🍞 The Health Food Company Impact Report</h1>
              <p class="subtitle">Food Rescue Program • Community Impact</p>
              <p class="date">${data.date} • Sent at 6:00 PM SAST</p>
            </div>
          </div>
          <div class="branding-bar">
            <div class="brand-logo">🍃 THE HEALTH FOOD COMPANY</div>
          </div>
          <div class="impact-highlight">
            <h2>Today's Social Impact</h2>
            <div class="impact-stats">
              <div class="impact-stat">
                <span class="number">${data.totalLoaves}</span>
                <span class="label">Loaves Rescued</span>
              </div>
              <div class="impact-stat">
                <span class="number">R${data.totalValue.toFixed(0)}</span>
                <span class="label">Total Value</span>
              </div>
              <div class="impact-stat">
                <span class="number">${data.environmentalImpact?.mealsProvided || Math.floor(data.totalLoaves * 8)}</span>
                <span class="label">Meals Provided</span>
              </div>
              <div class="impact-stat">
                <span class="number">${data.totalStores || Object.keys(data.donationsByCollector).length}</span>
                <span class="label">Stores</span>
              </div>
            </div>
          </div>
          
          <div class="content">
             <div class="section-header">
               <h2>📊 Operational Summary</h2>
               <p>Detailed breakdown of today's food rescue operations</p>
             </div>
             <div class="summary-grid">
               <div class="summary-card">
                 <div class="icon">🍞</div>
                 <h3>Total Loaves</h3>
                 <p class="value">${data.totalLoaves}</p>
                 <p class="subtext">White: ${data.totalWhiteBread} • Brown: ${data.totalBrownBread}</p>
               </div>
               <div class="summary-card">
                 <div class="icon">🥖</div>
                 <h3>Other Food</h3>
                 <p class="value">${data.totalOtherFood}</p>
                 <p class="subtext">Additional items rescued</p>
               </div>
               <div class="summary-card">
                 <div class="icon">📸</div>
                 <h3>Photos</h3>
                 <p class="value">${data.photosCount}</p>
                 <p class="subtext">Documentation captured</p>
               </div>
             </div>

            <div class="financial-summary">
               <h2>Financial Overview</h2>
               <div class="financial-grid">
                 <div class="financial-card primary">
                   <div class="financial-icon">💎</div>
                   <h4>Total Value</h4>
                   <p class="financial-value">R${(data.totalValue || 0).toFixed(2)}</p>
                   <p class="financial-subtext">Market value of rescued food</p>
                 </div>
                 <div class="financial-card">
                   <div class="financial-icon">🎯</div>
                   <h4>Required Value</h4>
                   <p class="financial-value">R${(data.requiredDonationValue || 0).toFixed(2)}</p>
                   <p class="financial-subtext">Target donation value</p>
                 </div>
                 <div class="financial-card">
                   <div class="financial-icon">💳</div>
                   <h4>Credit Balance</h4>
                   <p class="financial-value">R${(data.creditBalance || 0).toFixed(2)}</p>
                   <p class="financial-subtext">Available credit</p>
                 </div>
                 ${(data.deficitAmount || 0) > 0 ? `
                 <div class="financial-card deficit">
                   <div class="financial-icon">⚠️</div>
                   <h4>Deficit</h4>
                   <p class="financial-value">R${(data.deficitAmount || 0).toFixed(2)}</p>
                   <p class="financial-subtext">Shortfall amount</p>
                 </div>
                 ` : ''}
                 ${(data.surplusAmount || 0) > 0 ? `
                 <div class="financial-card surplus">
                   <div class="financial-icon">🎉</div>
                   <h4>Surplus</h4>
                   <p class="financial-value">R${(data.surplusAmount || 0).toFixed(2)}</p>
                   <p class="financial-subtext">Excess value</p>
                 </div>
                 ` : ''}
                 <div class="financial-card">
                   <div class="financial-icon">📊</div>
                   <h4>Coverage</h4>
                   <p class="financial-value">${(data.deficitCoveragePercentage || 0).toFixed(1)}%</p>
                   <p class="financial-subtext">Target achievement</p>
                 </div>
               </div>
               <div class="net-impact">
                 <h4>Net Social Impact Value</h4>
                 <p class="impact-value">R${((data.totalValue || 0) - 2000).toFixed(2)}</p>
                 <p class="impact-subtext">Value after operational costs (R2,000 daily)</p>
               </div>
             </div>

            <div class="collectors-section">
              <h2>📸 Collection Teams Performance</h2>
              <div class="collectors-grid">
                ${Object.entries(data.donationsByCollector).map(([collectorName, donations]) => {
                  const collectorTotalValue = donations.reduce((sum, d) => {
                    const whiteValue = d.white_bread_monetary_value || (d.white_bread_qty || 0) * 8.80;
                    const brownValue = (d.brown_bread_qty || 0) * 7.75;
                    return sum + whiteValue + brownValue;
                  }, 0);
                  const collectorTotalLoaves = donations.reduce((sum, d) => sum + (d.white_bread_qty || 0) + (d.brown_bread_qty || 0), 0);
                  const collectorPhotoCount = donations.reduce((sum, d) => sum + (d.photo_url && d.photo_url.trim() !== '' ? 1 : 0), 0);
                  const collectorStoreCount = new Set(donations.map(d => d.store?.name || d.store_name_manual || 'Unknown Store')).size;
                  return `
                    <div class="collector-card">
                      <div class="collector-header">
                        <h4>${collectorName}</h4>
                        <span class="collector-badge">${collectorPhotoCount} photos</span>
                      </div>
                      <div class="collector-stats">
                        <div class="stat">
                          <span class="stat-label">Stores</span>
                          <span class="stat-value">${collectorStoreCount}</span>
                        </div>
                        <div class="stat">
                          <span class="stat-label">Value</span>
                          <span class="stat-value">R${(collectorTotalValue || 0).toFixed(2)}</span>
                        </div>
                        <div class="stat">
                          <span class="stat-label">Loaves</span>
                          <span class="stat-value">${collectorTotalLoaves}</span>
                        </div>
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>
            </div>
          </div>
          <div class="footer">
            <div class="footer-content">
              <h3>The Health Food Company</h3>
              <p>This is an automated daily report. Thank you for your continued partnership and dedication to reducing food waste and feeding our community.</p>
              <p class="timestamp">Report generated on ${new Date().toLocaleString('en-ZA', { timeZone: 'Africa/Johannesburg' })}</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `,
    textBody: `
The Health Food Company - Daily Impact Report for ${data.date}
=========================================================

--- TODAY'S SOCIAL IMPACT ---
- Loaves Rescued: ${data.totalLoaves}
- Total Value Generated: R${(data.totalValue || 0).toFixed(2)}
- Meals Provided: ${data.environmentalImpact?.mealsProvided || Math.floor(data.totalLoaves * 8)}
- Stores Engaged: ${data.totalStores || Object.keys(data.donationsByCollector).length}

--- OPERATIONAL SUMMARY ---
- Total Loaves: ${data.totalLoaves} (White: ${data.totalWhiteBread}, Brown: ${data.totalBrownBread})
- Additional Food Items: ${data.totalOtherFood}
- Collection Operations: ${data.donationsCount} stops by ${Object.keys(data.donationsByCollector).length} collectors
- Photos Captured: ${data.photosCount}
- Cost Efficiency: R${(2000 / data.totalLoaves).toFixed(2)} per loaf
- Partner Stores Engaged: ${data.totalStores || Object.keys(data.donationsByCollector).length}

--- FINANCIAL IMPACT ANALYSIS ---
- Retail Value of Rescued Food: R${(data.totalValue || 0).toFixed(2)}
- Required Donation Value: R${(data.requiredDonationValue || 0).toFixed(2)}
- Coverage Percentage: ${(data.deficitCoveragePercentage || 0).toFixed(1)}%
- Deficit/Surplus: ${(data.deficitAmount || 0) > 0 ? `Deficit of R${(data.deficitAmount || 0).toFixed(2)}` : `Surplus of R${(data.surplusAmount || 0).toFixed(2)}`}
- Brown Bread Equivalent: ${data.totalBrownBreadEquivalent} loaves
- Current Credit Balance: R${(data.creditBalance || 0).toFixed(2)}
- Applied Credit Today: R${(data.appliedCredit || 0).toFixed(2)}
- New Credit Generated: R${(data.newCreditGenerated || 0).toFixed(2)}
- Projected Next Day Credit: R${(data.nextDayCreditBalance || 0).toFixed(2)}
- Net Social Impact Value (after R2000 ops cost): R${((data.totalValue || 0) - 2000).toFixed(2)}

--- COLLECTION TEAMS PERFORMANCE ---
${Object.entries(data.donationsByCollector).map(([collectorName, donations]) => {
  const collectorTotalValue = donations.reduce((sum, d) => sum + (d.white_bread_monetary_value || 0) + (d.brown_bread_monetary_value || 0) + (d.other_food_monetary_value || 0), 0);
  return `
--------------------------------------
Collector: ${collectorName}
Total Value: R${(collectorTotalValue || 0).toFixed(2)} | Stops: ${donations.length}
--------------------------------------
${donations.map(d => `  - ${d.storeName}: R${(d.value || 0).toFixed(2)} (W:${d.whiteBread}, B:${d.brownBread}, O:${d.otherFood}) ${d.hasPhoto ? '[Photo]' : ''}`).join('\n')}
`;
}).join('')}

=========================================================
This is an automated report. Thank you for your partnership.
Report generated on ${new Date().toLocaleString('en-ZA', { timeZone: 'Africa/Johannesburg' })}
`
  }),

  welcome: (data: {
    userEmail: string;
    userName?: string;
  }): EmailTemplate => ({
    subject: 'Welcome to THFCScan - Your Account is Ready!',
    htmlBody: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Welcome to THFCScan</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .footer { padding: 20px; text-align: center; color: #666; }
          .cta-button { display: inline-block; background-color: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to THFCScan!</h1>
          </div>
          <div class="content">
            <p>Hello ${data.userName || 'there'},</p>
            <p>Welcome to THFCScan! Your account has been successfully created and you're now ready to start making a difference in food waste reduction.</p>
            <p>With THFCScan, you can:</p>
            <ul>
              <li>📱 Scan and log food donations quickly</li>
              <li>📊 Track your impact and contributions</li>
              <li>🤝 Connect with our community of food rescuers</li>
              <li>📈 View real-time statistics and reports</li>
            </ul>
            <p>Get started by logging into your account and exploring the features.</p>
            <a href="${process.env.FRONTEND_URL || 'https://thfcscan.com'}" class="cta-button">Start Using THFCScan</a>
            <p>If you have any questions or need assistance, don't hesitate to reach out to our support team.</p>
          </div>
          <div class="footer">
            <p>Thank you for joining our mission to reduce food waste!<br>The THFCScan Team</p>
          </div>
        </div>
      </body>
      </html>
    `,
    textBody: `
      Welcome to THFCScan!
      
      Hello ${data.userName || 'there'},
      
      Welcome to THFCScan! Your account has been successfully created and you're now ready to start making a difference in food waste reduction.
      
      With THFCScan, you can:
      - Scan and log food donations quickly
      - Track your impact and contributions
      - Connect with our community of food rescuers
      - View real-time statistics and reports
      
      Get started by visiting: ${process.env.FRONTEND_URL || 'https://thfcscan.com'}
      
      If you have any questions or need assistance, don't hesitate to reach out to our support team.
      
      Thank you for joining our mission to reduce food waste!
      The THFCScan Team
    `
  }),

  passwordReset: (data: {
    userEmail: string;
    resetToken: string;
    resetUrl: string;
  }): EmailTemplate => ({
    subject: 'Reset Your THFCScan Password',
    htmlBody: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Reset Your Password</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #2196F3; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .footer { padding: 20px; text-align: center; color: #666; }
          .reset-button { display: inline-block; background-color: #2196F3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .security-notice { background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Password Reset Request</h1>
          </div>
          <div class="content">
            <p>Hello,</p>
            <p>We received a request to reset the password for your THFCScan account (${data.userEmail}).</p>
            <p>Click the button below to reset your password:</p>
            <a href="${data.resetUrl}" class="reset-button">Reset My Password</a>
            <div class="security-notice">
              <strong>Security Notice:</strong>
              <ul>
                <li>This link will expire in 1 hour for security reasons</li>
                <li>If you didn't request this reset, please ignore this email</li>
                <li>Never share this link with anyone</li>
              </ul>
            </div>
            <p>If the button doesn't work, copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #666;">${data.resetUrl}</p>
          </div>
          <div class="footer">
            <p>If you need help, contact our support team.<br>The THFCScan Team</p>
          </div>
        </div>
      </body>
      </html>
    `,
    textBody: `
      Password Reset Request
      
      Hello,
      
      We received a request to reset the password for your THFCScan account (${data.userEmail}).
      
      Click this link to reset your password:
      ${data.resetUrl}
      
      Security Notice:
      - This link will expire in 1 hour for security reasons
      - If you didn't request this reset, please ignore this email
      - Never share this link with anyone
      
      If you need help, contact our support team.
      The THFCScan Team
    `
  })
};
