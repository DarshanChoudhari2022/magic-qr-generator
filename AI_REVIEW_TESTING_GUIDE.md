# AI Review Generation - Testing Guide

## Overview

This document provides comprehensive testing instructions for the new Groq AI-powered review generation feature in Smart CONNECT QR.

## What Was Fixed

### Previous Issue
- The review suggestion feature was returning only hardcoded static reviews
- The `aiReviewServiceV2.ts` had a placeholder `callAIAPI` method that threw an error
- No actual AI API was integrated, defeating the purpose of AI-generated suggestions

### Solution Implemented
- **Groq API Integration**: Integrated free Groq API (mixtral-8x7b-32768 model)
- **Dynamic Review Generation**: Reviews are now generated based on business name and category
- **Smart Fallback**: If Groq API fails, falls back to curated static reviews
- **Service Layer**: Proper abstraction in `aiReviewServiceV2.ts`
- **Component Integration**: `ReviewLanding.tsx` now calls the AI service

## Prerequisites

### 1. Groq API Key
Ensure your `.env` file contains:
```env
VITE_GROQ_API_KEY=your_groq_api_key_here
```

**To get a free Groq API key:**
1. Visit https://console.groq.com/keys
2. Sign up for a free account
3. Create an API key
4. Add it to your `.env` file
5. Restart your development server

### 2. Environment Setup
- Node.js 16+ installed
- Vite development server running
- Supabase connection working (for campaign data)

## Testing Steps

### Step 1: Verify API Key is Configured

**Browser Console Test:**
```javascript
// Open browser DevTools (F12)
// Go to Console tab
// Run this command:
import { aiReviewService } from '@/services/aiReviewServiceV2';
console.log('AI Service Enabled:', aiReviewService.isEnabled());
console.log('Service Status:', aiReviewService.getStatus());
```

**Expected Output:**
```
AI Service Enabled: true
Service Status: {
  enabled: true,
  rateLimitStatus: { perMinute: 10, perHour: 100 },
  cacheSize: 0
}
```

If `enabled: false`, check that `VITE_GROQ_API_KEY` is set in `.env`.

### Step 2: Test Review Generation Directly

**In Browser Console:**
```javascript
import { aiReviewService } from '@/services/aiReviewServiceV2';

// Test basic review generation
const reviews = await aiReviewService.generateReviews({
  businessName: 'Tech Solutions Inc',
  businessCategory: 'Software Development',
  numberOfReviews: 3,
  tone: 'professional',
  language: 'English'
});

console.log('Generated Reviews:', reviews);
```

**Expected Output:**
```javascript
[
  "Professional team delivered exceptional results on our project. Highly recommended!",
  "Great expertise and attention to detail. The work exceeded our expectations.",
  "Outstanding service and support throughout the engagement. Will definitely work with them again."
]
```

### Step 3: Test in ReviewLanding Component

**Testing via QR Code Scan:**

1. Create a test campaign in your dashboard
2. Generate the QR code for that campaign
3. Scan the QR code with your mobile device or camera app
4. You'll be taken to the ReviewLanding page

**Observe the following:**
- Loading spinner appears for 2-5 seconds (while generating reviews)
- After loading, the "Suggested Review" card displays AI-generated content
- The review should be unique and relevant to the business category
- "Copy" button works correctly
- "Next" button cycles through different AI-generated reviews (if 3+ were generated)

### Step 4: Test Error Handling

**Scenario A: Missing API Key**

1. Remove or comment out `VITE_GROQ_API_KEY` from `.env`
2. Restart dev server
3. Scan QR code again

**Expected Behavior:**
- "Loading..." message shows briefly
- Falls back to static fallback reviews
- Toast notification: "Using fallback reviews. AI service may not be configured."
- UI still works normally with fallback reviews

**Scenario B: API Rate Limit Exceeded**

1. In browser console, generate reviews 10+ times rapidly
2. System will enforce rate limits (10 per minute, 100 per hour)

**Expected Behavior:**
- After 10 requests in a minute, reverts to fallback reviews
- Console logs: "Rate limit: Max requests per minute exceeded"
- Application doesn't crash, provides seamless experience

**Scenario C: Groq API Temporarily Down**

1. Temporarily block the API endpoint (use browser DevTools Network throttling)
2. Generate reviews

**Expected Behavior:**
- After timeout, automatically falls back to static reviews
- Console shows error message
- User sees toast: "Using fallback reviews. AI service may not be configured."

### Step 5: Test Caching

