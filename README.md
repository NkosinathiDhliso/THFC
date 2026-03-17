# THFCScan - Food Forward Bread Donation Tracking System

## 📧 **Database Access Information**

**Supabase Login Email:** `thehealthfoodcompany@yahoo.com`
**New Project ID:** `tqrlhajnkfcchgzsqpjd`
**New Project URL:** `https://tqrlhajnkfcchgzsqpjd.supabase.co`

> 🔄 **Important:** Use `thehealthfoodcompany@yahoo.com` to access your Supabase dashboard and manage the THFCScan database. This is your NEW project - the old project (`bfgdsmorzouhfffriuot`) is no longer being used.

## Environment Variables

Create a `.env.local` file in your project root:

```bash
VITE_SUPABASE_URL=https://tqrlhajnkfcchgzsqpjd.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
VITE_SUPABASE_SERVICE_KEY=your-service-key-here
```

## Overview

THFCScan is a professional web application designed to streamline Food Forward's bread donation workflow. The system enables field teams to log collected bread quantities from Spar stores with photographic proof, while maintaining legal non-repudiation and calculating brown bread deficits automatically.

## Features

### Core Functionality
- **Donation Reporting**: Field teams can log white and brown bread quantities with store selection
- **Photo Proof**: Built-in camera functionality for capturing donation evidence
- **Non-Repudiation**: Legal accountability through user identification and digital signatures
- **Admin Portal**: Sales data management for deficit calculations
- **Real-time Validation**: Instant feedback on form completion and data integrity
- **Email Notifications**: Professional email notifications via AWS SES

### Design Highlights
- **Professional Humanitarian** aesthetic combining structure with warmth
- **Mobile-first** responsive design optimized for field use
- **Accessibility-focused** with large touch targets and clear visual hierarchy
- **Progressive disclosure** to manage complexity and reduce cognitive load

## Technology Stack

- **Frontend**: React 18 with TypeScript
- **Routing**: React Router DOM
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Email**: AWS SES via Azure Functions
- **Styling**: CSS with custom design system
- **Icons**: Lucide React
- **Camera**: HTML5 Media APIs
- **Build Tool**: Vite

## Database Schema

### Tables
- `stores` - Spar store locations
- `donations` - Bread donation records with quantities and photos
- `zoho_sales_data` - Sales order quantities for deficit calculation
- `profiles` - Extended user profile information
- `daily_donation_log` - Tracking for daily summary processing

## Email Notification System

### AWS SES Integration

THFCScan uses AWS SES for professional email notifications:

#### Notification Types
- **Donation Confirmations**: Sent when donations are successfully processed
- **Deficit Alerts**: Triggered when brown bread targets are not met
- **Daily Summaries**: Comprehensive daily reports for administrators
- **System Alerts**: Important system notifications and updates

#### Setup Requirements

1. **AWS Account**: Create an account and set up SES
2. **Environment Variables**: Configure the following in your Azure Functions:
   ```bash
   AWS_ACCESS_KEY_ID=your_access_key_here
   AWS_SECRET_ACCESS_KEY=your_secret_key_here
   AWS_REGION=us-east-1
   SES_FROM_EMAIL=noreply@yourdomain.com
   SES_TO_EMAIL=support@thehealthfoodcompany.co.za
   ```

#### Email Templates

The system sends professional HTML emails with:

1. **donation_notification** - Individual donation confirmations
   - Subject: `THFCScan: New Bread Donation - {{store_name}}`
   - Content: Includes donation details, quantities, and deficit analysis

2. **daily_summary** - Daily donation summaries
   - Subject: `THFCScan Daily Summary - {{date}} ({{total_donations}} donations)`
   - Content: Comprehensive daily statistics and photo archives

#### Features
- **Professional HTML design**: Company-branded email templates
- **Mobile responsive**: Optimized for all email clients
- **Rich content**: Tables, statistics, and visual indicators
- **Photo attachments**: ZIP archives in daily summaries
- **Delivery tracking**: AWS SES delivery metrics and bounce handling

## Getting Started

### Prerequisites
- Node.js 18+
- Supabase account and project
- AWS account with SES configured

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   # Create .env file with:
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. Set up Supabase database:
   - Create the required tables using the SQL schema
   - Enable Row Level Security (RLS)
   - Set up authentication policies

5. Configure Azure Functions:
   - Deploy the functions to Azure
   - Set up AWS SES credentials
   - Configure email templates and delivery settings

6. Start the development server:
   ```bash
   npm run dev
   ```

## Architecture

