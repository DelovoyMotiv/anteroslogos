// @ts-nocheck
/**
 * USDC Payment Modal
 * Shows payment instructions with QR code for USDC transfers on Base L2
 */

import { useState } from 'react';
import { X, Copy, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { QRCodeSVG } from 'qrcode.react';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  planName: string;
  amountUSDC: number;
  invoiceId: string;
  walletAddress: string;
  onPaymentVerified?: () => void;
}

export function PaymentModal({
  isOpen,
  onClose,
  planName,
  amountUSDC,
  invoiceId,
  walletAddress,
  onPaymentVerified,
}: PaymentModalProps) {
  const [copied, setCopied] = useState<{ address?: boolean; amount?: boolean; invoice?: boolean }>({});
  const [isVerifying, setIsVerifying] = useState(false);

  const handleCopy = async (text: string, field: 'address' | 'amount' | 'invoice') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(prev => ({ ...prev, [field]: true }));
      toast.success(`${field.charAt(0).toUpperCase() + field.slice(1)} copied to clipboard`);
      
      setTimeout(() => {
        setCopied(prev => ({ ...prev, [field]: false }));
      }, 2000);
    } catch (err) {
      toast.error('Failed to copy to clipboard');
    }
  };

  const handleVerifyPayment = async () => {
    setIsVerifying(true);
    
    try {
      // Call verify-payment API endpoint
      const response = await fetch('/api/subscriptions/verify-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ invoiceId }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        toast.success('Payment verified! Your subscription is now active.');
        onPaymentVerified?.();
        onClose();
      } else {
        toast.error(result.error || 'Payment not detected yet. Please wait a few minutes and try again.');
      }
    } catch (error) {
      console.error('Payment verification error:', error);
      toast.error('Failed to verify payment. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Complete Payment
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Send USDC on Base L2 to activate {planName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Instructions */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-start">
              <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mr-3 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-900 dark:text-blue-100">
                <p className="font-semibold mb-2">Payment Instructions:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Send <strong>{amountUSDC} USDC</strong> from your Base L2 wallet</li>
                  <li>Use the wallet address below (copy or scan QR code)</li>
                  <li>Include the invoice reference in the transaction memo (optional but recommended)</li>
                  <li>Wait for blockchain confirmation (1-2 minutes)</li>
                  <li>Click "Verify Payment" to activate your subscription</li>
                </ol>
              </div>
            </div>
          </div>

          {/* QR Code */}
          <div className="flex flex-col items-center">
            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border-2 border-gray-200 dark:border-gray-700">
              <QRCodeSVG
                value={walletAddress}
                size={256}
                level="M"
                includeMargin={true}
                fgColor="#000000"
                bgColor="#FFFFFF"
              />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Scan with your Base L2 wallet
            </p>
          </div>

          {/* Payment Details */}
          <div className="space-y-4">
            {/* Amount */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Amount
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={`${amountUSDC} USDC`}
                  readOnly
                  className="flex-1 px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg font-mono text-sm text-gray-900 dark:text-white"
                />
                <button
                  onClick={() => handleCopy(amountUSDC.toString(), 'amount')}
                  className="p-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  title="Copy amount"
                >
                  {copied.amount ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <Copy className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  )}
                </button>
              </div>
            </div>

            {/* Wallet Address */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Send to Address (Base L2)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={walletAddress}
                  readOnly
                  className="flex-1 px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg font-mono text-sm text-gray-900 dark:text-white"
                />
                <button
                  onClick={() => handleCopy(walletAddress, 'address')}
                  className="p-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  title="Copy address"
                >
                  {copied.address ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <Copy className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  )}
                </button>
              </div>
            </div>

            {/* Invoice Reference */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Invoice Reference
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={invoiceId}
                  readOnly
                  className="flex-1 px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg font-mono text-sm text-gray-900 dark:text-white"
                />
                <button
                  onClick={() => handleCopy(invoiceId, 'invoice')}
                  className="p-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  title="Copy reference"
                >
                  {copied.invoice ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <Copy className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  )}
                </button>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Optional: Include this in transaction memo for faster verification
              </p>
            </div>

            {/* Network Info */}
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
              <p className="text-sm text-yellow-900 dark:text-yellow-100">
                <strong>⚠️ Important:</strong> Make sure you're sending USDC on{' '}
                <strong>Base L2 network</strong>. Sending on other networks (Ethereum, Polygon, etc.) will result in loss of funds.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-800">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleVerifyPayment}
            disabled={isVerifying}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isVerifying ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Verifying...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                Verify Payment
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default PaymentModal;
