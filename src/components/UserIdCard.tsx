import React, { useRef } from 'react';
import { User, CompanySettings } from '../types';
import { QRCodeCanvas } from 'qrcode.react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { Download, Printer, Shield, Phone, MapPin, Info } from 'lucide-react';
import { useApp } from './AppContext';

interface UserIdCardProps {
  user: User;
  settings: CompanySettings;
}

export default function UserIdCard({ user, settings }: UserIdCardProps) {
  const { showToast } = useApp();
  const cardRef = useRef<HTMLDivElement>(null);

  const safeHtml2Canvas = async (element: HTMLElement, options: any) => {
    const originalGetComputedStyle = window.getComputedStyle;
    
    window.getComputedStyle = function (el: Element, pseudoElt?: string | null): any {
      const style = originalGetComputedStyle.call(window, el, pseudoElt);
      return new Proxy(style, {
        get(target, prop, receiver) {
          if (prop === 'getPropertyValue') {
            return function(this: any, property: string) {
              const originalVal = target.getPropertyValue(property);
              if (typeof originalVal === 'string' && originalVal.includes('oklch')) {
                if (originalVal.includes('0 / 0') || originalVal.includes('none') || originalVal.includes('transparent')) {
                  return 'rgba(0,0,0,0)';
                }
                if (property === 'color') {
                  return 'rgb(255, 255, 255)';
                }
                if (property.includes('background')) {
                  if (el.className?.includes('red') || property.includes('red')) {
                    return 'rgb(220, 38, 38)';
                  }
                  return 'rgb(12, 12, 14)';
                }
                if (property.includes('border')) {
                  return 'rgb(39, 39, 42)';
                }
                return 'rgba(0, 0, 0, 0)';
              }
              return originalVal;
            }.bind(target);
          }

          const val = Reflect.get(target, prop, target);
          if (typeof val === 'function') {
            return val.bind(target);
          }

          if (typeof val === 'string' && val.includes('oklch')) {
            if (val.includes('0 / 0') || val.includes('none') || val.includes('transparent')) {
              return 'rgba(0,0,0,0)';
            }
            if (val.includes('0.65') || val.includes('0.5') || val.includes('red') || el.className?.includes('red')) {
              if (val.includes('/')) {
                const parts = val.split('/');
                const opacity = parts[parts.length - 1].trim().replace(')', '');
                return `rgba(220, 38, 38, ${opacity})`;
              }
              return 'rgb(220, 38, 38)';
            }
            if (el.className?.includes('bg-') || el.className?.includes('zinc') || el.className?.includes('black')) {
              if (val.includes('/')) {
                const parts = val.split('/');
                const opacity = parts[parts.length - 1].trim().replace(')', '');
                return `rgba(24, 24, 27, ${opacity})`;
              }
              return 'rgb(12, 12, 14)';
            }
            if (prop === 'color') {
              return 'rgb(255, 255, 255)';
            }
            if (prop === 'backgroundColor') {
              return 'rgb(12, 12, 14)';
            }
            if (prop === 'borderColor') {
              return 'rgb(39, 39, 42)';
            }
            return 'rgba(0, 0, 0, 0)';
          }
          return val;
        }
      });
    };

    try {
      return await html2canvas(element, options);
    } finally {
      window.getComputedStyle = originalGetComputedStyle;
    }
  };

  const captureCanvas = async (): Promise<HTMLCanvasElement | null> => {
    const el = cardRef.current;
    if (!el) return null;

    // Save original styles
    const originalWidth = el.style.width;
    const originalMinWidth = el.style.minWidth;
    const originalFlexDirection = el.style.flexDirection;
    const originalFlexWrap = el.style.flexWrap;
    const originalAlignItems = el.style.alignItems;
    const originalPadding = el.style.padding;

    // Enforce horizontal side-by-side layout of exactly 616px width and 472px height
    el.style.width = '616px';
    el.style.minWidth = '616px';
    el.style.flexDirection = 'row';
    el.style.flexWrap = 'nowrap';
    el.style.alignItems = 'center';
    el.style.padding = '16px';

    try {
      const canvas = await safeHtml2Canvas(el, {
        scale: 3, // High resolution
        useCORS: true, // Allow cross-origin images (Cloudinary)
        backgroundColor: '#0c0c0e',
        logging: false,
        width: 616,
        height: 472,
        windowWidth: 1200 // Prevent media queries or viewports from shrinking layout
      });
      return canvas;
    } finally {
      // Restore original styles
      el.style.width = originalWidth;
      el.style.minWidth = originalMinWidth;
      el.style.flexDirection = originalFlexDirection;
      el.style.flexWrap = originalFlexWrap;
      el.style.alignItems = originalAlignItems;
      el.style.padding = originalPadding;
    }
  };

  const downloadPNG = async () => {
    try {
      showToast('Rendering high-resolution ID card...', 'info');
      const canvas = await captureCanvas();
      if (!canvas) return;
      
      const link = document.createElement('a');
      link.download = `${(user.name || 'User').replace(/\s+/g, '_')}_ID_Card.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      showToast('ID Card downloaded successfully!', 'success');
    } catch (err) {
      console.error(err);
      showToast('Could not export PNG. Try printing or saving as PDF.', 'error');
    }
  };

  const downloadPDF = async () => {
    try {
      showToast('Generating high-quality PDF ID card...', 'info');
      const canvas = await captureCanvas();
      if (!canvas) return;
      
      const imgData = canvas.toDataURL('image/png');
      
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });
      
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      
      const canvasWidth = canvas.width;
      const canvasHeight = canvas.height;
      const ratio = canvasHeight / canvasWidth;
      
      const displayWidth = Math.min(pageWidth - 30, 200);
      const displayHeight = displayWidth * ratio;
      
      const x = (pageWidth - displayWidth) / 2;
      const y = (pageHeight - displayHeight) / 2;
      
      pdf.addImage(imgData, 'PNG', x, y, displayWidth, displayHeight);
      pdf.save(`${(user.name || 'User').replace(/\s+/g, '_')}_ID_Card.pdf`);
      
      showToast('ID Card PDF downloaded successfully!', 'success');
    } catch (err) {
      console.error(err);
      showToast('Could not export PDF. Try printing to PDF instead.', 'error');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-md mx-auto">
      {/* Visual Header Actions */}
      <div className="grid grid-cols-3 gap-2.5 w-full">
        <button
          onClick={downloadPNG}
          className="flex flex-col items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-white text-[11px] font-bold transition-all active:scale-95 cursor-pointer"
          id="btn-download-png"
        >
          <Download className="w-4 h-4 text-red-500" />
          PNG Image
        </button>
        <button
          onClick={downloadPDF}
          className="flex flex-col items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-white text-[11px] font-bold transition-all active:scale-95 cursor-pointer"
          id="btn-download-pdf"
        >
          <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          PDF Document
        </button>
        <button
          onClick={handlePrint}
          className="flex flex-col items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold transition-all active:scale-95 cursor-pointer"
          id="btn-print-card"
        >
          <Printer className="w-4 h-4" />
          Print Card
        </button>
      </div>

      {/* ID Card Print Containment */}
      <div ref={cardRef} className="print-area flex flex-col md:flex-row gap-6 p-4 rounded-3xl justify-center items-center w-full" style={{ backgroundColor: '#0C0C0E', border: '1px solid #27272a' }}>
        
        {/* FRONT SIDE */}
        <div className="relative w-[280px] h-[440px] rounded-2xl p-5 flex flex-col items-center justify-between shadow-lg overflow-hidden select-none" style={{ background: 'linear-gradient(to bottom, #18181b, #000000)', border: '1px solid #27272a' }}>
          {/* Top aesthetic red bar */}
          <div className="absolute top-0 inset-x-0 h-1.5" style={{ backgroundColor: '#dc2626' }} />
          <div className="absolute -top-16 -left-16 w-32 h-32 rounded-full blur-2xl pointer-events-none" style={{ backgroundColor: 'rgba(220, 38, 38, 0.1)' }} />

          {/* Header */}
          <div className="flex items-center gap-2 w-full justify-center">
            {settings.companyLogo ? (
              <img src={settings.companyLogo} crossOrigin="anonymous" referrerPolicy="no-referrer" alt="Logo" className="w-8 h-8 rounded-lg object-cover" style={{ border: '1px solid #27272a' }} />
            ) : (
              <div className="w-8 h-8 rounded-lg flex items-center justify-center font-extrabold text-xs" style={{ backgroundColor: '#dc2626', color: '#ffffff' }}>
                AO
              </div>
            )}
            <div className="text-left">
              <h4 className="text-sm font-black tracking-tight text-white leading-none">{settings.companyName}</h4>
              <span className="text-[9px] font-mono tracking-widest font-bold uppercase" style={{ color: '#ef4444' }}>IDENTIFICATION</span>
            </div>
          </div>

          {/* User Photo */}
          <div className="relative my-4 flex justify-center">
            <div className="absolute inset-0 rounded-full blur-md pointer-events-none animate-pulse" style={{ backgroundColor: 'rgba(220, 38, 38, 0.2)' }} />
            {user.photoUrl ? (
              <img
                src={user.photoUrl}
                crossOrigin="anonymous"
                referrerPolicy="no-referrer"
                alt={user.name}
                className="w-28 h-28 rounded-full object-cover shadow-xl relative z-10"
                style={{ border: '2px solid #dc2626' }}
              />
            ) : (
              <div className="w-28 h-28 rounded-full flex items-center justify-center font-black text-3xl relative z-10" style={{ backgroundColor: '#27272a', border: '2px solid #dc2626', color: '#a1a1aa' }}>
                {(user.name || '').split(' ').map(n => n?.[0] || '').join('')}
              </div>
            )}
          </div>

          {/* Info Block */}
          <div className="text-center w-full">
            <h2 className="text-base font-extrabold text-white tracking-tight mb-0.5">{user.name}</h2>
            <p className="text-xs font-bold tracking-wide uppercase mb-3" style={{ color: '#ef4444' }}>{user.department}</p>

            <div className="grid grid-cols-2 gap-y-2 gap-x-2 text-left p-3 rounded-xl" style={{ backgroundColor: 'rgba(9, 9, 11, 0.8)', border: '1px solid #27272a' }}>
              <div>
                <span className="block text-[8px] font-bold uppercase tracking-wider" style={{ color: '#71717a' }}>Employee ID</span>
                <span className="text-[11px] font-mono font-bold text-white">{user.employeeId}</span>
              </div>
              <div>
                <span className="block text-[8px] font-bold uppercase tracking-wider" style={{ color: '#71717a' }}>Designation</span>
                <span className="text-[11px] font-bold text-white block leading-normal overflow-visible pb-0.5">{user.designation}</span>
              </div>
              <div>
                <span className="block text-[8px] font-bold uppercase tracking-wider" style={{ color: '#71717a' }}>Office Site</span>
                <span className="text-[11px] font-bold text-white block leading-normal overflow-visible pb-0.5">{user.officeLocation || 'Main Office'}</span>
              </div>
              <div>
                <span className="block text-[8px] font-bold uppercase tracking-wider" style={{ color: '#71717a' }}>Shift Timing</span>
                <span className="text-[11px] font-mono text-white block leading-normal overflow-visible pb-0.5">{user.shiftTiming || '09:00 AM - 05:00 PM'}</span>
              </div>
            </div>
          </div>

          {/* QR Code container */}
          <div className="mt-3 flex items-center justify-between w-full pt-2.5" style={{ borderTop: '1px solid #27272a' }}>
            <div className="text-left">
              <span className="block text-[7px] uppercase font-bold tracking-widest" style={{ color: '#71717a' }}>Badge Status</span>
              <span className="text-[9px] font-extrabold uppercase flex items-center gap-1" style={{ color: '#34d399' }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#10b981' }} />
                Active
              </span>
            </div>
            <div className="bg-white p-1 rounded-md shadow-lg flex items-center justify-center" style={{ border: '1px solid #27272a' }}>
              <QRCodeCanvas value={user.qrCodeData || user.id} size={36} bgColor="#FFFFFF" fgColor="#000000" level="H" />
            </div>
          </div>
        </div>

        {/* BACK SIDE */}
        <div className="relative w-[280px] h-[440px] rounded-2xl p-5 flex flex-col items-center justify-between shadow-lg overflow-hidden select-none" style={{ background: 'linear-gradient(to bottom, #18181b, #000000)', border: '1px solid #27272a' }}>
          <div className="absolute top-0 inset-x-0 h-1.5" style={{ backgroundColor: '#27272a' }} />

          {/* Back side branding */}
          <div className="flex items-center gap-1.5 justify-center w-full mt-2">
            <Shield className="w-5 h-5" style={{ color: '#dc2626' }} />
            <h5 className="text-xs font-extrabold tracking-tight" style={{ color: '#d4d4d8' }}>AMIT OPTICAL ATEN</h5>
          </div>

          {/* Back Info details */}
          <div className="w-full space-y-4 my-auto">
            {/* Contact details */}
            <div className="space-y-2 p-3 rounded-xl" style={{ backgroundColor: 'rgba(9, 9, 11, 0.6)', border: '1px solid #27272a' }}>
              <div className="flex gap-2 items-start text-left">
                <Phone className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: '#ef4444' }} />
                <div>
                  <span className="block text-[8px] font-bold uppercase" style={{ color: '#71717a' }}>Emergency Contact</span>
                  <p className="text-[11px] text-white font-medium">{user.emergencyContact || 'Contact HR: +91 91111 22222'}</p>
                </div>
              </div>

              <div className="flex gap-2 items-start text-left pt-2 mt-2" style={{ borderTop: '1px solid #18181b' }}>
                <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: '#ef4444' }} />
                <div>
                  <span className="block text-[8px] font-bold uppercase" style={{ color: '#71717a' }}>Office Address</span>
                  <p className="text-[10px] text-white leading-tight font-medium">{settings.officeAddress}</p>
                </div>
              </div>
            </div>

            {/* Terms / Instructions */}
            <div className="space-y-1.5 text-left p-3 rounded-xl" style={{ backgroundColor: 'rgba(9, 9, 11, 0.4)', border: '1px solid #27272a' }}>
              <div className="flex gap-1.5 items-center mb-1 text-zinc-400">
                <Info className="w-3 h-3" style={{ color: '#71717a' }} />
                <span className="text-[8px] font-bold uppercase tracking-wider" style={{ color: '#a1a1aa' }}>Instructions</span>
              </div>
              <ul className="list-disc list-inside text-[9px] space-y-1" style={{ color: '#71717a' }}>
                <li>This badge is non-transferable and remains company property.</li>
                <li>Report lost or damaged badges immediately to HR department.</li>
                <li>Present badge to QR reader at entry gates for logging.</li>
                <li>For support, email: amit@amitopticals.com</li>
              </ul>
            </div>
          </div>

          {/* Barcode/Footer */}
          <div className="w-full flex flex-col items-center gap-1 pt-3" style={{ borderTop: '1px solid #27272a' }}>
            <div className="bg-white px-2 py-1.5 rounded flex flex-col items-center justify-center w-full" style={{ border: '1px solid #27272a' }}>
              {/* Styled CSS Barcode */}
              <div className="flex justify-between items-center h-5 w-full bg-zinc-100 px-1 opacity-90 select-none">
                <div className="w-0.5 h-4" style={{ backgroundColor: '#09090b' }} />
                <div className="w-1.5 h-4" style={{ backgroundColor: '#09090b' }} />
                <div className="w-0.5 h-4" style={{ backgroundColor: '#f4f4f5' }} />
                <div className="w-0.5 h-4" style={{ backgroundColor: '#09090b' }} />
                <div className="w-1 h-4" style={{ backgroundColor: '#09090b' }} />
                <div className="w-0.5 h-4" style={{ backgroundColor: '#09090b' }} />
                <div className="w-1.5 h-4" style={{ backgroundColor: '#09090b' }} />
                <div className="w-0.5 h-4" style={{ backgroundColor: '#f4f4f5' }} />
                <div className="w-1 h-4" style={{ backgroundColor: '#09090b' }} />
                <div className="w-0.5 h-4" style={{ backgroundColor: '#09090b' }} />
                <div className="w-1 h-4" style={{ backgroundColor: '#09090b' }} />
                <div className="w-1.5 h-4" style={{ backgroundColor: '#09090b' }} />
                <div className="w-0.5 h-4" style={{ backgroundColor: '#f4f4f5' }} />
                <div className="w-0.5 h-4" style={{ backgroundColor: '#09090b' }} />
                <div className="w-1.5 h-4" style={{ backgroundColor: '#09090b' }} />
              </div>
              <span className="text-[7px] font-mono tracking-widest font-bold mt-1" style={{ color: '#52525b' }}>{user.employeeId}</span>
            </div>
            <p className="text-[8px] font-mono" style={{ color: '#52525b' }}>Powered by Amit Opticals App</p>
          </div>
        </div>

      </div>

      {/* Styled Printable styles */}
      <style>{`
        @media print {
          body {
            background: white !important;
            color: black !important;
          }
          .print-area {
            border: none !important;
            background: transparent !important;
            box-shadow: none !important;
            padding: 0 !important;
            margin: 0 !important;
            flex-direction: row !important;
            gap: 20px !important;
          }
          nav, button, header, .fixed, .tab-controls, .no-print {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
