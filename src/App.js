import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import imageCompression from "browser-image-compression";

const OUTPUT_FORMATS = [
  { label: "WebP", value: "image/webp" },
  { label: "PNG", value: "image/png" },
  { label: "JPG", value: "image/jpeg" },
];

export default function App() {
  const [files, setFiles] = useState([]);
  const [format, setFormat] = useState("image/webp");
  const [lossless, setLossless] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [toast, setToast] = useState(null);

  /* ---------- Toast ---------- */
  const showToast = useCallback((type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 2500);
  }, []);

  /* ---------- File Handling ---------- */
  const addFiles = useCallback(
    (incoming) => {
      const images = incoming.filter((f) => f.type.startsWith("image/"));
      if (!images.length) return;

      setFiles((prev) => [...prev, ...images]);
      showToast("success", `${images.length} image(s) added`);
    },
    [showToast],
  );

  const removeFile = useCallback((index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      addFiles(Array.from(e.dataTransfer.files));
    },
    [addFiles],
  );

  /* ---------- Paste Support ---------- */
  useEffect(() => {
    const onPaste = (e) => {
      addFiles(Array.from(e.clipboardData.files || []));
    };

    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [addFiles]);

  /* ---------- Download ---------- */
  const downloadBlob = useCallback((blob, filename) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  /* ---------- Process Images ---------- */
  const processImages = useCallback(async () => {
    if (!files.length) {
      showToast("error", "No images selected");
      return;
    }

    setProcessing(true);
    showToast("info", "Compressing…");

    try {
      for (const file of files) {
        const options = {
          maxSizeMB: lossless ? undefined : 1,
          maxWidthOrHeight: 4096,
          useWebWorker: true,
          fileType: format,
          initialQuality:
            format === "image/webp"
              ? lossless
                ? 1
                : 0.9
              : format === "image/jpeg"
                ? 0.92
                : 1,
        };

        const output = await imageCompression(file, options);
        const ext = format.split("/")[1];
        const base = file.name.replace(/\.[^/.]+$/, "");
        downloadBlob(output, `${base}.${ext}`);
      }

      showToast("success", "Downloads started");
    } catch {
      showToast("error", "Something went wrong");
    } finally {
      setProcessing(false);
    }
  }, [files, format, lossless, downloadBlob, showToast]);

  /* ---------- UI ---------- */
  return (
    <div
      className="min-h-screen bg-gradient-to-br from-[#f7f8fa] to-[#eef1f5]
                 flex items-center justify-center p-6 text-slate-900"
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`fixed top-6 right-6 px-4 py-2 rounded-xl text-sm shadow
              ${
                toast.type === "success"
                  ? "bg-emerald-500 text-white"
                  : toast.type === "error"
                    ? "bg-rose-500 text-white"
                    : "bg-slate-800 text-white"
              }`}
          >
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className="w-full max-w-xl rounded-3xl bg-white shadow-xl p-6 space-y-6"
      >
        <div>
          <h1 className="text-2xl font-semibold">Image Compressor</h1>
          <p className="text-sm text-slate-500">
            Drag, paste or drop images. Remove mistakes instantly.
          </p>
        </div>

        {/* Drop zone */}
        <motion.div
          whileHover={{ scale: 1.01 }}
          className="relative border border-dashed rounded-2xl p-8
                     bg-slate-50 hover:bg-slate-100 transition"
        >
          <p className="text-center font-medium">Drop images here</p>
          <p className="text-center text-xs text-slate-500 mt-1">
            or paste with <kbd>Ctrl</kbd> + <kbd>V</kbd>
          </p>

          <input
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => addFiles(Array.from(e.target.files))}
            className="absolute inset-0 opacity-0 cursor-pointer"
          />
        </motion.div>

        {/* Thumbnails */}
        <AnimatePresence>
          {files.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-4 gap-3"
            >
              {files.map((file, index) => (
                <motion.div
                  key={file.name + index}
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  className="relative rounded-xl overflow-hidden border"
                >
                  <img
                    src={URL.createObjectURL(file)}
                    alt=""
                    className="h-20 w-full object-cover"
                  />

                  <button
                    onClick={() => removeFile(index)}
                    className="absolute top-1 right-1 bg-black/60 text-white
                               rounded-full w-6 h-6 flex items-center
                               justify-center text-xs hover:bg-black"
                  >
                    ✕
                  </button>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Controls */}
        <div className="grid grid-cols-2 gap-3">
          <select
            value={format}
            onChange={(e) => setFormat(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white p-2 text-sm"
          >
            {OUTPUT_FORMATS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>

          {format === "image/webp" && (
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={lossless}
                onChange={(e) => setLossless(e.target.checked)}
              />
              Lossless
            </label>
          )}
        </div>

        {/* CTA */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={processImages}
          disabled={processing || !files.length}
          className="w-full py-3 rounded-2xl font-medium text-white
                     bg-gradient-to-r from-indigo-500 to-violet-500
                     hover:from-indigo-400 hover:to-violet-400
                     disabled:opacity-50 transition"
        >
          {processing ? "Working…" : "Compress & Download"}
        </motion.button>

        <p className="text-xs text-center text-slate-400">
          Everything stays on your device
        </p>
      </motion.div>
    </div>
  );
}
