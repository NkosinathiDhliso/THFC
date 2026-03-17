# Daily Summary Email System

## Overview

The THFCScan application has been enhanced with a comprehensive daily summary system that consolidates all donation data and sends a single cumulative report at **6:00 PM SAST daily** instead of individual immediate emails.

## Key Changes Implemented

### 1. **Disabled Immediate Email Notifications**
- **Previous Behavior**: Each donation triggered an immediate email with individual details
- **New Behavior**: Donations are processed and stored, but no immediate emails are sent
- **Benefit**: Reduces email noise and creates a more organized reporting system

### 2. **Daily Cumulative Summary at 6:00 PM SAST**
- **Schedule**: Automatically triggers at 16:00 UTC (6:00 PM SAST)
- **Content**: Aggregated data from all donations submitted during the day
- **Delivery**: Single comprehensive email with attached photo archive

### 3. **Enhanced Photo Management**
- **Automatic Collection**: All donation photos from the day are collected
- **Organized Archive**: Photos are compressed into a single ZIP file
- **Naming Convention**: `THFCScan_DonationPhotos_YYYY-MM-DD.zip`
- **Email Attachment**: ZIP archive is attached to the daily summary email

## Email Content Structure

### **Header Section**
- **Title**: "🍞 Daily Donation Summary"
- **Date**: Current date with "Sent at 6:00 PM SAST" timestamp
- **Professional Branding**: THFCScan and Food Forward partnership

### **Cumulative Daily Totals**
- **Total Loaves**: Combined white and brown bread quantities
- **Total Donations**: Number of individual donation submissions
- **Stores Visited**: Count of unique store locations
- **Photos Attached**: Number of photos in the ZIP archive

### **Financial Impact Section**
- **Total Value**: Sum of all white bread monetary values (R amount)
- **Brown Bread Equivalent**: Calculated deficit coverage (5.6% formula)
- **Deficit Coverage**: Percentage explanation (5.6% of total value)
- **Archive Status**: Confirmation of photo attachment

### **Store-by-Store Breakdown**
For each store visited:
- **Store Name and Address**
- **Individual Donation Table** with columns:
  - Time of collection
  - Collector name
  - White bread quantity
  - Monetary value (R amount)
  - Brown bread equivalent
  - Brown bread quantity
  - Photo availability (✅/❌)
  - Donation ID (first 8 characters)

## Technical Implementation

### **Azure Function Configuration**

#### **process-donation Function**
- **Email Removal**: Immediate email sending code disabled
- **Storage Maintained**: Donations still saved to blob storage for daily processing
- **Logging Enhanced**: Clear indication that emails will be sent at 6 PM

#### **send-daily-summary Function**
- **Schedule**: `"0 0 16 * * *"` (6:00 PM SAST / 16:00 UTC)
- **Data Source**: Processes current day's donations (not previous day)
- **Enhanced Calculations**: Includes monetary values and brown bread equivalents

### **Email Template Enhancements**

#### **HTML Email**
- **Responsive Design**: Mobile-friendly layout
- **Professional Styling**: THFCScan branding and colors
- **Data Visualization**: Clear grids and tables for easy reading
- **Financial Emphasis**: Highlighted monetary impact section

#### **Text Email**
- **Fallback Support**: Plain text version for all email clients
- **Structured Layout**: Organized sections with clear headers
- **Complete Data**: All information from HTML version in text format

### **Photo Archive System**

#### **Collection Process**
- **Source Identification**: Scans all donations for photo URLs
- **Download Handling**: Supports both data URLs and HTTP URLs
- **Error Resilience**: Continues processing if individual photos fail

#### **Archive Creation**
- **ZIP Format**: Standard compression for universal compatibility
- **Filename Structure**: `{StoreName}_{Timestamp}_{DonationID}.jpg`
- **Organization**: Chronologically ordered within the archive
- **Size Optimization**: Efficient compression for email attachment

## Scheduling and Timezone Handling

### **SAST (South African Standard Time)**
- **UTC Offset**: +2 hours
- **Schedule Time**: 16:00 UTC = 18:00 SAST (6:00 PM)
- **Date Calculation**: Properly adjusted for SAST timezone
- **Business Hours**: Optimal timing for end-of-day reporting

### **Azure Functions Timer**
- **Cron Expression**: `"0 0 16 * * *"`
- **Reliability**: Azure's managed timer trigger service
- **Monitoring**: Built-in logging and failure detection
- **Scalability**: Automatic scaling and retry mechanisms

