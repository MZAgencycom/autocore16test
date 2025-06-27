import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Pen, 
  Eraser, 
  Check, 
  X, 
  Save, 
  Download, 
  Upload, 
  User, 
  AlertCircle 
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';

/**
 * Composant de signature électronique permettant de signer via un canvas tactile
 * ou d'uploader une image de signature
 */
const ElectronicSignature = ({
  onSave,
  onCancel,
  defaultSignature = null,
  signerType = 'client', // 'client' ou 'dealer'
  userProfile = null,
  title = "Signature électronique",
  showLegalNote = false
}) => {
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [uploadedSignature, setUploadedSignature] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [ctx, setCtx] = useState(null);
  
  // Position du stylet ou du doigt
  const [lastX, setLastX] = useState(0);
  const [lastY, setLastY] = useState(0);
  
  // Initialiser le canvas
  useEffect(() => {
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      
      // Définir la résolution du canvas pour une meilleure qualité
      // On limite le DPR à 2 pour éviter des images trop lourdes sur mobile
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      
      context.scale(dpr, dpr);
      context.lineCap = 'round';
      context.lineJoin = 'round';
      context.lineWidth = 2;
      context.strokeStyle = '#000000';

      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      
      setCtx(context);
      
      // Charger une signature par défaut si disponible
      if (defaultSignature) {
        const img = new Image();
        img.onload = () => {
          context.drawImage(img, 0, 0, rect.width, rect.height);
          setHasSignature(true);
        };
        img.src = defaultSignature;
      }
    }
  }, [canvasRef, defaultSignature]);
  
  // Gérer le début du dessin
  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    if (!canvas || !ctx) return;
    
    setIsDrawing(true);
    
    const rect = canvas.getBoundingClientRect();
    const x = getClientX(e) - rect.left;
    const y = getClientY(e) - rect.top;
    
    setLastX(x);
    setLastY(y);
    
    ctx.beginPath();
    ctx.moveTo(x, y);
  };
  
  // Dessiner lors du déplacement
  const draw = (e) => {
    if (!isDrawing || !ctx) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = getClientX(e) - rect.left;
    const y = getClientY(e) - rect.top;
    
    ctx.lineTo(x, y);
    ctx.stroke();
    
    setLastX(x);
    setLastY(y);
    
    setHasSignature(true);
  };
  
  // Arrêter le dessin
  const stopDrawing = () => {
    if (isDrawing && ctx) {
      ctx.closePath();
      setIsDrawing(false);
    }
  };
  
  // Obtenir la position X selon le type d'événement (souris ou tactile)
  const getClientX = (e) => {
    if (e.touches && e.touches[0]) {
      return e.touches[0].clientX;
    }
    return e.clientX;
  };
  
  // Obtenir la position Y selon le type d'événement (souris ou tactile)
  const getClientY = (e) => {
    if (e.touches && e.touches[0]) {
      return e.touches[0].clientY;
    }
    return e.clientY;
  };
  
  // Effacer le canvas
  const clearCanvas = () => {
    if (ctx && canvasRef.current) {
      const canvas = canvasRef.current;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      setHasSignature(false);
      setUploadedSignature(null);
    }
  };
  
  // Télécharger la signature en tant qu'image JPEG
  const handleSaveSignature = async () => {
    if (/mobile/i.test(navigator.userAgent)) {
      if (import.meta?.env?.DEV) console.log('MOBILE VALIDATION TRIGGERED');
    }

    if (!hasSignature && !uploadedSignature) {
      setError("Veuillez signer ou télécharger une signature");
      return;
    }
    
    try {
      setIsLoading(true);
      setError(null);

      let signatureUrl = '';

      if (uploadedSignature) {
        // Utiliser la signature téléchargée
        signatureUrl = uploadedSignature;
      } else {
        // Convertir le canvas en blob JPEG pour réduire la taille du fichier
        const canvas = canvasRef.current;
        const exportCanvas = document.createElement('canvas');
        exportCanvas.width = canvas.width;
        exportCanvas.height = canvas.height;
        const exportCtx = exportCanvas.getContext('2d');
        exportCtx.fillStyle = '#ffffff';
        exportCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
        exportCtx.drawImage(canvas, 0, 0);

        const canvasToBlob = async () => {
          const isIosSafari = /iP(ad|hone|od)/i.test(navigator.userAgent);

          if (!isIosSafari && exportCanvas.toBlob) {
            return await new Promise((resolve, reject) => {
              try {
                exportCanvas.toBlob((b) => {
                  if (b) resolve(b);
                  else reject(new Error('Canvas conversion failed'));
                }, 'image/jpeg', 0.8);
              } catch (err) {
                reject(err);
              }
            });
          }

          // Fallback using toDataURL for iOS/Safari or older browsers
          const dataUrl = exportCanvas.toDataURL('image/jpeg', 0.8);
          if (!dataUrl) throw new Error('Canvas conversion failed');
          const arr = dataUrl.split(',');
          const mime = arr[0].match(/:(.*?);/)[1];
          const bstr = atob(arr[1]);
          let n = bstr.length;
          const u8arr = new Uint8Array(n);
          while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
          }
          return new Blob([u8arr], { type: mime });
        };

        const blob = await canvasToBlob();

        if (!blob || blob.size === 0) {
          throw new Error('Erreur lors de la génération de la signature');
        }

        // Limiter la taille à 5 Mo pour éviter un rejet côté serveur
        if (blob.size > 5 * 1024 * 1024) {
          throw new Error('Signature trop volumineuse');
        }

        // Créer un nom de fichier unique
        const fileName = `signature_${signerType}_${Date.now()}.jpg`;
        const filePath = `signatures/${fileName}`;

        // Télécharger la signature vers Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from('signatures')
          .upload(filePath, blob, {
            contentType: 'image/jpeg',
            cacheControl: '3600'
          });

        if (uploadError) throw uploadError;

        // Récupérer l'URL publique
        const { data: { publicUrl } } = supabase.storage
          .from('signatures')
          .getPublicUrl(filePath);

        signatureUrl = publicUrl;
      }

      // Appeler le callback de sauvegarde avec l'URL
      await Promise.resolve(onSave(signatureUrl));
    } catch (error) {
      console.error('Error saving signature:', error);
      toast.error('Signature non enregistrée, vous pourrez la compléter plus tard.');
      setError(error.message || 'Une erreur est survenue lors de la sauvegarde de la signature');
      // Fallback : permettre de continuer sans enregistrer la signature
      await Promise.resolve(onSave(null));
    } finally {
      setIsLoading(false);
    }
  };
  
  
  // Gérer le téléchargement d'une signature
  const handleSignatureUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      setError('Veuillez télécharger une image');
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (event) => {
      if (ctx && canvasRef.current) {
        const img = new Image();
        img.onload = () => {
          const canvas = canvasRef.current;
          const rect = canvas.getBoundingClientRect();
          
          // Effacer le canvas
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          
          // Dessiner l'image
          ctx.drawImage(img, 0, 0, rect.width, rect.height);
          setHasSignature(true);
          setUploadedSignature(event.target.result);
        };
        img.src = event.target.result;
      }
    };
    reader.readAsDataURL(file);
  };
  
  // Créer le tampon si c'est une signature de carrossier
  const renderStamp = () => {
    if (signerType !== 'dealer' || !userProfile) return null;
    
    return (
      <div className="absolute bottom-4 right-4 border-2 border-primary/30 rounded-full p-4 w-32 h-32 flex flex-col items-center justify-center text-center transform rotate-6">
        <div className="text-xs font-bold text-primary/70">{userProfile.company_name}</div>
        {userProfile.siret && <div className="text-[8px] text-primary/60">SIRET: {userProfile.siret}</div>}
        {userProfile.address_city && <div className="text-[8px] text-primary/60">{userProfile.address_city}</div>}
        <div className="border-t border-primary/30 w-full my-1"></div>
        {userProfile.rcs_number && <div className="text-[8px] text-primary/60">RCS: {userProfile.rcs_number}</div>}
        {userProfile.ape_code && <div className="text-[8px] text-primary/60">APE: {userProfile.ape_code}</div>}
      </div>
    );
  };
  
  return (
    <div className="bg-card rounded-lg border p-6 max-w-2xl mx-auto">
      <h2 className="text-xl font-bold mb-4 flex items-center">
        <Pen className="mr-2 h-5 w-5 text-primary" />
        {title}
      </h2>
      
      {error && (
        <div className="mb-4 bg-destructive/10 text-destructive p-3 rounded-md flex items-center">
          <AlertCircle className="h-4 w-4 mr-2" />
          <span>{error}</span>
        </div>
      )}
      
      <div className="space-y-6">
        <div className="relative">
          <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg bg-muted/5 h-40 relative">
            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full cursor-crosshair touch-none"
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
            />
            
            {!hasSignature && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground pointer-events-none">
                <User className="h-8 w-8 mb-2" />
                <p className="text-sm">Signez ici</p>
              </div>
            )}
            
            {renderStamp()}
          </div>
          
          <div className="flex justify-between mt-2">
            <button
              type="button"
              onClick={clearCanvas}
              className="text-xs flex items-center text-muted-foreground hover:text-destructive transition-colors"
            >
              <Eraser className="h-3 w-3 mr-1" />
              Effacer
            </button>
            
            <div>
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handleSignatureUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-xs flex items-center text-muted-foreground hover:text-primary transition-colors"
              >
                <Upload className="h-3 w-3 mr-1" />
                Télécharger une signature
              </button>
            </div>
          </div>
        </div>
        
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={onCancel}
            className="btn-outline py-2 px-4"
          >
            <X className="h-4 w-4 mr-2" />
            Annuler
          </button>
          
          <button
            type="button"
            onClick={handleSaveSignature}
            disabled={!hasSignature || isLoading}
            className="btn-primary py-2 px-4 min-w-[120px]"
          >
            {isLoading ? (
              <div className="animate-spin h-4 w-4 border-b-2 border-white rounded-full"></div>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                Valider
              </>
            )}
          </button>
        </div>
        {showLegalNote && (
          <p className="text-[10px] text-muted-foreground mt-4 text-center">
            Les signatures électroniques ci-dessus ont la même valeur juridique qu'une signature manuscrite, conformément à l'article 1367 du Code civil.
          </p>
        )}
      </div>
    </div>
  );
};

export default ElectronicSignature;