**In Browser Console:**
```javascript
import { aiReviewService } from '@/services/aiReviewServiceV2';

// Clear cache first
aiReviewService.clearCache();

// First request (should hit API)
const reviews1 = await aiReviewService.generateReviews({
  businessName: 'Coffee Shop',
  businessCategory: 'Retail',
  numberOfReviews: 3
});
console.time('FirstRequest');

// Second request with same parameters (should use cache)
const reviews2 = await aiReviewService.generateReviews({
  businessName: 'Coffee Shop',
  businessCategory: 'Retail',
  numberOfReviews: 3
});
console.timeEnd('SecondRequest');

// Check cache status
console.log('Cache Status:', aiReviewService.getStatus());
```

**Expected Behavior:**
- First request takes 2-5 seconds (API call)
- Second request returns instantly (from cache)
- Console shows: "Returning cached reviews"
- Cache size increases in status

### Step 6: Test Different Business Categories

Test with various business types to ensure review quality:

```javascript
const categories = [
  { name: 'Digital Agency', category: 'Marketing' },
  { name: 'Green Leaf Restaurant', category: 'Food & Beverage' },
  { name: 'Smith & Associates Law Firm', category: 'Legal Services' },
  { name: 'Sunshine Dental Clinic', category: 'Healthcare' },
  { name: 'Urban Fitness Center', category: 'Fitness' }
];

for (const business of categories) {
  const reviews = await aiReviewService.generateReviews({
    businessName: business.name,
    businessCategory: business.category,
    numberOfReviews: 3,
    tone: 'professional'
  });
  console.log(`${business.category}:`, reviews);
}
```

**Expected Behavior:**
- Reviews are unique for each business type
- Reviews mention relevant aspects (e.g., "exceptional service" for restaurants, "skilled professionals" for legal)
- No duplicate reviews across categories

## Monitoring & Debugging

### Browser Console Logs

The service logs all operations:

```
[AIReviewService] Groq API initialized successfully
[AIReviewService] Starting AI review generation
[AIReviewService] Successfully generated 3 reviews
[ReviewLanding] Generated reviews: [...]
```

### Service Status

Check real-time service metrics:

```javascript
const status = aiReviewService.getStatus();
// {
//   enabled: true/false,
//   rateLimitStatus: { perMinute: 10, perHour: 100 },
//   cacheSize: 5
// }
```

### Clear Cache if Needed

```javascript
aiReviewService.clearCache();
// Console output: [AIReviewService] Cache cleared
```

## Performance Metrics

### Expected Response Times
- **First API Call**: 2-5 seconds
- **Cached Response**: <100ms
- **Fallback Response**: <50ms

### API Costs
- Groq provides free tier with generous limits
- Approximately 500,000+ free tokens per month
- Based on usage: ~33 reviews per day (with 3 reviews per request)

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "AI service disabled" message | Add `VITE_GROQ_API_KEY` to `.env`, restart server |
| Reviews are generic/low quality | Check business name and category are passed correctly |
| Rate limit errors | Reduce number of test requests, cache resets hourly |
| API timeout errors | Check internet connection, Groq API status page |
| Same reviews every time | Clear cache with `aiReviewService.clearCache()` |

## Deployment Checklist

- [ ] `VITE_GROQ_API_KEY` is set in production `.env`
- [ ] ReviewLanding imports `aiReviewService` correctly
- [ ] No console errors on QR code scan
- [ ] Reviews load within 5 seconds
- [ ] Fallback reviews appear if API is unavailable
- [ ] Copy button works on review suggestions
- [ ] Next button cycles through reviews
- [ ] Rate limiting doesn't trigger during normal usage
- [ ] Mobile and desktop experience consistent

## Files Modified

1. **src/services/aiReviewServiceV2.ts**
   - Replaced placeholder `callAIAPI` with Groq API implementation
   - Uses mixtral-8x7b-32768 model
   - Implements proper error handling and JSON parsing
   - Maintains rate limiting and caching

2. **src/pages/ReviewLanding.tsx**
   - Removed hardcoded `STATIC_REVIEWS` array
   - Added `generateAIReviews` function
   - Integrated `aiReviewService.generateReviews` call
   - Added loading states and error handling
   - Dynamic review state management

## Next Steps

1. Deploy changes to staging environment
2. Run through all test scenarios
3. Monitor console logs for errors
4. Gradually roll out to production
5. Monitor Groq API usage in console
6. Collect user feedback on review quality

## Support

For issues or questions:
1. Check browser console for error messages
2. Verify Groq API key is valid
3. Review this guide's Troubleshooting section
4. Check service status: `aiReviewService.getStatus()`
