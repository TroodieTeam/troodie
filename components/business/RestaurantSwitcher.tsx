/**
 * Restaurant Switcher Component
 * Dropdown for switching between multiple restaurants
 * Part of the Restaurant Team Invitation System
 */

import { DS } from '@/components/design-system/tokens';
import {
    Check,
    ChevronDown,
    Store,
} from 'lucide-react-native';
import React, { useState } from 'react';
import {
    Image,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

export interface Restaurant {
    id: string;
    name: string;
    image_url?: string;
    role: 'owner' | 'admin' | 'manager';
    is_verified?: boolean;
}

interface RestaurantSwitcherProps {
    restaurants: Restaurant[];
    currentRestaurantId: string;
    onRestaurantChange: (restaurantId: string) => void;
}

export function RestaurantSwitcher({
    restaurants,
    currentRestaurantId,
    onRestaurantChange,
}: RestaurantSwitcherProps) {
    const [showDropdown, setShowDropdown] = useState(false);

    const currentRestaurant = restaurants.find(r => r.id === currentRestaurantId);

    // Don't show switcher if user only has one restaurant
    if (restaurants.length <= 1) {
        return null;
    }

    const getRoleLabel = (role: string) => {
        switch (role) {
            case 'owner':
                return 'Owner';
            case 'admin':
                return 'Admin';
            case 'manager':
                return 'Manager';
            default:
                return role;
        }
    };

    const getRoleColor = (role: string) => {
        switch (role) {
            case 'owner':
                return '#F59E0B';
            case 'admin':
                return '#6366F1';
            case 'manager':
                return '#10B981';
            default:
                return DS.colors.textGray;
        }
    };

    const handleSelect = (restaurantId: string) => {
        if (restaurantId !== currentRestaurantId) {
            onRestaurantChange(restaurantId);
        }
        setShowDropdown(false);
    };

    return (
        <>
            {/* Switcher Button */}
            <TouchableOpacity
                style={styles.switcherButton}
                onPress={() => setShowDropdown(true)}
                activeOpacity={0.7}
            >
                <View style={styles.switcherContent}>
                    {currentRestaurant?.image_url ? (
                        <Image
                            source={{ uri: currentRestaurant.image_url }}
                            style={styles.restaurantImage}
                        />
                    ) : (
                        <View style={styles.restaurantImagePlaceholder}>
                            <Store size={16} color={DS.colors.textGray} />
                        </View>
                    )}
                    <View style={styles.restaurantInfo}>
                        <Text style={styles.restaurantName} numberOfLines={1}>
                            {currentRestaurant?.name || 'Select Restaurant'}
                        </Text>
                        <Text style={styles.restaurantCount}>
                            {restaurants.length} restaurants
                        </Text>
                    </View>
                    <ChevronDown size={20} color={DS.colors.textGray} />
                </View>
            </TouchableOpacity>

            {/* Dropdown Modal */}
            <Modal
                visible={showDropdown}
                animationType="fade"
                transparent={true}
                onRequestClose={() => setShowDropdown(false)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setShowDropdown(false)}
                >
                    <View style={styles.dropdownContainer}>
                        <View style={styles.dropdownHeader}>
                            <Text style={styles.dropdownTitle}>Switch Restaurant</Text>
                            <Text style={styles.dropdownSubtitle}>
                                You have access to {restaurants.length} restaurants
                            </Text>
                        </View>

                        <ScrollView style={styles.dropdownList} showsVerticalScrollIndicator={false}>
                            {restaurants.map((restaurant, index) => {
                                const isSelected = restaurant.id === currentRestaurantId;
                                return (
                                    <TouchableOpacity
                                        key={restaurant.id}
                                        style={[
                                            styles.dropdownItem,
                                            isSelected && styles.dropdownItemSelected,
                                            index === restaurants.length - 1 && styles.dropdownItemLast,
                                        ]}
                                        onPress={() => handleSelect(restaurant.id)}
                                        activeOpacity={0.7}
                                    >
                                        {restaurant.image_url ? (
                                            <Image
                                                source={{ uri: restaurant.image_url }}
                                                style={styles.dropdownItemImage}
                                            />
                                        ) : (
                                            <View style={styles.dropdownItemImagePlaceholder}>
                                                <Store size={18} color={DS.colors.textGray} />
                                            </View>
                                        )}
                                        <View style={styles.dropdownItemInfo}>
                                            <View style={styles.dropdownItemNameRow}>
                                                <Text style={[
                                                    styles.dropdownItemName,
                                                    isSelected && styles.dropdownItemNameSelected,
                                                ]} numberOfLines={1}>
                                                    {restaurant.name}
                                                </Text>

                                            </View>
                                            {/* <View style={styles.dropdownItemMeta}>
                                                <View style={[
                                                    styles.roleBadge,
                                                    { backgroundColor: `${getRoleColor(restaurant.role)}15` }
                                                ]}>
                                                    <Text style={[
                                                        styles.roleBadgeText,
                                                        { color: getRoleColor(restaurant.role) }
                                                    ]}>
                                                        {getRoleLabel(restaurant.role)}
                                                    </Text>
                                                </View>
                                            </View> */}
                                        </View>
                                        {isSelected && (
                                            <View style={styles.selectedIndicator}>
                                                <Check size={20} color={DS.colors.primaryOrange} />
                                            </View>
                                        )}
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                    </View>
                </TouchableOpacity>
            </Modal>
        </>
    );
}

const styles = StyleSheet.create({
    switcherButton: {
        backgroundColor: DS.colors.surfaceLight,
        borderRadius: DS.borderRadius.lg,
        paddingHorizontal: DS.spacing.md,
        paddingVertical: DS.spacing.sm,
    },
    switcherContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: DS.spacing.sm,
    },
    restaurantImage: {
        width: 32,
        height: 32,
        borderRadius: DS.borderRadius.md,
        backgroundColor: DS.colors.border,
    },
    restaurantImagePlaceholder: {
        width: 32,
        height: 32,
        borderRadius: DS.borderRadius.md,
        backgroundColor: DS.colors.border,
        justifyContent: 'center',
        alignItems: 'center',
    },
    restaurantInfo: {
        flex: 1,
        marginRight: DS.spacing.xs,
    },
    restaurantName: {
        ...DS.typography.body,
        fontWeight: '600',
        color: DS.colors.textDark,
    },
    restaurantCount: {
        ...DS.typography.caption,
        color: DS.colors.textGray,
        marginTop: 1,
    },
    // Dropdown Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-start',
        paddingTop: 120,
        paddingHorizontal: DS.spacing.lg,
    },
    dropdownContainer: {
        backgroundColor: DS.colors.surface,
        borderRadius: DS.borderRadius.lg,
        ...DS.shadows.lg,
        overflow: 'hidden',
    },
    dropdownHeader: {
        padding: DS.spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: DS.colors.border,
    },
    dropdownTitle: {
        ...DS.typography.h3,
        color: DS.colors.textDark,
        marginBottom: 4,
    },
    dropdownSubtitle: {
        ...DS.typography.caption,
        color: DS.colors.textGray,
    },
    dropdownList: {
        maxHeight: 400,
    },
    dropdownItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: DS.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: DS.colors.border,
    },
    dropdownItemSelected: {
        backgroundColor: `${DS.colors.primaryOrange}08`,
    },
    dropdownItemLast: {
        borderBottomWidth: 0,
    },
    dropdownItemImage: {
        width: 44,
        height: 44,
        borderRadius: DS.borderRadius.md,
        backgroundColor: DS.colors.border,
    },
    dropdownItemImagePlaceholder: {
        width: 44,
        height: 44,
        borderRadius: DS.borderRadius.md,
        backgroundColor: DS.colors.surfaceLight,
        justifyContent: 'center',
        alignItems: 'center',
    },
    dropdownItemInfo: {
        flex: 1,
        marginLeft: DS.spacing.md,
    },
    dropdownItemNameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: DS.spacing.xs,
    },
    dropdownItemName: {
        ...DS.typography.body,
        fontWeight: '600',
        color: DS.colors.textDark,
        flex: 1,
    },
    dropdownItemNameSelected: {
        color: DS.colors.primaryOrange,
    },
    verifiedBadge: {
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: '#DCFCE7',
        justifyContent: 'center',
        alignItems: 'center',
    },
    dropdownItemMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
    },
    roleBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: DS.borderRadius.xs,
    },
    roleBadgeText: {
        ...DS.typography.caption,
        fontSize: 11,
        fontWeight: '600',
    },
    selectedIndicator: {
        marginLeft: DS.spacing.sm,
    },
});
