import { useRef, useState } from 'react';
import { Download, FileText, RefreshCw, Sparkles, ShieldCheck } from 'lucide-react';
import {
  compressPdf,
  compressPdfToTarget,
  loadPdfInfo,
  type CompressionOptions,
} from './pdf';
import logoUrl from './assets/logo-unsoed.png';
import CuteMascot from './CuteMascot';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type Stage = 'select' | 'options' | 'processing' | 'done';
type CompressionMode = 'extreme' | 'medium' | 'low' | 'under1mb' | 'under4mb';

interface QualityOpts {
  scale: number;
  quality: number;
}

interface ModeDef {
  id: CompressionMode;
  label: string;
  tag: string;
  desc: string;
  kind: 'quality' | 'target';
  opts?: QualityOpts;
  targetBytes?: number;
  targetLabel?: string;
}

const MODES: ModeDef[] = [
  {
    id: 'extreme',
    label: 'Extreme',
    tag: 'Ukuran terkecil',
    desc: 'Kompresi maksimal. Ukuran paling kecil, kualitas gambar paling rendah.',
    kind: 'quality',
    opts: { scale: 0.6, quality: 0.32 },
  },
  {
    id: 'medium',
    label: 'Sedang',
    tag: 'Paling seimbang',
    desc: 'Keseimbangan terbaik antara ukuran file dan kualitas hasil.',
    kind: 'quality',
    opts: { scale: 1.0, quality: 0.55 },
  },
  {
    id: 'low',
    label: 'Low',
    tag: 'Kualitas terbaik',
    desc: 'Kompresi ringan. Ukuran tetap mengecil, kualitas hampir tidak berubah.',
    kind: 'quality',
    opts: { scale: 1.2, quality: 0.8 },
  },
  {
    id: 'under1mb',
    label: 'Di bawah 1 MB',
    tag: 'Target ukuran',
    desc: 'Otomatis dikompres agar hasilnya di bawah 1 MB — cocok untuk syarat upload website.',
    kind: 'target',
    targetBytes: 1_000_000,
    targetLabel: '1 MB',
  },
  {
    id: 'under4mb',
    label: 'Di bawah 4 MB',
    tag: 'Target ukuran',
    desc: 'Otomatis dikompres agar hasilnya di bawah 4 MB — cocok untuk syarat upload website.',
    kind: 'target',
    targetBytes: 4_000_000,
    targetLabel: '4 MB',
  },
];

