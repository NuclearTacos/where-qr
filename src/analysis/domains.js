// Domain classifications for redirect chain analysis
// Privacy-first: all analysis happens locally

export const CATEGORIES = {
  shortener: { icon: '🔗', name: 'Link Shortener' },
  analytics: { icon: '📊', name: 'Analytics' },
  advertising: { icon: '💰', name: 'Advertising' },
  social: { icon: '📱', name: 'Social Media' },
  ecommerce: { icon: '🛒', name: 'E-commerce' },
  infrastructure: { icon: '☁️', name: 'Infrastructure' },
  email: { icon: '📧', name: 'Email Service' },
  tracking: { icon: '🎯', name: 'Tracking' },
  qrservice: { icon: '▦', name: 'QR Service' }
};

export const DOMAIN_CLASSIFICATIONS = {
  // Link Shorteners
  'bit.ly': { category: 'shortener', name: 'Bitly' },
  'tinyurl.com': { category: 'shortener', name: 'TinyURL' },
  't.co': { category: 'shortener', name: 'Twitter Shortener' },
  'goo.gl': { category: 'shortener', name: 'Google Shortener' },
  'short.link': { category: 'shortener', name: 'Short.link' },
  'rebrand.ly': { category: 'shortener', name: 'Rebrandly' },
  'ow.ly': { category: 'shortener', name: 'Hootsuite Shortener' },
  'buff.ly': { category: 'shortener', name: 'Buffer Shortener' },
  'cutt.ly': { category: 'shortener', name: 'Cutt.ly' },
  's.id': { category: 'shortener', name: 'S.id' },
  'is.gd': { category: 'shortener', name: 'is.gd' },
  'v.gd': { category: 'shortener', name: 'v.gd' },
  'tiny.cc': { category: 'shortener', name: 'Tiny.cc' },
  'lnkd.in': { category: 'shortener', name: 'LinkedIn Shortener' },
  'fb.me': { category: 'shortener', name: 'Facebook Shortener' },
  'youtu.be': { category: 'shortener', name: 'YouTube Shortener' },
  'amzn.to': { category: 'shortener', name: 'Amazon Shortener' },
  'amzn.eu': { category: 'shortener', name: 'Amazon Shortener (EU)' },
  'a.co': { category: 'shortener', name: 'Amazon Shortener' },
  'qrco.de': { category: 'shortener', name: 'QR Code Short Link' },
  'qr.io': { category: 'shortener', name: 'QR.io' },
  'qrcodes.pro': { category: 'shortener', name: 'QRCodes.pro' },
  'flow.page': { category: 'shortener', name: 'Flowpage' },
  'linktr.ee': { category: 'shortener', name: 'Linktree' },
  'bl.ink': { category: 'shortener', name: 'BL.INK' },
  'rb.gy': { category: 'shortener', name: 'Rebrandly (rb.gy)' },
  'shorturl.at': { category: 'shortener', name: 'ShortURL' },
  't.ly': { category: 'shortener', name: 'T.LY' },
  'trib.al': { category: 'shortener', name: 'Tribal (SocialFlow)' },
  'dlvr.it': { category: 'shortener', name: 'dlvr.it' },
  'hubs.ly': { category: 'shortener', name: 'HubSpot Shortener' },
  'hubs.la': { category: 'shortener', name: 'HubSpot Shortener' },
  'mailchi.mp': { category: 'shortener', name: 'Mailchimp Campaign Link' },
  'eepurl.com': { category: 'shortener', name: 'Mailchimp Shortener' },

  // Affiliate networks (link-shim style, categorized as advertising)
  'click.linksynergy.com': { category: 'advertising', name: 'Rakuten Affiliate' },
  'go.skimresources.com': { category: 'advertising', name: 'Skimlinks' },

  // Facebook link shims (tracking redirectors, not the destination itself)
  'l.facebook.com': { category: 'tracking', name: 'Facebook Link Shim' },
  'l.instagram.com': { category: 'tracking', name: 'Facebook Link Shim' },
  'lm.facebook.com': { category: 'tracking', name: 'Facebook Link Shim' },

  // Analytics & Tracking
  'google-analytics.com': { category: 'analytics', name: 'Google Analytics' },
  'googletagmanager.com': { category: 'analytics', name: 'Google Tag Manager' },
  'connect.facebook.net': { category: 'analytics', name: 'Facebook Pixel' },
  'pixel.facebook.com': { category: 'analytics', name: 'Facebook Pixel' },
  'doubleclick.net': { category: 'advertising', name: 'Google Ads' },
  'googlesyndication.com': { category: 'advertising', name: 'Google AdSense' },
  'googleadservices.com': { category: 'advertising', name: 'Google Ads' },
  'amazon-adsystem.com': { category: 'advertising', name: 'Amazon Advertising' },
  'adsystem.amazon.com': { category: 'advertising', name: 'Amazon Advertising' },
  'hotjar.com': { category: 'analytics', name: 'Hotjar' },
  'mixpanel.com': { category: 'analytics', name: 'Mixpanel' },
  'segment.com': { category: 'analytics', name: 'Segment' },
  'amplitude.com': { category: 'analytics', name: 'Amplitude' },

  // Social Media
  'facebook.com': { category: 'social', name: 'Facebook' },
  'instagram.com': { category: 'social', name: 'Instagram' },
  'twitter.com': { category: 'social', name: 'Twitter' },
  'x.com': { category: 'social', name: 'X (Twitter)' },
  'linkedin.com': { category: 'social', name: 'LinkedIn' },
  'youtube.com': { category: 'social', name: 'YouTube' },
  'tiktok.com': { category: 'social', name: 'TikTok' },
  'snapchat.com': { category: 'social', name: 'Snapchat' },
  'pinterest.com': { category: 'social', name: 'Pinterest' },
  'reddit.com': { category: 'social', name: 'Reddit' },

  // E-commerce & Shopping
  'amazon.com': { category: 'ecommerce', name: 'Amazon' },
  'ebay.com': { category: 'ecommerce', name: 'eBay' },
  'etsy.com': { category: 'ecommerce', name: 'Etsy' },
  'walmart.com': { category: 'ecommerce', name: 'Walmart' },
  'target.com': { category: 'ecommerce', name: 'Target' },
  'bestbuy.com': { category: 'ecommerce', name: 'Best Buy' },
  'paypal.com': { category: 'ecommerce', name: 'PayPal' },
  'stripe.com': { category: 'ecommerce', name: 'Stripe' },

  // Email Services
  'mailchimp.com': { category: 'email', name: 'Mailchimp' },
  'constantcontact.com': { category: 'email', name: 'Constant Contact' },
  'sendinblue.com': { category: 'email', name: 'Sendinblue' },
  'mailgun.com': { category: 'email', name: 'Mailgun' },
  'sendgrid.com': { category: 'email', name: 'SendGrid' },

  // Infrastructure & CDN
  'cloudflare.com': { category: 'infrastructure', name: 'Cloudflare' },
  'amazonaws.com': { category: 'infrastructure', name: 'Amazon Web Services' },
  'azurewebsites.net': { category: 'infrastructure', name: 'Microsoft Azure' },
  'herokuapp.com': { category: 'infrastructure', name: 'Heroku' },
  'vercel.app': { category: 'infrastructure', name: 'Vercel' },
  'netlify.app': { category: 'infrastructure', name: 'Netlify' },
  'github.io': { category: 'infrastructure', name: 'GitHub Pages' },

  // Additional Tracking
  'branch.io': { category: 'tracking', name: 'Branch Deep Linking' },
  'appsflyer.com': { category: 'tracking', name: 'AppsFlyer' },
  'adjust.com': { category: 'tracking', name: 'Adjust' },

  // QR Service intermediaries (dynamic QR redirectors - the most common
  // first hop for a printed QR code)
  'qr-code-generator.com': { category: 'qrservice', name: 'QR Code Generator' },
  'qrfy.com': { category: 'qrservice', name: 'QRFY' },
  'me-qr.com': { category: 'qrservice', name: 'Me-QR' },
  'qrstuff.com': { category: 'qrservice', name: 'QR Stuff' },
  'beaconstac.com': { category: 'qrservice', name: 'Beaconstac' },
  'uniqode.com': { category: 'qrservice', name: 'Uniqode' },
  'scanova.io': { category: 'qrservice', name: 'Scanova' }
};

