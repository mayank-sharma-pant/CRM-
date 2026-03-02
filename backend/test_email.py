"""Script to test SMTP email configuration."""
import sys
import os
import argparse

# Ensure the backend directory is in the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.utils.email_service import send_email

def test_smtp_config():
    print("Testing SMTP Configuration...")
    to_email = "mayanksharmarrk01@gmail.com"
    subject = "CRM System - SMTP Test Successful"
    html_content = """
    <div style='font-family: sans-serif; padding: 20px; text-align: center; border: 1px solid #ddd; border-radius: 5px;'>
        <h2 style='color: #4CAF50;'>SMTP Configuration Successful!</h2>
        <p>If you are reading this email, your CRM backend is successfully configured to send emails.</p>
        <p>You can now send team invites and OTPs.</p>
    </div>
    """
    
    success = send_email(to_email, subject, html_content)
    
    if success:
        print("\n✅ Email sent successfully! Check your inbox (or spam folder) at " + to_email)
    else:
        print("\n❌ Failed to send email. Check the error logs above.")

if __name__ == "__main__":
    test_smtp_config()
