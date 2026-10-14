import * as pdfjsLib from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { PDFDocument } from 'pdf-lib';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

export interface CompressionOptions {
  /** Skala resolusi render per halaman. < 1 mengecilkan gambar. */
  scale: number;
  /** Kualitas JPEG 0..1. Semakin kecil semakin ringan. */
  quality: number;
  /** Dipanggil dengan persentase 0..100 saat memproses. */
  onProgress?: (percent: number) => void;
}

export interface PdfInfo {
  numPages: number;
  thumbnail: string;
}

export interface TargetResult {
  bytes: Uint8Array;
  size: number;
  withinTarget: boolean;
}

interface RenderedPage {
  canvas: HTMLCanvasElement;
  widthPt: number;
  heightPt: number;
}

const MAX_CANVAS_DIM = 4000;

function clampScale(baseWidth: number, baseHeight: number, scale: number): number {
  const maxDim = Math.max(baseWidth, baseHeight);
  if (maxDim * scale <= MAX_CANVAS_DIM) return scale;
  return MAX_CANVAS_DIM / maxDim;
}

async function readPdf(file: File): Promise<pdfjsLib.PDFDocumentProxy> {
  const buffer = await file.arrayBuffer();
  return pdfjsLib.getDocument({ data: buffer }).promise;
}

function releasePages(pages: RenderedPage[]) {
  for (const p of pages) {
    p.canvas.width = 0;
    p.canvas.height = 0;
  }
}

export async function loadPdfInfo(file: File): Promise<PdfInfo> {
  const pdf = await readPdf(file);
  let thumbnail = '';
  try {
    if (pdf.numPages > 0) {
      const page = await pdf.getPage(1);
      const base = page.getViewport({ scale: 1 });
      const scale = Math.min(600 / base.width, 600 / base.height);
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement('canvas');
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      const ctx = canvas.getContext('2d')!;
      await page.render({ canvasContext: ctx, viewport }).promise;
      thumbnail = canvas.toDataURL('image/jpeg', 0.7);
    }
    return { numPages: pdf.numPages, thumbnail };
  } finally {
    await pdf.destroy();
  }
}

export async function compressPdf(
  file: File,
  opts: CompressionOptions,
): Promise<Uint8Array> {
  const pdf = await readPdf(file);
  const total = pdf.numPages;
  const outPdf = await PDFDocument.create();

  try {
    for (let i = 1; i <= total; i++) {
      const page = await pdf.getPage(i);
      const base = page.getViewport({ scale: 1 });
      const scale = clampScale(base.width, base.height, opts.scale);
      const viewport = page.getViewport({ scale });

      const canvas = document.createElement('canvas');
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      const ctx = canvas.getContext('2d')!;

      await page.render({ canvasContext: ctx, viewport }).promise;

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error('Gagal mengubah halaman menjadi gambar'))),
          'image/jpeg',
          opts.quality,
        );
      });
      const jpgBytes = new Uint8Array(await blob.arrayBuffer());

      const img = await outPdf.embedJpg(jpgBytes);

      // Konversi piksel (96 DPI) ke poin PDF (72 DPI).
      const pageWidth = base.width * (72 / 96);
      const pageHeight = base.height * (72 / 96);
      const p = outPdf.addPage([pageWidth, pageHeight]);
      p.drawImage(img, { x: 0, y: 0, width: pageWidth, height: pageHeight });

      canvas.width = 0;
      canvas.height = 0;
      opts.onProgress?.(Math.round((i / total) * 100));
    }

    return await outPdf.save({ useObjectStreams: true });
  } finally {
    await pdf.destroy();
  }
}

/**
 * Mengompres file agar hasilnya berada di bawah targetBytes,
 * sambil mempertahankan kualitas setinggi mungkin (pencarian biner pada kualitas JPEG).
 */
export async function compressPdfToTarget(
  file: File,
  targetBytes: number,
  onProgress?: (percent: number) => void,
): Promise<TargetResult> {
  // Jika file sudah di bawah target, tidak perlu dikompres.
  if (file.size <= targetBytes) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    return { bytes, size: file.size, withinTarget: true };
  }

  const pdf = await readPdf(file);
  const total = pdf.numPages;

  try {
    const build = async (pages: RenderedPage[], quality: number): Promise<Uint8Array> => {
      const outPdf = await PDFDocument.create();
      for (const p of pages) {
        const blob = await new Promise<Blob>((resolve, reject) => {
          p.canvas.toBlob(
            (b) => (b ? resolve(b) : reject(new Error('Gagal menyandikan gambar'))),
            'image/jpeg',
            quality,
          );
        });
        const jpgBytes = new Uint8Array(await blob.arrayBuffer());
        const img = await outPdf.embedJpg(jpgBytes);
        const page = outPdf.addPage([p.widthPt, p.heightPt]);
        page.drawImage(img, { x: 0, y: 0, width: p.widthPt, height: p.heightPt });
      }
      return outPdf.save({ useObjectStreams: true });
    };

    const renderPages = async (scale: number, progressEnd: number): Promise<RenderedPage[]> => {
      const pages: RenderedPage[] = [];
      for (let i = 1; i <= total; i++) {
        const page = await pdf.getPage(i);
        const base = page.getViewport({ scale: 1 });
        const s = clampScale(base.width, base.height, scale);
        const viewport = page.getViewport({ scale: s });
        const canvas = document.createElement('canvas');
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        const ctx = canvas.getContext('2d')!;
        await page.render({ canvasContext: ctx, viewport }).promise;
        pages.push({
          canvas,
          widthPt: base.width * (72 / 96),
          heightPt: base.height * (72 / 96),
        });
        onProgress?.(Math.round((i / total) * progressEnd));
      }
      return pages;
    };

    // Jika skala 1.0 tidak cukup, turunkan resolusi lalu coba lagi.
    const scales = [1.0, 0.65, 0.45];
    let bestOverall: Uint8Array | null = null;
    let bestOverallSize = Infinity;

    for (const scale of scales) {
      const pages = await renderPages(scale, 40);

      let bestWithin: Uint8Array | null = null;
      let smallest: Uint8Array | null = null;
      let smallestSize = Infinity;

      let loQ = 0.05;
      let hiQ = 0.9;

      for (let iter = 0; iter < 7; iter++) {
        const q = (loQ + hiQ) / 2;
        const bytes = await build(pages, q);
        if (bytes.length < smallestSize) {
          smallest = bytes;
          smallestSize = bytes.length;
        }
        if (bytes.length <= targetBytes) {
          bestWithin = bytes;
          loQ = q; // coba kualitas lebih tinggi
        } else {
          hiQ = q; // perlu kualitas lebih rendah
        }
        onProgress?.(40 + Math.round(((iter + 1) / 8) * 60));
      }

      // Jamin hasil terkecil dari kualitas terendah.
      const lowBytes = await build(pages, loQ);
      if (lowBytes.length < smallestSize) {
        smallest = lowBytes;
        smallestSize = lowBytes.length;
      }
      if (lowBytes.length <= targetBytes && !bestWithin) {
        bestWithin = lowBytes;
      }

      if (smallestSize < bestOverallSize) {
        bestOverall = smallest;
        bestOverallSize = smallestSize;
      }

      releasePages(pages);

      if (bestWithin) {
        return { bytes: bestWithin, size: bestWithin.length, withinTarget: true };
      }
    }

    return {
      bytes: bestOverall!,
      size: bestOverallSize,
      withinTarget: false,
    };
  } finally {
    await pdf.destroy();
  }
}
