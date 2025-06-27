import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, X, UploadCloud } from 'lucide-react';
import Tesseract from 'tesseract.js';
import { Button } from '../ui/button';
import { classifyExpense } from '../../utils/expenseClassifier';

const AddExpenseModal = ({ isOpen, onClose, onSave }) => {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [data, setData] = useState(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
    }
  }, [isOpen]);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  };

  const capturePhoto = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      videoRef.current.srcObject = stream;
      streamRef.current = stream;
    } catch (err) {
      console.error('Camera error', err);
    }
  };

  const takeSnapshot = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      const file = new File([blob], 'capture.jpg', { type: 'image/jpeg' });
      setFile(file);
      setPreview(URL.createObjectURL(blob));
      stopCamera();
      analyzeFile(file);
    });
  };

  const handleFile = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
    analyzeFile(f);
  };

  const analyzeFile = async (f) => {
    setProcessing(true);
    try {
      const { data: { text } } = await Tesseract.recognize(f, 'fra');
      const category = classifyExpense(text);
      const amountMatch = text.match(/\d+[\.,]\d{2}/);
      const amount = amountMatch ? parseFloat(amountMatch[0].replace(',', '.')) : null;
      setData({ text, category, amount });
    } catch (err) {
      console.error('OCR error', err);
    } finally {
      setProcessing(false);
    }
  };

  const handleSave = () => {
    if (onSave && data) onSave({ file, ...data });
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-card rounded-lg shadow-xl w-full max-w-lg p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-xl font-bold">Nouvelle dépense</h2>
              <button onClick={onClose} className="p-2 rounded-full hover:bg-muted">
                <X className="h-5 w-5" />
              </button>
            </div>

            {preview ? (
              <div className="relative">
                <img src={preview} alt="aperçu" className="w-full rounded-md" />
                {processing && (
                  <div className="scan-overlay">
                    <div className="scan-line" />
                  </div>
                )}
              </div>
            ) : streamRef.current ? (
              <div className="relative">
                <video ref={videoRef} autoPlay className="w-full rounded-md" />
                <Button
                  className="absolute bottom-2 right-2"
                  onClick={takeSnapshot}
                >
                  <Camera className="h-4 w-4 mr-1" /> Capturer
                </Button>
              </div>
            ) : (
              <div className="border-2 border-dashed rounded-md p-4 text-center">
                <UploadCloud className="h-8 w-8 mx-auto mb-2" />
                <p className="text-sm">Glissez une image ou sélectionnez un fichier</p>
                <input type="file" accept="image/*" onChange={handleFile} className="mt-2" />
                <Button variant="secondary" className="mt-3" onClick={capturePhoto}>
                  <Camera className="h-4 w-4 mr-1" /> Prendre une photo
                </Button>
              </div>
            )}

            {processing && <p className="text-center text-sm">Analyse en cours...</p>}
            {data && (
              <div className="text-sm space-y-1">
                <p><strong>Montant détecté :</strong> {data.amount ? `${data.amount} €` : '-'}</p>
                <p><strong>Catégorie suggérée :</strong> {data.category}</p>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={onClose}>Annuler</Button>
              <Button disabled={!data} onClick={handleSave}>Enregistrer</Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AddExpenseModal;
