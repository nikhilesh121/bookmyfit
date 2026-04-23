import { Injectable, Logger } from '@nestjs/common';

/**
 * Email service powered by Resend (https://resend.com).
 * Set RESEND_API_KEY in .env to enable real sending.
 * Falls back to logging in dev when key is not set.
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger('EmailService');
  private readonly apiKey = process.env.RESEND_API_KEY || '';
  private readonly from = process.env.EMAIL_FROM || 'BookMyFit <noreply@bookmyfit.in>';
  private readonly baseUrl = 'https://api.resend.com/emails';

  async sendRaw(to: string, subject: string, html: string): Promise<boolean> {
    if (!this.apiKey) {
      this.logger.log(`[DEV EMAIL] To: ${to} | Subject: ${subject}`);
      return true;
    }
    try {
      const res = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ from: this.from, to: [to], subject, html }),
      });
      if (!res.ok) {
        const err = await res.text();
        this.logger.warn(`Resend error: ${err}`);
        return false;
      }
      return true;
    } catch (err: any) {
      this.logger.error(`Email send failed: ${err.message}`);
      return false;
    }
  }

  async sendGymRegistered(opts: { gymName: string; ownerName: string; email: string }) {
    const html = `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;background:#0a0a0a;color:#fff;padding:32px;border-radius:12px">
        <div style="color:#3DFF54;font-size:22px;font-weight:700;margin-bottom:8px">BookMyFit</div>
        <h2 style="margin:0 0 16px">Welcome, ${opts.gymName}! 🎉</h2>
        <p style="color:#aaa">Hi ${opts.ownerName},</p>
        <p style="color:#aaa">Your gym has been registered on BookMyFit. Our team will review your KYC documents and activate your profile within 24-48 hours.</p>
        <p style="color:#aaa">Once approved, members will be able to discover and book sessions at your gym.</p>
        <div style="background:#111;border:1px solid #222;border-radius:8px;padding:16px;margin:20px 0">
          <strong>Next steps:</strong>
          <ol style="color:#aaa;margin:8px 0 0;padding-left:18px">
            <li>Complete KYC verification in your Gym Portal</li>
            <li>Set up your gym plans and pricing</li>
            <li>Add your gym photos and amenities</li>
          </ol>
        </div>
        <a href="${process.env.GYM_PANEL_URL || 'https://gym.bookmyfit.in'}" style="display:inline-block;background:#3DFF54;color:#000;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700">Go to Gym Portal →</a>
        <p style="color:#555;font-size:12px;margin-top:24px">BookMyFit Technologies Pvt Ltd · Mumbai, India</p>
      </div>`;
    return this.sendRaw(opts.email, `Welcome to BookMyFit – ${opts.gymName}!`, html);
  }

  async sendCorporateRegistered(opts: { companyName: string; adminName: string; email: string }) {
    const html = `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;background:#0a0a0a;color:#fff;padding:32px;border-radius:12px">
        <div style="color:#3DFF54;font-size:22px;font-weight:700;margin-bottom:8px">BookMyFit</div>
        <h2 style="margin:0 0 16px">Corporate Account Created! 🏢</h2>
        <p style="color:#aaa">Hi ${opts.adminName},</p>
        <p style="color:#aaa">Your corporate wellness account for <strong>${opts.companyName}</strong> is ready. You can now add employees and manage their multi-gym access.</p>
        <div style="background:#111;border:1px solid #222;border-radius:8px;padding:16px;margin:20px 0">
          <p style="color:#aaa;margin:0">Pricing: <strong style="color:#3DFF54">₹999/employee/month</strong> for Multi-Gym access to all BookMyFit locations.</p>
        </div>
        <a href="${process.env.CORP_PANEL_URL || 'https://corporate.bookmyfit.in'}" style="display:inline-block;background:#3DFF54;color:#000;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700">Go to Corporate Portal →</a>
        <p style="color:#555;font-size:12px;margin-top:24px">BookMyFit Technologies Pvt Ltd · Mumbai, India</p>
      </div>`;
    return this.sendRaw(opts.email, `BookMyFit Corporate – Welcome ${opts.companyName}!`, html);
  }

  async sendSubscriptionConfirmation(opts: {
    userName: string;
    email: string;
    planName: string;
    amount: number;
    durationMonths: number;
    endDate: string;
    invoiceNumber?: string;
  }) {
    const html = `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;background:#0a0a0a;color:#fff;padding:32px;border-radius:12px">
        <div style="color:#3DFF54;font-size:22px;font-weight:700;margin-bottom:8px">BookMyFit</div>
        <h2 style="margin:0 0 16px">Subscription Confirmed! ✅</h2>
        <p style="color:#aaa">Hi ${opts.userName},</p>
        <p style="color:#aaa">Your <strong>${opts.planName}</strong> subscription is now active.</p>
        <div style="background:#111;border:1px solid #222;border-radius:8px;padding:16px;margin:20px 0">
          <table style="width:100%;color:#aaa;font-size:14px;border-collapse:collapse">
            <tr><td style="padding:6px 0">Plan</td><td style="text-align:right;color:#fff">${opts.planName}</td></tr>
            <tr><td style="padding:6px 0">Duration</td><td style="text-align:right;color:#fff">${opts.durationMonths} month${opts.durationMonths > 1 ? 's' : ''}</td></tr>
            <tr><td style="padding:6px 0">Valid Until</td><td style="text-align:right;color:#fff">${opts.endDate}</td></tr>
            <tr><td style="padding:6px 0">Amount Paid</td><td style="text-align:right;color:#3DFF54;font-weight:700">₹${opts.amount.toLocaleString('en-IN')}</td></tr>
            ${opts.invoiceNumber ? `<tr><td style="padding:6px 0">Invoice</td><td style="text-align:right;color:#fff">${opts.invoiceNumber}</td></tr>` : ''}
          </table>
        </div>
        <p style="color:#aaa;font-size:13px">Open the BookMyFit app to generate your QR code and start checking in at gyms.</p>
        <p style="color:#555;font-size:12px;margin-top:24px">BookMyFit Technologies Pvt Ltd · Mumbai, India</p>
      </div>`;
    return this.sendRaw(opts.email, `Subscription Active – ${opts.planName}`, html);
  }

  async sendKycStatusUpdate(opts: { gymName: string; email: string; status: 'approved' | 'rejected' | 'pending'; reason?: string }) {
    const statusMap = {
      approved: { emoji: '✅', title: 'KYC Approved!', msg: 'Your gym is now live on BookMyFit. Members can discover and book sessions.' },
      rejected: { emoji: '❌', title: 'KYC Rejected', msg: `Unfortunately your KYC was not approved. Reason: ${opts.reason || 'Please contact support.'}` },
      pending: { emoji: '⏳', title: 'KYC Under Review', msg: "Your KYC documents are under review. We'll notify you within 24-48 hours." },
    };
    const info = statusMap[opts.status];
    const html = `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;background:#0a0a0a;color:#fff;padding:32px;border-radius:12px">
        <div style="color:#3DFF54;font-size:22px;font-weight:700;margin-bottom:8px">BookMyFit</div>
        <h2 style="margin:0 0 16px">${info.emoji} ${info.title}</h2>
        <p style="color:#aaa">Hi ${opts.gymName} team,</p>
        <p style="color:#aaa">${info.msg}</p>
        <a href="${process.env.GYM_PANEL_URL || 'https://gym.bookmyfit.in'}/kyc" style="display:inline-block;background:#3DFF54;color:#000;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700">View KYC Status →</a>
        <p style="color:#555;font-size:12px;margin-top:24px">BookMyFit Technologies Pvt Ltd · Mumbai, India</p>
      </div>`;
    return this.sendRaw(opts.email, `BookMyFit KYC – ${info.title}`, html);
  }
}
