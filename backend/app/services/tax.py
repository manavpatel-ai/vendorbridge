from decimal import Decimal
from typing import Dict

def split_gst(subtotal: float, gst_percent: float = 18.0, intra_state: bool = True) -> Dict[str, float]:
    sub = Decimal(str(subtotal))
    gst = Decimal(str(gst_percent))
    
    if intra_state:
        # Split GST equally into CGST and SGST
        half_gst = gst / Decimal("2")
        cgst = sub * half_gst / Decimal("100")
        sgst = sub * half_gst / Decimal("100")
        igst = Decimal("0")
    else:
        # Full GST is IGST
        cgst = Decimal("0")
        sgst = Decimal("0")
        igst = sub * gst / Decimal("100")
        
    grand_total = sub + cgst + sgst + igst
    
    return {
        "subtotal": float(sub.quantize(Decimal("0.01"))),
        "cgst": float(cgst.quantize(Decimal("0.01"))),
        "sgst": float(sgst.quantize(Decimal("0.01"))),
        "igst": float(igst.quantize(Decimal("0.01"))),
        "grand_total": float(grand_total.quantize(Decimal("0.01")))
    }
