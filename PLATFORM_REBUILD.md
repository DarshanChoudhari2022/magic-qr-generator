# Magic QR Generator - Complete Platform Rebuild

## 🎯 Overview
Complete rebuild of Magic QR Generator to match Smart CONNECT QR functionality with AI-powered review collection system.

## 📋 Core Features (Smart CONNECT QR Parity)

### 1. AI-Powered Review Collection
- **One-scan flow**: Customer scans QR → AI generates 3-5 review suggestions → One-tap post
- **3-second completion**: No typing needed
- **Multi-language**: English, हिंदी, मराठी
- **Instant posting**: Direct to Google My Business

### 2. Dashboard & Analytics
- Real-time review tracking
- Branch/location-wise analytics
- Conversion rate metrics
- Review history with timestamps
- Performance insights

### 3. Smart Features
- **AI Auto-Reply**: Every review gets intelligent response
- **NFC Card Support**: Tap-to-review
- **Multiple QR Codes**: For branches/field staff
- **WhatsApp Integration**: For support and orders

## 🏗️ Tech Stack

### Frontend
- **Framework**: React 18 + TypeScript (existing Vite setup)
- **Styling**: Tailwind CSS + shadcn/ui
- **State**: React Context + Zustand
- **i18n**: react-i18next
- **QR**: qrcode.react
- **Charts**: Recharts

### Backend
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth
- **Storage**: Supabase Storage (for QR/NFC assets)
- **AI**: OpenAI GPT-4 Turbo
- **GMB**: Google My Business API

### Deployment
- **Hosting**: Vercel (already configured)
- **Database**: Supabase Cloud
- **CDN**: Vercel Edge Network

## 📊 Database Schema

### Core Tables

```sql
-- Businesses
CREATE TABLE businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  google_place_id TEXT,
  google_place_url TEXT,
  owner_id UUID REFERENCES auth.users(id),
  phone TEXT,
  email TEXT,
  address TEXT,
  category TEXT,
  logo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- QR Codes / NFC Cards
CREATE TABLE qr_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL, -- e.g., "Counter 1", "Delivery Team", "Branch A"
  type TEXT CHECK (type IN ('qr', 'nfc')) DEFAULT 'qr',
  is_active BOOLEAN DEFAULT true,
  scan_count INTEGER DEFAULT 0,
  review_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reviews
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  qr_code_id UUID REFERENCES qr_codes(id),
  business_id UUID REFERENCES businesses(id),
  customer_name TEXT,
  customer_email TEXT,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5) NOT NULL,
  review_text TEXT NOT NULL,
  ai_suggestion_used TEXT, -- Which AI suggestion was selected
  language TEXT DEFAULT 'en',
  posted_to_google BOOLEAN DEFAULT false,
  google_review_id TEXT,
  google_review_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI Auto-Replies
CREATE TABLE auto_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID REFERENCES reviews(id) ON DELETE CASCADE,
  reply_text TEXT NOT NULL,
  posted_to_google BOOLEAN DEFAULT false,
  google_reply_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Subscriptions
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  plan_type TEXT CHECK (plan_type IN ('1year', '3years', 'trial')) DEFAULT 'trial',
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  price DECIMAL(10,2),
  nfc_cards_included INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Analytics Events
CREATE TABLE analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  qr_code_id UUID REFERENCES qr_codes(id),
  business_id UUID REFERENCES businesses(id),
  event_type TEXT NOT NULL, -- 'scan', 'review_started', 'review_completed', 'review_skipped'
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Indexes
```sql
CREATE INDEX idx_reviews_business ON reviews(business_id, created_at DESC);
CREATE INDEX idx_reviews_qr_code ON reviews(qr_code_id, created_at DESC);
CREATE INDEX idx_qr_codes_business ON qr_codes(business_id);
CREATE INDEX idx_analytics_events_business ON analytics_events(business_id, created_at DESC);
```

## 📁 Project Structure

```
magic-qr-generator/
├── src/
│   ├── components/
│   │   ├── ui/                    # shadcn/ui components
│   │   ├── landing/
│   │   │   ├── Hero.tsx
│   │   │   ├── Features.tsx
│   │   │   ├── Pricing.tsx
│   │   │   ├── FAQ.tsx
│   │   │   └── LanguageToggle.tsx
│   │   ├── review/
│   │   │   ├── QRScanPage.tsx
│   │   │   ├── RatingSelector.tsx
│   │   │   ├── AISuggestions.tsx
│   │   │   └── ThankYou.tsx
│   │   ├── dashboard/
│   │   │   ├── DashboardLayout.tsx
│   │   │   ├── Analytics.tsx
│   │   │   ├── ReviewList.tsx
│   │   │   ├── QRManager.tsx
│   │   │   └── BusinessSettings.tsx
│   │   └── common/
│   │       ├── QRGenerator.tsx
│   │       ├── LoadingSpinner.tsx
│   │       └── ErrorBoundary.tsx
│   ├── pages/
│   │   ├── Index.tsx              # Landing page
│   │   ├── Review.tsx             # /r/:code - Review collection
│   │   ├── Dashboard.tsx          # /dashboard
│   │   ├── Analytics.tsx          # /analytics
│   │   ├── QRCodes.tsx            # /qr-codes
│   │   ├── Pricing.tsx            # /pricing
│   │   ├── Login.tsx              # /login
│   │   └── Signup.tsx             # /signup
│   ├── services/
│   │   ├── openai.ts              # AI review generation
│   │   ├── google-business.ts     # GMB API integration
│   │   ├── supabase.ts            # Supabase client
│   │   ├── analytics.ts           # Event tracking
│   │   └── whatsapp.ts            # WhatsApp integration
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useReviews.ts
│   │   ├── useAnalytics.ts
│   │   └── useLanguage.ts
│   ├── lib/
│   │   ├── i18n.ts                # i18next config
│   │   ├── utils.ts
│   │   └── constants.ts
│   ├── types/
│   │   └── index.ts               # TypeScript types
│   └── locales/
│       ├── en.json
│       ├── hi.json
│       └── mr.json
├── supabase/
│   ├── migrations/
│   │   └── 001_rebuild_schema.sql
│   └── functions/
│       ├── ai-review-generator/
│       └── gmb-poster/
├── public/
│   ├── locales/                   # i18n JSON files
│   └── assets/
└── docs/
    ├── API.md
    ├── DEPLOYMENT.md
    └── FEATURES.md
