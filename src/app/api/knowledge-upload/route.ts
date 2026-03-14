import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 30;

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File | null;

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        const fileName = file.name;
        const ext = fileName.split('.').pop()?.toLowerCase() || '';
        let extractedText = '';
        let title = fileName.replace(/\.[^/.]+$/, ''); // Remove extension for default title

        if (['txt', 'md', 'csv'].includes(ext)) {
            extractedText = await file.text();
        } else if (ext === 'json') {
            const raw = await file.text();
            try {
                const parsed = JSON.parse(raw);
                extractedText = JSON.stringify(parsed, null, 2);
            } catch {
                extractedText = raw;
            }
        } else if (ext === 'pdf') {
            // Try to extract text from PDF using pdf-parse if available
            try {
                const buffer = Buffer.from(await file.arrayBuffer());
                // Dynamic import to avoid build errors if pdf-parse is not installed
                const pdfParse = (await import('pdf-parse' as any)) as any;
                const pdfData = await (pdfParse.default || pdfParse)(buffer);
                extractedText = pdfData.text || '';
                if (pdfData.info?.Title) {
                    title = pdfData.info.Title;
                }
            } catch {
                // Fallback: try to read as plain text (won't work for most PDFs)
                extractedText = `[PDF file: ${fileName}] — Could not extract text. Install 'pdf-parse' package for PDF support, or paste the content manually.`;
            }
        } else {
            // Try to read as text for any other extension
            try {
                extractedText = await file.text();
            } catch {
                extractedText = `[File: ${fileName}] — Could not read file content. Please paste the content manually.`;
            }
        }

        // Truncate if extremely long (limit to ~50K chars)
        const maxLength = 50000;
        const wasTruncated = extractedText.length > maxLength;
        if (wasTruncated) {
            extractedText = extractedText.substring(0, maxLength) + '\n\n...(contenido truncado)';
        }

        return NextResponse.json({
            success: true,
            title,
            content: extractedText,
            fileName,
            charCount: extractedText.length,
            wasTruncated,
        });
    } catch (error: any) {
        console.error('[Knowledge Upload] Error:', error);
        return NextResponse.json({ error: error.message || 'Failed to process file' }, { status: 500 });
    }
}
