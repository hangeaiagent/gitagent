import React, { useCallback, useState } from 'react';
import { Upload, FileKey, Check, X } from 'lucide-react';

interface FileUploadProps {
  onFileSelect: (file: File | null) => void;
  selectedFile: File | null;
  accept?: string;
  label: string;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect, selectedFile, accept = "*", label }) => {
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onFileSelect(e.dataTransfer.files[0]);
    }
  }, [onFileSelect]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      onFileSelect(e.target.files[0]);
    }
  }, [onFileSelect]);

  const removeFile = useCallback(() => {
    onFileSelect(null);
  }, [onFileSelect]);

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      
      {selectedFile ? (
        <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center space-x-3">
            <FileKey className="w-5 h-5 text-green-600" />
            <div>
              <p className="text-sm font-medium text-green-800">{selectedFile.name}</p>
              <p className="text-xs text-green-600">{(selectedFile.size / 1024).toFixed(1)} KB</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Check className="w-4 h-4 text-green-600" />
            <button
              onClick={removeFile}
              className="p-1 text-red-500 hover:text-red-700 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <div
          className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
            dragActive
              ? 'border-blue-400 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            type="file"
            accept={accept}
            onChange={handleChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <Upload className="w-8 h-8 mx-auto mb-4 text-gray-400" />
          <p className="text-sm text-gray-600">
            <span className="font-medium text-blue-600">点击上传</span> 或拖拽文件到这里
          </p>
          <p className="text-xs text-gray-500 mt-1">支持 .pem, .key 等密钥文件</p>
        </div>
      )}
    </div>
  );
};

export default FileUpload;