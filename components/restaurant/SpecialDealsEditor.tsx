import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Plus, X } from 'lucide-react-native';
import { DS } from '@/components/design-system/tokens';
import type { SpecialDeal } from '@/services/restaurantEditService';

interface SpecialDealsEditorProps {
  deals: SpecialDeal[];
  onChange: (deals: SpecialDeal[]) => void;
}

export function SpecialDealsEditor({ deals, onChange }: SpecialDealsEditorProps) {
  const addDeal = () => {
    const newDeal: SpecialDeal = {
      id: Date.now().toString(),
      title: '',
      description: '',
      isTroodieDeal: false,
    };
    onChange([...deals, newDeal]);
  };

  const removeDeal = (id: string) => {
    onChange(deals.filter((d) => d.id !== id));
  };

  const updateDeal = (id: string, updates: Partial<SpecialDeal>) => {
    onChange(
      deals.map((d) => (d.id === id ? { ...d, ...updates } : d))
    );
  };

  return (
    <View style={styles.container}>
      {deals.map((deal, index) => (
        <View key={deal.id} style={styles.dealCard}>
          <View style={styles.dealHeader}>
            <Text style={styles.dealNumber}>Deal {index + 1}</Text>
            <TouchableOpacity onPress={() => removeDeal(deal.id)}>
              <X size={20} color={DS.colors.textLight} />
            </TouchableOpacity>
          </View>
          <TextInput
            style={styles.input}
            placeholder="Deal title (e.g., Troodie Thursdays - 15% off)"
            value={deal.title}
            onChangeText={(text) => updateDeal(deal.id, { title: text })}
            maxLength={100}
          />
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Deal description..."
            value={deal.description}
            onChangeText={(text) => updateDeal(deal.id, { description: text })}
            multiline
            numberOfLines={3}
            maxLength={300}
          />
          <TouchableOpacity
            style={styles.troodieDealToggle}
            onPress={() => updateDeal(deal.id, { isTroodieDeal: !deal.isTroodieDeal })}
          >
            <View style={[styles.checkbox, deal.isTroodieDeal && styles.checkboxChecked]}>
              {deal.isTroodieDeal && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.troodieDealLabel}>Troodie Exclusive Deal</Text>
          </TouchableOpacity>
        </View>
      ))}
      <TouchableOpacity style={styles.addButton} onPress={addDeal}>
        <Plus size={20} color={DS.colors.primary} />
        <Text style={styles.addButtonText}>Add Deal</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  dealCard: {
    backgroundColor: DS.colors.backgroundWhite,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: DS.colors.border,
  },
  dealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dealNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: DS.colors.text,
  },
  input: {
    borderWidth: 1,
    borderColor: DS.colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: DS.colors.text,
    backgroundColor: DS.colors.background,
    marginBottom: 8,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  troodieDealToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: DS.colors.border,
    borderRadius: 4,
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: DS.colors.primary,
    borderColor: DS.colors.primary,
  },
  checkmark: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  troodieDealLabel: {
    fontSize: 14,
    color: DS.colors.text,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderWidth: 2,
    borderColor: DS.colors.primary,
    borderStyle: 'dashed',
    borderRadius: 8,
    backgroundColor: DS.colors.backgroundWhite,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: DS.colors.primary,
    marginLeft: 8,
  },
});

