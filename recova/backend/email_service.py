import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from datetime import datetime


def _score_theme(score):
    if score >= 70:
        return {'color': '#5F7A42', 'bg': '#EEF4E8', 'label': 'Great Form'}
    if score >= 40:
        return {'color': '#A07A14', 'bg': '#FEF9EC', 'label': 'Good Effort'}
    return {'color': '#C0524A', 'bg': '#FCE8E7', 'label': 'Needs Work'}


def build_email_html(patient_name, patient_email, form_score, total_reps, summary, reps):
    score = round(form_score)
    theme = _score_theme(score)
    first_name = patient_name.split()[0] if patient_name else 'there'
    date_str = datetime.now().strftime('%B %d, %Y')

    # Rep breakdown rows (max 8 shown)
    rep_cells = ''
    for rep in reps[:8]:
        s = rep.get('form_score', 0)
        t = _score_theme(s)
        label = 'Perfect' if s >= 80 else 'Good' if s >= 60 else 'Adjust'
        rep_cells += f"""
        <td align="center" style="padding:6px 8px;vertical-align:top;">
          <div style="width:48px;height:48px;border-radius:24px;background:{t['bg']};border:2px solid {t['color']};margin:0 auto 5px;line-height:44px;text-align:center;">
            <span style="font-size:13px;font-weight:800;color:{t['color']};">{round(s)}</span>
          </div>
          <div style="font-size:10px;font-weight:700;color:{t['color']};text-transform:uppercase;letter-spacing:0.04em;">{label}</div>
          <div style="font-size:10px;color:#78716C;">Rep {rep.get('rep_number', '')}</div>
        </td>"""

    reps_section = f"""
        <tr>
          <td style="padding:0 40px 32px;">
            <p style="font-size:11px;font-weight:700;color:#78716C;text-transform:uppercase;letter-spacing:0.1em;margin:0 0 14px;">Rep Breakdown</p>
            <table cellpadding="0" cellspacing="0" style="width:100%;">
              <tr>{rep_cells}</tr>
            </table>
          </td>
        </tr>""" if reps else ''

    coach_section = f"""
        <tr>
          <td style="padding:0 40px 32px;">
            <table cellpadding="0" cellspacing="0" style="width:100%;background:#FDF5F3;border-radius:12px;overflow:hidden;">
              <tr>
                <td style="padding:3px 0 0 0;background:#C2523A;border-radius:12px 12px 0 0;"></td>
              </tr>
              <tr>
                <td style="padding:20px 24px;background:#FDF5F3;border-radius:0 0 12px 12px;">
                  <p style="font-size:11px;font-weight:700;color:#C2523A;text-transform:uppercase;letter-spacing:0.1em;margin:0 0 10px;">Coach's Notes</p>
                  <p style="font-size:16px;color:#1C1917;line-height:1.7;margin:0;">{summary}</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>""" if summary else ''

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Recova Session Summary</title>
</head>
<body style="margin:0;padding:0;background:#FAF5EE;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" style="background:#FAF5EE;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#FFFFFF;border-radius:20px;overflow:hidden;box-shadow:0 4px 32px rgba(28,25,23,0.10);">

        <!-- Header -->
        <tr>
          <td style="background:#C2523A;padding:28px 40px;">
            <table cellpadding="0" cellspacing="0" width="100%">
              <tr>
                <td>
                  <span style="color:#FFFFFF;font-size:22px;font-weight:800;letter-spacing:-0.5px;">Recova</span>
                  <div style="color:rgba(255,255,255,0.7);font-size:13px;margin-top:3px;">Your AI Physical Therapy Coach</div>
                </td>
                <td align="right">
                  <span style="color:rgba(255,255,255,0.6);font-size:13px;">{date_str}</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Hero -->
        <tr>
          <td style="padding:44px 40px 32px;text-align:center;">
            <p style="font-size:13px;font-weight:700;color:#78716C;text-transform:uppercase;letter-spacing:0.1em;margin:0 0 10px;">Session Summary</p>
            <h1 style="font-size:34px;font-weight:800;color:#1C1917;margin:0 0 6px;line-height:1.1;">Well done, {first_name}.</h1>
            <p style="font-size:17px;color:#78716C;margin:0 0 32px;line-height:1.5;">Here's how your session went today.</p>

            <!-- Score ring -->
            <div style="display:inline-block;text-align:center;margin-bottom:8px;">
              <div style="width:110px;height:110px;border-radius:55px;border:5px solid {theme['color']};background:{theme['bg']};margin:0 auto;line-height:100px;text-align:center;display:inline-block;">
                <span style="font-size:40px;font-weight:800;color:{theme['color']};line-height:100px;">{score}</span>
              </div>
            </div>
            <div style="font-size:15px;font-weight:700;color:{theme['color']};margin-bottom:0;">{theme['label']}</div>
          </td>
        </tr>

        <!-- Stats -->
        <tr>
          <td style="padding:0 40px 32px;">
            <table cellpadding="0" cellspacing="0" style="width:100%;background:#FAF5EE;border-radius:14px;overflow:hidden;">
              <tr>
                <td style="padding:22px 28px;text-align:center;border-right:2px solid #F0E8D8;">
                  <div style="font-size:42px;font-weight:800;color:#1C1917;line-height:1;">{total_reps}</div>
                  <div style="font-size:11px;font-weight:700;color:#78716C;text-transform:uppercase;letter-spacing:0.08em;margin-top:6px;">Total Reps</div>
                </td>
                <td style="padding:22px 28px;text-align:center;">
                  <div style="font-size:42px;font-weight:800;color:#1C1917;line-height:1;">{score}%</div>
                  <div style="font-size:11px;font-weight:700;color:#78716C;text-transform:uppercase;letter-spacing:0.08em;margin-top:6px;">Average Form</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        {coach_section}
        {reps_section}

        <!-- CTA -->
        <tr>
          <td style="padding:0 40px 40px;text-align:center;">
            <a href="http://localhost:5173" style="display:inline-block;background:#C2523A;color:#FFFFFF;font-size:15px;font-weight:700;padding:16px 36px;border-radius:14px;text-decoration:none;letter-spacing:-0.2px;">
              Start Your Next Session &rarr;
            </a>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#FAF5EE;padding:24px 40px;border-top:1px solid #F0E8D8;text-align:center;">
            <p style="color:#A8A29E;font-size:13px;margin:0 0 4px;font-weight:600;">Recova &mdash; AI Physical Therapy Coach</p>
            <p style="color:#A8A29E;font-size:12px;margin:0;">You received this because you completed a session on {date_str}.</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>