function formatBytes(bytes: number): string {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(i === 0 ? 0 : 2)} ${sizes[i]}`;
}

export default function App() {
  const [stage, setStage] = useState<Stage>('select');
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState('');
  const [originalSize, setOriginalSize] = useState(0);
  const [numPages, setNumPages] = useState(0);
  const [thumbnail, setThumbnail] = useState('');
  const [mode, setMode] = useState<CompressionMode>('medium');
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{ blob: Blob; size: number } | null>(null);
  const [resultNote, setResultNote] = useState('');
  const [targetAchieved, setTargetAchieved] = useState(true);
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  const activeMode = MODES.find((m) => m.id === mode)!;
  const isTargetMode = activeMode.kind === 'target';

  async function handleFile(file: File) {
    setError('');
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setError('File harus berformat PDF.');
      return;
    }

    setFile(file);
    setFileName(file.name);
    setOriginalSize(file.size);
    setStage('options');
    setThumbnail('');
    setNumPages(0);

    try {
      const info = await loadPdfInfo(file);
      setNumPages(info.numPages);
      setThumbnail(info.thumbnail);
    } catch {
      setError('Tidak dapat membaca file PDF ini. Pastikan file tidak rusak atau terproteksi password.');
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  }

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
    e.target.value = '';
  }

  async function startCompress() {
    if (!file) return;
    const def = activeMode;
    setStage('processing');
    setProgress(0);
    setError('');
    setResultNote('');
    setTargetAchieved(true);

    try {
      if (def.kind === 'target' && def.targetBytes != null) {
        const res = await compressPdfToTarget(file, def.targetBytes, (p) => setProgress(p));
        const blob = new Blob([res.bytes as BlobPart], { type: 'application/pdf' });
        setResult({ blob, size: blob.size });
        setTargetAchieved(res.withinTarget);
        setResultNote(
          res.withinTarget
            ? `File berhasil dikecilkan hingga di bawah ${def.targetLabel}.`
            : `Ukuran terkecil yang dapat dicapai adalah ${formatBytes(res.size)}. Target ${def.targetLabel} belum tercapai.`,
        );
        setStage('done');
      } else {
        const bytes = await compressPdf(file, {
          scale: def.opts!.scale,
          quality: def.opts!.quality,
          onProgress: (p) => setProgress(p),
        });
        const blob = new Blob([bytes as BlobPart], { type: 'application/pdf' });
        setResult({ blob, size: blob.size });
        setStage('done');
      }
    } catch {
      setError('Terjadi kesalahan saat mengompres file. Silakan coba file lain.');
      setStage('options');
    }
  }

  function download() {
    if (!result) return;
    const url = URL.createObjectURL(result.blob);
    const base = fileName.replace(/\.pdf$/i, '') || 'document';
    const a = document.createElement('a');
    a.href = url;
    a.download = `${base}-compressed-${mode}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  function reset() {
    setStage('select');
    setFile(null);
    setFileName('');
    setOriginalSize(0);
    setNumPages(0);
    setThumbnail('');
    setResult(null);
    setProgress(0);
    setError('');
    setResultNote('');
    setTargetAchieved(true);
    setMode('medium');
  }

  const reduction = result && originalSize ? Math.max(0, 1 - result.size / originalSize) : 0;

  return (
    <div className="flex min-h-screen flex-col items-center px-5 pb-8 pt-12">
      <header className="mb-7 text-center">
        <div className="flex items-center justify-center gap-3.5">
          <img
            src={logoUrl}
            alt="Logo Unsoed"
            className="h-[52px] w-[52px] flex-none object-contain drop-shadow"
          />
          <div className="text-left leading-tight">
            <div className="text-[30px] font-extrabold tracking-tight text-stone-800">
              OraPere<span className="text-gradient">Pere</span>
            </div>
            <div className="mt-0.5 text-[13px] font-bold uppercase tracking-[0.2em] text-orange-600/80">
              PDF Kompresi
            </div>
          </div>
        </div>
        <p className="mx-auto mt-4 max-w-md text-[15px] text-stone-500">
          Kecilkan ukuran file PDF langsung di browser. File tidak diunggah ke server mana pun.
        </p>
      </header>

      <main className="w-full max-w-[640px]">
        <Card>
          <CardContent className="p-7">
            {stage === 'select' && (
              <div
                className={cn(
                  'cursor-pointer rounded-2xl border-2 border-dashed px-7 py-11 text-center transition-all',
                  dragging
                    ? 'scale-[1.01] border-orange-500 bg-orange-50'
                    : 'border-stone-300 hover:border-orange-400 hover:bg-orange-50/60'
                )}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                onClick={() => inputRef.current?.click()}
              >
                <div className="mx-auto mb-3.5 h-[130px] w-[130px] animate-float drop-shadow-[0_14px_24px_-12px_rgba(249,115,22,0.5)]">
                  <CuteMascot />
                </div>
                <h2 className="mb-2 text-xl font-semibold text-stone-800">
                  Seret &amp; letakkan file PDF di sini
                </h2>
                <p className="text-sm text-stone-500">atau klik untuk memilih file dari perangkat Anda</p>
                <input
                  ref={inputRef}
                  type="file"
                  accept="application/pdf,.pdf"
                  onChange={onInputChange}
                  className="hidden"
                />
              </div>
            )}

            {stage === 'options' && file && (
              <div>
                <div className="flex items-center gap-4 border-b pb-5">
                  <div className="flex h-[120px] w-[92px] flex-none items-center justify-center overflow-hidden rounded-lg border bg-stone-50">
                    {thumbnail ? (
                      <img src={thumbnail} alt="Pratinjau" className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-xl font-extrabold text-stone-400">PDF</span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-base font-semibold text-stone-800" title={fileName}>
                      {fileName}
                    </div>
                    <div className="mt-1.5 flex items-center gap-1.5 text-sm text-stone-500">
                      {formatBytes(originalSize)}
                      {numPages > 0 && <span className="opacity-60">•</span>}
                      {numPages > 0 && `${numPages} halaman`}
                    </div>
                    <button
                      onClick={reset}
                      className="mt-2.5 text-sm font-semibold text-orange-600 hover:underline"
                    >
                      Ganti file
                    </button>
                  </div>
                </div>

                <h3 className="mb-3 mt-5 text-base font-semibold text-stone-800">Pilih tipe kompresi</h3>
                <div className="flex flex-col gap-2.5">
                  {MODES.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setMode(m.id)}
                      className={cn(
                        'rounded-2xl border-2 px-4 py-3.5 text-left transition-all',
                        mode === m.id
                          ? m.kind === 'target'
                            ? 'border-emerald-500 bg-emerald-50 shadow-[0_8px_20px_-12px_rgba(16,185,129,0.5)]'
                            : 'border-orange-500 bg-orange-50 shadow-[0_8px_20px_-12px_rgba(249,115,22,0.5)]'
                          : 'border-stone-200 bg-white hover:border-orange-200'
                      )}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-base font-bold text-stone-800">{m.label}</span>
                        <span
                          className={cn(
                            'rounded-full px-2.5 py-0.5 text-xs font-semibold',
                            m.kind === 'target'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-orange-100 text-orange-700'
                          )}
                        >
                          {m.tag}
                        </span>
                      </div>
                      <p className="mt-1.5 text-[13.5px] leading-snug text-stone-500">{m.desc}</p>
                    </button>
                  ))}
                </div>

                {error && (
                  <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-700">
                    {error}
                  </div>
                )}

                <Button
                  size="lg"
                  className="mt-5 h-12 w-full bg-gradient-to-r from-orange-500 to-amber-500 text-base text-white shadow-lg shadow-orange-500/30 hover:from-orange-400 hover:to-amber-400"
                  onClick={startCompress}
                >
                  Kompres Sekarang
                </Button>
              </div>
            )}

            {stage === 'processing' && (
              <div className="px-2.5 py-8 text-center">
                <div className="mx-auto mb-5 h-11 w-11 animate-spin rounded-full border-4 border-orange-100 border-t-orange-500" />
                <h2 className="mb-1.5 text-xl font-semibold text-stone-800">Sedang mengompres…</h2>
                <p className="mb-5 text-sm text-stone-500">
                  {isTargetMode
                    ? 'Mengoptimalkan kualitas agar ukuran file mencapai target.'
                    : 'Memproses setiap halaman untuk memperkecil ukuran file.'}
                </p>
                <Progress value={progress} className="h-2.5" />
                <div className="mt-2.5 font-bold text-orange-600">{progress}%</div>
              </div>
            )}

            {stage === 'done' && result && (
              <div className="px-1.5 py-2 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                  <Sparkles className="h-7 w-7" />
                </div>
                <h2 className="mb-1.5 text-[22px] font-semibold text-stone-800">Berhasil dikompresi!</h2>
                <p className="mb-5 text-sm text-stone-500">File PDF Anda siap diunduh.</p>

                <div className="mb-2 grid grid-cols-3 gap-2.5">
                  <div className="rounded-xl border bg-stone-50 px-2 py-3.5">
                    <div className="text-xs text-stone-500">Ukuran awal</div>
                    <div className="mt-1 text-base font-extrabold text-stone-800">
                      {formatBytes(originalSize)}
                    </div>
                  </div>
                  <div className="rounded-xl border bg-stone-50 px-2 py-3.5">
                    <div className="text-xs text-stone-500">Ukuran baru</div>
                    <div className="mt-1 text-base font-extrabold text-stone-800">
                      {formatBytes(result.size)}
                    </div>
                  </div>
                  <div className="rounded-xl border bg-stone-50 px-2 py-3.5">
                    <div className="text-xs text-stone-500">Penghematan</div>
                    <div className="mt-1 text-base font-extrabold text-emerald-600">
                      −{Math.round(reduction * 100)}%
                    </div>
                  </div>
                </div>

                {resultNote && (
                  <div
                    className={cn(
                      'mt-3.5 rounded-lg border px-3.5 py-3 text-left text-sm',
                      targetAchieved
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                        : 'border-amber-200 bg-amber-50 text-amber-700'
                    )}
                  >
                    {resultNote}
                  </div>
                )}

                <div className="mt-4 flex flex-col gap-2">
                  <Button
                    size="lg"
                    className="h-12 bg-gradient-to-r from-orange-500 to-amber-500 shadow-lg shadow-orange-500/30 hover:from-orange-400 hover:to-amber-400"
                    onClick={download}
                  >
                    <Download className="h-4 w-4" />
                    Unduh PDF
                  </Button>
                  <Button size="lg" variant="outline" className="h-11" onClick={reset}>
                    <RefreshCw className="h-4 w-4" />
                    Kompres file lain
                  </Button>
                </div>
              </div>
            )}

            {error && stage !== 'options' && (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-700">
                {error}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <footer className="mt-6 flex max-w-[560px] flex-col items-center gap-2 text-center text-[13px] text-stone-500">
        <span className="inline-flex items-center gap-1.5">
          <ShieldCheck className="h-4 w-4 text-emerald-500" />
          Semua proses berjalan di perangkat Anda — file PDF tidak pernah meninggalkan browser.
        </span>
        <span className="inline-flex items-center gap-1 text-[11.5px] text-stone-400">
          <FileText className="h-3 w-3" />
          Made by Harun Azis
        </span>
      </footer>
    </div>
  );
}
