import os
from io import BytesIO
from xhtml2pdf import pisa
from jinja2 import Environment, FileSystemLoader

TEMPLATE_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "templates")
# Ensure template dir exists
os.makedirs(TEMPLATE_DIR, exist_ok=True)
env = Environment(loader=FileSystemLoader(TEMPLATE_DIR))

def render_invoice_to_pdf(data: dict) -> bytes:
    """
    Renders invoice data to an HTML template, then converts it to PDF using xhtml2pdf.
    Returns the raw PDF bytes.
    """
    template = env.get_template("invoice.html")
    html_content = template.render(**data)
    
    pdf_buffer = BytesIO()
    pisa_status = pisa.CreatePDF(html_content, dest=pdf_buffer)
    
    if pisa_status.err:
        raise Exception(f"Failed to generate PDF invoice. Pisa error: {pisa_status.err}")
        
    return pdf_buffer.getvalue()
