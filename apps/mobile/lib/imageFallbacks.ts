import { API_BASE } from './api';

export const DEFAULT_GYM_IMAGE =
  'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=900&q=80';

export const DEFAULT_WELLNESS_PARTNER_IMAGE =
  'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=900&q=80';

export const DEFAULT_WELLNESS_SERVICE_IMAGE =
  'https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?w=900&q=80';

export const DEFAULT_HOMEPAGE_HERO_IMAGE =
  'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=1200&q=80';

export const DEFAULT_PRODUCT_IMAGE =
  'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?w=900&q=80';

function cleanImage(value: any): string {
  if (value && typeof value === 'object') {
    for (const key of [
      'url',
      'uri',
      'imageUrl',
      'image_url',
      'image',
      'photo',
      'src',
      'path',
      'fileUrl',
      'file_url',
      'publicUrl',
      'public_url',
      'secureUrl',
      'secure_url',
      'mediaUrl',
      'media_url',
      'downloadUrl',
      'download_url',
      'thumbnailUrl',
      'thumbnail_url',
      'thumbnail',
      'coverImage',
      'coverPhoto',
    ]) {
      const image = cleanImage(value[key]);
      if (image) return image;
    }
    return '';
  }

  if (typeof value !== 'string') return '';
  const image = value.trim();
  if (!image) return '';
  if (/^(https?:)?\/\//i.test(image) || /^data:image\//i.test(image)) return image;
  if (image.startsWith('/')) return `${API_BASE}${image}`;
  if (/^(uploads|media|files|storage|assets)\//i.test(image) || /\.(jpe?g|png|webp|gif|avif)(\?.*)?$/i.test(image)) {
    return `${API_BASE}/${image.replace(/^\/+/, '')}`;
  }
  return '';
}

export function imageList(...values: any[]): string[] {
  const images: string[] = [];

  const collect = (value: any) => {
    if (Array.isArray(value)) {
      value.forEach(collect);
      return;
    }

    const image = cleanImage(value);
    if (image && !images.includes(image)) images.push(image);
  };

  values.forEach(collect);
  return images;
}

export function firstImage(...values: any[]): string {
  return imageList(...values)[0] || '';
}

export function productImage(product: any): string {
  return firstImage(
    product?.images,
    product?.media,
    product?.imageUrl,
    product?.image,
    product?.img,
    product?.photo,
    product?.thumbnailUrl,
    product?.coverImage,
  ) || DEFAULT_PRODUCT_IMAGE;
}

export function wellnessPartnerImage(partner: any): string {
  return firstImage(partner?.photos, partner?.images, partner?.coverPhoto, partner?.coverImage, partner?.imageUrl, partner?.image) || DEFAULT_WELLNESS_PARTNER_IMAGE;
}

export function wellnessServiceImage(service: any): string {
  return firstImage(
    service?.imageUrl,
    service?.image,
    service?.images,
    service?.partner?.photos,
    service?.partner?.coverPhoto,
    service?.partner?.coverImage,
    service?.partner?.imageUrl,
  ) || DEFAULT_WELLNESS_SERVICE_IMAGE;
}