</body>
</html>"""


def send_session_email(to_email, patient_name, form_score, total_reps, summary, reps):
    html = build_email_html(patient_name, to_email, form_score, total_reps, summary, reps)

    # Save HTML preview regardless (useful for demo even without SMTP)
    preview_path = os.path.join(os.path.dirname(__file__), 'last_email_preview.html')
    with open(preview_path, 'w') as f:
        f.write(html)

    sender_email = os.environ.get('SENDER_EMAIL')
    sender_password = os.environ.get('SENDER_APP_PASSWORD')

    if not sender_email or not sender_password:
        print(f'[Email] No SMTP credentials set. Preview saved to: {preview_path}')
        return {'sent': False, 'preview': preview_path}

    try:
        msg = MIMEMultipart('alternative')
        msg['Subject'] = f'Your Recova Session — {datetime.now().strftime("%b %d")}'
        msg['From'] = f'Recova <{sender_email}>'
        msg['To'] = to_email
        msg.attach(MIMEText(html, 'html'))

        with smtplib.SMTP_SSL('smtp.gmail.com', 465) as server:
            server.login(sender_email, sender_password)
            server.sendmail(sender_email, to_email, msg.as_string())

        print(f'[Email] Sent to {to_email}')
        return {'sent': True}
    except Exception as e:
        print(f'[Email] Send failed: {e}')
        return {'sent': False, 'error': str(e), 'preview': preview_path}
