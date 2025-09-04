// URL parameter analysis for redirect chain analysis
// Privacy-first: all analysis happens locally

export const PARAMETER_TYPES = {
  tracking: { privacy: 'low', color: 'blue', icon: '📈' },
  personal: { privacy: 'high', color: 'amber', icon: '🔍' },
  session: { privacy: 'medium', color: 'gray', icon: '🔒' },
  attribution: { privacy: 'low', color: 'green', icon: '🎯' },
  functional: { privacy: 'low', color: 'purple', icon: '⚙️' }
};

export const PARAMETER_ANALYSIS = {
  // UTM Campaign Tracking (Low Privacy Impact)
  'utm_source': { 
    type: 'attribution', 
    privacy: 'low',
    description: 'Traffic source identifier (e.g., google, newsletter)'
  },
  'utm_medium': { 
    type: 'attribution', 
    privacy: 'low',
    description: 'Marketing medium (e.g., email, social, cpc)'
  },
  'utm_campaign': { 
    type: 'attribution', 
    privacy: 'low',
    description: 'Campaign name for tracking performance'
  },
  'utm_term': { 
    type: 'attribution', 
    privacy: 'low',
    description: 'Paid search keywords'
  },
  'utm_content': { 
    type: 'attribution', 
    privacy: 'low',
    description: 'Content variation identifier'
  },
  'utm_id': { 
    type: 'attribution', 
    privacy: 'low',
    description: 'Campaign ID for analytics'
  },
  
  // Google Analytics & Ads
  'gclid': { 
    type: 'tracking', 
    privacy: 'medium',
    description: 'Google Ads click identifier'
  },
  'fbclid': { 
    type: 'tracking', 
    privacy: 'medium',
    description: 'Facebook click identifier'
  },
  'msclkid': { 
    type: 'tracking', 
    privacy: 'medium',
    description: 'Microsoft Ads click identifier'
  },
  'ttclid': { 
    type: 'tracking', 
    privacy: 'medium',
    description: 'TikTok click identifier'
  },
  
  // Personal Identifiers (High Privacy Impact)
  'user_id': { 
    type: 'personal', 
    privacy: 'high',
    description: 'Personal user identifier',
    highlight: true
  },
  'email': { 
    type: 'personal', 
    privacy: 'high',
    description: 'Email address',
    highlight: true
  },
  'customer_id': { 
    type: 'personal', 
    privacy: 'high',
    description: 'Customer account identifier',
    highlight: true
  },
  'account_id': { 
    type: 'personal', 
    privacy: 'high',
    description: 'Account identifier',
    highlight: true
  },
  'phone': { 
    type: 'personal', 
    privacy: 'high',
    description: 'Phone number',
    highlight: true
  },
  
  // Session & Authentication
  'session_id': { 
    type: 'session', 
    privacy: 'medium',
    description: 'Browser session identifier'
  },
  'token': { 
    type: 'session', 
    privacy: 'medium',
    description: 'Authentication or access token'
  },
  'auth': { 
    type: 'session', 
    privacy: 'medium',
    description: 'Authentication parameter'
  },
  'api_key': { 
    type: 'session', 
    privacy: 'medium',
    description: 'API access key'
  },
  
  // Referral & Attribution
  'ref': { 
    type: 'attribution', 
    privacy: 'low',
    description: 'Referral source'
  },
  'source': { 
    type: 'attribution', 
    privacy: 'low',
    description: 'Traffic source'
  },
  'referrer': { 
    type: 'attribution', 
    privacy: 'low',
    description: 'Referring website'
  },
  'affiliate_id': { 
    type: 'attribution', 
    privacy: 'low',
    description: 'Affiliate program identifier'
  },
  
  // Functional Parameters
  'redirect_uri': { 
    type: 'functional', 
    privacy: 'low',
    description: 'Destination after authentication'
  },
  'callback': { 
    type: 'functional', 
    privacy: 'low',
    description: 'Callback URL parameter'
  },
  'return_url': { 
    type: 'functional', 
    privacy: 'low',
    description: 'Return destination URL'
  },
  'next': { 
    type: 'functional', 
    privacy: 'low',
    description: 'Next page destination'
  },
  
  // Tracking & Analytics
  'campaign_id': { 
    type: 'tracking', 
    privacy: 'low',
    description: 'Marketing campaign identifier'
  },
  'click_id': { 
    type: 'tracking', 
    privacy: 'medium',
    description: 'Click tracking identifier'
  },
  'visitor_id': { 
    type: 'tracking', 
    privacy: 'medium',
    description: 'Visitor tracking identifier'
  },
  'experiment_id': { 
    type: 'tracking', 
    privacy: 'low',
    description: 'A/B test experiment identifier'
  },
  
  // E-commerce
  'product_id': { 
    type: 'functional', 
    privacy: 'low',
    description: 'Product identifier'
  },
  'category_id': { 
    type: 'functional', 
    privacy: 'low',
    description: 'Product category identifier'
  },
  'coupon': { 
    type: 'functional', 
    privacy: 'low',
    description: 'Discount coupon code'
  },
  'discount_code': { 
    type: 'functional', 
    privacy: 'low',
    description: 'Discount code parameter'
  }
};

export function analyzeParameters(url) {
  try {
    const urlObj = new URL(url);
    const params = [];
    let personalDataCount = 0;
    
    for (const [key, value] of urlObj.searchParams.entries()) {
      const analysis = PARAMETER_ANALYSIS[key.toLowerCase()];
      
      if (analysis) {
        const paramInfo = {
          key,
          value: value.length > 50 ? value.substring(0, 47) + '...' : value,
          fullValue: value,
          ...analysis,
          typeInfo: PARAMETER_TYPES[analysis.type]
        };
        
        if (analysis.privacy === 'high') {
          personalDataCount++;
        }
        
        params.push(paramInfo);
      } else {
        // Unknown parameter - still show it but without classification
        params.push({
          key,
          value: value.length > 50 ? value.substring(0, 47) + '...' : value,
          fullValue: value,
          type: 'unknown',
          privacy: 'unknown',
          description: 'Unknown parameter',
          typeInfo: { privacy: 'unknown', color: 'gray', icon: '❓' }
        });
      }
    }
    
    return {
      params,
      totalCount: params.length,
      personalDataCount,
      hasPersonalData: personalDataCount > 0
    };
  } catch (error) {
    return {
      params: [],
      totalCount: 0,
      personalDataCount: 0,
      hasPersonalData: false,
      error: 'Invalid URL'
    };
  }
}

export function generateParameterInsight(analysis) {
  if (analysis.totalCount === 0) {
    return null;
  }
  
  const insights = [];
  
  if (analysis.personalDataCount > 0) {
    insights.push(`Contains ${analysis.personalDataCount} personal identifier${analysis.personalDataCount > 1 ? 's' : ''}`);
  }
  
  const trackingParams = analysis.params.filter(p => p.type === 'tracking').length;
  if (trackingParams > 0) {
    insights.push(`${trackingParams} tracking parameter${trackingParams > 1 ? 's' : ''}`);
  }
  
  const attributionParams = analysis.params.filter(p => p.type === 'attribution').length;
  if (attributionParams > 0) {
    insights.push(`Campaign attribution tracking`);
  }
  
  if (insights.length === 0 && analysis.totalCount > 0) {
    insights.push('Functional parameters');
  }
  
  return insights.join(' • ');
}
