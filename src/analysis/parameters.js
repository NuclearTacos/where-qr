// URL parameter analysis for redirect chain analysis
// Privacy-first: all analysis happens locally

export const PARAMETER_TYPES = {
  tracking: { privacy: 'low', color: 'blue', icon: '📈' },
  personal: { privacy: 'high', color: 'amber', icon: '🔍' },
  session: { privacy: 'medium', color: 'gray', icon: '🔒' },
  attribution: { privacy: 'low', color: 'green', icon: '🎯' },
  functional: { privacy: 'low', color: 'purple', icon: '⚙️' }
};

const UNKNOWN_TYPE_INFO = { privacy: 'unknown', color: 'gray', icon: '❓' };

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
  'yclid': {
    type: 'tracking',
    privacy: 'medium',
    description: 'Yandex click identifier'
  },
  'dclid': {
    type: 'tracking',
    privacy: 'medium',
    description: 'Google Display click identifier'
  },
  'gbraid': {
    type: 'tracking',
    privacy: 'medium',
    description: 'Google Ads click identifier (iOS)'
  },
  'wbraid': {
    type: 'tracking',
    privacy: 'medium',
    description: 'Google Ads click identifier (web-to-app)'
  },
  'twclid': {
    type: 'tracking',
    privacy: 'medium',
    description: 'Twitter/X click identifier'
  },
  'li_fat_id': {
    type: 'tracking',
    privacy: 'medium',
    description: 'LinkedIn click identifier'
  },
  'igshid': {
    type: 'tracking',
    privacy: 'medium',
    description: 'Instagram share identifier'
  },
  'si': {
    type: 'tracking',
    privacy: 'low',
    description: 'Spotify/YouTube share identifier'
  },
  'vero_id': {
    type: 'tracking',
    privacy: 'medium',
    description: 'Vero tracking identifier'
  },
  'wickedid': {
    type: 'tracking',
    privacy: 'medium',
    description: 'WickedReports tracking identifier'
  },
  '_ga': {
    type: 'tracking',
    privacy: 'medium',
    description: 'Cross-domain Google Analytics linker'
  },
  '_gl': {
    type: 'tracking',
    privacy: 'medium',
    description: 'Cross-domain Google Analytics linker'
  },

  // HubSpot
  '_hsenc': {
    type: 'tracking',
    privacy: 'medium',
    description: 'HubSpot tracking parameter'
  },
  '_hsmi': {
    type: 'tracking',
    privacy: 'medium',
    description: 'HubSpot tracking parameter'
  },

  // Mailchimp
  'mc_cid': {
    type: 'attribution',
    privacy: 'low',
    description: 'Mailchimp campaign identifier'
  },
  'mc_eid': {
    type: 'personal',
    privacy: 'high',
    description: 'Mailchimp subscriber/email identifier',
    highlight: true
  },

  // Omeda
  'oly_enc_id': {
    type: 'personal',
    privacy: 'high',
    description: 'Omeda subscriber identifier',
    highlight: true
  },
  'oly_anon_id': {
    type: 'personal',
    privacy: 'high',
    description: 'Omeda subscriber identifier',
    highlight: true
  },

  // Matomo
  'pk_campaign': {
    type: 'attribution',
    privacy: 'low',
    description: 'Matomo campaign attribution'
  },
  'pk_kwd': {
    type: 'attribution',
    privacy: 'low',
    description: 'Matomo campaign attribution'
  },
  'mtm_campaign': {
    type: 'attribution',
    privacy: 'low',
    description: 'Matomo campaign attribution'
  },

  // Affiliate / sub-affiliate identifiers
  'sub_id': {
    type: 'attribution',
    privacy: 'low',
    description: 'Affiliate sub-identifier'
  },
  'subid': {
    type: 'attribution',
    privacy: 'low',
    description: 'Affiliate sub-identifier'
  },
  'aff_id': {
    type: 'attribution',
    privacy: 'low',
    description: 'Affiliate identifier'
  },
  'affid': {
    type: 'attribution',
    privacy: 'low',
    description: 'Affiliate identifier'
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
  'zip': {
    type: 'personal',
    privacy: 'high',
    description: 'Postal/ZIP code',
    highlight: true
  },
  'postal': {
    type: 'personal',
    privacy: 'high',
    description: 'Postal/ZIP code',
    highlight: true
  },
  'name': {
    type: 'personal',
    privacy: 'high',
    description: 'Personal name',
    highlight: true
  },
  'first_name': {
    type: 'personal',
    privacy: 'high',
    description: 'Personal name',
    highlight: true
  },
  'last_name': {
    type: 'personal',
    privacy: 'high',
    description: 'Personal name',
    highlight: true
  },
  'fname': {
    type: 'personal',
    privacy: 'high',
    description: 'Personal name',
    highlight: true
  },
  'lname': {
    type: 'personal',
    privacy: 'high',
    description: 'Personal name',
    highlight: true
  },
  'uid': {
    type: 'personal',
    privacy: 'high',
    description: 'Personal identifier',
    highlight: true
  },
  'userid': {
    type: 'personal',
    privacy: 'high',
    description: 'Personal identifier',
    highlight: true
  },
  'cid': {
    type: 'personal',
    privacy: 'high',
    description: 'Personal identifier',
    highlight: true
  },
  'contact_id': {
    type: 'personal',
    privacy: 'high',
    description: 'Personal identifier',
    highlight: true
  },
  'member_id': {
    type: 'personal',
    privacy: 'high',
    description: 'Personal identifier',
    highlight: true
  },
  'subscriber_id': {
    type: 'personal',
    privacy: 'high',
    description: 'Personal identifier',
    highlight: true
  },
  'lead_id': {
    type: 'personal',
    privacy: 'high',
    description: 'Personal identifier',
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

// Prefix/suffix key families (checked only when there is no exact table entry)
const EMAIL_KEY_PATTERN = /^(.*_)?(email|e?mail)$/;

// Value heuristics (checked only when there is no key match at all)
const EMAIL_VALUE_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_LIKE_PATTERN = /^\d{10,}$/;
const JWT_PATTERN = /^[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const URL_VALUE_PATTERN = /^https?:\/\//i;
const BLOB_PATTERN = /^[A-Za-z0-9+/=_-]{20,}$/;

function classifyParamKey(lowerKey) {
  const exact = PARAMETER_ANALYSIS[lowerKey];
  if (exact) {
    return exact;
  }

  if (lowerKey.startsWith('utm_')) {
    return { type: 'attribution', privacy: 'low', description: 'UTM campaign parameter' };
  }

  if (EMAIL_KEY_PATTERN.test(lowerKey)) {
    return { type: 'personal', privacy: 'high', description: 'Email address', highlight: true };
  }

  if (lowerKey.endsWith('clid')) {
    return { type: 'tracking', privacy: 'medium', description: 'Ad click identifier' };
  }

  return null;
}

function classifyParamValue(value) {
  if (EMAIL_VALUE_PATTERN.test(value)) {
    return { type: 'personal', privacy: 'high', description: 'Email address (detected in value)', highlight: true };
  }

  if (PHONE_LIKE_PATTERN.test(value)) {
    return { type: 'personal', privacy: 'medium', description: 'Possible phone number or account id' };
  }

  if (JWT_PATTERN.test(value)) {
    return { type: 'session', privacy: 'medium', description: 'JSON Web Token' };
  }

  if (UUID_PATTERN.test(value)) {
    return { type: 'tracking', privacy: 'medium', description: 'Unique identifier' };
  }

  if (URL_VALUE_PATTERN.test(value)) {
    return { type: 'functional', privacy: 'low', description: 'Embedded URL' };
  }

  if (BLOB_PATTERN.test(value)) {
    return { type: 'tracking', privacy: 'medium', description: 'Opaque identifier' };
  }

  return null;
}

// Single source of truth for classifying a parameter, shared by
// analyzeParameters (display) and redactUrl (redaction) so the two never
// drift out of sync.
function classifyParam(key, value) {
  const lowerKey = key.toLowerCase();

  const keyMatch = classifyParamKey(lowerKey);
  if (keyMatch) {
    return keyMatch;
  }

  const valueMatch = classifyParamValue(value);
  if (valueMatch) {
    return valueMatch;
  }

  return { type: 'unknown', privacy: 'unknown', description: 'Unrecognised parameter' };
}

function emptyByType() {
  return { attribution: 0, tracking: 0, personal: 0, session: 0, functional: 0, unknown: 0 };
}

export function analyzeParameters(url) {
  try {
    const urlObj = new URL(url);
    const params = [];
    let personalDataCount = 0;
    const byType = emptyByType();

    for (const [key, value] of urlObj.searchParams.entries()) {
      const classification = classifyParam(key, value);
      const truncated = value.length > 50;

      const paramInfo = {
        key,
        value: truncated ? value.substring(0, 47) + '...' : value,
        fullValue: value,
        truncated,
        ...classification,
        typeInfo: PARAMETER_TYPES[classification.type] || UNKNOWN_TYPE_INFO
      };

      if (classification.privacy === 'high') {
        personalDataCount++;
      }

      if (Object.prototype.hasOwnProperty.call(byType, classification.type)) {
        byType[classification.type]++;
      }

      params.push(paramInfo);
    }

    return {
      params,
      totalCount: params.length,
      personalDataCount,
      hasPersonalData: personalDataCount > 0,
      byType
    };
  } catch {
    return {
      params: [],
      totalCount: 0,
      personalDataCount: 0,
      hasPersonalData: false,
      byType: emptyByType(),
      error: 'Invalid URL'
    };
  }
}

export function generateParameterInsight(analysis) {
  if (!analysis || analysis.totalCount === 0) {
    return null;
  }

  const insights = [];

  if (analysis.personalDataCount > 0) {
    insights.push(`${analysis.personalDataCount} personal identifier${analysis.personalDataCount > 1 ? 's' : ''}`);
  }

  const trackingCount = analysis.byType ? analysis.byType.tracking : analysis.params.filter(p => p.type === 'tracking').length;
  if (trackingCount > 0) {
    insights.push(`${trackingCount} tracking ID${trackingCount > 1 ? 's' : ''}`);
  }

  const attributionCount = analysis.byType ? analysis.byType.attribution : analysis.params.filter(p => p.type === 'attribution').length;
  if (attributionCount > 0) {
    insights.push('campaign attribution');
  }

  if (insights.length === 0) {
    insights.push('functional parameters');
  }

  return insights.join(' · ');
}

// Returns the URL with the VALUE of any high-privacy (personal) or session
// param replaced by '•••'. Used by the UI's copy/share buttons so people
// don't paste emails or tokens around. Non-sensitive values (e.g. utm_*)
// are left untouched. Falls back to returning the input unchanged if it
// isn't a valid URL.
export function redactUrl(url) {
  try {
    const urlObj = new URL(url);
    const entries = [...urlObj.searchParams.entries()];

    if (entries.length === 0) {
      return url;
    }

    const parts = entries.map(([key, value]) => {
      const classification = classifyParam(key, value);
      const shouldRedact = classification.privacy === 'high' || classification.type === 'session';
      const encodedValue = shouldRedact ? '•••' : encodeURIComponent(value);
      return `${encodeURIComponent(key)}=${encodedValue}`;
    });

    return `${urlObj.origin}${urlObj.pathname}?${parts.join('&')}${urlObj.hash}`;
  } catch {
    return url;
  }
}
