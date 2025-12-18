import { DS } from '@/components/design-system/tokens';
import { CampaignFormData } from '@/types/campaign';
import React from 'react';
import { Text, TextInput, View } from 'react-native';

interface CampaignStep1Props {
  formData: CampaignFormData;
  onUpdate: (updates: Partial<CampaignFormData>) => void;
}

export function CampaignStep1({ formData, onUpdate }: CampaignStep1Props) {
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
        Campaign Basics
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
          Campaign Title *
        </Text>
        <TextInput
          value={formData.title}
          onChangeText={(text) => onUpdate({ title: text })}
          placeholder="e.g., Summer Menu Launch Campaign"
          style={{
            borderWidth: 1,
            borderColor: DS.colors.border,
            borderRadius: DS.borderRadius.sm,
            padding: DS.spacing.sm,
            fontSize: 14,
            color: DS.colors.textDark,
          }}
        />
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
          value={formData.description}
          onChangeText={(text) => onUpdate({ description: text })}
          placeholder="Describe what you want creators to showcase. Include any specific hashtags, mentions, or guidelines..."
          multiline
          numberOfLines={4}
          style={{
            borderWidth: 1,
            borderColor: DS.colors.border,
            borderRadius: DS.borderRadius.sm,
            padding: DS.spacing.sm,
            fontSize: 14,
            color: DS.colors.textDark,
            textAlignVertical: 'top',
            minHeight: 100,
          }}
        />
      </View>
    </View>
  );
}
