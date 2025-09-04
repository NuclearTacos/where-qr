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
  tracking: { icon: '🎯', name: 'Tracking' }
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
  
  // Analytics & Tracking
  'google-analytics.com': { category: 'analytics', name: 'Google Analytics' },
  'googletagmanager.com': { category: 'analytics', name: 'Google Tag Manager' },
  'facebook.com': { category: 'analytics', name: 'Facebook Tracking' },
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
  'adjust.com': { category: 'tracking', name: 'Adjust' }
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
  { pattern: /.*\.twimg\.com$/, category: 'social', name: 'Twitter Images' },
  
  // More shortener patterns
  { pattern: /^[a-z0-9]{4,8}\.(com|net|org)$/, category: 'shortener', name: 'Short Domain' }
];

export function classifyDomain(hostname) {
  // Check exact matches first
  const exactMatch = DOMAIN_CLASSIFICATIONS[hostname];
  if (exactMatch) {
    return {
      ...exactMatch,
      category: CATEGORIES[exactMatch.category]
    };
  }
  
  // Check patterns
  for (const pattern of DOMAIN_PATTERNS) {
    if (pattern.pattern.test(hostname)) {
      return {
        name: pattern.name,
        category: CATEGORIES[pattern.category]
      };
    }
  }
  
  // No classification found
  return null;
}
