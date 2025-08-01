import { useMemo, useState } from 'react';

interface PostFormData {
  restaurantId: string | null;
  rating: number | null;
  caption: string;
  photos: string[];
  visitType?: 'dine_in' | 'takeout' | 'delivery';
  priceRange?: string;
  tags: string[];
  externalUrl?: string;
  contentType?: 'original' | 'external';
}

interface UsePostFormReturn {
  formData: PostFormData;
  setFormData: (data: PostFormData | ((prev: PostFormData) => PostFormData)) => void;
  updateFormField: <K extends keyof PostFormData>(field: K, value: PostFormData[K]) => void;
  isValid: boolean;
  touched: Set<string>;
  setTouched: (touched: Set<string>) => void;
  touchField: (field: string) => void;
  getMissingFields: () => string[];
  getFieldError: (field: string) => string | null;
  completionPercentage: number;
  resetForm: () => void;
}

const initialFormData: PostFormData = {
  restaurantId: null,
  rating: null,
  caption: '',
  photos: [],
  tags: [],
  contentType: 'original',
};

export const usePostForm = (initialData?: Partial<PostFormData>): UsePostFormReturn => {
  const [formData, setFormData] = useState<PostFormData>({
    ...initialFormData,
    ...initialData,
  });
  
  const [touched, setTouched] = useState<Set<string>>(new Set());
  
  const requiredFields = ['restaurantId'] as const;
  
  // For original content, rating is required. For external content, only restaurant and URL are required
  const getRequiredFieldsForContentType = () => {
    const baseRequired = ['restaurantId'];
    if (formData.contentType === 'original') {
      return [...baseRequired, 'rating'];
    } else if (formData.contentType === 'external') {
      return [...baseRequired, 'externalUrl'];
    }
    return baseRequired;
  };
  
  const isValid = useMemo(() => {
    const currentRequiredFields = getRequiredFieldsForContentType();
    return currentRequiredFields.every(field => {
      const value = formData[field as keyof PostFormData];
      if (field === 'rating' && formData.contentType === 'original') {
        return value !== null && value !== undefined && value > 0;
      }
      return value !== null && value !== undefined && value !== '';
    });
  }, [formData]);
  
  const getMissingFields = (): string[] => {
    const currentRequiredFields = getRequiredFieldsForContentType();
    return currentRequiredFields.filter(field => {
      const value = formData[field as keyof PostFormData];
      if (field === 'rating' && formData.contentType === 'original') {
        return value === null || value === undefined || value === 0;
      }
      return value === null || value === undefined || value === '';
    });
  };
  
  const getFieldError = (field: string): string | null => {
    // Simplified - only show errors when absolutely necessary
    // Most validation happens at submit time
    return null;
  };
  
  const completionPercentage = useMemo(() => {
    const currentRequiredFields = getRequiredFieldsForContentType();
    const filledCount = currentRequiredFields.filter(field => {
      const value = formData[field as keyof PostFormData];
      if (field === 'rating' && formData.contentType === 'original') {
        return value !== null && value !== undefined && value > 0;
      }
      return value !== null && value !== undefined && value !== '';
    }).length;
    
    return Math.round((filledCount / currentRequiredFields.length) * 100);
  }, [formData]);
  
  const updateFormField = <K extends keyof PostFormData>(field: K, value: PostFormData[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };
  
  const touchField = (field: string) => {
    setTouched(prev => new Set([...prev, field]));
  };
  
  const resetForm = () => {
    setFormData(initialFormData);
    setTouched(new Set());
  };
  
  return {
    formData,
    setFormData,
    updateFormField,
    isValid,
    touched,
    setTouched,
    touchField,
    getMissingFields,
    getFieldError,
    completionPercentage,
    resetForm,
  };
};