import os
import logging
from pydantic import EmailStr
from fastapi_mail import ConnectionConfig, FastMail, MessageSchema, MessageType
from app.core.config import settings

logger = logging.getLogger("app.services.email")

conf = ConnectionConfig(
    MAIL_USERNAME=settings.SMTP_USER,
    MAIL_PASSWORD=settings.SMTP_PASS,
    MAIL_FROM=settings.SMTP_FROM,
    MAIL_PORT=settings.SMTP_PORT,
    MAIL_SERVER=settings.SMTP_HOST,
    MAIL_STARTTLS=True,
    MAIL_SSL_TLS=False,
    USE_CREDENTIALS=True,
    VALIDATE_CERTS=False
)

async def send_invoice_email(
    to_email: EmailStr,
    invoice_number: str,
    pdf_bytes: bytes,
    pdf_filename: str,
    subject: str = None,
    body: str = None
) -> bool:
    """
    Sends an invoice PDF via email. If SMTP credentials are at default settings
    or sending fails, it saves the email and attachment locally for debugging.
    """
    if not subject:
        subject = f"Invoice {invoice_number} from {settings.PROJECT_NAME}"
    if not body:
        body = f"Hello,\n\nPlease find attached the invoice {invoice_number} for your recent purchase.\n\nBest regards,\nProcurement Team"
        
    is_default_smtp = (
        "your-app-password" in settings.SMTP_PASS or 
        "change-me" in settings.SMTP_PASS or 
        not settings.SMTP_USER or 
        "you@gmail.com" in settings.SMTP_USER
    )

    if is_default_smtp:
        logger.warning("SMTP credentials not configured. Simulating email delivery locally.")
        os.makedirs("backend/sent_emails", exist_ok=True)
        txt_path = f"backend/sent_emails/email_{invoice_number}_{to_email}.txt"
        with open(txt_path, "w", encoding="utf-8") as f:
            f.write(f"To: {to_email}\nSubject: {subject}\nBody:\n{body}\n")
        pdf_path = f"backend/sent_emails/email_{invoice_number}_{to_email}.pdf"
        with open(pdf_path, "wb") as f:
            f.write(pdf_bytes)
        logger.info(f"Simulated email saved to {txt_path} and PDF attachment to {pdf_path}")
        return True

    # Configure the email message with the attachment
    message = MessageSchema(
        subject=subject,
        recipients=[to_email],
        body=body,
        subtype=MessageType.plain,
        attachments=[(pdf_filename, pdf_bytes, "application/pdf")]
    )
    
    fm = FastMail(conf)
    try:
        await fm.send_message(message)
        logger.info(f"Email sent successfully to {to_email}")
        return True
    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {e}. Saving copy locally.")
        os.makedirs("backend/sent_emails", exist_ok=True)
        txt_path = f"backend/sent_emails/failed_email_{invoice_number}_{to_email}.txt"
        with open(txt_path, "w", encoding="utf-8") as f:
            f.write(f"To: {to_email}\nSubject: {subject}\nError: {e}\nBody:\n{body}\n")
        pdf_path = f"backend/sent_emails/failed_email_{invoice_number}_{to_email}.pdf"
        with open(pdf_path, "wb") as f:
            f.write(pdf_bytes)
        return False
