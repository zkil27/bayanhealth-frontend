export type Advertisement = {
  id: string;
  title: string;
  description: string; 
  imageUrl: string;
  imageAlt?: string;
  businessName: string;
  businessLogo?: string;
  link?: string;
  ctaText?: string;
}