## Data Accuracy and Calculations

### **Monetary Value Calculation**
```
White Bread Value = Quantity × R8.80 (or manual input)
Total Daily Value = Sum of all donation values
```

### **Brown Bread Equivalent Formula**
```
Deficit Amount = White Bread Value × 5.6%
Brown Bread Equivalent = Deficit Amount ÷ R7.75
Total Daily Equivalent = Sum of all individual equivalents
```

### **Summary Statistics**
- **Total Loaves**: White bread + Brown bread quantities
- **Total Donations**: Count of individual submissions
- **Total Stores**: Unique store locations visited
- **Total Photos**: Count of photos in archive
- **Financial Metrics**: Accurate monetary calculations

## Benefits of the New System

### **1. Reduced Email Noise**
- **Before**: Multiple individual emails throughout the day
- **After**: Single comprehensive summary at 6:00 PM
- **Result**: More manageable inbox and better organization

### **2. Enhanced Data Aggregation**
- **Cumulative Totals**: Complete daily picture of donation activity
- **Financial Impact**: Clear monetary value and deficit coverage
- **Comprehensive Coverage**: All data in one accessible location

### **3. Improved Photo Management**
- **Organized Archive**: All photos in one downloadable file
- **Professional Naming**: Systematic filename structure
- **Efficient Storage**: Compressed format for easy handling

### **4. Better Business Intelligence**
- **Daily Trends**: Clear view of daily donation patterns
- **Store Performance**: Store-by-store breakdown
- **Financial Tracking**: Accurate value and impact measurement

## Monitoring and Troubleshooting

### **Success Indicators**
- **Email Delivery**: Daily summary received at 6:00 PM SAST
- **Complete Data**: All day's donations included
- **Photo Archive**: ZIP file properly attached
- **Accurate Calculations**: Monetary values and equivalents correct

### **Common Issues and Solutions**

#### **No Email Received**
1. **Check Azure Function Status**: Verify timer trigger is active
2. **Review Logs**: Check Azure Function execution logs
3. **Validate Email Settings**: Confirm SES configuration
4. **Timezone Verification**: Ensure UTC/SAST conversion is correct

#### **Missing Donations**
1. **Blob Storage Check**: Verify donations are being saved
2. **Date Range Validation**: Confirm date filtering logic
3. **Storage Permissions**: Check access rights

#### **Photo Archive Issues**
1. **Photo URL Validation**: Verify photos are accessible
2. **ZIP Creation Logs**: Check compression process
3. **Attachment Size**: Monitor for email size limits

### **Log Messages to Monitor**
- `"📅 Processing donations for date: {targetDate}"`
- `"📧 Processing {count} donations for daily summary..."`
- `"📸 Zipping {count} photos..."`
- `"✅ Daily summary email sent successfully"`

## Deployment Instructions

### **1. Azure Function Deployment**
```bash
# Deploy the updated functions
npm run build
func azure functionapp publish thfcscan-functions
```

### **2. Environment Variables Required**
- `AWS_ACCESS_KEY_ID`: SES access key
- `AWS_SECRET_ACCESS_KEY`: SES secret key
- `AWS_REGION`: SES region (e.g., us-east-1)
- `SES_FROM_EMAIL`: Sender email address
- `SES_TO_EMAIL`: Recipient email address
- `AZURE_STORAGE_CONNECTION_STRING`: Blob storage connection

### **3. Testing the System**
1. **Submit Test Donations**: Create donations throughout the day
2. **Wait for 6:00 PM SAST**: Monitor for automatic email
3. **Verify Email Content**: Check all sections and calculations
4. **Download Photo Archive**: Confirm ZIP file contents

## Future Enhancements

### **Potential Improvements**
1. **Multiple Recipients**: Support for email distribution lists
2. **Weekly/Monthly Summaries**: Additional reporting frequencies
3. **PDF Reports**: Formatted PDF attachments
4. **Dashboard Integration**: Web-based summary viewing
5. **Mobile Notifications**: Push notifications for managers

### **Analytics Integration**
1. **Trend Analysis**: Historical comparison data
2. **Store Performance Metrics**: Detailed store analytics
3. **Collector Performance**: Individual contributor statistics
4. **Financial Impact Tracking**: Long-term value analysis

---

*This daily summary system significantly improves the THFCScan reporting workflow by providing comprehensive, well-organized daily reports that consolidate all donation activity into a single, professional email delivered at the optimal time each day.* 