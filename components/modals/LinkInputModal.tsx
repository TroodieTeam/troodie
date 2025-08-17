import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { designTokens } from '@/constants/designTokens';
import { linkMetadataService, LinkMetadata } from '@/services/linkMetadataService';
import { ExternalContentPreview } from '@/components/posts/ExternalContentPreview';

interface LinkInputModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (url: string, metadata: LinkMetadata) => void;
  initialUrl?: string;
}

export const LinkInputModal: React.FC<LinkInputModalProps> = ({
  visible,
  onClose,
  onConfirm,
  initialUrl = '',
}) => {
  const [url, setUrl] = useState(initialUrl);
  const [loading, setLoading] = useState(false);
  const [metadata, setMetadata] = useState<LinkMetadata | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setUrl(initialUrl);
      setMetadata(null);
      setError(null);
    }
  }, [visible, initialUrl]);

  const handleUrlChange = (text: string) => {
    setUrl(text);
    setError(null);
    setMetadata(null);
  };

  const handleFetchMetadata = async () => {
    if (!url.trim()) {
      setError('Please enter a URL');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const normalizedUrl = linkMetadataService.normalizeUrl(url);
      
      if (!linkMetadataService.isValidUrl(normalizedUrl)) {
        setError('Please enter a valid URL');
        setLoading(false);
        return;
      }

      const fetchedMetadata = await linkMetadataService.fetchMetadata(normalizedUrl);
      setMetadata(fetchedMetadata);
      setUrl(normalizedUrl);
    } catch (err) {
      setError('Failed to fetch link preview. The URL will still be saved.');
      // Still set basic metadata even if fetch fails
      setMetadata({
        url: linkMetadataService.normalizeUrl(url),
        source: linkMetadataService.detectSource(url),
      });
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = () => {
    if (!url.trim()) {
      setError('Please enter a URL');
      return;
    }

    const normalizedUrl = linkMetadataService.normalizeUrl(url);
    
    if (!linkMetadataService.isValidUrl(normalizedUrl)) {
      setError('Please enter a valid URL');
      return;
    }

    const finalMetadata = metadata || {
      url: normalizedUrl,
      source: linkMetadataService.detectSource(normalizedUrl),
    };

    onConfirm(normalizedUrl, finalMetadata);
    onClose();
  };

  const handleCancel = () => {
    setUrl(initialUrl);
    setMetadata(null);
    setError(null);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleCancel}
    >
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableOpacity 
          style={styles.overlay} 
          activeOpacity={1} 
          onPress={handleCancel}
        />
        
        <View style={styles.bottomSheet}>
          <View style={styles.header}>
            <TouchableOpacity onPress={handleCancel} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={designTokens.colors.textDark} />
            </TouchableOpacity>
            
            <Text style={styles.title}>Add Link</Text>
            
            <TouchableOpacity 
              onPress={handleConfirm}
              style={[styles.doneButton, (!url.trim() && !metadata) && styles.doneButtonDisabled]}
              disabled={!url.trim() && !metadata}
            >
              <Text style={[styles.doneButtonText, (!url.trim() && !metadata) && styles.doneButtonTextDisabled]}>
                Done
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Paste a link from TikTok, Instagram, YouTube..."
                placeholderTextColor={designTokens.colors.textLight}
                value={url}
                onChangeText={handleUrlChange}
                autoCapitalize="none"
                keyboardType="url"
                autoCorrect={false}
                autoFocus
                onSubmitEditing={handleFetchMetadata}
              />
              
              {url.trim() && !metadata && (
                <TouchableOpacity 
                  style={styles.fetchButton}
                  onPress={handleFetchMetadata}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color={designTokens.colors.primaryOrange} />
                  ) : (
                    <Ionicons name="arrow-forward-circle" size={32} color={designTokens.colors.primaryOrange} />
                  )}
                </TouchableOpacity>
              )}
            </View>

            {error && (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={16} color={designTokens.colors.error} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {metadata && (
              <View style={styles.previewContainer}>
                <Text style={styles.previewTitle}>Preview</Text>
                <ExternalContentPreview
                  source={metadata.source}
                  url={metadata.url}
                  title={metadata.title}
                  description={metadata.description}
                  thumbnail={metadata.thumbnail}
                  author={metadata.author}
                />
              </View>
            )}

            <View style={styles.helpContainer}>
              <Text style={styles.helpText}>
                Supported platforms:
              </Text>
              <View style={styles.platformsContainer}>
                {['TikTok', 'Instagram', 'YouTube', 'Twitter', 'Web'].map((platform) => (
                  <View key={platform} style={styles.platformChip}>
                    <Text style={styles.platformText}>{platform}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  bottomSheet: {
    backgroundColor: designTokens.colors.white,
    borderTopLeftRadius: designTokens.borderRadius.xl,
    borderTopRightRadius: designTokens.borderRadius.xl,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: designTokens.spacing.md,
    paddingVertical: designTokens.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: designTokens.colors.borderLight,
  },
  closeButton: {
    padding: designTokens.spacing.xs,
  },
  title: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    color: designTokens.colors.textDark,
  },
  doneButton: {
    paddingHorizontal: designTokens.spacing.md,
    paddingVertical: designTokens.spacing.xs,
  },
  doneButtonDisabled: {
    opacity: 0.5,
  },
  doneButtonText: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: designTokens.colors.primaryOrange,
  },
  doneButtonTextDisabled: {
    color: designTokens.colors.textLight,
  },
  content: {
    padding: designTokens.spacing.md,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: designTokens.colors.backgroundLight,
    borderRadius: designTokens.borderRadius.md,
    paddingHorizontal: designTokens.spacing.md,
    marginBottom: designTokens.spacing.md,
  },
  input: {
    flex: 1,
    height: 48,
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: designTokens.colors.textDark,
  },
  fetchButton: {
    padding: designTokens.spacing.xs,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: designTokens.spacing.xs,
    marginBottom: designTokens.spacing.md,
  },
  errorText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: designTokens.colors.error,
    flex: 1,
  },
  previewContainer: {
    marginBottom: designTokens.spacing.md,
  },
  previewTitle: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: designTokens.colors.textMedium,
    marginBottom: designTokens.spacing.sm,
  },
  helpContainer: {
    marginTop: designTokens.spacing.md,
  },
  helpText: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: designTokens.colors.textLight,
    marginBottom: designTokens.spacing.sm,
  },
  platformsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: designTokens.spacing.xs,
  },
  platformChip: {
    backgroundColor: designTokens.colors.backgroundLight,
    paddingHorizontal: designTokens.spacing.sm,
    paddingVertical: designTokens.spacing.xs,
    borderRadius: designTokens.borderRadius.sm,
  },
  platformText: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: designTokens.colors.textMedium,
  },
});