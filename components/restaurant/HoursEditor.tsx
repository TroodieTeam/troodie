import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Switch } from 'react-native';
import { DS } from '@/components/design-system/tokens';
import type { WeeklyHours, DayHours } from '@/services/restaurantEditService';

interface HoursEditorProps {
  hours?: WeeklyHours;
  onChange: (hours: WeeklyHours) => void;
}

const DAYS = [
  { key: 'monday', label: 'Monday' },
  { key: 'tuesday', label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday', label: 'Thursday' },
  { key: 'friday', label: 'Friday' },
  { key: 'saturday', label: 'Saturday' },
  { key: 'sunday', label: 'Sunday' },
] as const;

export function HoursEditor({ hours = {}, onChange }: HoursEditorProps) {
  const updateDay = (day: keyof WeeklyHours, updates: Partial<DayHours>) => {
    const currentDay = hours[day] || { open: '09:00', close: '22:00', closed: false };
    onChange({
      ...hours,
      [day]: { ...currentDay, ...updates },
    });
  };

  return (
    <View style={styles.container}>
      {DAYS.map((day) => {
        const dayHours = hours[day.key as keyof WeeklyHours];
        const isClosed = dayHours?.closed ?? false;

        return (
          <View key={day.key} style={styles.dayRow}>
            <View style={styles.dayInfo}>
              <Text style={styles.dayLabel}>{day.label}</Text>
              <Switch
                value={!isClosed}
                onValueChange={(value) => updateDay(day.key as keyof WeeklyHours, { closed: !value })}
              />
            </View>
            {!isClosed && (
              <View style={styles.timeInputs}>
                <TextInput
                  style={styles.timeInput}
                  placeholder="09:00"
                  value={dayHours?.open}
                  onChangeText={(text) => updateDay(day.key as keyof WeeklyHours, { open: text })}
                  keyboardType="numeric"
                  maxLength={5}
                />
                <Text style={styles.separator}>to</Text>
                <TextInput
                  style={styles.timeInput}
                  placeholder="22:00"
                  value={dayHours?.close}
                  onChangeText={(text) => updateDay(day.key as keyof WeeklyHours, { close: text })}
                  keyboardType="numeric"
                  maxLength={5}
                />
              </View>
            )}
            {isClosed && (
              <Text style={styles.closedText}>Closed</Text>
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: DS.colors.backgroundWhite,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: DS.colors.border,
  },
  dayRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: DS.colors.border,
  },
  dayInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  dayLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: DS.colors.text,
  },
  timeInputs: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: DS.colors.border,
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    color: DS.colors.text,
    backgroundColor: DS.colors.background,
    textAlign: 'center',
  },
  separator: {
    fontSize: 14,
    color: DS.colors.textLight,
    marginHorizontal: 4,
  },
  closedText: {
    fontSize: 14,
    color: DS.colors.textLight,
    fontStyle: 'italic',
  },
});

