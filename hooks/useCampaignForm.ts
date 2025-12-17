import { CampaignFormData, Deliverable } from '@/types/campaign';
import { useCallback, useState } from 'react';

const initialFormData: CampaignFormData = {
  title: '',
  description: '',
  budget: '',
  deadline: '',
  requirements: [],
  deliverables: [],
};

export function useCampaignForm() {
  const [formData, setFormData] = useState<CampaignFormData>(initialFormData);
  const [newRequirement, setNewRequirement] = useState('');
  const [newDeliverable, setNewDeliverable] = useState({
    type: '',
    description: '',
    quantity: 1,
  });

  const updateFormData = useCallback((updates: Partial<CampaignFormData>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  }, []);

  const addRequirement = useCallback(() => {
    if (newRequirement.trim()) {
      setFormData((prev) => ({
        ...prev,
        requirements: [...prev.requirements, newRequirement.trim()],
      }));
      setNewRequirement('');
    }
  }, [newRequirement]);

  const removeRequirement = useCallback((index: number) => {
    setFormData((prev) => ({
      ...prev,
      requirements: prev.requirements.filter((_, i) => i !== index),
    }));
  }, []);

  const addDeliverable = useCallback(() => {
    if (newDeliverable.type && newDeliverable.description) {
      const deliverable: Deliverable = {
        id: Date.now().toString(),
        type: newDeliverable.type,
        description: newDeliverable.description,
        quantity: newDeliverable.quantity,
      };

      setFormData((prev) => ({
        ...prev,
        deliverables: [...prev.deliverables, deliverable],
      }));

      setNewDeliverable({
        type: '',
        description: '',
        quantity: 1,
      });
    }
  }, [newDeliverable]);

  const removeDeliverable = useCallback((id: string) => {
    setFormData((prev) => ({
      ...prev,
      deliverables: prev.deliverables.filter((d) => d.id !== id),
    }));
  }, []);

  return {
    formData,
    newDeliverable,
    setNewDeliverable,
    updateFormData,
    addDeliverable,
    removeDeliverable,
  };
}
