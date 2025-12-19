import { DS } from '@/components/design-system/tokens';
import { DELIVERABLE_TYPES } from '@/constants/campaign';
import { CampaignFormData } from '@/types/campaign';
import { X } from 'lucide-react-native';
import React from 'react';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';

interface CampaignStep3Props {
  formData: CampaignFormData;
  newDeliverable: { type: string; description: string; quantity: number };
  setNewDeliverable: (deliverable: { type: string; description: string; quantity: number }) => void;
  onAddDeliverable: () => void;
  onRemoveDeliverable: (id: string) => void;
}

export function CampaignStep3({
  formData,
  newDeliverable,
  setNewDeliverable,
  onAddDeliverable,
  onRemoveDeliverable,
}: CampaignStep3Props) {
  const isAddButtonDisabled = !newDeliverable.type || !newDeliverable.description.trim();

  return (
    <View>
      <Text
        style={{
          fontSize: 18,
          fontWeight: '600',
          color: DS.colors.textDark,
          marginBottom: DS.spacing.md,
        }}
      >
        Deliverables & Requirements
      </Text>

      {/* Add New Deliverable */}
      <View
        style={{
          backgroundColor: DS.colors.surface,
          padding: DS.spacing.md,
          borderRadius: DS.borderRadius.sm,
          marginBottom: DS.spacing.md,
          borderWidth: 1,
          borderColor: DS.colors.border,
        }}
      >
        <Text
          style={{
            fontSize: 16,
            fontWeight: '600',
            color: DS.colors.textDark,
            marginBottom: DS.spacing.md,
          }}
        >
          Add Deliverable
        </Text>

        <View style={{ marginBottom: DS.spacing.md }}>
          <Text
            style={{
              fontSize: 14,
              fontWeight: '500',
              color: DS.colors.textDark,
              marginBottom: DS.spacing.xs,
            }}
          >
            Type *
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {DELIVERABLE_TYPES.map((type) => (
              <TouchableOpacity
                key={type}
                onPress={() => setNewDeliverable({ ...newDeliverable, type })}
                style={{
                  paddingHorizontal: DS.spacing.sm,
                  paddingVertical: DS.spacing.xs,
                  borderRadius: DS.borderRadius.sm,
                  borderWidth: 2,
                  borderColor: newDeliverable.type === type ? DS.colors.primaryOrange : DS.colors.border,
                  backgroundColor: newDeliverable.type === type ? DS.colors.primaryOrange + '15' : 'transparent',
                }}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: newDeliverable.type === type ? '600' : '400',
                    color: newDeliverable.type === type ? DS.colors.primaryOrange : DS.colors.textGray,
                  }}
                >
                  {type}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={{ marginBottom: DS.spacing.md }}>
          <Text
            style={{
              fontSize: 14,
              fontWeight: '500',
              color: DS.colors.textDark,
              marginBottom: DS.spacing.xs,
            }}
          >
            Description *
          </Text>
          <TextInput
            value={newDeliverable.description}
            onChangeText={(text) => setNewDeliverable({ ...newDeliverable, description: text })}
            placeholder="Describe the deliverable..."
            placeholderTextColor={DS.colors.textLight}
            multiline
            numberOfLines={3}
            style={{
              borderWidth: 1,
              borderColor: DS.colors.border,
              borderRadius: DS.borderRadius.sm,
              padding: DS.spacing.sm,
              fontSize: 14,
              color: DS.colors.textDark,
              minHeight: 80,
              textAlignVertical: 'top',
            }}
          />
        </View>

        <View style={{ marginBottom: DS.spacing.lg }}>
          <Text
            style={{
              fontSize: 14,
              fontWeight: '500',
              color: DS.colors.textDark,
              marginBottom: DS.spacing.xs,
            }}
          >
            Quantity
          </Text>
          <TextInput
            value={newDeliverable.quantity.toString()}
            onChangeText={(text) => {
              const num = parseInt(text) || 1;
              setNewDeliverable({ ...newDeliverable, quantity: num > 0 ? num : 1 });
            }}
            keyboardType="numeric"
            placeholder="1"
            placeholderTextColor={DS.colors.textLight}
            style={{
              borderWidth: 1,
              borderColor: DS.colors.border,
              borderRadius: DS.borderRadius.sm,
              padding: DS.spacing.sm,
              fontSize: 14,
              color: DS.colors.textDark,
              width: 100,
            }}
          />
        </View>

        <TouchableOpacity
          onPress={onAddDeliverable}
          disabled={isAddButtonDisabled}
          style={{
            backgroundColor: isAddButtonDisabled ? DS.colors.surfaceLight : DS.colors.primaryOrange,
            paddingVertical: DS.spacing.sm,
            paddingHorizontal: DS.spacing.md,
            borderRadius: DS.borderRadius.sm,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: isAddButtonDisabled ? 0.6 : 1,
          }}
        >
          <Text
            style={{
              color: isAddButtonDisabled ? DS.colors.textGray : DS.colors.textWhite,
              fontSize: 14,
              fontWeight: '600',
            }}
          >
            Add Deliverable
          </Text>
        </TouchableOpacity>
      </View>

      {/* Current Deliverables */}
      {formData.deliverables.length > 0 && (
        <View style={{ marginBottom: DS.spacing.md }}>
          <Text
            style={{
              fontSize: 16,
              fontWeight: '600',
              color: DS.colors.textDark,
              marginBottom: DS.spacing.sm,
            }}
          >
            Added Deliverables ({formData.deliverables.length})
          </Text>
          {formData.deliverables.map((deliverable) => (
            <View
              key={deliverable.id}
              style={{
                backgroundColor: DS.colors.surface,
                padding: DS.spacing.sm,
                borderRadius: DS.borderRadius.sm,
                marginBottom: DS.spacing.sm,
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderWidth: 1,
                borderColor: DS.colors.border,
              }}
            >
              <View style={{ flex: 1, marginRight: DS.spacing.sm }}>
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: '600',
                    color: DS.colors.textDark,
                    marginBottom: 2,
                  }}
                >
                  {deliverable.type} {deliverable.quantity > 1 && `(${deliverable.quantity}x)`}
                </Text>
                <Text
                  style={{
                    fontSize: 13,
                    color: DS.colors.textGray,
                    marginTop: 2,
                  }}
                >
                  {deliverable.description}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => onRemoveDeliverable(deliverable.id)}
                style={{
                  padding: DS.spacing.xs,
                }}
              >
                <X size={20} color={DS.colors.textGray} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {formData.deliverables.length === 0 && (
        <View
          style={{
            padding: DS.spacing.lg,
            alignItems: 'center',
            backgroundColor: DS.colors.surfaceLight,
            borderRadius: DS.borderRadius.sm,
            borderWidth: 1,
            borderColor: DS.colors.border,
            borderStyle: 'dashed',
            marginBottom: DS.spacing.lg,
          }}
        >
          <Text
            style={{
              fontSize: 14,
              color: DS.colors.textGray,
              textAlign: 'center',
            }}
          >
            No deliverables added yet. Add at least one deliverable to continue.
          </Text>
        </View>
      )}
    </View>
  );
}
