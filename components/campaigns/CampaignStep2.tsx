import { DS } from '@/components/design-system/tokens';
import { CampaignFormData } from '@/types/campaign';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Calendar, DollarSign } from 'lucide-react-native';
import React, { useState } from 'react';
import { Platform, Text, TextInput, TouchableOpacity, View } from 'react-native';

interface CampaignStep2Props {
  formData: CampaignFormData;
  onUpdate: (updates: Partial<CampaignFormData>) => void;
}

export function CampaignStep2({ formData, onUpdate }: CampaignStep2Props) {
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tempDate, setTempDate] = useState(new Date());

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (event.type === 'set' && selectedDate) {
      setTempDate(selectedDate);
      const formattedDate = selectedDate.toISOString().split('T')[0];
      onUpdate({ deadline: formattedDate });
      if (Platform.OS === 'android') {
        setShowDatePicker(false);
      }
    } else if (event.type === 'dismissed') {
      setShowDatePicker(false);
    }
  };

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
        Budget & Timeline
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
          Campaign Budget *
        </Text>
        <TextInput
          value={formData.budget}
          onChangeText={(text) => onUpdate({ budget: text })}
          placeholder="0"
          keyboardType="numeric"
          style={{
            borderWidth: 1,
            borderColor: DS.colors.border,
            borderRadius: DS.borderRadius.sm,
            padding: DS.spacing.sm,
            fontSize: 14,
            color: DS.colors.textDark,
            paddingLeft: 35,
          }}
        />
        <DollarSign
          size={16}
          color={DS.colors.textLight}
          style={{
            position: 'absolute',
            left: DS.spacing.sm,
            top: 36,
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
          Campaign Deadline *
        </Text>
        <TouchableOpacity
          onPress={() => {
            const currentDate = formData.deadline ? new Date(formData.deadline) : new Date();
            setTempDate(currentDate);
            setShowDatePicker(true);
          }}
          style={{
            borderWidth: 1,
            borderColor: DS.colors.border,
            borderRadius: DS.borderRadius.sm,
            padding: DS.spacing.sm,
            paddingLeft: 35,
            minHeight: 44,
            justifyContent: 'center',
          }}
        >
          <Text
            style={{
              fontSize: 14,
              color: formData.deadline ? DS.colors.textDark : DS.colors.textGray,
            }}
          >
            {formData.deadline || 'YYYY-MM-DD'}
          </Text>
        </TouchableOpacity>
        <Calendar
          size={16}
          color={DS.colors.textLight}
          style={{
            position: 'absolute',
            left: DS.spacing.sm,
            top: 36,
            pointerEvents: 'none',
          }}
        />
        {showDatePicker && (
          <DateTimePicker
            value={tempDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleDateChange}
            minimumDate={new Date()}
          />
        )}
        {Platform.OS === 'ios' && showDatePicker && (
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'flex-end',
              padding: DS.spacing.md,
              backgroundColor: DS.colors.surface,
              borderTopWidth: 1,
              borderTopColor: DS.colors.border,
            }}
          >
            <TouchableOpacity
              onPress={() => setShowDatePicker(false)}
              style={{
                paddingHorizontal: DS.spacing.lg,
                paddingVertical: DS.spacing.sm,
              }}
            >
              <Text
                style={{
                  color: DS.colors.primaryOrange,
                  fontWeight: '600',
                  fontSize: 16,
                }}
              >
                Done
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}
