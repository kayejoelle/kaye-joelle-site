{
  "buildCommand": null,
  "outputDirectory": "public",
  "cleanUrls": true,
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "Strict-Transport-Security", "value": "max-age=63072000; includeSubDomains" },
        { "key": "Permissions-Policy", "value": "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
        {
          "key": "Content-Security-Policy",
          "value": "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https://res.cloudinary.com; media-src 'self' https://res.cloudinary.com; connect-src 'self' https://*.supabase.co https://api.cloudinary.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'"
        }
      ]
    },
    {
      "source": "/css/(.*)",
      "headers": [{ "key": "Cache-Control", "value": "public, max-age=3600, must-revalidate" }]
    },
    {
      "source": "/js/(.*)",
      "headers": [{ "key": "Cache-Control", "value": "public, max-age=3600, must-revalidate" }]
    }
  ]
}