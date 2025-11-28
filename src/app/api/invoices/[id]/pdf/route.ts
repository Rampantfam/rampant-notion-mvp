import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

export const runtime = "nodejs";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatDate(date: string | null) {
  if (!date) return "—";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(parsed);
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> | { id: string } }) {
  const resolvedParams = params instanceof Promise ? await params : params;
  const invoiceId = resolvedParams.id;
  try {
    if (!url || !serviceKey) {
      return NextResponse.json({ error: "Server missing Supabase credentials" }, { status: 500 });
    }

    const supabaseAdmin = createClient(url, serviceKey, { auth: { persistSession: false } });

    // Fetch invoice
    const { data: invoice, error: invoiceError } = await supabaseAdmin
      .from("invoices")
      .select("*")
      .eq("id", invoiceId)
      .maybeSingle();

    if (invoiceError || !invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    // Fetch client if available
    let clientName = "Unknown Client";
    if (invoice.client_id) {
      const { data: clientData } = await supabaseAdmin
        .from("clients")
        .select("name")
        .eq("id", invoice.client_id)
        .maybeSingle();
      if (clientData) {
        clientName = clientData.name;
      }
    }

    // Process line items
    const lineItems = (invoice.line_items as any[]) || [];
    const subtotal = lineItems.reduce((sum, item) => sum + (item.lineTotal || item.qty * item.rate || 0), 0);
    const tax = 0;
    const total = invoice.amount || subtotal;

    // Create PDF
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([612, 792]); // US Letter size
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontSize = 12;
    const smallFontSize = 10;
    let y = 750;

    // Header
    page.drawText("INVOICE", {
      x: 50,
      y,
      size: 24,
      font: boldFont,
      color: rgb(0, 0, 0),
    });

    y -= 40;

    // Invoice details
    const invoiceNumber = invoice.invoice_number || invoice.id.substring(0, 8);
    page.drawText(`Invoice #: ${invoiceNumber}`, {
      x: 50,
      y,
      size: fontSize,
      font: font,
    });

    y -= 20;
    page.drawText(`Client: ${clientName}`, {
      x: 50,
      y,
      size: fontSize,
      font: font,
    });

    y -= 20;
    if (invoice.issue_date) {
      page.drawText(`Issue Date: ${formatDate(invoice.issue_date)}`, {
        x: 50,
        y,
        size: fontSize,
        font: font,
      });
      y -= 20;
    }

    if (invoice.due_date) {
      page.drawText(`Due Date: ${formatDate(invoice.due_date)}`, {
        x: 50,
        y,
        size: fontSize,
        font: font,
      });
      y -= 20;
    }

    const statusText = invoice.status === "PAID" ? "Paid" : invoice.status === "PAST_DUE" ? "Past Due" : "Unpaid";
    page.drawText(`Status: ${statusText}`, {
      x: 50,
      y,
      size: fontSize,
      font: font,
    });

    y -= 40;

    // Bill to address
    if (invoice.bill_to) {
      page.drawText("Bill To:", {
        x: 50,
        y,
        size: fontSize,
        font: boldFont,
      });
      y -= 20;
      const billToLines = invoice.bill_to.split("\n");
      for (const line of billToLines) {
        if (line.trim()) {
          page.drawText(line.trim(), {
            x: 50,
            y,
            size: smallFontSize,
            font: font,
          });
          y -= 15;
        }
      }
      y -= 20;
    }

    // Line items table
    y -= 20;
    page.drawText("Line Items", {
      x: 50,
      y,
      size: 16,
      font: boldFont,
    });
    y -= 30;

    // Table headers
    const colX = [50, 200, 400, 450, 500];
    page.drawText("Item", { x: colX[0], y, size: smallFontSize, font: boldFont });
    page.drawText("Description", { x: colX[1], y, size: smallFontSize, font: boldFont });
    page.drawText("Qty", { x: colX[2], y, size: smallFontSize, font: boldFont });
    page.drawText("Rate", { x: colX[3], y, size: smallFontSize, font: boldFont });
    page.drawText("Total", { x: colX[4], y, size: smallFontSize, font: boldFont });

    y -= 20;
    page.drawLine({
      start: { x: 50, y },
      end: { x: 562, y },
      thickness: 1,
      color: rgb(0, 0, 0),
    });
    y -= 10;

    // Table rows
    for (const item of lineItems) {
      if (y < 100) {
        // New page if needed
        const newPage = pdfDoc.addPage([612, 792]);
        y = 750;
      }

      const itemName = (item.item || "").substring(0, 20);
      const description = (item.description || "").substring(0, 25);
      const qty = item.qty || 0;
      const rate = item.rate || 0;
      const lineTotal = item.lineTotal || qty * rate;

      page.drawText(itemName, { x: colX[0], y, size: smallFontSize, font: font });
      page.drawText(description, { x: colX[1], y, size: smallFontSize, font: font });
      page.drawText(String(qty), { x: colX[2], y, size: smallFontSize, font: font });
      page.drawText(formatCurrency(rate), { x: colX[3], y, size: smallFontSize, font: font });
      page.drawText(formatCurrency(lineTotal), { x: colX[4], y, size: smallFontSize, font: font });

      y -= 20;
    }

    y -= 20;
    page.drawLine({
      start: { x: 50, y },
      end: { x: 562, y },
      thickness: 1,
      color: rgb(0, 0, 0),
    });
    y -= 20;

    // Totals
    page.drawText("Subtotal:", { x: colX[3], y, size: fontSize, font: font });
    page.drawText(formatCurrency(subtotal), { x: colX[4], y, size: fontSize, font: font });
    y -= 20;

    page.drawText("Tax (0%):", { x: colX[3], y, size: fontSize, font: font });
    page.drawText(formatCurrency(tax), { x: colX[4], y, size: fontSize, font: font });
    y -= 20;

    page.drawText("Total:", { x: colX[3], y, size: fontSize, font: boldFont });
    page.drawText(formatCurrency(total), { x: colX[4], y, size: fontSize, font: boldFont });

    y -= 40;

    // Notes
    if (invoice.notes) {
      page.drawText("Notes:", {
        x: 50,
        y,
        size: fontSize,
        font: boldFont,
      });
      y -= 20;
      const notesLines = invoice.notes.split("\n");
      for (const line of notesLines) {
        if (y < 50) break;
        if (line.trim()) {
          page.drawText(line.trim().substring(0, 80), {
            x: 50,
            y,
            size: smallFontSize,
            font: font,
          });
          y -= 15;
        }
      }
    }

    // Generate PDF bytes
    const pdfBytes = await pdfDoc.save();

    // Return PDF
    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="invoice-${invoiceNumber.replace("#", "")}.pdf"`,
      },
    });
  } catch (err: any) {
    console.error("PDF generation error:", err);
    return NextResponse.json({ error: `Failed to generate PDF: ${err?.message ?? String(err)}` }, { status: 500 });
  }
}

