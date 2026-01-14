/**
 * Cloudflare Worker - Contact Form Handler
 * 
 * SETUP INSTRUCTIONS:
 * 1. Go to https://dash.cloudflare.com → Workers & Pages → Create Worker
 * 2. Paste this code into the worker editor
 * 3. Go to Settings → Variables → Add Environment Variable:
 *    - Name: RESEND_API_KEY
 *    - Value: your Resend API key (from https://resend.com/api-keys)
 * 4. Add another variable:
 *    - Name: TO_EMAIL
 *    - Value: your email address where you want to receive messages
 * 5. Add KV Namespace binding:
 *    - Variable name: CONTACT_RATE_LIMIT
 *    - Select your KV namespace
 * 6. Deploy the worker and copy its URL (e.g., https://contact-form.yourname.workers.dev)
 * 7. Update YOUR_WORKER_URL in main.js with this URL
 */

// Rate limiting config
const RATE_LIMIT_MAX = 5;           // Max requests per window
const RATE_LIMIT_WINDOW = 60 * 60;  // Window in seconds (1 hour)

export default {
  async fetch(request, env) {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    // Only allow POST
    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    try {
      // Rate limiting check
      const clientIP = request.headers.get('CF-Connecting-IP') || 'unknown';
      const rateLimitKey = `rate:${clientIP}`;
      
      if (env.CONTACT_RATE_LIMIT) {
        const currentCount = await env.CONTACT_RATE_LIMIT.get(rateLimitKey);
        const count = currentCount ? parseInt(currentCount, 10) : 0;
        
        if (count >= RATE_LIMIT_MAX) {
          return new Response(JSON.stringify({ error: 'Too many requests. Please try again later.' }), {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
          });
        }
        
        // Increment counter (expires after window)
        await env.CONTACT_RATE_LIMIT.put(rateLimitKey, String(count + 1), {
          expirationTtl: RATE_LIMIT_WINDOW,
        });
      }

      const { name, email, message, website } = await request.json();

      // Honeypot check - if filled, it's a bot
      if (website) {
        // Pretend success to not alert the bot
        return new Response(JSON.stringify({ success: true }), {
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        });
      }

      // Basic validation
      if (!name || !email || !message) {
        return new Response(JSON.stringify({ error: 'Missing required fields' }), {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        });
      }

      // Send email via Resend
      const resendResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Portfolio Contact <contact@chrisjlin.com>',
          to: env.TO_EMAIL,
          subject: `Portfolio Contact: ${name}`,
          reply_to: email,
          text: `New message from your portfolio contact form:\n\nName: ${name}\nEmail: ${email}\n\nMessage:\n${message}`,
          html: `
            <h2>New Portfolio Contact</h2>
            <p><strong>Name:</strong> ${escapeHtml(name)}</p>
            <p><strong>Email:</strong> <a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></p>
            <hr>
            <p><strong>Message:</strong></p>
            <p style="white-space: pre-wrap;">${escapeHtml(message)}</p>
          `,
        }),
      });

      if (!resendResponse.ok) {
        const error = await resendResponse.text();
        console.error('Resend error:', error);
        throw new Error('Failed to send email');
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });

    } catch (error) {
      console.error('Worker error:', error);
      return new Response(JSON.stringify({ error: 'Failed to send message' }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }
  },
};

// Helper to prevent XSS in HTML email
function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
