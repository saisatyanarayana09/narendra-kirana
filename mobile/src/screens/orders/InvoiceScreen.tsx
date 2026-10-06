import { Feather, Ionicons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system/legacy";
import { Image } from "expo-image";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Share,
  Alert,
  StatusBar,
  Linking as RNLinking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { apiClient } from "../../api/client";
import { storeApi } from "../../api/store";
import { theme } from "../../constants/theme";
import { useAuth } from "../../context/AuthContext";
import { AppNavigationProp } from "../../navigation/types";
import {
  getCachedOrderByIdSync,
  saveCachedSingleOrder,
} from "../../services/ordersCache";
import { fixImageUrl } from "../../utils/image";
import { getItem, saveItem, deleteItem } from "../../utils/storage";

const SAVED_DOWNLOAD_DIR_KEY = "SAVED_SAF_INVOICE_DOWNLOAD_DIR";

export function InvoiceScreen({
  navigation,
  route,
}: {
  navigation: AppNavigationProp;
  route: any;
}) {
  const { user } = useAuth();
  const { orderId, initialOrder } = route.params || {};
  const cachedOrder =
    initialOrder || (orderId ? getCachedOrderByIdSync(orderId) : null);
  const [order, setOrder] = useState<any>(cachedOrder);
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(!cachedOrder);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Pre-populate settings from memory cache
    storeApi
      .getSettings()
      .then((s) => {
        if (s) setSettings(s);
      })
      .catch(() => null);

    if (user) {
      fetchInvoiceData();
    } else {
      setLoading(false);
    }
  }, [orderId, user]);

  const fetchInvoiceData = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    try {
      if (!cachedOrder) {
        setLoading(true);
      }
      const [orderRes, settingsRes] = await Promise.all([
        apiClient.get(`/orders/${orderId}/`),
        storeApi.getSettings().catch(() => null),
      ]);
      setOrder(orderRes.data);
      saveCachedSingleOrder(orderRes.data);
      if (settingsRes) {
        setSettings(settingsRes);
      }
    } catch (err) {
      console.error("Failed to load invoice details:", err);
      if (!cachedOrder) {
        setError("Failed to load invoice details.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Helper formatting
  // Helper formatting matching canonical invoice template
  const formatFullDateTime = (dateVal: any) => {
    if (!dateVal) return "N/A";
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return "N/A";
    return d.toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const orderDateObj = order?.created_at
    ? new Date(order.created_at)
    : new Date();
  const isOrderDateValid = !isNaN(orderDateObj.getTime());
  const orderDateFormatted = formatFullDateTime(order?.created_at);
  const invoiceDateFormatted = formatFullDateTime(new Date());

  const getInvoiceNumber = (ord: any) => {
    const rawId = String(ord?.id || orderId || "").trim();
    const d = ord?.created_at ? new Date(ord.created_at) : new Date();
    const year = !isNaN(d.getTime())
      ? d.getFullYear()
      : new Date().getFullYear();
    if (rawId.toUpperCase().startsWith("ORD")) {
      return `INV-${year}-${rawId.toUpperCase()}`;
    }
    const digits = rawId.replace(/\D/g, "");
    return `INV-${year}-${(digits || "1").padStart(5, "0")}`;
  };

  const invoiceNumber = getInvoiceNumber(order);
  const orderReference = String(order?.id || orderId || "").startsWith("#")
    ? String(order?.id || orderId)
    : `#${order?.id || orderId || ""}`;

  const isDelivery = order?.order_type === "DELIVERY";
  const isRejected = order?.status === "REJECTED";

  const validItems = (order?.items || []).filter(
    (i: any) => i.status !== "REJECTED",
  );
  const subtotal = validItems.reduce((acc: number, item: any) => {
    return acc + parseFloat(item.subtotal || item.price_snapshot || "0");
  }, 0);

  const signatureUrl = fixImageUrl(settings?.invoice_signature);

  const rawTerms =
    settings?.invoice_terms_and_conditions ||
    settings?.terms_and_conditions ||
    "1. Goods once sold will not be taken back without original bill.\n2. In case of any dispute, local jurisdiction applies.\n3. Perishable goods must be reported within 24 hours.";
  const termsList = rawTerms
    .split("\n")
    .map((t: string) => t.trim())
    .filter(Boolean);

  const getPaymentMethodDisplay = () => {
    const total = parseFloat(order?.total_amount || "0") || 0;
    const wallet = parseFloat(order?.wallet_discount || "0") || 0;
    const rawMethod = String(order?.payment_method || "COD").toUpperCase();

    let methodText = "Cash on Delivery (COD)";
    if (rawMethod === "UPI") {
      methodText = order?.upi_transaction_id
        ? `UPI (Ref: ${order.upi_transaction_id})`
        : "UPI Instant Payment";
    } else if (order?.order_type === "PICKUP" && rawMethod === "COD") {
      methodText = "Cash at Store Counter";
    } else if (rawMethod === "CARD") {
      methodText = "Debit / Credit Card";
    }

    if (total === 0 && wallet > 0) {
      return "Wallet Balance (Full)";
    }
    if (wallet > 0) {
      return `Hybrid (Wallet + ${methodText})`;
    }
    return methodText;
  };

  const orderDate = orderDateFormatted;
  const invoiceDate = invoiceDateFormatted;
  const methodText = getPaymentMethodDisplay();

  const handleWhatsAppHelp = async () => {
    const rawNum = settings?.whatsapp_number || settings?.store_phone || "";
    const cleanNumber = rawNum.replace(/[^0-9]/g, "");
    const formattedNumber =
      cleanNumber.length === 10 ? `91${cleanNumber}` : cleanNumber;
    const helpTemplate =
      settings?.whatsapp_order_help_template ||
      "Hi Narendra Kirana, I need help with Order #{order_id}";
    const orderIdentifier = String(order?.id || orderId || "").trim();
    const message = helpTemplate.replace("{order_id}", orderIdentifier);

    const waUrl = `whatsapp://send?phone=${formattedNumber}&text=${encodeURIComponent(message)}`;
    const webWaUrl = `https://wa.me/${formattedNumber}?text=${encodeURIComponent(message)}`;

    try {
      const canOpen = await RNLinking.canOpenURL(waUrl);
      if (canOpen) {
        await RNLinking.openURL(waUrl);
      } else {
        await RNLinking.openURL(webWaUrl);
      }
    } catch {
      await RNLinking.openURL(webWaUrl).catch(() => {
        Alert.alert(
          "WhatsApp Not Available",
          `Please contact store support directly at ${rawNum}`,
        );
      });
    }
  };

  // Generate 1:1 Official Tax Invoice HTML for PDF/Print matching official_tax_invoice.html
  const generateInvoiceHtml = () => {
    const items = order?.items || [];
    const storeName = settings?.store_name || "Narendra Kirana Store";
    const storeAddr = settings?.store_address || "";
    const storePhone = settings?.store_phone || "";
    const storeEmail = settings?.store_email || "";
    const gstin = settings?.gstin || "";
    const fssai =
      settings?.fssai_license_number || settings?.fssai_number || "";
    const methodText = getPaymentMethodDisplay();

    const itemsHtml = items
      .map((item: any, index: number) => {
        const rejected = item.status === "REJECTED";
        const name =
          item.product_name_snapshot || item.product_name || "Product";
        const unit = item.unit_snapshot || "";
        const price = (
          parseFloat(item.price_snapshot || item.price_at_order || "0") || 0
        ).toFixed(2);
        const itemSubtotal = rejected
          ? "0.00"
          : (
              parseFloat(item.subtotal || item.price_snapshot || "0") || 0
            ).toFixed(2);

        return `
        <tr class="${rejected ? "rejected" : ""}">
          <td style="text-align:center;color:${rejected ? "#94a3b8" : "#64748b"};">${index + 1}</td>
          <td>
            <div style="font-weight:700;color:${rejected ? "#94a3b8;text-decoration:line-through;" : "#0f172a;"}">${name}</div>
            ${unit ? `<div style="font-size:10px;color:#64748b;">${unit}</div>` : ""}
            ${rejected ? '<span style="font-size:8px;font-weight:800;color:#e11d48;background:#ffe4e6;padding:1px 4px;border-radius:3px;">UNAVAILABLE</span>' : ""}
          </td>
          <td style="text-align:center;">${item.quantity}</td>
          <td style="text-align:right;">₹${price}</td>
          <td style="text-align:right;font-weight:700;">${rejected ? "₹0.00" : `₹${itemSubtotal}`}</td>
        </tr>`;
      })
      .join("");

    const termsHtml = termsList
      .map((l: string) => `<p style="margin:2px 0;color:#475569;">${l}</p>`)
      .join("");

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Tax Invoice ${invoiceNumber}</title>
  <style>
    @media print {
      @page { size: A4 portrait; margin: 10mm; }
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background: #fff !important; }
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a; background: #f8fafc; padding: 20px; font-size: 11px; }
    .paper { max-width: 800px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 28px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); position: relative; }
    .cancelled-stamp { position: absolute; top: 35%; left: 50%; transform: translate(-50%, -50%) rotate(-15deg); border: 6px solid #e11d48; color: #e11d48; font-size: 54px; font-weight: 900; letter-spacing: 6px; padding: 10px 30px; border-radius: 12px; opacity: 0.25; pointer-events: none; }
    .hdr { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1px solid #e2e8f0; padding-bottom: 16px; margin-bottom: 14px; gap: 16px; }
    .store-info h1 { font-size: 19px; font-weight: 900; color: #0f172a; line-height: 1.2; }
    .store-info .tag { font-size: 9.5px; font-weight: 800; color: #047857; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 2px; }
    .store-info p { font-size: 10.5px; color:#475569; margin-top: 3px; line-height: 1.4; }
    .meta-box { text-align: right; }
    .meta-box h2 { font-size: 22px; font-weight: 900; color: #0f172a; letter-spacing: -0.5px; }
    .meta-box .orig { display: inline-block; font-size: 8.5px; font-weight: 800; text-transform: uppercase; color: #065f46; background: #ecfdf5; border: 1px solid #a7f3d0; padding: 2px 6px; border-radius: 4px; margin-top: 2px; }
    .meta-card { background: transparent; border: none; padding: 0; margin-top: 6px; text-align: right; }
    .meta-row { display: flex; justify-content: flex-end; gap: 8px; margin: 2px 0; font-size: 10.5px; }
    .meta-lbl { color: #64748b; }
    .meta-val { font-weight: 700; color: #0f172a; font-family: monospace; }
    .compliance { background: transparent; border: 1px solid #cbd5e1; border-radius: 6px; padding: 6px 12px; margin-bottom: 14px; display: flex; justify-content: space-between; align-items: center; font-size: 10px; }
    .compliance b { color: #334155; }
    .grid { display: flex; gap: 12px; margin-bottom: 14px; }
    .grid-col { flex: 1; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 12px; background: #ffffff; }
    .grid-hdr { font-size: 9px; font-weight: 900; text-transform: uppercase; color: #94a3b8; border-bottom: 1px solid #f1f5f9; padding-bottom: 4px; margin-bottom: 6px; letter-spacing: 0.5px; }
    .grid-name { font-size: 12px; font-weight: 800; color: #0f172a; }
    .grid-row { display: flex; justify-content: space-between; font-size: 10px; margin: 2px 0; color: #475569; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 14px; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; }
    th { background: #f1f5f9; color: #475569; font-size: 9.5px; font-weight: 800; text-transform: uppercase; padding: 8px 10px; border-bottom: 1px solid #e2e8f0; }
    td { padding: 8px 10px; border-bottom: 1px solid #f1f5f9; font-size: 10.5px; color: #1e293b; }
    .totals-wrap { display: flex; justify-content: flex-end; margin-bottom: 16px; }
    .totals-box { width: 280px; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; background: #ffffff; }
    .tot-row { display: flex; justify-content: space-between; padding: 5px 10px; font-size: 10.5px; color: #475569; }
    .tot-grand { background: #ecfdf5; border-top: 2px solid #10b981; padding: 8px 10px; display: flex; justify-content: space-between; align-items: center; color: #065f46; font-size: 11px; font-weight: 800; }
    .tot-grand .big { font-size: 16px; font-weight: 900; color: #047857; }
    .ftr { border-top: 1px solid #e2e8f0; padding-top: 12px; display: flex; justify-content: space-between; align-items: flex-end; font-size: 10px; }
    .ftr-terms { max-width: 420px; color: #64748b; }
    .ftr-sig { text-align: right; }
    .sig-img { max-height: 44px; object-fit: contain; margin-bottom: 4px; }
  </style>
</head>
<body>
  <div class="paper">
    ${isRejected ? '<div class="cancelled-stamp">CANCELLED</div>' : ""}
    <div class="hdr">
      <div class="store-info">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:4px;">
          <img src="/logo.jpg" alt="Store Logo" style="width:40px;height:40px;object-fit:contain;border-radius:8px;border:1px solid #e2e8f0;" onerror="this.style.display='none';" />
          <div>
            <h1>${storeName}</h1>
            <div class="tag">Grocery & Daily Essentials</div>
          </div>
        </div>
        ${storeAddr ? `<p>📍 ${storeAddr}</p>` : ""}
        ${storePhone || storeEmail ? `<p>📞 ${[storePhone, storeEmail].filter(Boolean).join(" • ")}</p>` : ""}
      </div>
      <div class="meta-box">
        <h2>TAX INVOICE</h2>
        <div class="orig">Original for Recipient</div>
        <div class="meta-card">
          <div class="meta-row"><span class="meta-lbl">Invoice No:</span><span class="meta-val">${invoiceNumber}</span></div>
          <div class="meta-row"><span class="meta-lbl">Invoice Date:</span><span>${invoiceDateFormatted}</span></div>
          <div class="meta-row"><span class="meta-lbl">Order Ref:</span><span class="meta-val">${orderReference}</span></div>
          <div class="meta-row"><span class="meta-lbl">Order Date:</span><span>${orderDateFormatted}</span></div>
        </div>
      </div>
    </div>

    ${
      gstin || fssai
        ? `<div class="compliance">
        ${gstin ? `<div><b>GSTIN:</b> <span style="font-family:monospace;font-weight:700;">${gstin}</span></div>` : ""}
        ${fssai ? `<div><b>FSSAI Lic. No:</b> <span style="font-family:monospace;font-weight:700;">${fssai}</span> <span style="background:#d1fae5;color:#065f46;font-size:8px;font-weight:800;padding:1px 4px;border-radius:3px;">Govt Reg.</span></div>` : ""}
        <div style="color:#64748b;">Place of Supply: <b>State Code (09)</b></div>
      </div>`
        : ""
    }

    <div class="grid">
      <div class="grid-col">
        <div class="grid-hdr">Billed / Shipped To</div>
        <div class="grid-name">${order?.customer_name || `Customer #${order?.customer ?? "—"}`}</div>
        ${order?.customer_phone ? `<div class="grid-row"><span>Phone:</span><b>${order.customer_phone}</b></div>` : ""}
        <div class="grid-row">
          <span>Address:</span>
          <b>${isDelivery ? order?.delivery_address || "Home Delivery" : "Store Counter Pickup"}</b>
        </div>
        ${order?.delivery_pincode ? `<div class="grid-row"><span>PIN Code:</span><b>${order.delivery_pincode}</b></div>` : ""}
      </div>

      <div class="grid-col">
        <div class="grid-hdr">Fulfillment Details</div>
        <div class="grid-row"><span>Mode:</span><b>${isDelivery ? "Home Delivery" : "Store Pickup"}</b></div>
        ${order?.delivery_slot_label ? `<div class="grid-row"><span>Slot:</span><b style="color:#4f46e5;">${order?.delivery_slot_date || ""} (${order.delivery_slot_label})</b></div>` : ""}
        <div class="grid-row"><span>Order Status:</span><b style="color:${order?.status === "COMPLETED" ? "#059669" : isRejected ? "#e11d48" : "#334155"};">${order?.status}</b></div>
        <div class="grid-row"><span>Payment Status:</span><b style="color:#059669;">${order?.status === "COMPLETED" ? "PAID" : isRejected ? "CANCELLED" : "DUE AT DELIVERY"}</b></div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th style="width:5%;text-align:center;">#</th>
          <th style="width:55%;">Item Description</th>
          <th style="width:12%;text-align:center;">Qty</th>
          <th style="width:14%;text-align:right;">Rate (₹)</th>
          <th style="width:14%;text-align:right;">Amount (₹)</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml}
      </tbody>
    </table>

    <div class="totals-wrap">
      <div class="totals-box">
        <div class="tot-row">
          <span>Subtotal (${validItems.length} items)</span>
          <b>₹${(subtotal || 0).toFixed(2)}</b>
        </div>
        ${parseFloat(order?.discount_applied || "0") > 0 ? `<div class="tot-row" style="color:#4f46e5;"><span>Product Savings</span><b>-₹${parseFloat(order.discount_applied).toFixed(2)}</b></div>` : ""}
        ${parseFloat(order?.promo_discount || "0") > 0 ? `<div class="tot-row" style="color:#059669;"><span>Promo Code Discount</span><b>-₹${parseFloat(order.promo_discount).toFixed(2)}</b></div>` : ""}
        ${parseFloat(order?.packaging_fee || "0") > 0 ? `<div class="tot-row"><span>Packaging Charges</span><b>₹${parseFloat(order.packaging_fee).toFixed(2)}</b></div>` : ""}
        ${isDelivery ? `<div class="tot-row"><span>Delivery Charges</span><b>${parseFloat(order?.delivery_fee || "0") > 0 ? `₹${parseFloat(order.delivery_fee).toFixed(2)}` : "FREE"}</b></div>` : ""}
        ${parseFloat(order?.wallet_discount || "0") > 0 ? `<div class="tot-row" style="color:#059669;font-weight:700;"><span>Wallet Applied</span><b>-₹${parseFloat(order.wallet_discount).toFixed(2)}</b></div>` : ""}
        <div class="tot-row" style="border-top:1px solid #f1f5f9;padding-top:6px;">
          <span>Payment Mode</span>
          <b style="text-align:right;">${methodText}</b>
        </div>
        <div class="tot-grand">
          <span>${order?.status === "COMPLETED" ? "TOTAL AMOUNT PAID" : "TOTAL AMOUNT DUE"}</span>
          <span class="big">₹${(parseFloat(order?.total_amount || "0") || 0).toFixed(2)}</span>
        </div>
      </div>
    </div>

    <div class="ftr">
      <div class="ftr-terms">
        <div style="font-weight:900;text-transform:uppercase;margin-bottom:3px;color:#334155;">Terms & Conditions</div>
        ${termsHtml}
        <div style="margin-top:4px;font-weight:700;color:#047857;">Thank you for shopping with ${storeName}!</div>
      </div>
      <div class="ftr-sig">
        <div style="font-weight:700;color:#64748b;margin-bottom:2px;">For ${storeName}</div>
        ${signatureUrl ? `<img src="${signatureUrl}" class="sig-img" alt="Authorized Signature" />` : '<div style="width:140px;border-bottom:1px dashed #94a3b8;margin:18px 0 4px auto;"></div>'}
        <div style="font-weight:900;color:#0f172a;">Authorized Signatory</div>
        <div style="font-size:8px;color:#94a3b8;text-transform:uppercase;">Computer Generated Invoice</div>
      </div>
    </div>
  </div>
</body>
</html>`;
  };

  // Direct Download PDF Handler with custom filename Invoice_ORD-XXXX.pdf (using SAF on Android / FileSystem)
  const handleDownloadPdf = async () => {
    if (downloading || !order) return;

    const rawId = String(order?.id || orderId || "").trim();
    const numDigits = rawId.replace(/^ORD-?/i, "");
    const formattedOrdId = rawId.toUpperCase().startsWith("ORD-")
      ? rawId.toUpperCase()
      : `ORD-${numDigits.padStart(4, "0")}`;
    const fileName = `Invoice_${formattedOrdId}.pdf`;

    if (Platform.OS === "web") {
      // In web browser, trigger native print / Save as PDF
      if (typeof window !== "undefined" && window.print) {
        window.print();
      }
      return;
    }

    try {
      setDownloading(true);
      let html = "";
      try {
        const res = await apiClient.get(
          `/orders/${orderId || order?.id}/invoice/`,
        );
        if (res.data?.html) {
          html = res.data.html;
        }
      } catch {
        // Fallback to local template
      }
      if (!html) {
        html = generateInvoiceHtml();
      }
      const { uri, base64 } = await Print.printToFileAsync({
        html,
        base64: true,
      });

      // On Android, attempt direct save to chosen folder via StorageAccessFramework
      if (Platform.OS === "android" && FileSystem.StorageAccessFramework) {
        try {
          const cleanFileName = fileName.replace(/\.pdf$/i, "");
          let directoryUri = await getItem(SAVED_DOWNLOAD_DIR_KEY);

          // 1. If folder permission was already granted previously, save directly without prompting!
          if (directoryUri) {
            try {
              const newFileUri =
                await FileSystem.StorageAccessFramework.createFileAsync(
                  directoryUri,
                  cleanFileName,
                  "application/pdf",
                );
              if (base64) {
                await FileSystem.writeAsStringAsync(newFileUri, base64, {
                  encoding: FileSystem.EncodingType.Base64,
                });
              } else {
                const fileContent = await FileSystem.readAsStringAsync(uri, {
                  encoding: FileSystem.EncodingType.Base64,
                });
                await FileSystem.writeAsStringAsync(newFileUri, fileContent, {
                  encoding: FileSystem.EncodingType.Base64,
                });
              }
              Alert.alert(
                "Download Complete",
                `Invoice saved directly to your device as ${fileName}`,
              );
              return;
            } catch (existingDirErr) {
              console.log(
                "Previously remembered directory invalid or revoked, re-prompting:",
                existingDirErr,
              );
              await deleteItem(SAVED_DOWNLOAD_DIR_KEY);
              directoryUri = null;
            }
          }

          // 2. First-time only: request directory permission with Downloads pre-selected
          let initialDir: string | undefined;
          try {
            initialDir =
              FileSystem.StorageAccessFramework.getUriForDirectoryInRoot(
                "Download",
              );
          } catch {}

          const permissions =
            await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync(
              initialDir,
            );
          if (permissions.granted) {
            directoryUri = permissions.directoryUri;
            await saveItem(SAVED_DOWNLOAD_DIR_KEY, directoryUri);

            const newFileUri =
              await FileSystem.StorageAccessFramework.createFileAsync(
                directoryUri,
                cleanFileName,
                "application/pdf",
              );
            if (base64) {
              await FileSystem.writeAsStringAsync(newFileUri, base64, {
                encoding: FileSystem.EncodingType.Base64,
              });
            } else {
              const fileContent = await FileSystem.readAsStringAsync(uri, {
                encoding: FileSystem.EncodingType.Base64,
              });
              await FileSystem.writeAsStringAsync(newFileUri, fileContent, {
                encoding: FileSystem.EncodingType.Base64,
              });
            }
            Alert.alert(
              "Download Complete",
              `Invoice saved directly to your device as ${fileName}`,
            );
            return;
          }
        } catch (safErr) {
          console.log(
            "SAF prompt dismissed or error, saving to App Documents and sharing:",
            safErr,
          );
        }
      }

      // Direct copy to documents directory with the exact custom filename
      const targetUri = `${FileSystem.documentDirectory}${fileName}`;
      await FileSystem.copyAsync({ from: uri, to: targetUri });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(targetUri, {
          mimeType: "application/pdf",
          dialogTitle: `Download ${fileName}`,
          UTI: "com.adobe.pdf",
        });
      } else {
        Alert.alert("Download Complete", `Invoice saved as ${fileName}`);
      }
    } catch (err: any) {
      console.error("Error generating PDF:", err);
      Alert.alert("Error", "Failed to generate invoice PDF.");
    } finally {
      setDownloading(false);
    }
  };

  // Share Button Handler (shares generated PDF via share sheet or text summary fallback)
  const handleShare = async () => {
    if (!order) return;
    try {
      setDownloading(true);
      const rawId = String(order?.id || orderId || "").trim();
      const numDigits = rawId.replace(/^ORD-?/i, "");
      const formattedOrdId = rawId.toUpperCase().startsWith("ORD-")
        ? rawId.toUpperCase()
        : `ORD-${numDigits.padStart(4, "0")}`;
      const fileName = `Invoice_${formattedOrdId}.pdf`;

      let html = "";
      try {
        const res = await apiClient.get(
          `/orders/${orderId || order?.id}/invoice/`,
        );
        if (res.data?.html) {
          html = res.data.html;
        }
      } catch {
        // Fallback to local template
      }
      if (!html) {
        html = generateInvoiceHtml();
      }
      const { uri } = await Print.printToFileAsync({ html });
      const targetUri = `${FileSystem.documentDirectory}${fileName}`;
      await FileSystem.copyAsync({ from: uri, to: targetUri });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(targetUri, {
          mimeType: "application/pdf",
          dialogTitle: `Share ${fileName}`,
          UTI: "com.adobe.pdf",
        });
      } else {
        const itemsText = (order.items || [])
          .filter((i: any) => i.status !== "REJECTED")
          .map(
            (i: any) =>
              `• ${i.quantity}x ${i.product_name_snapshot || i.product_name} - ₹${(parseFloat(i.subtotal || i.price_snapshot || "0") || 0).toFixed(2)}`,
          )
          .join("\n");

        const message =
          `🧾 *INVOICE: ${invoiceNumber}*\n` +
          `🏪 *Store:* ${settings?.store_name || "Narendra Kirana Store"}\n` +
          `📅 *Date:* ${orderDate}\n` +
          `📦 *Type:* ${isDelivery ? "Home Delivery" : "Store Pickup"}\n\n` +
          `*Items Ordered:*\n${itemsText}\n\n` +
          `💰 *Total Paid:* ₹${(parseFloat(order?.total_amount || "0") || 0).toFixed(2)}\n\n` +
          `Thank you for shopping with Narendra Kirana!`;

        await Share.share({ message });
      }
    } catch (err) {
      console.error("Error sharing receipt:", err);
    } finally {
      setDownloading(false);
    }
  };

  if (!user) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: "#F1F5F9" }]}
        edges={["top"]}
      >
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <View
          style={[
            styles.webActionBar,
            { backgroundColor: "#FFFFFF", borderBottomColor: "#E2E8F0" },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.backToOrderBtn,
              { backgroundColor: "#F8FAFC", borderColor: "#E2E8F0" },
            ]}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            onPress={() =>
              navigation.canGoBack()
                ? navigation.goBack()
                : navigation.navigate("Main")
            }
            activeOpacity={0.7}
          >
            <Feather name="arrow-left" size={15} color="#334155" />
            <Text style={[styles.backToOrderText, { color: "#334155" }]}>
              Back to Order
            </Text>
          </TouchableOpacity>
        </View>
        <View style={styles.guestStateContainer}>
          <View style={[styles.guestIconBox, { backgroundColor: "#ECFDF5" }]}>
            <Feather name="file-text" size={44} color="#059669" />
          </View>
          <Text style={[styles.guestTitle, { color: "#0F172A" }]}>
            Sign In to View Invoice
          </Text>
          <Text style={[styles.guestSubtitle, { color: "#64748B" }]}>
            Please sign in to view and download official GST tax invoices for
            your purchases.
          </Text>
          <TouchableOpacity
            style={[styles.guestSignInBtn, { backgroundColor: "#059669" }]}
            onPress={() => navigation.navigate("Login")}
            activeOpacity={0.85}
          >
            <Feather
              name="log-in"
              size={16}
              color="#FFFFFF"
              style={{ marginRight: 8 }}
            />
            <Text style={styles.guestSignInBtnText}>Sign In / Register</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: "#F1F5F9" }]}
        edges={["top"]}
      >
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <View
          style={[
            styles.webActionBar,
            { backgroundColor: "#FFFFFF", borderBottomColor: "#E2E8F0" },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.backToOrderBtn,
              { backgroundColor: "#F8FAFC", borderColor: "#E2E8F0" },
            ]}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            onPress={() =>
              navigation.canGoBack()
                ? navigation.goBack()
                : navigation.navigate("Main")
            }
            activeOpacity={0.7}
          >
            <Feather name="arrow-left" size={15} color="#334155" />
            <Text style={[styles.backToOrderText, { color: "#334155" }]}>
              Back to Order
            </Text>
          </TouchableOpacity>

          <View style={styles.actionButtonsRight}>
            <View style={[styles.downloadPdfButton, { opacity: 0.4 }]}>
              <Feather name="printer" size={15} color="#FFFFFF" />
              <Text style={styles.downloadPdfButtonText}>
                Download / Print PDF
              </Text>
            </View>
            <View style={[styles.shareIconButton, { opacity: 0.4 }]}>
              <Feather name="share-2" size={15} color="#059669" />
            </View>
          </View>
        </View>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#059669" />
          <Text style={[styles.loadingText, { color: "#64748B" }]}>
            Loading invoice...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !order) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: "#F1F5F9" }]}
        edges={["top"]}
      >
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <View
          style={[
            styles.webActionBar,
            { backgroundColor: "#FFFFFF", borderBottomColor: "#E2E8F0" },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.backToOrderBtn,
              { backgroundColor: "#F8FAFC", borderColor: "#E2E8F0" },
            ]}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            onPress={() =>
              navigation.canGoBack()
                ? navigation.goBack()
                : navigation.navigate("Main")
            }
            activeOpacity={0.7}
          >
            <Feather name="arrow-left" size={15} color="#334155" />
            <Text style={[styles.backToOrderText, { color: "#334155" }]}>
              Back to Order
            </Text>
          </TouchableOpacity>
        </View>
        <View style={styles.center}>
          <Feather name="alert-circle" size={48} color="#DC2626" />
          <Text style={styles.errorText}>
            {error || "Could not load invoice"}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: "#F1F5F9" }]}
      edges={["top"]}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      {/* Action Bar matching web Invoice.jsx:76-86 */}
      <View
        style={[
          styles.webActionBar,
          { backgroundColor: "#FFFFFF", borderBottomColor: "#E2E8F0" },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.backToOrderBtn,
            { backgroundColor: "#F8FAFC", borderColor: "#E2E8F0" },
          ]}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          onPress={() =>
            navigation.canGoBack()
              ? navigation.goBack()
              : navigation.navigate("Main")
          }
          activeOpacity={0.7}
        >
          <Feather name="arrow-left" size={15} color="#334155" />
          <Text style={[styles.backToOrderText, { color: "#334155" }]}>
            Back to Order
          </Text>
        </TouchableOpacity>

        <View style={styles.actionButtonsRight}>
          <TouchableOpacity
            style={styles.downloadPdfButton}
            onPress={handleDownloadPdf}
            disabled={downloading}
            activeOpacity={0.85}
          >
            {downloading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Feather name="printer" size={15} color="#FFFFFF" />
            )}
            <Text style={styles.downloadPdfButtonText}>
              {downloading ? "Saving..." : "Download / Print PDF"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.shareIconButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            onPress={handleShare}
            disabled={downloading}
            activeOpacity={0.75}
          >
            <Feather name="share-2" size={15} color="#059669" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Printable A4 Container exactly matching web app and official tax invoice */}
        <View style={styles.invoicePaper}>
          {/* Cancelled Stamp (if rejected) */}
          {isRejected && (
            <View style={styles.cancelledStampWrap}>
              <View style={styles.cancelledStampBox}>
                <Text style={styles.cancelledStampText}>CANCELLED</Text>
              </View>
            </View>
          )}

          <View style={[styles.docBody, isRejected && styles.docBodyRejected]}>
            {/* Top Store Header & Document Meta */}
            <View style={styles.docTopHeader}>
              {/* Store Brand */}
              <View style={styles.docStoreCol}>
                <View style={styles.docStoreRow}>
                  <Image
                    source={
                      settings?.store_logo
                        ? { uri: fixImageUrl(settings.store_logo) }
                        : require("../../../assets/narendra-logo.png")
                    }
                    style={styles.docLogoImg}
                    contentFit="contain"
                  />
                  <View style={styles.docStoreTitleCol}>
                    <Text style={styles.docStoreName}>
                      {settings?.store_name || "Narendra Kirana Store"}
                    </Text>
                    <Text style={styles.docStoreTag}>
                      GROCERY & DAILY ESSENTIALS
                    </Text>
                  </View>
                </View>

                <View style={styles.docContactWrap}>
                  {settings?.store_address ? (
                    <View style={styles.docContactRow}>
                      <Ionicons
                        name="location-outline"
                        size={13}
                        color="#94a3b8"
                        style={{ marginTop: 1 }}
                      />
                      <Text style={styles.docContactText}>
                        {settings.store_address}
                      </Text>
                    </View>
                  ) : null}

                  {Boolean(settings?.store_phone || settings?.store_email) && (
                    <View style={styles.docContactRow}>
                      {settings?.store_phone ? (
                        <View style={styles.docInlineMeta}>
                          <Ionicons
                            name="call-outline"
                            size={12}
                            color="#94a3b8"
                          />
                          <Text style={styles.docContactText}>
                            {settings.store_phone}
                          </Text>
                        </View>
                      ) : null}
                      {Boolean(
                        settings?.store_phone && settings?.store_email,
                      ) && <Text style={styles.docMetaDot}>•</Text>}
                      {settings?.store_email ? (
                        <View style={styles.docInlineMeta}>
                          <Ionicons
                            name="mail-outline"
                            size={12}
                            color="#94a3b8"
                          />
                          <Text style={styles.docContactText}>
                            {settings.store_email}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  )}
                </View>
              </View>

              {/* Invoice Official Meta */}
              <View style={styles.docMetaCol}>
                <View style={styles.docMetaHeadingRow}>
                  <Text style={styles.docTaxInvoiceHeading}>TAX INVOICE</Text>
                  <View style={styles.docOriginalBadge}>
                    <Text style={styles.docOriginalBadgeText}>
                      ORIGINAL FOR RECIPIENT
                    </Text>
                  </View>
                </View>

                <View style={styles.docMetaCard}>
                  <View style={styles.docMetaRow}>
                    <Text style={styles.docMetaLabel}>Invoice No:</Text>
                    <Text style={styles.docMetaVal}>{invoiceNumber}</Text>
                  </View>
                  <View style={styles.docMetaRow}>
                    <Text style={styles.docMetaLabel}>Invoice Date:</Text>
                    <Text style={styles.docMetaValSimple}>
                      {invoiceDateFormatted}
                    </Text>
                  </View>
                  <View style={styles.docMetaRow}>
                    <Text style={styles.docMetaLabel}>Order Reference:</Text>
                    <Text style={styles.docMetaVal}>{orderReference}</Text>
                  </View>
                  <View style={styles.docMetaRow}>
                    <Text style={styles.docMetaLabel}>Order Date:</Text>
                    <Text style={styles.docMetaValSimple}>
                      {orderDateFormatted}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Compliance Strip (GSTIN & FSSAI) */}
            {Boolean(
              settings?.gstin ||
              settings?.fssai_license_number ||
              settings?.fssai_number,
            ) && (
              <View style={styles.complianceStrip}>
                {settings?.gstin ? (
                  <View style={styles.complianceItem}>
                    <Text style={styles.complianceLabel}>GSTIN:</Text>
                    <Text style={styles.complianceVal}>{settings.gstin}</Text>
                  </View>
                ) : null}
                {settings?.fssai_license_number || settings?.fssai_number ? (
                  <View style={styles.complianceItem}>
                    <Ionicons
                      name="checkmark-circle"
                      size={13}
                      color="#059669"
                    />
                    <Text style={styles.complianceLabel}>FSSAI Lic. No:</Text>
                    <Text style={styles.complianceVal}>
                      {settings?.fssai_license_number || settings?.fssai_number}
                    </Text>
                    <View style={styles.govtRegPill}>
                      <Text style={styles.govtRegText}>GOVT REG.</Text>
                    </View>
                  </View>
                ) : null}
                <Text style={styles.placeOfSupplyText}>
                  Place of Supply:{" "}
                  <Text style={{ fontWeight: "800", color: "#1e293b" }}>
                    State Code (09)
                  </Text>
                </Text>
              </View>
            )}

            {/* Customer & Fulfillment Info Grid (2 Columns) */}
            <View style={styles.infoGridRow}>
              {/* Billed / Shipped To */}
              <View style={styles.infoGridCard}>
                <Text style={styles.infoGridHeader}>BILLED / SHIPPED TO</Text>
                <Text style={styles.infoGridName}>
                  {order.customer_name || `Customer #${order.customer ?? "—"}`}
                </Text>
                {order.customer_phone ? (
                  <View style={styles.infoSubRow}>
                    <Ionicons name="call-outline" size={12} color="#94a3b8" />
                    <Text style={styles.infoSubText}>
                      {order.customer_phone}
                    </Text>
                  </View>
                ) : null}
                <View style={{ paddingTop: 3 }}>
                  <Text style={styles.infoAddressText}>
                    {isDelivery
                      ? order.delivery_address || "Home Delivery Address"
                      : "Store Counter Pickup"}
                  </Text>
                  {order.delivery_pincode ? (
                    <Text style={styles.infoPinText}>
                      PIN: {order.delivery_pincode}
                    </Text>
                  ) : null}
                </View>
              </View>

              {/* Fulfillment Details */}
              <View style={styles.infoGridCard}>
                <Text style={styles.infoGridHeader}>FULFILLMENT DETAILS</Text>
                <View style={styles.infoDetailLine}>
                  <Text style={styles.infoDetailLabel}>Fulfillment Mode:</Text>
                  <Text style={styles.infoDetailVal}>
                    {isDelivery ? "Home Delivery" : "Store Pickup"}
                  </Text>
                </View>
                {order.delivery_slot_label ? (
                  <View style={styles.infoDetailLine}>
                    <Text style={styles.infoDetailLabel}>Scheduled Slot:</Text>
                    <Text
                      style={[
                        styles.infoDetailVal,
                        { color: "#4338ca", fontWeight: "800" },
                      ]}
                    >
                      {order.delivery_slot_date
                        ? `${order.delivery_slot_date} `
                        : ""}
                      ({order.delivery_slot_label})
                    </Text>
                  </View>
                ) : order.pickup_time ? (
                  <View style={styles.infoDetailLine}>
                    <Text style={styles.infoDetailLabel}>Pickup Slot:</Text>
                    <Text style={styles.infoDetailVal}>
                      {order.pickup_time}
                    </Text>
                  </View>
                ) : null}
                <View style={styles.infoDetailLine}>
                  <Text style={styles.infoDetailLabel}>Order Status:</Text>
                  <Text
                    style={[
                      styles.infoDetailVal,
                      {
                        color:
                          order.status === "COMPLETED"
                            ? "#047857"
                            : isRejected
                              ? "#e11d48"
                              : "#1e293b",
                        fontWeight: "800",
                      },
                    ]}
                  >
                    {order.status}
                  </Text>
                </View>
                <View style={styles.infoDetailLine}>
                  <Text style={styles.infoDetailLabel}>Payment Status:</Text>
                  <Text
                    style={[
                      styles.infoDetailVal,
                      {
                        color:
                          order.status === "COMPLETED"
                            ? "#047857"
                            : isRejected
                              ? "#e11d48"
                              : "#047857",
                        fontWeight: "800",
                      },
                    ]}
                  >
                    {order.status === "COMPLETED"
                      ? "PAID"
                      : isRejected
                        ? "CANCELLED"
                        : "DUE AT DELIVERY"}
                  </Text>
                </View>
              </View>
            </View>

            {/* Items Table */}
            <View style={styles.itemsTableCard}>
              <View style={styles.tableHeaderRow}>
                <Text
                  style={[
                    styles.tableColHead,
                    { width: 24, textAlign: "center" },
                  ]}
                >
                  #
                </Text>
                <Text style={[styles.tableColHead, { flex: 1 }]}>
                  ITEM DESCRIPTION
                </Text>
                <Text
                  style={[
                    styles.tableColHead,
                    { width: 34, textAlign: "center" },
                  ]}
                >
                  QTY
                </Text>
                <Text
                  style={[
                    styles.tableColHead,
                    { width: 58, textAlign: "right" },
                  ]}
                >
                  RATE (₹)
                </Text>
                <Text
                  style={[
                    styles.tableColHead,
                    { width: 68, textAlign: "right" },
                  ]}
                >
                  AMOUNT (₹)
                </Text>
              </View>

              {(order.items || []).map((item: any, idx: number) => {
                const qty = Number(item.quantity || 1);
                const price =
                  parseFloat(
                    item.price_snapshot || item.price_at_order || "0",
                  ) || 0;
                const lineTotal = parseFloat(item.subtotal) || price * qty;
                const isRej = item.status === "REJECTED";

                return (
                  <View
                    key={item.id || idx}
                    style={[
                      styles.tableBodyRow,
                      isRej && styles.tableBodyRowRejected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.tableCellNum,
                        isRej && { color: "#94a3b8" },
                      ]}
                    >
                      {idx + 1}
                    </Text>
                    <View style={{ flex: 1, paddingRight: 6 }}>
                      <View style={styles.tableItemTitleWrap}>
                        <Text
                          style={[
                            styles.tableCellItemName,
                            isRej && {
                              textDecorationLine: "line-through",
                              color: "#94a3b8",
                            },
                          ]}
                        >
                          {item.product_name_snapshot ||
                            item.product_name ||
                            "Item"}
                        </Text>
                        {isRej ? (
                          <View style={styles.unavailableBadge}>
                            <Text style={styles.unavailableBadgeText}>
                              UNAVAILABLE
                            </Text>
                          </View>
                        ) : null}
                      </View>
                      {item.unit_snapshot ? (
                        <Text style={styles.tableCellItemUnit}>
                          {item.unit_snapshot}
                        </Text>
                      ) : null}
                    </View>
                    <Text
                      style={[
                        styles.tableCellQty,
                        isRej && {
                          color: "#94a3b8",
                          textDecorationLine: "line-through",
                        },
                      ]}
                    >
                      {qty}
                    </Text>
                    <Text
                      style={[
                        styles.tableCellRate,
                        isRej && {
                          color: "#94a3b8",
                          textDecorationLine: "line-through",
                        },
                      ]}
                    >
                      {price.toFixed(2)}
                    </Text>
                    <Text
                      style={[
                        styles.tableCellTotal,
                        isRej && { color: "#94a3b8" },
                      ]}
                    >
                      {isRej ? "0.00" : lineTotal.toFixed(2)}
                    </Text>
                  </View>
                );
              })}
            </View>

            {/* Cost Breakdown & Grand Total Box */}
            <View style={styles.totalsSection}>
              <View style={styles.totalsCard}>
                <View style={styles.totalsBody}>
                  <View style={styles.totalLineRow}>
                    <Text style={styles.totalLineLabel}>
                      Subtotal ({validItems.length} items)
                    </Text>
                    <Text style={styles.totalLineVal}>
                      ₹{(subtotal || 0).toFixed(2)}
                    </Text>
                  </View>

                  {parseFloat(order.discount_applied || "0") > 0 ? (
                    <View style={styles.totalLineRow}>
                      <Text
                        style={[styles.totalLineLabel, { color: "#4338ca" }]}
                      >
                        Product Savings
                      </Text>
                      <Text style={[styles.totalLineVal, { color: "#4338ca" }]}>
                        -₹{parseFloat(order.discount_applied).toFixed(2)}
                      </Text>
                    </View>
                  ) : null}

                  {parseFloat(order.promo_discount || "0") > 0 ? (
                    <View style={styles.totalLineRow}>
                      <Text
                        style={[styles.totalLineLabel, { color: "#047857" }]}
                      >
                        Promo Discount
                      </Text>
                      <Text style={[styles.totalLineVal, { color: "#047857" }]}>
                        -₹{parseFloat(order.promo_discount).toFixed(2)}
                      </Text>
                    </View>
                  ) : null}

                  {parseFloat(order.packaging_fee || "0") > 0 ? (
                    <View style={styles.totalLineRow}>
                      <Text style={styles.totalLineLabel}>Packaging Fee</Text>
                      <Text style={styles.totalLineVal}>
                        ₹{parseFloat(order.packaging_fee).toFixed(2)}
                      </Text>
                    </View>
                  ) : null}

                  {isDelivery ? (
                    <View style={styles.totalLineRow}>
                      <Text style={styles.totalLineLabel}>Delivery Fee</Text>
                      <Text style={styles.totalLineVal}>
                        {parseFloat(order.delivery_fee || "0") > 0
                          ? `₹${parseFloat(order.delivery_fee).toFixed(2)}`
                          : "FREE"}
                      </Text>
                    </View>
                  ) : null}

                  {parseFloat(order.wallet_discount || "0") > 0 ? (
                    <View style={styles.totalLineRow}>
                      <Text
                        style={[styles.totalLineLabel, { color: "#047857" }]}
                      >
                        Wallet Applied
                      </Text>
                      <Text style={[styles.totalLineVal, { color: "#047857" }]}>
                        -₹{parseFloat(order.wallet_discount).toFixed(2)}
                      </Text>
                    </View>
                  ) : null}

                  <View
                    style={[
                      styles.totalLineRow,
                      {
                        borderTopWidth: 1,
                        borderTopColor: "#f1f5f9",
                        paddingTop: 5,
                      },
                    ]}
                  >
                    <Text style={styles.totalLineLabel}>Payment Mode</Text>
                    <Text style={[styles.totalLineVal, { textAlign: "right" }]}>
                      {methodText}
                    </Text>
                  </View>
                </View>

                <View style={styles.grandTotalBanner}>
                  <Text style={styles.grandTotalBannerLabel}>
                    {order.status === "COMPLETED"
                      ? "TOTAL AMOUNT PAID"
                      : "TOTAL AMOUNT DUE"}
                  </Text>
                  <Text style={styles.grandTotalBannerAmount}>
                    ₹{(parseFloat(order.total_amount || "0") || 0).toFixed(2)}
                  </Text>
                </View>
              </View>
            </View>

            {/* Footer & Signature */}
            <View style={styles.docFooterRow}>
              <View style={styles.docTermsCol}>
                <View style={styles.docTermsHeader}>
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={13}
                    color="#059669"
                  />
                  <Text style={styles.docTermsTitle}>TERMS & CONDITIONS</Text>
                </View>
                {termsList.map((termLine: string, idx: number) => (
                  <Text key={idx} style={styles.docTermLine}>
                    {termLine}
                  </Text>
                ))}
                <Text style={styles.docStoreGreeting}>
                  Thank you for shopping with{" "}
                  {settings?.store_name || "Narendra Kirana Store"}!
                </Text>
              </View>

              <View style={styles.docSigCol}>
                <Text style={styles.docSigForStore}>
                  For {settings?.store_name || "Narendra Kirana Store"}
                </Text>
                <View style={styles.docSigBox}>
                  {signatureUrl ? (
                    <Image
                      source={{ uri: signatureUrl }}
                      style={styles.docSigImg}
                      contentFit="contain"
                    />
                  ) : (
                    <View style={styles.docSigDashedLine} />
                  )}
                </View>
                <Text style={styles.docSigLabel}>Authorized Signatory</Text>
                <Text style={styles.docSigSubLabel}>
                  COMPUTER GENERATED INVOICE
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Need Help? Chat on WhatsApp Button */}
        <TouchableOpacity
          style={styles.whatsAppHelpBtn}
          onPress={handleWhatsAppHelp}
          activeOpacity={0.85}
        >
          <Ionicons name="logo-whatsapp" size={18} color="#FFFFFF" />
          <Text style={styles.whatsAppHelpBtnText}>
            Need Help? Chat on WhatsApp
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F1F5F9", // bg-slate-100 matching web
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    lineHeight: 22,
    fontWeight: "bold",
    color: "#0F172A",
  },
  headerActionBtn: {
    padding: 4,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: theme.spacing.xl,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#64748B",
    fontWeight: "500",
  },
  errorText: {
    marginTop: 12,
    fontSize: 15,
    color: "#DC2626",
    fontWeight: "600",
    textAlign: "center",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 130,
  },
  webActionBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  backToOrderBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F8FAFC",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    boxShadow: "0px 1px 2px rgba(0, 0, 0, 0.05)",
    elevation: 1,
  },
  backToOrderText: {
    color: "#334155",
    fontWeight: "600",
    fontSize: 13,
  },
  actionButtonsRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  downloadPdfButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#059669", // emerald-600 matching web
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    boxShadow: "0px 2px 4px rgba(5, 150, 105, 0.18)",
    elevation: 2,
  },
  downloadPdfButtonText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 13,
  },
  shareIconButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    justifyContent: "center",
    alignItems: "center",
  },
  invoicePaper: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    boxShadow: "0px 4px 16px rgba(100, 116, 139, 0.08)",
    elevation: 3,
    position: "relative",
    overflow: "hidden",
  },
  cancelledStampWrap: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
    pointerEvents: "none",
    zIndex: 50,
  },
  cancelledStampBox: {
    borderWidth: 5,
    borderColor: "#E11D48",
    borderRadius: 14,
    paddingHorizontal: 28,
    paddingVertical: 10,
    transform: [{ rotate: "-15deg" }],
    opacity: 0.25,
  },
  cancelledStampText: {
    color: "#E11D48",
    fontSize: 42,
    fontWeight: "900",
    letterSpacing: 6,
  },
  docBody: {
    position: "relative",
    zIndex: 10,
  },
  docBodyRejected: {
    opacity: 0.88,
  },

  // Top Header (Store Brand & Document Meta)
  docTopHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    paddingBottom: 16,
    marginBottom: 14,
    gap: 8,
  },
  docStoreCol: {
    flex: 1,
    alignItems: "flex-start",
    gap: 6,
  },
  docStoreRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  docLogoImg: {
    width: 44,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
  },
  docStoreTitleCol: {
    flex: 1,
  },
  docStoreName: {
    fontSize: 18,
    fontWeight: "900",
    color: "#0F172A",
    letterSpacing: -0.3,
    lineHeight: 22,
  },
  docStoreTag: {
    fontSize: 10,
    fontWeight: "700",
    color: "#047857",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginTop: 1,
  },
  docContactWrap: {
    gap: 3,
    paddingTop: 3,
  },
  docContactRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  docContactText: {
    fontSize: 11,
    color: "#475569",
    lineHeight: 16,
  },
  docInlineMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  docMetaDot: {
    fontSize: 11,
    color: "#94A3B8",
    marginHorizontal: 2,
  },

  // Official Meta Box
  docMetaCol: {
    alignItems: "flex-end",
    gap: 4,
  },
  docMetaHeadingRow: {
    alignItems: "flex-end",
    gap: 2,
  },
  docTaxInvoiceHeading: {
    fontSize: 16,
    fontWeight: "900",
    color: "#0F172A",
    letterSpacing: -0.5,
  },
  docOriginalBadge: {
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
  },
  docOriginalBadgeText: {
    color: "#065F46",
    fontSize: 8.5,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  docMetaCard: {
    backgroundColor: "transparent",
    borderWidth: 0,
    padding: 0,
    marginTop: 4,
    gap: 3,
  },
  docMetaRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 8,
  },
  docMetaLabel: {
    fontSize: 10.5,
    color: "#64748B",
    fontWeight: "500",
  },
  docMetaVal: {
    fontSize: 11,
    fontWeight: "800",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    color: "#0F172A",
  },
  docMetaValSimple: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#0F172A",
  },

  // Compliance Strip
  complianceStrip: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 14,
    gap: 6,
  },
  complianceItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  complianceLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#475569",
  },
  complianceVal: {
    fontSize: 10.5,
    fontWeight: "800",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    color: "#0F172A",
  },
  govtRegPill: {
    backgroundColor: "#D1FAE5",
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 3,
  },
  govtRegText: {
    fontSize: 7.5,
    fontWeight: "900",
    color: "#065F46",
  },
  placeOfSupplyText: {
    fontSize: 10,
    color: "#64748B",
  },

  // Customer & Fulfillment Info Grid
  infoGridRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 14,
  },
  infoGridCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    padding: 10,
    backgroundColor: "#FFFFFF",
    gap: 4,
  },
  infoGridHeader: {
    fontSize: 9,
    fontWeight: "900",
    color: "#94A3B8",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    paddingBottom: 4,
    marginBottom: 2,
  },
  infoGridName: {
    fontSize: 13,
    fontWeight: "900",
    color: "#0F172A",
  },
  infoSubRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  infoSubText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#334155",
  },
  infoAddressText: {
    fontSize: 10.5,
    color: "#475569",
    lineHeight: 15,
  },
  infoPinText: {
    fontSize: 9.5,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    color: "#64748B",
    marginTop: 2,
  },
  infoDetailLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 4,
  },
  infoDetailLabel: {
    fontSize: 10,
    color: "#64748B",
  },
  infoDetailVal: {
    fontSize: 10,
    fontWeight: "700",
    color: "#0F172A",
  },

  // Items Table
  itemsTableCard: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    overflow: "hidden",
    marginBottom: 14,
    backgroundColor: "#FFFFFF",
  },
  tableHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 8,
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  tableColHead: {
    fontSize: 9,
    fontWeight: "900",
    color: "#475569",
    letterSpacing: 0.5,
  },
  tableBodyRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F8FAFC",
  },
  tableBodyRowRejected: {
    backgroundColor: "#FFF1F2",
    opacity: 0.7,
  },
  tableCellNum: {
    width: 24,
    textAlign: "center",
    fontSize: 10,
    fontWeight: "700",
    color: "#64748B",
  },
  tableItemTitleWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flexWrap: "wrap",
  },
  tableCellItemName: {
    fontSize: 11,
    fontWeight: "800",
    color: "#0F172A",
  },
  tableCellItemUnit: {
    fontSize: 9.5,
    color: "#64748B",
    marginTop: 1,
  },
  unavailableBadge: {
    backgroundColor: "#FFE4E6",
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
  },
  unavailableBadgeText: {
    fontSize: 7.5,
    fontWeight: "900",
    color: "#E11D48",
  },
  tableCellQty: {
    width: 34,
    textAlign: "center",
    fontSize: 10.5,
    fontWeight: "700",
    color: "#334155",
  },
  tableCellRate: {
    width: 58,
    textAlign: "right",
    fontSize: 10.5,
    color: "#334155",
  },
  tableCellTotal: {
    width: 68,
    textAlign: "right",
    fontSize: 10.5,
    fontWeight: "800",
    color: "#0F172A",
  },

  // Totals Section
  totalsSection: {
    alignItems: "flex-end",
    marginBottom: 16,
  },
  totalsCard: {
    width: 280,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
  },
  totalsBody: {
    padding: 10,
    gap: 5,
  },
  totalLineRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalLineLabel: {
    fontSize: 10.5,
    color: "#475569",
  },
  totalLineVal: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#0F172A",
  },
  grandTotalBanner: {
    backgroundColor: "#ECFDF5",
    borderTopWidth: 2,
    borderTopColor: "#059669",
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  grandTotalBannerLabel: {
    fontSize: 11,
    fontWeight: "900",
    color: "#065F46",
    letterSpacing: 0.5,
  },
  grandTotalBannerAmount: {
    fontSize: 16,
    fontWeight: "900",
    color: "#047857",
  },

  // Footer & Signature
  docFooterRow: {
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    paddingTop: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 16,
  },
  docTermsCol: {
    flex: 1,
    gap: 3,
  },
  docTermsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 2,
  },
  docTermsTitle: {
    fontSize: 9.5,
    fontWeight: "900",
    color: "#334155",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  docTermLine: {
    fontSize: 9.5,
    color: "#64748B",
    lineHeight: 13,
  },
  docStoreGreeting: {
    fontSize: 9.5,
    fontWeight: "700",
    color: "#047857",
    marginTop: 4,
  },
  docSigCol: {
    alignItems: "flex-end",
    justifyContent: "flex-end",
    minWidth: 120,
  },
  docSigForStore: {
    fontSize: 9.5,
    fontWeight: "700",
    color: "#64748B",
    marginBottom: 4,
  },
  docSigBox: {
    height: 38,
    justifyContent: "center",
    alignItems: "flex-end",
    marginBottom: 2,
  },
  docSigImg: {
    width: 100,
    height: 36,
  },
  docSigDashedLine: {
    width: 110,
    borderBottomWidth: 1,
    borderBottomColor: "#94A3B8",
    borderStyle: "dashed",
    marginTop: 20,
  },
  docSigLabel: {
    fontSize: 10,
    fontWeight: "900",
    color: "#0F172A",
  },
  docSigSubLabel: {
    fontSize: 7.5,
    color: "#94A3B8",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginTop: 1,
  },
  guestStateContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
    paddingBottom: 60,
  },
  guestIconBox: {
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  guestTitle: {
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 8,
    textAlign: "center",
    color: "#0F172A",
  },
  guestSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    marginBottom: 24,
    color: "#64748B",
  },
  guestSignInBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 14,
    boxShadow: "0px 4px 8px rgba(5, 150, 105, 0.2)",
    elevation: 4,
  },
  guestSignInBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
  fssaiBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: "flex-start",
    marginTop: 4,
  },
  fssaiBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#047857",
  },
  gstinText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#334155",
    marginTop: 3,
  },
  whatsAppHelpBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#16A34A",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
    marginTop: 16,
    marginBottom: 24,
    marginHorizontal: 12,
    boxShadow: "0px 3px 5px rgba(22, 163, 74, 0.25)",
    elevation: 4,
  },
  whatsAppHelpBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
});

export default InvoiceScreen;