### Frontend Structure
```
src/
├── components/          # Reusable UI components
│   ├── Auth/           # Authentication components
│   ├── Camera/         # Photo capture functionality
│   ├── Donation/       # Donation form and confirmation
│   ├── Layout/         # Page layout components
│   └── UI/             # Basic UI components
├── lib/                # External service configurations
│   └── supabase.ts     # Supabase client setup
├── services/           # Business logic and API calls
├── types/              # TypeScript type definitions
└── App.tsx             # Main application component
```

### Key Components

- **DonationForm**: Main form for entering donation data with validation
- **CameraCapture**: Full-screen camera interface with review capability
- **ConfirmationModal**: Legal certification dialog before submission
- **ConfirmationScreen**: Success screen with donation summary
- **AdminPortal**: Sales data management interface

## Email Workflow

### User Journey
1. **User Registration**: Account creation with Food Forward credentials
2. **Donation Submission**: Real-time email confirmations
3. **Processing Updates**: Status updates throughout the workflow
4. **Daily Summaries**: Comprehensive daily reports for administrators
5. **Deficit Alerts**: Proactive notifications when targets are not met

### Event Tracking
- `donation_submission_started` - Beginning of donation process
- `donation_submission_completed` - Successful donation completion
- `donation_submission_failed` - Failed donation attempts
- Custom events for analytics and optimization

## Design System

### Color Palette
- **Primary Brand**: #2E8A6A (Forest Green)
- **Primary Action**: #FA5D00 (Food Forward Orange)
- **Accent**: #E6A817 (Harvest Gold)
- **Semantic Colors**: Success, Error, Warning, Info

### Typography
- **Primary Font**: Montserrat (headings, UI elements)
- **Secondary Font**: Lato (body text)
- **Comprehensive Scale**: Display, H1, H2, Body Large/Default, Label, Button, Caption, Small

### Components
- **Button Variants**: Primary CTA, Secondary, Disabled states
- **Form Elements**: Input fields with focus states and validation
- **Interactive Elements**: Quantity buttons, photo previews, modals
- **Email Elements**: Professional HTML templates, responsive design

## Security & Compliance

### Non-Repudiation Features
- **User Identity**: Persistent header showing logged-in user
- **Timestamps**: Official timestamps on all records
- **Digital Signatures**: Animated confirmation seals
- **Explicit Certification**: Legal confirmation dialogs

### Data Protection
- **Row Level Security**: Supabase RLS policies
- **Authentication**: Email/password with session management
- **Input Validation**: Client and server-side validation
- **Error Handling**: Comprehensive error management
- **Email Security**: AWS SES with proper authentication

## Integration Points

### Azure Functions (Production)
- **process-donation**: Individual donation processing and email notifications
- **daily-summary-email**: Daily summary reports with photo archives
- **AWS SES Integration**: Professional email delivery with tracking

### Azure Blob Storage (Production)
- **Photo Storage**: Secure image storage with SAS tokens
- **URL Generation**: Permanent URLs for photo evidence

## Development Notes

### Mock Implementations
- Azure Functions calls are mocked in development
- Photo storage uses data URLs (production would use Azure Blob)
- Email notifications are logged to console in development
- AWS SES integration works in production with proper configuration

### Environment-Specific Configurations
- Development: Local Supabase instance + console logging
- Production: Hosted Supabase + AWS SES + Azure integrations

## Deployment

### Build Process
```bash
npm run build
```

### Environment Variables (Production)
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- Azure Function endpoints
- Azure Blob Storage configuration
- AWS SES credentials (in Azure Functions)

## Monitoring & Analytics

### AWS SES Dashboard
- **Delivery Metrics**: Open rates, click-through rates, delivery success
- **Bounce Handling**: Automatic bounce and complaint management
- **Performance Monitoring**: Delivery times and failure rates
- **Cost Tracking**: Email volume and cost optimization

### Application Analytics
- **User Journey Tracking**: Complete donation workflow analytics
- **Error Monitoring**: Comprehensive error tracking and alerting
- **Performance Metrics**: Application performance and user experience
- **Business Intelligence**: Donation patterns and deficit analysis

## Support

For technical support or questions about THFCScan, contact the development team or refer to the comprehensive inline documentation within the codebase.

### Email Support
- **AWS SES Documentation**: [docs.aws.amazon.com/ses](https://docs.aws.amazon.com/ses)
- **Template Management**: Managed through Azure Functions code
- **Delivery Issues**: Check AWS SES console and delivery status
- **Cost Optimization**: Monitor usage through AWS billing dashboard

## License

This software is proprietary to The Health Food Company and Food Forward partnership.