```

## 🔧 Implementation Plan

### Phase 1: Foundation (Files to Modify/Create)

#### 1.1 Update Dependencies
**File**: `package.json`

Add:
```json
{
  "dependencies": {
    "openai": "^4.20.0",
    "react-i18next": "^13.5.0",
    "i18next": "^23.7.0",
    "i18next-browser-languagedetector": "^7.2.0",
    "zustand": "^4.4.7",
    "recharts": "^2.10.3",
    "qrcode.react": "^3.1.0",
    "date-fns": "^3.0.0",
    "react-hot-toast": "^2.4.1"
  }
}
```

#### 1.2 Environment Variables
**File**: `.env`

Add:
```env
# Existing Supabase
VITE_SUPABASE_URL=your_url
VITE_SUPABASE_ANON_KEY=your_key

# New: OpenAI
VITE_OPENAI_API_KEY=your_openai_key

# New: Google My Business
VITE_GMB_CLIENT_ID=your_gmb_client_id
VITE_GMB_CLIENT_SECRET=your_gmb_client_secret
VITE_GMB_REDIRECT_URI=https://magic-qr-generator.vercel.app/auth/gmb/callback

# WhatsApp Business
VITE_WHATSAPP_NUMBER=+91XXXXXXXXXX
VITE_WHATSAPP_MESSAGE=Hi! I need help with Magic QR

# App Config
VITE_APP_URL=https://magic-qr-generator.vercel.app
```

### Phase 2: Core Services

#### 2.1 OpenAI Service
**File**: `src/services/openai.ts`

```typescript
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true // Only for development
});

export interface AIReviewSuggestion {
  id: string;
  text: string;
  rating: number;
  language: string;
}

