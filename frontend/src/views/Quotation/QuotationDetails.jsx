import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../utility/context/AuthContext';
import {
  Loader2,
  ArrowLeft,
  Calendar,
  Building,
  Clock,
  FileText,
  ShieldCheck,
  Mail,
  Download,
  Printer,
} from 'lucide-react';
import api from '../../utility/api';

const QuotationDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const isStaff = hasRole(['admin', 'procurement_officer', 'manager']);

  const [quotation, setQuotation] = useState(null);
  const [po, setPo] = useState(null);
  const [invoice, setInvoice] = useState(null);
  const [vendorDetails, setVendorDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchQuotation = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/quotations/${id}`);
      const quotationData = res.data;
      setQuotation(quotationData);
      await fetchRelatedDocuments(quotationData);
    } catch (err) {
      console.error('Failed to load quotation details:', err);
      setQuotation(null);
      setPo(null);
      setInvoice(null);
      setVendorDetails(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchRelatedDocuments = async (quotationData) => {
    if (!quotationData) {
      setPo(null);
      setInvoice(null);
      setVendorDetails(null);
      return;
    }

    try {
      const poRes = await api.get('/purchase-orders/');
      const relatedPo = poRes.data.find((item) => item.quotation_id === quotationData.id) || null;
      setPo(relatedPo);

      if (relatedPo) {
        const invoicesRes = await api.get('/invoices/');
        const relatedInvoice = invoicesRes.data.find((item) => item.po_id === relatedPo.id) || null;
        setInvoice(relatedInvoice);
      } else {
        setInvoice(null);
      }

      if (quotationData.vendor_id) {
        try {
          const vendorRes = await api.get(`/vendors/${quotationData.vendor_id}`);
          setVendorDetails(vendorRes.data);
        } catch (vendorErr) {
          console.warn('Failed to load vendor details:', vendorErr);
          setVendorDetails(null);
        }
      }
    } catch (err) {
      console.warn('Failed to load related purchase order or invoice:', err);
      setPo(null);
      setInvoice(null);
    }
  };

  useEffect(() => {
    fetchQuotation();
  }, [id]);

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(val || 0);
  };

  const handleDownloadPDF = async () => {
    if (!quotation) return;
    setActionLoading(true);
    try {
      const response = await api.get(`/quotations/${quotation.id}/pdf`, {
        responseType: 'arraybuffer'
      });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Quotation_${quotation.quotation_number}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to download quotation PDF:', err);
      alert(err.response?.data?.detail || err.message || 'Unable to download quotation PDF.');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePrintPDF = async () => {
    if (!quotation) return;
    setActionLoading(true);
    try {
      const response = await api.get(`/quotations/${quotation.id}/pdf`, {
        responseType: 'arraybuffer'
      });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const printWindow = window.open(url, '_blank');
      if (printWindow) {
        printWindow.focus();
        printWindow.onload = () => {
          printWindow.print();
          URL.revokeObjectURL(url);
        };
      } else {
        URL.revokeObjectURL(url);
        alert('Please allow popups to open the quotation for printing.');
      }
    } catch (err) {
      console.error('Failed to open quotation PDF for printing:', err);
      alert(err.response?.data?.detail || err.message || 'Unable to open quotation for printing.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEmailQuotation = async () => {
    if (!quotation) return;
    setActionLoading(true);
    try {
      const params = {};
      if (vendorDetails?.contact_email) {
        params.to_email = vendorDetails.contact_email;
      }
      await api.post(`/quotations/${quotation.id}/email`, null, { params });
      alert('Quotation has been emailed successfully.');
    } catch (err) {
      console.error('Failed to email quotation:', err);
      alert(err.response?.data?.detail || err.message || 'Unable to email quotation.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleGenerateInvoice = async () => {
    if (!po) return;
    setActionLoading(true);
    try {
      await api.post('/invoices/', { po_id: po.id });
      alert('Invoice generated successfully.');
      await fetchQuotation();
    } catch (err) {
      console.error('Failed to generate invoice:', err);
      alert(err.response?.data?.detail || err.message || 'Unable to generate invoice.');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case 'draft':
        return 'bg-zinc-800 text-zinc-400 border border-zinc-700';
      case 'submitted':
        return 'bg-sky-950/40 text-sky-400 border border-sky-900/60';
      case 'selected':
        return 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/60';
      case 'rejected':
        return 'bg-rose-950/40 text-rose-400 border border-rose-900/60';
      default:
        return 'bg-zinc-800 text-zinc-400';
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-[#22C55E]" />
        <span className="text-sm text-[#94A3B8]">Loading quotation details...</span>
      </div>
    );
  }

  if (!quotation) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => navigate('/quotations')}
          className="flex items-center gap-2 text-xs font-semibold text-[#94A3B8] hover:text-[#E8EDEA] transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Quotations</span>
        </button>
        <div className="bg-[#0B0F0E] border border-[#223027] rounded-xl p-8 text-center text-[#94A3B8]">
          Quotation not found or could not be loaded.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-6xl mx-auto">
      <button
        onClick={() => navigate('/quotations')}
        className="flex items-center gap-2 text-xs font-semibold text-[#94A3B8] hover:text-[#E8EDEA] transition-colors cursor-pointer"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Back to Quotations</span>
      </button>

      <div className="bg-[#0B0F0E] border border-[#223027] rounded-3xl overflow-hidden shadow-xl">
        <div className="p-6 md:p-8 border-b border-[#223027] bg-[#0F1513] flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-full bg-[#1B3D2B] border border-[#22C55E] flex items-center justify-center text-lg font-bold text-[#22C55E]">
                Q
              </div>
              <div>
                <p className="text-xs text-[#94A3B8] uppercase tracking-[0.22em] font-semibold">Quotation Profile</p>
                <h1 className="text-2xl font-extrabold text-[#E8EDEA] tracking-tight">{quotation.quotation_number}</h1>
              </div>
            </div>
            <div className="flex flex-wrap gap-3 items-center text-xs text-[#94A3B8]">
              <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full ${getStatusStyle(quotation.status)}`}>
                {quotation.status}
              </span>
              {quotation.submitted_at && (
                <span className="inline-flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {new Date(quotation.submitted_at).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
          <div className="space-y-4 text-right">
            <div className="flex flex-wrap justify-end items-center gap-2">
              <button
                onClick={handleDownloadPDF}
                disabled={actionLoading}
                title="Download quotation PDF"
                className="flex items-center gap-1.5 border border-[#223027] hover:border-[#22C55E]/40 text-[#94A3B8] hover:text-[#E8EDEA] font-semibold px-3 py-1.5 rounded-lg text-xs cursor-pointer transition-all disabled:opacity-45 bg-[#0B0F0E]"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Download PDF</span>
              </button>
              <button
                onClick={handlePrintPDF}
                disabled={actionLoading}
                title="Print quotation PDF"
                className="flex items-center gap-1.5 border border-[#223027] hover:border-[#22C55E]/40 text-[#94A3B8] hover:text-[#E8EDEA] font-semibold px-3 py-1.5 rounded-lg text-xs cursor-pointer transition-all disabled:opacity-45 bg-[#0B0F0E]"
              >
                <Printer className="h-3.5 w-3.5" />
                <span>Print</span>
              </button>
              {isStaff && (
                <button
                  onClick={handleEmailQuotation}
                  disabled={actionLoading}
                  title="Email quotation PDF to vendor"
                  className="flex items-center gap-1.5 border border-[#223027] hover:border-[#22C55E]/40 text-[#94A3B8] hover:text-[#E8EDEA] font-semibold px-3 py-1.5 rounded-lg text-xs cursor-pointer transition-all disabled:opacity-45 bg-[#0B0F0E]"
                >
                  <Mail className="h-3.5 w-3.5" />
                  <span>Email invoice</span>
                </button>
              )}
            </div>
            {invoice ? null : po ? (
              <div className="flex flex-wrap justify-end items-center gap-2">
                <div className="rounded-2xl border border-[#223027] bg-[#081009] px-4 py-2 text-xs text-[#94A3B8]">
                  Invoice has not been generated for this quotation yet.
                </div>
                {isStaff && (
                  <button
                    onClick={handleGenerateInvoice}
                    disabled={actionLoading}
                    className="flex items-center gap-1.5 border border-[#223027] hover:border-[#22C55E]/40 text-[#94A3B8] hover:text-[#E8EDEA] font-semibold px-3 py-1.5 rounded-lg text-xs cursor-pointer transition-all disabled:opacity-45 bg-[#0B0F0E]"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Generate invoice</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="rounded-2xl border border-[#223027] bg-[#081009] px-4 py-2 text-xs text-[#94A3B8]">
                No related purchase order or invoice is available.
              </div>
            )}
            <div>
              <p className="text-[10px] uppercase tracking-[0.24em] text-[#94A3B8]">Quoted Total</p>
              <p className="text-lg font-bold text-[#E8EDEA] mt-1">{formatCurrency(quotation.grand_total)}</p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 p-6 md:grid-cols-2 md:p-8">
          <div className="space-y-5">
            <div className="bg-[#0F1513]/40 border border-[#223027] rounded-2xl p-5">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-2 text-[#22C55E] font-semibold uppercase text-[10px] tracking-[0.22em]">
                  <Building className="h-4 w-4" />
                  Supplier Details
                </div>
              </div>
              <div className="space-y-3 text-sm text-[#E8EDEA]">
                <div>
                  <span className="block text-[10px] text-[#94A3B8] uppercase tracking-[0.18em]">Vendor Name</span>
                  <p className="font-semibold mt-1">{quotation.vendor_name || 'System Vendor'}</p>
                </div>
                {quotation.vendor_rating !== undefined && (
                  <div className="text-amber-400 text-[11px] font-semibold">
                    ★ {quotation.vendor_rating.toFixed(1)} / 5.0
                  </div>
                )}
              </div>
            </div>

            <div className="bg-[#0F1513]/40 border border-[#223027] rounded-2xl p-5">
              <div className="flex items-center gap-2 text-[#22C55E] font-semibold uppercase text-[10px] tracking-[0.22em] mb-4">
                <Clock className="h-4 w-4" />
                Fulfillment & Payment
              </div>
              <div className="grid gap-4 text-sm text-[#E8EDEA]">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="block text-[10px] text-[#94A3B8] uppercase">Lead time</span>
                    <p className="font-semibold mt-1">{quotation.delivery_days ? `${quotation.delivery_days} Days` : 'N/A'}</p>
                  </div>
                  <div>
                    <span className="block text-[10px] text-[#94A3B8] uppercase">GST / Tax Applied</span>
                    <p className="font-semibold mt-1">{quotation.tax_percent}%</p>
                  </div>
                </div>
                <div>
                  <span className="block text-[10px] text-[#94A3B8] uppercase">Payment terms</span>
                  <p className="mt-1 font-medium italic text-[#E8EDEA]">"{quotation.payment_terms || 'Not Specified'}"</p>
                </div>
                {quotation.notes && (
                  <div>
                    <span className="block text-[10px] text-[#94A3B8] uppercase">Additional notes</span>
                    <p className="mt-1 text-[#E8EDEA]">{quotation.notes}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="bg-[#0F1513]/40 border border-[#223027] rounded-2xl p-5 md:p-6">
            <div className="flex items-center gap-2 text-[#22C55E] font-semibold uppercase text-[10px] tracking-[0.22em] mb-4">
              <FileText className="h-4 w-4" />
              Quoted Line Items
            </div>
            <div className="space-y-3">
              {quotation.line_items?.length ? (
                quotation.line_items.map((item, idx) => (
                  <div key={idx} className="rounded-2xl border border-[#223027] bg-[#0B0F0E]/60 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold text-[#E8EDEA]">{item.item_name}</p>
                        <p className="text-[11px] text-[#94A3B8] mt-1">
                          Quantity: {item.quantity}
                          {item.delivery_days ? ` · Delivery: ${item.delivery_days} Days` : ''}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[#E8EDEA] font-semibold">{formatCurrency(item.unit_price)}</p>
                        <p className="text-[11px] text-[#94A3B8] mt-1">Total: {formatCurrency(item.total)}</p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-[#94A3B8]">No line items are available for this quotation.</p>
              )}
            </div>
          </div>
        </div>

        <div className="bg-[#0B0F0E] border-t border-[#223027] p-6 md:p-8">
          <div className="grid gap-4 sm:grid-cols-2 text-sm text-[#94A3B8]">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span className="text-[#E8EDEA] font-mono">{formatCurrency(quotation.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>GST / Tax ({quotation.tax_percent}%)</span>
              <span className="text-[#E8EDEA] font-mono">{formatCurrency(quotation.tax_amount)}</span>
            </div>
          </div>
          <div className="mt-5 flex items-center justify-between rounded-2xl bg-[#0B0F0E] border border-[#223027] p-4 text-sm font-semibold text-[#22C55E]">
            <span>Quotation Grand Total</span>
            <span className="text-[#E8EDEA] font-mono text-base">{formatCurrency(quotation.grand_total)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuotationDetails;
