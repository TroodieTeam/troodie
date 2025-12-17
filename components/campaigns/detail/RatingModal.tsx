import { DS } from '@/components/design-system/tokens';
import { Star, X } from 'lucide-react-native';
import React from 'react';
import { ActivityIndicator, Modal, Text, TextInput, TouchableOpacity, View } from 'react-native';

interface RatingModalProps {
  visible: boolean;
  onClose: () => void;
  rating: number;
  setRating: (rating: number) => void;
  comment: string;
  setComment: (comment: string) => void;
  onSubmit: () => void;
  submitting: boolean;
}

export const RatingModal: React.FC<RatingModalProps> = ({
  visible,
  onClose,
  rating,
  setRating,
  comment,
  setComment,
  onSubmit,
  submitting
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: DS.spacing.lg }}>
        <View style={{ backgroundColor: DS.colors.surface, borderRadius: DS.borderRadius.xl, padding: DS.spacing.xl, width: '100%', maxWidth: 400 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: DS.spacing.lg }}>
            <Text style={{ ...DS.typography.h2, color: DS.colors.textDark }}>Rate Creator</Text>
            <TouchableOpacity onPress={onClose}>
              <X size={24} color={DS.colors.textGray} />
            </TouchableOpacity>
          </View>
          
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: DS.spacing.md, marginBottom: DS.spacing.lg }}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity key={star} onPress={() => setRating(star)}>
                <Star size={32} color={DS.colors.primaryOrange} fill={star <= rating ? DS.colors.primaryOrange : 'transparent'} />
              </TouchableOpacity>
            ))}
          </View>

          <TextInput
            style={{
              borderWidth: 1,
              borderColor: DS.colors.border,
              borderRadius: DS.borderRadius.md,
              padding: DS.spacing.md,
              minHeight: 100,
              textAlignVertical: 'top',
              marginBottom: DS.spacing.lg,
              backgroundColor: DS.colors.surfaceLight
            }}
            placeholder="Optional feedback..."
            value={comment}
            onChangeText={setComment}
            multiline
          />

          <TouchableOpacity
            style={{
              backgroundColor: DS.colors.primaryOrange,
              paddingVertical: DS.spacing.md,
              borderRadius: DS.borderRadius.lg,
              alignItems: 'center',
              opacity: submitting ? 0.7 : 1
            }}
            onPress={onSubmit}
            disabled={submitting}
          >
            {submitting ? <ActivityIndicator color="white" /> : <Text style={{ ...DS.typography.button, color: 'white' }}>Submit Rating</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};
