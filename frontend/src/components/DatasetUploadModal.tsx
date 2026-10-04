import React, { useState, useRef } from 'react';
import {
  X,
  FolderArchive,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  FileCode,
  Info,
  RefreshCw,
  FolderTree,
} from 'lucide-react';
import { apiClient } from '../api/client';

interface DatasetUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const DatasetUploadModal: React.FC<DatasetUploadModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      if (!f.name.toLowerCase().endsWith('.zip')) {
        setErrorMessage('Please select a valid .ZIP archive file.');
        return;
      }
      setFile(f);
      setErrorMessage(null);
      setSuccessMessage(null);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) {
      if (!f.name.toLowerCase().endsWith('.zip')) {
        setErrorMessage('Please select a valid .ZIP archive file.');
        return;
      }
      setFile(f);
      setErrorMessage(null);
      setSuccessMessage(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setErrorMessage('Please select a ZIP dataset archive to upload.');
      return;
    }

    setUploading(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const res = await apiClient.uploadDatasetZip(file);
      setSuccessMessage(res.message || 'Dataset ZIP processed successfully!');
      onSuccess();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to upload and process dataset ZIP');
    } finally {
      setUploading(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setErrorMessage(null);
    setSuccessMessage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-50 via-sky-50/50 to-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-sm">
              <FolderArchive className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 tracking-wide uppercase">
                Upload Whole Dataset (ZIP)
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Batch ingest full meteorological radar archive with auto-pairing.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-300 text-rose-800 text-xs font-semibold flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage ? (
            <div className="space-y-4 p-5 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-center animate-fade-in">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
              <div className="text-sm font-bold">{successMessage}</div>
              <p className="text-xs text-emerald-700">
                All image pairs have been synchronized and are ready for validation.
              </p>
              <div className="pt-2 flex justify-center space-x-3">
                <button
                  onClick={handleReset}
                  className="px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-bold transition-all shadow-sm"
                >
                  Upload Another ZIP
                </button>
                <button
                  onClick={onClose}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-sm"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Dropzone */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".zip"
                className="hidden"
              />

              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[170px] ${
                  file
                    ? 'border-indigo-400 bg-indigo-50/20'
                    : 'border-slate-300 hover:border-indigo-400 bg-slate-50 hover:bg-indigo-50/10'
                }`}
              >
                {file ? (
                  <div className="space-y-2 flex flex-col items-center">
                    <div className="p-3 bg-indigo-100 rounded-full text-indigo-700">
                      <FolderArchive className="w-8 h-8" />
                    </div>
                    <div className="text-sm font-mono font-bold text-slate-800">{file.name}</div>
                    <div className="text-xs text-slate-500 font-mono">
                      {(file.size / (1024 * 1024)).toFixed(2)} MB
                    </div>
                    <span className="text-[10px] text-indigo-700 font-semibold bg-indigo-100 px-2.5 py-0.5 rounded">
                      Click / drop to change file
                    </span>
                  </div>
                ) : (
                  <div className="space-y-2 text-slate-400 flex flex-col items-center">
                    <div className="p-3 bg-white rounded-full border border-slate-200 shadow-sm text-indigo-600">
                      <UploadCloud className="w-7 h-7" />
                    </div>
                    <div className="text-xs font-bold text-slate-700">Choose Dataset ZIP Archive</div>
                    <div className="text-[11px] text-slate-500">Drag & drop your .zip file or click to browse</div>
                  </div>
                )}
              </div>

              {/* Supported Folder Structure Guidance */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-2">
                <div className="font-bold text-slate-700 uppercase tracking-wide text-[10px] flex items-center space-x-1.5">
                  <FolderTree className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Expected ZIP Folder Structure:</span>
                </div>
                <div className="font-mono text-[11px] bg-white p-2.5 rounded-lg border border-slate-200 text-slate-700 leading-relaxed shadow-inner">
                  <div>dataset.zip</div>
                  <div className="pl-3">├── <span className="text-emerald-700 font-bold">expected/</span> (e.g. pair_001.png, pair_002.png)</div>
                  <div className="pl-3">├── <span className="text-sky-700 font-bold">actual/</span>   (e.g. pair_001.png, pair_002.png)</div>
                  <div className="pl-3">└── <span className="text-slate-500">metadata.csv</span> (optional labels & categories)</div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end space-x-3 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-bold transition-all"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={uploading || !file}
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-black tracking-wider uppercase flex items-center space-x-2 shadow-sm transition-all"
                >
                  {uploading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Ingesting Dataset ZIP...</span>
                    </>
                  ) : (
                    <>
                      <UploadCloud className="w-4 h-4" />
                      <span>Upload & Ingest ZIP</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
