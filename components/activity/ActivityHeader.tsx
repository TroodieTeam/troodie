import { ProfileAvatar } from '@/components/ProfileAvatar';
import { compactDesign, designTokens } from '@/constants/designTokens';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export const ActivityHeader: React.FC = () => {
  return (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        <ProfileAvatar size={36} style={styles.profileAvatar} />
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
  profileAvatar: {
    marginRight: 8,
  },
  title: {
    ...designTokens.typography.sectionTitle,
    color: designTokens.colors.textDark,
  },
});