export const DOMAIN_PATTERNS = [
  // Shopify stores
  { pattern: /.*\.myshopify\.com$/, category: 'ecommerce', name: 'Shopify Store' },
  { pattern: /.*\.shopifypreview\.com$/, category: 'ecommerce', name: 'Shopify Preview' },

  // AWS CloudFront
  { pattern: /.*\.cloudfront\.net$/, category: 'infrastructure', name: 'AWS CloudFront' },

  // Google services
  { pattern: /.*\.googleapis\.com$/, category: 'infrastructure', name: 'Google APIs' },
  { pattern: /.*\.google\.com$/, category: 'analytics', name: 'Google Service' },

  // CDNs
  { pattern: /.*\.jsdelivr\.net$/, category: 'infrastructure', name: 'jsDelivr CDN' },
  { pattern: /.*\.unpkg\.com$/, category: 'infrastructure', name: 'unpkg CDN' },

  // Social media patterns
  { pattern: /.*\.fbcdn\.net$/, category: 'social', name: 'Facebook CDN' },
  { pattern: /.*\.twimg\.com$/, category: 'social', name: 'Twitter Images' }
];

// Categories that represent a hop the user did not intend to visit -
// intermediaries between the printed QR code and the real destination.
const INTERMEDIARY_CATEGORIES = new Set([
  'shortener',
  'qrservice',
  'tracking',
  'advertising',
  'analytics',
  'email'
]);

function normalizeHostname(hostname) {
  return String(hostname).toLowerCase().replace(/\.$/, '');
}

// Try the full hostname, then progressively strip the leftmost label
// (m.facebook.com -> facebook.com), but never test a bare TLD (a single
// remaining label).
function lookupBySuffix(hostname) {
  const labels = hostname.split('.');
  for (let i = 0; i <= labels.length - 2; i++) {
    const candidate = labels.slice(i).join('.');
    const match = DOMAIN_CLASSIFICATIONS[candidate];
    if (match) {
      return match;
    }
  }
  return null;
}

export function classifyDomain(hostname) {
  if (!hostname) {
    return null;
  }

  const normalized = normalizeHostname(hostname);

  const suffixMatch = lookupBySuffix(normalized);
  if (suffixMatch) {
    return {
      name: suffixMatch.name,
      category: CATEGORIES[suffixMatch.category],
      categoryKey: suffixMatch.category
    };
  }

  for (const pattern of DOMAIN_PATTERNS) {
    if (pattern.pattern.test(normalized)) {
      return {
        name: pattern.name,
        category: CATEGORIES[pattern.category],
        categoryKey: pattern.category
      };
    }
  }

  // No classification found
  return null;
}

// True when the classification represents a known intermediary hop - a
// shortener, QR redirector, tracker, ad network, analytics pixel, or email
// service the user did not intend to visit.
export function isKnownIntermediary(classification) {
  if (!classification || !classification.categoryKey) {
    return false;
  }
  return INTERMEDIARY_CATEGORIES.has(classification.categoryKey);
}