export async function generateReviewSuggestions(
  rating: number,
  language: string = 'en',
  businessName?: string
): Promise<AIReviewSuggestion[]> {
  const languageMap = {
    en: 'English',
    hi: 'Hindi (हिंदी)',
    mr: 'Marathi (मराठी)'
  };

  const prompt = `Generate 3 authentic, natural-sounding Google review texts for a ${rating}-star rating in ${languageMap[language]}.
  
Requirements:
  - Keep each review under 100 characters
  - Make them sound like real customer feedback
  - ${rating >= 4 ? 'Positive and appreciative tone' : 'Constructive and honest'}
  - No emojis
  - Varied sentence structures
  ${businessName ? `- Mention the business: ${businessName}` : ''}
  
Return only the review texts, one per line.`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4-turbo-preview',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.9,
    max_tokens: 300
  });

  const suggestions = response.choices[0].message.content
    .split('\n')
    .filter(line => line.trim())
    .slice(0, 3)
    .map((text, index) => ({
      id: `suggestion-${index}`,
      text: text.replace(/^\d+\.\s*/, '').trim(),
      rating,
      language
    }));

  return suggestions;
}

export async function generateAutoReply(
  reviewText: string,
  rating: number,
  businessName: string,
  language: string = 'en'
): Promise<string> {
  const languageMap = {
    en: 'English',
    hi: 'Hindi (हिंदी)',
    mr: 'Marathi (मराठी)'
  };

  const prompt = `As the owner of ${businessName}, write a professional, warm auto-reply to this ${rating}-star Google review in ${languageMap[language]}:
  
  "${reviewText}"
  
  Requirements:
  - Keep it under 150 characters
  - Thank the customer
  - ${rating >= 4 ? 'Express gratitude' : 'Address concerns professionally'}
  - Encourage future visits
  - Sound natural and authentic
  
  Return only the reply text, no quotes or labels.`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4-turbo-preview',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7,
    max_tokens: 150
  });

  return response.choices[0].message.content.trim();
}
```

#### 2.2 Google My Business Service
**File**: `src/services/google-business.ts`

```typescript
import { supabase } from './supabase';

interface ReviewData {
  businessId: string;
  qrCodeId: string;
  rating: number;
  reviewText: string;
  language: string;
  customerName?: string;
}

export async function postReviewToGoogle(data: ReviewData) {
  // Step 1: Get business GMB credentials
  const { data: business, error } = await supabase
    .from('businesses')
    .select('google_place_id, gmb_access_token')
    .eq('id', data.businessId)
    .single();

  if (error || !business) {
    throw new Error('Business not found');
  }

  if (!business.gmb_access_token) {
    throw new Error('Google My Business not connected');
  }

  // Step 2: Post review via GMB API
  // Note: Direct review posting requires GMB API access
  // Alternative: Generate review link for customer to post
  
  const reviewUrl = `https://search.google.com/local/writereview?placeid=${business.google_place_id}`;

  // Step 3: Save review to database
  const { data: review, error: reviewError } = await supabase
    .from('reviews')
    .insert({
      business_id: data.businessId,
      qr_code_id: data.qrCodeId,
      rating: data.rating,
      review_text: data.reviewText,
      ai_suggestion_used: data.reviewText,
      language: data.language,
      customer_name: data.customerName,
      posted_to_google: true,
      google_review_url: reviewUrl
    })
    .select()
    .single();

  if (reviewError) {
    throw reviewError;
  }

  // Step 4: Update QR code stats
  await supabase.rpc('increment_qr_review_count', {
    qr_id: data.qrCodeId
  });

  return { review, reviewUrl };
}

export function getGoogleReviewLink(placeId: string): string {
  return `https://search.google.com/local/writereview?placeid=${placeId}`;
}

