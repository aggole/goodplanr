import ILovePDFApi from '@ilovepdf/ilovepdf-nodejs';
import ILovePDFFile from '@ilovepdf/ilovepdf-nodejs/ILovePDFFile';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

/**
 * Compresses a PDF using iLovePDF API
 * @param pdfBytes - Input PDF as Uint8Array
 * @returns Compressed PDF as Uint8Array
 */
export async function compressPdfWithILovePDF(
    pdfBytes: Uint8Array
): Promise<Uint8Array> {
    // API key should be set in environment variable
    const apiKey = process.env.ILOVEPDF_PUBLIC_KEY;

    if (!apiKey) {
        console.warn('iLovePDF API key not configured, skipping compression');
        return pdfBytes;
    }

    const tmpDir = os.tmpdir();
    const inputPath = path.join(tmpDir, `input-${Date.now()}.pdf`);
    const outputPath = path.join(tmpDir, `compressed-${Date.now()}.pdf`);

    try {
        // Write input PDF to temp file
        fs.writeFileSync(inputPath, Buffer.from(pdfBytes));

        // Initialize iLovePDF API
        const instance = new ILovePDFApi(apiKey, process.env.ILOVEPDF_SECRET_KEY || '');

        // Create compress task
        const task = instance.newTask('compress');
        await task.start();

        // Add file
        const file = new ILovePDFFile(inputPath);
        await task.addFile(file);

        // Process compression task
        await task.process();

        // Download compressed file - returns the data
        const data = await task.download();

        // Write to output file
        fs.writeFileSync(outputPath, data);

        // Read compressed PDF
        const compressedBytes = fs.readFileSync(outputPath);

        console.log(`Compression successful: ${(pdfBytes.length / 1024 / 1024).toFixed(2)}MB → ${(compressedBytes.length / 1024 / 1024).toFixed(2)}MB`);

        return new Uint8Array(compressedBytes);

    } catch (error) {
        console.error('iLovePDF compression failed:', error);
        // Return original PDF if compression fails
        return pdfBytes;
    } finally {
        // Clean up temp files
        if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
        if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
    }
}
