import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Bell } from 'lucide-react-native';
import { designTokens, compactDesign } from '@/constants/designTokens';

export const ActivityHeader: React.FC = () => {
  return (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        <Bell size={20} color={designTokens.colors.text} />
        <Text style={styles.title}>Activity</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: compactDesign.header.paddingHorizontal,
    paddingVertical: compactDesign.header.paddingVertical,
    backgroundColor: designTokens.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: designTokens.colors.borderLight,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    ...designTokens.typography.sectionTitle,
    color: designTokens.colors.textDark,
  },
});