export async function initGMBOAuth() {
  const clientId = import.meta.env.VITE_GMB_CLIENT_ID;
  const redirectUri = import.meta.env.VITE_GMB_REDIRECT_URI;
  const scope = 'https://www.googleapis.com/auth/business.manage';

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&access_type=offline&prompt=consent`;

  window.location.href = authUrl;
}
```

#### 2.3 Multi-language Configuration
**File**: `src/lib/i18n.ts`

```typescript
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from '../locales/en.json';
import hi from '../locales/hi.json';
import mr from '../locales/mr.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      hi: { translation: hi },
      mr: { translation: mr }
    },
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
```

**File**: `src/locales/en.json`

```json
{
  "landing": {
    "hero_title": "Collect 10X More Google Reviews — Instantly",
    "hero_subtitle": "One Scan. One Tap. Ready-made AI suggestions and auto-reply on every review. Boost trust and local SEO with Smart CONNECT QR + Free NFC Card.",
    "get_qr_button": "Get My Smart CONNECT QR",
    "order_button": "Order Now"
  },
  "features": {
    "title": "Why Choose Magic QR?",
    "ai_powered": "AI-Powered Suggestions",
    "ai_powered_desc": "Ready-made review texts in seconds",
    "instant_post": "Instant Posting",
    "instant_post_desc": "Direct to Google, no delays",
    "multi_language": "Multi-Language",
    "multi_language_desc": "English, हिंदी, मराठी",
    "auto_reply": "Smart Auto-Reply",
    "auto_reply_desc": "Every review gets AI response",
    "nfc_cards": "Free NFC Card",
    "nfc_cards_desc": "Tap-to-review for in-person",
    "analytics": "Real-Time Analytics",
    "analytics_desc": "Track performance by location"
  },
  "review": {
    "rate_us": "Rate Your Experience",
    "select_suggestion": "Choose a review or write your own",
    "custom_review": "Write your own review",
    "post_button": "Post Review",
    "thank_you": "Thank You!",
    "review_posted": "Your review has been posted successfully"
  },
  "dashboard": {
    "total_reviews": "Total Reviews",
    "avg_rating": "Average Rating",
    "conversion_rate": "Conversion Rate",
    "recent_reviews": "Recent Reviews",
    "reviews_by_location": "Reviews by Location"
  }
}
```

**File**: `src/locales/hi.json`

```json
{
  "landing": {
    "hero_title": "10X अधिक Google Reviews तुरंत प्राप्त करें",
    "hero_subtitle": "एक स्कैन। एक टैप। तैयार AI सुझाव और हर review पर auto-reply। Smart CONNECT QR + Free NFC Card के साथ विश्वास और local SEO बढ़ाएं।",
    "get_qr_button": "अपना Smart CONNECT QR प्राप्त करें",
    "order_button": "अभी ऑर्डर करें"
  },
  "review": {
    "rate_us": "अपना अनुभव रेट करें",
    "select_suggestion": "एक review चुनें या अपना लिखें",
    "post_button": "Review पोस्ट करें",
    "thank_you": "धन्यवाद!",
    "review_posted": "आपका review सफलतापूर्वक पोस्ट हो गया है"
  }
}
```

**File**: `src/locales/mr.json`

```json
{
  "landing": {
    "hero_title": "10X अधिक Google Reviews त्वरित मिळवा",
    "hero_subtitle": "एक स्कॅन। एक टॅप। तयार AI सूचना आणि प्रत्येक review वर auto-reply। Smart CONNECT QR + Free NFC Card सह विश्वास आणि local SEO वाढवा।",
    "get_qr_button": "तुमचा Smart CONNECT QR मिळवा",
    "order_button": "आता ऑर्डर करा"
  },
  "review": {
    "rate_us": "तुमचा अनुभव रेट करा",
    "select_suggestion": "एक review निवडा किंवा तुमचा स्वतःचा लिहा",
    "post_button": "Review पोस्ट करा",
    "thank_you": "धन्यवाद!",
    "review_posted": "तुमचा review यशस्वीरित्या पोस्ट झाला आहे"
  }
}
```

## 🚀 Quick Start Guide

### Step 1: Update Dependencies
```bash
npm install openai react-i18next i18next i18next-browser-languagedetector zustand recharts qrcode.react date-fns react-hot-toast
```

### Step 2: Update Supabase Schema
Run the migration file in Supabase Dashboard:
```bash
supabase/migrations/001_rebuild_schema.sql
```

### Step 3: Add Environment Variables
Copy `.env.example` to `.env` and fill in:
- OpenAI API Key
- Google My Business credentials
- WhatsApp number

### Step 4: Create Core Files
1. Create all service files in `src/services/`
2. Create i18n configuration in `src/lib/i18n.ts`
3. Create locale files in `src/locales/`
4. Update routing in `App.tsx`

### Step 5: Build Landing Page
Update `src/pages/Index.tsx` to match Smart CONNECT QR design:
- Hero section with multi-language toggle
- Features showcase
- Before/After comparison
- Pricing section
- FAQ section
- WhatsApp CTA button

### Step 6: Build Review Collection Page
Create `src/pages/Review.tsx` at route `/r/:code`:
1. Scan detection
2. Rating selector (1-5 stars)
3. AI suggestion loader
4. Suggestion cards with one-tap selection
5. Custom review input option
6. Post confirmation
7. Thank you screen

### Step 7: Build Dashboard
Create authenticated dashboard with:
- Analytics overview
- Recent reviews list
- QR code manager
- Business settings

### Step 8: Test & Deploy
```bash
npm run build
vercel --prod
```

## 📝 Key Files to Create/Modify

### Priority 1: Core Infrastructure
- [ ] `package.json` - Add dependencies
- [ ] `.env` - Add API keys
- [ ] `src/lib/i18n.ts` - i18n setup
- [ ] `src/services/openai.ts` - AI service
- [ ] `src/services/google-business.ts` - GMB integration
- [ ] `supabase/migrations/001_rebuild_schema.sql` - New DB schema

### Priority 2: Localization
- [ ] `src/locales/en.json`
- [ ] `src/locales/hi.json`
- [ ] `src/locales/mr.json`

### Priority 3: Landing Page
- [ ] `src/pages/Index.tsx` - New landing
- [ ] `src/components/landing/Hero.tsx`
- [ ] `src/components/landing/Features.tsx`
- [ ] `src/components/landing/Pricing.tsx`
- [ ] `src/components/landing/LanguageToggle.tsx`

### Priority 4: Review Flow
- [ ] `src/pages/Review.tsx` - Main review page
- [ ] `src/components/review/RatingSelector.tsx`
- [ ] `src/components/review/AISuggestions.tsx`
- [ ] `src/components/review/ThankYou.tsx`

### Priority 5: Dashboard
- [ ] `src/pages/Dashboard.tsx`
- [ ] `src/components/dashboard/Analytics.tsx`
- [ ] `src/components/dashboard/ReviewList.tsx`
- [ ] `src/components/dashboard/QRManager.tsx`

## ✨ Feature Completion Checklist

### Must-Have (MVP)
- [ ] Multi-language support (EN/HI/MR)
- [ ] QR code generation
- [ ] AI review suggestions (OpenAI)
- [ ] Review collection flow
- [ ] Google review link redirect
- [ ] Basic analytics dashboard
- [ ] Authentication (Supabase Auth)
- [ ] WhatsApp integration

### Should-Have (Phase 2)
- [ ] Direct GMB API posting
- [ ] AI auto-reply generation
- [ ] NFC card support
- [ ] Multiple QR codes per business
- [ ] Advanced analytics
- [ ] Email notifications
- [ ] Export reports

### Nice-to-Have (Future)
- [ ] Mobile app (React Native)
- [ ] SMS notifications
- [ ] Review templates library
- [ ] A/B testing for suggestions
- [ ] Integration with other review platforms
- [ ] White-label solution

## 📊 Success Metrics

### Track These KPIs
1. **Scan-to-Review Conversion Rate**: Target 60%+
2. **Average Time to Review**: Target < 30 seconds
3. **AI Suggestion Adoption**: Target 80%+
4. **Customer Satisfaction**: Target 4.5+ stars average
5. **Daily Active Users**: Track growth

## 👥 Team Collaboration

### Git Workflow
```bash
# Create feature branch
git checkout -b feature/ai-review-suggestions

# Make changes
git add .
git commit -m "feat: Add OpenAI review generation"

# Push and create PR
git push origin feature/ai-review-suggestions
```

### Commit Convention
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation
- `style:` Formatting
- `refactor:` Code restructure
- `test:` Tests
- `chore:` Maintenance

## 🔒 Security Considerations

1. **API Keys**: Never commit to repository
2. **Rate Limiting**: Implement for OpenAI calls
3. **Input Validation**: Sanitize all user inputs
4. **RLS Policies**: Enable on all Supabase tables
5. **CORS**: Configure properly for production

## 📞 Support & Resources

- **OpenAI Docs**: https://platform.openai.com/docs
- **Supabase Docs**: https://supabase.com/docs
- **GMB API**: https://developers.google.com/my-business
- **React i18next**: https://react.i18next.com

## 🎉 Launch Checklist

- [ ] All environment variables configured
- [ ] Database migrations applied
- [ ] OpenAI API tested
- [ ] Multi-language tested (all 3 languages)
- [ ] Mobile responsive checked
- [ ] Analytics tracking verified
- [ ] WhatsApp link working
- [ ] Production deployment successful
- [ ] Custom domain configured
- [ ] SSL certificate active

---

**Built with ❤️ by Jyotirgamaya Solutions**

**Last Updated**: November 26, 2025

**Version**: 2.0.0 (Complete Rebuild)
