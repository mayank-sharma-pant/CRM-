CATALOG = {
    "scoring": {
        "slug": "scoring",
        "name": "Lead & deal scoring",
        "summary": "Rules that score leads and deals from your own fields.",
        "settings_href": "/settings/scoring",
    },
    "predictions": {
        "slug": "predictions",
        "name": "Predictive AI",
        "summary": "Win-probability and churn risk from closed deals and invoices.",
        "settings_href": "/settings/predictions",
    },
    "accounting": {
        "slug": "accounting",
        "name": "Tally / QuickBooks",
        "summary": "One-way invoice push to accounting (stub until live keys).",
        "settings_href": "/settings/accounting",
    },
    "custom_modules": {
        "slug": "custom_modules",
        "name": "Custom modules",
        "summary": "Company-defined objects with their own fields and records.",
        "settings_href": "/settings/modules",
    },
    "email": {
        "slug": "email",
        "name": "Email sync",
        "summary": "Connect Gmail or Outlook to send and log mail on records.",
        "settings_href": "/settings/email",
    },
    "calendar": {
        "slug": "calendar",
        "name": "Calendar sync",
        "summary": "Google or Microsoft calendar for site visits and meetings.",
        "settings_href": "/settings/calendar",
    },
    "whatsapp": {
        "slug": "whatsapp",
        "name": "WhatsApp",
        "summary": "Templates, inbound messages, and reminder sequences.",
        "settings_href": "/settings/whatsapp",
    },
    "telephony": {
        "slug": "telephony",
        "name": "Click-to-call",
        "summary": "Exotel: dial the agent then the customer from a lead or deal.",
        "settings_href": "/settings/telephony",
    },
    "webhooks": {
        "slug": "webhooks",
        "name": "Outbound webhooks",
        "summary": "Push CRM events to your own HTTPS endpoints.",
        "settings_href": "/settings/webhooks",
    },
}


def get_app(slug: str):
    return CATALOG.get(slug)
