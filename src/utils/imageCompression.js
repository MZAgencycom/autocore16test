export default async function compressImage(file, quality = 0.8, maxWidth = 1200, maxHeight = 1200) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      const ratio = Math.min(maxWidth / width, maxHeight / height, 1);
      width = width * ratio;
      height = height * ratio;
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob((blob) => {
        if (blob) {
          const compressedFile = new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' });
          resolve(compressedFile);
        } else {
          reject(new Error('Image compression failed'));
        }
      }, 'image/jpeg', quality);
    };
    img.onerror = (err) => reject(err);
    img.src = URL.createObjectURL(file);
  });
}
