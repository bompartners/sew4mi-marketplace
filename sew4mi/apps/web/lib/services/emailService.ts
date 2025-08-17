export interface WelcomeEmailData {
  to: string
  name: string
  role: 'customer' | 'tailor'
}

export class EmailService {
  private apiKey: string

  constructor() {
    this.apiKey = process.env.RESEND_API_KEY || ''
  }

  /**
   * Send welcome email to new users
   */
  async sendWelcomeEmail(data: WelcomeEmailData): Promise<boolean> {
    try {
      // In development, just log the email
      if (process.env.NODE_ENV === 'development') {
        console.log('📧 Welcome email would be sent:', {
          to: data.to,
          subject: `Welcome to Sew4Mi, ${data.name}!`,
          role: data.role,
          content: this.getWelcomeEmailContent(data)
        })
        return true
      }

      // In production, send actual email via Resend
      if (!this.apiKey) {
        console.warn('RESEND_API_KEY not configured, skipping email')
        return false
      }

      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Sew4Mi <hello@sew4mi.com>',
          to: [data.to],
          subject: `Welcome to Sew4Mi, ${data.name}!`,
          html: this.getWelcomeEmailHTML(data),
        }),
      })

      if (!response.ok) {
        console.error('Failed to send welcome email:', await response.text())
        return false
      }

      return true
    } catch (error) {
      console.error('Welcome email error:', error)
      return false
    }
  }

  /**
   * Get welcome email content for different user roles
   */
  private getWelcomeEmailContent(data: WelcomeEmailData): string {
    if (data.role === 'tailor') {
      return `
        Welcome to Sew4Mi, ${data.name}!
        
        You're now part of Ghana's premier tailoring marketplace. Here's what you can do:
        
        🧵 Set up your tailor profile
        📸 Upload your portfolio
        💰 Start receiving orders
        📱 Connect with customers via WhatsApp
        
        Ready to grow your tailoring business? Complete your profile to get started!
        
        Best regards,
        The Sew4Mi Team
      `
    } else {
      return `
        Welcome to Sew4Mi, ${data.name}!
        
        You're now connected to Ghana's most skilled tailors. Here's what you can do:
        
        👔 Browse talented tailors
        📏 Upload your measurements
        🎨 Commission custom garments
        📱 Track orders via WhatsApp
        
        Ready to bring your fashion dreams to life? Start browsing tailors today!
        
        Best regards,
        The Sew4Mi Team
      `
    }
  }

  /**
   * Get welcome email HTML template
   */
  private getWelcomeEmailHTML(data: WelcomeEmailData): string {
    const content = this.getWelcomeEmailContent(data)
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to Sew4Mi</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #FFD700, #FFA500); padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .header h1 { color: white; margin: 0; font-size: 28px; }
          .content { background: white; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #ddd; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
          .btn { display: inline-block; background: #FFD700; color: #333; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }
          .features { list-style: none; padding: 0; }
          .features li { padding: 8px 0; }
          .emoji { font-size: 18px; margin-right: 8px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🇬🇭 Welcome to Sew4Mi!</h1>
          </div>
          <div class="content">
            <h2>Akwaaba, ${data.name}!</h2>
            <p>You're now part of Ghana's premier tailoring marketplace connecting skilled artisans with fashion-forward customers.</p>
            
            ${data.role === 'tailor' ? `
              <h3>As a Tailor, you can:</h3>
              <ul class="features">
                <li><span class="emoji">🧵</span> Set up your professional tailor profile</li>
                <li><span class="emoji">📸</span> Showcase your portfolio and skills</li>
                <li><span class="emoji">💰</span> Start receiving and managing orders</li>
                <li><span class="emoji">📱</span> Connect with customers via WhatsApp</li>
              </ul>
              <p>Ready to grow your tailoring business and reach more customers across Ghana?</p>
              <a href="https://sew4mi.com/dashboard" class="btn">Complete Your Profile</a>
            ` : `
              <h3>As a Customer, you can:</h3>
              <ul class="features">
                <li><span class="emoji">👔</span> Browse Ghana's most talented tailors</li>
                <li><span class="emoji">📏</span> Upload your measurements securely</li>
                <li><span class="emoji">🎨</span> Commission custom garments and styles</li>
                <li><span class="emoji">📱</span> Track your orders via WhatsApp</li>
              </ul>
              <p>Ready to bring your fashion dreams to life with authentic Ghanaian craftsmanship?</p>
              <a href="https://sew4mi.com/browse-tailors" class="btn">Browse Tailors</a>
            `}
            
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
            <p style="font-size: 14px; color: #666;">
              Need help getting started? Reply to this email or visit our help center.
            </p>
          </div>
          <div class="footer">
            <p>Celebrating Ghanaian craftsmanship, one stitch at a time.</p>
            <p>© 2025 Sew4Mi. Made with ❤️ in Ghana.</p>
          </div>
        </div>
      </body>
      </html>
    `
  }
}

export const emailService = new EmailService()